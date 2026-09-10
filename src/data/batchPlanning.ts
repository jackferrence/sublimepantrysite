/**
 * /tools/batch-planner — the single source of truth.
 *
 * Built from R2 (FOOD BEHAVIOR) Table 1 and Table 3, and R3 Module 2 Table 2.
 * Every figure below is published by the source named against it. Nothing here
 * is averaged, interpolated, reconciled, or filled in from an adjacent table.
 *
 * The honesty problem this tool exists around: a batch planner wants to answer
 * "how much will I get out, on how many trays, in how many bags", and the
 * published record answers only a fraction of that.
 *
 *   - Yield exists for three foods in the entire R2 per-food table, all three
 *     secondary-tier. R2 §7 records the absence as a structural finding: "No
 *     extension service publishes a yield figure for any food." Every other
 *     food returns Not published, and no substitute is constructed.
 *   - Trays exist only where a per-food load density is published — milk and
 *     potatoes, both secondary. There is no general pounds-per-tray figure and
 *     no published tray count per machine, so everything else is planned in
 *     whole batches from per-batch capacity, which four publishers disagree
 *     about. All four are shown; none is preferred.
 *   - Bags cannot be derived at all. Converting a dried weight into a bag count
 *     needs the bulk density of freeze-dried food and the measured interior
 *     volume of a mylar bag. Neither is published by anyone in either pack, and
 *     PackFreshUSA states its own quart bags "hold more than a quart" — so a
 *     bag's printed size is not its volume. The tool asks how many bags you
 *     intend to fill rather than inventing the conversion.
 *
 * Absorber figures are NOT duplicated here. They are imported from
 * ./absorberSizing (built from R3 Module 2, Table 2) so the batch planner and
 * the absorber calculator cannot drift apart.
 */

import {
  CONTAINERS as A_CONTAINERS,
  PUBLISHED_RECOMMENDATIONS as A_RECOMMENDATIONS,
  SOURCES as A_SOURCES,
  getSource,
  type ContainerSpec,
  type PublishedRecommendation,
} from './absorberSizing.ts';

export interface Source {
  title: string;
  url: string;
  publisher: string;
  tier: 'primary' | 'secondary';
  accessDate: string;
}

/* ------------------------------------------------------------------ *
 * ADAPTER — the only place this file touches absorberSizing's shape.
 *
 * absorberSizing.ts publishes SOURCES in the article schema's own shape, so
 * those pass through untouched. CONTAINERS and PUBLISHED_RECOMMENDATIONS are
 * normalized below. If a field name here does not match that file, fix it HERE
 * and nowhere else — everything downstream reads the normalized types.
 * ------------------------------------------------------------------ */

export interface AbsorberContainer {
  /** stable key, e.g. 'pint' | 'quart' | 'gallon' */
  id: string;
  label: string;
  /** interior volume in cc */
  volumeCc: number;
  /** true when the cc figure is published, false when it is arithmetic */
  volumePublished: boolean;
  /** source URLs backing volumeCc */
  volumeSourceUrls: string[];
}

export interface AbsorberRecommendation {
  containerId: string;
  publisher: string;
  /** exactly as published, e.g. '500cc' or '300cc dense / 500cc bulky' */
  published: string;
  /** the condition the publisher attached; '' means none was attached */
  condition: string;
  sourceUrls: string[];
}

const ADAPT_CONTAINER = (c: ContainerSpec): AbsorberContainer => ({
  id: c.id,
  label: c.label,
  volumeCc: c.volumeCc,
  volumePublished: c.volumeBasis === 'published',
  volumeSourceUrls: c.volumeSources.map((id) => getSource(id).url),
});

const ADAPT_RECOMMENDATION = (r: PublishedRecommendation): AbsorberRecommendation => ({
  containerId: r.container,
  publisher: r.publisher,
  published: r.cc,
  condition: r.condition,
  sourceUrls: r.sources.map((id) => getSource(id).url),
});

export const ABSORBER_CONTAINERS: AbsorberContainer[] = A_CONTAINERS.map(ADAPT_CONTAINER);
export const ABSORBER_RECOMMENDATIONS: AbsorberRecommendation[] = A_RECOMMENDATIONS.map(ADAPT_RECOMMENDATION);

/* --- end adapter block -------------------------------------------- */

/* ------------------------------------------------------------------ *
 * Sources. R2's rows first, then every absorber source, appended.
 * Cited as [n] where n is the 1-based position — the same convention the
 * article schema and /tools/running-cost use. Order is stable; append only.
 * ------------------------------------------------------------------ */

