# Sublime Pantry Master Execution Plan

Updated: 2026-09-02

## North star
Build Sublime Pantry into a trustworthy freeze-drying media + commerce system that turns search/AI/social traffic into owned audience, first purchases, replenishment revenue, and disclosed affiliate revenue without sacrificing editorial credibility.

## Overarching goals

### G1 — Make the purchase path reliable
A visitor can move from content to a relevant product, add it to cart, complete Shopify checkout, receive accurate fulfillment communication, and return to the Sublime Pantry experience without confusing seams.

### G2 — Build an owned audience
Every useful acquisition surface should give a visitor a reason to join the list. Capture explicit consent plus lifecycle stage/source so future email is relevant rather than generic.

### G3 — Turn content into commercial infrastructure
High-intent guides, comparisons, troubleshooting pages, calculators, and lead magnets should answer the query first and then offer the logical next step: checklist, product, replenishment item, or disclosed affiliate recommendation.

### G4 — Create repeat revenue
The starter kit is the entry purchase. Consumables become replenishment products and, after real purchase data exists, reminders/subscriptions can be timed around observed usage rather than invented assumptions.

### G5 — Build a measurable funnel
Track the path from landing page through lead capture, product view, add-to-cart, checkout, purchase, and repeat purchase. Optimize from actual conversion data.

### G6 — Protect trust and quality
No fake reviews, fabricated testing, invented scarcity, inaccurate safety claims, hidden affiliate relationships, or generic mass-generated content. Product data stays in Shopify; editorial evidence stays in the site repository.

## Phase 1 — Launch integrity
- [x] Establish Shopify as commerce source of truth.
- [x] Connect custom Astro storefront to Shopify cart/checkout.
- [x] Activate the PackFreshUSA validation starter kit.
- [x] Store manual sourcing/fulfillment metadata in Shopify.
- [x] Add manual fulfillment SOP.
- [x] Build dedicated starter-kit sales page.
- [x] Add contextual starter-kit CTAs to high-intent articles.
- [x] Build freeze-drying starter checklist lead magnet.
- [x] Segment newsletter capture by lifecycle stage and source path.
- [ ] Verify production Netlify deploy of the merged conversion funnel.
- [ ] Browser-test product rendering, add-to-cart, cart modal, checkout handoff, mobile layout, and form submission.
- [ ] Place a controlled test order before paid traffic.
- [ ] Confirm customer notification and manual PackFresh fulfillment workflow from a real Shopify order.
- [ ] Confirm shipping/tax presentation does not create unexpected validation losses.

## Phase 2 — Email lifecycle
- [ ] Choose lifecycle system: Shopify-native or dedicated ESP.
- [ ] Document consent/source-of-truth migration from Netlify Forms.
- [ ] Create master customer/subscriber identity model.
- [ ] Map segments: considering a freeze dryer, new owner, active owner, cottage seller, packaging buyer, customer.
- [ ] Build welcome sequence for pre-owners.
- [ ] Build welcome sequence for owners.
- [ ] Build post-purchase starter-kit onboarding.
- [ ] Build replenishment reminder flow based on observed order timing.
- [ ] Connect The Dry Batch newsletter to the same consented audience.
- [ ] Add unsubscribe/preferences handling and suppression rules.

## Phase 3 — Analytics and conversion measurement
- [ ] Define canonical funnel event names.
- [ ] Track article/landing-page CTA clicks.
- [ ] Track checklist form starts/submits.
- [ ] Track product views and add-to-cart.
- [ ] Track checkout handoff.
- [ ] Reconcile Shopify purchases with acquisition source where technically supported.
- [ ] Build weekly KPI view: sessions, organic clicks, email opt-in rate, product-view rate, ATC rate, checkout rate, purchase rate, AOV, repeat purchase rate, source cost, contribution margin.
- [ ] Establish a weekly conversion review cadence.

