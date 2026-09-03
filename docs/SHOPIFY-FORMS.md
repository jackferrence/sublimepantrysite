# Shopify Forms

Shopify Forms is **already installed** on the store.

## Why the Astro forms stay primary

The lead form in `src/components/Newsletter.astro` remains the primary acquisition surface on SublimePantry.com, and should not be replaced with an embedded Shopify Forms widget. Reasons, in order of weight:

1. **It captures a lifecycle stage that Shopify Forms cannot act on as richly.** The `stage` select is what routes a lead into the correct email sequence. Our function maps it to a tag *and* a metafield; a Shopify Form maps to tags only.
2. **The site is statically rendered and cookieless.** The Astro form is server-rendered HTML that works with JavaScript disabled. A Shopify Forms embed is a third-party script that would render nothing without JS, on a site whose entire SEO/AEO position depends on content being present without JS.
3. **Netlify Forms is the current capture-of-record**, and the migration to Shopify is explicitly staged (see `docs/CUSTOMER-LIFECYCLE.md`). Swapping the primary form would remove the fallback before the replacement is proven.
4. **Performance and design control.** The embed adds a render-blocking third-party dependency to every article page for a form we already render for free.

Reconsider only if the Netlify → Shopify bridge proves unreliable in production, at which point a Shopify Form becomes the more robust path.

## Where Shopify Forms *is* the right tool

Shopify-native surfaces the Astro site does not control:

| Surface | Form | Tags applied |
|---|---|---|
| `shop.sublimepantry.com` (the Shopify storefront itself) | Newsletter signup | `sp-lead`, `freeze-drying`, `source-shopify-store` |
| Shopify checkout / post-purchase | Marketing opt-in at checkout — this is a Shopify checkout setting, not a Form | applied by Flow 2 |
| Back-in-stock interest while the starter kit is at 5 units | Simple email capture | `sp-lead`, `freeze-drying`, `source-shopify-store`, `interest-starter-kit` |

Note the deliberately different source tag: **`source-shopify-store`**, not `source-site`. Keeping these distinct is the only way to tell later whether the content funnel or the Shopify storefront is actually producing leads.

## Required configuration

For each form created in Shopify Admin → Apps → Forms:

- **Fields:** email (required), marketing consent checkbox (required, unchecked by default).
- **Consent:** enable the explicit marketing-consent field. Do not use a pre-checked box, and do not rely on implied consent from form submission.
- **Tags:** as tabled above. Always include `sp-lead` so every lead is countable in one segment regardless of origin.
- **Do not** apply a `stage-*` tag from a Shopify Form unless the form actually asks for the stage. An untagged lead is fine; a wrongly staged lead gets the wrong four emails.
- **Discount on signup:** leave off. The launch offer is `WELCOME10` and is managed as a Shopify discount, not as a form reward. Two competing offers would be confusing and would stack unpredictably.

## Segments to create

In Shopify Admin → Customers → Segments:

| Segment name | Definition |
|---|---|
| Pre-owner leads | `customer_tags CONTAINS 'stage-considering'` AND `customer_tags NOT CONTAINS 'starter-kit-buyer'` |
| Owner leads | `customer_tags CONTAINS 'stage-new-owner' OR customer_tags CONTAINS 'stage-active-owner'` |
| Cottage sellers | `customer_tags CONTAINS 'stage-cottage-seller'` |
| Starter-kit buyers | `customer_tags CONTAINS 'starter-kit-buyer'` |
| Site-sourced leads | `customer_tags CONTAINS 'source-site'` |
| Shopify-sourced leads | `customer_tags CONTAINS 'source-shopify-store'` |

All segments should additionally require `email_subscription_status = SUBSCRIBED` before being used as a marketing audience.
