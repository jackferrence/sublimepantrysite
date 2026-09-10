/**
 * /tools/running-cost — the single source of truth.
 *
 * Built from R1 (MACHINES) Table 3 — ENERGY. Every figure below is published by
 * the source named against it. Nothing here is averaged, interpolated,
 * reconciled, or filled in from an adjacent table.
 *
 * The whole point of this tool is a distinction R1 makes and the category does
 * not: a figure is CHECKABLE only if its publisher states BOTH the assumed
 * c/kWh rate AND the assumed cycle duration, so a reader can reproduce the
 * arithmetic. Of every home freeze dryer brand selling in the US under $5,000,
 * not one publishes a checkable energy cost claim [R1 s7.1.2]. So:
 *
 *   - CHECKABLE_KWH is the one published set a reader can re-derive. It is the
 *     calculator's prefill, and it is labelled as what it is.
 *   - MANUFACTURER_CLAIMS never enters the arithmetic. It is displayed, marked
 *     uncheckable, and that is all it is for.
 *
 * Both the calculator and any article that touches this material import from
 * here, so the two cannot drift.
 */

export interface Source {
  title: string;
  url: string;
  publisher: string;
  tier: 'primary' | 'secondary';
  accessDate: string;
}

/**
 * Cited as [n] where n is the 1-based position in this array — the same
 * convention the article schema uses. Order is stable; append, do not reorder.
 */
export const SOURCES: Source[] = [
  {
    title: 'How much electricity does a freeze dryer use? (May 1 2024)',
    url: 'https://stayfreshfreezedry.com/blogs/learn-about-freeze-drying/how-much-electricity-does-a-freeze-dryer-use',
    publisher: 'Stay Fresh Technology LLC',
    tier: 'primary',
    accessDate: '2026-09-06',
  },
  {
    title: 'Electricity Monthly Update — Retail Service by Customer Sector',
    url: 'https://www.eia.gov/electricity/monthly/update/end-use.php',
    publisher: 'U.S. Energy Information Administration',
    tier: 'primary',
    accessDate: '2026-09-06',
  },
  {
    title: 'Electric Power Annual, Table 2.10 — Average Price by End-Use Sector, by State, 2024 and 2023',
    url: 'https://www.eia.gov/electricity/annual/html/epa_02_10.html',
    publisher: 'U.S. Energy Information Administration',
    tier: 'primary',
    accessDate: '2026-09-06',
  },
  {
    title: 'Table 4 — 2024 Total Electric Industry, Average Retail Price (cents/kWh)',
    url: 'https://www.eia.gov/electricity/sales_revenue_price/pdf/table_4.pdf',
    publisher: 'U.S. Energy Information Administration',
    tier: 'primary',
    accessDate: '2026-09-06',
  },
  {
    title: 'How Much Does It Cost to Run a Freeze Dryer? (Jun 15 2026)',
    url: 'https://harvestright.com/blogs/freeze-drying-learning-center/freeze-dryer-cost-and-electricity',
    publisher: 'Harvest Right',
    tier: 'primary',
    accessDate: '2026-09-06',
  },
  {
    title: 'FAQs',
    url: 'https://harvestright.com/pages/faqs',
    publisher: 'Harvest Right',
    tier: 'primary',
    accessDate: '2026-09-06',
  },
  {
    title: 'FAQs',
    url: 'https://bluealpinefreezedryers.com/pages/faqs',
    publisher: 'Blue Alpine LLC',
    tier: 'primary',
    accessDate: '2026-09-06',
  },
  {
    title: 'Is a Freeze Dryer Worth It? Cost-Benefit Breakdown (Jul 07 2026)',
    url: 'https://bluealpinefreezedryers.com/blogs/all-about-freeze-drying/is-a-freeze-dryer-worth-the-investment',
    publisher: 'Blue Alpine LLC',
    tier: 'primary',
    accessDate: '2026-09-06',
  },
  {
    title: 'CUBE Home Freeze Dryer — landing page',
    url: 'https://p4lfood.com/pages/thecube-home-freeze-dryer',
    publisher: 'Prep4Life',
    tier: 'primary',
    accessDate: '2026-09-06',
  },
  {
    title: 'Basics of Home Freeze Drying, az2097a-2025 (Jan 2025)',
    url: 'https://www.extension.arizona.edu/sites/default/files/2025-03/az2097a-2025.pdf',
    publisher: 'University of Arizona Cooperative Extension',
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
    title: 'Harvest Right Freeze Dryer — Cost Analysis and Optimization (pub. 2018-06-23, mod. 2024-12-10)',
    url: 'https://commonsensehome.com/harvest-right-freeze-dryer/',
    publisher: 'Common Sense Home',
    tier: 'secondary',
    accessDate: '2026-09-06',
  },
  {
    title: 'Is Buying a Home Freeze-Dryer Worth the Money? (2022-09-21)',
    url: 'https://backpackinglight.com/home-freeze-dryer-worth-money/',
    publisher: 'Backpacking Light',
    tier: 'secondary',
    accessDate: '2026-09-06',
  },
  {
    title:
      'Electric Power Monthly, Table 5.6.A — Average Price of Electricity to Ultimate Customers by End-Use Sector, by State',
    url: 'https://www.eia.gov/electricity/monthly/epm_table_grapher.php?t=epmt_5_6_a',
    publisher: 'U.S. Energy Information Administration',
    tier: 'primary',
    accessDate: '2026-09-06',
  },
  {
    title: 'US Electricity Profile 2024 (State Electricity Profiles)',
    url: 'https://www.eia.gov/electricity/state/',
    publisher: 'U.S. Energy Information Administration',
    tier: 'primary',
    accessDate: '2026-09-06',
  },
];

