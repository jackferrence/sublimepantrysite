# Sublime Pantry Commerce Architecture

## One brand, two systems

Sublime Pantry is one customer-facing business at `sublimepantry.com`.

### sublimepantry.com — discovery, education, and conversion
The Astro/Netlify application in this repository owns:
- homepage and brand presentation
- guides, comparisons, troubleshooting, and SEO/AEO content
- free tools such as the Batch Log
- editorial standards and disclosures
- merchandising/landing pages that introduce Shopify products
- newsletter acquisition surfaces
- analytics instrumentation before checkout

### Shopify — commerce system of record
The connected Sublime Pantry Shopify store owns:
- products and variants
- SKUs and inventory
- prices
- collections
- discounts
- cart and checkout
- orders and customers
- fulfillment state
- post-purchase commerce data

Do not maintain a second hand-authored product catalog in Astro. Product price, availability, variants, and inventory should originate in Shopify.

## Domain model

- `www.sublimepantry.com` — canonical public site and discovery layer
- `shop.sublimepantry.com` — Shopify commerce domain / checkout infrastructure

The customer should normally discover and shop from the main Sublime Pantry experience. Shopify should feel like the transaction engine, not a separate competing website.

## Initial commercial focus

Freeze-drying is the commercial wedge. The first funnel is:

1. Search / AI answer / social / referral
2. Evidence-based Sublime Pantry guide, comparison, or tool
3. Email capture or relevant product CTA
4. Freeze-Dryer Packaging Starter Kit
5. Shopify cart + checkout
6. Education and replenishment messaging
7. Repeat purchase of bags / oxygen absorbers / packaging supplies
8. Relevant high-ticket affiliate recommendations when relationships are actually active and disclosed

## Catalog rules

Launch catalog should stay intentionally narrow.

### Hero
- Freeze-Dryer Packaging Starter Kit

### Replenishment
- Quart Mylar Bags + Oxygen Absorbers
- Gallon Mylar Bags + Oxygen Absorbers (only after source quantity/spec mismatch is resolved)
- 300cc Oxygen Absorbers

### Expansion
- Candy packaging
- Desiccants / labels only after specifications and sample QC are complete

Unrelated legacy dropshipping products should remain archived and should not appear in Sublime Pantry merchandising or navigation.

## Shopify collection hierarchy

Customer-facing collection hierarchy should be simple:

- Shop All
- Starter Kits
- Bags & Oxygen Absorbers
- Oxygen Absorbers
- Candy Packaging (secondary)

Avoid overlapping collections unless they serve a distinct navigation, landing-page, or merchandising purpose.

## Site information architecture

Primary navigation target:

- Shop
- Guides
- Troubleshooting
- Comparisons
- Tools
- Start Selling
- About

Commerce pages should live in the existing Sublime Pantry design system. Editorial pages may embed contextual product cards, but commercial relationships and owned-product conflicts must follow the site's disclosure policy.

## Email architecture

The current Netlify newsletter form is an acquisition endpoint, not the long-term customer lifecycle system.

Target state:
- one master subscriber/customer identity centered on Shopify customer data
- source/interest segmentation (owner, pre-owner, cottage seller, packaging buyer)
- welcome education sequence
- abandoned checkout/cart where supported
- post-purchase onboarding
- replenishment reminders for consumables
- newsletter (`The Dry Batch`)

Do not run disconnected mailing lists indefinitely. Before migrating the current form, choose the lifecycle platform (Shopify-native messaging/automation or a dedicated ESP) and document consent/data migration.

## Source-of-truth rules

| Data | Source of truth |
| --- | --- |
| Editorial content | GitHub/Astro |
| Product title/price/SKU/status | Shopify |
| Inventory | Shopify |
| Collections | Shopify |
| Cart/checkout | Shopify |
| Orders/customers | Shopify |
| Editorial disclosures | GitHub/Astro |
| Site navigation | GitHub/Astro |
| Analytics events | Site + Shopify analytics, with documented event names |
| Newsletter/lifecycle consent | Selected email platform + Shopify customer record |

## Change discipline

1. Never hard-code product price or inventory into editorial content when it can be rendered from Shopify.
2. Never publish a Shopify draft product merely to make a page look complete.
3. Keep incomplete/spec-pending products as drafts.
4. Keep unrelated legacy products archived.
5. Product changes happen in Shopify; editorial claims and merchandising context happen in GitHub.
6. Changes to checkout/order/customer behavior should not be implemented as custom Astro logic when Shopify already owns that responsibility.

## Near-term implementation order

1. Clean Shopify navigation/collections and retain the narrow freeze-drying catalog.
2. Add a first-class `Shop` route and navigation item to Astro.
3. Connect the Astro shop experience to Shopify using Shopify's supported custom-storefront tooling.
4. Add contextual starter-kit CTAs to high-intent storage/batch content.
5. Replace the disconnected Netlify-only email path with the chosen lifecycle/segmentation architecture.
6. Instrument the funnel: content view → product view → add to cart → checkout → purchase → repeat purchase.
7. Only then expand paid acquisition and catalog breadth.
