/**
 * tests/trail-meal-cost.test.mjs
 *
 * Run with the repo's existing test command. These import the TypeScript data
 * module directly, the same way running-cost.test.mjs and batch-planner.test.mjs do.
 */

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import {
  ACCESS_DATE,
  PRICE_DATE,
  DISCLOSURE,
  SOURCES,
  SOURCE_URLS as U,
  cite,
  POUCHES,
  POUCH_SCORES,
  EXCLUDED_COMPARATORS,
  REFERENCE_RECIPE,
  REFERENCE_INGREDIENT_COST,
  REFERENCE_CALORIES,
  REFERENCE_AS_PURCHASED_OZ,
  PACKAGING_OPTIONS,
  PACKAGING_SPREAD_MULTIPLE,
  MACHINE_BANDS,
  BATCH_DURATION_RANGES,
  ELECTRICITY_RATE_USD_PER_KWH,
  MANUFACTURER_BATCH_CLAIMS,
  WATER_REMOVAL_CONTEXT,
  WEIGHT_BENCHMARK,
  COULD_NOT_SOURCE,
  PRODUCT,
  costPerMeal,
  costPer500Kcal,
  driedWeightG,
  weightPer500Kcal,
  benchmarkVerdict,
  scorePouch,
  usd,
  usdPrecise,
  oz,
  g,
} from '../src/data/trailMealCost.ts';

const here = dirname(fileURLToPath(import.meta.url));
const PAGE = readFileSync(
  resolve(here, '../src/pages/tools/trail-meal-cost.astro'),
  'utf8',
);
const DATA = readFileSync(resolve(here, '../src/data/trailMealCost.ts'), 'utf8');
const TOOL_LAYOUT = readFileSync(resolve(here, '../src/layouts/ToolLayout.astro'), 'utf8');
const TOOL_EMBED = readFileSync(resolve(here, '../src/components/ToolEmbed.astro'), 'utf8');

const near = (a, b, tol = 1e-6) =>
  assert.ok(Math.abs(a - b) <= tol, `${a} not within ${tol} of ${b}`);

/* ------------------------------------------------------------------ */
describe('cost arithmetic', () => {
  test('ingredients plus packaging, electricity excluded by default', () => {
    const r = costPerMeal({ ingredientCostUsd: 1.52, packagingCostUsd: 1.499 });
    near(r.totalUsd, 3.019);
    assert.equal(r.electricityPerMealUsd, null);
    assert.equal(r.containsApproximate, false);
  });

  test('the wholesale pouch reproduces the pack’s landed figure', () => {
    const r = costPerMeal({ ingredientCostUsd: 1.52, packagingCostUsd: 0.298 });
    near(r.totalUsd, 1.818);
  });

  test('electricity divides a per-batch cost by meals per batch', () => {
    const r = costPerMeal({
      ingredientCostUsd: 0,
      packagingCostUsd: 0,
      electricity: { kw: 1.1, hours: 24, rateUsdPerKwh: 0.1834, mealsPerBatch: 8 },
    });
    near(r.electricityKwhPerBatch, 26.4);
    near(r.electricityPerBatchUsd, 26.4 * 0.1834);
    near(r.electricityPerMealUsd, (26.4 * 0.1834) / 8);
    assert.equal(r.containsApproximate, true);
  });

  test('the pack’s own 26.4 kWh / $4.84 medium-batch figure reproduces', () => {
    const r = costPerMeal({
      ingredientCostUsd: 0,
      packagingCostUsd: 0,
      electricity: { kw: 1.1, hours: 24, rateUsdPerKwh: ELECTRICITY_RATE_USD_PER_KWH, mealsPerBatch: 1 },
    });
    near(r.electricityKwhPerBatch, 26.4);
    assert.equal(r.electricityPerBatchUsd.toFixed(2), '4.84');
  });

  test('the manufacturer’s own wattage envelope spans $2.36 to $5.33', () => {
    const low = 0.99 * 13 * ELECTRICITY_RATE_USD_PER_KWH;
    const high = 1.21 * 24 * ELECTRICITY_RATE_USD_PER_KWH;
    assert.equal(low.toFixed(2), '2.36');
    // The research pack records $5.32 here; recomputing gives $5.33. The data
    // file states both, so the page never presents a figure it cannot reproduce.
    assert.equal(high.toFixed(2), '5.33');
    assert.match(DATA, /\$5\.33/);
    assert.match(DATA, /as \$5\.32; recomputing it gives \$5\.33/);
  });

  test('zero meals per batch leaves electricity out rather than dividing by zero', () => {
    const r = costPerMeal({
      ingredientCostUsd: 1,
      packagingCostUsd: 1,
      electricity: { kw: 1.1, hours: 24, rateUsdPerKwh: 0.18, mealsPerBatch: 0 },
    });
    assert.equal(r.electricityPerMealUsd, null);
    near(r.totalUsd, 2);
  });

  test('negative and non-finite inputs are floored at zero, never propagated', () => {
    const r = costPerMeal({ ingredientCostUsd: -5, packagingCostUsd: Number.NaN });
    near(r.totalUsd, 0);
  });

  test('cost per 500 kcal is null without calories, never zero-filled', () => {
    assert.equal(costPer500Kcal(3.02, 0), null);
    near(costPer500Kcal(3.02, 594), (3.02 / 594) * 500);
  });
});

