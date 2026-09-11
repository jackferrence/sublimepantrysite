/**
 * /tools/batch-planner.
 *
 * Two failures are being guarded against, and only one of them is arithmetic.
 *
 * The first is the ordinary one: the planner disagreeing with the arithmetic it
 * prints, or with the data module both are supposed to read from.
 *
 * The second is the one that matters. This tool's whole claim is that it never
 * fills a gap with a plausible number — not a yield for a food nobody has
 * measured, not a pounds-per-tray figure nobody publishes, and above all not a
 * bag count, which cannot be derived from a weight at all. Those constraints
 * are held up by editorial care, which is exactly the kind of thing that rots
 * when someone later "improves" the tool by making it answer more questions.
 * So the tests below assert them against built HTML: that a food without a
 * published yield returns Not published, that the bag count is an input and
 * never an output, and that the four disagreeing capacity publishers are all
 * shown with none averaged away.
 *
 * CI builds before it tests. Locally, run `npm run build` first.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import {
  SOURCES,
  cite,
  FOODS,
  foodById,
  DEFAULT_FOOD_ID,
  DEFAULT_FRESH_LB,
  DEFAULT_MACHINE,
  MACHINE_CAPACITY,
  MACHINE_SIZES,
  TRAY_COUNT_PER_MACHINE,
  COULD_NOT_SOURCE,
  ABSORBER_CONTAINERS,
  ABSORBER_RECOMMENDATIONS,
  ABSORBER_SOURCES,
  PLANNER_CONTAINER_IDS,
  plannerContainers,
  recommendationsFor,
  driedWeight,
  traysNeeded,
  batchesNeeded,
  absorberPlan,
  totalAbsorbers,
  isUnavailable,
  range,
  BAGS_NOT_DERIVABLE,
  DISCLOSURE,
} from '../src/data/batchPlanning.ts';
import { SOURCES as ABSORBER_MODULE_SOURCES } from '../src/data/absorberSizing.ts';
import { TOOLS, toolByHref, embedSnippet, embedUrl } from '../src/lib/tools.ts';

const DIST = new URL('../dist/', import.meta.url);

function built(file) {
  const path = new URL(file, DIST);
  if (!existsSync(path)) {
    throw new Error(`dist/${file} is missing — run \`npm run build\` before \`npm test\`.`);
  }
  return readFileSync(path, 'utf8');
}

const PAGE = () => built('tools/batch-planner.html');

/** The planner panel only — where an invented figure would do the most damage. */
function plannerPanel(html) {
  const start = html.indexOf('id="plan-heading"');
  const end = html.indexOf('Yield, as published');
  assert.ok(start > -1 && end > start, 'could not locate the planner panel in the built page');
  return html.slice(start, end);
}

/* ------------------------------------------------------------------ *
 * Arithmetic
 * ------------------------------------------------------------------ */

test('dried weight is fresh weight times the published yield', () => {
  const milk = foodById('milk-whole');
  const r = driedWeight(milk, 10);
  assert.ok(!isUnavailable(r));
  assert.equal(r.value.low, 2);
  assert.equal(r.value.high, 2);
  assert.match(r.workings, /10 × 20% = 2/);
});

test('a published ratio becomes a range, and the conversion is stated', () => {
  const berries = foodById('strawberries');
  assert.equal(berries.yieldKind, 'ratio');
  // 8-10 kg fresh : 1 kg dried -> 12.5% and 10.0%.
  assert.equal(berries.yieldLow, 0.1);
  assert.equal(berries.yieldHigh, 0.125);
  const r = driedWeight(berries, 10);
  assert.ok(!isUnavailable(r));
  assert.equal(r.value.low, 1);
  assert.equal(r.value.high, 1.25);
  assert.match(berries.derivation, /1 ÷ 10 = 10\.0% and 1 ÷ 8 = 12\.5%/);
});

test('zero in, zero out — and no NaN reaches the page', () => {
  const r = driedWeight(foodById('milk-whole'), 0);
  assert.ok(!isUnavailable(r));
  assert.equal(r.value.low, 0);
  assert.ok(!Number.isNaN(r.value.high));
});

