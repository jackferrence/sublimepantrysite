# Images

## The current state: no original photography

As of this session, Sublime Pantry has no original product or process photography. The 8 real SKUs get flat vector `Packshot`s (`src/components/figures/Packshot.astro`) as a stand-in, and five technical diagrams (`src/components/figures/`) carry the reader-education weight photography would otherwise carry. This is deliberate, not a placeholder gap waiting to be filled by whatever's easiest — see `docs/design-research.md` §2 for the reasoning (vector packshots + diagrams now, real photography or 3D renders later, without changing any consumer).

Some real supplier/manufacturer photography does exist and is already wired in (`src/lib/product-media.ts`) — 6 of the 8 SKUs have it. The two 100cc/300cc oxygen absorber refills don't; every product-listing surface (`src/pages/index.astro`, `src/pages/shop.astro`, `src/components/ToolsMentioned.astro`, product pages) falls back to `Packshot` for exactly those.

## The photography catalog: `src/lib/assets.ts`

One entry per photograph the site may publish, with its provenance and limits recorded next to it — not a folder convention, a typed manifest. Read the file's own header comment before adding to it; it explains three specific, previously-real incidents (a wrong-machine photo, a stock pouch standing in for our packaging, alt text describing a photo that isn't the one shown) that the manifest's structure exists to prevent.

Key fields:
- `id`, `src`, `alt`, `cls` (`product`/`food`/`equipment`/`camping`/`process`/`line-hero`/`brand`), `source` (`own`/`manufacturer`/`stock`), `credit`.
- `ratios: AssetRatio[]` — `'16:9' | '4:5' | '1:1'`, matching `docs/design-research.md` §2's fixed-ratio-per-slot rule.
- `restrictions?: AssetRestriction[]` — a **closed** vocabulary, not a free string: `not-product-imagery`, `editorial-illustration-only`, `not-our-equipment`, `provenance-unverified`. `tests/assets.test.mjs` fails the build if a `not-product-imagery` asset reaches a product surface — this is the enforcement `docs/CLAUDE-CODE-PROMPT.md`'s T2.3 `scripts/lint-images.mjs` asks for; it already exists under a different name.
- **New this session, all optional, all currently unset** — licence/purchase provenance for when a real stock purchase happens: `sourceId`, `sourceUrl`, `licenseType`, `purchaseDate`, `cost`, `modelRelease`, `propertyRelease`, `requiresAttribution`, `expires`, `treatment`. Fill these in when a photo is actually purchased — never backfill them for a photo that predates having a licence record.

`docs/ASSET-LIBRARY.md` is generated from this file on every `npm run build` — don't hand-edit it.

## Buying rules, when real photography is purchased (`docs/design-research.md` §2)

- **Stocksy by default** for anything with hands in frame (model-released, standard licence covers site use). Adobe Stock/Unsplash+ for textures/backdrops that get graded anyway.
- **Never** anything flagged Editorial (Getty/iStock/Shutterstock/Stocksy Editorial) on any page that sells.
- **No faces.** Hands doing a task only.
- **One batch grade at ingest**: desaturate 10–15%, lift blacks, split-tone toward ice/paper — baked into the delivered file, not a CSS filter (CSS/SVG duotone is for hover states only).
- **Fixed ratios**: hero 16:9, card 4:5, inline 3:2, packshot 1:1.
- White-balance window at intake: reject warmer than ~4800K or cooler than ~6500K.

## `Img.astro`

`src/components/Img.astro` wraps `astro:assets`' `<Image>` (for Shopify CDN URLs, which get real optimisation) or a plain `<img>` (for everything else, with `srcset` auto-filled from the asset library when the `src` matches a library path). Required: `alt`, `width`, `height`. Optional `slot` prop (`hero | card | inline | pack`, added this session) pins `aspect-ratio` + `object-fit: cover` to the ratio for that slot and gives the element a solid `--sp-color-surface-inset` ground — use it for any new image placement rather than hand-writing the ratio again.

## Packshots and diagrams

See `docs/components.md`'s "figures" section for the full list and the methodology framing `OxygenIndicator`/`PuffyBagTest` carry. Spec for any new one: 2px `currentColor` stroke, `--sp-color-surface-ice` as the single fill, at most one `--sp-color-action-primary` (rust) accent, a required accessible `<title>` (and a `<figcaption>` for diagrams, not packshots).

## What's still open

- The four `docs/design-research.md`/ART-DIRECTION-era shot-list file paths (`public/images/hero.jpg`, `public/images/products/starter-kit-*.jpg`, etc. — the full list is in `docs/DECISIONS.md`'s "Facts carried forward from the retired ART-DIRECTION.md") still name where real photography should land when it exists. None of those files exist yet.
- `scripts/lint-images.mjs` as a literally-named script doesn't exist — `tests/assets.test.mjs` already does the enforcement job; a separate script with the same rule would be two sources of truth for one rule. If `docs/CLAUDE-CODE-PROMPT.md`'s literal `npm run lint:images` name is needed for a CI step, alias it to the existing test rather than duplicating the logic.