/** 1-based citation index for a source, so prose never hard-codes a number. */
export function cite(url: string): number {
  const i = SOURCES.findIndex((s) => s.url === url);
  if (i < 0) throw new Error(`runningCost: no source registered for ${url}`);
  return i + 1;
}

const SF = SOURCES[0].url;
const EIA_MONTHLY = SOURCES[1].url;
const EIA_ANNUAL_210 = SOURCES[2].url;
const EIA_ANNUAL_T4 = SOURCES[3].url;
const HR_BLOG = SOURCES[4].url;
const HR_FAQ = SOURCES[5].url;
const BA_FAQ = SOURCES[6].url;
const BA_BLOG = SOURCES[7].url;
const P4L = SOURCES[8].url;
const AZ = SOURCES[9].url;
const USU = SOURCES[10].url;
const CSH = SOURCES[11].url;
const BPL = SOURCES[12].url;
const EIA_56A = SOURCES[13].url;
const EIA_PROFILES = SOURCES[14].url;

/* ------------------------------------------------------------------ *
 * The prefill: the one checkable published energy figure in the category
 * ------------------------------------------------------------------ */

export const CHECKABLE_KWH = {
  kwh: 18.5,
  /** Verbatim, because paraphrasing a figure like this is how it drifts. */
  wording: '18.5 kWh for a 24 hour freeze-drying cycle',
  publisher: 'Stay Fresh',
  docType: 'blog',
  published: '2024-05-01',
  sourceUrl: SF,
  /** The publisher's own stated inputs — what makes the figure checkable. */
  statedRateCents: 18,
  statedRateWording: 'As of now the national average electricity rate is 18 cents per kwh',
  statedHours: 24,
  publisherTotalUsd: 3.33,
  publisherArithmetic: '$0.09 + $2.16 + $1.08 = $3.33',
  /**
   * Every condition the publisher attached, and every caveat R1 recorded
   * against it. Displayed with the number, not filed away beneath it.
   */
  conditions: [
    'Generic, not model-specific — it describes "a freeze dryer", not a machine you can buy by name.',
    'Conditioned on a medium unit with an 8 lb load.',
    'The rate inside it is a May 2024 figure. It is stale against the EIA rate this tool prefills.',
    'Stay Fresh publishes the freeze phase as both "1-4 kWh" and "0.5 kWh" in the same article; the $3.33 total rests on the smaller figure.',
    'Stay Fresh’s own machine spec pages publish no watts, no kWh and no cost. This number lives on a blog.',
  ],
  /** Phase split as published, for readers who want to see the parts. */
  phases: [
    { name: 'Freeze (pre-chilled chamber)', kwh: 0.5, usd: 0.09, wording: '"$0.09" for "0.5 kWh" pre-chilled chamber' },
    { name: 'Main drying (~16 h)', kwh: 12, usd: 2.16, wording: '"12 kWh"; "about 16 hours"' },
    { name: 'Final drying (~7 h)', kwh: 6, usd: 1.08, wording: '"6 kWh"; "700-800W"; "7 hours"' },
  ],
} as const;

