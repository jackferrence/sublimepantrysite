# sublimepantry.com — design-system rebuild

You are rebuilding the front end of sublimepantry.com: an Astro static site on Netlify with a Shopify Storefront-API store (8 products, $15–48: mylar bags, oxygen absorbers, a hand sealer, two bundles). The site is a **publication first and a shop second** — think a niche Wirecutter for home freeze-drying, run by one person who tests and fulfils everything himself. Readers are capable adults who own a $2,000+ freeze dryer.

Work through the phases below **in order, without stopping for approval**. Each task has an acceptance check; run it before moving on. When something is ambiguous, make the call that best fits `BRAND.md` and `docs/design-research.md`, write one line about it in `docs/DECISIONS.md`, and keep going. Only stop for the items marked **STOP** — those are decisions that cannot be undone or need a human.

## Ground rules (apply to every task)

1. **Read first:** `BRAND.md`, `docs/design-research.md`, `tokens/global.tokens.json`, `tokens/semantic.light.tokens.json`, `tokens/CONTRAST.md`. Then read the existing repo — `astro.config.mjs`, `package.json`, `src/`, `netlify.toml` — and write a short inventory to `docs/DECISIONS.md` (what exists, what you will keep, what you will replace).
2. **Git:** create branch `redesign/design-system` from the default branch and commit after every task with a message that names the task number (`T3.2 fluid type scale`). **Never push to `main`. Never merge. Never open a PR** — leave that to Jack.
3. **Never fabricate:** no invented test results, quotes, testimonials, review counts, star ratings, prices, "as seen on" logos, or shelf-life numbers. Where an article needs content you do not have, write `<!-- TODO(jack): … -->` and a visible placeholder in `text.muted` reading "Content pending". Do not add affiliate links. Do not send email or touch subscriber lists.
4. **Colour comes from the semantic tier only.** `--sp-color-surface-*`, `--sp-color-text-*`, `--sp-color-border-*`, `--sp-color-action-*`, `--sp-color-status-*`. Never a raw hex, never `--sp-color-ice-100` directly in a component, never a colour pairing that is not in `tokens/CONTRAST.md`. If you need a new pairing, add it to the tokens, regenerate, re-run the audit, and only then use it.
5. **Type comes from the four families, each with one job** (BRAND.md § Typeface). Bodoni Moda never under 20px; never below weight 500 under 28px. No Inter, Geist, Roboto, system-ui as a *choice*.
6. **Spacing and radius come from tokens.** `--sp-space-*`, `--sp-radius-*` (0 is the default; 4px is the maximum). Raw `px` is allowed only for `1px`/`2px` borders and outlines.
7. **Motion:** everything animated lives inside `@media (prefers-reduced-motion: no-preference)`. Durations from `--sp-motion-duration-*`, ceiling 300ms. No scroll-reveal, no hover-scale, no parallax, no scroll-jacking, no auto-advancing carousels.
8. **Accessibility is WCAG 2.2 AA everywhere, AAA (7:1) for body and muted text.** Every interactive element: `:focus-visible` outline 2px `--sp-color-border-focus` (or `-focus-on-inverse` on inverse surfaces), 2px offset; target ≥24×24px, buttons 44px tall; the sticky header must never cover a focused element (`scroll-padding-top` on `html`). Skip link is the first focusable thing on every page.
9. **No JavaScript unless a task says so.** Articles, guides, product pages and the home page ship zero client JS. The cart drawer and the two calculators are the only islands.
10. **The not-AI list is a hard rule, not taste** (§ Appendix A). If a page you built could be described as "hero, three cards, testimonials, CTA band", rebuild it.
11. Use the user's terminology in copy and code comments: *guide*, *the bag*, *absorber*, *puffy-bag test*, *cc rating*, *mil*. Never "supercharge", "unleash", "effortlessly", "reimagined", "elevate".

---

## Phase 1 — Foundations

### T1.1 Install fonts and dependencies
- `npm i @fontsource-variable/bodoni-moda @fontsource-variable/literata @fontsource-variable/source-sans-3 @fontsource-variable/archivo`
- `npm i -D style-dictionary@5 stylelint stylelint-config-standard @axe-core/playwright @playwright/test pa11y-ci @lhci/cli`
- Pin exact versions in `package.json` (no `^`). Record versions in `docs/DECISIONS.md`.
- Check: `npm ls` clean; `node_modules/@fontsource-variable/bodoni-moda/files/` contains a `*-wght-opsz-normal.woff2` (or similar variable file).

