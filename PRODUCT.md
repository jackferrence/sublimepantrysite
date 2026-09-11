# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Astro (static site generator), built and hosted on Netlify and served at its live canonical domain **https://www.sublimepantry.com** (confirmed 2026-09-02; `astro.config.mjs` `site`, `site.yaml` `brand.domain`, and the `sc-domain:sublimepantry.com` Search Console property all agree). `sublimepantry.netlify.app` is the build host, not the address to use in canonicals, copy, or examples. Netlify Forms handles the newsletter signup (`data-netlify="true"`).

Commerce is Shopify connected directly into the Astro frontend via the Storefront API (wired 2026-09-03) — there is no separate shop subdomain and no migration into a Shopify theme. Astro owns content, landing pages, and product pages (`/shop`, `/shop/[handle]`); Shopify owns catalog, cart, checkout, and fulfillment underneath them. Treat the shop as part of one product, not a linked-out third-party storefront.

## Users

Two overlapping audiences:

1. **Home freeze-drying enthusiasts** who want every batch to come out right (machine decisions, batch troubleshooting, storage).
2. **Cottage sellers** turning a home freeze dryer into a small, legal, profitable food business (cottage food law, testing, pricing, unit economics).

Both groups want more predictable batches, fewer failures, clearer purchasing decisions, and honest information about storage, safety, and costs.

## Product Purpose

Sublime Pantry publishes evidence-based educational content and free tools for home freeze-drying: machine-buying guidance, batch troubleshooting, storage/packaging methods, and the rules and economics of selling freeze-dried food from home. Sublime Pantry is a **pilot brand within a niche-authority-site portfolio**: it is still in audience/demand validation, and what is learned here (editorial automation, commerce integration, validation method) is expected to inform other sites in the portfolio. Newsletter growth ("The Dry Batch") is the current north-star metric, not traffic or commerce revenue.

## Positioning

Every claim is sourced (manufacturer documentation, university extension services, regulators, research papers) and dated; the site explicitly distinguishes documented fact from editorial judgment and states plainly when something hasn't been tested. Research is AI-assisted, but every page is human-reviewed before publishing and corrections are logged publicly — a stance most competing content/affiliate sites in this space do not take. The visual/editorial redesign in progress (see Brand Commitments) is explicitly positioned against Wirecutter/REI/Food52 — a "niche Wirecutter" feel, deliberately without fake urgency or countdown-timer gimmicks.

## Operating Context

- Content structure: Guides, Troubleshooting, Comparisons, a free browser-based Batch Log & Cost Tracker tool, and a Start Selling hub for cottage business rules/economics.
- The Batch Log tool stores data client-side in the browser (no account), with CSV export.
- Newsletter ("The Dry Batch") promises one drying answer, one storage/packaging finding, and one cottage-selling insight per issue — not generic "news and updates." (Cadence has been described as both weekly and biweekly across sources; confirm current cadence before stating it in new copy.)
- Cottage food law is state-specific and changes over time; the site treats this as a hard constraint requiring hedged, non-legal-advice language throughout Start Selling content.
- **Articles arrive by automation, not by hand.** A daily editorial run selects a topic from Search Console demand, assembles a sourced evidence packet, drafts, independently verifies the claims, and opens a draft pull request. It never publishes: human approval before publish is a required gate, and a run produces at most one new or substantively rewritten article. Configuration lives in `site.yaml`; the orchestrator in `scripts/editorial-controller.mjs` makes no model call itself. As of 2026-09-10 the pipeline is built and dry-run tested but not yet confirmed running unattended end-to-end in production — verify current status in `docs/LAUNCH-TODO.md` before relying on it.
- An `article-optimizer` skill is under active development to restructure finished article JSON for citation/readability before publication — structure and metadata only, explicitly forbidden from adding any fact, number, or source not already in the input.
- Consequences that bind every template and listing page: content the designer has never seen can appear at any time, so listing pages, cards, and article layouts must absorb arbitrary new articles rather than hardcode per-slug copy (a bug already fixed once on `/guides`, `/troubleshooting`, and `/compare`); elevated-risk topics — food safety, shelf life, water activity, pathogens, cottage food law, legal advice, ingestible-product safety — always render the educational notice; every article carries at least two sources with access dates.

## Capabilities and Constraints

