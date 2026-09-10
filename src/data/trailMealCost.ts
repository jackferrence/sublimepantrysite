/**
 * src/data/trailMealCost.ts
 *
 * Single source of truth for /tools/trail-meal-cost.
 * Built from R5 (Backcountry Meals) — Tables 1, 2, 3E — access date 2026-09-06.
 *
 * Rules this file enforces, so callers cannot break them:
 *  - No per-food freeze-drying yield figure exists in any allowed tier (R5 §2C).
 *    Yield is a user measurement. There is no preset, and no interpolation.
 *  - Peak Refuel net weight is never read from the Shopify JSON field (R5 K4).
 *  - Manufacturer $/batch claims never enter arithmetic (R5 K3).
 *  - Process (freeze-dried / mixed / dehydrated) is carried on every pouch row.
 */

export type Tier = 'primary' | 'primary (price)' | 'secondary';

export interface Source {
  title: string;
  url: string;
  publisher: string;
  tier: Tier;
  accessDate: string;
}

/** Access date for every source below. */
export const ACCESS_DATE = '2026-09-06';

/** The date every price on this page was checked. Shown next to every figure. */
export const PRICE_DATE = '2026-09-06';

export const DISCLOSURE =
  'Sublime Pantry has no affiliate relationships, sponsorships, or paid placements as of publication. ' +
  'We sell packaging; where a product we sell appears, it is labeled.';

/* ------------------------------------------------------------------ */
/* Sources                                                             */
/* ------------------------------------------------------------------ */