### T1.2 Token build
- Write `tokens/style-dictionary.config.mjs` that reads `tokens/global.tokens.json` + `tokens/semantic.light.tokens.json` into `:root` and `tokens/semantic.dark.tokens.json` into `@media (prefers-color-scheme: dark) { :root { … } }`, with the `--sp-` prefix and kebab-case names, and appends the two `.sp-ghost` rules exactly as they appear in the shipped `src/styles/tokens.css`.
- Output must be semantically identical to the shipped `src/styles/tokens.css` (same custom property names and values; ordering may differ). Diff them, resolve differences by fixing the config, not the tokens.
- Add scripts: `"tokens": "style-dictionary build -c tokens/style-dictionary.config.mjs"`, `"tokens:check": "npm run tokens && git diff --exit-code src/styles/tokens.css"`.
- Port `scripts/build_tokens.py`'s contrast audit (the Python that generated the shipped tokens and `CONTRAST.md`) to `scripts/contrast-audit.mjs` (same pairings and thresholds as `tokens/CONTRAST.md`, WCAG 2.x relative-luminance formula) and add `"contrast": "node scripts/contrast-audit.mjs"`; it must exit non-zero on any failure and rewrite `tokens/CONTRAST.md`.
- Check: `npm run tokens:check` and `npm run contrast` both pass.

NOTE (repo-state override): there is no pre-existing `src/styles/tokens.css` or `scripts/build_tokens.py`/`tokens/CONTRAST.md` in THIS repo — the actual shipped pipeline is `src/styles/tokens.tokens.json` → `scripts/generate-tokens.mjs` → `public/styles/tokens.css`. Adapt T1.2 to EXTEND that real pipeline into the three-tier global/semantic/component structure described in design-research.md §5, rather than assuming Style Dictionary artifacts that were never actually shipped here. Use your judgment; document the reconciliation as the first entry in docs/DECISIONS.md.

### T1.3 Global styles
Create `src/styles/` with, imported in this order from `BaseLayout`: `tokens.css`, `fonts.css`, `base.css`, `typography.css`, `utilities.css`, `print.css`.
- `fonts.css`: import the four Fontsource variable **latin** CSS files only. Add `@font-face` metric-matched fallbacks (`size-adjust`, `ascent-override`, `descent-override`, `line-gap-override`) for each family against Georgia (Bodoni Moda, Literata) and Arial (Source Sans 3, Archivo); use Fontaine or compute from the font metrics with `fontkit`/`@capsizecss/unpack`. `font-display: swap`.
- `base.css`: modern reset; `html { color-scheme: light dark; scroll-padding-top: var(--header-height); }`; `body { background: var(--sp-color-surface-page); color: var(--sp-color-text-body); font-family: var(--sp-font-family-body); font-size: var(--sp-font-size-step-0); line-height: var(--sp-font-line-height-body); }`; `font-optical-sizing: auto` on `html`; `:focus-visible` rule as in ground rule 8; `img, svg { max-width: 100%; height: auto; }`; `table { font-variant-numeric: tabular-nums; }`.
- `typography.css`: h1–h5 in Bodoni Moda with the sizes `step-6…step-2` (h5 = step-2 is the smallest Bodoni ever rendered, weight 600), weights from `--sp-font-weight-display-*`, `line-height` display/displayWrap, tracking `displayLarge` on h1–h2 and `displaySmall` on h5; **h6 is Source Sans 3 600 at step-1** — Bodoni never goes below step-2; `.lead` = step-1 Literata; `.label` = Archivo, `step--2`, uppercase, `letter-spacing: var(--sp-font-tracking-label)`, weight 600; `.ui` = Source Sans 3. Article measure `max-width: var(--sp-font-measure-article)`; product measure `--sp-font-measure-product`. `.sp-ghost` is applied only by `ArticleLayout`'s H1 and by `<PullQuote>`.
- `print.css`: `@media print` hides header, nav, footer, cart, newsletter; expands `<details>`; black on white; `a[href^="http"]::after { content: " (" attr(href) ")" }`; `h1,h2,h3 { break-after: avoid }`.
- Check: a scratch page renders all six heading levels, lead, body, label, UI text, a table, and a focused button; screenshot it at 375px and 1440px with Playwright into `docs/screens/` and look at it.