/**
 * The three container volumes the planner offers, by absorberSizing id.
 * These are published container volumes, not Sublime Pantry SKU dimensions.
 * No source in either pack publishes the flat dimensions or the measured
 * interior volume of any bag we sell, so none is claimed.
 */
export const PLANNER_CONTAINER_IDS = ['pint', 'quart', 'gallon'] as const;

/**
 * The two absorber URLs this tool cites directly, declared before the source
 * list is assembled so the list can be filtered down to what is actually used.
 */
const ONE_PER_BAG_URL = 'https://wallabygoods.com/blogs/news/how-to-use-oxygen-absorbers-with-mylar-bags';
const ONE_PER_BAG_CAVEAT_URL =
  'https://packfreshusa.com/blog/oxygen-absorbers-explained-why-freezedried-foods-need-them-the-dos-donts-and-why-it-matters/';

const R2_SOURCES: Source[] = [
  {
    title: 'How to Freeze Dry Milk',
    url: 'https://practicalselfreliance.com/freeze-dried-milk/',
    publisher: 'Practical Self Reliance',
    tier: 'secondary',
    accessDate: '2026-09-06',
  },
  {
    title: 'How to Freeze Dry Eggs (& Ways to Use Them)',
    url: 'https://practicalselfreliance.com/freeze-dried-eggs/',
    publisher: 'Practical Self Reliance',
    tier: 'secondary',
    accessDate: '2026-09-06',
  },
  {
    title: 'Freeze-Dried Strawberry Fresh-to-Dry Ratio for Buyers',
    url: 'https://fruitbuys.com/freeze-dried-strawberry-fresh-to-dry-conversion-ratio',
    publisher: 'FruitBuys (commercial OEM supplier)',
    tier: 'secondary',
    accessDate: '2026-09-06',
  },
  {
    title: 'Freeze Drying Potatoes: A Complete Guide',
    url: 'https://montanahomesteadharvest.com/freeze-drying-potatoes-a-complete-guide/',
    publisher: 'Montana Homestead Harvest',
    tier: 'secondary',
    accessDate: '2026-09-06',
  },
  {
    title: 'Harvest Right Home Freeze Dryers — FAQs',
    url: 'https://harvestright.com/pages/faqs',
    publisher: 'Harvest Right',
    tier: 'primary',
    accessDate: '2026-09-06',
  },
  {
    title: "What's the best way to prepare food for freeze drying?",
    url: 'https://harvestright.com/question/preparing-food-for-freeze-drying/',
    publisher: 'Harvest Right',
    tier: 'primary',
    accessDate: '2026-09-06',
  },
  {
    title: 'How to Freeze Dry Like a Pro: 25 Tips for Better Results',
    url: 'https://harvestright.com/blogs/blog/how-to-freeze-dry-like-a-pro-25-tips-for-better-results',
    publisher: 'Harvest Right',
    tier: 'primary',
    accessDate: '2026-09-06',
  },
  {
    title: 'Buying a Home Freeze-Dryer: What to Know Before You Go (April 2019)',
    url: 'https://digitalcommons.usu.edu/cgi/viewcontent.cgi?article=2999&context=extension_curall',
    publisher: 'Utah State University Extension',
    tier: 'primary',
    accessDate: '2026-09-06',
  },
  {
    title: 'Preserving food at home: Freeze-drying',
    url: 'https://extension.umn.edu/preserving-and-preparing/freeze-drying-food',
    publisher: 'University of Minnesota Extension',
    tier: 'primary',
    accessDate: '2026-09-06',
  },
  {
    title: "Stay Fresh Freeze Dryer Owner's Manual, Model 4H11560US",
    url: 'https://images.thdstatic.com/catalog/pdfImages/01/01e2d457-9a99-4147-8d3f-1d806b6d59bc.pdf',
    publisher: 'Stay Fresh',
    tier: 'primary',
    accessDate: '2026-09-06',
  },
  {
    title: 'Blue Alpine FAQs',
    url: 'https://bluealpinefreezedryers.com/pages/faqs',
    publisher: 'Blue Alpine',
    tier: 'primary',
    accessDate: '2026-09-06',
  },
  {
    title: 'The Cube (homepage)',
    url: 'https://p4lfood.com/',
    publisher: 'Prep4Life',
    tier: 'primary',
    accessDate: '2026-09-06',
  },
  {
    title: 'Harvest Right Large Freeze Dryer Trays, Set of 6 (retailer citing manufacturer tray dimensions)',
    url: 'https://hydrobuilder.com/products/harvest-right-large-freeze-dryer-trays-set-of-6',
    publisher: 'Hydrobuilder',
    tier: 'secondary',
    accessDate: '2026-09-06',
  },
  {
    title: 'Preparing and Storing Your Freeze Dried Products for Best Use (AZ2097B)',
    url: 'https://extension.arizona.edu/sites/default/files/2025-03/az2097b-2025.pdf',
    publisher: 'University of Arizona Cooperative Extension',
    tier: 'primary',
    accessDate: '2026-09-06',
  },
];