export const SOURCES: Source[] = [
  // Commercial pouches
  {
    title: 'Chicken Teriyaki with Rice',
    url: 'https://mountainhouse.com/products/chicken-teriyaki-with-rice-pouch',
    publisher: 'Mountain House (OFD Foods)',
    tier: 'primary',
    accessDate: ACCESS_DATE,
  },
  {
    title: 'Shelf Life',
    url: 'https://mountainhouse.com/pages/shelf-life',
    publisher: 'Mountain House (OFD Foods)',
    tier: 'primary',
    accessDate: ACCESS_DATE,
  },
  {
    title: 'Sweet Pork & Rice',
    url: 'https://peakrefuel.com/products/sweet-pork-rice-meal',
    publisher: 'Peak Refuel',
    tier: 'primary',
    accessDate: ACCESS_DATE,
  },
  {
    title: 'Freeze Dried Meal FAQs',
    url: 'https://peakrefuel.com/pages/faq',
    publisher: 'Peak Refuel',
    tier: 'primary',
    accessDate: ACCESS_DATE,
  },
  {
    title: 'Pad Thai with Chicken',
    url: 'https://backpackerspantry.com/collections/entrees/products/pad-thai-with-chicken',
    publisher: "Backpacker's Pantry",
    tier: 'primary',
    accessDate: ACCESS_DATE,
  },
  {
    title: 'FAQ',
    url: 'https://backpackerspantry.com/pages/faq',
    publisher: "Backpacker's Pantry",
    tier: 'primary',
    accessDate: ACCESS_DATE,
  },
  {
    title: 'Wild Rice Risotto, Casual Camper',
    url: 'https://readywise.com/products/wild-rice-risotto-casual-camper',
    publisher: 'ReadyWise',
    tier: 'primary',
    accessDate: ACCESS_DATE,
  },
  {
    title: 'FAQ',
    url: 'https://goodto-go.com/pages/faq',
    publisher: 'Good To-Go',
    tier: 'primary',
    accessDate: ACCESS_DATE,
  },

  // DIY ingredients — Walmart, price only
  {
    title: 'Great Value Boneless Skinless Diced Chicken Breast, 2 lb, Frozen',
    url: 'https://www.walmart.com/ip/Great-Value-Boneless-Skinless-Diced-Chicken-Breast-2-lb-Frozen/621164712',
    publisher: 'Walmart.com',
    tier: 'primary (price)',
    accessDate: ACCESS_DATE,
  },
  {
    title: 'Great Value Long Grain Enriched Rice, 32 oz',
    url: 'https://www.walmart.com/ip/Great-Value-Long-Grain-Enriched-Rice-32-oz/10315394',
    publisher: 'Walmart.com',
    tier: 'primary (price)',
    accessDate: ACCESS_DATE,
  },
  {
    title: 'Great Value Frozen Peas and Carrots, 12 oz',
    url: 'https://www.walmart.com/ip/Great-Value-Frozen-Peas-and-Carrots-12-oz-Steamable/39080798',
    publisher: 'Walmart.com',
    tier: 'primary (price)',
    accessDate: ACCESS_DATE,
  },
  {
    title: 'Great Value Sweet Cream Salted Butter Twin Pack, 32 oz',
    url: 'https://www.walmart.com/ip/Great-Value-Sweet-Cream-Salted-Butter-Twin-Pack-16-oz-Box-8-Sticks-Slow-Churned-Refrigerated/879148225',
    publisher: 'Walmart.com',
    tier: 'primary (price)',
    accessDate: ACCESS_DATE,
  },
  {
    title: 'Great Value Chicken Bouillon Powder, 3.75 oz',
    url: 'https://www.walmart.com/ip/Great-Value-Chicken-Bouillon-Powder-3-75oz-Jar/8558263970',
    publisher: 'Walmart.com',
    tier: 'primary (price)',
    accessDate: ACCESS_DATE,
  },

  // Packaging
  {
    title: '7.5 Mil MRE Mylar Half-Portion Bags and Oxygen Absorbers',
    url: 'https://packfreshusa.com/7-5-mil-mre-mylar-half-portion-bags-and-oxygen-absorbers/',
    publisher: 'PackFreshUSA',
    tier: 'primary',
    accessDate: ACCESS_DATE,
  },
  {
    title: 'Wholesale 7.5 Mil MRE Mylar Half-Portion Bag 8"x6"x4.5" (500)',
    url: 'https://packfreshusa.com/7-5-mil-mre-mylar-half-portion-bag-8-x-6-x-4-5-500-wholesale/',
    publisher: 'PackFreshUSA',
    tier: 'primary',
    accessDate: ACCESS_DATE,
  },

  // Electricity
  {
    title: 'How Much Does It Cost to Run a Freeze Dryer? Power & Operating Costs',
    url: 'https://harvestright.com/blogs/freeze-drying-learning-center/freeze-dryer-cost-and-electricity',
    publisher: 'Harvest Right',
    tier: 'primary',
    accessDate: ACCESS_DATE,
  },
  {
    title: 'How Much Energy Does Freeze-Drying Use?',
    url: 'https://harvestright.com/blogs/blog/how-much-energy-does-freeze-drying-use',
    publisher: 'Harvest Right',
    tier: 'primary',
    accessDate: ACCESS_DATE,
  },
  {
    title: 'Home Freeze Dryers — FAQs',
    url: 'https://harvestright.com/pages/faqs',
    publisher: 'Harvest Right',
    tier: 'primary',
    accessDate: ACCESS_DATE,
  },
  {
    title: 'Electricity Monthly Update (print version)',
    url: 'https://www.eia.gov/electricity/monthly/update/print-version.php',
    publisher: 'U.S. Energy Information Administration',
    tier: 'primary',
    accessDate: ACCESS_DATE,
  },

  // Yield and weight method
  {
    title: 'How to Rehydrate Freeze Dried Food — Tips and Techniques',
    url: 'https://harvestright.com/blogs/freeze-drying-learning-center/how-to-rehydrate-freeze-dried-food',
    publisher: 'Harvest Right',
    tier: 'primary',
    accessDate: ACCESS_DATE,
  },
  {
    title: 'Preserving Food at Home: Freeze-Drying',
    url: 'https://extension.umn.edu/preserving-and-preparing/freeze-drying-food',
    publisher: 'University of Minnesota Extension',
    tier: 'primary',
    accessDate: ACCESS_DATE,
  },
  {
    title: "Let's Preserve: Freeze-Drying",
    url: 'https://extension.psu.edu/lets-preserve-freeze-drying',
    publisher: 'Penn State Extension',
    tier: 'primary',
    accessDate: ACCESS_DATE,
  },
  {
    title: 'Home Drying Foods',
    url: 'https://extension.usu.edu/preserve-the-harvest/research/home-drying-foods',
    publisher: 'Utah State University Extension',
    tier: 'primary',
    accessDate: ACCESS_DATE,
  },

  // Calorie density benchmark
  {
    title: '5 Steps to Plan a Camping Menu',
    url: 'https://www.nols.edu/blog/5-steps-to-plan-a-camping-menu/',
    publisher: 'National Outdoor Leadership School',
    tier: 'primary',
    accessDate: ACCESS_DATE,
  },
  {
    title: 'Meal Planning for Ultralight Backpacking',
    url: 'https://www.rei.com/learn/expert-advice/meal-planning-for-ultralight-backpacking.html',
    publisher: 'REI Co-op',
    tier: 'secondary',
    accessDate: ACCESS_DATE,
  },
];

