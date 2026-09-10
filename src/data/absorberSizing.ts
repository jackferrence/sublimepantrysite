/**
 * absorberSizing.ts — single source of truth for the oxygen-absorber sizing data.
 *
 * Consumed by BOTH:
 *   - src/components/AbsorberCalculator.astro   (the /tools/absorber-calculator tool)
 *   - src/components/AbsorberSizingTable.astro  (the sourced comparison table)
 *
 * Neither component may hard-code a cc figure, a container volume, a percentage
 * or a source URL. If a number is not in this file, it does not go on the page.
 *
 * PROVENANCE
 * All figures below are transcribed from research pack R3, Module 2
 * (Table 2 — Oxygen absorbers), sections 3O-A, 3O-B and 3O-C.
 * Source IDs are the pack's O-series. accessDate for every source is 2026-09-06.
 *
 * RULES ENCODED HERE
 *  - No figure appears without a sourceId.
 *  - No figure appears without the condition its publisher attached to it.
 *    Where the publisher attached no condition, `condition` says so explicitly.
 *  - Where manufacturers disagree, every published value is kept. Nothing is
 *    averaged, reconciled, preferred or ranked.
 *  - Nothing in this file expresses or implies a shelf life.
 */

/* ------------------------------------------------------------------ *
 * Sources
 * ------------------------------------------------------------------ */

export type SourceTier = 'primary' | 'secondary';

export interface AbsorberSource {
  /** Pack source ID, e.g. "O1". */
  readonly id: string;
  readonly title: string;
  readonly url: string;
  readonly publisher: string;
  readonly tier: SourceTier;
  /** ISO date the pack accessed the source. */
  readonly accessDate: string;
}

export const ACCESS_DATE = '2026-09-06' as const;

