/**
 * /tools/running-cost.
 *
 * Two failures are being guarded against, and only one of them is arithmetic.
 *
 * The first is the ordinary one: the calculator disagreeing with the formula it
 * prints, or with the data module both are supposed to read from.
 *
 * The second is the one that matters. This page's whole claim is that it never
 * presents a manufacturer's dollars-per-batch figure as fact. That claim is
 * held up by editorial care, which is exactly the kind of thing that rots
 * quietly when someone later "tidies" a table. So the tests below assert the
 * honesty constraints against built HTML: that every manufacturer claim carries
 * its uncheckable verdict, that no manufacturer dollar figure appears inside
 * the calculator panel, and that the prefills are the sourced ones.
 *
 * CI builds before it tests. Locally, run `npm run build` first.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import {
  SOURCES,
  CHECKABLE_KWH,
  MONTHLY_US,
  ANNUAL_US,
  RATE_OPTIONS,
  DEFAULT_RATE_ID,
  DEFAULT_CYCLES_PER_MONTH,
  MANUFACTURER_CLAIMS,
  METERED,
  COULD_NOT_SOURCE,
  computeCost,
  usd,
  DISCLOSURE,
} from '../src/data/runningCost.ts';
import { TOOLS, toolByHref, embedSnippet, embedUrl } from '../src/lib/tools.ts';

const DIST = new URL('../dist/', import.meta.url);

function built(file) {
  const path = new URL(file, DIST);
  if (!existsSync(path)) {
    throw new Error(`dist/${file} is missing — run \`npm run build\` before \`npm test\`.`);
  }
  return readFileSync(path, 'utf8');
}

const PAGE = () => built('tools/running-cost.html');

/** The calculator panel only — where a manufacturer figure must never appear. */
function calculatorPanel(html) {
  const start = html.indexOf('id="calc-heading"');
  const end = html.indexOf('What manufacturers claim');
  assert.ok(start > -1 && end > start, 'could not locate the calculator panel in the built page');
  return html.slice(start, end);
}

/* ------------------------------------------------------------------ *
 * Arithmetic
 * ------------------------------------------------------------------ */

test('cost per batch is kWh times the rate in dollars, and per month scales it', () => {
  const r = computeCost(18.5, 18.34, 8);
  assert.equal(r.perBatch.toFixed(4), (18.5 * 0.1834).toFixed(4));
  assert.equal(r.perMonth.toFixed(4), (18.5 * 0.1834 * 8).toFixed(4));
  assert.equal(r.perYear.toFixed(4), (18.5 * 0.1834 * 8 * 12).toFixed(4));
  assert.equal(r.kwhPerMonth, 148);
});

test('a zero rate, a zero cycle count and a zero draw all cost nothing', () => {
  assert.equal(computeCost(18.5, 0, 8).perBatch, 0);
  assert.equal(computeCost(18.5, 18.34, 0).perMonth, 0);
  assert.equal(computeCost(0, 18.34, 8).perBatch, 0);
});

test("the publisher's own arithmetic reproduces at the rate the publisher stated", () => {
  // This is the entire reason the Stay Fresh figure is the prefill: it is the
  // one published set in the category that a reader can re-derive. If this
  // assertion ever fails, the prefill has lost its justification.
  const r = computeCost(CHECKABLE_KWH.kwh, CHECKABLE_KWH.statedRateCents, 1);
  assert.ok(
    Math.abs(r.perBatch - CHECKABLE_KWH.publisherTotalUsd) < 0.01,
    `18.5 kWh at ${CHECKABLE_KWH.statedRateCents}¢ should reproduce ${CHECKABLE_KWH.publisherTotalUsd}, got ${r.perBatch}`,
  );
});

test('the published phase breakdown sums to the published total', () => {
  const kwh = CHECKABLE_KWH.phases.reduce((sum, p) => sum + p.kwh, 0);
  const usdTotal = CHECKABLE_KWH.phases.reduce((sum, p) => sum + p.usd, 0);
  assert.equal(kwh, CHECKABLE_KWH.kwh);
  assert.ok(Math.abs(usdTotal - CHECKABLE_KWH.publisherTotalUsd) < 0.005);
});