/** 1-based citation index for a source URL. Throws rather than returning 0. */
export function cite(url: string): number {
  const i = SOURCES.findIndex((s) => s.url === url);
  if (i === -1) throw new Error(`trailMealCost: uncited source URL ${url}`);
  return i + 1;
}

const U = {
  mhTeriyaki: 'https://mountainhouse.com/products/chicken-teriyaki-with-rice-pouch',
  mhShelfLife: 'https://mountainhouse.com/pages/shelf-life',
  prSweetPork: 'https://peakrefuel.com/products/sweet-pork-rice-meal',
  prFaq: 'https://peakrefuel.com/pages/faq',
  bpPadThai:
    'https://backpackerspantry.com/collections/entrees/products/pad-thai-with-chicken',
  bpFaq: 'https://backpackerspantry.com/pages/faq',
  rwRisotto: 'https://readywise.com/products/wild-rice-risotto-casual-camper',
  gtgFaq: 'https://goodto-go.com/pages/faq',
  wmChicken:
    'https://www.walmart.com/ip/Great-Value-Boneless-Skinless-Diced-Chicken-Breast-2-lb-Frozen/621164712',
  wmRice: 'https://www.walmart.com/ip/Great-Value-Long-Grain-Enriched-Rice-32-oz/10315394',
  wmPeas:
    'https://www.walmart.com/ip/Great-Value-Frozen-Peas-and-Carrots-12-oz-Steamable/39080798',
  wmButter:
    'https://www.walmart.com/ip/Great-Value-Sweet-Cream-Salted-Butter-Twin-Pack-16-oz-Box-8-Sticks-Slow-Churned-Refrigerated/879148225',
  wmBouillon:
    'https://www.walmart.com/ip/Great-Value-Chicken-Bouillon-Powder-3-75oz-Jar/8558263970',
  pfRetail:
    'https://packfreshusa.com/7-5-mil-mre-mylar-half-portion-bags-and-oxygen-absorbers/',
  pfWholesale:
    'https://packfreshusa.com/7-5-mil-mre-mylar-half-portion-bag-8-x-6-x-4-5-500-wholesale/',
  hrCost:
    'https://harvestright.com/blogs/freeze-drying-learning-center/freeze-dryer-cost-and-electricity',
  hrEnergy: 'https://harvestright.com/blogs/blog/how-much-energy-does-freeze-drying-use',
  hrFaq: 'https://harvestright.com/pages/faqs',
  eia: 'https://www.eia.gov/electricity/monthly/update/print-version.php',
  hrRehydrate:
    'https://harvestright.com/blogs/freeze-drying-learning-center/how-to-rehydrate-freeze-dried-food',
  umn: 'https://extension.umn.edu/preserving-and-preparing/freeze-drying-food',
  psu: 'https://extension.psu.edu/lets-preserve-freeze-drying',
  usuDrying: 'https://extension.usu.edu/preserve-the-harvest/research/home-drying-foods',
  nols: 'https://www.nols.edu/blog/5-steps-to-plan-a-camping-menu/',
  rei: 'https://www.rei.com/learn/expert-advice/meal-planning-for-ultralight-backpacking.html',
} as const;

export const SOURCE_URLS = U;

/* ------------------------------------------------------------------ */
/* Unit helpers                                                        */
/* ------------------------------------------------------------------ */

export const GRAMS_PER_OZ = 28.349523125;

export const oz = (grams: number) => grams / GRAMS_PER_OZ;
export const g = (ounces: number) => ounces * GRAMS_PER_OZ;

/* ------------------------------------------------------------------ */
/* Commercial pouches — R5 Table 1                                     */
/* ------------------------------------------------------------------ */

export type Process = 'freeze-dried' | 'freeze-dried + dehydrated' | 'dehydrated';

export interface Pouch {
  id: string;
  brand: string;
  product: string;
  /** Brand-site price on PRICE_DATE. Retailer prices are deliberately excluded. */
  priceUsd: number;
  priceSource: string;
  /** Calories per pouch, as published. */
  caloriesPerPouch: number;
  /** Net dry weight in grams, as published on the brand's own page. */
  netWeightG: number;
  /** Verbatim form of the published weight, so the page never re-states it loosely. */
  netWeightAsPublished: string;
  /** Caveat on the weight figure, or null when the page publishes it plainly. */
  weightCaveat: string | null;
  process: Process;
  processSource: string;
  servingsPerPouch: number;
  sources: string[];
}

