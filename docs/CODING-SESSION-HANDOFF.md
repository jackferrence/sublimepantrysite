# Sublime Pantry coding-session handoff

Prepared: 2026-09-10

## Start here

Continue in this repository on branch `work`. Preserve the current working implementation; do not revert or rebuild the completed token, gallery, logo, tool, art-direction, or route foundations.

```sh
cd "/Users/jackferrence/Documents/Codex/2026-09-09/files-mentioned-by-the-user-sublimepantry/work/site"
git switch work
git pull --ff-only origin work
```

Read these files before editing:

- `docs/UI-SYSTEM-EXECUTION.md`
- `docs/ART-DIRECTION.md`
- `docs/ASSET-LIBRARY.md`
- `docs/ANALYTICS-EVENTS.md`
- `docs/COMMERCE-ARCHITECTURE.md`
- `docs/LOGO-KIT-INVENTORY.json`

The original source archives remain at:

- `/Users/jackferrence/Developer/E-COMMERCE EMPIRE/sublimepantrysite/sublimepantry-logo-kit.zip`
- `/Users/jackferrence/Downloads/embedded tools.zip`

Both archives and their nested archives were fully inventoried and checksummed before integration. Do not recopy their competing registries, layouts, or styles wholesale.

## Completed implementation

- Installed the supplied logo artwork into `public/brand/approved/` with an integrity README and typed mappings in `src/lib/media.ts`.
- Replaced reconstructed branding with the supplied desktop wordmark, roman `SP` mobile monogram, tagline footer lockup, favicon/app icons, and social mark. Deleted the retired drawn `Mark.astro`.
- Kept the DTCG token source/generator, field-guide global foundation, design-system route, art-direction policy, and accessible product-gallery work from the earlier foundation commit.
- Added all four supplied calculators: Oxygen Absorber Size, Freeze-Drying Batch Planner, Freeze Dryer Running Cost, and Trail Meal Cost.
- Consolidated all five tools, including Batch Log, in `src/lib/tools.ts`.
- Added shared `ToolLayout.astro`, embed attribution, canonical/schema behavior, privacy boundaries, server-rendered defaults, formulas, sources, disclosures, and contextual article/product placements.
- Added source data modules under `src/data/` and adapted the supplied arithmetic, citation, privacy, and embed tests.
- Redesigned the homepage, Guides, Compare, Troubleshooting, Recipes, Tools, Shop, article, product, contact, and selling routes around the open editorial/ruled-list system.
- Added explicit product-media mappings in `src/lib/product-media.ts`, original high-resolution assets in `public/images/product-originals/`, keyboard gallery controls, zoom, dimensions, captions, and truthful media-pending states.
- Added analytics hooks/documentation for tool discovery and downstream actions without collecting calculator values or results.

The most recent completed checks before this handoff were:

- `npm test`: 370 tests passed.
- Direct Astro production build: 70 pages built and indexed.
- Shopify was unreachable, and the deterministic unstocked fallback rendered correctly.

## Required next work

1. Install Bodoni Moda Variable through the requested package:

   ```sh
   npm install --save-exact @fontsource-variable/bodoni-moda
   ```

   Import the package CSS from the Astro build, confirm the resulting family name is `Bodoni Moda Variable`, and add a regression test for the dependency/import. The design tokens already name Bodoni as the primary display face and no longer reference Didot or Ibarra. Previous installs failed only because `registry.npmjs.org` DNS was unavailable in the restricted session.

2. Run the exact final gate after the font change:

   ```sh
   npm test
   npm run tokens:check
   npm run build
   npm run check-links
   git diff --check
   ```

3. Run browser QA at 320, 375, 768, 1024, 1280, and 1440 CSS px plus 200% zoom. Inspect homepage, each hub family, articles with/without heroes, all five tools, shop, representative PDPs, cart, newsletter/policy/404, menu/focus, and loading/error/empty/sold-out states. Capture and inspect desktop/mobile screenshots. The previous sandbox could not bind a local preview server.

4. Verify the live Shopify Storefront integration when network and credentials are available: price, inventory, variants, add-to-cart, cart focus behavior, and checkout handoff. Keep deterministic fallbacks.

5. Perform the final anti-template audit. Retain purposeful calculator/data panels, but remove any remaining generic equal-card grids, vague CTA copy, decorative effects, or repetitive centered section rhythm.

6. Update `docs/UI-SYSTEM-EXECUTION.md` with the final font, browser, commerce, performance, accessibility, and command results. Commit and push follow-up fixes to `work`.

## Known truthful media gaps

- The absorber refill SKUs do not have reliable exact pack photography in the supplied source set. They intentionally render an explicit exact-media-pending state.
- Some bundles use truthful photographs of their included components rather than claiming a dedicated bundle pack shot.
- Do not replace either case with stock photography.

## Architecture constraints

- Astro owns editorial discovery and merchandising; Shopify remains authoritative for live price, availability, cart, and checkout.
- Calculator inputs/results stay browser-only and must never enter analytics, cookies, or web storage. Batch Log retains its disclosed local-storage/CSV behavior.
- Preserve meaningful no-JavaScript defaults and `?embed=1` pre-paint behavior.
- Use only supplied logo exports; never redraw, typeset, crop, mirror, recolor, shadow, or respacing them.
- Keep exact product media separate from documentary stock and explanatory graphics.
- Do not delete or weaken tests to make the suite pass.

## Useful implementation entry points

- Brand map: `src/lib/media.ts`
- Tool registry: `src/lib/tools.ts`
- Tool shell: `src/layouts/ToolLayout.astro`
- Product media: `src/lib/product-media.ts`
- Commerce catalog boundary: `src/lib/commerce.ts`
- Article placements: `src/layouts/ArticleLayout.astro`
- Execution ledger: `docs/UI-SYSTEM-EXECUTION.md`
