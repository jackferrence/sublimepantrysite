# Netlify Forms → Klaviyo subscriber bridge

`netlify/functions/submission-created.mts` takes a verified Netlify Forms
submission and subscribes the address to the Klaviyo list `QPLXmc`
("The Dry Batch"), so the welcome flow can fire.

Netlify Forms remains the system of record. This function is additive: if it
fails, the submission is still in the Netlify dashboard and can be replayed by
hand. It must never be the reason a lead is lost, and it must never look like a
successful subscribe when it wasn't.

## Why the function is named `submission-created`

Netlify supports two ways to subscribe to platform events:

1. **Current, preferred** — export an object of handler methods; the filename
   carries no meaning:
   ```ts
   export default { formSubmitted(event: FormSubmittedEvent) { … } }
   ```
2. **Legacy** — name the file after the event (`submission-created.mts`) and
   receive the raw event body.

We are on (2), deliberately. As of `@netlify/functions@6`, the event object for
(1) is, in full:

```ts
interface FormSubmittedEvent { data: Record<string, string> }
```

No form name and no timestamp. Without a form name there is no way to tell this
form from the `contact` form, so the allowlist that keeps us from subscribing
people who never opted in could not be enforced. Without a timestamp there is
no consent time to record. The legacy payload carries both, as
`payload.form_name` and `payload.created_at`.

The handler itself uses the modern v2 signature (`Request` in, `Response` out),
not the retired `exports.handler`.

**Revisit when** `FormSubmittedEvent` grows a form name and a submission
timestamp. Until then, migrating would mean dropping a consent guarantee.

## Behaviour

| Condition | Result |
| --- | --- |
| `form_name` is not `freeze-drying-checklist` | 200, no Klaviyo call |
| `marketing_consent` not one of `on` / `yes` / `true` / `1` (any case) | 200, warning logged, no Klaviyo call |
| No email address | 200, no Klaviyo call |
| `KLAVIYO_PRIVATE_API_KEY` unset | 500, error logged |
| Klaviyo returns non-2xx | 502, status and body logged |
| Subscribed | 200 |

Two guards carry real consequences and are commented in the source:

- **The form allowlist.** Every Netlify form on the site triggers this same
  function, `contact` included. Someone emailing a question has not asked to
  join a marketing list. It is an allowlist, not a denylist, so a form added
  later is silent by default rather than subscribing by default.
- **The consent value check.** An unchecked checkbox is not submitted at all,
  while the surrounding fields still arrive — so a "is the field truthy" test
  would read a stray value as a yes. Only the exact affirmative values count.

Netlify filters honeypot (`bot-field`) submissions before any function runs, so
the bridge never sees them.

### Two Klaviyo calls, not one

Klaviyo's bulk-subscribe endpoint accepts only `email`, `phone_number`,
`subscriptions` and `age_gated_date_of_birth` on a profile — it has no
`properties` field, and Klaviyo documents setting properties as a separate
call. So the function makes two:

1. `POST /api/profile-import` — sets `email_pref`, `audience`, `signup_source`,
   `lead_magnet`, `consent_timestamp`.
2. `POST /api/profile-subscription-bulk-create-jobs` — sets
   `subscriptions.email.marketing.consent = SUBSCRIBED` with `consented_at`,
   `custom_source = netlify:{form_name}`, against list `QPLXmc`.

Properties go first, so a profile is never left subscribed with its source
metadata missing. If (1) fails the function still runs (2) — the person did
consent, and the welcome flow is what they were promised — but returns 502 so
the failure is visible rather than swallowed.

Both calls pin revision `2025-07-15`. Klaviyo versions its API by date; do not
float it.

## Environment variable

| Name | Scope | Where |
| --- | --- | --- |
| `KLAVIYO_PRIVATE_API_KEY` | **Functions**, all deploy contexts | Netlify → Site configuration → Environment variables |

Klaviyo → Settings → Account → API keys → Create private API key. Scopes:
`profiles:write` and `subscriptions:write`, nothing more.

It is a private key. It is read only from `process.env` inside the function,
never logged, never returned to the caller, and never given the `PUBLIC_`
prefix that would let Astro ship it to the browser. `.env` is gitignored.

## Local verification

Two fixtures exercise both branches without touching production:

- `tests/fixtures/submission-consent.json` — consented, should subscribe
- `tests/fixtures/submission-no-consent.json` — no consent, must skip
- `tests/fixtures/submission-contact.json` — the `contact` form, must skip

The unit tests are the fast path and hit no network at all:

```sh
npm test
```

To exercise the real function through the Netlify CLI, in one terminal:

```sh
netlify dev
```

and in another:

```sh
# Consented → attempts the two Klaviyo calls.
netlify functions:invoke submission-created --payload tests/fixtures/submission-consent.json

# No consent → logs a warning and returns 200 without calling Klaviyo.
netlify functions:invoke submission-created --payload tests/fixtures/submission-no-consent.json

# The contact form → returns 200 and does nothing.
netlify functions:invoke submission-created --payload tests/fixtures/submission-contact.json
```

To run the consented case without writing to the real Klaviyo account, start
`netlify dev` with a junk key: the call is attempted, Klaviyo rejects it, and
you should see a 502 with the Klaviyo error body logged.

```sh
KLAVIYO_PRIVATE_API_KEY=pk_not_a_real_key netlify dev
```

Omit the variable entirely and the same invocation should log
`KLAVIYO_PRIVATE_API_KEY is not set` and return 500.

## After deploy

Submit the real form on the deployed site, then:

```sh
netlify logs:function submission-created
```

Expect `Subscribed a "freeze-drying-checklist" lead to list QPLXmc.` The
profile should appear on The Dry Batch with `custom_source`
`netlify:freeze-drying-checklist`, and the welcome flow should fire.

Submitting `/contact` should log
`Form "contact" is not a subscribing form; ignoring.` and create no profile.