/* ------------------------------------------------------------------ */
describe('yield — the absence the tool is built around', () => {
  test('no default, no preset, and no per-food yield table exists in the data', () => {
    assert.ok(!/YIELD_PRESETS|DEFAULT_YIELD|yieldByFood/i.test(DATA));
    assert.match(DATA, /YIELD_HAS_NO_PUBLISHED_FIGURE\s*=\s*true/);
  });

  test('the yield input ships empty with a placeholder, not a number', () => {
    const field = PAGE.slice(PAGE.indexOf('id="yield"'), PAGE.indexOf('id="yield"') + 400);
    assert.match(field, /value=""/);
    assert.match(field, /placeholder="your measurement"/);
  });

  test('a missing yield returns null rather than a substituted figure', () => {
    assert.equal(driedWeightG(267.6, null), null);
    assert.equal(driedWeightG(267.6, undefined), null);
    assert.equal(driedWeightG(267.6, 0), null);
    assert.equal(driedWeightG(267.6, 101), null);
    assert.equal(weightPer500Kcal(null, 594), null);
  });

  test('a supplied yield converts prepared weight to dried weight', () => {
    near(driedWeightG(400, 25), 100);
    near(weightPer500Kcal(100, 500), 100);
    near(weightPer500Kcal(140, 700), 100);
  });

  test('the published water-removal figures are context, and they conflict', () => {
    assert.equal(WATER_REMOVAL_CONTEXT.length, 3);
    const psu = WATER_REMOVAL_CONTEXT.find((w) => w.source === U.psu);
    const umn = WATER_REMOVAL_CONTEXT.filter((w) => w.source === U.umn);
    assert.ok(psu && /98 percent/.test(psu.figure));
    assert.equal(umn.length, 2);
    assert.match(DATA, /WATER_REMOVAL_CONFLICT/);
  });

  test('dehydrator weight-reduction figures are named and excluded', () => {
    assert.match(DATA, /DEHYDRATOR_FIGURES_ARE_NOT_YIELDS/);
    assert.match(DATA, /not freeze-drying yields/);
  });

  test('the page states the weight-differential method with its two sources', () => {
    assert.match(PAGE, /weigh the trays before and after|YIELD_METHOD/);
    assert.ok(cite(U.hrRehydrate) > 0 && cite(U.umn) > 0);
  });
});