/* ------------------------------------------------------------------ *
 * Electricity rates — EIA only, and the two vintages kept apart
 * ------------------------------------------------------------------ */

export interface RateOption {
  /** Stable value used by the <select> and the no-JS default. */
  id: string;
  label: string;
  cents: number;
  /** Which EIA table this row came from. Never blended with the other. */
  vintage: 'monthly-2026-06' | 'annual-2024';
  sourceUrl: string;
  note?: string;
}

export const MONTHLY_US = {
  cents: 18.34,
  period: 'June 2026',
  releaseDate: '2026-08-26',
  yoyChange: '+5.0%',
  sector: 'residential',
  sourceUrl: EIA_MONTHLY,
  caution:
    'This is the US national average for the single month of June 2026, from EIA’s monthly preliminary series. Monthly residential prices are seasonal. A June figure is not an annual figure.',
} as const;

export const ANNUAL_US = {
  cents: 16.48,
  priorYearCents: 16.0,
  dataYear: 2024,
  sourceUrls: [EIA_ANNUAL_210, EIA_ANNUAL_T4],
} as const;

/**
 * The state rows R1 recorded from EIA's annual state tables, and only those.
 *
 * EIA publishes all 50 states plus DC in Tables 2.10 and 4; R1 extracted the
 * five highest, the five lowest, the two next in each direction, DC, and the
 * US total. Those are the rows below. A state not listed here is not a state
 * without a published rate — it is a rate this pack did not record, and the
 * dropdown says so rather than interpolating one.
 *
 * Census-division subtotals (New England 27.68, Middle Atlantic 20.63,
 * Pacific Contiguous 24.23) are deliberately excluded: they are regional
 * aggregates, not states.
 */
export const RATE_OPTIONS: RateOption[] = [
  {
    id: 'us-monthly',
    label: 'US average — residential, June 2026',
    cents: MONTHLY_US.cents,
    vintage: 'monthly-2026-06',
    sourceUrl: EIA_MONTHLY,
    note: 'Monthly preliminary series. Seasonal.',
  },
  {
    id: 'us-annual',
    label: 'US average — residential, 2024 annual',
    cents: ANNUAL_US.cents,
    vintage: 'annual-2024',
    sourceUrl: EIA_ANNUAL_210,
  },
  { id: 'hi', label: 'Hawaii — 2024 annual', cents: 42.86, vintage: 'annual-2024', sourceUrl: EIA_ANNUAL_210 },
  { id: 'ca', label: 'California — 2024 annual', cents: 31.97, vintage: 'annual-2024', sourceUrl: EIA_ANNUAL_210 },
  { id: 'ma', label: 'Massachusetts — 2024 annual', cents: 29.35, vintage: 'annual-2024', sourceUrl: EIA_ANNUAL_210 },
  { id: 'ct', label: 'Connecticut — 2024 annual', cents: 28.75, vintage: 'annual-2024', sourceUrl: EIA_ANNUAL_210 },
  { id: 'ri', label: 'Rhode Island — 2024 annual', cents: 28.65, vintage: 'annual-2024', sourceUrl: EIA_ANNUAL_210 },
  { id: 'ak', label: 'Alaska — 2024 annual', cents: 24.82, vintage: 'annual-2024', sourceUrl: EIA_ANNUAL_210 },
  { id: 'ny', label: 'New York — 2024 annual', cents: 24.43, vintage: 'annual-2024', sourceUrl: EIA_ANNUAL_210 },
  {
    id: 'dc',
    label: 'District of Columbia — 2024 annual',
    cents: 17.71,
    vintage: 'annual-2024',
    sourceUrl: EIA_ANNUAL_210,
    note: 'EIA carries DC as a row alongside the 50 states.',
  },
  { id: 'ok', label: 'Oklahoma — 2024 annual', cents: 12.24, vintage: 'annual-2024', sourceUrl: EIA_ANNUAL_210 },
  { id: 'ut', label: 'Utah — 2024 annual', cents: 12.22, vintage: 'annual-2024', sourceUrl: EIA_ANNUAL_210 },
  { id: 'wa', label: 'Washington — 2024 annual', cents: 11.9, vintage: 'annual-2024', sourceUrl: EIA_ANNUAL_210 },
  { id: 'la', label: 'Louisiana — 2024 annual', cents: 11.73, vintage: 'annual-2024', sourceUrl: EIA_ANNUAL_210 },
  { id: 'ne', label: 'Nebraska — 2024 annual', cents: 11.53, vintage: 'annual-2024', sourceUrl: EIA_ANNUAL_210 },
  { id: 'id', label: 'Idaho — 2024 annual', cents: 11.52, vintage: 'annual-2024', sourceUrl: EIA_ANNUAL_210 },
  { id: 'nd', label: 'North Dakota — 2024 annual', cents: 11.51, vintage: 'annual-2024', sourceUrl: EIA_ANNUAL_210 },
];

