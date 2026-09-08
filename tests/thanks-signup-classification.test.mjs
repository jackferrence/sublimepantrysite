/**
 * The /thanks classification bug, locked out.
 *
 * Both backends used to decide "is this a preference update?" from
 * `source_path === '/thanks'`. The footer newsletter form is rendered on
 * /thanks as well and reports the same path, so a real consented signup made
 * from the footer there was classified as a follow-up: no subscribe, no
 * consent, no customer, and HTTP 200 back to Netlify. The visitor saw the
 * checklist page and was never subscribed anywhere.
 *
 * The payloads below are not invented. They were serialised by a real browser
 * from the real forms on the built /thanks page, via `new FormData(form)`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const klaviyo = (await import('../netlify/functions/submission-created.mts')).default;
const shopify = (await import('../netlify/functions/lead-capture.mjs')).default;

/** Captured from the footer newsletter form while standing on /thanks. */
const FOOTER_SIGNUP_ON_THANKS = {
  'form-name': 'freeze-drying-checklist',
  lead_magnet: 'freeze-drying-starter-checklist',
  source_path: '/thanks',
  'bot-field': '',
  email: 'real.visitor@example.com',
  marketing_consent: 'yes',
};

/** Captured from the lifecycle-preference form on /thanks. */
const PREFERENCE_UPDATE = {
  'form-name': 'freeze-drying-checklist',
  lead_magnet: 'freeze-drying-starter-checklist',
  source_path: '/thanks',
  submission_type: 'lifecycle_preference',
  'bot-field': '',
  email: 'already.subscribed@example.com',
  stage: 'new-owner',
};

const formEvent = (data) =>
  new Request('https://x/.netlify/functions/submission-created', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      payload: { form_name: data['form-name'], created_at: '2026-09-08T17:00:00.000Z', data },
    }),
  });

const beacon = (body) =>
  new Request('https://x/.netlify/functions/lead-capture', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

async function record(fn, req) {
  const calls = [];
  const real = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), body: typeof init?.body === 'string' ? init.body : '' });
    if (String(url).includes('graphql')) {
      return new Response(
        JSON.stringify({
          data: {
            customers: { edges: [] },
            customerCreate: { customer: { id: 'gid://1' }, userErrors: [] },
            customerUpdate: { customer: { id: 'gid://1' }, userErrors: [] },
          },
        }),
        { status: 200 },
      );
    }
    return new Response('{}', { status: 200 });
  };
  try {
    const res = await fn(req, {});
    return { status: res?.status, calls };
  } finally {
    globalThis.fetch = real;
  }
}

test.beforeEach(() => {
  process.env.KLAVIYO_PRIVATE_API_KEY = 'pk_test_not_a_real_key';
  process.env.SHOPIFY_SHOP_DOMAIN = 'x.myshopify.com';
  process.env.SHOPIFY_ADMIN_API_TOKEN = 'shpat_test';
});

const subscribed = (calls) => calls.some((c) => c.url.includes('profile-subscription-bulk-create-jobs'));
const wroteConsent = (calls) => calls.some((c) => /consented_at|consentUpdatedAt/.test(c.body));

test('a consented signup from /thanks is subscribed, not mistaken for a preference update', async () => {
  const { calls } = await record(klaviyo, formEvent(FOOTER_SIGNUP_ON_THANKS));
  assert.ok(subscribed(calls), 'a consented signup on /thanks was never subscribed — the bug is back');
  assert.ok(wroteConsent(calls), 'consent was not recorded for a real opt-in');
});

test('the same signup records its acquisition fields', async () => {
  const { calls } = await record(klaviyo, formEvent(FOOTER_SIGNUP_ON_THANKS));
  const props = calls.find((c) => c.url.includes('profile-import'))?.body ?? '';
  assert.match(props, /signup_source/);
  assert.match(props, /lead_magnet/);
});

test('a preference update neither subscribes nor writes consent', async () => {
  const { calls } = await record(klaviyo, formEvent(PREFERENCE_UPDATE));
  assert.equal(subscribed(calls), false, 'a survey answer must never re-subscribe');
  assert.equal(wroteConsent(calls), false, 'a survey answer must never stamp consent');
  const props = calls.find((c) => c.url.includes('profile-import'))?.body ?? '';
  assert.doesNotMatch(props, /signup_source/, 'a preference update must not overwrite acquisition data');
  assert.doesNotMatch(props, /lead_magnet/, 'a preference update must not overwrite acquisition data');
});

test('Shopify: a consented signup from /thanks still writes consent and acquisition data', async () => {
  const { calls } = await record(
    shopify,
    beacon({ email: 'real.visitor@example.com', source_path: '/thanks', lead_magnet: 'freeze-drying-starter-checklist', submission_type: '', marketing_consent: true }),
  );
  assert.ok(calls.length > 0, 'the Shopify sync made no call for a real signup');
  const written = calls.map((c) => c.body).join(' ');
  assert.match(written, /consentUpdatedAt/);
  assert.match(written, /source_path/);
});

test('Shopify: a preference update writes no consent and no acquisition fields', async () => {
  const { calls } = await record(
    shopify,
    beacon({ email: 'already.subscribed@example.com', stage: 'new-owner', source_path: '/thanks', lead_magnet: 'freeze-drying-starter-checklist', submission_type: 'lifecycle_preference', marketing_consent: false }),
  );
  const written = calls.map((c) => c.body).join(' ');
  assert.doesNotMatch(written, /consentUpdatedAt/);
  assert.doesNotMatch(written, /"key":"source_path"/);
});

test('neither backend classifies by source_path any more', () => {
  for (const f of ['netlify/functions/submission-created.mts', 'netlify/functions/lead-capture.mjs']) {
    const src = readFileSync(join(root, f), 'utf8');
    assert.doesNotMatch(
      src,
      /isFollowUp\s*=\s*[^;]*source_path/,
      `${f} still decides follow-up status from source_path`,
    );
    assert.match(src, /FOLLOW_UP_SUBMISSION_TYPE/, `${f} does not use the declared marker`);
  }
});

test('the /thanks preference form declares itself and carries no hidden consent', () => {
  const src = readFileSync(join(root, 'src/pages/thanks.astro'), 'utf8');
  assert.match(src, /name="submission_type" value="lifecycle_preference"/);
  assert.doesNotMatch(
    src,
    /name="marketing_consent"\s+value="yes"/,
    'a preference form must not carry consent — that is consent manufactured by a survey answer',
  );
});
