#!/usr/bin/env node
// Deterministic controller for the daily editorial system. This file
// contains no LLM calls itself — it orchestrates the phase modules
// (research/draft/verify, each a single Claude call) and enforces every
// hard invariant: at most one content file per run, schema validation at
// every boundary, draft-PR-only, never merge.
//
// Modes:
//   dry-run   fixture-driven, no network, no git — validates the pipeline logic
//   research  live GSC + live Claude research call -> evidence packet + decision
//   draft     reads the research-phase artifacts; if DRAFT_PR-eligible, drafts,
//             verifies, QAs, and opens a draft PR. NO_ACTION/brief outcomes are
//             a successful terminal state, not a failure.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { loadConfig, repoRoot } from './lib/config.mjs';
import { validateAgainstSchema } from './lib/schema-validate.mjs';
import { scoreOpportunity, downgradeForFailedVerification } from './lib/scoring.mjs';
import { listExistingArticles } from './lib/existing-content.mjs';
import { newRunId, RunLog } from './lib/run-log.mjs';
import { writeArticleFile } from './lib/write-article.mjs';
import { runAstroQa } from './lib/astro-qa.mjs';
import { openEditorialDraftPr } from './lib/open-draft-pr.mjs';

const MODE = process.argv[2];
const VALID_MODES = ['dry-run', 'research', 'draft'];

if (!VALID_MODES.includes(MODE)) {
  console.error(`Usage: node scripts/editorial-controller.mjs <${VALID_MODES.join('|')}>`);
  process.exit(2);
}

function artifactsDir() {
  return `${repoRoot()}artifacts`;
}

function artifactPath(name) {
  const config = loadConfig();
  return `${repoRoot()}${config.paths[name]}`;
}

function alreadyPublishedToday() {
  const today = new Date().toISOString().slice(0, 10);
  return listExistingArticles().length > 0 && hasArticlePublishedOn(today);
}

function hasArticlePublishedOn(dateStr) {
  const config = loadConfig();
  const dir = `${repoRoot()}${config.paths.contentCollection}`;
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .some((f) => {
      const data = JSON.parse(readFileSync(`${dir}/${f}`, 'utf8'));
      return data.publishedDate === dateStr;
    });
}

async function main() {
  mkdirSync(artifactsDir(), { recursive: true });

  if (MODE === 'dry-run') return runDryRun();
  if (MODE === 'research') return runResearchMode();
  if (MODE === 'draft') return runDraftMode();
}

async function runDryRun() {
  console.log('[editorial-controller] dry-run: fixture-driven, no network, no git operations.');
  const runId = newRunId();
  const runLog = new RunLog(runId);

  const fixtureDir = `${repoRoot()}tests/fixtures/editorial`;
  const evidencePacket = JSON.parse(readFileSync(`${fixtureDir}/evidence-packet.sample.json`, 'utf8'));
  evidencePacket.runId = runId;
  validateAgainstSchema('evidence-packet', evidencePacket);
  runLog.set('evidencePacket', evidencePacket);
  runLog.recordCitations(evidencePacket);

  let decision = scoreOpportunity(evidencePacket, { alreadyPublishedToday: false });
  validateAgainstSchema('editorial-decision', { runId, generatedAt: new Date().toISOString(), ...decision });
  runLog.set('decision', decision);
  console.log(`[editorial-controller] score=${decision.score} outcome=${decision.outcome} risk-rules=${JSON.stringify(decision.appliedRiskRules)}`);

  if (decision.outcome === 'DRAFT_PR') {
    const draft = JSON.parse(readFileSync(`${fixtureDir}/draft-content.sample.json`, 'utf8'));
    validateAgainstSchema('draft-content', draft);
    runLog.set('draft', draft);

    const verification = JSON.parse(readFileSync(`${fixtureDir}/verification.sample.json`, 'utf8'));
    validateAgainstSchema('verification', verification);
    runLog.set('verification', verification);

    if (!verification.passed) {
      decision = downgradeForFailedVerification(decision);
      runLog.set('decision', decision);
      console.log(`[editorial-controller] verification failed -> downgraded to ${decision.outcome}`);
    } else {
      console.log('[editorial-controller] dry-run would proceed to write + QA + draft PR (skipped in dry-run mode).');
    }
  }

  const outPath = runLog.finalize(decision.outcome);
  console.log(`[editorial-controller] run log written to ${outPath}`);
}

