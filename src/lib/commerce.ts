import { productMedia } from './product-media.ts';
/**
 * Sublime Pantry — commerce configuration.
 *
 * Single source of truth for the Shopify identifiers the Astro frontend needs.
 * Shopify remains the source of truth for everything mutable (price, inventory,
 * cart, orders, customers). Nothing in this file may duplicate that state —
 * it only holds identifiers and editorial copy that Shopify does not own.
 */

/** Storefront domain used by the Shopify Storefront Web Components.
 *
 *  Not the `SHOPIFY_SHOP_DOMAIN` environment variable, despite the near-identical
 *  name. This is a public build-time constant compiled into the page for the
 *  storefront components; that is a server-side credential read by the Netlify
 *  functions and scripts. They happen to hold the same string today and are
 *  different namespaces with different trust levels — do not fold one into the
 *  other, and do not "fix" this name to match. */
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
  highRes?: string;
  caption?: string;
  width?: number;
  height?: number;
  src: string;
  alt: string;
  /** What the frame shows, used for the thumbnail's accessible name. */
  kind: 'studio' | 'in-use' | 'contents' | 'packaging';
  /** 'manufacturer' images carry a visible "Photo: manufacturer" caption. */
  source: 'own' | 'manufacturer';
}

export type ProductCategory = 'Packaging' | 'Sealing' | 'Storage';

/**
 * The merchandising line a product belongs to.
 *
 * `category` describes what a thing *is* (Packaging, Sealing, Storage) and
 * predates the line-up. `line` describes which shelf it sits on, which is what
 * /shop groups by and what the Shopify smart collections select on via the
 * matching `line:*` tag. The two are deliberately separate: a bundle is
 * Packaging *and* Sealing, and no single category could hold it.
 */
export type ProductLine = 'bundle' | 'snack' | 'tools' | 'everyday';

/** Shop section order. Bundles lead; groups with no products are not rendered. */
export const LINE_ORDER: ProductLine[] = ['bundle', 'snack', 'tools', 'everyday'];

export const LINE_LABEL: Record<ProductLine, string> = {
  bundle: 'Bundles',
  snack: 'Snack',
  tools: 'Tools',
  everyday: 'Everyday',
};

/** The Shopify smart-collection tag that selects this line. */
export const LINE_TAG: Record<ProductLine, string> = {
  bundle: 'bundle',
  snack: 'line:snack',
  tools: 'line:tools',
  everyday: 'line:everyday',
};

