/**
 * A missing credential must announce itself, by name, and fail.
 *
 * The failure this guards is not "the credential was missing" — that is a
 * config mistake and they happen. It is that a missing credential produced
 * output identical to having nothing to do:
 *
 *   netlify/functions/lead-capture.mjs read SHOPIFY_SHOP_DOMAIN, found nothing,
 *   logged at `info`, and returned 204. A 204 is a success. The function ran
 *   that way for its entire life, the Netlify graph showed no errors because
 *   there were none, and the first evidence was somebody opening the Shopify
 *   customer list by hand and finding zero `sp-lead` tags in it.
 *
 * `submission-created.mts` had the opposite behaviour for KLAVIYO_PRIVATE_API_KEY
 * — `console.error` naming the variable, then a 500 — and that one was diagnosed
 * in about two minutes. The difference between the two is this test.
 *
 * What is asserted, per credential read:
 *   1. the absence is handled at all;
 *   2. the log line contains the variable's own name, so the reader does not
 *      have to open the source to learn which one;
 *   3. it is logged at error level, not info or debug;
 *   4. control does not continue as though the work was done.
 *
 * Deliberately a source-shape test. Actually invoking these handlers would mean
 * standing up Netlify's runtime and Shopify's API, and the network calls that
 * implies are exactly what the offline contract in .github/workflows/ci.yml
 * forbids.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => readFileSync(join(root, f), 'utf8');

/**
 * Every credential read that must fail loudly, and where.
 *
 * `vars` are the names that must appear in the failure log. A file reading a
 * credential and absent from this list is caught by the sweep at the bottom.
 */
const REQUIRED = [
  { file: 'netlify/functions/lead-capture.mjs', vars: ['SHOPIFY_SHOP_DOMAIN'] },
  {
    file: 'netlify/functions/lead-capture.mjs',
    vars: ['SHOPIFY_ADMIN_API_TOKEN', 'SHOPIFY_CLIENT_ID', 'SHOPIFY_CLIENT_SECRET'],
  },
  { file: 'netlify/functions/submission-created.mts', vars: ['KLAVIYO_PRIVATE_API_KEY'] },
  { file: 'netlify/functions/crawler-log.mjs', vars: ['CRAWLER_LOG_KEY'] },
  { file: 'scripts/check-shopify-title.mjs', vars: ['SHOPIFY_SHOP_DOMAIN'] },
  { file: 'scripts/check-shopify-title.mjs', vars: ['SHOPIFY_ADMIN_API_TOKEN', 'SHOPIFY_CLIENT_ID'] },
  { file: 'scripts/create-webhooks.mjs', vars: ['SHOPIFY_SHOP_DOMAIN'] },
  { file: 'scripts/create-webhooks.mjs', vars: ['NETLIFY_BUILD_HOOK_URL'] },
  { file: 'scripts/create-webhooks.mjs', vars: ['SHOPIFY_ADMIN_API_TOKEN', 'SHOPIFY_CLIENT_ID'] },
  { file: 'scripts/crawler-report.mjs', vars: ['CRAWLER_LOG_KEY'] },
];