NOTE (repo-state override): `public/styles/base.css` already exists and is the real, currently-shipped stylesheet with working `@font-face` for Bodoni Moda Variable that `tests/header-brand.test.mjs` asserts against — do not relocate it to `src/styles/base.css` unless you also migrate the build so `public/styles/base.css` is still what ships at that URL, and update the test file's expectations to match if you change its location or generation method. Prefer additive evolution of the real file over a parallel `src/styles/` tree that never reaches the browser.

### T1.4 Stylelint
- `.stylelintrc.json` extending `stylelint-config-standard` with: `declaration-property-value-disallowed-list` blocking `/#[0-9a-f]{3,8}/i`, `/rgba?\(/`, `/hsla?\(/`, `/oklch\(/` on `color`, `background`, `background-color`, `border`, `border-color`, `outline`, `outline-color`, `fill`, `stroke`, `box-shadow`, `text-shadow` (exempt the generated tokens CSS file); `unit-disallowed-list: ["px"]` with `ignoreProperties` for `border`, `border-width`, `outline`, `outline-width`, `outline-offset`, `stroke-width`; `font-family-name-quotes` and a `declaration-property-value-disallowed-list` on `font-family` that blocks `Inter`, `Roboto`, `Geist`, `system-ui`.
- Script `"lint:css": "stylelint \"src/**/*.{css,astro}\" \"public/styles/**/*.css\""`. Check: passes on the current tree (fix real violations found in existing files; do not just exempt them).

### T1.5 Layout shell
- `src/layouts/BaseLayout.astro`: `<html lang="en">`, meta viewport, `<title>`/description/OG props, favicon links (`/favicon.svg`, `/favicon.ico`, `/apple-touch-icon.png`, `site.webmanifest` pointing at `icon-192.png`/`icon-512.png`), **one** `<link rel="preload" as="font" type="font/woff2" crossorigin>` for the Bodoni Moda variable file, style imports from T1.3, `<ClientRouter />` from `astro:transitions`, skip link → `#main`, `<Header />`, `<main id="main">`, `<Footer />`, cart island slot.
- `ArticleLayout.astro` and `ProductLayout.astro` extend it (frontmatter-driven `<head>`, content column widths from the measure tokens).
- Check: `npm run build` succeeds; the built HTML for a page has exactly one `<h1>`, landmarks `header/nav/main/footer`, and the skip link first in DOM order.

NOTE: this repo likely already has layout files under `src/layouts/` — read them first and evolve rather than replace blindly if they already satisfy most of this.

### T1.6 Header and footer
- Header: the wordmark as an `<img>` (or `<picture>` + `prefers-color-scheme` media) using the paths in the token/logo config → `logo.primary` (light) / `logo.primaryDark` (dark), never narrower than 120px; at widths where 120px does not fit, use the monogram. Nav in Source Sans 3: Guides, Recipes, How We Test, Shop, About; cart button with a count that reserves its width (no layout shift). Sticky is allowed only if the header is ≤64px tall and `scroll-padding-top` matches. Hairline bottom rule, no shadow.
- Footer on `surface.inverse` with `text.inverse` / `text.inverseMuted` and `border.focusOnInverse`: a dense, useful directory — Guides by topic, Shop by product, About / How We Test / Contact / Shipping & returns / Privacy; the tagline wordmark; the inline newsletter module (T3.9). Not a CTA band.
- Check: keyboard-tab through header and footer; every stop has a visible focus ring at ≥3:1; axe reports no violations.

NOTE: `src/components/BrandBlock.astro` already exists and `tests/header-brand.test.mjs` pins its behavior — read both before touching the header. A NEW logo kit was just dropped at repo root as `sublimepantry-logo-kit/` (untracked) — inventory it (likely has updated wordmark/monogram/tagline SVGs) and determine whether it should replace what's in `public/brand/approved/`; if so, migrate the assets into `public/brand/approved/`, update `src/lib/media.ts` and `BrandBlock.astro` to point at the new files, update `tests/header-brand.test.mjs` expectations to match, and note the swap in `docs/DECISIONS.md`. Do not silently drop brand-asset provenance — if the kit has no licensing/source notes, add a `TODO(jack)` about it.

