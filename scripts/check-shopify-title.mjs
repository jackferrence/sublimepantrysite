#!/usr/bin/env node
/**
 * Does Shopify still call the product what the site calls it?
 *
 * `tests/homepage-and-shop.test.mjs` pins Shopify's title in a hard-coded
 * constant, on purpose: a test that read the name from the same file the page
 * reads it from would pass whatever that file said. But that only catches the
 * *site* drifting from a name somebody wrote down. It cannot catch the *name
 * moving underneath the constant*, and that is how U04 regressed twice:
 *
 *   2026-09-08  the page said "Freeze-Drying Packaging Starter Kit" while the
 *               cart said "Reserve Starter Kit - 100 Mylar Bags + Absorbers +
 *               Labels". Fixed by copying Shopify's name into the constant.
 *   2026-09-09  Shopify was renamed back. The site published "Reserve Starter
 *               Kit" across five surfaces and every test stayed green.
 *
 * Both end the same way: the buyer reads one name on the page and a different
 * one at the moment they pay. This script closes the half a constant cannot.
 *
 * This is a monitor, not a test.
 *
 * It is deliberately not part of `npm test`: that suite is deterministic and
 * offline by contract (see .github/workflows/ci.yml). A network call inside it
 * would either make every PR depend on Shopify's uptime or, worse, skip itself
 * when credentials are absent — the silent-absence failure this codebase keeps
 * getting bitten by.
 *
 * It is also deliberately not a PR check. A pull request should not fail
 * because somebody renamed a product in Shopify: that is not the PR's fault and
 * it blocks unrelated work. It runs on a schedule instead, and opens an issue.
 * Within a day is the target, because two days is what U04 cost twice.
 *
 * Exit codes:
 *   0  every checked title matches
 *   1  a title has moved, or Shopify could not be reached, or no credentials
 *
 * Credentials, same two paths as netlify/functions/lead-capture.mjs:
 *   SHOPIFY_ADMIN_TOKEN / SHOPIFY_ADMIN_API_TOKEN   (takes precedence)
 *   SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET       (client credentials grant)
 * plus SHOPIFY_STORE_DOMAIN / SHOPIFY_SHOP_DOMAIN. Scope required: read_products.
 *
 * Both spellings are accepted on purpose. The repo secrets are named
 * SHOPIFY_ADMIN_TOKEN and SHOPIFY_STORE_DOMAIN; .env.example and the Netlify
 * function use SHOPIFY_ADMIN_API_TOKEN and SHOPIFY_SHOP_DOMAIN. Reading both
 * beats inventing a third convention or silently reading the wrong one.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const API_VERSION = '2026-07';

const fail = (message) => {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
};

/** Every handle/title pair the site publishes, read from the catalog source. */
function catalogTitles() {
  const src = readFileSync(join(root, 'src/lib/commerce.ts'), 'utf8');
  const entries = [];
  // Each product block opens with its handle and states its title a few lines
  // later. Parsed rather than imported because this script runs without the
  // Astro/TS toolchain in CI.
  const re = /handle: '([^']+)',[\s\S]{0,2000}?\n {4}title: (?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/g;
  for (const m of src.matchAll(re)) {
    entries.push({ handle: m[1], title: (m[2] ?? m[3]).replace(/\\'/g, "'").replace(/\\"/g, '"') });
  }
  return entries;
}

async function getAccessToken(shop) {
  const staticToken = process.env.SHOPIFY_ADMIN_TOKEN || process.env.SHOPIFY_ADMIN_API_TOKEN;
  if (staticToken) return staticToken;

  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  if (!res.ok) {
    // The body names the cause and contains no secret.
    fail(`Shopify token exchange failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  }
  const body = await res.json();
  if (!body.access_token) fail('Shopify token exchange returned no access_token.');
  return body.access_token;
}

const QUERY = `
  query TitlesByHandle($query: String!) {
    products(first: 50, query: $query) {
      nodes { handle title status }
    }
  }
`;

const shop = process.env.SHOPIFY_STORE_DOMAIN || process.env.SHOPIFY_SHOP_DOMAIN;
if (!shop) fail('Neither SHOPIFY_STORE_DOMAIN nor SHOPIFY_SHOP_DOMAIN is set. This check cannot run without one.');

const token = await getAccessToken(shop);
if (!token) {
  fail(
    'No Shopify credentials. Set SHOPIFY_ADMIN_TOKEN, or SHOPIFY_CLIENT_ID and\n' +
      '  SHOPIFY_CLIENT_SECRET. This exits non-zero rather than skipping: a check that\n' +
      '  quietly passes when it cannot run is how the drift it guards went unseen.',
  );
}

const expected = catalogTitles();
if (expected.length === 0) fail('Parsed no products out of src/lib/commerce.ts — the check would pass vacuously.');

let payload;
try {
  const res = await fetch(`https://${shop}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
    body: JSON.stringify({
      query: QUERY,
      variables: { query: expected.map((p) => `handle:${p.handle}`).join(' OR ') },
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) fail(`Shopify Admin API returned ${res.status}. Could not verify any title.`);
  payload = await res.json();
} catch (error) {
  fail(`Could not reach Shopify: ${error instanceof Error ? error.message : String(error)}`);
}

if (payload.errors) fail(`Shopify Admin API errors: ${JSON.stringify(payload.errors).slice(0, 300)}`);

const live = new Map((payload.data?.products?.nodes ?? []).map((n) => [n.handle, n]));
const problems = [];

for (const { handle, title } of expected) {
  const node = live.get(handle);
  if (!node) {
    problems.push(`${handle}\n    the site sells it; Shopify did not return it (deleted, or the handle moved)`);
    continue;
  }
  if (node.title !== title) {
    problems.push(`${handle}\n    Shopify: ${node.title}\n    site:    ${title}`);
  }
}

if (problems.length) {
  fail(
    `The product name has moved in Shopify. Shopify owns the name; the site copies it.\n\n  ` +
      problems.join('\n\n  ') +
      `\n\n  Fix: update the catalog entry in src/lib/commerce.ts and the SHOPIFY_TITLE\n` +
      `  constant in tests/homepage-and-shop.test.mjs, then re-run. Every surface that\n` +
      `  names the product follows from those two.`,
  );
}

console.log(`✓ Shopify agrees with the site on all ${expected.length} product titles.`);