export interface CatalogProduct {
  /** Shopify product handle — the join key for Storefront Web Components. */
  handle: string;
  /** Shopify SKU. Used by Flow conditions and fulfillment SOPs, not by the UI. */
  sku: string;
  /** Server-rendered title, and it must be Shopify's title verbatim.
   *
   *  U04: it was not. The page said "Freeze-Drying Packaging Starter Kit" while
   *  the cart and the checkout said "Reserve Starter Kit — 100 Mylar Bags +
   *  Absorbers + Labels", because that is what the product is called in
   *  Shopify. A buyer read one name on the page and a different one at the
   *  moment they paid. Shopify owns the name; this field copies it.
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
  /** Merchandising line. Drives /shop grouping and the Shopify collection tag. */
  line: ProductLine;
  /** What is in the box, stated as counts. Rendered as a list on the PDP. */
  whatsIncluded: string[];
  /** What the buyer still has to supply. `href` links the guide that covers it. */
  whatYoullNeed: { label: string; href?: string }[];
  /** Why this one and not another. Never a claim the site cannot support. */
  highlights: string[];
  faq: { q: string; a: string }[];
  /** Article ids (src/content/articles/<id>.json), most relevant first. */
  relatedArticles: string[];
  /**
   * Why this product is listed at zero inventory, mirroring Shopify's
   * `custom.stock_note` metafield.
   *
   * Present only on products we have never stocked. It must not say "sold out"
   * or "back in stock": both assert a history that does not exist. Zero
   * inventory does the work; this says what a shopper can do about it.
   */
  stockNote?: string;
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
/**
 * Two sentences of packaging physics that belong to more than one product.
 *
 * Written once because they are the kind of statement that drifts: the second
 * one in particular is the correction to the most common absorber mistake, and
 * a version of it that has quietly lost the "not the weight of the food" half
 * is worse than no version at all.
 */
const ABSORBER_SIZING =
  "Absorber size follows the air volume left in the sealed container, not the weight of the food. Doubling absorbers does not change the result.";

const FOIL_OPACITY =
  "A full foil laminate rather than a clear pouch: the foil ply is opaque, so light does not reach the food inside.";

const SEALER_REQUIRED =
  "A heat sealer, or a household iron \u2014 mylar has to be heat sealed to close.";

const CATALOG_RECORDS: CatalogProduct[] = [
  {
    handle: 'snack-bags-6x6-50-pack-absorbers',
    sku: 'SP-SNK-50',
    title: 'Snack Bags 6×6 — 50 Pack with Absorbers',
    shortTitle: 'Snack Bags 6×6 — 50 Pack',
    eyebrow: 'Snack packaging',
    note: '50 six-by-six mylar bags at 4.3 mil, with 50 matched 100cc oxygen absorbers. Single-serving and small-batch portions.',
    image: '',
    imageAlt: '',
    detailsHref: '/shop/snack-bags-6x6-50-pack-absorbers',
    displayPrice: '$18.99 USD',
    category: 'Packaging',
    images: [],
    line: 'snack',
    whatsIncluded: [
      '50 mylar bags, 6" × 6", 4.3 mil — the standard barrier grade for this size',
      '50 × 100cc oxygen absorbers, in PackFreshUSA-branded packets',
    ],
    whatYoullNeed: [
      { label: SEALER_REQUIRED, href: '/shop/mini-heat-sealer-for-mylar-bags' },
      { label: 'A way to confirm the batch is dry before you seal it', href: '/troubleshooting/batch-not-dry' },
    ],
    highlights: [
      FOIL_OPACITY,
      'One absorber per bag, already matched to the bag — there is no sizing to work out.',
      'Sized for single servings and small batches: freeze-dried fruit, candy, portioned snacks.',
    ],
    faq: [
      {
        q: 'How many absorbers per bag?',
        a: 'One. ' + ABSORBER_SIZING,
      },
      {
        q: 'Can I seal these without a heat sealer?',
        a: "A household iron or a hair straightener will close 4.3 mil mylar on a firm edge. Note that PackFreshUSA specify a 600 watt sealer for their 7 mil film, so do not carry an improvised seal over to heavier bags without checking it. A sealer is faster and more consistent either way, which starts to matter once you are running more than a few batches a season.",
      },
      {
        q: 'What does 4.3 mil mean here?',
        a: 'It is the film thickness, and it is the standard barrier grade at this bag size. Thickness on its own is not a measure of how well a bag performs — the foil ply is what blocks light and slows oxygen transfer, and the seal is what decides whether either matters.',
      },
    ],
    relatedArticles: ['storage-containers', 'storage-failure', 'chewy-candy'],
  },
  {
    handle: 'snack-bags-6x6-100-pack-absorbers',
    sku: 'SP-SNK-100',
    title: 'Snack Bags 6×6 — 100 Pack with Absorbers',
    shortTitle: 'Snack Bags 6×6 — 100 Pack',
    eyebrow: 'Snack packaging',
    note: '100 six-by-six mylar bags at 4.3 mil, with 100 matched 100cc oxygen absorbers. Single-serving and small-batch portions.',
    image: '',
    imageAlt: '',
    detailsHref: '/shop/snack-bags-6x6-100-pack-absorbers',
    displayPrice: '$31.99 USD',
    category: 'Packaging',
    images: [],
    line: 'snack',
    whatsIncluded: [
      '100 mylar bags, 6" × 6", 4.3 mil — the standard barrier grade for this size',
      '100 × 100cc oxygen absorbers, in PackFreshUSA-branded packets',
    ],
    whatYoullNeed: [
      { label: SEALER_REQUIRED, href: '/shop/mini-heat-sealer-for-mylar-bags' },
      { label: 'A way to confirm the batch is dry before you seal it', href: '/troubleshooting/batch-not-dry' },
    ],
    highlights: [
      FOIL_OPACITY,
      'One absorber per bag, already matched to the bag — there is no sizing to work out.',
      'Sized for single servings and small batches: freeze-dried fruit, candy, portioned snacks.',
    ],
    faq: [
      {
        q: 'How many absorbers per bag?',
        a: 'One. ' + ABSORBER_SIZING,
      },
      {
        q: 'Can I seal these without a heat sealer?',
        a: "A household iron or a hair straightener will close 4.3 mil mylar on a firm edge. Note that PackFreshUSA specify a 600 watt sealer for their 7 mil film, so do not carry an improvised seal over to heavier bags without checking it. A sealer is faster and more consistent either way, which starts to matter once you are running more than a few batches a season.",
      },
      {
        q: 'What does 4.3 mil mean here?',
        a: 'It is the film thickness, and it is the standard barrier grade at this bag size. Thickness on its own is not a measure of how well a bag performs — the foil ply is what blocks light and slows oxygen transfer, and the seal is what decides whether either matters.',
      },
    ],
    relatedArticles: ['storage-containers', 'storage-failure', 'chewy-candy'],
  },
  {
    handle: '100cc-oxygen-absorber-refill-100-count',
    sku: 'SP-OA100-100',
    title: '100cc Oxygen Absorber Refill — 100 Count',
    shortTitle: '100cc Oxygen Absorber Refill',
    eyebrow: 'Absorber refill',
    note: '100 × 100cc oxygen absorbers in ten sealed 10-packs. The size that pairs with a pint bag and smaller.',
    image: '',
    imageAlt: '',
    detailsHref: '/shop/100cc-oxygen-absorber-refill-100-count',
    displayPrice: '$14.99 USD',
    category: 'Storage',
    images: [],
    line: 'snack',
    whatsIncluded: [
      "100 × 100cc oxygen absorbers — the packets carry PackFreshUSA's own branding",
      'Ten individually sealed 10-packs',
    ],
    whatYoullNeed: [
      { label: 'Bags to put them in', href: '/shop/snack-bags-6x6-50-pack-absorbers' },
      { label: 'A heat sealer to close the bags', href: '/shop/mini-heat-sealer-for-mylar-bags' },
    ],
    highlights: [
      'Ten sealed 10-packs rather than one bulk bag, so opening a pack does not spend the other ninety.',
      'The size matched to a 6" × 6" snack bag, and to pint-size containers generally.',
      ABSORBER_SIZING,
    ],
    faq: [
      {
        q: 'How do I pick an absorber size?',
        a: ABSORBER_SIZING + ' A 100cc packet is sized for a pint bag and smaller; a quart bag takes 300cc.',
      },
      {
        q: 'What happens once a pack is open?',
        a: 'An absorber starts reacting with the air around it as soon as the pack is opened, so plan to use a whole 10-pack in one sitting. That is why these ship as ten sealed packs rather than one container of a hundred.',
      },
      {
        q: 'Are these the same absorbers as in the bag packs?',
        a: 'Yes — the same 100cc PackFreshUSA packets that come matched with the 6" × 6" snack bags. This is the refill for when you have bags left and no absorbers.',
      },
    ],
    relatedArticles: ['storage-failure', 'complete-batch-workflow', 'storage-containers'],
  },
  {
    handle: 'mini-heat-sealer-for-mylar-bags',
    sku: 'SP-TOOL-HM150',
    title: 'Mini Heat Sealer for Mylar Bags',
    shortTitle: 'Mini Heat Sealer',
    eyebrow: 'Sealing tool',
    note: 'A hand-held HM-150 sealer. It closes the bag mouth in seconds, with no warm-up bar to wait on.',
    image: '',
    imageAlt: '',
    detailsHref: '/shop/mini-heat-sealer-for-mylar-bags',
    displayPrice: '$21.99 USD',
    category: 'Sealing',
    images: [],
    line: 'tools',
    whatsIncluded: ['One HM-150 hand-held heat sealer'],
    whatYoullNeed: [
      { label: 'Bags and absorbers — the sealer is the tool, not the packaging', href: '/shop/snack-bags-6x6-50-pack-absorbers' },
    ],
    highlights: [
      'A clean, consistent seal across the whole mouth of the bag.',
      'Hand-held, and there is no warm-up bar to wait on.',
      'Every mylar bag needs sealing. This is the tool that does it.',
    ],
    faq: [
      {
        q: 'Can I skip it?',
        a: 'A household iron or a hair straightener will seal mylar. If you run more than a few batches a season, the failed seals and the time add up — that is the case for the tool, and it is the only case for it.',
      },
      {
        q: 'What can it seal?',
        a: 'Mylar and foil-laminate pouches, including every bag in this catalog. It is a bag sealer, not a vacuum sealer: it closes the bag, and the oxygen absorber inside handles the air.',
      },
      {
        q: 'Does a bad seal show?',
        a: 'Not always at the time, which is the problem. A seal that looks closed but was not fully melted through can pass inspection on the day and fail later; running a finger along the cooled seam and tugging the two faces apart is the check worth making.',
      },
    ],
    relatedArticles: ['complete-batch-workflow', 'storage-failure', 'storage-containers'],
  },
  {
    handle: 'starter-set-50-bags-50-absorbers-sealer',
    sku: 'SP-BUNDLE-STARTER',
    title: 'Starter Set — 50 Bags, 50 Absorbers, Sealer',
    shortTitle: 'Starter Set',
    eyebrow: 'Complete set',
    note: 'Everything needed to seal your first fifty bags: 50 bags, 50 matched absorbers, and the sealer that closes them.',
    image: '',
    imageAlt: '',
    detailsHref: '/shop/starter-set-50-bags-50-absorbers-sealer',
    displayPrice: '$35.99 USD',
    category: 'Packaging',
    images: [],
    line: 'bundle',
    whatsIncluded: [
      '50 mylar bags, 6" × 6", 4.3 mil — the standard barrier grade for this size',
      '50 × 100cc oxygen absorbers, in PackFreshUSA-branded packets',
      'One HM-150 hand-held heat sealer',
    ],
    whatYoullNeed: [
      { label: 'Nothing else. This is the complete set for fifty bags.' },
      { label: 'A way to confirm the batch is dry before you seal it', href: '/troubleshooting/batch-not-dry' },
    ],
    highlights: [
      'The absorber size is already matched to the bag, so there is nothing to work out before you start.',
      'The sealer is the one these bags need — it is not sold separately here and then hoped for.',
      'One order rather than three.',
    ],
    faq: [
      {
        q: 'What is actually in it?',
        a: 'Fifty 6" × 6" mylar bags at 4.3 mil, fifty matched 100cc oxygen absorbers, and one HM-150 hand-held heat sealer. Nothing else is needed to close a bag.',
      },
      {
        q: 'How is this different from buying the parts separately?',
        a: 'The parts are the same parts. What the set adds is that the absorber is already the right size for the bag and the sealer is already the right tool for the film, so no part of the decision is left to you.',
      },
      {
        q: 'How many absorbers per bag?',
        a: 'One. ' + ABSORBER_SIZING,
      },
    ],
    relatedArticles: ['complete-batch-workflow', 'storage-failure', 'storage-containers'],
  },
  {
    handle: 'season-set-100-bags-100-absorbers-sealer',
    sku: 'SP-BUNDLE-SEASON',
    title: 'Season Set — 100 Bags, 100 Absorbers, Sealer',
    shortTitle: 'Season Set',
    eyebrow: 'Complete set',
    note: 'Everything needed to seal a hundred bags: 100 bags, 100 matched absorbers, and the sealer that closes them.',
    image: '',
    imageAlt: '',
    detailsHref: '/shop/season-set-100-bags-100-absorbers-sealer',
    displayPrice: '$47.99 USD',
    category: 'Packaging',
    images: [],
    line: 'bundle',
    whatsIncluded: [
      '100 mylar bags, 6" × 6", 4.3 mil — the standard barrier grade for this size',
      '100 × 100cc oxygen absorbers, in PackFreshUSA-branded packets',
      'One HM-150 hand-held heat sealer',
    ],
    whatYoullNeed: [
      { label: 'Nothing else. This is the complete set for a hundred bags.' },
      { label: 'A way to confirm the batch is dry before you seal it', href: '/troubleshooting/batch-not-dry' },
    ],
    highlights: [
      'The absorber size is already matched to the bag, so there is nothing to work out before you start.',
      'The sealer is the one these bags need — it is not sold separately here and then hoped for.',
      'A hundred packages: enough to run several foods and find out which sizes you actually use.',
    ],
    faq: [
      {
        q: 'What is actually in it?',
        a: 'A hundred 6" × 6" mylar bags at 4.3 mil, a hundred matched 100cc oxygen absorbers, and one HM-150 hand-held heat sealer. Nothing else is needed to close a bag.',
      },
      {
        q: 'How is this different from the Starter Set?',
        a: 'Twice the bags and twice the absorbers, with the same single sealer. If you already own a sealer, the bag packs on their own are the cheaper route.',
      },
      {
        q: 'How many absorbers per bag?',
        a: 'One. ' + ABSORBER_SIZING,
      },
    ],
    relatedArticles: ['complete-batch-workflow', 'storage-failure', 'storage-containers'],
  },
  {
    handle: 'quart-bags-8x12-50-pack-300cc-absorbers',
    sku: 'SP-QT-50',
    title: 'Quart Bags 8×12 — 50 Pack with 300cc Absorbers',
    shortTitle: 'Quart Bags 8×12 — 50 Pack',
    eyebrow: 'Everyday packaging',
    note: '50 eight-by-twelve mylar bags at 4.3 mil, with 50 matched 300cc oxygen absorbers. Meal-size and bulk portions.',
    image: '',
    imageAlt: '',
    detailsHref: '/shop/quart-bags-8x12-50-pack-300cc-absorbers',
    displayPrice: '$29.99 USD',
    category: 'Packaging',
    images: [],
    line: 'everyday',
    stockNote: 'Not currently stocked. Join the newsletter to hear when it lands.',
    whatsIncluded: [
      '50 mylar bags, 8" × 12", 4.3 mil — the standard barrier grade for this size',
      '50 × 300cc oxygen absorbers, in PackFreshUSA-branded packets',
    ],
    whatYoullNeed: [
      { label: SEALER_REQUIRED, href: '/shop/mini-heat-sealer-for-mylar-bags' },
      { label: 'A way to confirm the batch is dry before you seal it', href: '/troubleshooting/batch-not-dry' },
    ],
    highlights: [
      FOIL_OPACITY,
      'The step up from a snack bag: meal-size and bulk portions.',
      "The 300cc packet is matched to this bag's air volume; a 100cc packet is sized for a pint bag and smaller.",
    ],
    faq: [
      {
        q: 'Why 300cc and not 100cc?',
        a: ABSORBER_SIZING + ' An 8" × 12" bag holds roughly three times the air of a 6" × 6" one, which is what the larger packet is for.',
      },
      {
        q: 'How many absorbers per bag?',
        a: 'One. ' + ABSORBER_SIZING,
      },
    ],
    relatedArticles: ['storage-containers', 'storage-failure', 'complete-batch-workflow'],
  },
  {
    handle: '300cc-oxygen-absorber-refill-100-count',
    sku: 'SP-OA300-100',
    title: '300cc Oxygen Absorber Refill — 100 Count',
    shortTitle: '300cc Oxygen Absorber Refill',
    eyebrow: 'Absorber refill',
    note: '100 × 300cc oxygen absorbers in ten sealed 10-packs. The size that pairs with a quart bag.',
    image: '',
    imageAlt: '',
    detailsHref: '/shop/300cc-oxygen-absorber-refill-100-count',
    displayPrice: '$24.99 USD',
    category: 'Storage',
    images: [],
    line: 'everyday',
    stockNote: 'Not currently stocked. Join the newsletter to hear when it lands.',
    whatsIncluded: [
      "100 × 300cc oxygen absorbers — the packets carry PackFreshUSA's own branding",
      'Ten individually sealed 10-packs',
    ],
    whatYoullNeed: [
      { label: 'Bags to put them in', href: '/shop/quart-bags-8x12-50-pack-300cc-absorbers' },
      { label: 'A heat sealer to close the bags', href: '/shop/mini-heat-sealer-for-mylar-bags' },
    ],
    highlights: [
      'Ten sealed 10-packs rather than one bulk bag, so opening a pack does not spend the other ninety.',
      'The size matched to an 8" × 12" quart bag.',
      ABSORBER_SIZING,
    ],
    faq: [
      {
        q: 'How do I pick an absorber size?',
        a: ABSORBER_SIZING + ' A 300cc packet is sized for a quart bag; a pint bag and smaller takes 100cc.',
      },
      {
        q: 'What happens once a pack is open?',
        a: 'An absorber starts reacting with the air around it as soon as the pack is opened, so plan to use a whole 10-pack in one sitting. That is why these ship as ten sealed packs rather than one container of a hundred.',
      },
    ],
    relatedArticles: ['storage-failure', 'complete-batch-workflow', 'storage-containers'],
  },
];

export const CATALOG: CatalogProduct[] = CATALOG_RECORDS.map(product => {
  const images = productMedia(product.sku);
  return { ...product, images, image: images[0]?.src ?? '', imageAlt: images[0]?.alt ?? '' };
});


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
  /**
   * For surfaces beside a single product's price.
   *
   * It used to read "the kit clears the $45 threshold, discount included",
   * which was true only of the $74.99 boxed set. That product is archived, and
   * at the current range the top price is the Season Set at $47.99: it is the
   * only item that clears $45 on its own, and nothing clears it after a
   * discount. So this states the condition instead of asserting it is met.
   */
  itemNote: 'Free US shipping once the order reaches $45.',
  /** For catalog cards and the cart, where the order total is not yet known. */
  shortNote: 'Free US shipping over $45 · US only',
} as const;