---

## Phase 2 — Content model

### T2.1 Content collections
- `content.config.ts` at the root (Astro 5 Content Layer, `glob` loaders). Shared Zod base: `title`, `description`, `pubDate`, `updatedDate`, `author` (reference to `authors`), `heroImage` (an `images.json` id, see T2.3), `tags`, `draft`.
- Collections: `guides` (adds `verdicts[]` {label: 'Our pick'|'Also good'|'Budget pick', productHandle, why}, `testedProducts[]`, `notTested[]` {name, reason}, `limitations` markdown, `whoFor[]`, `whoNotFor[]`, `lastTested`), `articles`, `recipes` (adds `yield`, `dryTime`, `rehydration`, `bagSize`), `authors` (name, role, bio, photo optional — no invented credentials), `pages`.
- Migrate existing content into the new collections without rewriting it. Anything the schema now requires that the content lacks gets a `TODO(jack)` in frontmatter and a `.optional()` for now, listed in `docs/DECISIONS.md`.
- Check: `astro check` and `astro build` pass; every migrated URL still resolves (write the old→new list to `docs/redirects.md` and add `[[redirects]]` to `netlify.toml` for any that changed).

NOTE: this repo's content is currently in `src/content/articles/*.json` (per prior session notes) — read `content.config.ts`/`src/content.config.ts` if it exists, and the actual current collection shape, before redefining schemas. Preserve every existing published URL; do not break routes without a redirect.

### T2.2 Shopify data layer
- `src/lib/shopify/client.ts`: plain `fetch` against `https://{store}.myshopify.com/api/2025-10/graphql.json` with the Storefront token from env; version string is a single constant `STOREFRONT_API_VERSION` with a comment: *bump quarterly; Shopify retires versions after ~12 months*.
- Queries: `products.ts` (all 8 with handle, title, descriptionHtml, images, variants, price, `availableForSale`, metafields for `mil`, `capacityCc`, `dimensions`, `foodSafeCert`, `bagSizeFits`), `product.ts`, `cart.ts` (`cartCreate`, `cartLinesAdd`, `cartLinesUpdate`, `cartLinesRemove`, `cart` query returning `checkoutUrl`). Typed with generated or hand-written TS types.
- Build-time fetch for product pages; export `getProducts()` for the home page and the "shop the tools" strip.
- Check: `npm run build` with real env renders 8 product pages; without env it renders with a clear build error naming the missing variable (not a crash).

NOTE: `src/lib/commerce.ts` already exists in this repo — read it first; it may already implement most of this against the Storefront API. Evolve it into `src/lib/shopify/` structure only if that's a real improvement, not a rename for its own sake. No live Storefront API credentials are available in this environment — if env vars are missing, implement the "clear build error naming the missing variable" behavior and move on; do not block the rest of the build on live Shopify data.

### T2.3 Image manifest and pipeline
- `src/data/images.json` following the schema in design-research.md §2 (`id, filename, source, sourceId, sourceUrl, licenseType, purchaseDate, cost, modelRelease, propertyRelease, restrictions[], usedOn[], aspectRatioSlot, treatment, requiresAttribution, expires, notes`). Seed it with any images already in the repo, `source: "unknown"` and a `TODO(jack)`.
- `src/components/ui/Img.astro` wrapping `<Picture formats={['avif','webp']}>`, requiring a `slot` prop ∈ `hero|card|inline|pack` that sets `aspect-ratio` from `--sp-aspect-*` and `object-fit: cover`, a solid `surface.inset` placeholder background, `loading="lazy"` unless `priority` is set (then `eager` + `fetchpriority="high"`), and `alt` required (empty string allowed only with `decorative`).
- `astro.config.mjs`: `image: { layout: 'constrained', responsiveStyles: true }`.
- `scripts/lint-images.mjs`: fails if any `images.json` entry is missing required fields, if an `editorial-only` asset is referenced from any file under `src/pages/store/` or a product component, or if a file in `public/images/` or `src/assets/images/` has no manifest entry. Script `"lint:images"`.
- Do NOT run any batch-grading script on images you were not given; skip grading if no `raw/` source images exist.
- Check: `npm run lint:images` passes; an `Img` with `slot="card"` renders at 4:5 at both 375px and 1440px.