- As of 2026-09-10, Sublime Pantry has **no affiliate relationships, sponsorships, or paid placements** — no link on the site currently earns affiliate revenue. Affiliate relationships (likely freeze dryers and packaging supplies) are expected in the future; when added, links must carry `rel="sponsored"` and be disclosed near the link, and commercial relationships must never change comparison criteria (criteria are published before products are scored).
- **The owned product is live and purchasable.** The Sublime Pantry **Freeze-Drying Packaging Starter Kit** sells directly through the site's Shopify-backed `/shop` (validation pricing $59.99; a tiered ladder — $65.99 with a digital Field Guide, $72.99 with the digital guide plus a physical packet — is the planned/tested pricing structure). Fulfillment is **manual dropship via PackFreshUSA**: an order triggers a manual SOP (place the PackFreshUSA order, then add tracking in Shopify) documented in `docs/MANUAL-FULFILLMENT.md`; there is no automatic fulfillment tagging yet. An older note describing Amazon MCF as the fulfillment target is superseded by this PackFreshUSA manual-dropship plan — do not treat Amazon fulfillment as current.
- Commerce is technically live but still in a **pre-soft-launch validation posture**, not a hardened, traffic-ready store: `docs/SOFT-LAUNCH-CHECKLIST.md` has confirmed rows (Storefront API reachable, add-to-cart, WELCOME10 discount) alongside many still-unverified rows (payment/tax configuration, fulfillment notifications, cart reliability across breakpoints). Standing pre-launch constraints: no paid acquisition, no Klaviyo/subscription automation, no theme redesign, and no expanded catalog until soft launch clears; never push to `main`, merge a PR, or email real subscribers without explicit owner approval. The soft-launch gate is one complete, real, stranger-to-fulfilled-order test pass. Treat any claim of "fully launched, safe for paid traffic" as false until that gate is confirmed cleared.
- Amazon is explicitly **not yet** in scope — the stated threshold to revisit it is roughly 50–100+ units/month of direct demand.
- That kit sits in a category the site already covers editorially (the storage-containers comparison, plus storage and packaging guidance throughout). Ownership must be disclosed prominently on every page that mentions or recommends it, per the Affiliate Disclosure policy, and the published comparison criteria must not move to favor it.
- The site does not publish fake or AI-generated reviews/testimonials (FTC-prohibited, also an internal editorial rule); prices, stock, and promo terms must never be fabricated or asserted without checking the current Shopify record.
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
- **Identity, settled September 2026:** wordmark is "sublimepantry" set in Bodoni Moda, with a crystal-dot "i" and black-italic "pantry"; an "SP" monogram is the secondary mark. Palette is the "sublimation" scheme — ink black, white/paper, ice blue `#B4D9EC`, rust `#8B4A21`. No photography for now; any imagery gap is filled with paid premium stock the owner adds to the repo directly — never invented or AI-generated as if it were real product photography.
- **Locked type system:** Bodoni Moda (display), Literata (body), Source Sans 3 (UI/tables), Archivo (labels). Dark mode is driven by `prefers-color-scheme` only (no manual toggle). Design tokens are authored as DTCG files compiled to `src/styles/tokens.css`. These are confirmed, binding constraints on any future visual work, not a full design system — a UI overhaul is in progress and DESIGN.md, when written, is the authority for the rest of the system.

## Evidence on Hand

- Live site content across Guides, Troubleshooting, Comparisons, and policy pages (Editorial Standards, Review Methodology, Affiliate Disclosure, Corrections, Privacy), plus a live commerce path (`/shop`, `/shop/[handle]`) for the Freeze-Drying Packaging Starter Kit.
- No testimonials, case studies, or customer evidence exist or should be fabricated — the site's own editorial standards explicitly forbid fake/AI-generated reviews or testimonials.
- No affiliate revenue exists yet (see Capabilities and Constraints) — do not write or design as if affiliate income is live.
- `site.yaml` is the machine-readable source of truth for brand voice, banned language, elevated-risk topics, and the editorial rules the automation enforces. It and this file must agree; when they drift, `site.yaml` is what production actually obeys.
- `docs/SOFT-LAUNCH-CHECKLIST.md`, `docs/COMMERCE-ARCHITECTURE.md`, and `docs/MANUAL-FULFILLMENT.md` are the current sources of truth for commerce state, architecture, and fulfillment SOP respectively — check them before asserting a specific commerce fact (price, stock, checkout behavior) is currently true.
- One authoritative commerce record (exact kit name, contents, price, shipping/handling, supplier-fulfillment wording, returns/refunds, promo terms) is a known open gap as of 2026-09-10 — some of those facts have conflicted across the site. Do not treat any single page's wording as settled without cross-checking.

## Product Principles

1. Evidence before assertion — every claim traces to a dated primary source, editorial judgment, or explicit "we haven't tested this."
2. The reader is a capable operator, not a lead to be converted — copy and design should reduce their uncertainty, not manufacture urgency.
3. Disclosure precedes monetization — the owned packaging/supply kit and any future affiliate links must be disclosed prominently wherever they appear, ahead of and alongside the commercial content, and the shop must never quietly rewrite editorial judgment.
4. Newsletter growth is the current north-star metric, not raw traffic or commerce revenue.
5. Cottage food law and food-safety content is a hard boundary: always hedge to "confirm with your local authority," never presented as legal advice.
6. Validate before scaling — no paid acquisition, expanded catalog, or new automation channel (Klaviyo, etc.) until the soft-launch gate (one real, complete stranger-to-fulfilled-order pass) is confirmed cleared, and no destructive/irreversible action (push to `main`, merge a PR, email real subscribers) without explicit owner approval.

## Accessibility & Inclusion

A prior commit ("fix red-on-paragraph a11y violation") shows an active a11y baseline is expected; no additional standard beyond WCAG-conscious defaults has been specified.
