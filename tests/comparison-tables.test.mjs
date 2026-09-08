/**
 * U10 — the comparison tables on a phone.
 *
 * The buying guide's table is eleven columns wide. On a 390px screen it was a
 * horizontal scroll with the criterion label sliding out of view before the
 * reader reached the model they came for, and no cue that there was anything to
 * the right of the fold. `polishTables` now emits a stacked-card equivalent of
 * every entity-per-column comparison, a sticky row label, and a scroll cue that
 * the page only reveals where a region actually overflows.
 *
 * These read built HTML for the reason every check in this repo does: the cards
 * are generated at render time from authored `bodyHtml`, so the source tells
 * you what was written and only `dist/` tells you what a reader gets.
 *
 * The load-bearing assertion is `equivalent text`. Two representations of one
 * comparison is a drift risk by construction, and the only thing that makes it
 * safe is that neither can hold a value the other does not. That is asserted
 * here as a set comparison, not eyeballed.
 *
 * CI builds before it tests. Locally, run `npm run build` first.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const DIST = new URL('../dist/', import.meta.url);

/** Every built page that carries an authored article body. */
const ARTICLES = [
  'guides/which-freeze-dryer',
  'guides/cottage-economics',
  'guides/complete-batch-workflow',
  'compare/home-freeze-dryers',
  'compare/fruit-vs-vegetables-vs-meat',
  'compare/storage-containers',
  'troubleshooting/batch-not-dry',
  'troubleshooting/chewy-candy',
  'troubleshooting/rehydration-problems',
  'troubleshooting/storage-failure',
  'troubleshooting/vacuum-error',
];

/**
 * The four comparisons whose columns are the things being compared, and the
 * number of things each compares. Named rather than derived: a test that
 * recomputes the rule it is checking passes whatever the rule does.
 */
const CARD_TABLES = {
  'guides/which-freeze-dryer': 10,
  'compare/home-freeze-dryers': 3,
  'compare/fruit-vs-vegetables-vs-meat': 3,
  'compare/storage-containers': 3,
};

function built(page) {
  const path = new URL(`${page}.html`, DIST);
  if (!existsSync(path)) {
    throw new Error(`dist/${page}.html is missing — run \`npm run build\` before \`npm test\`.`);
  }
  return readFileSync(path, 'utf8');
}

const text = (html) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const all = (html, re) => [...html.matchAll(re)].map((m) => m[1]);

/** The `<table>` markup of every scroll region on a page, in document order. */
const tablesOf = (html) => all(html, /<div class="table-scroll[^"]*"[^>]*>\s*(<table[\s\S]*?<\/table>)/g);

test('every scroll region is focusable, named, and named after its own contents', () => {
  for (const page of ARTICLES) {
    const html = built(page);
    for (const region of all(html, /(<div class="table-scroll[^>]*>)/g)) {
      assert.match(region, /tabindex="0"/, `${page}: scroll region is not keyboard reachable`);
      assert.match(region, /role="region"/, `${page}: scroll region has no role`);
      const label = region.match(/aria-label="([^"]*)"/)?.[1];
      assert.ok(label, `${page}: scroll region has no accessible name`);
      assert.notEqual(
        label,
        'Table, scrolls horizontally',
        `${page}: a region fell back to the generic name — it needs a <caption>, or an <svg><title>`,
      );
    }
  }
});

test('the leading cell of every body row is a row header', () => {
  for (const page of ARTICLES) {
    for (const table of tablesOf(built(page))) {
      const tbody = table.match(/<tbody>[\s\S]*?<\/tbody>/)?.[0];
      if (!tbody) continue;
      for (const row of tbody.match(/<tr>[\s\S]*?<\/tr>/g) ?? []) {
        assert.match(
          row,
          /^<tr>\s*<th\b[^>]*scope="row"/,
          `${page}: a row label is a <td>, which leaves every value in the row unlabelled`,
        );
      }
    }
  }
});

test('exactly the entity-per-column comparisons become cards', () => {
  for (const page of ARTICLES) {
    const html = built(page);
    const lists = all(html, /<ul class="table-card-list"[^>]*>([\s\S]*?)<\/ul>/g);
    const expected = CARD_TABLES[page];
    if (!expected) {
      assert.equal(lists.length, 0, `${page}: a calculation table was turned into cards`);
      continue;
    }
    assert.equal(lists.length, 1, `${page}: expected one card list`);
    const cards = lists[0].match(/<li class="table-card">/g) ?? [];
    assert.equal(cards.length, expected, `${page}: one card per thing compared`);
  }
});

test('the cards and the table carry exactly the same values', () => {
  for (const [page, count] of Object.entries(CARD_TABLES)) {
    const html = built(page);
    const table = tablesOf(html).find((t) => /<thead>/.test(t) && /<tbody>/.test(t));
    const head = table.match(/<thead>[\s\S]*?<\/thead>/)[0];
    const body = table.match(/<tbody>[\s\S]*?<\/tbody>/)[0];

    const rows = (body.match(/<tr>[\s\S]*?<\/tr>/g) ?? []).map((row) =>
      all(row, /<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/g).map(text),
    );
    const columns = all(head, /<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/g).map(text).slice(1);
    assert.equal(columns.length, count);

    const cardList = html.match(/<ul class="table-card-list"[^>]*>([\s\S]*?)<\/ul>/)[1];
    const cards = cardList.match(/<li class="table-card">[\s\S]*?<\/li>/g);

    assert.deepEqual(
      cards.map((c) => text(c.match(/<p class="table-card-name">([\s\S]*?)<\/p>/)[1])),
      columns,
      `${page}: card names are not the table's column headers`,
    );

    cards.forEach((card, column) => {
      assert.deepEqual(
        all(card, /<dt>([\s\S]*?)<\/dt>/g).map(text),
        rows.map((r) => r[0]),
        `${page}: card ${column + 1} does not list the table's criteria`,
      );
      assert.deepEqual(
        all(card, /<dd>([\s\S]*?)<\/dd>/g).map(text),
        rows.map((r) => r[column + 1]),
        `${page}: card ${column + 1} does not carry that column's values`,
      );
    });
  }
});

test('the scroll cue is not asserted until the page can see that it is true', () => {
  for (const page of ARTICLES) {
    const html = built(page);
    const cues = all(html, /(<p class="table-cue"[^>]*>)/g);
    const regions = all(html, /(<div class="table-scroll[^>]*>)/g);
    assert.equal(cues.length, regions.length, `${page}: every scroll region gets a cue, and only those`);
    for (const cue of cues) {
      assert.match(
        cue,
        /\bhidden\b/,
        `${page}: a "scrolls sideways" cue ships visible — with scripting off it is an unverified claim about the reader's screen`,
      );
    }
  }
});

test('the card caption repeats the table caption, and nothing else', () => {
  for (const page of Object.keys(CARD_TABLES)) {
    const html = built(page);
    const table = tablesOf(html).find((t) => /<caption/.test(t));
    const caption = text(table.match(/<caption[^>]*>([\s\S]*?)<\/caption>/)[1]);
    const cardCaption = text(html.match(/<p class="table-cards-caption">([\s\S]*?)<\/p>/)[1]);
    assert.equal(cardCaption, caption, `${page}: the cards describe themselves differently from the table`);
  }
});