/* ------------------------------------------------------------------ */
describe('commercial pouches', () => {
  test('exactly three comparators, each with price, calories and weight', () => {
    assert.equal(POUCHES.length, 3);
    for (const p of POUCHES) {
      assert.ok(p.priceUsd > 0);
      assert.ok(p.caloriesPerPouch > 0);
      assert.ok(p.netWeightG > 0);
      assert.ok(p.process);
      assert.ok(p.sources.length >= 1);
    }
  });

  test('every pouch carries its process, and the mixed one is not called freeze-dried', () => {
    const bp = POUCHES.find((p) => p.id === 'backpackers-pantry-pad-thai');
    assert.equal(bp.process, 'freeze-dried + dehydrated');
    const fd = POUCHES.filter((p) => p.process === 'freeze-dried').map((p) => p.brand);
    assert.deepEqual(fd, ['Mountain House', 'Peak Refuel']);
  });

  test('Mountain House weight carries its caveat; Peak Refuel’s does not need one', () => {
    const mh = POUCHES.find((p) => p.brand === 'Mountain House');
    const pr = POUCHES.find((p) => p.brand === 'Peak Refuel');
    assert.ok(mh.weightCaveat && /not confirmed/.test(mh.weightCaveat));
    assert.equal(pr.weightCaveat, null);
  });

  test('Peak Refuel weight is the on-page ounce figure, never the JSON gram field', () => {
    const pr = POUCHES.find((p) => p.brand === 'Peak Refuel');
    near(oz(pr.netWeightG), 6.07, 1e-9);
    // Ignore digits inside URLs; look for a bare JSON gram figure used as a value.
    const withoutUrls = DATA.replace(/https?:\/\/\S+/g, '');
    assert.ok(
      !/\b(390|313|299)\b/.test(withoutUrls),
      'a Shopify JSON weight leaked into the data file',
    );
    assert.match(DATA, /PEAK_REFUEL_WEIGHT_WARNING/);
  });

  test('scores reproduce by hand', () => {
    const mh = scorePouch(POUCHES.find((p) => p.brand === 'Mountain House'));
    near(mh.costPer500KcalUsd, (12.49 / 460) * 500);
    near(mh.gramsPer500Kcal, (141 / 460) * 500);
    const pr = scorePouch(POUCHES.find((p) => p.brand === 'Peak Refuel'));
    near(pr.gramsPer500Kcal, (g(6.07) / 800) * 500);
  });

  test('the benchmark verdict is a band, not a ranking', () => {
    assert.equal(benchmarkVerdict(null), 'unknown');
    assert.equal(benchmarkVerdict(100), 'below');
    assert.equal(benchmarkVerdict(WEIGHT_BENCHMARK.gLow), 'within');
    assert.equal(benchmarkVerdict(WEIGHT_BENCHMARK.gHigh), 'within');
    assert.equal(benchmarkVerdict(200), 'above');
  });

  test('cheaper and non-freeze-dried brands are named as exclusions with reasons', () => {
    const brands = EXCLUDED_COMPARATORS.map((e) => e.brand);
    assert.deepEqual(brands, ['ReadyWise', 'Good To-Go']);
    assert.match(EXCLUDED_COMPARATORS[0].reason, /\$7\.99/);
    assert.match(EXCLUDED_COMPARATORS[0].reason, /label images/);
    assert.match(EXCLUDED_COMPARATORS[1].reason, /dehydrated, not freeze-dried/);
  });

  test('prices are brand-site prices and carry the date they were checked', () => {
    assert.equal(PRICE_DATE, '2026-09-06');
    assert.match(PAGE, /brand-site prices on \{PRICE_DATE\}/);
    for (const p of POUCHES) {
      assert.ok(p.priceSource.startsWith('https://'));
      assert.ok(!/walmart|rei\.com|amazon/i.test(p.priceSource), 'retailer price used as brand price');
    }
  });

  test('the page says a two-serving pouch is not a one-dinner meal', () => {
    for (const p of POUCHES) assert.equal(p.servingsPerPouch, 2);
    assert.match(PAGE, /two servings/);
  });
});