/**
 * Absorber sources come from absorberSizing.ts, appended after R2's. They are
 * not restated here — the two tools cite the same rows.
 *
 * Only the absorber sources this tool actually cites are carried into SOURCES.
 * absorberSizing.ts registers every O-series source in the research pack, and
 * most of them are about containers and food classes this planner never shows.
 * Listing an uncited source would break the project's own rule that every
 * source in an artifact is cited at least once, so the unused ones are dropped
 * here rather than printed and left dangling.
 */
const ALL_ABSORBER_SOURCES: readonly Source[] = A_SOURCES;

const ABSORBER_URLS_USED: string[] = [
  ...PLANNER_CONTAINER_IDS.flatMap((id) => {
    const container = ABSORBER_CONTAINERS.find((c) => c.id === id);
    if (!container) return [] as string[];
    return [
      ...container.volumeSourceUrls,
      ...ABSORBER_RECOMMENDATIONS.filter((r) => r.containerId === id).flatMap((r) => r.sourceUrls),
    ];
  }),
  ONE_PER_BAG_URL,
  ONE_PER_BAG_CAVEAT_URL,
];

export const ABSORBER_SOURCES: Source[] = ALL_ABSORBER_SOURCES.filter((s) =>
  ABSORBER_URLS_USED.includes(s.url),
);

export const SOURCES: Source[] = [...R2_SOURCES, ...ABSORBER_SOURCES];

/** 1-based citation index for a source, so prose never hard-codes a number. */
export function cite(url: string): number {
  const i = SOURCES.findIndex((s) => s.url === url);
  if (i < 0) throw new Error(`batchPlanning: no source registered for ${url}`);
  return i + 1;
}

const PSR_MILK = R2_SOURCES[0].url;
const PSR_EGGS = R2_SOURCES[1].url;
const FRUITBUYS = R2_SOURCES[2].url;
const MHH_POTATO = R2_SOURCES[3].url;
const HR_FAQ = R2_SOURCES[4].url;
const HR_PREP = R2_SOURCES[5].url;
const HR_TIPS = R2_SOURCES[6].url;
const USU_BUYING = R2_SOURCES[7].url;
const UMN = R2_SOURCES[8].url;
const STAYFRESH_MANUAL = R2_SOURCES[9].url;
const BLUE_ALPINE = R2_SOURCES[10].url;
const PREP4LIFE = R2_SOURCES[11].url;
const HR_TRAYS = R2_SOURCES[12].url;
const ARIZONA = R2_SOURCES[13].url;

/* ------------------------------------------------------------------ *
 * Yield — R2 Table 1
 * ------------------------------------------------------------------ */

export type YieldKind =
  /** a published percentage of fresh weight retained */
  | 'percent'
  /** a published fresh:dried mass ratio, converted to a percentage here */
  | 'ratio'
  /** the source publishes a count conversion, not a weight yield */
  | 'count-only'
  /** no yield figure exists at any tier */
  | 'not-published'
  /** R2 Table 1's table for this food group publishes no yield column at all */
  | 'no-column';

export interface PerTray {
  published: string;
  unit: 'lb' | 'cups';
  low: number;
  high: number;
  sourceUrl: string;
}

export interface FoodRow {
  id: string;
  label: string;
  group: string;
  yieldKind: YieldKind;
  /** fraction of fresh weight retained; null unless percent or ratio */
  yieldLow: number | null;
  yieldHigh: number | null;
  /** the figure exactly as the source published it */
  publishedAs: string;
  /** how yieldLow and yieldHigh were obtained from publishedAs */
  derivation: string;
  yieldSourceUrls: string[];
  /** true when every backing source is secondary tier */
  secondaryOnly: boolean;
  perTray: PerTray | null;
  /** anything a reader must not misread. Shown with the result, not filed away. */
  caution: string;
}