export const SOURCES = [
  {
    id: 'O1',
    title: 'Learn',
    url: 'https://packfreshusa.com/learn-new/',
    publisher: 'PackFreshUSA',
    tier: 'primary',
    accessDate: ACCESS_DATE,
  },
  {
    id: 'O3',
    title: 'Oxygen Absorber – The Myth, The Legend',
    url: 'https://packfreshusa.com/blog/oxygen-absorber-the-myth-the-legend/',
    publisher: 'PackFreshUSA',
    tier: 'primary',
    accessDate: ACCESS_DATE,
  },
  {
    id: 'O4',
    title: 'Oxygen Absorbers Explained: Why Freeze-dried Foods Need Them',
    url: 'https://packfreshusa.com/blog/oxygen-absorbers-explained-why-freezedried-foods-need-them-the-dos-donts-and-why-it-matters/',
    publisher: 'PackFreshUSA',
    tier: 'primary',
    accessDate: ACCESS_DATE,
  },
  {
    id: 'O8',
    title: 'Myths & Misconceptions: Oxygen Absorbers & Mylar Bags',
    url: 'https://packfreshusa.com/blog/myths-misconceptions-oxygen-absorbers-mylar-bags/',
    publisher: 'PackFreshUSA',
    tier: 'primary',
    accessDate: ACCESS_DATE,
  },
  {
    id: 'O9',
    title: 'StayFresh Oxygen Absorbers – Measuring Volume of Space',
    url: 'https://www.sorbentsystems.com/o2absorbers_1.html',
    publisher: 'Impak Corporation / Sorbent Systems',
    tier: 'primary',
    accessDate: ACCESS_DATE,
  },
  {
    id: 'O10',
    title: 'How to Determine Oxygen Absorber Capacity',
    url: 'https://www.sorbentsystems.com/fake500.html',
    publisher: 'Impak Corporation / Sorbent Systems',
    tier: 'primary',
    accessDate: ACCESS_DATE,
  },
  {
    id: 'O11',
    title: 'Oxygen Absorbers (Facts PDF)',
    url: 'https://www.sorbentsystems.com/Oxygen_Absorber_Facts.pdf',
    publisher: 'Impak Corporation / Sorbent Systems',
    tier: 'primary',
    accessDate: ACCESS_DATE,
  },
  {
    id: 'O14',
    title: 'StayFresh Oxygen Absorber Packets USA',
    url: 'https://www.impakcorporation.com/oxygen_absorbers/packets',
    publisher: 'Impak Corporation',
    tier: 'primary',
    accessDate: ACCESS_DATE,
  },
  {
    id: 'O15',
    title: 'Oxygen Absorbers – O-Busters',
    url: 'https://www.agmcontainer.com/product/oxygen-absorbers/',
    publisher: 'AGM Container Controls',
    tier: 'primary',
    accessDate: ACCESS_DATE,
  },
  {
    id: 'O19',
    title: 'Comprehensive Oxygen Absorber Size Chart for Long-Term Food Storage',
    url: 'https://wallabygoods.com/blogs/news/comprehensive-oxygen-absorber-size-chart-for-long-term-food-storage',
    publisher: 'Wallaby Goods',
    tier: 'primary',
    accessDate: ACCESS_DATE,
  },
  {
    id: 'O20',
    title: 'Oxygen Absorbers for Mylar Food Storage [300-500cc]',
    url: 'https://wallabygoods.com/products/300-500cc-oxygen-absorbers',
    publisher: 'Wallaby Goods',
    tier: 'primary',
    accessDate: ACCESS_DATE,
  },
  {
    id: 'O22',
    title: 'How to Use Oxygen Absorbers with Mylar Bags',
    url: 'https://wallabygoods.com/blogs/news/how-to-use-oxygen-absorbers-with-mylar-bags',
    publisher: 'Wallaby Goods',
    tier: 'primary',
    accessDate: ACCESS_DATE,
  },
  {
    id: 'O23',
    title: 'Technical Reference Guide (Oxygen Absorbers)',
    url: 'https://discountmylarbags.com/technical-reference-guide-oxygen-absorbers/',
    publisher: 'Discount Mylar Bags',
    tier: 'primary',
    accessDate: ACCESS_DATE,
  },
  {
    id: 'O24',
    title: 'OxyFree Oxygen Absorbers – 300cc & 2000cc Packs',
    url: 'https://discountmylarbags.com/oxyfree-oxygen-absorbers-300cc-2000cc-packs-high-capacity-food-grade-storage/',
    publisher: 'Discount Mylar Bags (OxyFree)',
    tier: 'primary',
    accessDate: ACCESS_DATE,
  },
  {
    id: 'O25',
    title: 'Oxyfree Slow-Acting Oxygen Absorbers (100cc, 300cc, 500cc, 2000cc)',
    url: 'https://discountmylarbags.com/oxyfree-slow-acting-oxygen-absorbers-100cc-300cc-500cc-2000cc/',
    publisher: 'Discount Mylar Bags (OxyFree)',
    tier: 'primary',
    accessDate: ACCESS_DATE,
  },
  {
    id: 'O27',
    title: "FAQ's for Oxygen absorbers",
    url: 'https://dryndry.com/pages/oxygen-absorbers',
    publisher: 'Dry & Dry',
    tier: 'primary',
    accessDate: ACCESS_DATE,
  },
  {
    id: 'O28',
    title: '50-Pack Oxygen Absorbers',
    url: 'https://harvestright.com/product/oxygen-absorbers-50-pack/',
    publisher: 'Harvest Right',
    tier: 'primary',
    accessDate: ACCESS_DATE,
  },
  {
    id: 'O30',
    title: 'Oxygen Absorbers (extension fact sheet, Oct 2011, C. Washburn)',
    url: 'https://digitalcommons.usu.edu/cgi/viewcontent.cgi?article=1196&context=extension_curall',
    publisher: 'Utah State University Extension',
    tier: 'secondary',
    accessDate: ACCESS_DATE,
  },
  {
    id: 'O33',
    title: 'How to Choose Oxygen Absorber Size & Use with Mylar Bags',
    url: 'https://www.oxygen-absorbers.com/blog/choosing-right-oxygen-absorber-size-mylar-bags',
    publisher: 'Oxygen-Absorbers.com (OxySorb)',
    tier: 'primary',
    accessDate: ACCESS_DATE,
  },
] as const satisfies readonly AbsorberSource[];

export type SourceId = (typeof SOURCES)[number]['id'];

const SOURCE_INDEX: ReadonlyMap<SourceId, AbsorberSource> = new Map(
  SOURCES.map((s) => [s.id, s as AbsorberSource]),
);

export function getSource(id: SourceId): AbsorberSource {
  const s = SOURCE_INDEX.get(id);
  if (!s) throw new Error(`absorberSizing: unknown source id "${id}"`);
  return s;
}

/* ------------------------------------------------------------------ *
 * Containers
 * ------------------------------------------------------------------ */

export type ContainerId = 'pint' | 'quart' | 'half-gallon' | 'gallon' | 'five-gallon';

export interface ContainerSpec {
  readonly id: ContainerId;
  readonly label: string;
  /** Total air volume in cc when empty. */
  readonly volumeCc: number;
  /**
   * 'published'  — the publisher printed this cc figure.
   * 'derived'    — arithmetic on a published figure (stated in volumeNote).
   */
  readonly volumeBasis: 'published' | 'derived';
  readonly volumeSources: readonly SourceId[];
  readonly volumeNote: string;
}