test('trays round up, because a partial tray is still a tray', () => {
  const potatoes = foodById('potatoes');
  const r = traysNeeded(potatoes, 10, 'lb');
  assert.ok(!isUnavailable(r));
  // 3 lbs per tray, so 10 lb needs 4 trays, not 3.33.
  assert.equal(r.value.low, 4);
  assert.equal(r.value.high, 4);
});

test('batches round up and are computed per publisher, never averaged', () => {
  const rows = batchesNeeded(30, 'Large');
  const hr = rows.find((r) => r.publisher.startsWith('Harvest Right'));
  const usu = rows.find((r) => r.publisher.startsWith('Utah State'));
  // Harvest Right 18-27 lb: 30 lb is 2 batches at best, 2 at worst.
  assert.equal(hr.low, 2);
  assert.equal(hr.high, 2);
  // USU 12-16 lb: 2 to 3 batches for the same load. The disagreement survives.
  assert.equal(usu.low, 2);
  assert.equal(usu.high, 3);
  assert.notDeepEqual([hr.low, hr.high], [usu.low, usu.high]);
});

test('absorbers are one per bag and sum across bag sizes', () => {
  const ids = PLANNER_CONTAINER_IDS;
  const counts = Object.fromEntries(ids.map((id, i) => [id, i + 1]));
  const plan = absorberPlan(counts);
  for (const row of plan) assert.equal(row.absorbers, row.bags);
  assert.equal(totalAbsorbers(plan), ids.reduce((sum, _, i) => sum + i + 1, 0));
});

test('a fractional or negative bag count cannot produce a fractional absorber', () => {
  const id = PLANNER_CONTAINER_IDS[0];
  assert.equal(absorberPlan({ [id]: 2.7 })[0].absorbers, 2);
  assert.equal(absorberPlan({ [id]: -5 })[0].absorbers, 0);
});

/* ------------------------------------------------------------------ *
 * Honesty constraints
 * ------------------------------------------------------------------ */

test('only three foods carry a yield, and every other food returns Not published', () => {
  const withYield = FOODS.filter((f) => f.yieldLow !== null);
  assert.equal(withYield.length, 3, 'the research supports three yields; a fourth needs a source');
  assert.deepEqual(
    withYield.map((f) => f.id).sort(),
    ['milk-skim', 'milk-whole', 'strawberries'],
  );
  for (const food of FOODS) {
    if (food.yieldLow !== null) continue;
    const r = driedWeight(food, 10);
    assert.ok(isUnavailable(r), `${food.id} produced a dried weight without a published yield`);
    assert.match(r.reason, /Not published/);
  }
});

test('every published yield is secondary-tier, and the page says so', () => {
  for (const food of FOODS.filter((f) => f.yieldLow !== null)) {
    assert.equal(food.secondaryOnly, true, `${food.id} claims a primary yield source`);
    for (const url of food.yieldSourceUrls) {
      const source = SOURCES.find((s) => s.url === url);
      assert.equal(source.tier, 'secondary', `${food.id} cites ${url} as primary`);
    }
  }
  assert.match(PAGE(), /all three are\s+secondary-tier/);
});

test('an egg count is never converted into an egg weight', () => {
  const eggs = foodById('eggs-raw');
  assert.equal(eggs.yieldKind, 'count-only');
  const r = driedWeight(eggs, 10);
  assert.ok(isUnavailable(r));
  assert.match(r.reason, /count conversion, which cannot be applied to a weight/);
  // And the count figure itself is still shown rather than dropped.
  assert.match(eggs.publishedAs, /8–9 eggs per cup/);
});

test('trays are returned only for the two foods with a published load density', () => {
  const withTray = FOODS.filter((f) => f.perTray);
  assert.deepEqual(withTray.map((f) => f.id).sort(), ['milk-whole', 'potatoes']);
  for (const food of FOODS) {
    if (food.perTray) continue;
    const r = traysNeeded(food, 10, 'lb');
    assert.ok(isUnavailable(r), `${food.id} produced a tray count with no published density`);
    assert.match(r.reason, /Plan in whole batches instead/);
  }
});

test('no tray count per machine is ever invented', () => {
  assert.equal(TRAY_COUNT_PER_MACHINE, null);
  const html = PAGE();
  assert.match(html, /Tray <em>count<\/em> per machine is not published/);
  // The retailer's "set of 6" pack quantity must not have become a tray count.
  assert.ok(!/6 trays/i.test(plannerPanel(html)));
});

