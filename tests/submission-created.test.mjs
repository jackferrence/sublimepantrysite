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
const followUp = fixture('submission-follow-up');

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
  // No lifecycle_stage: the signup form does not ask, and writing an empty one
  // would clear a stage a later follow-up had recorded.
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

/**
 * The /thanks follow-up.
 *
 * It posts to the same Netlify form as the signup, so this function fires a
 * second time for someone who is already subscribed. These tests pin the two
 * things that second fire must not do: move the acquisition path, and move the
 * consent timestamp.
 */
test('the follow-up records the stage and nothing else', async () => {
  const { result, calls } = await withFetch(ok, () => fn(post(followUp)));
  assert.equal(result.status, 200);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://a.klaviyo.com/api/profile-import');

  const imported = JSON.parse(calls[0].init.body).data.attributes;
  assert.equal(imported.email, 'sample.lead@example.com');
  assert.deepEqual(imported.properties, { lifecycle_stage: 'new-owner' });
});

test('the follow-up never re-subscribes, so consented_at cannot drift later', async () => {
  const { calls } = await withFetch(ok, () => fn(post(followUp)));
  const subscribe = calls.find((c) => c.url.includes('bulk-create-jobs'));
  assert.equal(subscribe, undefined);
});

test('the follow-up does not overwrite signup_source or lead_magnet', async () => {
  const { calls } = await withFetch(ok, () => fn(post(followUp)));
  const { properties } = JSON.parse(calls[0].init.body).data.attributes;
  // Both fields are present in the fixture and both must be ignored: the
  // acquisition page is "/guides/freeze-drying-basics", not "/thanks".
  assert.equal(properties.signup_source, undefined);
  assert.equal(properties.lead_magnet, undefined);
  assert.equal(properties.consent_timestamp, undefined);
});

test('an unrecognised stage is dropped rather than written', async () => {
  const body = {
    payload: {
      ...followUp.payload,
      data: { ...followUp.payload.data, stage: 'freeze-dryer-influencer' },
    },
  };
  const { result, calls } = await withFetch(ok, () => fn(post(body)));
  assert.equal(result.status, 200);
  // Nothing left to write, so no call at all — an empty update could clear a
  // stage that is already recorded.
  assert.equal(calls.length, 0);
});

test('a stage on the signup path rides along with the acquisition properties', async () => {
  const body = {
    payload: {
      ...consented.payload,
      data: { ...consented.payload.data, stage: 'cottage-seller' },
    },
  };
  const { calls } = await withFetch(ok, () => fn(post(body)));
  const { properties } = JSON.parse(calls[0].init.body).data.attributes;
  assert.equal(properties.lifecycle_stage, 'cottage-seller');
  assert.equal(properties.signup_source, '/guides/freeze-drying-basics');
  assert.equal(calls.length, 2);
});

test('a failed follow-up profile-import is a 502, not a quiet 200', async () => {
  const fail = () => new Response('{"errors":[]}', { status: 400 });
  const { result, calls } = await withFetch(fail, () => fn(post(followUp)));
  assert.equal(result.status, 502);
  assert.equal(calls.length, 1);
});
