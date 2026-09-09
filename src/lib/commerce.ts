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

/** A product photograph, with its provenance stated. */
export interface ProductImage {
  /** Asset-library id, when the photograph is catalogued in src/lib/assets.ts.
   *  Preferred over a bare `src`: the library records the restrictions, and
   *  tests/assets.test.mjs fails the build if a `not-product-imagery` asset is
   *  named here. Shopify CDN URLs have no entry and keep using `src` alone. */
  assetId?: string;
  src: string;
  alt: string;
  /** What the frame shows, used for the thumbnail's accessible name. */
  kind: 'studio' | 'in-use' | 'contents' | 'packaging';
  /** 'manufacturer' images carry a visible "Photo: manufacturer" caption. */
  source: 'own' | 'manufacturer';
}

export type ProductCategory = 'Packaging' | 'Sealing' | 'Storage';

export interface CatalogProduct {
  /** Shopify product handle — the join key for Storefront Web Components. */
  handle: string;
  /** Shopify SKU. Used by Flow conditions and fulfillment SOPs, not by the UI. */
  sku: string;
  /** Server-rendered title, and it must be Shopify's title verbatim.
   *
   *  U04: it was not. The page said "Freeze-Drying Packaging Starter Kit" while
   *  the cart and the checkout said "Reserve Starter Kit — 100 Mylar Bags +
   *  Absorbers + Labels", because that is what the product was called in
   *  Shopify. A buyer read one name on the page and a different one at the
   *  moment they paid. Shopify owns the name; this field copies it.
   *
   *  It drifted again within a day: the product was renamed in Shopify on
   *  2026-09-08, hours after the first reconciliation. That is the argument for
   *  the field rather than against it — one string to change, and a test that
   *  fails when it is stale. The test hard-codes Shopify's title on purpose, so
   *  that it cannot pass by reading the same constant the pages read.
   *
   *  This keeps the card meaningful before Shopify's JS resolves, and readable
   *  without JS at all. */
  title: string;
  /** The name to use as a heading or on a button, where the full merchandising
   *  title is too long to read. The same product, shortened — never a second
   *  name for it. */
  shortTitle: string;
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
  /** Shop grouping. Groups with no products are not rendered. */
  category: ProductCategory;
  /** Gallery, most representative first. Falls back to `image` when empty. */
  images: ProductImage[];
}

/** Shop section order. Only groups with products in them are rendered. */
export const CATEGORY_ORDER: ProductCategory[] = ['Packaging', 'Sealing', 'Storage'];

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
    title: 'Freeze-Drying Packaging Starter Kit — 100 Bags, Absorbers & Labels',
    shortTitle: 'Freeze-Drying Packaging Starter Kit',
    // The eyebrow said "Validation launch", which described our business stage
    // rather than the product, on every card that showed the kit. Section 8.4
    // of the audit: no roadmap, no staged-product descriptions. Where the kit
    // ships from is a fact a buyer needs and it is still stated, on the product
    // page and in the shipping policy, next to the terms it affects.
    eyebrow: 'Freeze-drying packaging',
    note: '100 assorted 7 mil Mylar bags, 100 matched oxygen absorbers, 100 labels, and PackFreshUSA’s storage guide. One matched set.',
    image:
      'https://cdn.shopify.com/s/files/1/0883/4875/4197/files/packfreshusa-7mil-mylar-box-set-100-pack.jpg?v=1788393303',
    imageAlt:
      'PackFreshUSA 7 mil Mylar bag, oxygen absorber, and label box set used for the Sublime Pantry Freeze-Drying Packaging Starter Kit',
    detailsHref: '/shop/freeze-dryer-packaging-starter-kit',
    displayPrice: '$74.99 USD',
    category: 'Packaging',
    images: [
      {
        src: 'https://cdn.shopify.com/s/files/1/0883/4875/4197/files/packfreshusa-7mil-mylar-box-set-100-pack.jpg?v=1788393303',
        alt:
          'PackFreshUSA 7 mil Mylar bag, oxygen absorber, and label box set used for the Sublime Pantry Freeze-Drying Packaging Starter Kit',
        kind: 'studio',
        source: 'manufacturer',
      },
    ],
  },
];

/**
 * The ownership disclosure, written once.
 *
 * PRODUCT.md makes this obligation live, not imminent: every surface that
 * mentions or recommends a product we sell discloses that we sell it, beside
 * the recommendation rather than only on the disclosure page. Articles got this
 * through ToolsMentioned and the product page hard-coded it, but the homepage,
 * the checklist page and the shop cards showed our price with no disclosure at
 * all. Three surfaces, one missing string, and no page-level review would have
 * caught it — which is why it is a constant and an asserted invariant now.
 */
/**
 * The date the no-affiliate statement was last checked true.
 *
 * It was written in two places and they had drifted: /affiliate-disclosure said
 * September 8, /about said September 3. A dated claim about our own commercial
 * relationships is exactly the kind that has to be right, and the page that owns
 * the claim is the affiliate disclosure — so its date is the one, and /about
 * renders it rather than keeping a copy.
 */
export const AFFILIATE_REVIEWED = 'September 8, 2026';

export const OWNERSHIP_LABEL = 'Sold by Sublime Pantry';

/** Eyebrow for a card showing one of our own products. */
export function ownedEyebrow(product: { eyebrow?: string }): string {
  return product.eyebrow ? `${OWNERSHIP_LABEL} · ${product.eyebrow}` : OWNERSHIP_LABEL;
}

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
/**
 * The shipping rule, stated once.
 *
 * Verified against the live store on 2026-09-08 (`deliveryProfiles`, default
 * "General profile"): a Domestic/US zone with `Standard` at $6.25 and a second
 * `Standard` at $0.00 conditioned on `TOTAL_PRICE >= $45.00`. There is no
 * universal free-shipping rate, and site copy must not imply one — every
 * surface that mentions shipping renders from these fields.
 */
export const SHIPPING = {
  freeThreshold: 45,
  flatRate: 6.25,
  /** The one sentence. Used verbatim wherever the rule is stated in full. */
  rule: 'Free US shipping on orders of $45 or more; $6.25 below that. United States only.',
  /** For surfaces beside the kit's own price, where the threshold is cleared. */
  kitNote: 'Ships free in the US — the kit clears the $45 free-shipping threshold, discount included.',
  /** For catalog cards and the cart, where the order total is not yet known. */
  shortNote: 'Free US shipping over $45 · US only',
} as const;

export const LAUNCH_OFFER = {
  enabled: true,
  code: 'WELCOME10',
  /** 10% off, via a Shopify code discount scoped to the starter kit. */
  percentOff: 10,
  /** Delivered by the >= $45 free-shipping rate condition, not by a discount. */
  freeShipping: true,
  headline: 'New here? Take 10% off your first order with WELCOME10.',
  detail: 'Applied at checkout. Orders of $45 or more ship free in the US.',
} as const;