test('a per-tray figure in cups is never applied to a weight in pounds', () => {
  const milk = foodById('milk-whole');
  assert.equal(milk.perTray.unit, 'cups');
  const wrong = traysNeeded(milk, 10, 'lb');
  assert.ok(isUnavailable(wrong), 'a cups figure was applied to a pound input');
  assert.match(wrong.reason, /published load density for this food is in cups/);
  const right = traysNeeded(milk, 10, 'cups');
  assert.ok(!isUnavailable(right));
  assert.equal(right.value.low, 3); // 10 / 4 = 2.5 -> 3
  assert.equal(right.value.high, 4); // 10 / 3 = 3.33 -> 4
});

test('a bag count is an input and never an output', () => {
  const html = PAGE();
  assert.ok(html.includes(BAGS_NOT_DERIVABLE), 'the page must state why bags are not derived');
  assert.match(BAGS_NOT_DERIVABLE, /bulk density/);
  assert.match(BAGS_NOT_DERIVABLE, /measured interior volume/);
  // The bag fields are inputs.
  for (const id of PLANNER_CONTAINER_IDS) {
    assert.match(html, new RegExp(`<input[^>]*id="f-bags-${id}"`), `${id} has no bag input`);
  }
  // And the absorber result starts empty rather than guessing a bag count.
  assert.match(html, /id="absorbers-empty"[\s\S]{0,200}Enter the number of bags/);
});

test('all four capacity publishers are shown, and none is averaged away', () => {
  const html = PAGE();
  assert.equal(MACHINE_CAPACITY.length, 4);
  for (const cap of MACHINE_CAPACITY) {
    assert.ok(html.includes(cap.publisher), `${cap.publisher} is missing from the page`);
  }
  assert.match(html, /four publishers disagree/);
  assert.match(html, /None is preferred, and no average is taken/);
  // Prep4Life publishes servings, not pounds — that row must stay unpriced.
  const p4l = MACHINE_CAPACITY.find((c) => c.publisher.startsWith('Prep4Life'));
  for (const size of p4l.sizes) assert.equal(size.lowLb, null);
});

test('a machine size with no published capacity returns Not published, not a guess', () => {
  const rows = batchesNeeded(30, 'X-Large');
  const usu = rows.find((r) => r.publisher.startsWith('Utah State'));
  assert.equal(usu.low, null);
  assert.equal(usu.note, 'Not published');
  assert.equal(usu.workings, '');
});

test('the absorber data is imported, not restated', () => {
  // If someone pastes a second copy of R3 Table 2 into batchPlanning.ts, the
  // two tools start drifting the moment one is edited. This is the assertion
  // that catches it.
  const source = readFileSync(new URL('../src/data/batchPlanning.ts', import.meta.url), 'utf8');
  assert.match(source, /from '\.\/absorberSizing(?:\.ts)?'/, 'absorber data must be imported');
  assert.ok(ABSORBER_CONTAINERS.length > 0, 'no containers came through the adapter');
  assert.ok(ABSORBER_RECOMMENDATIONS.length > 0, 'no recommendations came through the adapter');
  assert.ok(ABSORBER_SOURCES.length > 0 && ABSORBER_SOURCES.length <= ABSORBER_MODULE_SOURCES.length);
  for (const source of ABSORBER_SOURCES) {
    assert.ok(
      ABSORBER_MODULE_SOURCES.some((candidate) => candidate.url === source.url),
      `planner carried an absorber source that is absent from the canonical module: ${source.url}`,
    );
  }
  // No cc figure is typed into this file by hand.
  const body = source.slice(source.indexOf('export const SOURCES'));
  assert.ok(!/\b\d{2,4}cc\b/.test(body), 'a cc figure is hard-coded in batchPlanning.ts');
});

test('the three planner volumes resolve, and a derived volume says it is derived', () => {
  const containers = plannerContainers();
  assert.equal(containers.length, 3, 'a planner container id no longer resolves in absorberSizing');
  for (const c of containers) {
    assert.ok(c.volumeCc > 0, `${c.id} has no volume`);
    assert.ok(recommendationsFor(c.id).length > 0, `${c.id} has no published recommendation`);
    if (!c.volumePublished) {
      assert.match(
        PAGE(),
        /arithmetic on the published gallon figure, not itself published/,
        'a derived volume must be labelled as derived',
      );
    }
  }
});

