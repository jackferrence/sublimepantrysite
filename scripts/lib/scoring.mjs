// Deterministic opportunity scoring. No LLM call in this file — the score
// and outcome are a pure function of the evidence packet, the search
// signal, and today's publication state. Given the same inputs this always
// produces the same output, which is what makes the controller auditable.
import { loadConfig } from './config.mjs';

const OUTCOMES = ['NO_ACTION', 'SOURCED_BRIEF', 'REFRESH_RECOMMENDATION', 'NEWS_ALERT', 'GROWTH_EXPERIMENT', 'DRAFT_PR'];

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

/**
 * @param {object} evidencePacket - validated EvidencePacket
 * @param {object} opts
 * @param {boolean} opts.alreadyPublishedToday - true if an article was already drafted/published today (quota rule)
 * @param {object} [opts.weights] - overrides site.yaml scoring.weights
 */
export function scoreOpportunity(evidencePacket, opts = {}) {
  const config = loadConfig();
  const weights = opts.weights ?? config.scoring.weights;
  const thresholds = config.scoring.thresholds;

  const breakdown = {
    searchDemand: scoreSearchDemand(evidencePacket, weights.searchDemand),
    positionOpportunity: scorePositionOpportunity(evidencePacket, weights.positionOpportunity),
    evidenceStrength: scoreEvidenceStrength(evidencePacket, weights.evidenceStrength),
    contentGap: scoreContentGap(evidencePacket, weights.contentGap),
    freshnessUrgency: scoreFreshnessUrgency(evidencePacket, weights.freshnessUrgency),
  };

  const score = clamp(
    Math.round(Object.values(breakdown).reduce((a, b) => a + b, 0)),
    0,
    100,
  );

  let outcome;
  if (score < thresholds.noAction) {
    outcome = 'NO_ACTION';
  } else if (score < thresholds.draftEligible) {
    outcome = evidencePacket.searchSignal?.existingCoverageUrl ? 'REFRESH_RECOMMENDATION' : 'SOURCED_BRIEF';
  } else {
    outcome = 'DRAFT_PR';
  }

  const preDowngradeOutcome = outcome;
  const { finalOutcome, appliedRules } = applyRiskRules(evidencePacket, outcome, opts);

  return {
    score,
    scoreBreakdown: breakdown,
    outcome: finalOutcome,
    preDowngradeOutcome,
    appliedRiskRules: appliedRules,
  };
}

function scoreSearchDemand(packet, weight) {
  const queries = packet.searchSignal?.topQueries ?? [];
  if (!queries.length) return 0;
  const totalImpressions = queries.reduce((sum, q) => sum + q.impressions, 0);
  // Log-scaled: 0 impressions -> 0, ~1000+ impressions -> full weight.
  const normalized = clamp(Math.log10(totalImpressions + 1) / 3, 0, 1);
  return Math.round(normalized * weight);
}

function scorePositionOpportunity(packet, weight) {
  const queries = packet.searchSignal?.topQueries ?? [];
  if (!queries.length) return 0;
  // Positions 11-30 (page 2-3) are the sweet spot: already indexed and
  // relevant, but not yet capturing clicks. Position 1-10 scores lower
  // (already winning); position 30+ scores lower (long way to go).
  const bestBand = queries.reduce((best, q) => {
    const bandScore = positionBandScore(q.position);
    return Math.max(best, bandScore);
  }, 0);
  return Math.round(bestBand * weight);
}

function positionBandScore(position) {
  if (position >= 11 && position <= 30) return 1;
  if (position > 30) return 0.5;
  if (position >= 4 && position <= 10) return 0.4;
  return 0.15; // already top 3 — little upside from a new/refreshed article
}

function scoreEvidenceStrength(packet, weight) {
  const sources = packet.sources ?? [];
  if (!sources.length) return 0;
  const primaryCount = sources.filter((s) => s.tier === 'primary').length;
  const primaryRatio = primaryCount / sources.length;
  const countScore = clamp(sources.length / 4, 0, 1); // 4+ sources = full credit for count
  const combined = 0.6 * primaryRatio + 0.4 * countScore;
  return Math.round(combined * weight);
}

function scoreContentGap(packet, weight) {
  const hasExisting = Boolean(packet.searchSignal?.existingCoverageUrl);
  if (!hasExisting) return weight; // no coverage at all — full gap
  const ageDays = packet.searchSignal?.existingCoverageAgeDays;
  if (ageDays == null) return Math.round(weight * 0.5);
  // Stale coverage still represents a partial gap, scaling up to 180 days.
  const staleness = clamp(ageDays / 180, 0, 1);
  return Math.round(weight * staleness * 0.6);
}

function scoreFreshnessUrgency(packet, weight) {
  const claims = packet.claims ?? [];
  const recentSourceCount = (packet.sources ?? []).filter((s) => isWithinDays(s.accessDate, 30)).length;
  if (!claims.length || !recentSourceCount) return 0;
  return Math.round(clamp(recentSourceCount / 2, 0, 1) * weight);
}

function isWithinDays(dateStr, days) {
  const then = new Date(`${dateStr}T00:00:00.000Z`).getTime();
  const now = Date.now();
  return now - then <= days * 24 * 60 * 60 * 1000;
}

function applyRiskRules(packet, outcome, opts) {
  const config = loadConfig();
  const applied = [];
  let result = outcome;

  const elevatedTopic = packet.riskClass === 'elevated';
  const primaryCount = (packet.sources ?? []).filter((s) => s.tier === 'primary').length;

  if (elevatedTopic && primaryCount < 2 && OUTCOMES.indexOf(result) > OUTCOMES.indexOf('SOURCED_BRIEF')) {
    result = 'SOURCED_BRIEF';
    applied.push('elevated-topic-single-source');
  }

  if (primaryCount === 0 && OUTCOMES.indexOf(result) > OUTCOMES.indexOf('SOURCED_BRIEF')) {
    result = 'SOURCED_BRIEF';
    applied.push('no-primary-source');
  }

  // Note: the "unverified-claims-present" rule is applied after drafting +
  // verification, via downgradeForFailedVerification() below — verification
  // requires a draft to exist, which doesn't happen until after this
  // initial score/outcome decision.

  if (opts.alreadyPublishedToday && result === 'DRAFT_PR') {
    result = 'NO_ACTION';
    applied.push('pillar-quota-reached');
  }

  void config; // reserved for future rule tuning from site.yaml
  return { finalOutcome: result, appliedRules: applied };
}

export const VALID_OUTCOMES = OUTCOMES;

/**
 * Applied by the controller *after* verification runs (verification can
 * only happen after a draft exists, which is after the initial score/
 * outcome decision). Downgrades DRAFT_PR -> SOURCED_BRIEF deterministically
 * — never upgrades, never touches any other outcome.
 */
export function downgradeForFailedVerification(decision) {
  if (decision.outcome !== 'DRAFT_PR') return decision;
  return {
    ...decision,
    outcome: 'SOURCED_BRIEF',
    appliedRiskRules: [...decision.appliedRiskRules, 'unverified-claims-present'],
  };
}
