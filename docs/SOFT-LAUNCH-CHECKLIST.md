# Soft-launch checklist

The gate: **can a stranger land on Sublime Pantry, understand it, trust it, give us their email, understand the starter kit, receive the promotion, add to cart, pay, get the right confirmation, get the right product, get tracking, and hear from us appropriately?**

If yes, launch. If no, fix the link that failed. Every box below is a link in that chain.

Legend: ⬜ not done · 🟡 partial · ✅ verified · 🔒 blocked

---

## PRODUCTION — pages

| # | Check | What "pass" means | Status |
|---|---|---|---|
| 1 | Latest deploy is live | Netlify deploy matches the merged commit | ⬜ |
| 2 | Homepage — mobile | Hero readable, nav reachable, no horizontal scroll, offer legible | ⬜ |
| 3 | Homepage — desktop | As above at 1440px | ⬜ |
| 4 | `/shop` — mobile | Product card shows title/image/copy **before** Shopify JS resolves; price then appears | ⬜ |
| 5 | `/shop` — desktop | As above; single card is not stretched or orphaned in the grid | ⬜ |
| 6 | Starter-kit page — mobile | Hero image, price, add-to-cart all reachable without zoom | ⬜ |
| 7 | Starter-kit page — desktop | Two-column hero intact | ⬜ |
| 8 | `/freeze-drying-starter-checklist` | Renders, prints cleanly (offer + CTA hidden in print) | ⬜ |
| 9 | High-intent guide CTA | `StarterKitCTA` appears on the 5 owner-stage articles and on **none** of the pre-owner ones | ⬜ |
| 10 | Navigation | Shop link present; mobile menu opens and traps focus correctly | ⬜ |
| 11 | 404 page | Renders with working nav | ⬜ |
| 12 | Privacy / disclosure | `/privacy` covers marketing email and Shopify customer data; `/affiliate-disclosure` present | ⬜ |
| 13 | JS disabled | Product title, image, copy and all editorial content still render | ⬜ |

## COMMERCE

| # | Check | What "pass" means | Status |
|---|---|---|---|
| 13a | **Storefront API reachable** | `POST shop.sublimepantry.com/api/2026-01/graphql.json` returns data, not `Online Store channel is locked` | 🔒 **storefront is password protected** |
| 14 | Current Shopify price shows | Live price replaces the static placeholder | 🔒 blocked by 13a |
| 15 | Current inventory respected | Add-to-cart disables when unavailable; out-of-stock note shows | ⬜ |
| 16 | Product image loads | On `/shop` and the product page, both breakpoints | ⬜ |
| 16a | Storefront failure fallback | With the API unreachable, no raw error text is visible and the fallback link appears | ✅ verified in browser on this branch |
| 17 | Add to cart | Item lands in the Shopify cart with the right variant | 🔒 blocked by 13a |
| 18 | Cart opens | "View cart" opens the dialog; ESC closes it | ⬜ |
| 19 | Quantity change / remove | Works inside the Shopify cart component | ⬜ |
| 20 | Checkout handoff | Checkout button reaches Shopify checkout, top-level, not framed | ⬜ |
| 21 | `WELCOME10` applies | 10% comes off at checkout | 🔒 discount does not exist yet |
| 22 | Free shipping combines | Order discount **and** shipping discount both apply on one order | 🔒 |
| 23 | Checkout branding | Logo/colours read as Sublime Pantry, not a default store | ⬜ |
| 24 | Shipping rates | **Fix first:** the Domestic zone currently has two rates both named "Standard" ($6.25 and $0.00). A customer sees two identical labels and always picks free. Resolve before launch | ⬜ |
| 25 | International | No rates exist outside Domestic — international customers cannot check out. Either accept US-only and say so, or add a zone | ⬜ |
| 26 | Taxes | Tax settings configured for the selling nexus | ⬜ |
| 27 | Payment | Live payment provider enabled and test transaction authorised | ⬜ |
| 28 | Customer confirmation | Shopify order confirmation arrives, correct branding, correct contents | ⬜ |
| 29 | No draft products exposed | `/shop` lists only ACTIVE published products (currently: starter kit only) | ✅ fixed in this branch |
| 30 | Stale collections | Archive/Draft-prefixed collections are not reachable from any public surface | ⬜ |

## EMAIL