export const DEFAULT_RATE_ID = 'us-monthly';
export const DEFAULT_CYCLES_PER_MONTH = 8;

/** Four EIA numbers now in circulation, three of which are the wrong one. */
export const RATE_CONFUSIONS = [
  { figure: '18.34 ¢/kWh', what: 'US residential, monthly', period: 'June 2026', sourceUrl: EIA_MONTHLY },
  { figure: '16.48 ¢/kWh', what: 'US residential, annual', period: '2024', sourceUrl: EIA_ANNUAL_210 },
  { figure: '16.5 ¢/kWh', what: 'the same annual figure, rounded in EIA prose', period: '2024', sourceUrl: EIA_ANNUAL_T4 },
  {
    figure: '12.94 ¢/kWh',
    what: 'US ALL-SECTOR average retail price — not residential',
    period: '2024',
    sourceUrl: EIA_PROFILES,
  },
];

/* ------------------------------------------------------------------ *
 * What manufacturers claim. Displayed, never computed with.
 * ------------------------------------------------------------------ */

export interface ManufacturerClaim {
  who: string;
  model: string;
  claim: string;
  wording: string;
  rateStated: boolean;
  durationStated: boolean;
  /** Why it fails the checkability test, in the publisher's own terms. */
  whyUncheckable: string;
  docType: string;
  sourceUrl: string;
}

/**
 * Every one of these is UNCHECKABLE by R1's test. There is no `verdict` field
 * because there is nothing to vary: the table has one verdict and it is
 * printed once in the heading. A checkable manufacturer claim does not exist
 * in this category [R1 s7.1.2].
 */