/* ------------------------------------------------------------------ *
 * Honesty constraints
 * ------------------------------------------------------------------ */

test('every manufacturer claim is marked uncheckable, in the data and on the page', () => {
  const html = PAGE();
  for (const claim of MANUFACTURER_CLAIMS) {
    assert.equal(claim.rateStated, false, `${claim.who} would be checkable if a rate were stated`);
    assert.ok(claim.whyUncheckable.length > 20, `${claim.who} needs a reason, not a label`);
  }
  const verdicts = html.match(/class="verdict"/g) ?? [];
  assert.equal(
    verdicts.length,
    MANUFACTURER_CLAIMS.length,
    'every claim row must carry an uncheckable verdict — one badge per row, no exceptions',
  );
});

test('no manufacturer dollar figure appears anywhere in the calculator panel', () => {
  // The page may display these claims. It may not let one leak into the part
  // of the page a reader reads as a result.
  const panel = calculatorPanel(PAGE());
  for (const claim of MANUFACTURER_CLAIMS) {
    const figures = claim.claim.match(/\$[\d.]+/g) ?? [];
    for (const figure of figures) {
      const whole = new RegExp(`\\${figure}(?![\\d.])`);
      assert.ok(
        !whole.test(panel),
        `${claim.who}'s ${figure} appears inside the calculator panel — it must stay in the claims table`,
      );
    }
  }
});

test('the claims table says in prose that it feeds nothing', () => {
  const html = PAGE();
  assert.match(html, /None of them feeds the calculator above/);
  assert.match(html, /Every figure in this table is uncheckable/);
});

test('the kWh prefill is the checkable figure and is labelled as such', () => {
  const html = PAGE();
  assert.equal(CHECKABLE_KWH.kwh, 18.5);
  assert.match(html, new RegExp(`id="f-kwh"[^>]*value="${CHECKABLE_KWH.kwh}"`));
  assert.match(html, /only published energy figure in this category whose publisher\s+stated both the rate and the duration/);
  // And the caveats travel with it rather than being left in the research pack.
  assert.ok(CHECKABLE_KWH.conditions.length >= 4);
  assert.match(html, /Generic, not model-specific/);
  assert.match(html, /May 2024 figure/);
});

test('the rate prefill is the EIA figure, dated, with its release date on the page', () => {
  const html = PAGE();
  const dflt = RATE_OPTIONS.find((r) => r.id === DEFAULT_RATE_ID);
  assert.equal(dflt.cents, MONTHLY_US.cents);
  assert.equal(MONTHLY_US.cents, 18.34);
  assert.match(html, new RegExp(`id="f-rate"[^>]*value="${MONTHLY_US.cents}"`));
  assert.ok(html.includes(MONTHLY_US.period), 'the rate must carry the month it describes');
  assert.ok(html.includes(MONTHLY_US.releaseDate), 'the rate must carry its EIA release date');
});

test('the monthly national rate is never presented as an annual figure', () => {
  const html = PAGE();
  assert.notEqual(MONTHLY_US.cents, ANNUAL_US.cents);
  assert.match(html, /A June figure is not an annual figure/);
  // Every state row is annual and says so; the one monthly row says so too.
  for (const option of RATE_OPTIONS) {
    if (option.vintage === 'annual-2024') assert.match(option.label, /2024 annual/);
    else assert.match(option.label, /June 2026/);
  }
});

test('the all-sector EIA figure is present only as the trap it is', () => {
  const html = PAGE();
  assert.ok(html.includes('12.94'), 'the all-sector figure must be named so a reader can avoid it');
  assert.match(html, /not residential/);
  // And it is not selectable as a rate.
  assert.ok(!RATE_OPTIONS.some((o) => o.cents === 12.94));
});

test('the metered reports carry whether they can be reproduced', () => {
  const html = PAGE();
  assert.equal(METERED.filter((m) => m.reproducible).length, 1, 'exactly one metered report states its rate');
  assert.match(html, /No — no rate stated/);
  assert.match(html, /Yes — rate stated/);
});

