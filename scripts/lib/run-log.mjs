import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { loadConfig, repoRoot } from './config.mjs';

export function newRunId() {
  const now = new Date();
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\..*/, 'Z');
  return `run-${stamp}-${Math.random().toString(36).slice(2, 8)}`;
}

function gitSha() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot(), encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
}

function fileHashSummary(paths) {
  const out = {};
  for (const p of paths) {
    if (existsSync(`${repoRoot()}${p}`)) {
      const content = readFileSync(`${repoRoot()}${p}`, 'utf8');
      out[p] = { bytes: content.length };
    }
  }
  return out;
}

export class RunLog {
  constructor(runId) {
    this.runId = runId;
    this.startedAt = new Date().toISOString();
    this.entries = {
      runId,
      startedAt: this.startedAt,
      gitSha: gitSha(),
      versions: {
        policy: loadConfig().scoring,
        prompts: fileHashSummary(['prompts/research-system.md', 'prompts/draft-system.md', 'prompts/verify-system.md']),
        schemas: fileHashSummary([
          'schemas/evidence-packet.schema.json',
          'schemas/editorial-decision.schema.json',
          'schemas/draft-content.schema.json',
          'schemas/verification.schema.json',
        ]),
        models: loadConfig().anthropic.models,
      },
      providerUsage: [],
      citationLedger: [],
      evidencePacket: null,
      decision: null,
      draft: null,
      verification: null,
      qa: null,
      pr: null,
      finalStatus: null,
      cost: { computed: false, note: 'Cost tracking requires Admin API usage reports; not computed in this run. See response.usage per provider call above.' },
    };
  }

  recordProviderUsage(phase, response) {
    this.entries.providerUsage.push({
      phase,
      model: response.model,
      stopReason: response.stop_reason,
      usage: response.usage,
      at: new Date().toISOString(),
    });
  }

  recordCitations(evidencePacket) {
    this.entries.citationLedger = (evidencePacket.sources ?? []).map((s) => ({
      id: s.id,
      url: s.url,
      publisher: s.publisher,
      tier: s.tier,
      accessDate: s.accessDate,
    }));
  }

  set(key, value) {
    this.entries[key] = value;
  }

  finalize(finalStatus) {
    this.entries.finalStatus = finalStatus;
    this.entries.finishedAt = new Date().toISOString();
    const config = loadConfig();
    const outPath = `${repoRoot()}${config.paths.runLogArtifact}`;
    mkdirSync(dirnameOf(outPath), { recursive: true });
    writeFileSync(outPath, JSON.stringify(this.entries, null, 2) + '\n');
    return outPath;
  }
}

function dirnameOf(p) {
  return p.slice(0, p.lastIndexOf('/'));
}