export const CONTAINERS = [
  {
    id: 'pint',
    label: 'Pint',
    volumeCc: 473,
    volumeBasis: 'published',
    volumeSources: ['O1'],
    volumeNote:
      'PackFreshUSA publishes the pint jar directly: “a pint jar is roughly 473ml which is 473cc’s.”',
  },
  {
    id: 'quart',
    label: 'Quart',
    volumeCc: 946,
    volumeBasis: 'derived',
    volumeSources: ['O1', 'O19'],
    volumeNote:
      'A quarter of PackFreshUSA’s published gallon figure of 3,785cc. No source in the pack prints a quart volume in cc directly.',
  },
  {
    id: 'half-gallon',
    label: 'Half-gallon',
    volumeCc: 1893,
    volumeBasis: 'derived',
    volumeSources: ['O1', 'O19'],
    volumeNote:
      'Half of PackFreshUSA’s published gallon figure of 3,785cc. No source in the pack prints a half-gallon volume, and no manufacturer in the pack publishes a half-gallon absorber recommendation at all.',
  },
  {
    id: 'gallon',
    label: 'Gallon',
    volumeCc: 3785,
    volumeBasis: 'published',
    volumeSources: ['O1'],
    volumeNote:
      'PackFreshUSA publishes the gallon directly: “A gallon container holds 3785cc’s of air.”',
  },
  {
    id: 'five-gallon',
    label: '5-gallon',
    volumeCc: 18942,
    volumeBasis: 'published',
    volumeSources: ['O9'],
    volumeNote:
      'Impak/Sorbent Systems publishes 18,942cc for a 5-gallon plastic pail. A 5-gallon bag is not the same vessel; this is the only published 5-gallon volume in the pack.',
  },
] as const satisfies readonly ContainerSpec[];

/* ------------------------------------------------------------------ *
 * Food air-content classes
 * ------------------------------------------------------------------ */

export type FoodClassId = 'dense' | 'powder' | 'porous';

export interface FoodClassSpec {
  readonly id: FoodClassId;
  readonly label: string;
  /** Fraction of the container that is air when filled with this class. */
  readonly airFraction: number;
  readonly airFractionLabel: string;
  readonly examples: string;
  readonly sources: readonly SourceId[];
  readonly quote: string;
  readonly quoteSource: SourceId;
}

/**
 * PackFreshUSA [O3] is the only source in the pack that publishes an explicit
 * three-tier air-volume scheme, and the only one that publishes a figure for
 * the freeze-dried tier at all. The three tiers below are its tiers.
 */
export const FOOD_CLASSES = [
  {
    id: 'dense',
    label: 'Dense — about 35% air',
    airFraction: 0.35,
    airFractionLabel: '35%',
    examples: 'Beans, rice, wheat, whole grains',
    sources: ['O3'],
    quote: 'Beans and rice only have about 35% air volume',
    quoteSource: 'O3',
  },
  {
    id: 'powder',
    label: 'Powder — about 50% air',
    airFraction: 0.5,
    airFractionLabel: '50%',
    examples: 'Flour, powdered milk, powdered eggs, sugar',
    sources: ['O1', 'O3'],
    quote: 'Flour is typically about 50% air just like dirt and many other powders',
    quoteSource: 'O1',
  },
  {
    id: 'porous',
    label: 'Bulky and porous — about 75% air',
    airFraction: 0.75,
    airFractionLabel: '75%',
    examples: 'Freeze-dried food, rolled oats, pasta',
    sources: ['O1', 'O3'],
    quote: 'Flour can be 50% air! Pastas can be 75% air!',
    quoteSource: 'O1',
  },
] as const satisfies readonly FoodClassSpec[];

/* ------------------------------------------------------------------ *
 * The oxygen fraction of air — five published values, unreconciled
 * ------------------------------------------------------------------ */

export interface OxygenFractionEntry {
  readonly value: number;
  readonly label: string;
  readonly sources: readonly SourceId[];
}

/**
 * The pack records five different published values for the oxygen fraction of
 * air, with two suppliers contradicting themselves across their own documents.
 * None is authoritative and none is preferred here.
 */
export const OXYGEN_FRACTIONS = [
  { value: 0.21, label: '21.0%', sources: ['O9'] },
  { value: 0.21, label: '21%', sources: ['O1', 'O3', 'O23'] },
  { value: 0.2095, label: '20.95%', sources: ['O23'] },
  { value: 0.205, label: '20.5%', sources: ['O10'] },
  { value: 0.2, label: '20%', sources: ['O15'] },
] as const satisfies readonly OxygenFractionEntry[];

/**
 * The fraction this calculator's arithmetic uses. 21% is the value the worked
 * examples in the pack use ([O1] and [O9] both multiply by .21), so using it
 * reproduces their own math rather than introducing a new one. The full spread
 * is shown on the page and the calculator reports the low/high band.
 */
