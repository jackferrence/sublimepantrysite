import { test } from 'node:test';
import assert from 'node:assert/strict';
const mod = await import('../netlify/functions/lead-capture.mjs');
const fn = mod.default;
const post = (body) => new Request('https://x/.netlify/functions/lead-capture', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});
const valid = { email: 'a@b.com', stage: 'new-owner', marketing_consent: true, source_path: '/', lead_magnet: 'freeze-drying-starter-checklist' };

/** Captures console.error so a test can assert the variable was named. */
function withErrorLog(run) {
  const lines = [];
  const real = console.error;
  console.error = (...args) => lines.push(args.join(' '));
  return Promise.resolve(run()).finally(() => { console.error = real; }).then(() => lines);
}

/** Credentials present and Shopify stubbed, so a test can reach the real path. */
function withShopify(run) {
  process.env.SHOPIFY_SHOP_DOMAIN = 'x.myshopify.com';
  process.env.SHOPIFY_ADMIN_API_TOKEN = 'shpat_test';
  delete process.env.SHOPIFY_CLIENT_ID; delete process.env.SHOPIFY_CLIENT_SECRET;
  const real = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ data: { customers: { edges: [] }, customerCreate: { customer: { id: '1' }, userErrors: [] } } }), { status: 200 });
  return Promise.resolve(run()).finally(() => { globalThis.fetch = real; });
}

// These two asserted 204 — a success — for a sync that never happened. That is
// the bug, written down as the expected behaviour: the function ran without
// Shopify credentials for its whole life, reported no errors because by this
// contract there were none, and the first evidence was a customer list with
// zero sp-lead tags. A missing credential must be indistinguishable from
// nothing else, least of all from working.
test('no shop domain -> 500, naming SHOPIFY_SHOP_DOMAIN', async () => {
  delete process.env.SHOPIFY_SHOP_DOMAIN; delete process.env.SHOPIFY_ADMIN_API_TOKEN;
  delete process.env.SHOPIFY_CLIENT_ID; delete process.env.SHOPIFY_CLIENT_SECRET;
  let status;
  const logged = await withErrorLog(async () => { status = (await fn(post(valid))).status; });
  assert.equal(status, 500, 'a missing credential still reports success');
  assert.ok(logged.some((l) => l.includes('SHOPIFY_SHOP_DOMAIN')), 'the log does not name the variable');
});
test('shop set but no credentials -> 500, naming all three', async () => {
  process.env.SHOPIFY_SHOP_DOMAIN = 'x.myshopify.com';
  delete process.env.SHOPIFY_ADMIN_API_TOKEN;
  delete process.env.SHOPIFY_CLIENT_ID; delete process.env.SHOPIFY_CLIENT_SECRET;
  let status;
  const logged = await withErrorLog(async () => { status = (await fn(post(valid))).status; });
  assert.equal(status, 500);
  const line = logged.join(' ');
  for (const name of ['SHOPIFY_ADMIN_API_TOKEN', 'SHOPIFY_CLIENT_ID', 'SHOPIFY_CLIENT_SECRET']) {
    assert.ok(line.includes(name), `the log does not name ${name}`);
  }
});
test('consent refused before any network call', async () => {
  assert.equal((await fn(post({ ...valid, marketing_consent: false }))).status, 400);
});
test('an unrecognised stage is dropped, not refused', async () => {
  // The signup form never asks the question — it lives on /thanks — so
  // rejecting a submission for not knowing the answer yet is what kept this
  // sync from ever writing a customer.
  //
  // Credentials are stubbed in rather than absent. This used to pass with none
  // set, which meant it proved only that the no-op path returned the same code
  // for both inputs; it never reached the branch it names.
  await withShopify(async () => {
    assert.equal((await fn(post({ ...valid, stage: 'nope' }))).status, 204);
    assert.equal((await fn(post({ ...valid, stage: undefined }))).status, 204);
  });
});
test('client credentials failure -> 500, lead not lost', async () => {
  // 202 Accepted before, which graphs as a success. The lead is still safe —
  // Netlify Forms holds it and the browser uses sendBeacon — but a token
  // exchange that failed is a failure, and the function's error rate is the
  // only place anyone would see it.
  process.env.SHOPIFY_SHOP_DOMAIN = 'x.myshopify.com';
  delete process.env.SHOPIFY_ADMIN_API_TOKEN;
  process.env.SHOPIFY_CLIENT_ID = 'id'; process.env.SHOPIFY_CLIENT_SECRET = 'secret';
  const real = globalThis.fetch;
  globalThis.fetch = async () => new Response('{"error":"shop_not_permitted"}', { status: 401 });
  const logged = await withErrorLog(async () => {
    assert.equal((await fn(post(valid))).status, 500);
  });
  globalThis.fetch = real;
  assert.ok(logged.some((l) => l.includes('access token')), 'the failure is not logged at error level');
});
test('client credentials success -> token used as X-Shopify-Access-Token', async () => {
  process.env.SHOPIFY_CLIENT_ID = 'id'; process.env.SHOPIFY_CLIENT_SECRET = 'secret';
  const seen = [];
  const real = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    seen.push({ url: String(url), auth: init?.headers?.['X-Shopify-Access-Token'] });
    if (String(url).includes('/admin/oauth/access_token')) {
      return new Response(JSON.stringify({ access_token: 'shpat_test', expires_in: 86399 }), { status: 200 });
    }
    return new Response(JSON.stringify({ data: { customers: { edges: [] }, customerCreate: { customer: { id: '1' }, userErrors: [] } } }), { status: 200 });
  };
  const res = await fn(post(valid));
  globalThis.fetch = real;
  assert.equal(res.status, 204);
  assert.ok(seen[0].url.includes('/admin/oauth/access_token'), 'exchanges credentials first');
  assert.ok(seen.slice(1).every(r => r.auth === 'shpat_test'), 'uses the exchanged token');
});