/**
 * Launch promotion.
 *
 * `enabled` MUST stay false until the offer has been verified end to end
 * against the live store. The site must never advertise a code that would fail
 * at checkout.
 *
 * History, because this failed once in a way worth not repeating. The original
 * `welcome10` was scoped in Shopify to a single product,
 * `freeze-dryer-packaging-starter-kit-100`. When that product was archived on
 * 2026-09-09 the code still read as ACTIVE in the admin while applying to
 * nothing a buyer could add to a cart. A scoped discount is a dependency on a
 * product's lifecycle that nothing in this repo can see.
 *
 * Replaced 2026-09-09. The old discount was retired rather than deleted — its
 * code is now WELCOME10RETIRED and it carries the one real use from order
 * #1001 — and a new WELCOME10 created with `customerGets.items.all = true`.
 * Verified on creation via the Admin API: ACTIVE, 10%, all items, all
 * customers, once per customer, no usage limit, no end date.
 *
 * The free-shipping half of the offer is deliberately gone. It used to say
 * "orders of $45 or more ship free", which was true of the rule but false as a
 * promise attached to *this* offer: a 10% discount is applied before the
 * threshold is evaluated, so the discount itself can push an order under the
 * bar it is being advertised alongside. That is not specific to $45 — it
 * recurs at any threshold, because the discount always moves the total the
 * threshold is testing. The offer is 10% off. The shipping rule is stated
 * separately, from SHIPPING, where it is not conditioned on a promotion.
 */
export const LAUNCH_OFFER = {
  enabled: true,
  code: 'WELCOME10',
  /** 10% off every product. Not scoped — see the note above. */
  percentOff: 10,
  headline: 'New here? Take 10% off your first order with WELCOME10.',
  detail: 'Applied at checkout.',
} as const;
