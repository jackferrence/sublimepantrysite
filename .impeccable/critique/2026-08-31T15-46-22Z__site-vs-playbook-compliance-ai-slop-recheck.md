---
target: site vs playbook compliance + ai-slop recheck
total_score: 17
max_score: 24
na_heuristics: 3,5,7,9
p0_count: 1
p1_count: 2
timestamp: 2026-08-31T15-46-22Z
slug: site-vs-playbook-compliance-ai-slop-recheck
---
## Design Health Score

17/24 (Good, 71%) - UI heuristics held from the previous run; this pass's real findings are strategic/compliance, not visual.

## Design Specificity / Playbook Compliance Verdict

Detector re-run: 0 findings (down from 13). Em-dash cadence fixed and confirmed natural. Side-tab border-left CSS pattern fully eliminated (verified zero border-left in stylesheet). Hub pages (guides/troubleshooting/compare) genuinely restructured, not just re-copy'd.

Launch inventory (playbook): MET - 6/6 trust pages, 3 flagship guides, 5 troubleshooting pages, 2 comparisons, 1 tool. Email welcome sequence: capture exists, no sequence built yet (expected gap).

## Priority Issues

[P0] Fabricated "Reviewed by Maria Delgado, Sublime Pantry Editorial" byline appears identically on all 10 content pages with zero bio/credentials/corroboration anywhere on the site. Violates the playbook's own editorial rule: "Never imply... professional credentials... not documented." This was introduced by the previous fix pass and needs to be undone - use the real editor's name or an honest team attribution, never an unverifiable invented name. Suggested: /impeccable clarify

[P1] Zero photography/imagery anywhere on the site (no <img> tags at all). The playbook's stated moat against AI-slop competitors is original photos/visuals/measurements; the site currently has none, undercutting its own evidentiary credibility. Suggested: /impeccable harden (once photo assets exist)

[P1] No PR-gated publishing workflow: no .github/workflows, no netlify.toml/vercel.json, no branch protection; the last fix-pass commit went straight to main. Playbook's non-negotiable: "enter production only after deterministic checks, a preview, and human approval." Netlify-vs-Vercel itself is low severity (reversible, equivalent preview capability); the missing PR/CI gate is the real gap and becomes a hard blocker before any automated publishing pipeline is added.

[P2] No structured data (JSON-LD) anywhere on the site, and no dateModified field - every article carries a single identical publish timestamp only.

## Minor Observations

- events.js already stubs the playbook's exact analytics event taxonomy (tool_use, newsletter_signup, affiliate_outbound_click), just not wired to a real provider yet - correctly inert per the playbook's "commerce/analytics adapter inactive until enabled" guidance.
- Content mix (5 troubleshooting / 3 guides / 2 comparisons / 1 tool / 0 news) roughly matches the playbook's 50/25/15/10 target at this early scale; no news content type yet, which is expected pre-launch.

## Questions to Consider

- Is "Maria Delgado" a placeholder for a real future hire, or should every byline read as a team/site attribution until a real named editor exists?
- Given the playbook's model is built around Vercel (preview-per-PR, Vercel Cron), is staying on Netlify deliberate, or worth revisiting before any publishing automation is built on top of this repo?