NOTE: `src/components/ToolsMentioned.astro` and pages already call an existing `<Img>`-like component — read it first (it was recently edited to remove an unsupported `fit="contain"` prop). Extend it rather than creating a second, conflicting image component.

### T2.4 Packshots and diagrams (SVG components)
- `src/components/figures/`: build **flat vector packshots for the 8 SKUs** as inline SVG components (`Packshot.astro` with a `sku` prop): 2px ink stroke, ice-100 single fill, one rust accent at most, 1:1 viewBox, `<title>` for accessibility. A mylar bag is a rounded-rectangle with a tear notch and a seal band; absorbers are a sachet; the sealer is a bar with a hinge; bundles compose them. Stroke colour via `currentColor` so they follow `text.body` in dark mode; fill via the ice surface token.
- Diagrams as the same kind of component: `SublimationCurve.astro` (phase diagram, axes labelled), `ChamberCutaway.astro`, `SealSteps.astro` (4 steps), `PuffyBagTest.astro` (flat vs puffed, day 0 / day 2), `OxygenIndicator.astro` (pink = absorbed, blue = oxygen present — colours here are semantic exceptions: add `status.indicatorPink`/`indicatorBlue` tokens, document them). Every diagram gets a `<figcaption>`.
- Check: each renders at 320px wide without text overlap; contrast of any labelled text ≥4.5:1 on its ground.

---

## Phase 3 — Components

Build in `src/components/ui/` (token-only primitives) and `src/components/blocks/` (composed). No component may set a colour that is not a semantic token. Every component gets a story page under `src/pages/_kit/` (excluded from the sitemap, `noindex`) showing all its states in light and dark.

### T3.1 Primitives
`Button` (primary = action-primary ground / action-primary-text, hover action-primary-hover; secondary = 1px action-secondary-border on transparent; text-link variant; radius `--sp-radius-s`; height 44px), `Link` (underlined, text-link, underline offset 0.15em, thickness 1px, hover thicker not colour-only), `Rule` (1px border-hairline, with optional label centred), `Eyebrow` (`.label`), `Byline` (author link + "Updated {date}" in text-muted, `<time datetime>`), `Input`/`Select` (44px, 1px border-strong, focus ring, label above, error text in status-error with an inline icon and `aria-describedby`), `Details` (native `<details>`, hairline rules, chevron drawn in CSS), `Table` (wrapper with `overflow-x: auto`, sticky `<thead>` inside the wrapper, `<caption>`, zebra rows, `th[scope]`).

### T3.2 VerdictBox
1px hairline border, space-m padding, no shadow, no fill. Eyebrow label ("Our pick" / "Also good" / "Budget pick") in text-accent, product name as an H3 in Bodoni 700 ≥24px, one-sentence "why", price in Source Sans 3 tabular, a **text link** CTA ("Buy the 7-mil quart bags →"), and a packshot at 1:1 on the right at ≥640px, above at narrower widths. Identical structure every instance.

### T3.3 ComparisonTable
Real `<table>` built from `testedProducts[]`: columns mil, capacity/cc, price per unit, seal type, food-safe cert, our note. Sticky header, horizontal scroll on mobile (no card collapse), a "why it matters" row under the header in text-muted. Numbers tabular. Nothing but hairlines.

### T3.4 HonestyBlock ("What we tested — and didn't")
Hairline rule above and below, Eyebrow, two-column list at ≥720px: tested (name + one-line result) and not tested (name + reason from `notTested[]`). Prose, no icons.

### T3.5 LimitationsCallout
Required on every guide. Inset ground, 2px left border in status-warn, Eyebrow "What we haven't tested", body from `limitations`. Never yellow, never an exclamation icon.

### T3.6 WhoFor
Two short lists — "This is for you if" / "Skip this if" — from `whoFor[]`/`whoNotFor[]`, placed directly under the byline on guides.

### T3.7 SpecSheet
`<dl>` label/value pairs, values tabular, hairline between rows, values right-aligned at ≥480px. Used on product pages and inline in guides.

