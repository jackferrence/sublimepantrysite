# Content authoring

## The shape: JSON, not MDX

`docs/CLAUDE-CODE-PROMPT.md`'s Phase 3/4 text assumes MDX components inserted inline in prose (`<ShopTheTools handles={[...]} />` and similar). **That's not how this site actually works, and this session did not change it.** Content lives in `src/content/articles/*.json` — one JSON file per article, with a `bodyHtml` field holding the article's prose as a raw HTML string, plus structured frontmatter fields alongside it. There is no MDX pipeline. The guide-specific blocks (`VerdictBox`, `ComparisonTable`, `HonestyBlock`, `LimitationsCallout`, `WhoFor`) are rendered automatically by `src/layouts/ArticleLayout.astro` from frontmatter arrays — you don't place them inline in `bodyHtml`; you populate the frontmatter field and the layout puts the block in the right position for you (see the order below).

Schema source of truth: `src/content.config.ts`.

## Every article's base frontmatter

```jsonc
{
  "title": "…",
  "description": "…",
  "kicker": "…",              // small label above the title
  "pillar": "guides",          // "guides" | "troubleshooting" | "compare" | "recipes"
  "section": "…",              // optional, overrides kicker display in some contexts
  "riskClass": "standard",     // "standard" | "elevated" — "elevated" renders EducationalNotice
  "publishedDate": "2026-01-01",
  "updatedDate": "2026-02-01", // optional
  "verifiedDate": "2026-02-01",// optional — ONLY set when a real recheck happened, never derived
  "author": "Jack Ferrence",   // defaults to this; see src/lib/authors.ts
  "disclosure": "…",
  "sources": [ { "title": "…", "url": "https://…", "publisher": "…", "tier": "primary", "accessDate": "2026-01-01" } ],
  "bodyHtml": "<p>…</p>"
}
```

`sources` needs at least one entry. `compare` pillar articles must also set `comparisonCriteria`.

## Guide-only fields (all optional, all additive — a guide with none of these still renders exactly as before)

Added this session (`docs/CLAUDE-CODE-PROMPT.md` T2.1) so `ArticleLayout.astro` can render the five new blocks. **Every one of these gets rendered automatically if set — you do not call a component yourself.**

```jsonc
{
  "whoFor": ["…"], "whoNotFor": ["…"],              // -> WhoFor, directly under the byline
  "verdicts": [                                       // -> one VerdictBox each, after the opening
    { "label": "Our pick", "productHandle": "quart-bags-8x12-50-pack-300cc-absorbers", "why": "…" }
  ],
  "testedProducts": [                                  // -> ComparisonTable + half of HonestyBlock
    { "productHandle": "…", "mil": "7", "capacityCc": "300cc", "sealType": "Heat seal", "note": "…" }
  ],
  "notTested": [ { "name": "…", "reason": "…" } ],      // -> the other half of HonestyBlock
  "limitations": "…",                                   // -> LimitationsCallout
  "lastReviewed": "2026-02-01"                           // shown next to "Updated" — see the naming note below
}
```

Render order on a guide page (`ArticleLayout.astro`): Eyebrow → H1 → Byline → **WhoFor** → body opening → **VerdictBoxes** → (rest of body) → **ComparisonTable** → **HonestyBlock** → **LimitationsCallout** → ToolsMentioned → disclosure → FAQ → Sources → AuthorBio.

## The methodology rule — read this before writing `why`, `.note`, or `limitations`

**Jack decided (2026-09-10): Sublime Pantry is spec/documentation-based, not hands-on tested. No physical testing occurs.** (Full decision text in `docs/DECISIONS.md`.) This is enforced two ways:

1. **By a build-time test.** `tests/claim-shapes.test.mjs`'s TESTING guard fails the build on the phrase "we [up to 3 words] tested" anywhere in built HTML, with no allowance list beyond `not`/`never`/`have not`. Writing "we tested this and it held up" in a `VerdictBox.why` or a `HonestyBlock` `.note` will fail `npm run build`, not just look wrong.
2. **By what's actually true.** Even where a sentence doesn't trip the regex, don't write a physical-result claim. Every comparison claim needs a comparison basis: a datasheet figure, a certification's stated language, what the vendor's own listing says. "Highest cc rating per the datasheet" — right. "Held up best in our test" — wrong, and not just stylistically; it's not true.

The one place physical technique instructions are fine: teaching the *reader* how to check *their own* batch (the puffy-bag test, reading an oxygen indicator, checking a seal). That's technique education, not a Sublime Pantry testing claim — see `src/components/figures/PuffyBagTest.astro` and `OxygenIndicator.astro`'s own doc comments for the exact line between the two, and match their second-person framing ("run this on your own bag") if you write similar copy elsewhere.

`lastReviewed`, not `lastTested`: the field was renamed this session for the same reason — see the field's own comment in `src/content.config.ts`.

## Recipe-only fields

```jsonc
{
  "recipe": {
    "yield": "About 4 cups, from 6 lb fresh",
    "prepTime": "PT30M", "cycleTime": "PT30H", "totalTime": "…",  // ISO 8601 durations
    "ingredients": ["…"], "category": "…",
    "rehydration": "Cover with warm water, ready in ~12 min",       // new this session
    "bagSize": "Fits one quart (7-mil) bag per batch"               // new this session
  }
}
```

No recipe content exists yet as of this session — `src/content/articles/*.json` has zero `pillar: "recipes"` entries. The recipe SpecSheet placement (T4.3: directly under the byline, plus a "Pack it" `ShopTheTools`-style strip after the method) is documented in `docs/CLAUDE-CODE-PROMPT.md` but not built — nothing to verify it against yet.

## Images

An article's `image` field points at an asset by `assetId` (preferred — see `docs/images.md`) or a legacy bare `{ src, alt }`. An article hero renders **nothing** until a real photograph exists — never a placeholder standing in for reporting. Products that have no photography render a `Packshot` (`src/components/figures/Packshot.astro`) instead — see `docs/components.md`.

## Before publishing a guide that uses the new fields

1. Run `npm run build && npm test` — the build itself will catch the methodology-claim regex; the test suite catches a dozen other claim-shape rules (price disclosure, shelf-life promises, product-name drift, and more — read `tests/claim-shapes.test.mjs`'s test names for the full list).
2. If the guide has `verdicts`/`testedProducts`, run `npm run test:a11y` — a new comparison table or verdict box is exactly the kind of thing that can introduce a real accessibility regression (this session's own T5.1/T5.2/T5.5 passes found three real bugs in existing pages this way).