test('no bag we sell is claimed to equal a published container volume', () => {
  const html = PAGE();
  assert.match(html, /published container volumes, not Sublime Pantry SKU dimensions|does not claim that any bag we sell equals one of them/);
  assert.match(html, /hold more than a quart/);
});

test('the page publishes the required sections', () => {
  const html = PAGE();
  assert.match(html, /What we could not source/);
  assert.ok(COULD_NOT_SOURCE.length >= 4);
  assert.match(html, /<h2>Next<\/h2>/);
  assert.ok(html.includes(DISCLOSURE), 'the disclosure field must appear verbatim');
});

test('the product is mentioned once, and labelled', () => {
  const html = PAGE();
  const mentions = html.match(/Starter Set — 50 Bags, 50 Absorbers, Sealer/g) ?? [];
  assert.equal(mentions.length, 1, 'the kit may appear once, where it is relevant');
  assert.match(html, /Sold by Sublime Pantry/);
});

test('every source is cited, and every citation resolves', () => {
  const html = PAGE();
  const body = html.slice(html.indexOf('batch-planner'));
  const used = new Set((body.match(/\[(\d{1,3})\]/g) ?? []).map((m) => Number(m.slice(1, -1))));
  for (const n of used) {
    assert.ok(n >= 1 && n <= SOURCES.length, `citation [${n}] does not resolve to a source`);
  }
  for (let i = 1; i <= SOURCES.length; i += 1) {
    assert.ok(used.has(i), `source ${i} (${SOURCES[i - 1].publisher}) is never cited — drop it or cite it`);
  }
});

test('cite() refuses a url it does not know', () => {
  assert.throws(() => cite('https://example.com/not-a-source'), /no source registered/);
});

test('the page carries no banned vocabulary', () => {
  const banned = [
    'unlock',
    'revolutionize',
    'game-changing',
    'ultimate',
    'elevate',
    'delve',
    'guaranteed',
    "whether you're a beginner or an expert",
    'In today',
    'nothing invented',
    'we will not pretend',
  ];
  const html = PAGE();
  const sourcesFrom = html.indexOf('class="source-list"');
  const text = (sourcesFrom > -1 ? html.slice(0, sourcesFrom) : html).replace(
    /<script[\s\S]*?<\/script>/g,
    '',
  );
  for (const word of banned) {
    assert.ok(!new RegExp(word, 'i').test(text), `banned vocabulary on the page: ${word}`);
  }
});

test('no shelf-life promise, no safety claim, and no hands-on testing is implied', () => {
  const text = PAGE();
  assert.ok(!/we tested/i.test(text));
  assert.ok(!/our batches/i.test(text));
  assert.ok(!/in our experience/i.test(text));
  assert.ok(!/guarantee/i.test(text));
  assert.ok(!/25 years/.test(plannerPanel(text)), 'a shelf-life figure must not sit in the results');
});

/* ------------------------------------------------------------------ *
 * The tool works without JavaScript
 * ------------------------------------------------------------------ */

test('the default answer is in the HTML, not computed on the client', () => {
  const html = PAGE();
  const food = foodById(DEFAULT_FOOD_ID);
  const dried = driedWeight(food, DEFAULT_FRESH_LB);
  assert.ok(!isUnavailable(dried), 'the default food must have a published yield');
  assert.ok(html.includes(range(dried.value, 'lb')), 'the dried weight must be server-rendered');
  assert.ok(html.includes(dried.workings), 'the arithmetic must be server-rendered');
});

test('the default batches table is server-rendered for every publisher', () => {
  const html = PAGE();
  for (const row of batchesNeeded(DEFAULT_FRESH_LB, DEFAULT_MACHINE)) {
    assert.ok(html.includes(row.publisher));
    if (row.low !== null) assert.ok(html.includes(row.workings), `${row.publisher} arithmetic missing`);
  }
});

test('the Not published results are server-rendered too', () => {
  // The default food has no published tray density, so that answer must be in
  // the HTML rather than appearing only once scripting runs.
  const html = PAGE();
  const trays = traysNeeded(foodById(DEFAULT_FOOD_ID), DEFAULT_FRESH_LB, 'lb');
  assert.ok(isUnavailable(trays));
  assert.ok(html.includes(trays.reason), 'the tray gap must be stated with JavaScript off');
});