### T3.8 ShopTheTools
Horizontal strip of 2–4 `ProductCard`s inserted by an MDX component `<ShopTheTools handles={[…]} />` after the section that discusses them — never a sidebar, never the end-of-page dump. `ProductCard`: packshot 1:1, name in Bodoni 600 ≥20px, one-line use, price tabular, text-link CTA, radius 0, no shadow, no stars.

### T3.9 Newsletter (inline, never a popup)
Styled as page typography: Eyebrow, one sentence in Literata ("Get the next guide when it's tested."), one email input + secondary button. Posts to the existing provider endpoint if one is configured in env; otherwise renders with `action` empty and a `TODO(jack)`. No modal, no exit-intent, no timed slide-in — ever.

### T3.10 Author / methodology block
Under the byline: name, role, one line. At the article end: the same plus a 2–3 sentence "How this was tested" from the guide's frontmatter and a link to `/how-we-test`. No stock portrait; if `authors.photo` is absent, render the monogram at 48px.

### T3.11 PullQuote and Marginalia
`PullQuote`: Bodoni 500, step-3, `.sp-ghost`, hairline above/below, max 20 words — the only place besides the H1 the ghost appears. `Aside` (marginalia): at ≥1100px floats into the right margin in text-muted, step--1; below that it becomes an indented block with a hairline left rule.

### T3.12 Cart drawer (the one hydrated island)
`src/components/islands/CartDrawer.tsx` or equivalent — pick what is already in the repo; otherwise vanilla TS web component to keep JS ≤30KB gz. `client:idle`. Slides in from the right at 300ms (inside `prefers-reduced-motion: no-preference`; instant otherwise), radius 0, focus trapped, `Esc` closes, returns focus to the cart button. Lines with packshot, name, qty stepper (44px targets), remove; subtotal tabular; primary Button → `checkoutUrl`. Cart id in `localStorage` with try/catch. Re-queries price/availability on open.
- Check: axe clean; keyboard-only completes add → open → change qty → checkout link; JS bundle size printed in the build log and ≤30KB gz.

NOTE: check whether a cart implementation already exists in this repo before building a second one.

### T3.13 Calculators (the second and third islands)
- `BagSizeCalculator`: food type (dense / medium / light-fluffy), amount (cups or grams), → recommended bag size(s) and absorber cc, with the reasoning shown in prose ("light foods trap more air, so we size the absorber at 2–3× the dense rate"). Rules table lives in `src/data/sizing.json` with a `TODO(jack)` to verify every row; until verified the component shows "Guidance — verify against your own tests" in text-muted.
- `BatchCalculator`: tray count × trays per batch → bags and absorbers per batch, with a "Add this many to cart" text link that pre-fills the cart.
- Both: progressive enhancement — the form works with no JS by rendering the table; the island only computes live. No shelf-life-in-years output anywhere.

NOTE: `src/pages/tools/batch-planner.astro`, `absorber-calculator.astro`, and `trail-meal-cost.astro` already exist as pages (not islands) in this repo, per prior session's work — read them first. If they already substantially satisfy T3.13's intent as static/progressively-enhanced tools, evolve their visual system to match the new tokens/typography rather than replacing their logic. Do not regress the null-guard fix already made in `trail-meal-cost.astro`.

---

## Phase 4 — Pages and templates

Section rhythm rule for every page: no two consecutive sections may share the same layout pattern, and no page may follow hero → grid → testimonials → CTA. Use full-width diagram, then two-column prose, then a table, then a strip — vary it.

### T4.1 Home
Above the fold: an eyebrow ("Home freeze-drying, tested"), an H1 in Bodoni 900 with `.sp-ghost` that states the point of view (from home-page frontmatter/content — write a plain placeholder if none exists, `TODO(jack)`), one lead sentence, and the `SublimationCurve` diagram at 16:9 — **not a stock photo, not a carousel**. Then: the latest 3 guides as an asymmetric grid (one wide, two narrow; content-driven heights), a hairline-ruled "Start here" list of 5 links, one `PullQuote`, `ShopTheTools` with the 8 SKUs in two rows of four, the "How we test" summary with a link, the inline newsletter. Nothing sticky, nothing animated.