export const CALC_OXYGEN_FRACTION = 0.21 as const;
export const CALC_OXYGEN_FRACTION_SOURCES: readonly SourceId[] = ['O1', 'O9'];

/** Lowest and highest published fractions, used to show the band. */
export const OXYGEN_FRACTION_MIN = 0.2 as const;
export const OXYGEN_FRACTION_MAX = 0.21 as const;

/* ------------------------------------------------------------------ *
 * Packet sizes actually sold
 * ------------------------------------------------------------------ */

/**
 * Packet sizes named by at least one source in the pack, either as a product or
 * inside a recommendation. Some of the larger values appear only as totals made
 * up of several packets (1,500cc as 3 x 500cc, 3,000cc as 30 x 100cc), so these
 * are "sizes the sources name", not a verified catalogue of what is on sale.
 * The calculator rounds up to the next one; it never rounds down and never
 * invents a size.
 */
export const PACKET_SIZES_CC: readonly number[] = [
  20, 50, 100, 200, 300, 500, 750, 1000, 1500, 2000, 2500, 3000,
];

/* ------------------------------------------------------------------ *
 * Published per-container recommendations (R3 § 3O-B)
 * ------------------------------------------------------------------ */

export interface PublishedRecommendation {
  readonly container: ContainerId;
  /** The tier the publisher named, or null if it published no food class. */
  readonly foodClass: FoodClassId | null;
  /** Human-readable cc figure exactly as published. */
  readonly cc: string;
  readonly publisher: string;
  readonly sources: readonly SourceId[];
  /** The condition the publisher attached — or a statement that it attached none. */
  readonly condition: string;
}