## Phase 4 — Search + AEO content engine
- [ ] Build topic map around pre-purchase, ownership, troubleshooting, packaging/storage, economics, and cottage selling.
- [ ] Prioritize commercial-intent queries before broad informational volume.
- [ ] Create/strengthen: Is a Freeze Dryer Worth It?
- [ ] Create/strengthen: Freeze Dryer Buying Guide.
- [ ] Create/strengthen: Freeze Drying vs Dehydrating.
- [ ] Create/strengthen: Mylar Bags for Freeze-Dried Food.
- [ ] Create/strengthen: Oxygen Absorbers for Freeze-Dried Food.
- [ ] Create/strengthen: Freeze-Dried Food Shelf Life.
- [ ] Build food-specific pages only when they contain useful original structure/data.
- [ ] Improve internal linking from informational pages to commercial next steps.
- [ ] Audit structured data/canonicals/sitemap/indexability.
- [ ] Repair editorial automation failures before scaling automated research/drafting.

## Phase 5 — Tool moat
- [ ] Build oxygen absorber calculator with sourced assumptions and product CTA.
- [ ] Build freeze-dryer ownership cost calculator.
- [ ] Improve Batch Log with optional commerce/replenishment signals without compromising utility.
- [ ] Build batch planner if usage data shows demand.
- [ ] Create printable/reference assets that earn links and email signups.

## Phase 6 — Catalog + recurring revenue
- [ ] Validate starter-kit demand with real orders before expanding aggressively.
- [ ] Resolve gallon bag quantity/spec mismatch before publication.
- [ ] Validate 300cc oxygen absorber refill product.
- [ ] Define quart refill positioning and replenishment use case.
- [ ] Add restock bundle only when components/specs are verified.
- [ ] Track days-to-reorder by SKU/customer cohort.
- [ ] Test replenishment reminders.
- [ ] Evaluate subscription only after reorder behavior supports it.
- [ ] Move hero SKU from retail manual dropship to supplier agreement/bulk inventory when validation threshold is met.
- [ ] Introduce branded packaging/inserts after supplier/legal economics are resolved.

## Phase 7 — Affiliate revenue
- [ ] Identify high-ticket freeze-dryer/equipment programs with acceptable terms.
- [ ] Obtain relationships before adding affiliate claims/links.
- [ ] Create clear affiliate disclosure treatment.
- [ ] Build machine comparison methodology before publishing rankings.
- [ ] Add affiliate links only where they are a genuine next step for the reader.
- [ ] Track affiliate click/revenue separately from owned-product conversion.

## Phase 8 — Paid acquisition
- [ ] Do not scale ads until production funnel and measurement are verified.
- [ ] Build dedicated ad landing page variants by intent.
- [ ] Start with tightly constrained validation budget.
- [ ] Separate lead-gen economics from direct-purchase economics.
- [ ] Retarget consented/eligible audiences where platform rules permit.
- [ ] Kill campaigns that cannot show a plausible path to contribution margin/LTV.

## Phase 9 — Operations and AI administration
- [ ] Add order tagging/notification for PackFresh manual fulfillment when supported.
- [ ] Build exception checklist for supplier price, availability, shipping, returns, and customer complaints.
- [ ] Create daily automated health checks for broken links/build failures/product availability only where reliable data access exists.
- [ ] Create weekly executive brief: traffic, rankings, subscribers, sales, funnel conversion, content opportunities, inventory/sourcing issues, and next actions.
- [ ] Require human review for elevated-risk editorial content and consequential live-store changes.

## Current critical path
1. Production verification and controlled test order.
2. Email lifecycle platform + consented data flow.
3. Funnel analytics.
4. High-intent content/internal linking.
5. Replenishment catalog + repeat-purchase measurement.
6. Affiliate monetization.
7. Paid acquisition.

## Launch gates before meaningful paid traffic
- Production shop and starter-kit pages load correctly on mobile and desktop.
- Shopify product renders with current price/availability.
- Add-to-cart and checkout work end to end.
- One controlled order has completed fulfillment successfully.
- Email opt-in submits and consent/source fields are retained.
- Core funnel events are measurable.
- Shipping, tax, payment fees, supplier cost, and refund exposure are understood.
- No draft/spec-pending products appear as purchasable merchandise.

## Operating principle
Do not optimize for number of pages or number of products. Optimize for trustworthy qualified traffic, useful owned audience growth, conversion, repeat purchase, and contribution margin.