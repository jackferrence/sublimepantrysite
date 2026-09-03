# Customer lifecycle

## Identity model

| System | Owns | Notes |
|---|---|---|
| **Shopify** | Customer identity, consent state, tags, metafields, orders, fulfillment | Source of truth for anything a marketing send or a Flow decision depends on |
| **Netlify Forms** | Raw lead submissions | Capture-of-record and the fallback. Never deleted; it is what proves a lead arrived even if the Shopify sync failed |
| **Plausible** | Anonymous funnel behaviour | Never holds an email address. See `docs/ANALYTICS-EVENTS.md` |
| **Astro site** | Nothing durable | The frontend stores no customer, cart, order or inventory state |

The join key is the **lowercased email address**.

## Flow of a lead

```
Newsletter form (src/components/Newsletter.astro)
   │
   ├─► POST → Netlify Forms          ← unchanged, always happens, system of record
   │
   └─► sendBeacon → /.netlify/functions/lead-capture
                        │
                        └─► Shopify Admin GraphQL (2026-07)
                              customers(query:"email:…")  → find
                              customerCreate / customerUpdate
                                • emailMarketingConsent
                                • tags
                                • metafields
                              │
                              └─► Shopify segments → Flow → Messaging
```

The beacon is **additive and non-blocking**. The native form POST navigates to `/freeze-drying-starter-checklist` exactly as before. If the function is down, unconfigured, or errors, the lead is still captured by Netlify Forms. Do not remove the Netlify path until Shopify sync has been verified against real submissions in production.

## Consent model

Consent is explicit and never inferred.

- The form's consent checkbox is `required`. There is no pre-checked box and no implied opt-in.
- The bridge script only sends the beacon when `marketing_consent === "yes"`.
- The function **rejects with 400** if `marketing_consent !== true`. It does not fall back to writing an unsubscribed customer, because a customer record created here without consent would be indistinguishable later from one that had it.
- On write: `emailMarketingConsent = { marketingState: SUBSCRIBED, marketingOptInLevel: SINGLE_OPT_IN, consentUpdatedAt: <now> }`.
- Unsubscribe is handled entirely by Shopify. Shopify's unsubscribe state always wins over anything this site sends. A resubscribe requires a new explicit form submission.

If we later move to double opt-in, change `marketingOptInLevel` to `CONFIRMED_OPT_IN` and set `marketingState: PENDING` until the confirmation click. Do not do this without also building the confirmation email in Shopify Messaging.

## Tags

Applied by the function, merged with (never replacing) existing tags:

| Tag | Meaning |
|---|---|
| `sp-lead` | Came from a SublimePantry.com lead form |
| `freeze-drying` | Category interest |
| `source-site` | Acquired on the website, not a Shopify-native surface |
| `stage-considering` | Does not own a freeze dryer yet |
| `stage-new-owner` | Owns one, running first batches |
| `stage-active-owner` | Freeze-dries regularly |
| `stage-cottage-seller` | Sells or plans to sell |
| `lead-starter-checklist` | Requested the starter checklist lead magnet |

Applied by Shopify Flow after purchase (see `docs/SHOPIFY-FLOW-WORKFLOWS.md`):

| Tag | Meaning |
|---|---|
| `starter-kit-buyer` | Bought SKU `MSMBS7MIL001` |
| `freeze-drying-owner` | Inferred owner status from a purchase |

**Only one `stage-*` tag should be authoritative at a time.** The function adds the newly submitted stage but does not remove the old one, because a stale removal would be a destructive write on a customer we may have mis-stage-detected. Stage transitions are resolved in Flow, which is allowed to remove superseded `stage-*` tags. Segments should therefore be written against the *most advanced* stage tag present, not "has exactly one".

## Metafields

Namespace `sublime_pantry`, on the Customer resource:

| Key | Type | Value |
|---|---|---|
| `lifecycle_stage` | `single_line_text_field` | The stage selected on the form |
| `source_path` | `single_line_text_field` | The page the lead converted on |
| `lead_magnet` | `single_line_text_field` | Which magnet was requested |
| `first_touch_date` | `date` | Set on create only; never overwritten on update |

`first_touch_date` is deliberately written only in the create branch so a returning submitter's original acquisition date survives.

## Failure and fallback behaviour

| Condition | Behaviour | Lead lost? |
|---|---|---|
| JavaScript disabled | Native form POST only | No — Netlify Forms |
| `sendBeacon` unavailable | Bridge skipped silently | No — Netlify Forms |
| `SHOPIFY_*` env vars absent | Function logs and returns **204** without any API call | No — Netlify Forms |
| Shopify API error / rate limit | Function logs the error message (never the email) and returns **202** | No — Netlify Forms |
| Consent missing | Function returns **400** and writes nothing | No — Netlify Forms |
| Invalid or unknown `stage` | Function returns **400** | No — Netlify Forms |

The function never returns a 500 that would make a browser retry, and never writes a partial customer.

## Reconciliation during soft launch

Until sync is proven, weekly: compare the Netlify Forms submission count to the count of Shopify customers tagged `sp-lead`. They should match. A gap means the beacon or the function is failing, and Netlify Forms is carrying the business alone.