async function runResearchMode() {
  // Dynamic imports: these modules construct the Anthropic client at
  // import-of-use time, so `dry-run` (which must work with zero credentials
  // configured) never touches them.
  const { getSearchConsoleClient, fetchTopQueries, assertNoServiceAccountKey } = await import('./lib/gsc-collect.mjs');
  const { runResearch } = await import('./lib/research.mjs');

  const runId = newRunId();
  const runLog = new RunLog(runId);
  console.log(`[editorial-controller] research run ${runId}`);

  try {
    assertNoServiceAccountKey();

    let topQueries = [];
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      const client = await getSearchConsoleClient();
      topQueries = await fetchTopQueries(client, {});
    } else {
      console.warn('[editorial-controller] GOOGLE_APPLICATION_CREDENTIALS not set — proceeding with empty Search Console signal.');
    }

    const existingArticles = listExistingArticles();
    const evidencePacket = await runResearch({ topQueries, existingArticles, runId });
    runLog.set('evidencePacket', evidencePacket);
    runLog.recordCitations(evidencePacket);
    writeFileSync(artifactPath('evidencePacketArtifact'), JSON.stringify(evidencePacket, null, 2) + '\n');

    const decision = scoreOpportunity(evidencePacket, { alreadyPublishedToday: alreadyPublishedToday() });
    validateAgainstSchema('editorial-decision', { runId, generatedAt: new Date().toISOString(), ...decision });
    runLog.set('decision', decision);
    writeFileSync(
      artifactPath('decisionArtifact'),
      JSON.stringify({ runId, generatedAt: new Date().toISOString(), ...decision }, null, 2) + '\n',
    );

    console.log(`[editorial-controller] score=${decision.score} outcome=${decision.outcome}`);
    runLog.finalize(decision.outcome);
  } catch (err) {
    // Write a run log even on failure (e.g. token exchange, billing, or a
    // malformed model response) so the artifact/log trail isn't empty for
    // the run that actually needs debugging.
    runLog.set('error', String(err?.message ?? err));
    runLog.finalize('FAILED');
    throw err;
  }
}

async function runDraftMode() {
  const evidencePath = artifactPath('evidencePacketArtifact');
  const decisionPath = artifactPath('decisionArtifact');
  if (!existsSync(evidencePath) || !existsSync(decisionPath)) {
    throw new Error('draft mode requires research-phase artifacts (evidence packet + decision) — run `research` first.');
  }

  const evidencePacket = JSON.parse(readFileSync(evidencePath, 'utf8'));
  let decision = JSON.parse(readFileSync(decisionPath, 'utf8'));
  const runId = decision.runId ?? evidencePacket.runId;
  const runLog = new RunLog(runId);
  runLog.set('evidencePacket', evidencePacket);
  runLog.recordCitations(evidencePacket);
  runLog.set('decision', decision);

  if (decision.outcome !== 'DRAFT_PR') {
    console.log(`[editorial-controller] outcome is ${decision.outcome} — nothing to draft. Treating as success.`);
    runLog.finalize(decision.outcome);
    return;
  }

  const { runDraft } = await import('./lib/draft.mjs');
  const { runVerify } = await import('./lib/verify.mjs');

  const draft = await runDraft(evidencePacket);
  runLog.set('draft', draft);

  const verification = await runVerify(evidencePacket, draft);
  runLog.set('verification', verification);

  if (!verification.passed) {
    decision = downgradeForFailedVerification(decision);
    runLog.set('decision', decision);
    writeFileSync(decisionPath, JSON.stringify(decision, null, 2) + '\n');
    console.log(`[editorial-controller] verification failed — downgraded to ${decision.outcome}. No PR opened.`);
    runLog.finalize(decision.outcome);
    return;
  }

  let filePath;
  try {
    filePath = writeArticleFile(draft);
    console.log(`[editorial-controller] wrote ${filePath}`);

    const qa = runAstroQa();
    runLog.set('qa', { passed: qa.passed, logTail: qa.log.slice(-4000) });
    if (!qa.passed) {
      throw new Error(`Astro build/link QA failed:\n${qa.log.slice(-4000)}`);
    }

    const pr = openEditorialDraftPr({ filePath, decision, evidencePacket, draftContent: draft, runId });
    runLog.set('pr', pr);
    console.log(`[editorial-controller] opened draft PR: ${pr.url}`);
    runLog.finalize('DRAFT_PR');
  } catch (err) {
    // Best-effort cleanup so a failed run doesn't leave an uncommitted file
    // sitting in the working tree for the next job/run to trip over.
    if (filePath && existsSync(filePath) && !isCommitted(filePath)) {
      try {
        unlinkSync(filePath);
      } catch {
        /* best effort */
      }
    }
    runLog.set('qa', runLog.entries.qa ?? { passed: false, error: String(err?.message ?? err) });
    runLog.finalize('FAILED');
    throw err;
  }
}

function isCommitted(filePath) {
  try {
    const out = execFileSync('git', ['status', '--porcelain', '--', filePath], { cwd: repoRoot(), encoding: 'utf8' });
    return out.trim() === '';
  } catch {
    return false;
  }
}

main().catch((err) => {
  console.error('[editorial-controller] FAILED:', err?.stack ?? err);
  process.exit(1);
});
