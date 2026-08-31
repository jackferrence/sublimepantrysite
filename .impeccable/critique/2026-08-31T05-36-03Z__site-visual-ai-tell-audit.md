---
target: site (visual AI-tell audit)
total_score: 17
max_score: 24
na_heuristics: 3,5,7,9
p0_count: 0
p1_count: 1
timestamp: 2026-08-31T05-36-03Z
slug: site-visual-ai-tell-audit
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Batch Log tool gives live stat feedback; static content pages don't need much here |
| 2 | Match System / Real World | 3 | Plain, domain-fluent language throughout; the em-dash cadence is the one artificial note |
| 3 | User Control and Freedom | n/a | Not assessed — Batch Log edit/delete flows weren't stress-tested |
| 4 | Consistency and Standards | 3 | Strong system discipline (single accent, one radius token) — but this is what makes hub pages visually interchangeable |
| 5 | Error Prevention | n/a | Not assessed — Batch Log form validation not exercised |
| 6 | Recognition Rather Than Recall | 3 | Text-labeled nav throughout, no icon-only affordances |
| 7 | Flexibility and Efficiency | n/a | Read-mode content site; not applicable |
| 8 | Aesthetic and Minimalist Design | 3 | Restrained palette and shadow/gradient usage — a real strength |
| 9 | Error Recovery | n/a | No error states surfaced during this pass |
| 10 | Help and Documentation | 2 | The site is documentation, but has no internal search/FAQ |
| **Total** | | **17/24** | **Good (71%)** |

## Design Specificity Verdict

Specific, not generic, at the design-system level (hand-drawn SVG brand mark, no stock imagery/gradients/glassmorphism/emoji, domain-specific content). Detector (degraded/regex mode) found em-dash-overuse (12 files, corroborated by both assessments with matching counts) and one `side-tab` (amber left-border callout) hit flagged as "most recognizable AI-UI tell" but only present on 2/8 sampled pages — likely overstated severity. Browser evidence showed guides.html/troubleshooting.html/compare.html/start-selling.html share one identical hero->card-grid skeleton.

## Priority Issues

**[P1] Em-dash-heavy prose rhythm across every long-form page** — double-em-dash parenthetical asides (9-24 per page, 12 files) are a recognizable LLM fingerprint, undercutting the site's "human-reviewed, not AI-slop" positioning. Fix: copy edit to break up asides. Suggested: /impeccable clarify

**[P2] Every article shares identical byline ("Sublime Pantry Editorial") and publish date (Aug 31 2026)** — reads like a bulk/AI batch content dump. Fix: named human attribution and/or staggered dates going forward. Suggested: /impeccable clarify

**[P2] Whitespace-glue bug next to inline links on about.html** — text runs directly into anchor tags ("Oureditorial standards", "covered?Get in touch"), a markdown-pipeline artifact undercutting the "human-reviewed" claim on the trust page. Fix: add missing spaces. Suggested: /impeccable audit

**[P2] Batch Log data table clips on mobile (390px) with no scroll affordance** — core tool breaks on the device class its audience likely uses. Fix: wrap table in overflow-x:auto with visible scroll cue. Suggested: /impeccable adapt

**[P3] Amber left-border "side-tab" callout flagged as top AI-UI tell despite only 2/8-page prevalence** — decide once whether to keep/diversify or replace before it spreads. Suggested: /impeccable polish

## Persona Red Flags

**Riley (Stress Tester):** Cross-referencing hub pages back-to-back reveals identical kicker->H1->subhead->card-grid skeleton across four pages.

**The Skeptical Evidence-Checker (project-specific):** Primed by the site's own "evidence-first, not AI-slop" claim, this reader would notice the em-dash rhythm plus identical byline/date across articles and conclude the "human-reviewed" claim is weaker than stated.

## Minor Observations

- Rule-of-three phrasing and a few "not just X" headline echoes recur across guides — mostly load-bearing, low severity.
- Detector ran in degraded/regex-fallback mode (missing htmlparser2/css-select/css-tree/domutils) — findings are an undercount.

## Questions to Consider

- If the hub-page skeleton is a deliberate system, is there room for one page to break the pattern without losing consistency?
- Does the identical newsletter CTA on four pages help or dilute the newsletter-growth metric?