/** Statements that make a failure visible: a named exit, a 5xx, or a throw. */
const LOUD_EXIT =
  /process\.exit\(\s*[1-9]|status:\s*5\d\d|json\(\s*5\d\d|throw new Error|\bfail\(/;

/**
 * Files not yet in the tree are not asserted here.
 *
 * The crawler-log function and its report script are landing on a separate
 * branch. Asserting a file that does not exist would fail this suite for a
 * reason that has nothing to do with credentials. This is not the silent skip
 * the rest of the file exists to prevent — a file absent from the repo has no
 * behaviour to be quiet about, and the sweep at the bottom fails the moment one
 * appears without an entry here.
 */
const PRESENT = REQUIRED.filter(({ file }) => existsSync(join(root, file)));
assert.ok(PRESENT.length >= 8, 'the credential list is reading fewer files than this repo has');

for (const { file, vars } of PRESENT) {
  test(`${file}: ${vars[0]} absence is loud and named`, () => {
    const src = read(file);

    // 2 — the failure path names the variable in text a human will read, not
    // only as a process.env lookup.
    for (const name of vars) {
      const inMessage = new RegExp(`['"\`][^'"\`]*\\b${name}\\b`).test(src);
      assert.ok(inMessage, `${file}: the failure message never names ${name}`);
    }

    // 3 — error level. `console.info` for a missing credential is how
    // lead-capture stayed invisible: info does not appear beside errors.
    const named = vars[0];
    const region = src.slice(Math.max(0, src.indexOf(named) - 400));
    assert.ok(
      /console\.error|\bfail\(|throw new Error/.test(region),
      `${file}: ${named} absence is not reported at error level`,
    );

    // 4 — and it stops.
    assert.ok(LOUD_EXIT.test(region), `${file}: ${named} absence does not fail; it continues`);
  });
}

test('no credential read is quietly treated as success', () => {
  // The specific regression: `info` plus a 2xx. A 204 or 202 on a credential
  // failure graphs as success and is what hid this for weeks.
  const offenders = [];
  for (const { file } of PRESENT) {
    const src = read(file);
    for (const m of src.matchAll(/console\.info\([^)]*(?:TOKEN|KEY|SECRET|DOMAIN|CREDENTIAL)[^)]*\)/gi)) {
      offenders.push(`${file}: credential absence logged at info — "${m[0].slice(0, 70)}…"`);
    }
  }
  assert.deepEqual([...new Set(offenders)], [], 'a credential problem is being logged as information');
});

test('one spelling per credential, across every script and function', () => {
  // SHOPIFY_STORE_DOMAIN / SHOPIFY_ADMIN_TOKEN were the second spelling. Two
  // names mean a value set under the one a given file does not read fails
  // exactly like a value never set — the same indistinguishability this whole
  // file exists to remove.
  //
  // Comments may still name them: the note explaining the reconciliation, and
  // the workflow mapping the differently-named GitHub secrets, are the reason
  // this passes rather than an exception to it.
  const retired = ['SHOPIFY_STORE_DOMAIN', 'SHOPIFY_ADMIN_TOKEN'];
  const files = [
    'netlify/functions/lead-capture.mjs',
    'scripts/check-shopify-title.mjs',
    'scripts/create-webhooks.mjs',
  ];
  const offenders = [];
  for (const file of files) {
    const code = read(file)
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/(^|[^:])\/\/.*$/gm, '$1');
    for (const name of retired) {
      if (code.includes(name)) offenders.push(`${file} still reads ${name}`);
    }
  }
  assert.deepEqual(offenders, [], 'a retired credential spelling is still read');
});

test('.env.example documents every credential the code requires', () => {
  const env = read('.env.example');
  const documented = new Set([...env.matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map((m) => m[1]));
  const missing = [];
  for (const { vars } of PRESENT) {
    for (const name of vars) {
      if (!documented.has(name)) missing.push(name);
    }
  }
  assert.deepEqual(
    [...new Set(missing)].sort(),
    [],
    'a required credential is read by the code but absent from .env.example',
  );
});

test('the sweep: no new credential read escapes this list', () => {
  // Without this, the assertions above only ever cover what someone remembered
  // to add. Any file reading a credential-shaped variable must be listed in
  // REQUIRED, or deliberately exempted below with its reason.
  const EXEMPT = new Map([
    // Runs on every page request and must never block the response or change
    // render time. It names CRAWLER_LOG_KEY at warn level and returns the
    // response untouched; scripts/crawler-report.mjs is what surfaces it, via
    // the 503 that crawler-log.mjs returns. That 503 is the loud half, and it
    // is asserted above.
    ['netlify/edge-functions/crawler-log.ts', 'must not block the response'],
    // Optional enrichment, not a credential the run requires: absent
    // GOOGLE_APPLICATION_CREDENTIALS it warns by name and proceeds with an
    // empty Search Console signal, which is a stated degradation rather than a
    // failed run.
    ['scripts/editorial-controller.mjs', 'optional signal, degrades by name'],
    // Asserts the WIF variables and throws naming each missing one. Not listed
    // in REQUIRED because it is a library, reached through the controller.
    ['scripts/lib/anthropic-client.mjs', 'throws naming every missing var'],
  ]);
  const CANDIDATES = [
    'netlify/functions/lead-capture.mjs',
    'netlify/functions/submission-created.mts',
    'netlify/functions/crawler-log.mjs',
    'netlify/edge-functions/crawler-log.ts',
    'scripts/check-shopify-title.mjs',
    'scripts/create-webhooks.mjs',
    'scripts/crawler-report.mjs',
    'scripts/editorial-controller.mjs',
    'scripts/lib/anthropic-client.mjs',
  ];
  const listed = new Set(REQUIRED.map((r) => r.file));  // the full list, not PRESENT
  const unaccounted = [];
  for (const file of CANDIDATES) {
    if (!existsSync(join(root, file))) continue;
    const src = read(file);
    const readsSecret =
      /process\.env\.[A-Z0-9_]*(TOKEN|KEY|SECRET|DOMAIN|CREDENTIALS|HOOK_URL)/.test(src) ||
      /env\.get\(['"][A-Z0-9_]*(TOKEN|KEY|SECRET)/.test(src);
    if (readsSecret && !listed.has(file) && !EXEMPT.has(file)) {
      unaccounted.push(file);
    }
  }
  assert.deepEqual(
    unaccounted,
    [],
    'a file reads a credential but is neither asserted nor exempted — add it to REQUIRED',
  );
});