/**
 * Three comparators, chosen because they are the only brand-site entrees in R5
 * Table 1 that publish BOTH a calorie count AND a net weight as extractable text.
 * See EXCLUDED_COMPARATORS for the brands that could not be scored and why.
 */
export const POUCHES: Pouch[] = [
  {
    id: 'mountain-house-chicken-teriyaki',
    brand: 'Mountain House',
    product: 'Chicken Teriyaki with Rice',
    priceUsd: 12.49,
    priceSource: U.mhTeriyaki,
    caloriesPerPouch: 460,
    netWeightG: 141,
    netWeightAsPublished: '141 g / 0.31 lb',
    weightCaveat:
      'Taken from the product page weight field, not confirmed as the labeled net weight.',
    process: 'freeze-dried',
    processSource: U.mhShelfLife,
    servingsPerPouch: 2,
    sources: [U.mhTeriyaki, U.mhShelfLife],
  },
  {
    id: 'peak-refuel-sweet-pork-rice',
    brand: 'Peak Refuel',
    product: 'Sweet Pork & Rice',
    priceUsd: 13.99,
    priceSource: U.prSweetPork,
    caloriesPerPouch: 800,
    netWeightG: g(6.07),
    netWeightAsPublished: '6.07 oz',
    weightCaveat: null,
    process: 'freeze-dried',
    processSource: U.prFaq,
    servingsPerPouch: 2,
    sources: [U.prSweetPork, U.prFaq],
  },
  {
    id: 'backpackers-pantry-pad-thai',
    brand: "Backpacker's Pantry",
    product: 'Pad Thai with Chicken',
    priceUsd: 12.99,
    priceSource: U.bpPadThai,
    caloriesPerPouch: 850,
    netWeightG: g(6.7),
    netWeightAsPublished: '6.7 oz',
    weightCaveat: null,
    process: 'freeze-dried + dehydrated',
    processSource: U.bpFaq,
    servingsPerPouch: 2,
    sources: [U.bpPadThai, U.bpFaq],
  },
];

/**
 * Named so the three above are not mistaken for the cheapest or the whole market.
 */
export const EXCLUDED_COMPARATORS: { brand: string; reason: string; sources: string[] }[] = [
  {
    brand: 'ReadyWise',
    reason:
      'Cheaper brand-site entrees exist — Wild Rice Risotto lists at $7.99 — but ReadyWise publishes ' +
      'calories, net weight and servings only as Nutrition Facts label images, so no weight-per-500-kcal ' +
      'or cost-per-500-kcal figure can be produced for it here.',
    sources: [U.rwRisotto],
  },
  {
    brand: 'Good To-Go',
    reason:
      'Good To-Go states its meals are dehydrated, not freeze-dried, and argues freeze-drying "can break ' +
      'down the cell walls of ingredients, resulting in poor texture". Its figures are not comparable to a ' +
      'freeze-dried pouch and are not shown as one.',
    sources: [U.gtgFaq],
  },
];

/**
 * Peak Refuel's product API reports a weight roughly double the on-page figure for
 * several SKUs. Recorded so no future edit reaches for the convenient endpoint.
 */
export const PEAK_REFUEL_WEIGHT_WARNING =
  'Peak Refuel net weight is read from the rendered product page only. The brand’s Shopify JSON ' +
  'weight field reports figures more than double the on-page net weight for several entrees, and the ' +
  'brand does not explain the difference. Never pull Peak Refuel net weight programmatically.';

/* ------------------------------------------------------------------ */
/* DIY reference recipe — R5 Table 2A                                  */
/* ------------------------------------------------------------------ */

export interface Ingredient {
  name: string;
  sizeSold: string;
  packPriceUsd: number;
  quantityUsed: string;
  /** As-purchased weight used, in ounces. */
  quantityOz: number;
  costUsd: number;
  /** Approximate calories contributed, by label arithmetic. */
  calories: number;
  source: string;
}

