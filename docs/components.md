# Components

Built or wired this session (`docs/CLAUDE-CODE-PROMPT.md` Phase 3). Pre-existing components (`Header.astro`, `Footer.astro`, `BrandBlock.astro`, `Byline.astro`, `AuthorBio.astro`, `ToolsMentioned.astro`, `Newsletter.astro`, the five `src/pages/tools/*.astro` calculators, and more) are not re-documented here — read them directly, they're small and commented in place. This file covers the new `src/components/blocks/` and `src/components/figures/` components, which is where a guide author or a future session is most likely to need a reference.

Every component below is wired into `/design-system` (noindex) with real or representative data — look there first if you want to see one rendered before reading its source.

## `src/components/blocks/`

### `VerdictBox`
**Props:** `label: 'Our pick' | 'Also good' | 'Budget pick'`, `productHandle: string`, `why: string`.
Reads the product from `src/lib/commerce.ts`'s `CATALOG` by handle — never pass a price or title as a prop, they come from the catalog so a verdict can't assert something Shopify doesn't have. **Content rule for `why`:** comparison-based reasoning only ("highest cc rating per the datasheet"), never a physical-result claim ("held up best in our test") — see the methodology decision in `docs/DECISIONS.md`. One per entry in a guide's `verdicts[]` frontmatter array. Renders nothing if the handle isn't found — it throws instead, at build time, so a typo'd handle fails loud.

### `ComparisonTable`
**Props:** `testedProducts: Array<{ productHandle, mil?, capacityCc?, pricePerUnit?, sealType?, foodSafeCert?, note }>`, `whyItMatters?: string`.
A real `<table>`, horizontal-scroll wrapper (not the site's older `.table-cards` mobile-collapse pattern — see the component's own doc comment for why). `foodSafeCert` renders "—" wherever the catalog doesn't state one; never invent a value for a missing field.

### `HonestyBlock`
**Props:** `testedProducts` (same shape as above, only `.note` used), `notTested: Array<{ name, reason }>`.
Titled **"What we compared — and didn't,"** not "What we tested" — see the methodology decision in `docs/DECISIONS.md` for exactly why that wording matters and is enforced by `tests/claim-shapes.test.mjs`. **Content rule for `.note`:** state the comparison basis (datasheet figure, certification language, vendor listing), never a physical result.

### `LimitationsCallout`
**Props:** `limitations: string`.
Eyebrow reads **"What we haven't verified,"** not "...tested" — same methodology reasoning as `HonestyBlock`. Required on every guide that has a `limitations` field. Rust left border (`status.warn`), never yellow, never an exclamation icon.

### `WhoFor`
**Props:** `whoFor: string[]`, `whoNotFor: string[]`.
Two short lists, directly under the byline. Renders nothing if both arrays are empty.

### `SpecSheet`
**Props:** `productHandle: string`.
Reads `product.specs` from `src/lib/commerce.ts` — a `<dl>` of `mil`/`dimensions`/`capacityCc`/`sealType`/`bagSizeFits`/`foodSafeCert`. Every value in every product's `specs` object is copied from a fact that product's own `note`/`whatsIncluded`/`faq` already states — **before adding a new SKU's specs, read its existing catalog copy first; never fill a field with something not already asserted elsewhere in that record.** A missing field renders "—". Used on the real product page (`src/pages/shop/[handle].astro`) and inline in guides.

### `PullQuote`
**Props:** `text: string` (not a slot — see below).
Bodoni 500, `.sp-ghost`, hairline rules above/below. **The only place besides an article's H1 the ghost effect is allowed** (BRAND.md Appendix B). Takes `text` as a string prop rather than children because the ghost is CSS (`content: attr(data-ghost-text)`), which needs the exact same plain text available as an HTML attribute value. Throws at build time if `text` is over 20 words.

### `Aside`
A slot-based marginalia component (arbitrary inline markup — links, emphasis — is fine here, unlike `PullQuote`). Floats into the right margin at ≥1100px; below that, an indented block with a hairline left rule.

## `src/components/figures/`

Flat, two-colour SVG illustrations — 2px `currentColor` stroke, `--sp-color-surface-ice` as the single fill, at most one `--sp-color-action-primary` (rust) accent, a required accessible `<title>`. No original product photography exists yet (see `docs/DECISIONS.md`'s fold-forward note from the retired `ART-DIRECTION.md`); these exist so product/diagram slots aren't blank in the meantime, and can be swapped for real photography later without any consumer changing.

### `Packshot`
**Props:** `sku: string` (a handle from `CATALOG`), `title?: string`, `class?: string`.
Renders one of four shapes (bag / absorber / sealer / bundle) based on an explicit `SKU_KIND` map inside the component — not inferred from the handle string, so a renamed or newly-added SKU fails loudly instead of silently rendering the wrong shape. **Use this as the fallback wherever `product.image` is empty** — see `src/pages/index.astro`, `src/pages/shop.astro`, and `src/components/ToolsMentioned.astro` for the pattern (`{product.image ? <Img .../> : <Packshot sku={product.handle} .../>}`). Three real product-media gaps were found and fixed this session by grepping for places this pattern was *missing* — if you add a new product-listing surface, check it renders correctly for a SKU with no photography (currently: the 100cc and 300cc oxygen absorber refills) before shipping it.

### `OxygenIndicator`, `PuffyBagTest`, `SealSteps`, `SublimationCurve`, `ChamberCutaway`
Reader-facing technique/education diagrams. `OxygenIndicator` and `PuffyBagTest` carry an explicit methodology framing in their own doc comments and (for `PuffyBagTest`) in their rendered caption — they teach the *reader* to check *their own* batch, and must never read as Sublime Pantry claiming to have run the technique on a product itself. `SublimationCurve` and `ChamberCutaway` are generic physics/equipment education with no methodology framing needed. `SealSteps` is a plain four-step how-to using the site's own catalog vocabulary. `PuffyBagTest` and `OxygenIndicator` are wired live on `/review-methodology`; the other three are only on `/design-system` as of this writing — `SublimationCurve` is a natural fit for the home page hero (T4.1, not done), `ChamberCutaway`/`SealSteps` for a guide that discusses the machine or sealing.

## Where a component may and may not be used

- **Never** set a colour that isn't a semantic token (`var(--sp-color-*)` or a `--color-semantic-*`/`--brand`/`--ink` legacy alias — see `scripts/generate-tokens.mjs`'s comment on why those aliases exist). `.stylelintrc.json` enforces this on `public/styles/**/*.css`; `npm run lint:css:all` checks `.astro` scoped styles too but isn't clean yet (see `docs/DECISIONS.md`).
- **`PullQuote`'s `.sp-ghost`** — logo files, article H1s, `PullQuote`. Nowhere else, never under 24px, never on body/nav/buttons/links.
- **The `blocks/` guide components** (`VerdictBox`, `ComparisonTable`, `HonestyBlock`, `LimitationsCallout`, `WhoFor`) are wired into `src/layouts/ArticleLayout.astro` gated on `d.pillar === 'guides'` — they won't render on troubleshooting/compare/recipe pillars even if you populate the fields, by design (those pillars don't carry a "verdict" structure in their content model).
