# sublimepantrysite

Sublime Pantry: a publication-first, shop-second Astro site on Netlify, with an editorial/commerce layer described in full in `docs/COMMERCE-ARCHITECTURE.md` and a design system described in `BRAND.md` / `docs/design-research.md` / `docs/CLAUDE-CODE-PROMPT.md`. `docs/DECISIONS.md` is the running log of what's actually been built, what's been deliberately deferred, and why — read it before assuming a spec document describes the shipped state.

## Quick start

```sh
npm install
npm run dev      # astro dev, http://localhost:4321
```

No Shopify credentials are required for local dev or `npm run build` — the site fails closed (renders an "unstocked"/pending state) rather than guessing when Shopify is unreachable. See `src/lib/commerce.ts` and `src/lib/stock.ts`.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` / `npm start` | Astro dev server. |
| `npm run build` | `tokens:check` → `astro check` → generate OG images → `astro build` → Pagefind search index. This is the one command Netlify runs; heavier checks below run in CI, not on the Netlify build clock. |
| `npm run preview` | `astro preview` (serves a build you've already run). |
| `npm run tokens` | Regenerate `public/styles/tokens.css` from `tokens/global.tokens.json` + `tokens/semantic.{light,dark}.tokens.json`. |
| `npm run tokens:check` | Same, but fails if the committed `tokens.css` is stale instead of overwriting it. |
| `npm test` | The Node test suite (`tests/*.test.mjs`) — 371 tests as of this writing, covering claims, schema, commerce wiring, brand assets, and more. Requires a fresh `npm run build` first (tests read `dist/`). |
| `npm run lint:css` | Stylelint on `public/styles/**/*.css` only (the real, shipped, currently-clean stylesheet). |
| `npm run lint:css:all` | Stylelint across `public/styles/**/*.css` **and** every `src/**/*.astro` scoped `<style>` block. Not clean yet — see `docs/DECISIONS.md`'s stylelint-sweep entries for the running count and which files remain. |
| `npm run test:a11y` | Playwright + axe-core over one page per template, light/dark, 375px/1280px (`tests/a11y/axe.spec.ts`). Serves `dist/` via `scripts/static-server.mjs` — **not** `astro preview`, which daemonizes and breaks Playwright's `webServer` (see the script's own comment). |
| `npm run test:lhci` | Lighthouse CI (`.lighthouserc.cjs`) against home/a guide/a product page. Uploads each run's report to public temporary storage — deliberately a separate, explicit script, not part of `check`. |
| `npm run test:budget` | `scripts/budget.mjs` — fails if any built page's CSS/JS/total (gzip, excluding images) exceeds its budget. |
| `npm run check` | The full local gate: `tokens:check` → `lint:css` → `build` → `test` → `test:budget` → `test:a11y`. |
| `npm run check-links` | `.github/scripts/check-links.py` against `dist/` — broken internal links. |
| `node scripts/screenshot-templates.mjs [outDir]` | Captures one screenshot per template × 4 widths × 2 colour schemes into `outDir` (default `docs/screens/`, gitignored — regenerate on demand). Requires a server already running at `localhost:4321` (`node scripts/static-server.mjs`). |
| `npm run editorial:*` | The editorial content pipeline (dry-run/research/draft) — see `scripts/editorial-controller.mjs`. |
| `npm run monitor:shopify-title` | Daily drift check between Shopify's product titles and the site's — see `docs/COMMERCE-ARCHITECTURE.md`. |
| `npm run setup:webhooks` | One-time Shopify webhook setup for the Netlify build hook — see `docs/COMMERCE-ARCHITECTURE.md`. |

## Where things live

- **Tokens**: `tokens/global.tokens.json` (raw values) → `tokens/semantic.{light,dark}.tokens.json` (intent) → `scripts/generate-tokens.mjs` → `public/styles/tokens.css` (generated, don't hand-edit). `public/styles/base.css` is the real, hand-maintained stylesheet everything else builds on.
- **Content**: `src/content.config.ts` defines one `articles` collection, discriminated by a `pillar` field (`guides`/`troubleshooting`/`compare`/`recipes`) rather than four separate collections — see `docs/DECISIONS.md`'s T2.1 entry for why. Content itself is `src/content/articles/*.json`.
- **Commerce**: `src/lib/commerce.ts` (catalog copy, identifiers, specs — never price or inventory), Shopify's own Storefront Web Components (`src/components/ShopifyStore.astro`, `CartDrawer.astro`) for live price/cart/checkout.
- **Components**: `src/components/` (primitives, brand, commerce), `src/components/blocks/` (guide-content blocks: VerdictBox, ComparisonTable, HonestyBlock, LimitationsCallout, WhoFor, SpecSheet, PullQuote, Aside), `src/components/figures/` (SVG packshots and diagrams — see `docs/images.md`).
- **The internal design QA page**: `/design-system` (noindex) — every new primitive and block gets wired in here with real or representative data before it ships elsewhere. See `docs/components.md`.

## Docs map

- `BRAND.md` — the brand contract (palette, type, spacing, motion, voice).
- `docs/design-research.md` — the "why" behind the brand contract.
- `docs/CLAUDE-CODE-PROMPT.md` — the phased build spec this rebuild has been executing against.
- `docs/DECISIONS.md` — **read this first.** The actual, dated log of what's built, what's deliberately deferred, what conflicts were found between the spec docs and the live site, and how each was resolved.
- `docs/components.md`, `docs/content-authoring.md`, `docs/images.md` — component/content/imagery reference for whoever writes the next guide or component.
- `docs/MANUAL-TASKS.md` — the checklist of things that need a human in the Shopify/Netlify admin, not more code.
- `docs/COMMERCE-ARCHITECTURE.md` — the Astro/Shopify boundary, webhooks, structured data.
- `tokens/CONTRAST.md` — the WCAG contrast audit for both colour schemes.
