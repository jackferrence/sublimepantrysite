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
3. Delay: **7–14 days**. We pack and ship in-house, so transit is a normal domestic parcel rather than a supplier's turnaround plus transit — but the delay still wants to cover first use, not just delivery. Asking before they have sealed a bag produces no review or a bad one.
4. Enable the "verified buyer" badge so reviews carry provenance.

Shopify Flow 4 (`docs/SHOPIFY-FLOW-WORKFLOWS.md`) applies a `review-eligible` customer tag for segmentation. It should **not** also send a request — that would double-email the customer.

## Product mapping

Judge.me keys on the Shopify numeric product ID as its `external_id`. All eight
live products, read from the Admin API on 2026-09-09:

| Handle | SKU | Shopify product ID |
|---|---|---|
| `snack-bags-6x6-50-pack-absorbers` | `SP-SNK-50` | `9605612241173` |
| `snack-bags-6x6-100-pack-absorbers` | `SP-SNK-100` | `9605612273941` |
| `100cc-oxygen-absorber-refill-100-count` | `SP-OA100-100` | `9605612306709` |
| `mini-heat-sealer-for-mylar-bags` | `SP-TOOL-HM150` | `9605612339477` |
| `starter-set-50-bags-50-absorbers-sealer` | `SP-BUNDLE-STARTER` | `9605612405013` |
| `season-set-100-bags-100-absorbers-sealer` | `SP-BUNDLE-SEASON` | `9605612437781` |
| `quart-bags-8x12-50-pack-300cc-absorbers` | `SP-QT-50` | `9605612470549` |
| `300cc-oxygen-absorber-refill-100-count` | `SP-OA300-100` | `9605612503317` |

These are hardcoded in `SHOPIFY_PRODUCT_IDS` in `src/lib/reviews.ts`. **Add an
entry there whenever a product is added to `CATALOG`**, or that product silently
renders without reviews. `tests/reviews-wiring.test.mjs` fails the build if the
two lists drift apart, because "silently renders without reviews" is precisely
the failure nobody notices.

The single entry that used to be here was the boxed starter kit, archived
2026-09-09 and removed from the catalog.

## Verification before trusting the display

Once configured, confirm on the built page:

- The review count shown equals the published count in Judge.me Admin.
- `aggregateRating.reviewCount` in the page's JSON-LD matches the visible count.
- Removing a review in Judge.me removes it from the site after a rebuild.