export const REFERENCE_RECIPE: Ingredient[] = [
  {
    name: 'Diced chicken breast, frozen raw',
    sizeSold: '2 lb (32 oz)',
    packPriceUsd: 7.94,
    quantityUsed: '4 oz',
    quantityOz: 4,
    costUsd: 0.99,
    calories: 120,
    source: U.wmChicken,
  },
  {
    name: 'Long grain white rice, dry',
    sizeSold: '32 oz',
    packPriceUsd: 1.77,
    quantityUsed: '3.26 oz (½ cup dry)',
    quantityOz: 3.26,
    costUsd: 0.18,
    calories: 330,
    source: U.wmRice,
  },
  {
    name: 'Frozen peas and carrots',
    sizeSold: '12 oz',
    packPriceUsd: 0.98,
    quantityUsed: '2 oz',
    quantityOz: 2,
    costUsd: 0.16,
    calories: 34,
    source: U.wmPeas,
  },
  {
    name: 'Salted butter',
    sizeSold: '32 oz (2 × 16 oz)',
    packPriceUsd: 5.96,
    quantityUsed: '0.5 oz (1 tbsp)',
    quantityOz: 0.5,
    costUsd: 0.09,
    calories: 100,
    source: U.wmButter,
  },
  {
    name: 'Chicken bouillon powder',
    sizeSold: '3.75 oz',
    packPriceUsd: 1.93,
    quantityUsed: '0.18 oz (1 tsp)',
    quantityOz: 0.18,
    costUsd: 0.09,
    calories: 10,
    source: U.wmBouillon,
  },
];

/**
 * Summed from the rows above, which gives $1.51. The research pack states the
 * total as $1.52; its own per-ingredient rows sum to $1.51. The one-cent gap is
 * rounding inside the pack. The rows are the figures with sources attached, so
 * they are what is summed here, and the discrepancy is recorded rather than hidden.
 */
export const REFERENCE_INGREDIENT_COST = round2(
  REFERENCE_RECIPE.reduce((t, i) => t + i.costUsd, 0),
); // $1.51

export const REFERENCE_TOTAL_ROUNDING_NOTE =
  'The ingredient rows above sum to $1.51. The research pack behind this page states the total as ' +
  '$1.52, a one-cent rounding difference against its own rows. The rows are used here because they ' +
  'are the figures each listing supports.';

export const REFERENCE_CALORIES = REFERENCE_RECIPE.reduce((t, i) => t + i.calories, 0); // ~594

export const REFERENCE_AS_PURCHASED_OZ = round2(
  REFERENCE_RECIPE.reduce((t, i) => t + i.quantityOz, 0),
); // 9.94

export const REFERENCE_RECIPE_NOTE =
  'Costed at Walmart on ' +
  PRICE_DATE +
  '. The calorie figure is label arithmetic on the five listings, not a lab result. The weight is ' +
  'as-purchased, not cooked weight: no source publishes the prepared weight of this dish, so the ' +
  'prepared weight you freeze-dry is your own measurement.';

/** Costs the ingredient figure does not contain. Stated on the page, not buried. */
export const EXCLUDED_FROM_COST: string[] = [
  'Freeze-dryer purchase price and amortization',
  'Vacuum pump oil and filter changes, and other maintenance',
  'Labor',
  'Oxygen absorbers, where the pouch price does not already include them',
];

/* ------------------------------------------------------------------ */
/* Packaging — R5 Table 2B                                             */
/* ------------------------------------------------------------------ */

export interface PouchPrice {
  id: string;
  label: string;
  quantityBreak: string;
  packPriceUsd: number;
  unitCount: number;
  perPouchUsd: number;
  absorbersIncluded: string;
  source: string;
}

export const PACKAGING_OPTIONS: PouchPrice[] = [
  {
    id: 'half-retail-10',
    label: 'MRE half-portion, 7.5 mil, 8" × 6" × 4.5"',
    quantityBreak: 'Retail 10-count bundle',
    packPriceUsd: 14.99,
    unitCount: 10,
    perPouchUsd: 1.499,
    absorbersIncluded: '100cc absorbers included, 10-pack, not itemized separately',
    source: U.pfRetail,
  },
  {
    id: 'half-wholesale-500',
    label: 'MRE half-portion, 7.5 mil, 8" × 6" × 4.5"',
    quantityBreak: 'Wholesale case of 500, one case',
    packPriceUsd: 149.0,
    unitCount: 500,
    perPouchUsd: 0.298,
    absorbersIncluded: 'Absorbers not included',
    source: U.pfWholesale,
  },
  {
    id: 'half-wholesale-6-10',
    label: 'MRE half-portion, 7.5 mil, 8" × 6" × 4.5"',
    quantityBreak: 'Wholesale, 6–10 cases',
    packPriceUsd: 134.0,
    unitCount: 500,
    perPouchUsd: 0.268,
    absorbersIncluded: 'Absorbers not included',
    source: U.pfWholesale,
  },
];

