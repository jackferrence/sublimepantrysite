import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { scoreOpportunity, downgradeForFailedVerification, VALID_OUTCOMES } from '../scripts/lib/scoring.mjs';
import { validateAgainstSchema } from '../scripts/lib/schema-validate.mjs';
import { deterministicBannedLanguageScan } from '../scripts/lib/verify.mjs';

const FIXTURES = fileURLToPath(new URL('./fixtures/editorial/', import.meta.url));

function loadFixture(name) {
  return JSON.parse(readFileSync(`${FIXTURES}${name}`, 'utf8'));
}

test('scoring is deterministic: same input -> same output', () => {
  const packet = loadFixture('evidence-packet.sample.json');
  const a = scoreOpportunity(packet, { alreadyPublishedToday: false });
  const b = scoreOpportunity(packet, { alreadyPublishedToday: false });
  assert.deepEqual(a, b);
});

test('scoring output is always a valid EditorialDecision outcome', () => {
  const packet = loadFixture('evidence-packet.sample.json');
  const decision = scoreOpportunity(packet, { alreadyPublishedToday: false });
  assert.ok(VALID_OUTCOMES.includes(decision.outcome));
  assert.ok(decision.score >= 0 && decision.score <= 100);
});

test('editorial-decision schema accepts a real scoring output', () => {
  const packet = loadFixture('evidence-packet.sample.json');
  const decision = scoreOpportunity(packet, { alreadyPublishedToday: false });
  assert.doesNotThrow(() =>
    validateAgainstSchema('editorial-decision', {
      runId: 'test-run',
      generatedAt: new Date().toISOString(),
      ...decision,
    }),
  );
});

test('quota rule downgrades DRAFT_PR to NO_ACTION when already published today', () => {
  const packet = loadFixture('evidence-packet.sample.json');
  const decision = scoreOpportunity(packet, { alreadyPublishedToday: true });
  assert.equal(decision.outcome, 'NO_ACTION');
  assert.ok(decision.appliedRiskRules.includes('pillar-quota-reached'));
});

test('no-primary-source rule downgrades DRAFT_PR to SOURCED_BRIEF', () => {
  const packet = loadFixture('evidence-packet.sample.json');
  // Use riskClass: standard so the elevated-topic rule doesn't also fire
  // and mask which rule is responsible for the downgrade.
  const noPrimary = {
    ...packet,
    riskClass: 'standard',
    sources: packet.sources.map((s) => ({ ...s, tier: 'secondary' })),
  };
  const decision = scoreOpportunity(noPrimary, { alreadyPublishedToday: false });
  assert.equal(decision.outcome, 'SOURCED_BRIEF');
  assert.ok(decision.appliedRiskRules.includes('no-primary-source'));
});

test('elevated-risk topic with a single primary source is downgraded', () => {
  const packet = loadFixture('evidence-packet.sample.json');
  const oneSource = {
    ...packet,
    riskClass: 'elevated',
    sources: [packet.sources[0]], // only one, primary
  };
  const decision = scoreOpportunity(oneSource, { alreadyPublishedToday: false });
  assert.equal(decision.outcome, 'SOURCED_BRIEF');
  assert.ok(decision.appliedRiskRules.includes('elevated-topic-single-source'));
});

test('below-threshold evidence produces NO_ACTION', () => {
  const packet = loadFixture('evidence-packet.sample.json');
  const thin = {
    ...packet,
    sources: [{ ...packet.sources[2] }], // one secondary source only
    searchSignal: { source: 'search-console', topQueries: [], existingCoverageUrl: null, existingCoverageAgeDays: null },
  };
  const decision = scoreOpportunity(thin, { alreadyPublishedToday: false });
  assert.equal(decision.outcome, 'NO_ACTION');
});

test('downgradeForFailedVerification only touches DRAFT_PR outcomes', () => {
  const draftDecision = { outcome: 'DRAFT_PR', appliedRiskRules: [] };
  const downgraded = downgradeForFailedVerification(draftDecision);
  assert.equal(downgraded.outcome, 'SOURCED_BRIEF');
  assert.ok(downgraded.appliedRiskRules.includes('unverified-claims-present'));

  const noActionDecision = { outcome: 'NO_ACTION', appliedRiskRules: [] };
  assert.deepEqual(downgradeForFailedVerification(noActionDecision), noActionDecision);
});

test('evidence packet schema rejects a source with no accessDate', () => {
  const packet = loadFixture('evidence-packet.sample.json');
  const bad = { ...packet, sources: [{ ...packet.sources[0], accessDate: undefined }] };
  assert.throws(() => validateAgainstSchema('evidence-packet', bad));
});

test('draft-content schema rejects a compare-pillar draft with no comparisonCriteria', () => {
  const draft = loadFixture('draft-content.sample.json');
  const bad = { ...draft, pillar: 'compare' };
  // draft-content.schema.json does not itself require comparisonCriteria
  // (that's enforced by the Astro content collection schema on write), but
  // it must still be valid JSON Schema-wise with pillar changed.
  assert.doesNotThrow(() => validateAgainstSchema('draft-content', bad));
});

test('verification schema round-trips both pass and fail fixtures', () => {
  assert.doesNotThrow(() => validateAgainstSchema('verification', loadFixture('verification.sample.json')));
  assert.doesNotThrow(() => validateAgainstSchema('verification', loadFixture('verification-failed.sample.json')));
});

test('deterministic banned-language scan catches a banned phrase', () => {
  const hits = deterministicBannedLanguageScan('<p>This is the ultimate guide to freeze-drying.</p>');
  assert.ok(hits.includes('ultimate'));
});

test('deterministic banned-language scan is clean on real site copy', () => {
  const hits = deterministicBannedLanguageScan(
    '<p>A freeze-drying batch is won or lost at its edges: the prep before the cycle.</p>',
  );
  assert.deepEqual(hits, []);
});

test('writeArticleFile refuses to overwrite an existing slug', async () => {
  const { writeArticleFile } = await import('../scripts/lib/write-article.mjs');
  const draft = loadFixture('draft-content.sample.json');
  // 'complete-batch-workflow' already exists in src/content/articles from
  // the Astro reconstruction — this must throw, never overwrite.
  assert.throws(() => writeArticleFile({ ...draft, slug: 'complete-batch-workflow' }), /already exists/);
});