### T4.2 Guide template (`ArticleLayout`, collection `guides`)
Order: Eyebrow (topic) → H1 (`.sp-ghost`) → lead → Byline → WhoFor → table of contents (hairline list, anchors) → **VerdictBoxes** (all in `verdicts[]`) → prose with `ShopTheTools`, `Aside`, diagrams, `SpecSheet` as MDX components → **ComparisonTable** → **HonestyBlock** → **LimitationsCallout** → methodology block → related guides (3, hairline list) → newsletter. `lastTested` shown next to "Updated". Article column = measure-article, marginalia column to the right at ≥1100px.

### T4.3 Article and recipe templates
Article = guide minus verdicts/table/honesty. Recipe adds a `SpecSheet` (yield, dry time, rehydration, bag size) directly under the byline and a "Pack it" `ShopTheTools` strip after the method.

### T4.4 Product page (`ProductLayout`)
Reads as an entry in the publication: Eyebrow (category) → H1 product name (Bodoni 800) → one-sentence editorial description → price (tabular, step-1) + availability in status-ok/status-warn text with a dot icon (never colour alone) → variant select → primary Button "Add to cart" → `SpecSheet` from metafields (mil, capacity cc, dimensions, food-safe cert, what bag sizes it fits) → packshot at 1:1 → "Used in these guides" hairline list (guides whose `testedProducts` include this handle) → "What we haven't tested" if present in metafields → a `Details` FAQ using the audience's own vocabulary (puffy-bag test, cc per bag, moisture at packing). No reviews, no stars, no urgency, no countdown, no "X people are viewing". Bundles add a **"Who this kit is for / isn't for"** block from metafields.

### T4.5 Store index
`/store`: H1, one lead sentence, then the 8 products as a two-row `ProductCard` grid with a hairline between rows, grouped Bags / Absorbers / Sealer / Bundles with Eyebrows. Subscribe-and-save: if Shopify selling plans exist on absorbers/bags, show the option in the variant select; if not, note it in `docs/DECISIONS.md` and skip.

### T4.6 How We Test (`/how-we-test`)
A standing page: the rig (scale, hygrometer, sealed-bag timeline, storage conditions) as a `SpecSheet`, the protocol as an ordered list, `PuffyBagTest` and `OxygenIndicator` diagrams, "What we don't test yet", "How to read our verdicts". Content from a `pages/how-we-test` entry; where it does not exist, write the *structure* with `TODO(jack)` placeholders — do not invent a protocol.

### T4.7 About, Contact, Shipping & returns, Privacy
Plain `ArticleLayout` pages. Contact link sits in the same footer position on every page (WCAG 2.2 Consistent Help).

### T4.8 Guides index, tag pages, search
`/guides`: hairline-ruled list (title, one line, updated date) grouped by topic, not cards. Tag pages same. Search: Pagefind at build time (static, no server), results styled as the same list.

### T4.9 404 and offline
404 in Bodoni with the monogram; three useful links. Add `site.webmanifest` with the icons.

---

## Phase 5 — Quality gates

### T5.1 Accessibility CI
- `tests/a11y/axe.spec.ts` (Playwright + `@axe-core/playwright`) over: home, one guide, one article, one recipe, one product, store index, how-we-test, 404 — in light and in dark (`colorScheme` emulation) at 375px and 1280px. Fail on `serious`/`critical`.
- `.pa11yci.json` crawling the sitemap of the built site, WCAG2AA standard.
- Script `"test:a11y"`. Check: all green.

### T5.2 Lighthouse CI
`.lighthouserc.js` asserting performance ≥0.9, accessibility = 1, best-practices ≥0.95, SEO ≥0.95; LCP ≤2500ms, CLS ≤0.1, TBT ≤200ms on home, a guide, and a product page. Script `"test:lhci"`.

### T5.3 Budgets
A `scripts/budget.mjs` that reads `dist/` and fails if any page's CSS >50KB gz, JS >30KB gz, or total transfer >500KB excluding the largest image. Script `"test:budget"`.