const NOT_PUBLISHED = (id: string, label: string, group: string, publishedAs = 'No source found', caution = ''): FoodRow => ({
  id,
  label,
  group,
  yieldKind: 'not-published',
  yieldLow: null,
  yieldHigh: null,
  publishedAs,
  derivation: '',
  yieldSourceUrls: [],
  secondaryOnly: false,
  perTray: null,
  caution,
});

const NO_COLUMN = (id: string, label: string, caution = ''): FoodRow => ({
  id,
  label,
  group: 'Candy',
  yieldKind: 'no-column',
  yieldLow: null,
  yieldHigh: null,
  publishedAs: 'R2 Table 1 publishes an expansion column for candy, not a yield column',
  derivation: '',
  yieldSourceUrls: [],
  secondaryOnly: false,
  perTray: null,
  caution,
});

const DAIRY = 'Eggs and dairy';
const FRUIT = 'Fruit';
const VEG = 'Vegetables, starches, herbs, bread';
const MEAT = 'Meat, meals, pet food';

export const FOODS: FoodRow[] = [
  {
    id: 'milk-whole',
    label: 'Milk — whole, pasteurized',
    group: DAIRY,
    yieldKind: 'percent',
    yieldLow: 0.2,
    yieldHigh: 0.2,
    publishedAs: 'Whole ≈20% (1 gal → 5 cups powder)',
    derivation: 'Used exactly as published. No conversion applied.',
    yieldSourceUrls: [PSR_MILK],
    secondaryOnly: true,
    perTray: {
      published: '~3–4 cups whole milk per tray',
      unit: 'cups',
      low: 3,
      high: 4,
      sourceUrl: PSR_MILK,
    },
    caution:
      'The only yield figure for milk is secondary-tier. No manufacturer or extension service publishes one. Milk is also pre-frozen at least 24 hours before loading, and trays are filled no more than three-quarters full.',
  },
  {
    id: 'milk-skim',
    label: 'Milk — skim, pasteurized',
    group: DAIRY,
    yieldKind: 'percent',
    yieldLow: 0.16,
    yieldHigh: 0.16,
    publishedAs: 'Skim ≈16% (1 gal → 4 cups powder)',
    derivation: 'Used exactly as published. No conversion applied.',
    yieldSourceUrls: [PSR_MILK],
    secondaryOnly: true,
    perTray: null,
    caution:
      'The only yield figure for milk is secondary-tier. The per-tray figure the same source publishes is for whole milk, so it is not applied to skim.',
  },
  {
    id: 'eggs-raw',
    label: 'Eggs — raw',
    group: DAIRY,
    yieldKind: 'count-only',
    yieldLow: null,
    yieldHigh: null,
    publishedAs: '~8–9 eggs per cup powder; 32–36 eggs per quart',
    derivation:
      'Not converted. This is a count-to-volume figure, not a weight yield, and no source publishes the egg weight it assumed.',
    yieldSourceUrls: [PSR_EGGS],
    secondaryOnly: true,
    perTray: null,
    caution:
      'Suitability is contradicted between sources: suitable per manufacturers, advised against by Utah State University Extension, which states Salmonella survives freeze-drying and recommends pasteurized liquid egg or fully cooked scrambled egg instead.',
  },
  NOT_PUBLISHED('eggs-cooked', 'Eggs — cooked / scrambled', DAIRY, 'Not published'),
  NOT_PUBLISHED('milk-raw', 'Milk — raw', DAIRY, 'Not published'),
  NOT_PUBLISHED('cheese', 'Cheese', DAIRY, 'Not published'),
  NOT_PUBLISHED('yogurt', 'Yogurt', DAIRY, 'Not published'),
  NOT_PUBLISHED('ice-cream', 'Ice cream', DAIRY, 'Not published'),
  NOT_PUBLISHED('protein-powder', 'Protein powder', DAIRY, 'Not published'),

  {
    id: 'strawberries',
    label: 'Strawberries',
    group: FRUIT,
    yieldKind: 'ratio',
    yieldLow: 0.1,
    yieldHigh: 0.125,
    publishedAs: '~8–10 kg fresh : 1 kg dried, varies by spec',
    derivation:
      'Converted on this page from the published ratio: 1 ÷ 10 = 10.0% and 1 ÷ 8 = 12.5%. Arithmetic on the published figure only.',
    yieldSourceUrls: [FRUITBUYS],
    secondaryOnly: true,
    perTray: null,
    caution:
      'No primary-tier strawberry yield figure exists. The published ratio comes from a commercial supplier’s buying guide, and that source states it varies by spec.',
  },
  NOT_PUBLISHED('bananas', 'Bananas', FRUIT),
  NOT_PUBLISHED('blueberries', 'Blueberries', FRUIT),
  NOT_PUBLISHED('apples', 'Apples', FRUIT),
  NOT_PUBLISHED('avocado', 'Avocado', FRUIT),
  NOT_PUBLISHED(
    'citrus',
    'Citrus — orange, lemon, lime',
    FRUIT,
    'No source found',
    'No manufacturer or extension source addresses freeze-drying citrus at all. Only dehydration guidance exists.',
  ),
  NOT_PUBLISHED('watermelon', 'Watermelon', FRUIT),

  NOT_PUBLISHED('mushrooms', 'Mushrooms', VEG),
  {
    id: 'potatoes',
    label: 'Potatoes',
    group: VEG,
    yieldKind: 'not-published',
    yieldLow: null,
    yieldHigh: null,
    publishedAs: 'No source found. Load-density note only.',
    derivation: '',
    yieldSourceUrls: [],
    secondaryOnly: false,
    perTray: { published: '3 lbs of potatoes per tray', unit: 'lb', low: 3, high: 3, sourceUrl: MHH_POTATO },
    caution:
      'A tray count is available for potatoes because a load density is published for them. A dried weight is not: no yield figure for potatoes exists at any tier.',
  },
  NOT_PUBLISHED('rice', 'Rice', VEG),
  NOT_PUBLISHED('beans', 'Beans', VEG),
  NOT_PUBLISHED('herbs', 'Herbs', VEG),
  NOT_PUBLISHED('bread', 'Bread', VEG),

  NOT_PUBLISHED('meat-raw', 'Meat — raw', MEAT),
  NOT_PUBLISHED('meat-cooked', 'Meat — cooked', MEAT),
  NOT_PUBLISHED('cooked-meals', 'Cooked meals — stew, casserole, pasta', MEAT),
  NOT_PUBLISHED('pet-food', 'Pet food from scraps', MEAT),

  NO_COLUMN('candy-gummy', 'Gummy candy'),
  NO_COLUMN(
    'candy-hard',
    'Hard candy — Jolly Ranchers, Skittles',
    'Suitability is contradicted within Harvest Right’s own guidance: documented on its candy pages, flagged as problematic in its general guide.',
  ),
  NO_COLUMN('candy-taffy', 'Taffy'),
  NO_COLUMN('candy-marshmallow', 'Marshmallow'),
];

