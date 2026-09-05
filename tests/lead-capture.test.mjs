import { test } from 'node:test';
import assert from 'node:assert/strict';
const mod = await import('../netlify/functions/lead-capture.mjs');
const fn = mod.default;
const post = (body) => new Request('https://x/.netlify/functions/lead-capture', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});
const valid = { email: 'a@b.com', stage: 'new-owner', marketing_consent: true, source_path: '/', lead_magnet: 'freeze-drying-starter-checklist' };

test('no credentials at all -> 204 no-op', async () => {
  delete process.env.SHOPIFY_SHOP_DOMAIN; delete process.env.SHOPIFY_ADMIN_API_TOKEN;
  delete process.env.SHOPIFY_CLIENT_ID; delete process.env.SHOPIFY_CLIENT_SECRET;
  assert.equal((await fn(post(valid))).status, 204);
});
test('shop set but no credentials -> 204 no-op', async () => {
  process.env.SHOPIFY_SHOP_DOMAIN = 'x.myshopify.com';
  assert.equal((await fn(post(valid))).status, 204);
});
test('consent refused before any network call', async () => {
  assert.equal((await fn(post({ ...valid, marketing_consent: false }))).status, 400);
});
test('an unrecognised stage is dropped, not refused', async () => {
  // The signup form never asks the question — it lives on /thanks — so
  // rejecting a submission for not knowing the answer yet is what kept this
  // sync from ever writing a customer.
  process.env.SHOPIFY_SHOP_DOMAIN = 'x.myshopify.com';
  delete process.env.SHOPIFY_CLIENT_ID; delete process.env.SHOPIFY_CLIENT_SECRET;
  delete process.env.SHOPIFY_ADMIN_API_TOKEN;
  assert.equal((await fn(post({ ...valid, stage: 'nope' }))).status, 204);
  assert.equal((await fn(post({ ...valid, stage: undefined }))).status, 204);
});
test('client credentials failure -> 202, lead not lost', async () => {
  process.env.SHOPIFY_CLIENT_ID = 'id'; process.env.SHOPIFY_CLIENT_SECRET = 'secret';
  const real = globalThis.fetch;
  globalThis.fetch = async () => new Response('{"error":"shop_not_permitted"}', { status: 401 });
  assert.equal((await fn(post(valid))).status, 202);
  globalThis.fetch = real;
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
  const res = await fn(post({ ...valid, source_path: '/thanks', stage: 'cottage-seller' }));
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
  const res = await fn(post({ ...valid, source_path: '/thanks' }));
  restore();
  assert.equal(res.status, 204);
  assert.equal(mutation(seen), undefined, 'no customer should be created from a survey answer');
});

test('a follow-up with no recognised stage costs no API call at all', async () => {
  configure();
  const { seen, restore } = shopify(existing);
  const res = await fn(post({ ...valid, source_path: '/thanks', stage: 'nope' }));
  restore();
  assert.equal(res.status, 204);
  assert.equal(seen.length, 0);
});