test('the page publishes the required sections', () => {
  const html = PAGE();
  assert.match(html, /What we could not source/);
  assert.ok(COULD_NOT_SOURCE.length >= 4);
  assert.match(html, /<h2>Next<\/h2>/);
  assert.ok(html.includes(DISCLOSURE), 'the disclosure field must appear verbatim');
});

test('every source is cited, and every citation resolves', () => {
  const html = PAGE();
  const body = html.slice(html.indexOf('running-cost'));
  const used = new Set((body.match(/\[(\d{1,2})\]/g) ?? []).map((m) => Number(m.slice(1, -1))));
  for (const n of used) {
    assert.ok(n >= 1 && n <= SOURCES.length, `citation [${n}] does not resolve to a source`);
  }
  for (let i = 1; i <= SOURCES.length; i += 1) {
    assert.ok(used.has(i), `source ${i} (${SOURCES[i - 1].publisher}) is never cited — drop it or cite it`);
  }
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
  ];
  const html = PAGE();
  const sourcesFrom = html.indexOf('class="source-list"');
  const text = (sourcesFrom > -1 ? html.slice(0, sourcesFrom) : html)
    .replace(/<script[\s\S]*?<\/script>/g, '');
  for (const word of banned) {
    assert.ok(!new RegExp(word, 'i').test(text), `banned vocabulary on the page: ${word}`);
  }
});

test('no shelf-life or savings promise is made anywhere on the page', () => {
  const text = PAGE();
  assert.ok(!/will save you/i.test(text));
  assert.ok(!/guarantee/i.test(text));
});

/* ------------------------------------------------------------------ *
 * The tool works without JavaScript
 * ------------------------------------------------------------------ */

test('the default answer is in the HTML, not computed on the client', () => {
  const html = PAGE();
  const dflt = RATE_OPTIONS.find((r) => r.id === DEFAULT_RATE_ID);
  const r = computeCost(CHECKABLE_KWH.kwh, dflt.cents, DEFAULT_CYCLES_PER_MONTH);
  assert.ok(html.includes(usd(r.perBatch)), 'cost per batch must be server-rendered');
  assert.ok(html.includes(usd(r.perMonth)), 'cost per month must be server-rendered');
  assert.ok(html.includes(usd(r.perYear)), 'cost per year must be server-rendered');
});

test('the formula is server-rendered with the prefilled numbers in it', () => {
  const html = PAGE();
  const dflt = RATE_OPTIONS.find((r) => r.id === DEFAULT_RATE_ID);
  const r = computeCost(CHECKABLE_KWH.kwh, dflt.cents, DEFAULT_CYCLES_PER_MONTH);
  assert.ok(
    html.includes(`${CHECKABLE_KWH.kwh} kWh × (${dflt.cents} ¢ ÷ 100) = ${usd(r.perBatch)}`),
    'the per-batch formula must be shown filled in, not as a template',
  );
  assert.ok(html.includes(`× ${DEFAULT_CYCLES_PER_MONTH} cycles = ${usd(r.perMonth)}`));
});

test('the select degrades honestly when scripting is off', () => {
  assert.match(PAGE(), /With JavaScript off, type the rate\s+in directly/);
});

/* ------------------------------------------------------------------ *
 * Accessibility
 * ------------------------------------------------------------------ */

test('every control has a label bound to it by id', () => {
  const html = PAGE();
  for (const id of ['f-kwh', 'f-rate', 'f-state', 'f-cycles', 'embed-code']) {
    assert.match(html, new RegExp(`<label[^>]*for="${id}"`), `${id} has no label`);
  }
});

test('every control names its own help text through aria-describedby', () => {
  const html = PAGE();
  for (const [id, help] of [
    ['f-kwh', 'kwh-help'],
    ['f-rate', 'rate-help'],
    ['f-state', 'state-help'],
    ['f-cycles', 'cycles-help'],
  ]) {
    assert.match(html, new RegExp(`id="${id}"[\\s\\S]{0,400}?aria-describedby="${help}"`), `${id} → ${help}`);
    assert.match(html, new RegExp(`id="${help}"`), `${help} does not exist`);
  }
});