/* ------------------------------------------------------------------ */
describe('packaging and the reference recipe', () => {
  test('the recipe totals reproduce the pack', () => {
    assert.equal(REFERENCE_RECIPE.length, 5);
    // Summed from the sourced rows. The pack states $1.52; its rows give $1.51,
    // and the data file records the gap instead of adopting either silently.
    assert.equal(REFERENCE_INGREDIENT_COST, 1.51);
    assert.match(DATA, /REFERENCE_TOTAL_ROUNDING_NOTE/);
    assert.match(PAGE, /REFERENCE_TOTAL_ROUNDING_NOTE/);
    assert.equal(REFERENCE_CALORIES, 594);
    assert.equal(REFERENCE_AS_PURCHASED_OZ, 9.94);
  });

  test('per-pouch prices are pack price divided by count', () => {
    for (const p of PACKAGING_OPTIONS) {
      near(p.perPouchUsd, p.packPriceUsd / p.unitCount, 1e-9);
    }
  });

  test('the retail-to-wholesale spread is stated, not smoothed', () => {
    assert.equal(PACKAGING_SPREAD_MULTIPLE, 5);
    assert.match(PAGE, /spread, same vendor, same day/);
  });

  test('the recipe weight is as-purchased and the page says so', () => {
    assert.match(PAGE, /as-purchased/);
    assert.match(PAGE, /own scale reading/);
  });

  test('costs the figure excludes are listed on the page, not buried', () => {
    assert.match(PAGE, /EXCLUDED_FROM_COST/);
    assert.match(DATA, /amortization/);
    assert.match(DATA, /pump oil/i);
    assert.match(DATA, /Labor/);
  });
});

/* ------------------------------------------------------------------ */
describe('electricity is optional and flagged', () => {
  test('the toggle ships off and the fields ship hidden', () => {
    const box = PAGE.slice(PAGE.indexOf('id="elec-on"'), PAGE.indexOf('id="elec-on"') + 120);
    assert.ok(!/checked/.test(box));
    assert.match(PAGE, /id="elec-fields"[^>]*hidden/);
    assert.match(PAGE, /id="r-elec"[^>]*hidden/);
  });

  test('the approximate flag appears on the control and on the result', () => {
    const flags = PAGE.match(/class="flag">approximate</g) || [];
    assert.ok(flags.length >= 2, 'the approximate flag is missing from a surface');
  });

  test('both published batch-duration ranges are carried, neither reconciled', () => {
    assert.equal(BATCH_DURATION_RANGES.length, 2);
    assert.deepEqual(
      BATCH_DURATION_RANGES.map((r) => [r.hoursLow, r.hoursHigh]),
      [[13, 35], [24, 36]],
    );
  });

  test('machine bands are the published wattages only', () => {
    assert.deepEqual(MACHINE_BANDS.map((m) => m.id), ['small-medium', 'large', 'x-large']);
    const sm = MACHINE_BANDS[0];
    near(sm.kwLow, 0.99);
    near(sm.kwHigh, 1.21);
  });

  test('manufacturer dollar claims never enter arithmetic', () => {
    assert.equal(MANUFACTURER_BATCH_CLAIMS.length, 3);
    for (const c of MANUFACTURER_BATCH_CLAIMS) {
      assert.equal(typeof c.claim, 'string');
      assert.equal(c.claimUsd, undefined, 'a claim exposed a numeric field a calculator could read');
    }
    const calcPanel = PAGE.slice(PAGE.indexOf('<section class="panel"'), PAGE.indexOf('</section>'));
    assert.ok(!/1\.25|2\.80|3\.00|4\.00 per batch/.test(calcPanel));
  });

  test('meals per batch is an input and is stated to be unsourceable', () => {
    assert.match(DATA, /MEALS_PER_BATCH_IS_AN_INPUT/);
    assert.match(DATA, /No source publishes how many meals fill a batch/);
    assert.match(PAGE, /id="meals"/);
  });
});