export const DEFAULT_FOOD_ID = 'strawberries';
export const DEFAULT_FRESH_LB = 10;
export const DEFAULT_MACHINE: MachineSize = 'Large';

/* ------------------------------------------------------------------ *
 * Trays and batches — R2 Table 3
 * ------------------------------------------------------------------ */

export const MACHINE_SIZES = ['Small', 'Medium', 'Large', 'X-Large'] as const;
export type MachineSize = (typeof MACHINE_SIZES)[number];

export interface MachineCapacity {
  publisher: string;
  sizes: { label: MachineSize; lowLb: number | null; highLb: number | null; note?: string }[];
  condition: string;
  sourceUrl: string;
}

export const MACHINE_CAPACITY: MachineCapacity[] = [
  {
    publisher: 'Harvest Right (current FAQ)',
    sizes: [
      { label: 'Small', lowLb: 6, highLb: 10 },
      { label: 'Medium', lowLb: 10, highLb: 15 },
      { label: 'Large', lowLb: 18, highLb: 27 },
      { label: 'X-Large', lowLb: 40, highLb: 50 },
    ],
    condition: 'Fresh food per batch.',
    sourceUrl: HR_FAQ,
  },
  {
    publisher: 'Utah State University Extension (2019)',
    sizes: [
      { label: 'Small', lowLb: 4, highLb: 7 },
      { label: 'Medium', lowLb: 7, highLb: 10 },
      { label: 'Large', lowLb: 12, highLb: 16 },
      { label: 'X-Large', lowLb: null, highLb: null, note: 'Not published' },
    ],
    condition: 'Published 2019. Materially lower than the manufacturer figures.',
    sourceUrl: USU_BUYING,
  },
  {
    publisher: 'Blue Alpine',
    sizes: [
      { label: 'Small', lowLb: null, highLb: null, note: 'Not published' },
      { label: 'Medium', lowLb: 8, highLb: 16 },
      { label: 'Large', lowLb: 14, highLb: 24 },
      { label: 'X-Large', lowLb: null, highLb: null, note: 'Not published' },
    ],
    condition: 'Published per batch.',
    sourceUrl: BLUE_ALPINE,
  },
  {
    publisher: 'Prep4Life (The Cube)',
    sizes: [
      { label: 'Small', lowLb: null, highLb: null, note: '“12–16 Food Servings Per Batch” — no pound figure' },
      { label: 'Medium', lowLb: null, highLb: null, note: 'Not published' },
      { label: 'Large', lowLb: null, highLb: null, note: 'Not published' },
      { label: 'X-Large', lowLb: null, highLb: null, note: 'Not published' },
    ],
    condition: 'Servings only. The spec page is image-only and its numbers are not extractable.',
    sourceUrl: PREP4LIFE,
  },
];

