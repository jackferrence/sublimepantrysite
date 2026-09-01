// Anthropic client via Workload Identity Federation.
//
// No ANTHROPIC_API_KEY is used or accepted here on purpose. The SDK
// auto-detects WIF when ANTHROPIC_FEDERATION_RULE_ID, ANTHROPIC_ORGANIZATION_ID,
// ANTHROPIC_SERVICE_ACCOUNT_ID, and ANTHROPIC_IDENTITY_TOKEN (or
// ANTHROPIC_IDENTITY_TOKEN_FILE) are all set, exchanges the GitHub OIDC
// token at /v1/oauth/token itself, and auto-refreshes — this module never
// touches the raw token or prints it.
import Anthropic from '@anthropic-ai/sdk';
import { loadConfig } from './config.mjs';

export function requireWifEnv() {
  const required = [
    'ANTHROPIC_FEDERATION_RULE_ID',
    'ANTHROPIC_ORGANIZATION_ID',
    'ANTHROPIC_SERVICE_ACCOUNT_ID',
  ];
  const hasToken = Boolean(process.env.ANTHROPIC_IDENTITY_TOKEN || process.env.ANTHROPIC_IDENTITY_TOKEN_FILE);
  const missing = required.filter((k) => !process.env[k]);
  if (!hasToken) missing.push('ANTHROPIC_IDENTITY_TOKEN (or ANTHROPIC_IDENTITY_TOKEN_FILE)');
  if (missing.length) {
    throw new Error(
      `Anthropic WIF environment is incomplete, missing: ${missing.join(', ')}. ` +
        'Refusing to fall back to ANTHROPIC_API_KEY — this pipeline is WIF-only by design.',
    );
  }
  if (process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN) {
    throw new Error(
      'ANTHROPIC_API_KEY or ANTHROPIC_AUTH_TOKEN is set — these outrank WIF in the SDK\'s ' +
        'credential resolution and would silently bypass federation. Unset them for this job.',
    );
  }
}

let client;

export function getAnthropicClient() {
  if (client) return client;
  requireWifEnv();
  // Zero-arg constructor: the SDK reads ANTHROPIC_FEDERATION_RULE_ID,
  // ANTHROPIC_ORGANIZATION_ID, ANTHROPIC_SERVICE_ACCOUNT_ID,
  // ANTHROPIC_WORKSPACE_ID, and ANTHROPIC_IDENTITY_TOKEN(_FILE) from the
  // environment on its own.
  client = new Anthropic();
  return client;
}

const RETRYABLE_STATUS = new Set([408, 409, 429, 500, 502, 503, 504]);

/**
 * Calls `fn` (an async function performing one Anthropic request) with
 * exponential backoff on retryable errors (429/5xx/network), and explicit
 * handling for stop_reason edge cases (refusal, pause_turn, max_tokens).
 * `fn` receives the client and must return the raw Message response.
 */
export async function callWithResilience(fn, { maxAttempts = 5, baseDelayMs = 2000 } = {}) {
  const anthropic = getAnthropicClient();
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fn(anthropic);
      return handleStopReason(response);
    } catch (err) {
      lastError = err;
      const status = err?.status;
      const retryable =
        status == null // network/connection error, no HTTP status
          ? true
          : RETRYABLE_STATUS.has(status);
      if (!retryable || attempt === maxAttempts) throw err;
      const retryAfterHeader = err?.headers?.['retry-after'];
      const delay = retryAfterHeader
        ? Number(retryAfterHeader) * 1000
        : baseDelayMs * 2 ** (attempt - 1) + Math.floor(Math.random() * 500);
      console.error(`[anthropic] attempt ${attempt}/${maxAttempts} failed (${status ?? 'network'}), retrying in ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

function handleStopReason(response) {
  if (response.stop_reason === 'refusal') {
    const category = response.stop_details?.category ?? 'unknown';
    const explanation = response.stop_details?.explanation ?? '';
    throw new Error(`Claude refused this request (category: ${category}). ${explanation}`.trim());
  }
  if (response.stop_reason === 'max_tokens') {
    throw new Error('Claude response was truncated at max_tokens — evidence packets/drafts must not be truncated.');
  }
  // pause_turn is only expected mid-agentic-loop (server tools); the
  // controller's research call handles its own tool loop, so a pause_turn
  // reaching here means the loop terminated early.
  if (response.stop_reason === 'pause_turn') {
    throw new Error('Claude paused mid-turn (pause_turn) and the loop did not resume it — treat as a failed run.');
  }
  return response;
}

export function extractText(response) {
  return response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();
}

/** Strips a leading/trailing ```json ... ``` fence if the model added one despite instructions not to. */
export function parseJsonResponse(text) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  const jsonText = fenced ? fenced[1] : trimmed;
  return JSON.parse(jsonText);
}

export function modelFor(phase) {
  const config = loadConfig();
  const model = config.anthropic?.models?.[phase];
  if (!model) throw new Error(`No model configured in site.yaml for phase "${phase}"`);
  return model;
}