export const PUBLISHED_RECOMMENDATIONS = [
  /* ---------------- Pint ---------------- */
  {
    container: 'pint',
    foodClass: null,
    cc: '94.6cc',
    publisher: 'PackFreshUSA',
    sources: ['O1'],
    condition: 'Calculated for an empty pint jar (473cc ÷ 5), not a filled one.',
  },
  {
    container: 'pint',
    foodClass: null,
    cc: '20cc / 50cc',
    publisher: 'AGM O-Busters',
    sources: ['O15'],
    condition:
      'Indexed on void space, not food type: 20cc under 10% void, 50cc at 25% void or more. The 10–25% band is not published; do not interpolate it.',
  },
  {
    container: 'pint',
    foodClass: null,
    cc: '100cc',
    publisher: 'Discount Mylar Bags (OxyFree)',
    sources: ['O25'],
    condition: 'No food class stated.',
  },
  {
    container: 'pint',
    foodClass: null,
    cc: '100cc',
    publisher: 'Dry & Dry',
    sources: ['O27'],
    condition: 'No food class stated.',
  },
  {
    container: 'pint',
    foodClass: null,
    cc: '300cc',
    publisher: 'Wallaby Goods',
    sources: ['O20'],
    condition:
      'Wallaby disclaims its own chart: the figures are “only the average amount” and “you may need more or a smaller number.”',
  },

  /* ---------------- Quart ---------------- */
  {
    container: 'quart',
    foodClass: null,
    cc: '200cc',
    publisher: 'PackFreshUSA',
    sources: ['O1'],
    condition:
      'Their own arithmetic for a nominal quart. Their shipped quart sets use 300cc instead, because their quart bags hold more than a quart.',
  },
  {
    container: 'quart',
    foodClass: null,
    cc: '300cc',
    publisher: 'PackFreshUSA',
    sources: ['O1'],
    condition:
      'As actually supplied in their Mylar sets, on the stated grounds that their quart bags hold more than a quart.',
  },
  {
    container: 'quart',
    foodClass: null,
    cc: '50cc / 100cc',
    publisher: 'AGM O-Busters',
    sources: ['O15'],
    condition:
      'Indexed on void space: 50cc under 10% void, 100cc at 25% void or more. No intermediate band published.',
  },
  {
    container: 'quart',
    foodClass: null,
    cc: '300cc',
    publisher: 'Wallaby Goods',
    sources: ['O20'],
    condition: 'Chart disclaimed by its publisher as average figures only.',
  },
  {
    container: 'quart',
    foodClass: null,
    cc: '100–300cc',
    publisher: 'Discount Mylar Bags (OxyFree)',
    sources: ['O24', 'O25'],
    condition: 'No food class stated; the range is published as a range.',
  },
  {
    container: 'quart',
    foodClass: null,
    cc: '300cc',
    publisher: 'Dry & Dry',
    sources: ['O27'],
    condition: 'No food class stated.',
  },
  {
    container: 'quart',
    foodClass: null,
    cc: '50cc',
    publisher: 'Utah State University Extension',
    sources: ['O30'],
    condition:
      'Extension fact sheet dated October 2011; the current extension site publishes no cc figures at all.',
  },

  /* ---------------- Half-gallon ---------------- *
   * Deliberately empty. See HALF_GALLON_GAP below.                        */

  /* ---------------- Gallon ---------------- */
  {
    container: 'gallon',
    foodClass: null,
    cc: '800cc',
    publisher: 'PackFreshUSA',
    sources: ['O1'],
    condition:
      'Conditioned on an EMPTY gallon container. Their own text halves it to 400cc once the container is filled with flour.',
  },
  {
    container: 'gallon',
    foodClass: 'dense',
    cc: '300cc',
    publisher: 'PackFreshUSA',
    sources: ['O3'],
    condition: 'Column A of their three-tier scheme: beans and rice, about 35% air.',
  },
  {
    container: 'gallon',
    foodClass: 'powder',
    cc: '400cc',
    publisher: 'PackFreshUSA',
    sources: ['O3'],
    condition: 'Column B: flour and powders, about 50% air.',
  },
  {
    container: 'gallon',
    foodClass: 'porous',
    cc: '500cc',
    publisher: 'PackFreshUSA',
    sources: ['O3'],
    condition:
      'Column C: freeze-dried, oats and pasta, about 75% air. The same page presents “a gallon should use 300cc” as a myth it rejects.',
  },
  {
    container: 'gallon',
    foodClass: null,
    cc: '100cc / 300cc',
    publisher: 'AGM O-Busters',
    sources: ['O15'],
    condition:
      'Indexed on void space: 100cc under 10% void, 300cc at 25% void or more. No intermediate band published.',
  },
  {
    container: 'gallon',
    foodClass: null,
    cc: '400cc (400–500cc gusseted)',
    publisher: 'Wallaby Goods',
    sources: ['O20'],
    condition: 'Chart disclaimed by its publisher as average figures only.',
  },
  {
    container: 'gallon',
    foodClass: 'dense',
    cc: '300–400cc (3–4 × 100cc)',
    publisher: 'Wallaby Goods',
    sources: ['O19'],
    condition:
      'Published as a count of 100cc packets for dense foods — which contradicts the same publisher’s own one-absorber-per-bag instruction.',
  },
  {
    container: 'gallon',
    foodClass: null,
    cc: '300cc',
    publisher: 'Discount Mylar Bags (OxyFree)',
    sources: ['O24'],
    condition: 'No food class stated. A companion page gives 500cc for 1–2 gallons.',
  },
  {
    container: 'gallon',
    foodClass: 'dense',
    cc: '300cc',
    publisher: 'Discount Mylar Bags',
    sources: ['O23'],
    condition: 'Dense dry food below 10% moisture; the page also notes bag-to-bag OTR variation.',
  },
  {
    container: 'gallon',
    foodClass: 'porous',
    cc: '500cc',
    publisher: 'Discount Mylar Bags',
    sources: ['O23'],
    condition:
      'Published as “bulky / freeze-dried,” dry food below 10% moisture. The same page gives 500cc as the answer if you are unsure.',
  },
  {
    container: 'gallon',
    foodClass: null,
    cc: '500cc',
    publisher: 'Dry & Dry',
    sources: ['O27'],
    condition: 'No food class stated.',
  },
  {
    container: 'gallon',
    foodClass: null,
    cc: '300cc',
    publisher: 'Utah State University Extension',
    sources: ['O30'],
    condition: 'Fact sheet dated October 2011.',
  },
  {
    container: 'gallon',
    foodClass: null,
    cc: '700cc',
    publisher: 'Harvest Right',
    sources: ['O28'],
    condition:
      'The only condition Harvest Right attaches is “for use in gallon-size Mylar bags.” No food class, no fill level. It is the highest gallon figure in the pack apart from PackFreshUSA’s empty-container 800cc, and the pack flags it as an outlier with a thin condition.',
  },

  /* ---------------- 5-gallon ---------------- */
  {
    container: 'five-gallon',
    foodClass: null,
    cc: '750cc',
    publisher: 'Impak / Sorbent Systems',
    sources: ['O9'],
    condition:
      'Not a 5-gallon rating. It is conditioned on 35 lb of rice filling the pail, leaving 3,066cc of residual air. Comparing it with a 2,000cc bucket recommendation is an error.',
  },
  {
    container: 'five-gallon',
    foodClass: null,
    cc: '500cc / 750cc',
    publisher: 'AGM O-Busters',
    sources: ['O15'],
    condition:
      'Indexed on void space: 500cc under 10% void, 750cc at 25% void or more. No intermediate band published.',
  },
  {
    container: 'five-gallon',
    foodClass: 'dense',
    cc: '2,000cc (20 × 100cc)',
    publisher: 'Wallaby Goods',
    sources: ['O19'],
    condition: 'Published as a packet count for dense foods; chart disclaimed as average figures.',
  },
  {
    container: 'five-gallon',
    foodClass: 'porous',
    cc: '2,500–3,000cc (25–30 × 100cc)',
    publisher: 'Wallaby Goods',
    sources: ['O19'],
    condition:
      'Published for “less dense” foods — the publisher’s chart stops at beans and pasta and names no freeze-dried class.',
  },
  {
    container: 'five-gallon',
    foodClass: null,
    cc: '2,000–2,500cc',
    publisher: 'Wallaby Goods',
    sources: ['O20'],
    condition: 'Product-page figure, no food class stated.',
  },
  {
    container: 'five-gallon',
    foodClass: null,
    cc: '2,000cc (or 7 × 300cc)',
    publisher: 'Discount Mylar Bags (OxyFree)',
    sources: ['O24'],
    condition: 'No food class stated.',
  },
  {
    container: 'five-gallon',
    foodClass: null,
    cc: '2,000–2,500cc',
    publisher: 'Discount Mylar Bags',
    sources: ['O23'],
    condition:
      'Dry food below 10% moisture. The same publisher says to use one 2,000cc rather than splitting the load.',
  },
  {
    container: 'five-gallon',
    foodClass: null,
    cc: '2,500cc',
    publisher: 'Dry & Dry',
    sources: ['O27'],
    condition: 'No food class stated.',
  },
  {
    container: 'five-gallon',
    foodClass: null,
    cc: '1,500cc (3 × 500cc)',
    publisher: 'Utah State University Extension',
    sources: ['O30'],
    condition:
      'Fact sheet dated October 2011, with the note that lining PETE buckets with mylar decreases oxygen exchange. It is 67% below Dry & Dry’s figure for the same container.',
  },
] as const satisfies readonly PublishedRecommendation[];

