# Analytics events

Source of implementation: `public/events.js`.
Analytics provider: **Plausible** (cookieless, `script.outbound-links.js`, loaded in `BaseLayout.astro`).

## Privacy rules (enforced in code)

- No email address, name, phone, or postal address is ever sent to Plausible.
  `events.js` strips any prop whose key matches `email|e_mail|name|first_name|last_name|phone|address` before sending, so a mistake at a call site cannot leak.
- `lifecycle_stage` is the coarse self-selected stage (`considering`, `new-owner`, `active-owner`, `cottage-seller`). It is not a personal identifier.
- Purchase, revenue and customer identity live in **Shopify analytics**, not Plausible. The frontend does not attempt to observe them.

## How events are declared

| Mechanism | Attribute | Fires when |
|---|---|---|
| Click | `data-sp-event="name"` | The element (or an ancestor) is clicked |
| Submit | `data-sp-event="name"` on a `<form>` | The form is submitted |
| Exposure | `data-sp-view="name"` | The element first scrolls into view (30% threshold, once per page) |
| Props | `data-sp-props='{"k":"v"}'` | Merged into the event's props |

`path` is always added automatically. On `data-sp-view` events, `utm_campaign` / `utm_content` / `utm_source` from the URL are merged in as `campaign` / `content` / `source`.

## Taxonomy

| Event | Funnel stage | Trigger | Props | Source of truth |
|---|---|---|---|---|
| `pageview` | Discovery | Plausible automatic | (Plausible defaults) | Plausible |
| `article_view` | Discovery | Not a custom event — use Plausible's pageview for `/guides/*`, `/troubleshooting/*`, `/compare/*` | — | Plausible |
| `lead_magnet_view` | Capture | Newsletter block scrolls into view | `lead_magnet`, `source_path`, `path`, `campaign?`, `content?` | Site |
| `newsletter_signup_start` | Capture | First focus into any newsletter field | `source_path`, `path` | Site |
| `newsletter_signup` | Capture | Newsletter form submit | `lifecycle_stage`, `source_path`, `lead_magnet`, `path` | Site (count of record: Netlify Forms) |
| `lead_magnet_cta` | Capture | "Use the free starter checklist" link in `StarterKitCTA` | `product_handle`, `campaign`, `content`, `source_path`, `destination` | Site |
| `starter_kit_cta` | Consideration | `StarterKitCTA` primary button | `product_handle`, `campaign`, `content`, `source_path`, `destination` | Site |
| `product_card_click` | Consideration | "See what's included" on `/shop` | `product_handle`, `destination`, `path` | Site |
| `product_view` | Consideration | Starter-kit product page scrolls into view | `product_handle`, `sku`, `path`, `campaign?`, `content?` | Site |
| `promo_view` | Consideration | `LaunchOffer` scrolls into view | `placement`, `promo_code`, `path` | Site |
| `promo_click` | Consideration | The promo code element is clicked | `placement`, `promo_code`, `path` | Site |
| `shop_add_to_cart` | Cart | Add to cart on `/shop` | `product_handle`, `sku`, `path` | Site (cart of record: Shopify) |
| `starter_kit_add_to_cart` | Cart | Add to cart on the product page | `product_handle`, `sku`, `path` | Site (cart of record: Shopify) |
| `cart_open` | Cart | "View cart" / "View your cart" buttons | `placement`, `path` | Site |
| `checkout_handoff` | Checkout | Click on the checkout link inside `<shopify-cart>` | `path` | Site — **handoff only, not a purchase** |
| `affiliate_outbound_click` | Monetisation | Click on any `rel="sponsored"` link | `destination`, `path` | Site |
| `tool_promo_click` | Engagement | Batch Log promo on the homepage | `destination`, `path` | Site |
| `scroll_complete` | Engagement | Reader reaches 90% of the page, once | `path` | Site |

## Deliberate gaps

**There is no `purchase` event, and there will not be one on the frontend.**
Shopify Storefront Web Components dispatch no documented DOM event for cart mutation or checkout. Checkout happens on Shopify's domain, so the site cannot observe completion. `checkout_handoff` is the last honest signal we own.

Attribute purchases in **Shopify → Analytics** (sessions, carts, checkouts, orders). The two systems are reconciled manually during soft launch: Plausible tells you how many people reached the handoff, Shopify tells you how many completed. Do not add a purchase pixel that fabricates the difference.

`add_to_cart` events are fired from the click, not from a confirmed Shopify cart mutation. If Shopify's cart count and this event diverge, **Shopify is right**.

## Verifying instrumentation

In the browser console on any page:

```js
window.spDebug = true;   // logs every event as it fires
```

Then walk the funnel. Each event should log exactly once. Duplicate logs mean a listener was bound twice — `events.js` guards this with `window.__spEventsInit`.