/* ------------------------------------------------------------------ */
describe('citation integrity, both directions', () => {
  test('every source is cited at least once on the page', () => {
    for (const s of SOURCES) {
      const n = cite(s.url);
      assert.ok(
        PAGE.includes(s.url) || DATA.includes(s.url),
        `source ${n} (${s.title}) is registered but never referenced`,
      );
    }
  });

  test('every registered source URL resolves through cite()', () => {
    for (const s of SOURCES) assert.ok(cite(s.url) >= 1);
    assert.throws(() => cite('https://example.com/nope'));
  });

  test('no duplicate source URLs', () => {
    const urls = SOURCES.map((s) => s.url);
    assert.equal(new Set(urls).size, urls.length);
  });

  test('every source carries publisher, tier and the access date', () => {
    for (const s of SOURCES) {
      assert.ok(s.publisher && s.title && s.url.startsWith('https://'));
      assert.ok(['primary', 'primary (price)', 'secondary'].includes(s.tier));
      assert.equal(s.accessDate, ACCESS_DATE);
    }
  });

  test('the only secondary source is the calories-per-ounce benchmark, and it is labeled', () => {
    const secondary = SOURCES.filter((s) => s.tier === 'secondary');
    assert.equal(secondary.length, 1);
    assert.equal(secondary[0].url, U.rei);
    // The label lives in the data and is rendered through it, so the tier can
    // never be shown without its caveat.
    assert.match(DATA, /Secondary tier\./);
    assert.match(PAGE, /WEIGHT_BENCHMARK_SECONDARY\.note/);
    assert.match(PAGE, /\{s\.tier\}/);
  });

  test('the weight benchmark is derived from the primary source, not the secondary one', () => {
    assert.equal(WEIGHT_BENCHMARK.source, U.nols);
    assert.equal(WEIGHT_BENCHMARK.gLow, 115);
    assert.equal(WEIGHT_BENCHMARK.gHigh, 140);
  });
});

/* ------------------------------------------------------------------ */
describe('house rules', () => {
  const BANNED = [
    'unlock',
    'revolutionize',
    'game-changing',
    'ultimate',
    'elevate',
    'delve',
    'best',
    'perfect',
    'guaranteed',
    "whether you're a beginner or an expert",
    'In today’s',
    "In today's",
    'nothing invented',
    'we will not pretend',
  ];

  test('no banned vocabulary in the page or the data', () => {
    for (const word of BANNED) {
      const re = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
      assert.ok(!re.test(PAGE), `banned word in page: ${word}`);
      assert.ok(!re.test(DATA), `banned word in data: ${word}`);
    }
  });

  test('the disclosure string is exact', () => {
    assert.equal(
      DISCLOSURE,
      'Sublime Pantry has no affiliate relationships, sponsorships, or paid placements as of publication. ' +
        'We sell packaging; where a product we sell appears, it is labeled.',
    );
    assert.match(PAGE, /\{DISCLOSURE\}/);
  });

  test('one product mention, labeled', () => {
    assert.equal(PRODUCT.label, 'Sold by Sublime Pantry');
    const mentions = (PAGE.match(/Starter Set — 50 Bags, 50 Absorbers, Sealer|PRODUCT\.name/g) || []).length;
    assert.ok(mentions <= 2, 'the product is mentioned more than once');
    assert.match(PAGE, /PRODUCT\.label/);
  });

  test('no shelf-life claim is made anywhere', () => {
    assert.ok(!/shelf life|shelf-life/i.test(PAGE.replace(/Shelf Life<\/a>|title: 'Shelf Life'/g, '')));
  });

  test('no hands-on testing is implied', () => {
    assert.ok(!/we tested|our test|we ran|in our kitchen|our batches/i.test(PAGE));
    assert.ok(!/we tested|our test|we ran/i.test(DATA));
  });

  test('the required "What we could not source" section is present and populated', () => {
    assert.ok(COULD_NOT_SOURCE.length >= 5);
    assert.match(PAGE, /What we could not source/);
  });

  test('the required Next section carries two to three internal links', () => {
    const next = PAGE.slice(PAGE.indexOf('id="next-h"'));
    const links = next.match(/href=\{r\.href\}/g) || [];
    assert.ok(links.length >= 1);
    assert.match(PAGE, /RELATED\.map/);
  });
});