export const TRAY_AREA = {
  rows: [
    { label: 'Small' as MachineSize, sqin: 434 },
    { label: 'Medium' as MachineSize, sqin: 675 },
    { label: 'Large' as MachineSize, sqin: 1107 },
    { label: 'X-Large' as MachineSize, sqin: 2251 },
  ],
  sourceUrl: HR_FAQ,
};

export const LOADING_DEPTH = [
  {
    text: 'Arrange food in a single layer on the trays, with about ¾ of the tray height as a good general guide.',
    publisher: 'Harvest Right',
    sourceUrl: HR_TIPS,
  },
  { text: 'Cut food so pieces are no thicker than the tray height.', publisher: 'Harvest Right', sourceUrl: HR_PREP },
  {
    text: 'Food should not be higher than the lip of the tray.',
    publisher: 'University of Arizona Cooperative Extension',
    sourceUrl: ARIZONA,
  },
  { text: 'Spread the food in a single layer.', publisher: 'University of Minnesota Extension', sourceUrl: UMN },
];

export const TRAY_DIMENSIONS = [
  { label: 'Harvest Right, Large', dims: '20.5 in L × 9 in W × 0.75 in H', sourceUrl: HR_TRAYS },
  { label: 'Stay Fresh', dims: '8 in W × 20 in D × 0.75 in H', sourceUrl: STAYFRESH_MANUAL },
];

/**
 * Harvest Right publishes two positions on whether pieces may touch. Recorded
 * side by side, not reconciled, and neither is preferred.
 */
export const SINGLE_LAYER_POSITIONS = [
  { text: 'Pieces can touch, so you don’t need to leave space between every piece.', sourceUrl: HR_TIPS },
  {
    text: 'Place food in a single layer on each tray. Corn, beans, and peas can be slightly layered; other veggies should be in a single layer.',
    sourceUrl: HR_PREP,
  },
];

/**
 * No source publishes a tray count per machine size. The one "set of 6" figure
 * in the pack is a retailer's pack quantity for replacement trays, not a
 * machine's tray count, and is deliberately not used.
 */
export const TRAY_COUNT_PER_MACHINE = null;

/* ------------------------------------------------------------------ *
 * Bags and absorbers — R3 Module 2
 * ------------------------------------------------------------------ */

export function plannerContainers(): AbsorberContainer[] {
  return PLANNER_CONTAINER_IDS.map((id) => ABSORBER_CONTAINERS.find((c) => c.id === id)).filter(
    (c): c is AbsorberContainer => Boolean(c),
  );
}

export function recommendationsFor(containerId: string): AbsorberRecommendation[] {
  return ABSORBER_RECOMMENDATIONS.filter((r) => r.containerId === containerId);
}

export const ONE_PER_BAG = {
  text: 'Drop one absorber into each bag right before sealing.',
  publisher: 'Wallaby Goods',
  sourceUrl: ONE_PER_BAG_URL,
  caveat:
    'If you are unsure, use one slightly larger absorber — not doubling up. No manufacturer publishes a mechanism for the one-per-bag rule; it is published as practice only.',
  caveatSourceUrl: ONE_PER_BAG_CAVEAT_URL,
};

/**
 * Why the tool asks for a bag count instead of computing one. Stated in one
 * place so no caller can accidentally invent the conversion.
 */
export const BAGS_NOT_DERIVABLE =
  'A bag count cannot be calculated from a weight. Doing it needs the bulk density of freeze-dried food and the measured interior volume of the bag, and neither is published by any source in either research pack. PackFreshUSA states its own quart bags “hold more than a quart”, so a bag’s printed size is not its volume either. This tool asks how many bags you intend to fill rather than inventing the conversion.';

/* ------------------------------------------------------------------ *
 * Required section: what we could not source
 * ------------------------------------------------------------------ */