/** Same pouch, same vendor, same day: the spread between the ends of the table. */
export const PACKAGING_SPREAD_MULTIPLE = round1(
  PACKAGING_OPTIONS[0].perPouchUsd / PACKAGING_OPTIONS[1].perPouchUsd,
); // 5.0

/* ------------------------------------------------------------------ */
/* Electricity — R5 Table 2D. Approximate, and labeled so everywhere.  */
/* ------------------------------------------------------------------ */

export const ELECTRICITY_IS_APPROXIMATE = true;

export interface MachineBand {
  id: string;
  label: string;
  /** Average draw in kilowatts, low and high, as published. */
  kwLow: number;
  kwHigh: number;
  drawAsPublished: string;
  source: string;
}

export const MACHINE_BANDS: MachineBand[] = [
  {
    id: 'small-medium',
    label: 'Small / Medium',
    kwLow: 0.99,
    kwHigh: 1.21,
    drawAsPublished: '990–1,210 W (9–11 A average)',
    source: U.hrCost,
  },
  {
    id: 'large',
    label: 'Large',
    kwLow: 1.5,
    kwHigh: 1.5,
    drawAsPublished: '~1,500 W (13 A average)',
    source: U.hrFaq,
  },
  {
    id: 'x-large',
    label: 'X-Large',
    kwLow: 1.7,
    kwHigh: 1.7,
    drawAsPublished: '~1,700 W (15 A average)',
    source: U.hrCost,
  },
];

/** Two batch-duration ranges, both published by the same manufacturer. */
export const BATCH_DURATION_RANGES = [
  { hoursLow: 13, hoursHigh: 35, source: U.hrCost },
  { hoursLow: 24, hoursHigh: 36, source: U.hrEnergy },
];

export const BATCH_DURATION_CONFLICT =
  'Harvest Right publishes two different batch-duration ranges — 13 to 35 hours in one place and ' +
  '24 to 36 hours in another — with no note explaining the difference. Both are offered below. ' +
  'Neither is corrected.';

/** U.S. residential average, June 2026, the latest month published at access. */
export const ELECTRICITY_RATE_USD_PER_KWH = 0.1834;
export const ELECTRICITY_RATE_LABEL =
  '18.34¢/kWh — U.S. residential average, June 2026, up 5.0% year over year';
export const ELECTRICITY_RATE_SOURCE = U.eia;

/**
 * Manufacturer dollar-per-batch claims. Displayed for comparison only.
 * These never enter any calculation on this page.
 */
export const MANUFACTURER_BATCH_CLAIMS = [
  { model: 'Small / Medium', claim: '$1.25–$2.80 per batch', source: U.hrCost },
  { model: 'Large', claim: '$2.00–$3.00 per batch', source: U.hrCost },
  { model: 'X-Large', claim: '$4.00 per batch', source: U.hrCost },
];

export const MANUFACTURER_CLAIM_CONFLICT =
  'The manufacturer’s own dollar figures do not reconcile with its own published wattage. Running the ' +
  'Small/Medium band (990–1,210 W over 13–24 h) at the June 2026 national rate gives $2.36 to $5.33 per ' +
  'batch against a published claim of $1.25 to $2.80, and the manufacturer does not publish the ' +
  'electricity rate behind its figure. Both are recorded. Neither is corrected, and the claims above are ' +
  'not used in any arithmetic here. (The research pack behind this page records the top of the computed ' +
  'range as $5.32; recomputing it gives $5.33. The difference is rounding.)';

export const MEALS_PER_BATCH_IS_AN_INPUT =
  'No source publishes how many meals fill a batch. Electricity is metered per batch, not per meal, so ' +
  'the per-meal figure below divides by a number you supply.';

/* ------------------------------------------------------------------ */
/* Yield — the central absence. R5 §2C.                                */
/* ------------------------------------------------------------------ */

export const YIELD_HAS_NO_PUBLISHED_FIGURE = true;

export const YIELD_ABSENCE =
  'No university extension service or freeze-dryer manufacturer publishes a freeze-drying yield ' +
  'percentage for meats, cooked grains, or dairy. There is no preset here and no default value, ' +
  'because supplying one would mean inventing it.';

/** Published water-removal figures. Context for a yield input, never a substitute for one. */
export const WATER_REMOVAL_CONTEXT = [
  {
    figure: 'Raw foods contain 80 to 95 percent water before drying',
    publisher: 'University of Minnesota Extension',
    source: U.umn,
  },
  {
    figure:
      'Sublimation removes up to 90 percent of a food’s water, and secondary drying an additional one to two percent',
    publisher: 'University of Minnesota Extension',
    source: U.umn,
  },
  {
    figure: 'Freeze-drying removes up to 98 percent of the water in the food',
    publisher: 'Penn State Extension',
    source: U.psu,
  },
];

