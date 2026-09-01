// Verification phase: one Claude call, no tools, independent from the
// drafting call (different call, same immutable evidence packet as the
// only source of truth). Produces a single JSON Verification result.
//
// This also runs a deterministic (non-LLM) banned-language scan as a
// belt-and-suspenders check, since string matching is cheap and exact.
import { readFileSync } from 'node:fs';
import { callWithResilience, extractText, parseJsonResponse, modelFor } from './anthropic-client.mjs';
import { validateAgainstSchema } from './schema-validate.mjs';
import { loadConfig, repoRoot } from './config.mjs';

const SYSTEM_PROMPT = readFileSync(`${repoRoot()}prompts/verify-system.md`, 'utf8');

export function deterministicBannedLanguageScan(bodyHtml) {
  const config = loadConfig();
  const banned = config.brand.bannedLanguage ?? [];
  const plain = bodyHtml.replace(/<[^>]+>/g, ' ').toLowerCase();
  return banned.filter((phrase) => plain.includes(phrase.toLowerCase()));
}

export async function runVerify(evidencePacket, draftContent) {
  const userMessage = [
    'Evidence packet:',
    JSON.stringify(evidencePacket, null, 2),
    '',
    'Draft to verify:',
    JSON.stringify(draftContent, null, 2),
  ].join('\n');

  const response = await callWithResilience((client) =>
    client.messages.create({
      model: modelFor('verify'),
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    }),
  );

  const text = extractText(response);
  const parsed = parseJsonResponse(text);
  parsed.runId = evidencePacket.runId;
  parsed.generatedAt = new Date().toISOString();

  const deterministicHits = deterministicBannedLanguageScan(draftContent.bodyHtml);
  parsed.bannedLanguageHits = Array.from(new Set([...(parsed.bannedLanguageHits ?? []), ...deterministicHits]));
  if (deterministicHits.length) parsed.passed = false;

  return validateAgainstSchema('verification', parsed);
}