/* ------------------------------------------------------------------ *
 * Accessibility
 * ------------------------------------------------------------------ */

test('every control has a label bound to it by id', () => {
  const html = PAGE();
  const ids = ['f-food', 'f-fresh', 'f-unit', 'f-machine', 'embed-code'].concat(
    PLANNER_CONTAINER_IDS.map((id) => `f-bags-${id}`),
  );
  for (const id of ids) {
    assert.match(html, new RegExp(`<label[^>]*for="${id}"`), `${id} has no label`);
  }
});

test('every control names its own help text through aria-describedby', () => {
  const html = PAGE();
  const pairs = [
    ['f-food', 'food-help'],
    ['f-fresh', 'fresh-help'],
    ['f-unit', 'unit-help'],
    ['f-machine', 'machine-help'],
  ].concat(PLANNER_CONTAINER_IDS.map((id) => [`f-bags-${id}`, 'bags-help']));
  for (const [id, help] of pairs) {
    assert.match(html, new RegExp(`id="${id}"[\\s\\S]{0,400}?aria-describedby="${help}"`), `${id} → ${help}`);
    assert.match(html, new RegExp(`id="${help}"`), `${help} does not exist`);
  }
});

test('the bag inputs are grouped under a legend that names them', () => {
  const html = PAGE();
  assert.match(html, /<fieldset class="bag-fields">[\s\S]{0,200}<legend>Bags you plan to fill<\/legend>/);
});

test('every result region announces itself when it changes', () => {
  const html = PAGE();
  for (const id of ['dried-result', 'trays-result', 'batches-result', 'absorbers-result']) {
    assert.match(html, new RegExp(`id="${id}"[^>]*role="status"`), `${id} is not a status region`);
    assert.match(html, new RegExp(`id="${id}"[\\s\\S]{0,160}aria-live="polite"`), `${id} is not live`);
  }
  assert.match(html, /id="embed-status"[^>]*role="status"/);
});