export const MANUFACTURER_CLAIMS: ManufacturerClaim[] = [
  {
    who: 'Harvest Right',
    model: 'Small & Medium',
    claim: '$1.25–$2.80 per batch',
    wording: 'approximately $1.25–$2.80 per batch depending on local electricity rates',
    rateStated: false,
    durationStated: false,
    whyUncheckable: 'No rate, no duration. "Depending on local electricity rates" is not a rate.',
    docType: 'blog, FAQ',
    sourceUrl: HR_BLOG,
  },
  {
    who: 'Harvest Right',
    model: 'Large',
    claim: '$2.00–$3.00 per batch',
    wording: 'approximately $2.00–$3.00 per batch',
    rateStated: false,
    durationStated: false,
    whyUncheckable: 'No rate, no duration.',
    docType: 'blog, FAQ',
    sourceUrl: HR_BLOG,
  },
  {
    who: 'Harvest Right',
    model: 'X-Large',
    claim: '$4.00 per batch',
    wording: 'approximately $4.00 per batch',
    rateStated: false,
    durationStated: false,
    whyUncheckable: 'No rate, no duration.',
    docType: 'blog, FAQ',
    sourceUrl: HR_FAQ,
  },
  {
    who: 'Harvest Right',
    model: 'unspecified (2016)',
    claim: '$1.00–$2.80 per DAY',
    wording: 'running the freeze dryer costs about $1.00-$2.80 a day, depending on power costs in your area',
    rateStated: false,
    durationStated: false,
    whyUncheckable:
      'The same $1.25–$2.80 figure has been published as "a day" in 2016 and 2023 and as "a batch" now. A per-day figure and a per-batch figure are not the same quantity.',
    docType: 'blog (2016)',
    sourceUrl: HR_BLOG,
  },
  {
    who: 'Blue Alpine',
    model: 'generic',
    claim: '$2.00–$3.00 per day',
    wording: 'the freeze dryer will typically cost about $2.00-$3.00 of electricity per day',
    rateStated: false,
    durationStated: false,
    whyUncheckable: 'No rate. Per day, not per batch.',
    docType: 'FAQ',
    sourceUrl: BA_FAQ,
  },
  {
    who: 'Blue Alpine',
    model: 'generic',
    claim: '$4–$8 per load',
    wording:
      'a typical load will cost between $4 to $8. This is of course dependent on electricity costs and what kinds of bags are being used',
    rateStated: false,
    durationStated: false,
    whyUncheckable:
      'Not electricity-only — the figure has bags folded into it here and pump oil folded into it in a second Blue Alpine source. It is not comparable to any kWh calculation.',
    docType: 'FAQ',
    sourceUrl: BA_FAQ,
  },
  {
    who: 'Blue Alpine',
    model: 'Medium / Large',
    claim: '~$2–4 / ~$3–6 per batch',
    wording: '"~$2-4" per batch (Medium); "~$3-6" per batch (Large)',
    rateStated: false,
    durationStated: false,
    whyUncheckable: 'No rate. Cycle time is stated elsewhere in the article but not tied to the cost.',
    docType: 'blog',
    sourceUrl: BA_BLOG,
  },
  {
    who: 'Prep4Life',
    model: 'The Cube',
    claim: 'No number at all',
    wording: 'Most energy efficient freeze dryer in its class',
    rateStated: false,
    durationStated: false,
    whyUncheckable:
      'No number, no class definition, no comparison. Unfalsifiable as published — there is nothing here to check.',
    docType: 'sales page',
    sourceUrl: P4L,
  },
  {
    who: 'University of Arizona Extension',
    model: 'generic',
    claim: '$1.50–$3.50 per cycle',
    wording: 'A typical cycle can cost approximately $1.50 (for a small load) to $3.50 (for a large load)',
    rateStated: false,
    durationStated: false,
    whyUncheckable:
      'No rate. The page states "freeze drying usually takes 20-40 hours" but does not tie that duration to the cost.',
    docType: 'extension publication',
    sourceUrl: AZ,
  },
  {
    who: 'Utah State University Extension',
    model: 'generic',
    claim: '$2–$5 per batch',
    wording: 'between $2 to $5 worth of electricity per batch',
    rateStated: false,
    durationStated: false,
    whyUncheckable: 'No rate, no duration. Described for Intermountain West consumers.',
    docType: 'extension publication',
    sourceUrl: USU,
  },
];

/** The spread those claims produce, stated as R1 states it. */
export const CLAIM_SPREAD =
  'The published cost-per-batch spread across all sources is roughly 10× — $1.25 to $15 — and it cannot be attributed to rate, machine or duration differences, because the inputs are not published.';

export const NO_KWH_AT_ALL = [
  {
    who: 'Harvest Right',
    what: 'No kWh figure on any Harvest Right page checked. Amps, watts and dollars per batch only.',
    sourceUrl: HR_FAQ,
  },
  {
    who: 'Blue Alpine',
    what: 'No kWh figure for any model under $5,000. kWh appears only for the out-of-scope $13,495 XL.',
    sourceUrl: BA_FAQ,
  },
  {
    who: 'Prep4Life, VEVOR, SKYSHALO, KFFKFF, Lanphan',
    what: 'No kWh, no cost per batch. Lanphan’s power field reads "Confirm before quotation".',
    sourceUrl: P4L,
  },
];

/* ------------------------------------------------------------------ *
 * The only two real measurements anyone has published
 * ------------------------------------------------------------------ */