/**
 * No manufacturer or extension source in the pack publishes a half-gallon
 * recommendation. This is stated on the page rather than filled in.
 */
export const HALF_GALLON_GAP =
  'No manufacturer or extension source in the research pack publishes a half-gallon recommendation. The quart and gallon rows below bracket it; the calculated figure above is arithmetic on a derived container volume, not a published rating.' as const;

/* ------------------------------------------------------------------ *
 * The two PackFreshUSA passages that have to appear as body text
 * ------------------------------------------------------------------ */

export interface PackFreshNote {
  readonly id: 'particle-size' | 'quart-bags';
  readonly heading: string;
  readonly quote: string;
  readonly explanation: string;
  readonly source: SourceId;
}

/**
 * IMPORTANT (R3 § 1O correction 1): these are body prose surrounding the sizing
 * chart image on packfreshusa.com/learn-new/. They are NOT chart footnotes.
 * The chart is an image with no caption, asterisks or numbered notes. Do not
 * describe them as footnotes anywhere in the UI.
 */
export const PACKFRESH_NOTES = [
  {
    id: 'particle-size',
    heading: 'Particle size does not reduce the air volume',
    quote:
      'A pool filled with marbles will have the same interstitial air volume as one filled with basketballs.',
    explanation:
      'Grinding food finer, or choosing smaller pieces, does not shrink the air the absorber has to clear. The gaps between the pieces are what the absorber works on, and PackFreshUSA’s position is that those gaps do not change with particle size. The pack notes this holds geometrically only for identically shaped, similarly packed particles; mixed sizes let small pieces fill the gaps between large ones. No source in the pack tests the claim.',
    source: 'O1',
  },
  {
    id: 'quart-bags',
    heading: 'Their quart bags hold more than a quart, which is why quart sets ship 300cc',
    quote:
      '200cc worth of oxygen absorbers are actually enough for a quart container, but as our quart bags can hold more than a quart, we use 300ccs in our Mylar sets.',
    explanation:
      'The nominal name on a bag is not its internal volume. PackFreshUSA’s own arithmetic gives 200cc for a quart, and it ships 300cc anyway because the bag it sells is larger than its label. Nobody in the pack publishes measured internal volumes for common mylar bag sizes, so the same gap may exist in any bag you own.',
    source: 'O1',
  },
] as const satisfies readonly PackFreshNote[];

/* ------------------------------------------------------------------ *
 * The one-absorber rule, and what doubling actually does
 * ------------------------------------------------------------------ */

export interface RuleStatement {
  readonly position: string;
  readonly quote: string;
  readonly publisher: string;
  readonly sources: readonly SourceId[];
}

