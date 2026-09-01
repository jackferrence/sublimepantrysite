// Draft phase: one Claude call, no tools at all (evidence-only). Produces
// a single JSON DraftContent from the evidence packet.
import { readFileSync } from 'node:fs';
import { callWithResilience, extractText, parseJsonResponse, modelFor } from './anthropic-client.mjs';
import { validateAgainstSchema } from './schema-validate.mjs';
import { repoRoot } from './config.mjs';

const SYSTEM_PROMPT = readFileSync(`${repoRoot()}prompts/draft-system.md`, 'utf8');

export async function runDraft(evidencePacket) {
  const userMessage = ['Evidence packet:', JSON.stringify(evidencePacket, null, 2)].join('\n');

  const response = await callWithResilience((client) =>
    client.messages.create({
      model: modelFor('draft'),
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      // Deliberately no `tools` — evidence-only drafting.
      messages: [{ role: 'user', content: userMessage }],
    }),
  );

  const text = extractText(response);
  const parsed = parseJsonResponse(text);
  if (!parsed.slug && evidencePacket.candidateSlug) parsed.slug = evidencePacket.candidateSlug;
  if (!parsed.pillar) parsed.pillar = evidencePacket.pillar;
  if (!parsed.riskClass) parsed.riskClass = evidencePacket.riskClass;
  if (parsed.pillar === 'compare' && !parsed.comparisonCriteria && evidencePacket.comparisonCriteria) {
    parsed.comparisonCriteria = evidencePacket.comparisonCriteria;
  }

  return validateAgainstSchema('draft-content', parsed);
}
