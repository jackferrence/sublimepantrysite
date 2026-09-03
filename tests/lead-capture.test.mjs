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
test('bad stage refused', async () => {
  assert.equal((await fn(post({ ...valid, stage: 'nope' }))).status, 400);
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