### T5.4 Wire it together
`"check": "npm run tokens:check && npm run contrast && npm run lint:css && npm run lint:images && astro check && npm run build && npm run test:budget && npm run test:a11y"`. Add a GitHub Actions workflow if useful, and confirm the Netlify build command stays `npm run build` only (heavier checks run in CI, not on Netlify's clock).

### T5.5 Visual review
Playwright screenshots of every template at 375 / 768 / 1280 / 1600 in both schemes into `docs/screens/`. Open each and confirm against Appendix A. Write a one-paragraph verdict per template into `docs/DECISIONS.md` and fix anything you would not defend.

### T5.6 Dark-mode contrast pass
With `prefers-color-scheme: dark` emulated, run axe again and read every screenshot for grey-on-grey text. Any text under 7:1 (body/muted) or 4.5:1 (other) is a token bug: fix in tokens, regenerate, re-audit.

---

## Phase 6 — Handover

### T6.1 Docs
- `docs/DECISIONS.md` complete and dated.
- `docs/components.md`: each component, its props, where it may and may not be used.
- `docs/content-authoring.md`: how to write a guide (frontmatter, required blocks, which MDX components exist, the honesty rules).
- `docs/images.md`: buying rules (Stocksy default, no faces, no Editorial licences), the grade script, the manifest fields.
- Update `README.md` with the scripts.

### T6.2 Manual tasks list — do not attempt these; just document them
Write `docs/MANUAL-TASKS.md` containing:
1. Shopify admin → Settings → Checkout → Customize: set logo, colours, font from the checkout list to match the tokens. Non-Plus: no custom CSS.
2. Verify the thank-you and order-status pages are on the new checkout (the August 2026 migration).
3. Add product metafields (`mil`, `capacityCc`, `dimensions`, `foodSafeCert`, `bagSizeFits`, `whoFor`, `whoNotFor`, `notTested`) and fill them for the 8 SKUs; the templates already read them.
4. Verify every row of `src/data/sizing.json`.
5. Fill every `TODO(jack)`: author bio, How We Test protocol, home H1, `images.json` provenance for existing images.
6. Set Storefront API token and newsletter endpoint in Netlify env.
7. Add selling plans in Shopify if subscribe-and-save is wanted.
8. Review `docs/screens/` before merging.

### T6.3 Final state
`npm run check` green (or as green as this environment allows — document any check that cannot run here, e.g. Lighthouse CI without a live deploy target); branch pushed to `origin/redesign/design-system` only; **no PR opened, nothing merged, nothing on `main`.** Finish by printing the contents of `docs/MANUAL-TASKS.md` and the list of `TODO(jack)` markers with file paths.

---

## Appendix A — The not-AI rule (verbatim; check every page against it)

**Never:** indigo / violet / purple anywhere · gradients on backgrounds or text · glow shadows · `rounded-2xl`, pill buttons, any radius over 4px · framework defaults left untouched · centred hero → 3 icon cards → testimonials → CTA band · a badge/pill above the H1 · identical-height cards regardless of content · stat rows without context · "trusted by" logo strips · emoji as icons · Inter / Geist / Roboto · a lone italic serif word in a sans headline · scroll-reveal / fade-up on sections · hover-scale on cards · parallax, scroll-jacking, auto-advancing carousels · popups, exit-intent, timed slide-ins · countdowns, fake urgency, "X people viewing", "as seen on" · star ratings without real reviews · copy with "transform / supercharge / unleash / effortlessly / reimagined / elevate" · arbitrary spacing outside the token scale · colour as the only carrier of meaning.

**Always:** the body column sets the grid · hierarchy from weight + size + colour + position + rules together · hairline rules instead of shadowed cards · asymmetric, content-driven grids · varying section rhythm · byline and "Updated" date under every headline · marginalia and pull-quotes as reading aids · tabular numerals and real tables · one accent (rust) tied to one meaning (a verdict, a limitation, a warning) · inline, contextual commerce links in prose · a dense, useful footer · a visible point of view: verdicts, "what we tested and rejected", "what we haven't tested" · credits and dates that a human is accountable for · radius 0 by default · motion under 300ms and only for state changes.

## Appendix B — Ghost usage
`.sp-ghost` (the offset second copy in ice) appears on: the logo files, the H1 of every page, `PullQuote`. Nowhere else. Never under 24px, never on body, nav, buttons or links. On an ice band (`surface.ice`) wrap in `.sp-on-ice` so the ghost turns rust.