export const COULD_NOT_SOURCE: { what: string; detail: string; sourceUrl: string }[] = [
  {
    what: 'A fresh-to-dried yield figure for almost every food.',
    detail:
      'No extension service publishes a yield figure for any food. Across R2’s whole per-food table three figures exist anywhere: whole milk ≈20%, skim ≈16%, and strawberries at roughly 8–10:1. All three are secondary-tier. Per-food searches for bananas, blueberries, apples, avocado, citrus, watermelon, mushrooms, potatoes, rice, beans, herbs, bread, meat, cooked meals and pet food returned nothing at any tier. This tool returns Not published for those foods rather than estimating.',
    sourceUrl: FRUITBUYS,
  },
  {
    what: 'The bulk density of freeze-dried food.',
    detail:
      'Nothing in either pack converts a dried weight into a volume, so a dried weight cannot become a number of bags. That is why bag count is an input here, not an output.',
    sourceUrl: PSR_MILK,
  },
  {
    what: 'Measured interior volumes for common mylar bag sizes.',
    detail:
      'Nobody publishes them, and PackFreshUSA states its own quart bags hold more than a quart. The planner works from published container volumes and does not claim that any bag we sell equals one of them.',
    sourceUrl: ONE_PER_BAG_CAVEAT_URL,
  },
  {
    what: 'A pounds-per-tray figure, in general.',
    detail:
      'No manufacturer or extension source publishes a general load weight per tray. The only two figures are per-food and secondary tier: about 3–4 cups of whole milk per tray, and 3 lbs of potatoes per tray. Every other food is planned in whole batches here.',
    sourceUrl: MHH_POTATO,
  },
  {
    what: 'A tray count for each machine size.',
    detail:
      'Neither pack publishes how many trays a Small, Medium, Large or X-Large machine holds. Tray area per machine is published; tray count is not, and one cannot be divided out of the other without a tray dimension for every size.',
    sourceUrl: HR_FAQ,
  },
  {
    what: 'Agreement on how much fresh food fits in a batch.',
    detail:
      'Harvest Right, Utah State University Extension and Blue Alpine publish materially different per-batch capacities for the same machine sizes, and Prep4Life publishes servings rather than pounds. All four are shown side by side. None is preferred, and no average is taken.',
    sourceUrl: USU_BUYING,
  },
  {
    what: 'A freeze-dried food class from most absorber publishers.',
    detail:
      'Impak, Wallaby and O-Busters stop at pasta and less dense foods and publish no freeze-dried class at all. No manufacturer publishes a per-food freeze-dried cc rating, including the freeze-dryer OEMs, and none is constructed here.',
    sourceUrl: ONE_PER_BAG.sourceUrl,
  },
  {
    what: 'A mechanism for one absorber per bag.',
    detail:
      'Several suppliers publish the practice. None publishes a reason for it. It is shown here as practice, not as physics.',
    sourceUrl: ONE_PER_BAG.caveatSourceUrl,
  },
];

/* ------------------------------------------------------------------ *
 * Arithmetic. Shared by the server-rendered default and the client.
 * ------------------------------------------------------------------ */

export interface Range {
  low: number;
  high: number;
}

export interface Derived<T> {
  value: T;
  /** the arithmetic, written out, so the page never prints a bare number */
  workings: string;
  sourceUrls: string[];
  secondaryOnly: boolean;
}

export interface Unavailable {
  unavailable: true;
  reason: string;
}

export function isUnavailable<T>(r: Derived<T> | Unavailable): r is Unavailable {
  return (r as Unavailable).unavailable === true;
}

export const foodById = (id: string): FoodRow | undefined => FOODS.find((f) => f.id === id);

const round = (n: number, dp = 2) => Math.round(n * 10 ** dp) / 10 ** dp;
const pct = (f: number) => `${round(f * 100, 1)}%`;

/** Expected dried weight, in whatever unit the fresh amount was given in. */
export function driedWeight(food: FoodRow, fresh: number): Derived<Range> | Unavailable {
  if (food.yieldLow === null || food.yieldHigh === null) {
    return {
      unavailable: true,
      reason:
        food.yieldKind === 'count-only'
          ? `Not published as a weight yield. The published figure is ${food.publishedAs} — a count conversion, which cannot be applied to a weight.`
          : food.yieldKind === 'no-column'
            ? 'Not published. R2 Table 1 records expansion for candy, not yield, so there is no figure to apply.'
            : 'Not published. No source at any tier publishes a fresh-to-dried yield for this food.',
    };
  }
  const low = round(fresh * food.yieldLow);
  const high = round(fresh * food.yieldHigh);
  return {
    value: { low, high },
    workings:
      food.yieldLow === food.yieldHigh
        ? `${fresh} × ${pct(food.yieldLow)} = ${low}`
        : `${fresh} × ${pct(food.yieldLow)} = ${low}, and ${fresh} × ${pct(food.yieldHigh)} = ${high}`,
    sourceUrls: food.yieldSourceUrls,
    secondaryOnly: food.secondaryOnly,
  };
}