| # | Check | What "pass" means | Status |
|---|---|---|---|
| 31 | Lead submission | Netlify Forms receives the submission | ⬜ |
| 32 | Stage captured | `stage` present and one of the 4 valid values | ⬜ |
| 33 | Consent captured | `marketing_consent` present; form cannot submit without it | ⬜ |
| 34 | Shopify customer sync | Customer appears in Shopify with correct email | ⬜ |
| 35 | Consent survived sync | Customer shows **Subscribed**, not "not subscribed" | ⬜ |
| 36 | Correct tags | `sp-lead`, `freeze-drying`, `source-site`, `stage-*`, `lead-starter-checklist` | ⬜ |
| 37 | Metafields | `sublime_pantry.lifecycle_stage/source_path/lead_magnet/first_touch_date` | ⬜ |
| 38 | Correct automation entered | Flow 3 applies the right `seq-*` tag; the right sequence starts | ⬜ |
| 39 | Unsubscribe | Unsubscribe link works and suppresses further marketing | ⬜ |
| 40 | No unconsented send | A customer created without consent receives no marketing | ⬜ |
| 41 | Reconciliation | Netlify Forms count == Shopify `sp-lead` count | ⬜ |

## FULFILLMENT

| # | Check | What "pass" means | Status |
|---|---|---|---|
| 42 | PackFresh manual alert | Flow 1 internal email arrives with order number + full shipping address | ⬜ |
| 43 | Order tags | `PACKFRESH-MANUAL` and `VALIDATION-DROPSHIP` applied | ⬜ |
| 44 | Customer tag | `starter-kit-buyer` applied | ⬜ |
| 45 | Supplier-order SOP | `docs/MANUAL-FULFILLMENT.md` is accurate and followable by someone else | ⬜ |
| 46 | Supplier agreement | PackFreshUSA permits reselling/dropshipping to our customer at this volume | 🔒 owner action |
| 47 | Tracking update | Supplier tracking entered into the Shopify order | ⬜ |
| 48 | Fulfillment notification | Customer receives Shopify shipping confirmation with working tracking | ⬜ |
| 49 | Exception alert | Flow 5 fires when an order sits unfulfilled 48h | ⬜ |

## ANALYTICS

Set `window.spDebug = true` in the console and walk the funnel. Each event must fire **exactly once**.

| # | Check | Event | Status |
|---|---|---|---|
| 50 | Lead magnet exposure | `lead_magnet_view` | ⬜ |
| 51 | Signup intent | `newsletter_signup_start` | ⬜ |
| 52 | Signup | `newsletter_signup` with `lifecycle_stage`, `source_path` | ⬜ |
| 53 | CTA | `starter_kit_cta` with `campaign`/`content` | ⬜ |
| 54 | Product view | `product_view` with `product_handle`, `sku` | ⬜ |
| 55 | Add to cart | `starter_kit_add_to_cart` / `shop_add_to_cart` | ⬜ |
| 56 | Cart open | `cart_open` | ⬜ |
| 57 | Checkout | `checkout_handoff` | ⬜ |
| 58 | Promo | `promo_view` + `promo_click` | 🔒 offer disabled |
| 59 | **No PII leakage** | Inspect the Plausible network payloads: no email, no name anywhere | ⬜ |
| 60 | No duplicate events | Navigate client-side between pages and re-check — view transitions must not double-bind | ⬜ |
| 61 | Shopify analytics | Sessions/carts/checkouts/orders recording in Shopify | ⬜ |

## FINAL GATE

| # | Check | Status |
|---|---|---|
| 62 | One real customer-style test order, paid with a real card, from a clean browser | ⬜ |
| 63 | One full manual fulfillment: order placed at PackFreshUSA, tracking received, entered in Shopify, delivered | ⬜ |
| 64 | **Real contribution margin calculated** from that order: revenue − discount − Shopify/payment fees − supplier price − supplier shipping − supplier tax. Expect it to be negative at $59.99; confirm the actual number and accept it explicitly as acquisition cost | ⬜ |
| 65 | Every issue found above is fixed or consciously accepted and written down | ⬜ |
| 66 | Final mobile funnel walkthrough, end to end | ⬜ |
| 67 | Final desktop funnel walkthrough, end to end | ⬜ |
| 68 | **SOFT LAUNCH** | 🔒 |

---

## Known launch blockers as of this branch

0. **The Shopify storefront is password protected.** This locks the Online Store
   channel, which disables the Storefront API, which means `/shop` currently
   renders no products and **nobody can buy anything**. Verified 2026-09-03
   against the live store. One toggle in Online Store → Preferences.
   See `docs/SHOPIFY-ADMIN-SETUP.md` §0. Everything below is downstream of it.
1. `WELCOME10` and the automatic free-shipping discount **do not exist** in Shopify. The offer UI is built but disabled.
2. Duplicate `$6.25` / `$0.00` "Standard" shipping rates in the Domestic zone.
3. No shipping rates outside the Domestic zone.
4. `SHOPIFY_ADMIN_API_TOKEN` not set — the lead → customer bridge is a documented no-op until it is.
5. Judge.me not configured — no reviews, and therefore no social proof at launch. Acceptable; the first orders create it.
6. No test order has been placed, so fulfillment and margin are unvalidated.
7. Starter-kit inventory is 5 units.
