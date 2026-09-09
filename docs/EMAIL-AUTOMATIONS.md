# Email automations

Engine: **Shopify Email / Shopify Messaging** (already installed on the store).
Entry conditions are **customer tags**, written by `netlify/functions/lead-capture.mjs` and by Shopify Flow. See `docs/CUSTOMER-LIFECYCLE.md` and `docs/SHOPIFY-FLOW-WORKFLOWS.md`.

## Non-negotiables

- **No marketing send to a customer without `emailMarketingConsent = SUBSCRIBED`.** Shopify enforces this for marketing automations; do not work around it with transactional templates.
- Every marketing email carries Shopify's unsubscribe link. Do not remove or restyle it into invisibility.
- Unsubscribe suppresses the customer across **all** flows immediately. Shopify handles this; never maintain a second suppression list.
- Transactional order/shipping notifications are separate, are sent by Shopify automatically, and are not governed by marketing consent.
- No claim in any email may exceed what the site's sourced content supports. No shelf-life guarantees, no food-safety promises, no health claims.

## FLOW A — Pre-owner

**Entry:** customer tag `seq-pre-owner` (set by Flow 3 from `stage-considering`).
**Exit:** on tag `packaging-buyer` or `freeze-drying-owner`. Someone who buys a machine or a kit mid-sequence should stop being sold a machine.

| # | Send | Subject intent | Content | Primary link |
|---|---|---|---|---|
| 1 | Immediately | Deliver what they asked for | The Freeze-Drying Starter Checklist, what Sublime Pantry is, how the content is sourced | `/freeze-drying-starter-checklist` |
| 2 | +2 days | What freeze drying actually costs | Machine price band, power draw, consumables, the honest total | `/guides/which-freeze-dryer` |
| 3 | +5 days | Freeze drying vs. dehydrating | The real differences and the buying mistakes that follow from confusing them | `/compare/home-freeze-dryers` |
| 4 | +8 days | Which machine | The decision framework: size, brand, power, placement, running cost | `/guides/which-freeze-dryer` |

Email 4 is the affiliate-ready slot. **No affiliate links exist yet — do not insert placeholder or invented ones.** When a real program is joined, links must be `rel="sponsored"` and the email must carry the same disclosure standard as `/affiliate-disclosure`.

Do not sell the packaging starter kit in Flow A. These readers do not own a freeze dryer.

## FLOW B — Owner

**Entry:** customer tag `seq-owner` (from `stage-new-owner` or `stage-active-owner`).
**Exit:** on tag `packaging-buyer` — they've bought; move them to Flow C.

| # | Send | Subject intent | Content | Primary link |
|---|---|---|---|---|
| 1 | Immediately | Checklist + first-batch workflow | The checklist, then the full batch workflow | `/guides/complete-batch-workflow` |
| 2 | +2 days | How to verify dryness | Checking the thickest pieces, centre-tray behaviour, what "done" looks like | `/troubleshooting/batch-not-dry` |
| 3 | +5 days | Packaging and oxygen absorbers | Bag choice, absorber sizing, heat sealing, seal inspection | `/compare/storage-containers` |
| 4 | +8 days | The Starter Set | Bags, absorbers and the sealer as one consolidated answer to email 3, with `WELCOME10` | `/shop/starter-set-50-bags-50-absorbers-sealer` |

**Email 4 was repointed on 2026-09-09 and the live automation must be edited to match.** It sold the boxed Freeze-Drying Packaging Starter Kit and linked `/shop/freeze-dryer-packaging-starter-kit`, which is archived; that URL now 301s to `/shop`, so the send was pushing subscribers through a redirect to a page that no longer sold what the email described. The Starter Set is the honest replacement: it is the same consolidated answer to email 3 — bags, matched absorbers, and the sealer that closes them — in a product we actually stock.

Email 4 must not mention `WELCOME10` unless the discount exists in Shopify and `LAUNCH_OFFER.enabled` is `true` in `src/lib/commerce.ts`. Those two must flip together. As of 2026-09-09 both are true: `WELCOME10` is 10% off **all products** with no product scoping. The previous code was scoped to the archived kit alone and applied to nothing — do not re-scope a promotional code to a single product again.

**Do not promise free shipping in this email**, or in any offer copy. The discount is applied before the shipping threshold is evaluated, so a 10% discount can drop an order back under the bar the email just promised it would clear.

**Cottage sellers** (`seq-seller`) run Flow B initially. They are owners with a commercial motive; the packaging content is directly relevant. Add a fifth email pointing to `/guides/cottage-economics` and `/start-selling`. Split this into a separate sequence only once there is enough volume to justify it.

## FLOW C — Packaging buyer

**Entry:** customer tag `packaging-buyer` (set by Flow 2 on `Order paid`).

| # | Send | Subject intent | Content |
|---|---|---|---|
| 1 | Immediately | What happens next | Order confirmed, honest fulfillment expectation — we assemble and ship it ourselves from our own stock, so set a realistic window against our own packing time. Do not promise a delivery date you cannot meet. |
| 2 | On fulfillment +2 days | Packaging workflow | How to use what they bought: bag/absorber pairing, sealing, inspection |
| 3 | +7 days | Storage mistakes | The failure modes that show up weeks later, and how to avoid them |
| 4 | +14 days | Review request / feedback | See `docs/REVIEWS-INTEGRATION.md` — prefer Judge.me's own request over duplicating it here |

Email 1 is a **marketing** email in Shopify's model and therefore only reaches consented customers. The Shopify order confirmation is separate, automatic, and goes to everyone. Do not put essential order information only in email 1.

## Abandoned checkout

Use **Shopify's built-in abandoned checkout recovery**. It is the only system that can see a Shopify checkout; the Astro frontend cannot.

- Enable in **Settings → Notifications → Abandoned checkout**, or as a Shopify Email automation.
- One email is enough at soft-launch volume. Send at ~4–10 hours.
- `WELCOME10` exists and applies to everything, so it *can* be referenced here. Consider not discounting a recovery at all: contribution margin is thin, and recovering an order at a further 10% off may be worth less than the email. Do not pair it with a free-shipping promise.

## Browse abandonment

**Not supported and not to be built.** Browse abandonment requires storefront behavioural tracking tied to an identified customer. SublimePantry.com is a static Astro site using cookieless Plausible; it does not identify visitors and does not send behavioural events to Shopify. Shopify's abandonment features observe Shopify-hosted surfaces, which our product pages are not.

Building this would mean adding identity-linked tracking to the site, which contradicts the site's stated analytics stance. Revisit only as a deliberate, disclosed decision.

## Replenishment

**Deliberately not implemented.** We do not know how long 100 bags lasts a real customer. Any cadence chosen now would be a guess presented to customers as a recommendation.

Revisit after ~20 starter-kit orders with at least 8 weeks of history: measure actual reorder intervals, then set the cadence from that data. Track it as an experiment, not a launch feature.

## Build order

1. Flow C email 1 — the moment orders can be placed, a buyer must hear from you.
2. Abandoned checkout.
3. Flow A email 1 and Flow B email 1 — deliver the lead magnet.
4. The rest of A and B.
5. Flow C 2–4.