/** Trays, only where a per-tray load density is published for this food. */
export function traysNeeded(
  food: FoodRow,
  fresh: number,
  unit: 'lb' | 'cups',
): Derived<Range> | Unavailable {
  if (!food.perTray) {
    return {
      unavailable: true,
      reason:
        'Not published. No source publishes a load weight per tray for this food, and no source publishes a general pounds-per-tray figure. Plan in whole batches instead.',
    };
  }
  if (food.perTray.unit !== unit) {
    return {
      unavailable: true,
      reason: `The published load density for this food is in ${food.perTray.unit} — “${food.perTray.published}”. Enter the fresh amount in ${food.perTray.unit} to use it.`,
    };
  }
  const low = Math.ceil(fresh / food.perTray.high);
  const high = Math.ceil(fresh / food.perTray.low);
  return {
    value: { low, high },
    workings:
      food.perTray.low === food.perTray.high
        ? `${fresh} ÷ ${food.perTray.low} = ${round(fresh / food.perTray.low)}, rounded up to ${high}`
        : `${fresh} ÷ ${food.perTray.high} = ${round(fresh / food.perTray.high)} and ${fresh} ÷ ${food.perTray.low} = ${round(fresh / food.perTray.low)}, rounded up to ${low}–${high}`,
    sourceUrls: [food.perTray.sourceUrl],
    secondaryOnly: true,
  };
}

export interface BatchEstimate {
  publisher: string;
  size: MachineSize;
  low: number | null;
  high: number | null;
  note: string;
  capacity: string;
  workings: string;
  condition: string;
  sourceUrl: string;
}

/** Whole batches by machine size, one row per publisher. Never averaged. */
export function batchesNeeded(freshLb: number, size: MachineSize): BatchEstimate[] {
  return MACHINE_CAPACITY.map((cap) => {
    const row = cap.sizes.find((s) => s.label === size)!;
    if (row.lowLb === null || row.highLb === null) {
      return {
        publisher: cap.publisher,
        size,
        low: null,
        high: null,
        note: row.note ?? 'Not published',
        capacity: row.note ?? 'Not published',
        workings: '',
        condition: cap.condition,
        sourceUrl: cap.sourceUrl,
      };
    }
    const low = Math.ceil(freshLb / row.highLb);
    const high = Math.ceil(freshLb / row.lowLb);
    return {
      publisher: cap.publisher,
      size,
      low,
      high,
      note: '',
      capacity: `${row.lowLb}–${row.highLb} lb per batch`,
      workings: `${freshLb} ÷ ${row.highLb} = ${round(freshLb / row.highLb)} and ${freshLb} ÷ ${row.lowLb} = ${round(freshLb / row.lowLb)}, rounded up to ${low}–${high}`,
      condition: cap.condition,
      sourceUrl: cap.sourceUrl,
    };
  });
}

export interface AbsorberPlanRow {
  container: AbsorberContainer;
  bags: number;
  /** one absorber per bag, per published practice */
  absorbers: number;
  workings: string;
  recommendations: AbsorberRecommendation[];
}

export function absorberPlan(bagCounts: Record<string, number>): AbsorberPlanRow[] {
  return plannerContainers().map((container) => {
    const bags = Math.max(0, Math.floor(bagCounts[container.id] ?? 0));
    return {
      container,
      bags,
      absorbers: bags,
      workings: `${bags} × 1 absorber per bag = ${bags}`,
      recommendations: recommendationsFor(container.id),
    };
  });
}

export const totalAbsorbers = (rows: AbsorberPlanRow[]): number =>
  rows.reduce((sum, r) => sum + r.absorbers, 0);

export const range = (r: Range, unit = ''): string =>
  (r.low === r.high ? `${r.low}` : `${r.low}–${r.high}`) + (unit ? ` ${unit}` : '');

export const DISCLOSURE =
  'Sublime Pantry has no affiliate relationships, sponsorships, or paid placements as of publication. We sell packaging; where a product we sell appears, it is labeled.';
