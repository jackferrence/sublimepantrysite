# Critique + Audit: shop → PDP photo morph, gallery loupe, and a Shopify SPA-nav regression

Target: `src/pages/shop.astro`, `src/pages/shop/[handle].astro`, `src/components/ProductGallery.astro`, `src/components/ShopifyStore.astro`, `src/components/Breadcrumbs.astro`, `src/pages/index.astro` — the in-flight uncommitted work found on `impeccable/ai-slop-shop-polish` at session start, run under `/impeccable polish` → `critique` → `audit`.

## What was in flight

Uncommitted, unfinished work adding three things: a cross-page hero-photo morph (Astro View Transitions `transition:name`) from a shop card into the PDP gallery, an in-page lightbox open/close FLIP morph plus a loupe zoom/pan on the enlarged image, and a `@starting-style` set-in reveal for the homepage masthead text.

## P0 — found during polish, not in the prior critique

**A client-side (View Transitions) navigation away from any page holding a live `<shopify-context>` — `/shop` (8 instances) and every PDP (2: buybox + sticky bar) — corrupts the Shopify Storefront web components' shared query state for whatever commerce page loads next.** The destination's buy box throws `shopify-context: V(...).buildQueryContextTree is not a function` and falls back to "Live pricing and checkout are temporarily unavailable on this page," with only a link out to the external Shopify store. Confirmed sticky for the rest of the tab's session (not just the immediate hop): visiting `/shop` once, then navigating elsewhere, then into a PDP via a page that itself has zero Shopify elements (the homepage shelf) still trips it.

Repro: load `/shop` → click any product's "Details" link (client-side nav) → buy box on the PDP shows the fallback instead of price/Add to cart. A hard reload of the same PDP URL works correctly every time; only the soft navigation breaks it.

This sits squarely inside the soft-launch gate's "cart reliability" row in `docs/SOFT-LAUNCH-CHECKLIST.md` — it was previously unverified, and turns out to fail for the site's primary browse path (catalog → product).

Root cause traced two layers deep:
1. `ShopifyStore.astro`'s `eager` branch injected the Storefront runtime with a bare `<script type="module" src=...>` and no reentry guard, so every soft navigation to another `eager` (commerce) page re-executed the module and re-ran `customElements.define`. Fixed: it now guards with the same `window.__spShopifyRuntime` flag the lazy branch already used.
2. Even with the module loading exactly once, the bug persisted: leaving a page with live `<shopify-context>` elements still corrupts shared state before the next page's contexts finish connecting. Marking `<shopify-store>` `transition:persist` (so the same DOM node and its initialized instance carry across navigations, instead of being torn down and rebuilt) did **not** resolve it — confirmed via direct testing (verified the exact same node persists, still upgraded, still has the method, and the destination page still fails). The corruption happens somewhere inside the vendored `<shopify-context>` element's own disconnect path, not in `<shopify-store>`.

**Mitigation shipped, root cause open**: rather than chase further into Shopify's minified runtime, every navigation into or out of a commerce page now sets `data-astro-reload` (Astro's escape hatch for a specific link to force a full page load instead of a soft transition): shop card image/title/Details links, the homepage's three-item shop shelf, PDP cross-sell links to other products, and any breadcrumb crumb pointing at `/shop`. This is the same reasoning as [Never silently fix a published source error] applied to code: the safe, verified fix landed; the fancier one (keep it all client-side) explicitly did not.

**Consequence for the in-flight feature**: the cross-page photo morph (`transition:name`) can never fire safely anywhere on the site under this constraint — every real entry point into a PDP is now a hard navigation by design. Removed rather than left as dead code (the `handle` prop threaded through `ProductGallery`, and the three `transition:name` attributes in `index.astro`/`shop.astro`/`ProductGallery.astro`).

## What was kept and verified working

- **In-page lightbox**: FLIP open/close morph and the fine/coarse-pointer loupe zoom are entirely within-page (no navigation involved) and are unaffected by the bug above. Verified: opens without console errors, closes on Escape and the close button, no error after either.
- **Homepage hero set-in reveal**: `@starting-style`-driven, respects `prefers-reduced-motion`, renders correctly.
- **`astro check`**: clean for every file this session touched (0 errors). The pre-existing 90 errors under `embedded tools/` are an untracked stray zip extraction at the repo root, unrelated to this branch — confirmed by grep, not fixed (out of scope, not part of `src/`).
- **`npm test`**: 371/371 passing after all changes.
- Mobile PDP (390px) checked visually: sticky buy bar and gallery render correctly, no overflow.

## Also fixed in passing

`/shop`'s own product cards (the actual shopping page, 8 SKUs) never carried the `transition:name` the homepage's 3-item teaser shelf had — the flagship photo-morph touch, before this bug was found, only ever would have fired from the minor entry point, not the primary one. Moot now that the whole approach is reverted, but worth knowing for a future retry once Shopify's SDK issue is resolved upstream.

## Score (audit dimensions, shop surface)

| # | Dimension | Score | Key Finding |
|---|-----------|-------|-------------|
| 1 | Accessibility | 4 | Dialog focus trap, Escape/close both restore focus correctly; loupe is pointer-capability-gated (touch gets tap-to-zoom, not a hover-only trap) |
| 2 | Performance | 3 | WAAPI morph is well-bounded (single element, transform/opacity only); `data-astro-reload` trades some perceived speed for correctness on the shop→PDP hop, deliberately |
| 3 | Responsive Design | 4 | Verified 1440 and 390; sticky buy bar and gallery both hold up |
| 4 | Theming | 4 | No hard-coded colors introduced; motion respects `prefers-reduced-motion` throughout |
| 5 | Anti-Patterns | 4 | No AI-slop tells in the new code; one confirmed pre-existing false-positive (lightbox placeholder `<img>`, already ignored in detector config) |
| **Total** | | **19/20** | Excellent, held back only by the reload trade-off forced by the Shopify SDK bug |

The Anti-Patterns and craft scores are high; the reason this isn't a clean pass is the P0 above, which is a correctness/reliability finding, not a design one — and it was the most important thing found this session.
