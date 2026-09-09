# Sublime Pantry Commerce Architecture

## One brand, two systems

Sublime Pantry is one customer-facing business at `sublimepantry.com`.

### sublimepantry.com — discovery, education, and conversion
The Astro/Netlify application in this repository owns:
- homepage and brand presentation
- guides, comparisons, troubleshooting, and SEO/AEO content
- free tools such as the Batch Log
- editorial standards and disclosures
- merchandising/landing pages that introduce Shopify products
- newsletter acquisition surfaces
- analytics instrumentation before checkout

### Shopify — commerce system of record
The connected Sublime Pantry Shopify store owns:
- products and variants
- SKUs and inventory
- prices
- collections
- discounts
- cart and checkout
- orders and customers
- fulfillment state
- post-purchase commerce data

Do not maintain a second hand-authored product catalog in Astro. Product price, availability, variants, and inventory should originate in Shopify.

## Domain model

- `www.sublimepantry.com` — canonical public site and discovery layer
- `shop.sublimepantry.com` — Shopify commerce domain / checkout infrastructure

The customer should normally discover and shop from the main Sublime Pantry experience. Shopify should feel like the transaction engine, not a separate competing website.

## Initial commercial focus

Freeze-drying is the commercial wedge. The first funnel is:

1. Search / AI answer / social / referral
2. Evidence-based Sublime Pantry guide, comparison, or tool
3. Email capture or relevant product CTA
4. Freeze-Dryer Packaging Starter Kit
5. Shopify cart + checkout
6. Education and replenishment messaging
7. Repeat purchase of bags / oxygen absorbers / packaging supplies
8. Relevant high-ticket affiliate recommendations when relationships are actually active and disclosed

## Catalog rules

Launch catalog should stay intentionally narrow.

### Hero
- Freeze-Dryer Packaging Starter Kit

### Replenishment
- Quart Mylar Bags + Oxygen Absorbers
- Gallon Mylar Bags + Oxygen Absorbers (only after source quantity/spec mismatch is resolved)
- 300cc Oxygen Absorbers

### Expansion
- Candy packaging
- Desiccants / labels only after specifications and sample QC are complete

Unrelated legacy dropshipping products should remain archived and should not appear in Sublime Pantry merchandising or navigation.

## Shopify collection hierarchy

Customer-facing collection hierarchy should be simple:

- Shop All
- Starter Kits
- Bags & Oxygen Absorbers
- Oxygen Absorbers
- Candy Packaging (secondary)

Avoid overlapping collections unless they serve a distinct navigation, landing-page, or merchandising purpose.

## Site information architecture

Primary navigation target:

- Shop
- Guides
- Troubleshooting
- Comparisons
- Tools
- Start Selling
- About

Commerce pages should live in the existing Sublime Pantry design system. Editorial pages may embed contextual product cards, but commercial relationships and owned-product conflicts must follow the site's disclosure policy.

## Email architecture

The current Netlify newsletter form is an acquisition endpoint, not the long-term customer lifecycle system.

Target state:
- one master subscriber/customer identity centered on Shopify customer data
- source/interest segmentation (owner, pre-owner, cottage seller, packaging buyer)
- welcome education sequence
- abandoned checkout/cart where supported
- post-purchase onboarding
- replenishment reminders for consumables
- newsletter (`The Dry Batch`)

Do not run disconnected mailing lists indefinitely. Before migrating the current form, choose the lifecycle platform (Shopify-native messaging/automation or a dedicated ESP) and document consent/data migration.

## Source-of-truth rules

| Data | Source of truth |
| --- | --- |
| Editorial content | GitHub/Astro |
| Product title/price/SKU/status | Shopify |
| Inventory | Shopify |
| Collections | Shopify |
| Cart/checkout | Shopify |
| Orders/customers | Shopify |
| Editorial disclosures | GitHub/Astro |
| Site navigation | GitHub/Astro |
| Analytics events | Site + Shopify analytics, with documented event names |
| Newsletter/lifecycle consent | Selected email platform + Shopify customer record |

## Change discipline

1. Never hard-code product price or inventory into editorial content when it can be rendered from Shopify.
2. Never publish a Shopify draft product merely to make a page look complete.
3. Keep incomplete/spec-pending products as drafts.
4. Keep unrelated legacy products archived.
5. Product changes happen in Shopify; editorial claims and merchandising context happen in GitHub.
6. Changes to checkout/order/customer behavior should not be implemented as custom Astro logic when Shopify already owns that responsibility.

## Near-term implementation order

