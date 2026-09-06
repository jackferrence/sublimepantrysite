# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Astro (static site generator), built and hosted on Netlify and served at its live canonical domain **https://www.sublimepantry.com** (confirmed 2026-09-02; `astro.config.mjs` `site`, `site.yaml` `brand.domain`, and the `sc-domain:sublimepantry.com` Search Console property all agree). `sublimepantry.netlify.app` is the build host, not the address to use in canonicals, copy, or examples. Netlify Forms handles the newsletter signup (`data-netlify="true"`). Commerce will run on a separate Shopify store at **shop.sublimepantry.com** (see Capabilities and Constraints).

## Users

Two overlapping audiences:

1. **Home freeze-drying enthusiasts** who want every batch to come out right (machine decisions, batch troubleshooting, storage).
2. **Cottage sellers** turning a home freeze dryer into a small, legal, profitable food business (cottage food law, testing, pricing, unit economics).

Both groups want more predictable batches, fewer failures, clearer purchasing decisions, and honest information about storage, safety, and costs.

## Product Purpose

Sublime Pantry publishes evidence-based educational content and free tools for home freeze-drying: machine-buying guidance, batch troubleshooting, storage/packaging methods, and the rules and economics of selling freeze-dried food from home. Success today is primarily measured by newsletter growth ("The Dry Batch") rather than traffic or affiliate revenue alone.

## Positioning

Every claim is sourced (manufacturer documentation, university extension services, regulators, research papers) and dated; the site explicitly distinguishes documented fact from editorial judgment and states plainly when something hasn't been tested. Research is AI-assisted, but every page is human-reviewed before publishing and corrections are logged publicly — a stance most competing content/affiliate sites in this space do not take.

## Operating Context

- Content structure: Guides, Troubleshooting, Comparisons, a free browser-based Batch Log & Cost Tracker tool, and a Start Selling hub for cottage business rules/economics.
- The Batch Log tool stores data client-side in the browser (no account), with CSV export.
- Newsletter ("The Dry Batch") is weekly, promising one drying answer, one storage/packaging finding, and one cottage-selling insight per issue — not generic "news and updates."
- Cottage food law is state-specific and changes over time; the site treats this as a hard constraint requiring hedged, non-legal-advice language throughout Start Selling content.
- **Articles arrive by automation, not by hand.** A daily editorial run selects a topic from Search Console demand, assembles a sourced evidence packet, drafts, independently verifies the claims, and opens a draft pull request. It never publishes: human approval before publish is a required gate, and a run produces at most one new or substantively rewritten article. Configuration lives in `site.yaml`; the orchestrator in `scripts/editorial-controller.mjs` makes no model call itself.
- Consequences that bind every template and listing page: content the designer has never seen can appear at any time, so listing pages, cards, and article layouts must absorb arbitrary new articles rather than hardcode per-slug copy (a bug already fixed once on `/guides`, `/troubleshooting`, and `/compare`); elevated-risk topics — food safety, shelf life, water activity, pathogens, cottage food law, legal advice, ingestible-product safety — always render the educational notice; every article carries at least two sources with access dates.
- The *mechanism* of that daily run is an open decision as of 2026-09-02: it currently runs as GitHub Actions workflows (`.github/workflows/daily-editorial.yml`, plus a watchdog) on Workload Identity Federation, and the intent is to restructure it into a single Claude Code daily scheduled task. The editorial constraints above are product truth and survive that move; the workflow files, WIF setup, and artifact plumbing are implementation and do not.

## Capabilities and Constraints

- As of 2026-09-02, Sublime Pantry still has **no affiliate relationships, sponsorships, or paid placements** — no link on the site currently earns revenue. Affiliate relationships (likely freeze dryers and packaging supplies) are expected in the future; when added, links must carry `rel="sponsored"` and be disclosed near the link, and commercial relationships must never change comparison criteria (criteria are published before products are scored).
- **An owned product is ready but not yet live.** A Sublime Pantry **packaging/supply kit** is finished and staged for sale, not purchasable as of 2026-09-02. It will sell through a Shopify store at **shop.sublimepantry.com**, and the stated goal is for that store to be as tightly integrated with the editorial site as possible — treat the shop as part of one product, not a linked-out third-party storefront, and design the seam accordingly.
- That kit sits in a category the site already covers editorially (the storage-containers comparison, plus storage and packaging guidance throughout). Ownership must therefore be disclosed prominently on every page that mentions or recommends it, per the Affiliate Disclosure policy, and the published comparison criteria must not move to favor it. This obligation goes live the moment the product is purchasable; until then it is imminent, not current, and copy must not describe the kit as available.
- The site does not publish fake or AI-generated reviews/testimonials (FTC-prohibited, also an internal editorial rule).
- Editorial rules future content must respect: no invented hands-on experience, no shelf-life guarantees, no implying freeze-drying makes unsafe food safe, no presenting state law summaries as legal advice, no unsupported superlatives.