/**
 * Shopify writes.
 *
 * `graph` stands in for the Admin API and records every mutation input, so
 * these assert on what would actually be written rather than on a status code.
 */
function shopify(nodes) {
  const seen = [];
  const real = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    const u = String(url);
    if (u.includes('/admin/oauth/access_token')) {
      return new Response(JSON.stringify({ access_token: 'shpat_test', expires_in: 86399 }), { status: 200 });
    }
    const body = JSON.parse(init.body);
    seen.push(body);
    if (body.query.includes('FindCustomer')) {
      return new Response(JSON.stringify({ data: { customers: { edges: nodes } } }), { status: 200 });
    }
    return new Response(
      JSON.stringify({
        data: {
          customerCreate: { customer: { id: 'gid://1' }, userErrors: [] },
          customerUpdate: { customer: { id: 'gid://1' }, userErrors: [] },
        },
      }),
      { status: 200 },
    );
  };
  return { seen, restore: () => { globalThis.fetch = real; } };
}

const existing = [{ node: { id: 'gid://1', tags: ['sp-lead', 'vip'] } }];
const keys = (input) => (input.metafields ?? []).map((m) => m.key).sort();
const mutation = (seen) => seen.find((b) => !b.query.includes('FindCustomer'))?.variables.input;

function configure() {
  process.env.SHOPIFY_SHOP_DOMAIN = 'x.myshopify.com';
  process.env.SHOPIFY_CLIENT_ID = 'id';
  process.env.SHOPIFY_CLIENT_SECRET = 'secret';
  delete process.env.SHOPIFY_ADMIN_API_TOKEN;
}

test('a signup writes the acquisition path even with no stage yet', async () => {
  configure();
  const { seen, restore } = shopify([]);
  const res = await fn(post({ ...valid, stage: undefined, source_path: '/guides/storage-failure' }));
  restore();
  assert.equal(res.status, 204);

  const input = mutation(seen);
  assert.deepEqual(keys(input), ['first_touch_date', 'lead_magnet', 'source_path']);
  const source = input.metafields.find((m) => m.key === 'source_path');
  assert.equal(source.value, '/guides/storage-failure');
  // No stage means no stage- tag rather than a "stage-" tag with nothing after it.
  assert.ok(!input.tags.some((t) => t.startsWith('stage-')), input.tags.join());
  assert.equal(input.emailMarketingConsent.marketingState, 'SUBSCRIBED');
});

test('the /thanks follow-up writes the stage and touches nothing else', async () => {
  configure();
  const { seen, restore } = shopify(existing);
  const res = await fn(post({ ...valid, source_path: '/thanks', submission_type: 'lifecycle_preference', marketing_consent: false, stage: 'cottage-seller' }));
  restore();
  assert.equal(res.status, 204);

  const input = mutation(seen);
  assert.deepEqual(keys(input), ['lifecycle_stage']);
  assert.equal(input.metafields[0].value, 'cottage-seller');
  // Re-sending consent would move consentUpdatedAt to the moment they answered
  // a survey, which is not when permission was given.
  assert.equal(input.emailMarketingConsent, undefined);
  // Existing tags survive; the stage tag is added.
  assert.ok(input.tags.includes('vip'));
  assert.ok(input.tags.includes('stage-cottage-seller'));
});

test('a follow-up for an address with no customer creates nothing', async () => {
  configure();
  const { seen, restore } = shopify([]);
  const res = await fn(post({ ...valid, source_path: '/thanks', submission_type: 'lifecycle_preference', marketing_consent: false }));
  restore();
  assert.equal(res.status, 204);
  assert.equal(mutation(seen), undefined, 'no customer should be created from a survey answer');
});

test('a follow-up with no recognised stage costs no API call at all', async () => {
  configure();
  const { seen, restore } = shopify(existing);
  const res = await fn(post({ ...valid, source_path: '/thanks', submission_type: 'lifecycle_preference', marketing_consent: false, stage: 'nope' }));
  restore();
  assert.equal(res.status, 204);
  assert.equal(seen.length, 0);
});