export const ONE_ABSORBER_RULE = {
  /** Sources that state the practice. */
  for: [
    {
      position: 'One per bag',
      quote: 'Drop one absorber into each bag right before sealing',
      publisher: 'Wallaby Goods',
      sources: ['O22'],
    },
    {
      position: 'Go up a size rather than doubling',
      quote: 'If you’re unsure, use one slightly larger absorber — not doubling up.',
      publisher: 'PackFreshUSA',
      sources: ['O4'],
    },
    {
      position: 'One large packet, not a split load',
      quote: 'For 5-gallon buckets, use one 2000cc rather than splitting',
      publisher: 'Discount Mylar Bags',
      sources: ['O23'],
    },
  ],
  /** Sources that state the opposite. */
  against: [
    {
      position: 'Split the load above 5 kg',
      quote:
        'For bags over 5 kg, consider using two smaller absorbers to ensure even oxygen removal.',
      publisher: 'Oxygen-Absorbers.com (OxySorb)',
      sources: ['O33'],
    },
    {
      position: 'Buy small and add more',
      quote:
        'if you are looking for a one size, get some 100cc or 200cc. These are more easily used and add more as needed',
      publisher: 'PackFreshUSA',
      sources: ['O3'],
    },
    {
      position: 'Charts published entirely as packet counts',
      quote: '20 × 100cc packets for a 5-gallon bucket',
      publisher: 'Wallaby Goods',
      sources: ['O19'],
    },
  ],
  /** Why adding a second packet does not buy anything. */
  whyDoublingDoesNothing: [
    {
      position: 'A packet stops when the oxygen is gone',
      quote: 'Excess absorbers are harmless—they simply won’t fully react.',
      publisher: 'Discount Mylar Bags',
      sources: ['O23'],
    },
    {
      position: 'Overage is not a risk, and not a benefit either',
      quote: 'There is no danger in adding too many as this does not affect the food.',
      publisher: 'Dry & Dry',
      sources: ['O27'],
    },
    {
      position: 'Rated capacity is a floor, not a ceiling',
      quote:
        'the capacity of the individual packet to absorb oxygen is the “number” associated with the packet',
      publisher: 'Impak / Sorbent Systems',
      sources: ['O10'],
    },
  ],
  /** The honest limit of the rule. */
  caveat:
    'No manufacturer in the research pack publishes a mechanism or a reason for the one-absorber rule. It exists in the sources only as a practice statement. Searches for a stated rationale are logged in the pack as unsourced.',
  /** Sources for what an absorber does not do. */
  notAVacuum: {
    position: 'An absorber does not vacuum the bag',
    quote:
      'Absorbers remove only the oxygen — about 21% of the air — leaving 79% remaining, so bags will not look vacuum-sealed.',
    publisher: 'PackFreshUSA',
    sources: ['O8'],
  },
} as const;

/* ------------------------------------------------------------------ *
 * Why the input is a container size and not a food weight
 * ------------------------------------------------------------------ */

export const SIZING_BASIS = {
  byVolume: [
    {
      position: 'Size on the air in the package',
      quote:
        'The size of oxygen absorber you need depends on the volume of air in the package into which it is placed.',
      publisher: 'Impak Corporation',
      sources: ['O14'],
    },
    {
      position: 'Each bag size holds different air',
      quote: 'Each bag size holds a different amount of air, so the absorber must match that volume.',
      publisher: 'Wallaby Goods',
      sources: ['O22'],
    },
    {
      position: 'cc is oxygen capacity, not food capacity',
      quote:
        'CC rating = oxygen-removal capacity — how much oxygen the absorber can remove, not how much food it protects.',
      publisher: 'PackFreshUSA',
      sources: ['O4'],
    },
  ],
  byWeight: [
    {
      position: 'One source sizes by food weight instead',
      quote: 'Rice 1 kg → 100cc; 2–3 kg → 200cc; 5 kg → 500cc; 10 kg → 1000cc',
      publisher: 'Oxygen-Absorbers.com (OxySorb)',
      sources: ['O33'],
    },
  ],
} as const;

/* ------------------------------------------------------------------ *
 * What the chart publishers say about their own charts
 * ------------------------------------------------------------------ */

export const CHART_DISCLAIMERS = [
  {
    quote: 'This Chart represents approximate cc sizes and should not be taken as a final authority.',
    publisher: 'Impak / Sorbent Systems',
    sources: ['O11'],
  },
  {
    quote:
      'The chart contains only the average amount of oxygen absorbers needed. Based on where you live and the atmosphere, you may need more or a smaller number.',
    publisher: 'Wallaby Goods',
    sources: ['O19'],
  },
] as const;

/* ------------------------------------------------------------------ *
 * Things the pack could not source (R3 § 7O)
 * ------------------------------------------------------------------ */