export const WATER_REMOVAL_CONFLICT =
  'Two extension services publish different all-food figures — about 91 to 92 percent, and up to ' +
  '98 percent. Both are general figures covering every food. Neither is a yield for a particular dish, ' +
  'and neither is reconciled against the other.';

export const YIELD_METHOD =
  'The one published way to get this number for your own food: weigh the trays before and after the run. ' +
  'The weight lost is water. Dried weight divided by prepared weight is the yield to enter here.';
export const YIELD_METHOD_SOURCES = [U.hrRehydrate, U.umn];

export const DEHYDRATOR_FIGURES_ARE_NOT_YIELDS =
  'Weight-reduction figures that circulate for apples and onions — 25 lb of apples yielding about 4 lb ' +
  '— are dehydrator figures published for conventional drying. They are not freeze-drying yields and ' +
  'are not used here.';
export const DEHYDRATOR_FIGURES_SOURCE = U.usuDrying;

/* ------------------------------------------------------------------ */
/* Weight per 500 kcal — R5 Table 3E                                   */
/* ------------------------------------------------------------------ */

/** Derived from NOLS's own paired food-weight and calorie bands. */
export const WEIGHT_BENCHMARK = {
  ozLow: 4,
  ozHigh: 5,
  gLow: 115,
  gHigh: 140,
  label: 'about 4 to 5 oz (115–140 g) of food per 500 kcal',
  basis:
    'Arithmetic on the National Outdoor Leadership School’s paired daily food-weight and calorie ' +
    'bands, across all three of its trip types.',
  source: U.nols,
};

export const WEIGHT_BENCHMARK_SECONDARY = {
  label: 'At least 100 calories per ounce, 125 or more is better',
  derived: '100 kcal/oz gives 5.0 oz per 500 kcal; 125 kcal/oz gives 4.0 oz',
  note:
    'Secondary tier. No primary source publishes a calories-per-ounce benchmark; this one is included ' +
    'because it corroborates the NOLS-derived range from a separate direction.',
  source: U.rei,
};

/* ------------------------------------------------------------------ */
/* Calculation                                                         */
/* ------------------------------------------------------------------ */

export interface ElectricityInput {
  kw: number;
  hours: number;
  rateUsdPerKwh: number;
  mealsPerBatch: number;
}

export interface CostInput {
  ingredientCostUsd: number;
  packagingCostUsd: number;
  /** Omit or pass null to leave electricity out of the total entirely. */
  electricity?: ElectricityInput | null;
}

export interface CostResult {
  ingredientCostUsd: number;
  packagingCostUsd: number;
  electricityPerMealUsd: number | null;
  electricityKwhPerBatch: number | null;
  electricityPerBatchUsd: number | null;
  totalUsd: number;
  /** True when the total contains an approximate component. */
  containsApproximate: boolean;
}

export function costPerMeal(input: CostInput): CostResult {
  const ingredients = nonNegative(input.ingredientCostUsd);
  const packaging = nonNegative(input.packagingCostUsd);

  let kwh: number | null = null;
  let perBatch: number | null = null;
  let perMeal: number | null = null;

  const e = input.electricity;
  if (e && e.mealsPerBatch > 0 && e.kw > 0 && e.hours > 0) {
    kwh = nonNegative(e.kw) * nonNegative(e.hours);
    perBatch = kwh * nonNegative(e.rateUsdPerKwh);
    perMeal = perBatch / e.mealsPerBatch;
  }

  return {
    ingredientCostUsd: ingredients,
    packagingCostUsd: packaging,
    electricityKwhPerBatch: kwh,
    electricityPerBatchUsd: perBatch,
    electricityPerMealUsd: perMeal,
    totalUsd: ingredients + packaging + (perMeal ?? 0),
    containsApproximate: perMeal !== null,
  };
}

/** Cost per 500 kcal. Null when calories are missing, never zero-filled. */
export function costPer500Kcal(totalUsd: number, calories: number): number | null {
  if (!(calories > 0)) return null;
  return (totalUsd / calories) * 500;
}

/**
 * Dried weight from prepared weight and a measured yield.
 * Returns null when yield is absent — the caller must render "not entered",
 * never a substituted figure.
 */