/* ------------------------------------------------------------------ */
describe('behaviour', () => {
  test('no network, no storage, no cookies', () => {
    for (const api of ['fetch(', 'localStorage', 'sessionStorage', 'document.cookie', 'XMLHttpRequest', 'indexedDB']) {
      assert.ok(!PAGE.includes(api), `page touches ${api}`);
      assert.ok(!DATA.includes(api), `data touches ${api}`);
    }
  });

  test('the default answer is server-rendered, so the page works with JavaScript off', () => {
    assert.match(PAGE, /const defaultResult = costPerMeal\(/);
    assert.match(PAGE, /id="out-total">\{usd\(defaultResult\.totalUsd\)\}/);
    assert.match(PAGE, /id="out-per500">\{usd\(defaultPer500\)\}/);
    assert.match(PAGE, /id="out-weight" *>?[\s\S]{0,40}Enter your measured yield/);
  });

  test('the client script imports the same pure functions the page rendered with', () => {
    const client = PAGE.slice(PAGE.lastIndexOf('<script>'));
    assert.match(client, /from '\.\.\/\.\.\/data\/trailMealCost'/);
    for (const fn of ['costPerMeal', 'costPer500Kcal', 'driedWeightG', 'weightPer500Kcal']) {
      assert.ok(client.includes(fn), `client script does not use ${fn}`);
    }
  });

  test('a missing figure renders as a result, not an error', () => {
    assert.match(PAGE, /\.notpub/);
    const style = PAGE.slice(PAGE.lastIndexOf('<style>'));
    const notpub = style.slice(style.indexOf('.notpub'), style.indexOf('.notpub') + 160);
    assert.ok(!/red|crimson|#f00|--error/i.test(notpub));
  });

  test('embed mode is set before first paint and hides only the surround', () => {
    assert.match(TOOL_LAYOUT, /script is:inline/);
    assert.match(TOOL_LAYOUT, /new URLSearchParams\(location\.search\)/);
    assert.match(TOOL_LAYOUT, /:root\[data-embed='1'\] \[data-embed-hide\]/);
  });

  test('attribution survives embed mode', () => {
    assert.match(TOOL_EMBED, /<p class="attribution">[\s\S]*Calculator by Sublime Pantry/);
    const attribution = TOOL_EMBED.match(/<p class="attribution">[\s\S]*?<\/p>/)?.[0] ?? '';
    assert.ok(!attribution.includes('data-embed-hide'), 'attribution sits inside a data-embed-hide block');
  });

  test('every control has a label and a description', () => {
    for (const id of ['ingredient', 'packaging', 'calories', 'prepared', 'yield', 'hours', 'rate', 'meals', 'machine']) {
      assert.ok(PAGE.includes(`for="${id}"`), `no label for ${id}`);
      assert.ok(PAGE.includes(`aria-describedby="${id}-help"`), `no description for ${id}`);
      assert.ok(PAGE.includes(`id="${id}-help"`), `no help text for ${id}`);
    }
  });

  test('four live result regions', () => {
    const live = PAGE.match(/aria-live="polite"/g) || [];
    assert.ok(live.length >= 4, `expected at least 4 live regions, found ${live.length}`);
  });

  test('every table sits in a focusable scroll region with a label', () => {
    const regions = PAGE.match(/class="scroll" tabindex="0" role="region" aria-labelledby=/g) || [];
    const tables = PAGE.match(/<table>/g) || [];
    assert.equal(regions.length, tables.length);
  });

  test('every data cell carries a stacked-card label', () => {
    const cells = PAGE.match(/<t[dh](?![a-z])[^>]*>/g) || [];
    const headOnly = PAGE.match(/scope="col"/g) || [];
    const labelled = PAGE.match(/data-label="/g) || [];
    assert.equal(cells.length - headOnly.length, labelled.length);
  });

  test('interactive targets are at least 44px', () => {
    const style = PAGE.slice(PAGE.lastIndexOf('<style>'));
    assert.match(style, /\.field input, \.field select \{[\s\S]*?min-height: 44px/);
    assert.match(style, /\.chip \{[\s\S]*?min-height: 44px/);
    assert.match(style, /\.toggle \{[\s\S]*?min-height: 44px/);
  });

  test('the stacked-card fallback fires at 719px', () => {
    assert.match(PAGE, /@media \(max-width: 719px\)/);
  });

  test('formatters', () => {
    assert.equal(usd(3.019), '$3.02');
    assert.equal(usdPrecise(0.298), '$0.298');
    assert.equal(usdPrecise(1.5), '$1.50');
  });
});