export const COULD_NOT_SOURCE: readonly string[] = [
  'A half-gallon absorber recommendation from any manufacturer or extension source.',
  'A cc figure for freeze-dried berries, or for any specific freeze-dried food. The closest published structures are PackFreshUSA’s 75%-air tier and Discount Mylar Bags’ “bulky / freeze-dried = 500cc” per gallon.',
  'A freeze-dried food class in the Impak, Wallaby or O-Busters charts. All three stop at pasta or “less dense” foods.',
  'A mechanism or stated reason for the one-absorber rule. It appears only as a practice statement.',
  'The 10–25% void-space band in the O-Busters chart. Only “under 10%” and “25% or more” are published; the middle is not, and interpolating it would be inventing a figure.',
  'A 20.9% oxygen figure. No manufacturer in the pack publishes it. The published values are 21%, 21.0%, 20.95%, 20.5% and 20%.',
  'Measured internal volumes for common mylar bag sizes. PackFreshUSA states its quart bags hold more than a quart; nobody publishes what any bag actually holds.',
  'Any freeze-dried-specific cc guidance from Harvest Right, despite it being the dominant home freeze-dryer manufacturer. Its only published figure is 700cc for gallon-size mylar bags.',
  'A regulator document naming oxygen absorber packets. The GRAS claim in the pack is a manufacturer assertion with no corroborating regulator source.',
];

/* ------------------------------------------------------------------ *
 * Calculation
 * ------------------------------------------------------------------ */

export interface SizingResult {
  readonly container: ContainerSpec;
  readonly foodClass: FoodClassSpec;
  /** Air left in the container once the food is in it, in cc. */
  readonly residualAirCc: number;
  /** Oxygen in that air at the calculator's fraction, in cc. */
  readonly oxygenCc: number;
  /** Oxygen at the lowest and highest published fractions, in cc. */
  readonly oxygenCcLow: number;
  readonly oxygenCcHigh: number;
  /** Next packet size at or above oxygenCc. Null if the demand exceeds the largest listed packet. */
  readonly packetCc: number | null;
  /** Published recommendations that apply to this container, class-matched first. */
  readonly published: readonly PublishedRecommendation[];
  /** True when no source publishes anything for this container. */
  readonly noPublishedFigures: boolean;
}

export function nextPacketSize(oxygenCc: number): number | null {
  for (const size of PACKET_SIZES_CC) {
    if (size >= oxygenCc) return size;
  }
  return null;
}

/**
 * Reproduces the arithmetic the sources themselves publish:
 *   residual air = container volume × the class's air fraction   [O1] [O3]
 *   oxygen       = residual air × the oxygen fraction of air     [O1] [O9]
 * then rounds up to the next packet size that someone actually sells.
 *
 * This is a calculation, not a manufacturer recommendation, and the UI must
 * label it as such. Published recommendations are returned alongside it,
 * unreconciled.
 */
export function calculateSizing(
  containerId: ContainerId,
  foodClassId: FoodClassId,
): SizingResult {
  const container = CONTAINERS.find((c) => c.id === containerId);
  const foodClass = FOOD_CLASSES.find((f) => f.id === foodClassId);
  if (!container) throw new Error(`absorberSizing: unknown container "${containerId}"`);
  if (!foodClass) throw new Error(`absorberSizing: unknown food class "${foodClassId}"`);

  const residualAirCc = container.volumeCc * foodClass.airFraction;
  const oxygenCc = residualAirCc * CALC_OXYGEN_FRACTION;

  const matching = PUBLISHED_RECOMMENDATIONS.filter((r) => r.container === containerId);
  const published = [
    ...matching.filter((r) => r.foodClass === foodClassId),
    ...matching.filter((r) => r.foodClass === null),
    ...matching.filter((r) => r.foodClass !== null && r.foodClass !== foodClassId),
  ];

  return {
    container,
    foodClass,
    residualAirCc,
    oxygenCc,
    oxygenCcLow: residualAirCc * OXYGEN_FRACTION_MIN,
    oxygenCcHigh: residualAirCc * OXYGEN_FRACTION_MAX,
    packetCc: nextPacketSize(oxygenCc),
    published,
    noPublishedFigures: matching.length === 0,
  };
}

/** Rows for AbsorberSizingTable.astro — every published figure, grouped by container. */
export function recommendationsByContainer(): ReadonlyArray<{
  container: ContainerSpec;
  rows: readonly PublishedRecommendation[];
}> {
  return CONTAINERS.map((container) => ({
    container,
    rows: PUBLISHED_RECOMMENDATIONS.filter((r) => r.container === container.id),
  }));
}

/** Every source cited by anything in this file, in ID order. */
export function citedSources(): readonly AbsorberSource[] {
  return SOURCES as readonly AbsorberSource[];
}