export const METERED = [
  {
    who: 'Dennis Alexander, Common Sense Home',
    model: 'Harvest Right medium (2016 machine)',
    device: 'unbranded power meter',
    figure: '21 kWh per load',
    wording: 'My average electrical usage is 21 kW-hours/load',
    dollars: '$1.90 per load',
    reproducible: false,
    caveat:
      'The rate is not stated anywhere in the article, so the $1.90 cannot be reproduced. Author notes his rates rise in summer. Measurements are from a 2016-era machine.',
    sourceUrl: CSH,
  },
  {
    who: 'Drew Smith, Backpacking Light',
    model: 'Harvest Right medium',
    device: 'Kill A Watt P3',
    figure: '20 kWh per run',
    wording: '20 kWh per run seems like a good estimate',
    dollars: '$2.03 per run',
    reproducible: true,
    caveat:
      'The rate is stated — $0.104/kWh, described as the national average in 2022 — which makes this the one reproducible metered report. That rate is badly stale against EIA’s 18.34¢ for June 2026. Author’s own caveat: "Power consumption varies with ambient temperature and load size."',
    sourceUrl: BPL,
  },
];

export const METERED_NOTE =
  'Both are user-reported, both are Harvest Right medium units, and they land close together — 21 kWh and 20 kWh. Neither was made on a 2026 model, on any other brand, or under a stated protocol. No metered data exists for Blue Alpine, Stay Fresh, The Cube, VEVOR, SKYSHALO, KFFKFF or Lanphan.';

/* ------------------------------------------------------------------ *
 * Required section: what we could not source
 * ------------------------------------------------------------------ */

export const COULD_NOT_SOURCE = [
  {
    what: 'A checkable manufacturer energy cost claim, from any brand.',
    detail:
      'Searched across every in-scope brand. Zero brands selling a home freeze dryer in the US under $5,000 publish a cost claim stating both the assumed rate and the assumed duration. This gap is the reason the calculator prefills a blog figure rather than a manufacturer figure.',
    sourceUrl: HR_FAQ,
  },
  {
    what: 'Monthly state-level electricity rates from EIA.',
    detail:
      'EIA publishes the monthly state breakdown only as Table 5.6.A, distributed as an .xlsx file. The table page confirms "Data for June 2026 / Release Date: August 26, 2026" but renders no numbers in HTML, and the spreadsheet could not be retrieved. Third-party pages carrying these figures were deliberately not used, and the annual table was not substituted for the monthly one. The state dropdown here is therefore annual 2024 data, labelled as such on every row.',
    sourceUrl: EIA_56A,
  },
  {
    what: 'The full 50-state annual table.',
    detail:
      'EIA publishes all 50 states plus DC in Tables 2.10 and 4. Our research pack recorded the five highest, the five lowest, the next two in each direction, DC and the US total — the rows in the dropdown. A state that is missing is a rate we have not recorded, not a rate that does not exist. We did not interpolate the others.',
    sourceUrl: EIA_ANNUAL_210,
  },
  {
    what: 'Any standardised test method for this product category.',
    detail:
      'No EnergyGuide label, no DOE test procedure and no ENERGY STAR specification exists for home freeze dryers. There is no regulator-defined method that would make one manufacturer’s figure comparable to another’s.',
    sourceUrl: AZ,
  },
  {
    what: 'A cost figure conditioned on ambient temperature, from anyone.',
    detail:
      'Harvest Right’s own manual states that ambient temperature nearly doubles cycle length — 24 hours at 75°F becoming "over 40 hours" — yet no brand publishes a cost figure conditioned on it. A number this tool produces is only as good as the cycle it assumes.',
    sourceUrl: HR_BLOG,
  },
];

/* ------------------------------------------------------------------ *
 * Arithmetic. Shared by the server-rendered default and the client.
 * ------------------------------------------------------------------ */

export interface CostResult {
  perBatch: number;
  perMonth: number;
  perYear: number;
  kwhPerMonth: number;
}

/**
 * kWh per cycle × (¢/kWh ÷ 100) = $ per batch; × cycles = $ per month.
 * That is the whole model, and the page prints it above the result.
 */
export function computeCost(kwhPerCycle: number, rateCents: number, cyclesPerMonth: number): CostResult {
  const perBatch = kwhPerCycle * (rateCents / 100);
  return {
    perBatch,
    perMonth: perBatch * cyclesPerMonth,
    perYear: perBatch * cyclesPerMonth * 12,
    kwhPerMonth: kwhPerCycle * cyclesPerMonth,
  };
}

export const usd = (n: number): string =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

export const DISCLOSURE =
  'Sublime Pantry has no affiliate relationships, sponsorships, or paid placements as of publication. We sell packaging; where a product we sell appears, it is labeled.';
