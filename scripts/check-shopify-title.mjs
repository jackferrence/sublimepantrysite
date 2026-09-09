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
 *   SHOPIFY_ADMIN_API_TOKEN                    (takes precedence)
 *   SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET  (client credentials grant)
 * plus SHOPIFY_SHOP_DOMAIN. Scope required: read_products.
 *
 * One spelling. This used to read SHOPIFY_STORE_DOMAIN || SHOPIFY_SHOP_DOMAIN
 * and SHOPIFY_ADMIN_TOKEN || SHOPIFY_ADMIN_API_TOKEN, on the reasoning that
 * accepting both beat picking one. It does not: two spellings mean a variable
 * can be set correctly under the name a given file does not read, and the
 * failure is indistinguishable from having set nothing. The GitHub repo secrets
 * were renamed to match these names, so nothing maps between vocabularies
 * anywhere.
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

const unescape = (v) => v.replace(/\\'/g, "'").replace(/\\"/g, '"');

/** Every handle/title pair the site publishes, read from the catalog source. */
function catalogTitles() {
  const src = readFileSync(join(root, 'src/lib/commerce.ts'), 'utf8');
  const entries = [];
  // Each product block opens with its handle and states its title a few lines
  // later. Parsed rather than imported because this script runs without the
  // Astro/TS toolchain in CI.
  const re = /handle: '([^']+)',[\s\S]{0,2000}?\n {4}title: (?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/g;
  for (const m of src.matchAll(re)) {
    entries.push({ source: 'src/lib/commerce.ts', handle: m[1], title: unescape(m[2] ?? m[3]) });
  }
  return entries;
}

/**
 * The titles pinned in the test suite.
 *
 * These are the *other* site constant that names a product, and the one the
 * failure message has always told people to update. Reading only the catalog
 * left it possible for the catalog and the pinned map to be corrected apart
 * from each other, with this script reporting agreement either way. Both are
 * site constants; both are checked.
 */
function pinnedTitles() {
  const src = readFileSync(join(root, 'tests/homepage-and-shop.test.mjs'), 'utf8');
  const block = src.match(/const SHOPIFY_TITLES = \{([\s\S]*?)\n\};/);
  if (!block) {
    fail(
      'Could not find SHOPIFY_TITLES in tests/homepage-and-shop.test.mjs. It was renamed or\n' +
        '  removed. Fix this parser rather than deleting the check — the pinned map is half\n' +
        '  of what this script exists to compare.',
    );
  }
  const entries = [];
  const re = /'([^']+)':\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)")/g;
  for (const m of block[1].matchAll(re)) {
    entries.push({ source: 'tests/homepage-and-shop.test.mjs', handle: m[1], title: unescape(m[2] ?? m[3]) });
  }
  return entries;
}

async function getAccessToken(shop) {
  const staticToken = process.env.SHOPIFY_ADMIN_API_TOKEN;
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

/**
 * The site may only publish ACTIVE products.
 *
 * Status is queried and judged, not merely fetched. The Admin API returns an
 * archived product's title exactly as happily as a live one, so a title check
 * alone would have gone on agreeing with Shopify about the name of a product
 * nobody could buy — which is what happened to the boxed starter kit, archived
 * 2026-09-09 while every surface still sold it.
 */
const REQUIRED_STATUS = 'ACTIVE';

const shop = process.env.SHOPIFY_SHOP_DOMAIN;
if (!shop) fail('SHOPIFY_SHOP_DOMAIN is not set. This check cannot run without it.');

const token = await getAccessToken(shop);
if (!token) {
  fail(
    'No Shopify credentials. Set SHOPIFY_ADMIN_API_TOKEN, or SHOPIFY_CLIENT_ID and\n' +
      '  SHOPIFY_CLIENT_SECRET. This exits non-zero rather than skipping: a check that\n' +
      '  quietly passes when it cannot run is how the drift it guards went unseen.',
  );
}

const catalog = catalogTitles();
if (catalog.length === 0) fail('Parsed no products out of src/lib/commerce.ts — the check would pass vacuously.');
const pinned = pinnedTitles();
if (pinned.length === 0) fail('Parsed no products out of tests/homepage-and-shop.test.mjs — the check would pass vacuously.');

const expected = [...catalog, ...pinned];

// The two site constants must agree with each other before either is compared
// to Shopify. If they disagree, the comparison below would report one of them
// as correct and hide the split.
const catalogHandles = catalog.map((p) => p.handle).sort();
const pinnedHandles = pinned.map((p) => p.handle).sort();
if (catalogHandles.join('\u0000') !== pinnedHandles.join('\u0000')) {
  fail(
    'The catalog and the pinned test titles list different products.\n\n  ' +
      `src/lib/commerce.ts:            ${catalogHandles.join(', ')}\n  ` +
      `tests/homepage-and-shop.test.mjs: ${pinnedHandles.join(', ')}`,
  );
}

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

for (const { handle, title, source } of expected) {
  const node = live.get(handle);
  if (!node) {
    problems.push(`${handle} (${source})\n    the site sells it; Shopify did not return it (deleted, or the handle moved)`);
    continue;
  }
  if (node.status !== REQUIRED_STATUS) {
    problems.push(
      `${handle} (${source})\n    Shopify status: ${node.status}, not ${REQUIRED_STATUS}\n` +
        `    the site publishes it as purchasable; Shopify will not sell it`,
    );
  }
  if (node.title !== title) {
    problems.push(`${handle} (${source})\n    Shopify: ${node.title}\n    site:    ${title}`);
  }
}

if (problems.length) {
  fail(
    `The site and Shopify disagree about a product. Shopify owns the name and the\n` +
      `  status; the site copies both.\n\n  ` +
      problems.join('\n\n  ') +
      `\n\n  Fix: update the catalog entry in src/lib/commerce.ts and the SHOPIFY_TITLES\n` +
      `  map in tests/homepage-and-shop.test.mjs, then re-run. Every surface that names\n` +
      `  the product follows from those two. If a product is no longer ACTIVE, remove it\n` +
      `  from both and redirect its /shop URL — do not leave it listed.`,
  );
}

console.log(
  `✓ Shopify agrees with the site on all ${catalog.length} products: every handle is ${REQUIRED_STATUS}, ` +
    `and both the catalog and the pinned test titles match Shopify's.`,
);