export function driedWeightG(
  preparedWeightG: number,
  yieldPercent: number | null | undefined,
): number | null {
  if (yieldPercent === null || yieldPercent === undefined) return null;
  if (!(yieldPercent > 0) || yieldPercent > 100) return null;
  if (!(preparedWeightG > 0)) return null;
  return preparedWeightG * (yieldPercent / 100);
}

/** Grams per 500 kcal. Null when either input is missing. */
export function weightPer500Kcal(
  weightG: number | null,
  calories: number,
): number | null {
  if (weightG === null || !(weightG > 0) || !(calories > 0)) return null;
  return (weightG / calories) * 500;
}

export type BenchmarkVerdict = 'below' | 'within' | 'above' | 'unknown';

/** Where a grams-per-500-kcal figure falls against the NOLS-derived band. */
export function benchmarkVerdict(gramsPer500: number | null): BenchmarkVerdict {
  if (gramsPer500 === null) return 'unknown';
  if (gramsPer500 < WEIGHT_BENCHMARK.gLow) return 'below';
  if (gramsPer500 > WEIGHT_BENCHMARK.gHigh) return 'above';
  return 'within';
}

export interface PouchScore {
  pouch: Pouch;
  costPer500KcalUsd: number;
  gramsPer500Kcal: number;
  ozPer500Kcal: number;
  verdict: BenchmarkVerdict;
}

export function scorePouch(p: Pouch): PouchScore {
  const cost = costPer500Kcal(p.priceUsd, p.caloriesPerPouch) as number;
  const grams = weightPer500Kcal(p.netWeightG, p.caloriesPerPouch) as number;
  return {
    pouch: p,
    costPer500KcalUsd: cost,
    gramsPer500Kcal: grams,
    ozPer500Kcal: oz(grams),
    verdict: benchmarkVerdict(grams),
  };
}

export const POUCH_SCORES = POUCHES.map(scorePouch);

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

export function usd(n: number): string {
  return '$' + n.toFixed(2);
}

/** Sub-dollar figures where the cent is not enough resolution. */
export function usdPrecise(n: number): string {
  return n < 1 ? '$' + n.toFixed(3) : '$' + n.toFixed(2);
}

export function grams(n: number): string {
  return Math.round(n) + ' g';
}

export function ounces(n: number): string {
  return n.toFixed(2) + ' oz';
}

function nonNegative(n: number): number {
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/* ------------------------------------------------------------------ */
/* Required section content                                            */
/* ------------------------------------------------------------------ */

export const COULD_NOT_SOURCE: string[] = [
  'A freeze-drying yield percentage for meats, cooked grains, or dairy. No extension service or ' +
    'freeze-dryer manufacturer publishes one, which is why yield is an input on this page rather than a preset.',
  'A meals-per-batch figure for any freeze-dryer model, from any publisher. Electricity is metered per ' +
    'batch, so the per-meal electricity figure divides by a number you supply.',
  'A metered kWh-per-batch reading from the freeze-dryer manufacturer. It publishes amps, watts and ' +
    'dollar claims, and the dollar claims do not reconcile with its own wattage.',
  'Calories, net weight and servings for ReadyWise entrees. All are published as Nutrition Facts label ' +
    'images rather than text, so the cheapest brand-site entree in the research cannot be scored here.',
  'Amazon pricing for any of these brands. Product pages block automated retrieval, so only brand-site ' +
    'and retailer prices appear.',
  'A primary-tier calories-per-ounce benchmark. The 4-to-5-oz band on this page is arithmetic on NOLS’s ' +
    'own paired weight and calorie bands; the calories-per-ounce version of it is secondary.',
  'The prepared weight of the reference recipe. The pack costs ingredients as purchased and does not ' +
    'publish what the assembled dish weighs going into the machine.',
];

export const RELATED: { href: string; label: string }[] = [
  { href: '/tools/running-cost', label: 'Freeze dryer running cost calculator' },
  { href: '/tools/batch-planner', label: 'Batch planner' },
  { href: '/tools/absorber-calculator', label: 'Oxygen absorber calculator' },
];

export const PRODUCT = {
  handle: 'starter-set-50-bags-50-absorbers-sealer',
  href: '/shop/starter-set-50-bags-50-absorbers-sealer',
  name: 'Starter Set — 50 Bags, 50 Absorbers, Sealer',
  label: 'Sold by Sublime Pantry',
  description:
    '50 snack bags, 50 matched oxygen absorbers, and a sealer. If you are pricing packaging for ' +
    'the first time, it is one way to fill the packaging field above.',
};
