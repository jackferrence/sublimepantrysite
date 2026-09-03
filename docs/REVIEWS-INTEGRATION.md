# Reviews integration (Judge.me)

Judge.me Reviews is **already installed** on the store.

## The constraint

SublimePantry.com is **not a Shopify theme**. Judge.me's standard integration installs Liquid snippets into a theme (`jdgm-widget` divs plus its widget JS) and those cannot be used here. The product page lives in Astro and is statically built.

Judge.me's supported path for a custom storefront is its **REST API**:
<https://judge.me/help/en/articles/8409180-using-judge-me-api>

## What is implemented in this repo

`src/lib/reviews.ts` + `src/components/ProductReviews.astro`.

- Reviews are fetched **at build time**, in Node, during `astro build`. The private token is never shipped to a browser.
- Two calls: resolve the Shopify product ID to Judge.me's internal product ID via `GET /api/v1/products/-1?...&external_id=<shopify id>`, then `GET /api/v1/reviews?...&product_id=<judgeme id>&published=true`.
- Only `published=true` reviews are requested, and each is re-checked for a 1–5 rating before rendering.
- Aggregate rating is **computed from the fetched reviews**, not asserted.
- `Product.aggregateRating` JSON-LD is emitted **only when at least one real review exists**. With zero reviews there is no rating markup at all, which is the only compliant state.
- With no env vars set — the current state — the module returns empty and the component renders **nothing**. Not an empty state, not "be the first to review": nothing.

### Hard rules encoded here

- **No seeded reviews.** No sample, demo, imported-from-supplier, or placeholder review content exists anywhere in this repo.
- **No AI-generated reviews.** Ever. This is fraud, and it is also the fastest way to lose the site's editorial credibility, which is the actual asset.
- **No `aggregateRating` without reviews.** Rating markup unbacked by real reviews violates Google's structured data policy and risks a manual action on a site whose whole business is search visibility.

## Setup

1. Judge.me Admin → **Settings → Integrations → View API tokens**.
2. Copy the **Private API token** and the shop domain.
3. Set in Netlify → Site configuration → Environment variables:
   - `JUDGEME_PRIVATE_TOKEN`
   - `JUDGEME_SHOP_DOMAIN`
4. Redeploy. Reviews appear at the next build.

### Staleness

Because reviews are baked in at build time, a new review does not appear until the site rebuilds. Options:

- Acceptable at soft-launch volume: reviews appear on the next content deploy.
- Better, once volume justifies it: a Netlify **build hook** called from a Judge.me webhook on new review. Same mechanism as the product build hook in `docs/SHOPIFY-ADMIN-SETUP.md`.

## Review request automation

Prefer **Judge.me's own** post-fulfillment request over building one in Flow:

1. Judge.me Admin → **Settings → Review requests**.
2. Trigger: after fulfillment.
3. Delay: **7–14 days**. Orders are manually dropshipped from PackFreshUSA, so transit is slower and less predictable than a normal Shopify fulfillment. Asking too early produces no review or a bad one.
4. Enable the "verified buyer" badge so reviews carry provenance.

Shopify Flow 4 (`docs/SHOPIFY-FLOW-WORKFLOWS.md`) applies a `review-eligible` customer tag for segmentation. It should **not** also send a request — that would double-email the customer.

## Product mapping

| Field | Value |
|---|---|
| Shopify product ID (`external_id`) | `9601875640597` |
| Handle | `freeze-dryer-packaging-starter-kit-100` |
| SKU | `MSMBS7MIL001` |

The Shopify product ID is hardcoded in `SHOPIFY_PRODUCT_IDS` in `src/lib/reviews.ts`. **Add an entry there whenever a product is added to `CATALOG`**, or that product silently renders without reviews.

## Verification before trusting the display

Once configured, confirm on the built page:

- The review count shown equals the published count in Judge.me Admin.
- `aggregateRating.reviewCount` in the page's JSON-LD matches the visible count.
- Removing a review in Judge.me removes it from the site after a rebuild.