test('every scrolling table is a keyboard-reachable landmark with a name', () => {
  const html = PAGE();
  const regions = html.match(/class="table-scroll"[^>]*/g) ?? [];
  assert.ok(regions.length >= 4, 'expected the batches, absorber, yield and capacity tables');
  for (const region of regions) {
    assert.match(region, /tabindex="0"/);
    assert.match(region, /role="region"/);
    assert.match(region, /aria-label="/);
  }
});

test('every table gives its rows a header cell', () => {
  const html = PAGE();
  const tables = html.match(/<table[\s\S]*?<\/table>/g) ?? [];
  assert.ok(tables.length >= 4);
  for (const table of tables) {
    assert.match(table, /<thead>/);
    assert.match(table, /scope="col"/);
    assert.match(table, /scope="row"/);
  }
});

test('every stacked table cell carries the column name it will print', () => {
  // Below 720px the header row is hidden, so a cell without data-label loses
  // its column entirely.
  const html = PAGE();
  const start = html.indexOf('<table class="tool-table capacity-table"');
  assert.ok(start > -1, 'the capacity table is missing');
  const table = html.slice(start, html.indexOf('</table>', start));
  const cells = table.match(/<td[^>]*>/g) ?? [];
  assert.ok(cells.length > 0);
  for (const cell of cells) {
    assert.match(cell, /data-label="/, `a capacity-table cell has no data-label: ${cell}`);
  }
  // Every machine size column must be labelled, or the stacked card loses it.
  for (const size of MACHINE_SIZES) {
    assert.ok(table.includes(`data-label="${size}"`), `${size} column has no data-label`);
  }
});

test('touch targets clear 44px and the small-screen layout drops horizontal scroll', () => {
  const html = PAGE();
  assert.match(html, /\.field input,\s*\.field select\s*\{[^}]*min-height:\s*44px/);
  assert.match(html, /#replan-btn\s*\{[^}]*min-height:\s*44px/);
  assert.match(html, /#embed-btn\s*\{[^}]*min-height:\s*44px/);
  assert.match(html, /summary\s*\{[^}]*min-height:\s*44px/);
  // Lightning CSS may emit either `max-width:719px` or the range syntax
  // `width<=719px`; the breakpoint is what matters, not the spelling.
  assert.match(html, /@media[^{]*719px/, 'the stacked-card fallback must exist for narrow viewports');
  assert.match(html, /content:\s*attr\(data-label\)/, 'stacked cells must carry their column name');
});

test('Not published is styled as a result, not as an error', () => {
  // A red error state would tell a reader the tool broke. It did not; the
  // research is simply silent, and that is the answer. The brand-tinted
  // background (not a colored accent border, which reads as an AI-generated
  // callout card) is what carries "this is a considered result."
  const html = PAGE();
  assert.match(html, /\.not-published\s*\{[^}]*background:\s*var\(--brand-tint\)/);
  assert.ok(!/class="error"/.test(plannerPanel(html)));
});

/* ------------------------------------------------------------------ *
 * Embed mode, attribution, and the registry
 * ------------------------------------------------------------------ */

test('embed mode is set before paint and hides the site around the tool', () => {
  const html = PAGE();
  assert.match(html, /new URLSearchParams\(location\.search\)\.get\('embed'\) === '1'/);
  assert.match(html, /:root\[data-embed=["']1["']\] \.site-header/);
  assert.match(html, /:root\[data-embed=["']1["']\] \[data-embed-hide\][^{]*\{[^}]*display:\s*none/);
});

test('the shared attribution survives embed mode', () => {
  const html = readFileSync(new URL('../src/components/ToolEmbed.astro', import.meta.url), 'utf8');
  const attribution = html.match(/<p class="attribution">[\s\S]*?<\/p>/);
  assert.ok(attribution, 'the attribution line is missing');
  assert.ok(!attribution[0].includes('data-embed-hide'), 'the attribution must not be hidden in embed mode');
  assert.match(attribution[0], /Calculator by Sublime Pantry/);
});

test('the planner itself survives embed mode', () => {
  // The panel carries the whole answer, so it must not sit inside a hidden
  // wrapper. An embed that renders only an attribution line is worse than none.
  const html = PAGE();
  const panelStart = html.indexOf('class="card tool-panel"');
  const hideBefore = html.lastIndexOf('data-embed-hide', panelStart);
  const closeBefore = html.lastIndexOf('</div>', panelStart);
  assert.ok(closeBefore > hideBefore, 'the planner panel is inside a data-embed-hide block');
});

test('the embed snippet points at the embed URL and names the frame', () => {
  const tool = toolByHref('/tools/batch-planner');
  const snippet = embedSnippet(tool);
  assert.ok(snippet.includes(embedUrl(tool)));
  assert.match(snippet, /title="/, 'an untitled iframe announces as "frame" to a screen reader');
  assert.match(snippet, /height="\d+"/);
  assert.ok(PAGE().includes('?embed=1'), 'the page must offer the embed URL');
});

test('the tool is registered, and the registry agrees with the page', () => {
  const tool = toolByHref('/tools/batch-planner');
  assert.ok(tool, '/tools/batch-planner is not registered in src/lib/tools.ts');
  assert.equal(tool.embeddable, true);
  assert.equal(tool.homepageEmbed, false);
  assert.equal(tool.dataHandling, 'browser-only-no-storage');
  assert.ok(tool.embedHeight > 0);
  assert.ok(PAGE().includes(tool.title), 'the page title must match the registry');
});

test('every registered tool has the fields the registry promises', () => {
  for (const tool of TOOLS) {
    assert.match(tool.href, /^\/tools\/[a-z-]+$/, `${tool.href} is not a tool route`);
    assert.ok(tool.label && tool.title && tool.dek && tool.provenance);
    if (tool.embeddable) assert.ok(tool.embedHeight > 0, `${tool.href} is embeddable with no height`);
    if (!tool.embeddable) assert.equal(tool.homepageEmbed, false, `${tool.href} cannot be promoted as an embed`);
  }
});

test('the planner makes no network request and stores nothing', () => {
  const scripts = readFileSync(new URL('../src/pages/tools/batch-planner.astro', import.meta.url), 'utf8');
  for (const api of ['localStorage', 'sessionStorage', 'indexedDB', 'document.cookie', 'XMLHttpRequest']) {
    assert.ok(!scripts.includes(api), `the planner must not touch ${api}`);
  }
  // `fetch(` would be a network call; the clipboard write is not one.
  assert.ok(!/\bfetch\s*\(/.test(scripts), 'the planner must not make a network request');
});
