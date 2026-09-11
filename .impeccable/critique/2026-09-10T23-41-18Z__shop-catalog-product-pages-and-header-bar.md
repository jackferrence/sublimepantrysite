---
target: shop catalog, product pages, and header bar
total_score: 26
max_score: 32
na_heuristics: 7,9
p0_count: 0
p1_count: 2
target_identity: "file:/Users/jackferrence/Developer/E-COMMERCE EMPIRE/sublimepantrysite/shop catalog, product pages, and header bar"
timestamp: 2026-09-10T23-41-18Z
slug: shop-catalog-product-pages-and-header-bar
---
# Sublime Pantry — Shop Catalog, Product Pages & Header Critique

Method: dual-agent (A: design review · B: detector + browser evidence)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Header cart badge never reflects real cart state |
| 2 | Match Between System & Real World | 4 | Copy is specific and on-voice throughout |
| 3 | User Control and Freedom | 3 | Mobile menu Escape/focus-trap solid; cart recovery not stress-tested |
| 4 | Consistency and Standards | 3 | Uppercase checkout button; editorial-only search placeholder on buying pages |
| 5 | Error Prevention | 3 | Unstocked items show real "Not currently stocked" state |
| 6 | Recognition Rather Than Recall | 4 | Real specific alt text; text-labeled nav |
| 7 | Flexibility and Efficiency | n/a | Small transactional surface, 8 SKUs |
| 8 | Aesthetic and Minimalist Design | 4 | Restrained, borders not shadows |
| 9 | Error Recovery | n/a | Not exercised this pass |
| 10 | Help and Documentation | 3 | Per-SKU FAQ, genuinely specific |
| Total | | 26/32 | Good (81%) |

## Design Specificity Verdict

Authored for this product, not a generic template. Grouped "shelf" catalog layout, real disclosed photography, honest "media pending" empty state, testing-status disclosures per product, conditionally-rendered real reviews (confirmed absent from build when unconfigured, not faked). Mechanical scan for AI-slop e-commerce tells (urgency copy, fake reviews, generic trust badges) came back at zero matches across all three categories. No banned voice words found.

## Priority Issues

- [P1] Header cart badge never reflects real cart state after a live add-to-cart. Root cause: CartDrawer.astro:147-151 countLines() selector (`[part~="line-item"], [part~="cart-line"], li`) matches zero elements against Shopify's actual shadow-DOM part names, falls through to a session-blind click counter. Add-to-cart click binding on /shop also showed unattached (dataset.spBoundAdd undefined) — not fully root-caused.
- [P1] Mobile search icon not actually hidden, contradicting its own code comment: `.search-toggle{display:none}` loses a same-specificity later rule `.icon-button{display:inline-flex}` by source order. Confirmed at 390px and 360px.
- [P2] Cart line-item image has literal alt="null" — lives in Shopify's own shadow DOM, ownership caveat noted.
- [P2] Cart drawer checkout button renders uppercase via unstyled `::part(primary-button)`, against a sentence-case site.
- [P2] Header search placeholder ("Search machines, batch problems and storage…") doesn't mention products and clips at 390px.
- [P3] Mobile cart-drawer bottom sheet has excess empty space beneath one line item.
- [P3] No-photo PDP (100cc Oxygen Absorber Refill) loses its thumbnail gallery strip, reads less finished than siblings.

## What's Working

- Honest states over manufactured trust: unstocked handling, no-photo panel, conditional reviews.
- Restrained, documented header with deliberate deviations from default patterns that hold up live.
- Per-SKU specific FAQ/highlights copy, not templated filler.

## Minor Observations

- npm run build currently fails at astro check due to untracked embedded tools/ folder at repo root (90 TS errors) — unrelated to shop code but blocks the documented build command.
- Detector's cramped-padding (96), all-caps-body (16), broken-image (6) under /shop all trace to patterns already verified as false positives earlier this engagement (list-divider padding, .kicker convention, pre-interaction lightbox placeholder).
- Two naturalWidth:0 images flagged by browser inspection were both false positives (lazy-load timing, inactive gallery frame).
