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
    note: '100 assorted 7 mil Mylar bags, 100 matched oxygen absorbers, 100 labels, and PackFreshUSA’s storage guide. Sold at current retail source cost while we validate demand.',
    image:
      'https://cdn.shopify.com/s/files/1/0883/4875/4197/files/packfreshusa-7mil-mylar-box-set-100-pack.jpg?v=1788393303',
    imageAlt:
      'PackFreshUSA 7 mil Mylar bag, oxygen absorber, and label box set used for the Sublime Pantry freeze-drying packaging starter kit',
    detailsHref: '/shop/freeze-dryer-packaging-starter-kit',
    displayPrice: '$59.99 USD',
  },
];

export const STARTER_KIT = CATALOG[0];

/**
 * Launch promotion.
 *
 * `enabled` MUST stay false until both discounts exist and have been verified
 * in Shopify Admin (see docs/SHOPIFY-ADMIN-SETUP.md). The site must never
 * advertise a code that would fail at checkout.
 *
 * Verified in Shopify Admin on: (not yet — no discounts exist on the store)
 */
export const LAUNCH_OFFER = {
  enabled: false,
  code: 'WELCOME10',
  /** Order discount: 10% off. Configured as a code discount in Shopify. */
  percentOff: 10,
  /** Shipping benefit: a *separate* automatic free-shipping discount.
   *  One Shopify discount object cannot grant both, so these are two objects
   *  configured to combine. */
  freeShipping: true,
  headline: 'New here? Get 10% off + free shipping on your first order.',
  detail: 'Use code WELCOME10 at checkout.',
} as const;
