// Research phase: one Claude call with the web_search/web_fetch server
// tools enabled, producing a single JSON EvidencePacket. Read-only by
// construction — this phase never writes to the repo.
import { readFileSync } from 'node:fs';
import { callWithResilience, extractText, parseJsonResponse, modelFor } from './anthropic-client.mjs';
import { validateAgainstSchema } from './schema-validate.mjs';
import { repoRoot } from './config.mjs';

const SYSTEM_PROMPT = readFileSync(`${repoRoot()}prompts/research-system.md`, 'utf8');

/**
 * @param {object} input
 * @param {Array<{query, impressions, clicks, position}>} input.topQueries - from Search Console
 * @param {Array<{slug, pillar, title}>} input.existingArticles - current content collection, for gap detection
 * @param {string} input.runId
 */
export async function runResearch({ topQueries, existingArticles, runId }) {
  const userMessage = [
    'Search Console top queries (last window, by impressions):',
    JSON.stringify(topQueries.slice(0, 40), null, 2),
    '',
    'Existing site articles (slug, pillar, title) — check for topic overlap before proposing a new one:',
    JSON.stringify(existingArticles, null, 2),
    '',
    `Today's date (use for every accessDate): ${new Date().toISOString().slice(0, 10)}`,
    '',
    'Pick the single strongest evidence-backed opportunity from the queries above and produce the evidence packet for it.',
  ].join('\n');

  const response = await callWithResilience((client) =>
    client.messages.create({
      model: modelFor('research'),
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      tools: [
        {
          type: 'web_search_20260209',
          name: 'web_search',
          max_uses: 12,
        },
        {
          type: 'web_fetch_20260209',
          name: 'web_fetch',
          max_uses: 8,
        },
      ],
      messages: [{ role: 'user', content: userMessage }],
    }),
  );

  const text = extractText(response);
  const parsed = parseJsonResponse(text);
  parsed.runId = runId;
  parsed.generatedAt = new Date().toISOString();
  parsed.model = modelFor('research');

  return validateAgainstSchema('evidence-packet', parsed);
}
