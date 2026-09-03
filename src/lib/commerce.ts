/**
 * Sublime Pantry — commerce configuration.
 *
 * Single source of truth for the Shopify identifiers the Astro frontend needs.
 * Shopify remains the source of truth for everything mutable (price, inventory,
 * cart, orders, customers). Nothing in this file may duplicate that state —
 * it only holds identifiers and editorial copy that Shopify does not own.
 */

/** Storefront domain used by the Shopify Storefront Web Components. */
export const SHOPIFY_STORE_DOMAIN =
  'zd-store-01m146jmxxhw739y7t7y11s669-paky1ta3.myshopify.com';

/** Public Shopify domain (checkout/customer-facing). */
export const SHOPIFY_PUBLIC_DOMAIN = 'shop.sublimepantry.com';

export interface CatalogProduct {
  /** Shopify product handle — the join key for Storefront Web Components. */
  handle: string;
  /** Shopify SKU. Used by Flow conditions and fulfillment SOPs, not by the UI. */
  sku: string;
  /** Server-rendered title. Shopify stays authoritative; this keeps the card
   *  meaningful before Shopify's JS resolves, and readable without JS at all. */
  title: string;
  eyebrow: string;
  /** Server-rendered merchandising copy — never fetched at runtime. */
  note: string;
  /** Shopify CDN image. Server-rendered so a null *variant* image cannot
   *  produce a blank product card (the starter kit variant has no own image). */
  image: string;
  imageAlt: string;
  detailsHref: string | null;
  /** Static fallback shown only while Shopify's live price resolves. */
  displayPrice: string;
}

/**
 * The deliberately small launch catalog.
 *
 * Only ACTIVE, published Shopify products belong here. Draft or spec-pending
 * products must not be listed: the Storefront API will not return them, so the
 * card would hang on its loading placeholder forever.
 */
export const CATALOG: CatalogProduct[] = [
  {
    handle: 'freeze-dryer-packaging-starter-kit-100',
    sku: 'MSMBS7MIL001',
    title: 'Freeze-Drying Packaging Starter Kit — 100 Bags + Absorbers + Labels',
    eyebrow: 'Validation launch',
    note: '100 assorted 7 mil Mylar bags, 100 matched oxygen absorbers, 100 labels, and PackFreshUSA’s storage guide. One matched set, shipped free.',
    image:
      'https://cdn.shopify.com/s/files/1/0883/4875/4197/files/packfreshusa-7mil-mylar-box-set-100-pack.jpg?v=1788393303',
    imageAlt:
      'PackFreshUSA 7 mil Mylar bag, oxygen absorber, and label box set used for the Sublime Pantry freeze-drying packaging starter kit',
    detailsHref: '/shop/freeze-dryer-packaging-starter-kit',
    displayPrice: '$74.99 USD',
  },
];

export const STARTER_KIT = CATALOG[0];

/**
 * Launch promotion.
 *
 * `enabled` MUST stay false until the offer has been verified end to end
 * against the live store. The site must never advertise a code that would fail
 * at checkout.
 *
 * Verified 2026-09-03 against the live Storefront API with a real cart:
 *   WELCOME10 → applicable: true
 *   $59.99 → $54.00 (list price has since moved to $74.99)
 *   delivery options → a single "Standard" at $0.00
 *   cart total → $54.00
 *
 * Re-confirmed by real order #1001 (2026-09-03): PAID, $54.00, $0.00 shipping.
 *
 * Note on how free shipping is delivered: NOT by a shipping discount. The
 * Domestic "Standard" rate ($6.25) carries a rate condition granting $0.00 when
 * TOTAL_PRICE >= $45.00. The discounted total of $54.00 clears that threshold,
 * so both halves of the offer are real. No automatic free-shipping discount is
 * needed, and none exists.
 *
 * The $45 threshold is the dependency to watch: if the starter kit's price
 * drops below $50, or a cheaper product becomes the primary offer, the
 * post-discount total can fall under $45 and the "free shipping" half of this
 * claim silently stops being true. Re-verify before changing price.
 * At the current $74.99 list, WELCOME10 leaves $67.49 — comfortably clear.
 */
export const LAUNCH_OFFER = {
  enabled: true,
  code: 'WELCOME10',
  /** 10% off, via a Shopify code discount scoped to the starter kit. */
  percentOff: 10,
  /** Delivered by the >= $45 free-shipping rate condition, not by a discount. */
  freeShipping: true,
  headline: 'New here? Get 10% off + free shipping on your first order.',
  detail: 'Use code WELCOME10 at checkout.',
} as const;
