/**
 * Netlify Forms → Klaviyo bridge.
 *
 * The two branches that could cause real harm — subscribing a form we were
 * given no consent for, and subscribing without an affirmative opt-in — are
 * asserted to make no network call at all, not merely to return early.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const mod = await import('../netlify/functions/submission-created.mts');
const fn = mod.default;

const fixture = (name) =>
  JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8'));

const consented = fixture('submission-consent');
const unconsented = fixture('submission-no-consent');
const contact = fixture('submission-contact');

const post = (body) =>
  new Request('https://x/.netlify/functions/submission-created', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

/** Swaps in a recording fetch for one call, always restoring the real one. */
async function withFetch(responder, run) {
  const calls = [];
  const real = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return responder(String(url));
  };
  try {
    return { result: await run(), calls };
  } finally {
    globalThis.fetch = real;
  }
}

const ok = () => new Response('{}', { status: 200 });
const KEY = 'pk_test_not_a_real_key';

test.beforeEach(() => {
  process.env.KLAVIYO_PRIVATE_API_KEY = KEY;
});

test('the contact form is never subscribed, and costs no network call', async () => {
  const { result, calls } = await withFetch(ok, () => fn(post(contact)));
  assert.equal(result.status, 200);
  assert.equal(calls.length, 0);
});

test('an unknown form is never subscribed', async () => {
  const body = { payload: { ...consented.payload, form_name: 'careers' } };
  const { result, calls } = await withFetch(ok, () => fn(post(body)));
  assert.equal(result.status, 200);
  assert.equal(calls.length, 0);
});

test('no consent field means no subscribe, and no network call', async () => {
  const { result, calls } = await withFetch(ok, () => fn(post(unconsented)));
  assert.equal(result.status, 200);
  assert.equal(calls.length, 0);
});

test('a non-affirmative consent value is not consent', async () => {
  for (const value of ['no', 'off', 'false', '0', '', 'maybe']) {
    const body = {
      payload: { ...consented.payload, data: { ...consented.payload.data, marketing_consent: value } },
    };
    const { result, calls } = await withFetch(ok, () => fn(post(body)));
    assert.equal(result.status, 200, `"${value}" must not subscribe`);
    assert.equal(calls.length, 0, `"${value}" must not call Klaviyo`);
  }
});

test('affirmative values are accepted case-insensitively', async () => {
  for (const value of ['on', 'yes', 'YES', 'True', '1']) {
    const body = {
      payload: { ...consented.payload, data: { ...consented.payload.data, marketing_consent: value } },
    };
    const { result, calls } = await withFetch(ok, () => fn(post(body)));
    assert.equal(result.status, 200, `"${value}" should subscribe`);
    assert.equal(calls.length, 2, `"${value}" should call Klaviyo`);
  }
});

test('a submission with no email is a no-op, not an error', async () => {
  const data = { ...consented.payload.data };
  delete data.email;
  const { result, calls } = await withFetch(ok, () => fn(post({ payload: { ...consented.payload, data } })));
  assert.equal(result.status, 200);
  assert.equal(calls.length, 0);
});

test('a missing API key is a 500, not a silent success', async () => {
  delete process.env.KLAVIYO_PRIVATE_API_KEY;
  const { result, calls } = await withFetch(ok, () => fn(post(consented)));
  assert.equal(result.status, 500);
  assert.equal(calls.length, 0);
});

test('a consented submission subscribes to the right list with the right shape', async () => {
  const { result, calls } = await withFetch(ok, () => fn(post(consented)));
  assert.equal(result.status, 200);
  assert.equal(calls.length, 2);

  const [importCall, subscribeCall] = calls;
  assert.equal(importCall.url, 'https://a.klaviyo.com/api/profile-import');
  assert.equal(subscribeCall.url, 'https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs');

  for (const call of calls) {
    assert.equal(call.init.headers.revision, '2025-07-15');
    assert.equal(call.init.headers.Authorization, `Klaviyo-API-Key ${KEY}`);
    assert.equal(call.init.headers['content-type'], 'application/vnd.api+json');
  }

  const imported = JSON.parse(importCall.init.body).data.attributes;
  // Trimmed and lowercased from "  Sample.Lead@Example.COM ".
  assert.equal(imported.email, 'sample.lead@example.com');
  assert.deepEqual(imported.properties, {
    email_pref: 'both',
    audience: 'unknown',
    signup_source: '/guides/freeze-drying-basics',
    lead_magnet: 'freeze-drying-starter-checklist',
    consent_timestamp: '2026-09-04T17:24:11.482Z',
  });

  const job = JSON.parse(subscribeCall.init.body).data;
  assert.equal(job.type, 'profile-subscription-bulk-create-job');
  assert.equal(job.attributes.custom_source, 'netlify:freeze-drying-checklist');
  assert.deepEqual(job.relationships.list.data, { type: 'list', id: 'QPLXmc' });

  const profile = job.attributes.profiles.data[0].attributes;
  assert.equal(profile.email, 'sample.lead@example.com');
  assert.deepEqual(profile.subscriptions.email.marketing, {
    consent: 'SUBSCRIBED',
    consented_at: '2026-09-04T17:24:11.482Z',
  });
});

test('the defaults fill in when the optional fields are absent', async () => {
  const body = {
    payload: {
      ...consented.payload,
      data: { email: 'a@b.com', marketing_consent: 'on' },
    },
  };
  const { calls } = await withFetch(ok, () => fn(post(body)));
  const { properties } = JSON.parse(calls[0].init.body).data.attributes;
  assert.equal(properties.signup_source, '/');
  assert.equal(properties.lead_magnet, 'freeze-drying-checklist');
});

test('an unparseable created_at falls back to now rather than being sent through', async () => {
  const body = { payload: { ...consented.payload, created_at: 'not-a-date' } };
  const { calls } = await withFetch(ok, () => fn(post(body)));
  const { properties } = JSON.parse(calls[0].init.body).data.attributes;
  assert.ok(!Number.isNaN(new Date(properties.consent_timestamp).getTime()));
});

test('a failed subscribe is a 502, never a 200', async () => {
  const { result } = await withFetch(
    (url) => (url.includes('bulk-create-jobs') ? new Response('{"errors":[]}', { status: 429 }) : ok()),
    () => fn(post(consented)),
  );
  assert.equal(result.status, 502);
});

test('a failed profile-import still subscribes, but reports 502', async () => {
  const { result, calls } = await withFetch(
    (url) => (url.includes('profile-import') ? new Response('{"errors":[]}', { status: 400 }) : ok()),
    () => fn(post(consented)),
  );
  assert.equal(result.status, 502);
  assert.equal(calls.length, 2, 'the consented person must still be subscribed');
});

test('a non-JSON event body is a 400', async () => {
  const bad = new Request('https://x/.netlify/functions/submission-created', {
    method: 'POST',
    body: 'not json',
  });
  const { result, calls } = await withFetch(ok, () => fn(bad));
  assert.equal(result.status, 400);
  assert.equal(calls.length, 0);
});
