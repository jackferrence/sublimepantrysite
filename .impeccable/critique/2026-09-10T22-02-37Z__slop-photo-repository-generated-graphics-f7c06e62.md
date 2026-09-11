---
target: entire site — AI slop, photo repository, generated graphics
total_score: 0
max_score: 0
na_heuristics: 1,2,3,4,5,6,7,8,9,10
p0_count: 0
p1_count: 3
target_identity: "file:/Users/jackferrence/Developer/E-COMMERCE EMPIRE/sublimepantrysite/entire site — AI slop, photo repository, generated graphics"
timestamp: 2026-09-10T22-02-37Z
slug: slop-photo-repository-generated-graphics-f7c06e62
closed: true
---
# Sublime Pantry — Imagery & AI-Slop Audit

Method: dual-agent (A: imagery design review · B: detector + mechanical inventory)
Scope: AI slop / photo-repository / generated-graphics audit, per user request — not a general UX heuristics review.

## AI-Slop Verdict

No AI-generated imagery found anywhere on the live site. Every photograph that actually renders (7 PackFreshUSA product shots, 2 equipment stock photos) shows genuine-photo characteristics. But the mechanical detector's AI-pattern rule family (gpt-thin-border-wide-shadow, aphoristic-cadence, em-dash-overuse, side-tab/slop) fires 1,020 times across 74 pages in built dist/ output vs only 8 in source — pattern-level AI slop, not photographic.

## Photo-Repository Verdict

20 catalogued assets, disciplined and honestly disclosed where used, but under-deployed: 11/20 (55%) never placed, including 6 MRE photos matching live SKUs (SP-TRL-HALF/FULL) that currently show no image.

## Priority Issues

- [P1] Broken image: homepage 100cc Oxygen Absorber Refill card renders <img src=""> (empty src, naturalWidth 0). Root cause: SKU SP-OA100-100 missing from BY_SKU in src/lib/product-media.ts; src/pages/index.astro:39 has no empty-src guard (unlike shop.astro:59).
- [P1] Misleading stock photo: /compare/home-freeze-dryers hero (freeze-dryer-pair-loaded-trays) visibly shows an "ESTBRIGHT"-branded unit, not one of the three machines (Harvest Right/Blue Alpine/Stay Fresh) the article compares. Caption discloses "not our unit" but not "not a compared unit."
- [P1] Design/copy pattern-slop at scale in dist/: 1,020 detector findings across 74 pages (cramped-padding 670, gpt-thin-border-wide-shadow 132, tight-leading 58, em-dash-overuse 32, side-tab 75 [slop category], all-caps-body 29, aphoristic-cadence 6, tiny-text 7, undersized-ui-text 3, kicker-above-heading 1). Worst pages: troubleshooting/vacuum-error.html (23), freeze-drying-starter-checklist.html (22), shop.html (21).
- [P2] Two live SKUs (100cc/300cc Oxygen Absorber Refill) have zero product photography anywhere.
- [P2] packfresh-6x6-bag-100cc-absorbers reused across 4 SKUs (Starter Set, Season Set, Snack Bags 50/100-pack) with no visual differentiation.
- [P3] Dead inventory: 11/20 catalogued photos unplaced, notably 6 MRE pouch photos matching existing SKUs, and 3 fruit-pile photos unused on /compare/fruit-vs-vegetables-vs-meat where topically relevant.

## What's Working

- Provenance-disclosure system real and enforced: every stock/manufacturer photo correctly captioned; not-product-imagery restriction honored in code and covered by passing tests (16/16 tests/assets.test.mjs).
- Product-detail-page photography (Starter Set 5-image gallery, sealer 3-image gallery) is the strongest imagery on the site: real, well-composed, honestly labeled.
- Zero AI-generated or AI-suspect raster imagery anywhere; design leans on typography, disclosed real photography, and hand-authored SVG brand marks.

## Minor Observations

- public/images/product-originals/ retains only 7 of 13 declared originals — unremarked in docs.
- src/lib/assets.ts's findAssets()/getAsset() query API is only called by the docs generator and test suite; actual page rendering uses direct assetId/SKU lookups instead, so the "can't be filled by whatever's lying around" guarantee isn't enforced by the live render path.
- Detector's broken-image rule can't distinguish a JS-populated lightbox placeholder from a truly empty src; 6 of 7 dist hits are this false positive, only the homepage absorber-refill card is real.