## Brand Commitments

- **Name origin:** "Sublime Pantry" comes from sublimation, the physical process at the heart of freeze-drying (ice → vapor without becoming liquid) — the "no soggy middle" writing philosophy is a deliberate pun on this.
- **Voice:** sounds like a knowledgeable, careful freeze-drying operator helping another person make a better decision — not a lifestyle marketer, generic blogger, or AI-content site. Practical, intelligent, calm, candid, slightly editorial. "An experienced operator explaining something at a clean workbench — with evidence nearby and nothing to prove."
- **Copy principles:**
  - Lead with the reader's immediate problem/decision, then why it happens, what to do, how to verify the result.
  - Concrete, operator language ("your batch," "before you store it," "compare these specifications," "check this before adding more dry time").
  - Put the useful answer near the top; don't bury it under a long intro.
  - The reader is the capable operator; Sublime Pantry is the guide providing method, evidence, and tools.
  - Measured confidence over hype; never exaggerate certainty, safety, shelf life, profitability, or legal compliance; never imply a product was personally tested when it wasn't.
  - Comparisons help readers decide against declared criteria rather than manufacturing an artificial winner.
  - Distinguish manufacturer claims vs. university/regulatory guidance vs. editorial analysis vs. Sublime Pantry's own testing.
  - For elevated-risk topics (food safety, legal compliance): explain the limitation without fear-mongering, give a clear next verification step.
  - Every page has one primary next action fitting reader intent (Batch Log, relevant guide, comparison, resource download, or newsletter).
  - Commercial copy sells better decisions/reduced uncertainty before selling a product; recommendations should feel like the logical result of evidence, not marketing.
  - **Banned language:** "unlock," "revolutionize," "game-changing," "ultimate," "elevate your journey," "delve into," "whether you're a beginner or an expert," and unsupported superlatives like "best," "perfect," "guaranteed."

## Evidence on Hand

- Live site content across Guides (batch workflow, cottage economics, which-freeze-dryer), Troubleshooting (batch-not-dry, chewy-candy, rehydration-problems, storage-failure, vacuum-error), Comparisons (home-freeze-dryers, storage-containers), and policy pages (Editorial Standards, Review Methodology, Affiliate Disclosure, Corrections, Privacy).
- No testimonials, case studies, or customer evidence exist or should be fabricated — the site's own editorial standards explicitly forbid fake/AI-generated reviews or testimonials.
- No affiliate revenue exists yet (see Capabilities and Constraints) — do not write or design as if affiliate income is live.
- `site.yaml` is the machine-readable source of truth for brand voice, banned language, elevated-risk topics, and the editorial rules the automation enforces. It and this file must agree; when they drift, `site.yaml` is what production actually obeys.
- The packaging/supply kit exists as a real product but has no live storefront, pricing page, photography, or reviews on this site yet — none of those may be invented ahead of launch.

## Product Principles

1. Evidence before assertion — every claim traces to a dated primary source, editorial judgment, or explicit "we haven't tested this."
2. The reader is a capable operator, not a lead to be converted — copy and design should reduce their uncertainty, not manufacture urgency.
3. Disclosure precedes monetization — affiliate links and the owned packaging/supply kit must be disclosed prominently wherever they appear, ahead of and alongside the commercial content, and the shop must never quietly rewrite editorial judgment.
4. Newsletter growth is the current north-star metric, not raw traffic or (yet-nonexistent) affiliate revenue.
5. Cottage food law and food-safety content is a hard boundary: always hedge to "confirm with your local authority," never presented as legal advice.

## Accessibility & Inclusion

A prior commit ("fix red-on-paragraph a11y violation") shows an active a11y baseline is expected; no additional standard beyond WCAG-conscious defaults has been specified.