test('the result region announces itself when it changes', () => {
  const html = PAGE();
  assert.match(html, /id="results"[^>]*role="status"/);
  assert.match(html, /id="results"[\s\S]{0,120}aria-live="polite"/);
  // The copy button reports its outcome the same way.
  assert.match(html, /id="embed-status"[^>]*role="status"/);
});

test('every scrolling table is a keyboard-reachable landmark with a name', () => {
  const html = PAGE();
  const regions = html.match(/class="table-scroll"[^>]*/g) ?? [];
  assert.ok(regions.length >= 4, 'expected the phase, claims, metered and EIA tables');
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

test('touch targets clear 44px and the small-screen layout drops horizontal scroll', () => {
  const html = PAGE();
  // The rules live in one global block on this page; assert they are present
  // rather than measuring, which is what a browser test would do.
  assert.match(html, /\.field input,\s*\.field select\s*\{[^}]*min-height:\s*44px/);
  assert.match(html, /#recalc-btn\s*\{[^}]*min-height:\s*44px/);
  assert.match(html, /#embed-btn\s*\{[^}]*min-height:\s*44px/);
  assert.match(html, /summary\s*\{[^}]*min-height:\s*44px/);
  // Lightning CSS may emit either `max-width:719px` or the range syntax
  // `width<=719px`; the breakpoint is what matters, not the spelling.
  assert.match(html, /@media[^{]*719px/, 'the stacked-card fallback must exist for narrow viewports');
  assert.match(html, /content:\s*attr\(data-label\)/, 'stacked cells must carry their column name');
});

test('every stacked table cell carries the column name it will print', () => {
  // Below 720px the header row is hidden, so a cell without data-label loses
  // its column entirely.
  const html = PAGE();
  const tableStart = html.indexOf('<table class="tool-table claims-table"');
  assert.ok(tableStart > -1, 'the claims table is missing');
  const claimsTable = html.slice(tableStart, html.indexOf('</table>', tableStart));
  const bodyCells = claimsTable.match(/<td[^>]*>/g) ?? [];
  assert.ok(bodyCells.length > 0);
  for (const cell of bodyCells) {
    assert.match(cell, /data-label="/, `a claims-table cell has no data-label: ${cell}`);
  }
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

test('the attribution survives embed mode', () => {
  const html = PAGE();
  const attribution = html.match(/<p class="attribution">[\s\S]*?<\/p>/);
  assert.ok(attribution, 'the attribution line is missing');
  assert.ok(!attribution[0].includes('data-embed-hide'), 'the attribution must not be hidden in embed mode');
  assert.match(attribution[0], /Calculator by Sublime Pantry/);
});

test('the embed snippet points at the embed URL and names the frame', () => {
  const tool = toolByHref('/tools/running-cost');
  const snippet = embedSnippet(tool);
  assert.ok(snippet.includes(embedUrl(tool)));
  assert.match(snippet, /title="/, 'an untitled iframe announces as "frame" to a screen reader');
  assert.match(snippet, /height="\d+"/);
  assert.ok(PAGE().includes('?embed=1'), 'the page must offer the embed URL');
});

test('the tool is registered, and the registry agrees with the page', () => {
  const tool = toolByHref('/tools/running-cost');
  assert.ok(tool, '/tools/running-cost is not registered in src/lib/tools.ts');
  assert.equal(tool.embeddable, true);
  assert.equal(tool.homepageEmbed, true);
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

test('the calculator makes no network request and stores nothing', () => {
  // Asserted against our source, not the built page: the page also carries the
  // site's cart module, which uses sessionStorage for its own reasons. What is
  // being guarded is that THIS tool keeps a reader's numbers in the form.
  const scripts = readFileSync(new URL('../src/pages/tools/running-cost.astro', import.meta.url), 'utf8');
  for (const api of ['localStorage', 'sessionStorage', 'indexedDB', 'document.cookie', 'XMLHttpRequest']) {
    assert.ok(!scripts.includes(api), `the calculator must not touch ${api}`);
  }
  // `fetch(` would be a network call; the clipboard write is not one.
  assert.ok(!/\bfetch\s*\(/.test(scripts), 'the calculator must not make a network request');
});