1. Clean Shopify navigation/collections and retain the narrow freeze-drying catalog.
2. Add a first-class `Shop` route and navigation item to Astro.
3. Connect the Astro shop experience to Shopify using Shopify's supported custom-storefront tooling.
4. Add contextual starter-kit CTAs to high-intent storage/batch content.
5. Replace the disconnected Netlify-only email path with the chosen lifecycle/segmentation architecture.
6. Instrument the funnel: content view → product view → add to cart → checkout → purchase → repeat purchase.
7. Only then expand paid acquisition and catalog breadth.

## Implementation notes

### Where the boundary is enforced in code

| Concern | Lives in | File |
|---|---|---|
| Product handles, SKUs, merchandising copy, images | Repo | `src/lib/commerce.ts` |
| Price, availability, cart, checkout | Shopify, at runtime | Storefront Web Components |
| Reviews | Judge.me, at build time | `src/lib/reviews.ts` |
| Customer identity and consent | Shopify | `netlify/functions/lead-capture.mjs` |
| Funnel behaviour before checkout | Plausible | `public/events.js` |

`src/lib/commerce.ts` holds identifiers and editorial copy only. It must never hold a price, an inventory count, or an availability flag — those would be a second copy of Shopify's state, and would be wrong the moment Shopify changed.

The one exception is `displayPrice`, which is shown *only* inside the Storefront components' loading placeholder and is replaced by live data within a second. It is a rendering hint, not a source of truth. Update it when the price changes, or drop it.

### Structured data and staleness

`Product` JSON-LD on the generic product page (`src/pages/shop/[handle].astro`) **emits `offers`** with `price`, `priceCurrency`, `availability` and `url`. The starter kit's hand-built page still omits it.

`availability` is the build-time answer from `src/lib/stock.ts` — the same value the visible buy box renders — so a page and its structured data cannot disagree with each other. Both can still lag Shopify between deploys, which is what the build hook below is for.

**The build hook.** A Netlify build hook on `main` exists and is verified: posting to it produced a production deploy (`deploy_source: api`, 2026-09-09). Its URL is a credential — it triggers production builds for anyone holding it — so it is not recorded in this repo.

**Outstanding:** the Shopify webhooks that call it. `products/update` and `inventory_levels/update` must both point at the build hook, or a price or stock change in Shopify will sit unpublished until the next commit. Create them in **Shopify admin → Settings → Notifications → Webhooks**, format JSON, or via `webhookSubscriptionCreate` with a `read_products` + `read_inventory` token.

Until those two webhooks exist, treat `offers` as accurate only as of the last deploy.

`aggregateRating` follows the same rule and is emitted only when real Judge.me reviews exist.

### Does Shopify still call it what we call it?

`scripts/check-shopify-title.mjs` reads the live Admin API and compares every catalog title to Shopify's. It runs daily from `.github/workflows/shopify-title-monitor.yml` and opens an issue on drift.

It is a monitor, not a test, and deliberately not a PR check: a pull request should not fail because somebody renamed a product in Shopify. Two other checks cover the halves it does not — `tests/claim-shapes.test.mjs` asserts every surface agrees with the catalog, and `tests/homepage-and-shop.test.mjs` pins Shopify's title in a hard-coded constant. Both compare strings that live in this repo, so neither can see Shopify being renamed underneath them. That happened twice in two days with the whole suite green.

### Adding a product to the site

1. The Shopify product must be **ACTIVE and published to the Online Store**. Draft products are invisible to the Storefront API, so a card for one hangs on its loading placeholder forever.
2. Add an entry to `CATALOG` in `src/lib/commerce.ts` with a server-rendered title, image, and copy.
3. Add its Shopify numeric product ID to `SHOPIFY_PRODUCT_IDS` in `src/lib/reviews.ts`.
4. Keep the catalog small. The starter kit is the offer; a long list dilutes it.

### Related documents

- `docs/SHOPIFY-ADMIN-SETUP.md` — the manual runbook (start here)
- `docs/SOFT-LAUNCH-CHECKLIST.md` — the launch gate
- `docs/CUSTOMER-LIFECYCLE.md` — identity, consent, tags, fallback behaviour
- `docs/ANALYTICS-EVENTS.md` — event taxonomy
- `docs/SHOPIFY-FLOW-WORKFLOWS.md` · `docs/EMAIL-AUTOMATIONS.md` · `docs/SHOPIFY-FORMS.md` · `docs/REVIEWS-INTEGRATION.md`
- `docs/COMMERCIAL-INTERNAL-LINKING.md` — stage-based linking rules
- `docs/MANUAL-FULFILLMENT.md` — PackFreshUSA SOP
