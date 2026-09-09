/**
 * The machine record against every page that publishes from it.
 *
 * The previous version of this file asserted that each recorded figure appeared
 * in *at least one* of the two articles. That is why the Harvest Right Medium
 * could carry two different power figures on two pages for a month: the
 * comparison page matched the record, so the assertion passed, and the buying
 * guide's different figure was never compared to anything at all. A check that
 * stops at "somebody says this" cannot find a disagreement — finding one is the
 * entire job.
 *
 * So: every recorded model, in every article that has a column for it, field by
 * field. One page is allowed to say *more* than the record — the buying guide's
 * load row adds Blue Alpine's typical-cycle figure — but it may not say
 * something else. A genuine disagreement fails unless MACHINE_CONFLICTS pins
 * it, and pinning requires writing down what each page actually says, so an
 * unresolved conflict cannot be quietly edited into agreement.
 *
 * Reads built HTML, not the article JSON: since Phase 4 the comparison table is
 * generated from the record and does not exist in the source at all.
 *
 * CI builds before it tests. Locally, run `npm run build` first.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { MACHINES, RETRACTED_MACHINE_CLAIMS, MACHINE_CONFLICTS } from '../src/lib/machines.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Article id → built page. */
const PAGES = {
  'home-freeze-dryers': 'dist/compare/home-freeze-dryers.html',
  'which-freeze-dryer': 'dist/guides/which-freeze-dryer.html',
};

function built(id) {
  const path = join(root, PAGES[id]);
  assert.ok(existsSync(path), `run \`npm run build\` first (${PAGES[id]})`);
  return readFileSync(path, 'utf8');
}

const source = (id) => readFileSync(join(root, `src/content/articles/${id}.json`), 'utf8');

/** Normalised cell text: tags out, citation markers out, dashes unified. */
const cell = (html) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\[\d+\]/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#8203;|&nbsp;/g, ' ')
    .replace(/[‐-―]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Which row label carries which recorded field. The two pages label the same
 * quantity differently, which is allowed; what is not allowed is the values
 * disagreeing underneath the different labels.
 */
const ROW_LABELS = {
  price: ['List price', 'List price (Sept 5, 2026)', 'List price*'],
  trays: ['Trays'],
  load: ['Rated batch load', 'Fresh food per batch'],
  power: ['Power and circuit', 'Power'],
  pump: ['Pump'],
  warranty: ['Warranty'],
  range: ['Range of sizes'],
};

/** Every `<table>` on a page, as { head: string[], rows: [label, ...cells][] }. */
function tables(html) {
  return [...html.matchAll(/<table\b[\s\S]*?<\/table>/g)].map((m) => {
    const t = m[0];
    const cells = (row) => [...row.matchAll(/<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/g)].map((c) => cell(c[1]));
    const head = cells(t.match(/<thead>[\s\S]*?<\/thead>/)?.[0] ?? '');
    const rows = (t.match(/<tbody>[\s\S]*?<\/tbody>/)?.[0].match(/<tr>[\s\S]*?<\/tr>/g) ?? []).map(cells);
    return { head, rows };
  });
}

/** One value may be more specific than the other; neither may contradict it. */
const agrees = (a, b) => {
  const [x, y] = [cell(a), cell(b)];
  return x === y || x.includes(y) || y.includes(x);
};

const conflict = (model, field) =>
  MACHINE_CONFLICTS.find((c) => c.model === model && c.field === field);

test('the record is complete', () => {
  assert.equal(MACHINES.length, 3, `expected 3 machines, got ${MACHINES.length}`);
  for (const m of MACHINES) {
    for (const k of ['model', 'bundle', 'price', 'load', 'power', 'pump', 'warranty', 'trays', 'range', 'checked']) {
      assert.ok(m[k], `${m.model ?? '?'} is missing ${k}`);
    }
    assert.match(m.checked, /^\d{4}-\d{2}-\d{2}$/, `${m.model}: checked must be YYYY-MM-DD`);
  }
});

test('every page agrees with the record, model by model and field by field', () => {
  const disagreements = [];
  for (const id of Object.keys(PAGES)) {
    for (const { head, rows } of tables(built(id))) {
      for (const m of MACHINES) {
        const column = head.findIndex((h) => h.startsWith(m.model));
        if (column < 1) continue;
        for (const [field, labels] of Object.entries(ROW_LABELS)) {
          const row = rows.find((r) => labels.includes(r[0]));
          if (!row) continue;
          const published = row[column];
          if (agrees(published, m[field])) continue;

          const pinned = conflict(m.model, field);
          if (pinned && agrees(pinned.published[id] ?? '', published)) continue;
          disagreements.push(
            `${id}: ${m.model} ${field} — page says ${JSON.stringify(published)}, ` +
              `record says ${JSON.stringify(m[field])}`,
          );
        }
      }
    }
  }
  assert.deepEqual(disagreements, [], 'a page and the record disagree, and it is not a pinned conflict');
});

test('every pinned conflict is still real, and still says what it claims to say', () => {
  for (const c of MACHINE_CONFLICTS) {
    assert.ok(
      MACHINES.some((m) => m.model === c.model),
      `${c.model} is pinned as a conflict but is not in the record`,
    );
    const values = new Set(Object.values(c.published).map(cell));
    assert.ok(values.size > 1, `${c.model} ${c.field}: the pinned pages no longer disagree — resolve and delete the entry`);

    for (const [id, value] of Object.entries(c.published)) {
      const found = tables(built(id)).some(({ head, rows }) => {
        const column = head.findIndex((h) => h.startsWith(c.model));
        if (column < 1) return false;
        const row = rows.find((r) => ROW_LABELS[c.field].includes(r[0]));
        return row ? agrees(row[column], value) : false;
      });
      assert.ok(
        found,
        `${id} no longer publishes ${JSON.stringify(value)} for ${c.model} ${c.field} — ` +
          `the conflict record has gone stale, which means it is no longer describing the site`,
      );
    }
    assert.ok(c.why.length > 80, `${c.model} ${c.field}: a pinned conflict needs its reasoning written down`);
  }
});

/**
 * A retraction is allowed to name the number it retracts — "an earlier version
 * said ~900 W" is the opposite of republishing it. So sentences that announce a
 * correction are removed before the scan; everything else must be clean.
 */
function liveClaims(blob) {
  // Two kinds of line break defeat this, and both have. Article JSON carries
  // authored breaks as the two characters \ and n; built HTML carries real
  // ones, and the retraction on the comparison page happens to break between
  // "An earlier" and "version", so the phrase that marks a sentence as a
  // retraction did not match and the retraction read as a republication.
  // Collapse all whitespace before doing anything else.
  return blob
    .replace(/\\n/g, ' ')
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => !/An earlier version|has been removed|been corrected|Correction,/i.test(sentence))
    .join(' ');
}

test('no page republishes a retracted machine claim', () => {
  for (const id of Object.keys(PAGES)) {
    // Source and built output both: the source carries the FAQ and howTo fields
    // that reach structured data, the build carries the generated table.
    for (const blob of [source(id), built(id)]) {
      const live = liveClaims(blob);
      for (const { claim } of RETRACTED_MACHINE_CLAIMS) {
        assert.ok(
          !live.includes(claim),
          `${id} still states the retracted claim ${JSON.stringify(claim)} outside a retraction`,
        );
      }
    }
  }
});

test('each retracted claim is named where it was retracted, not just deleted', () => {
  const all = Object.keys(PAGES).map(source).join(' ');
  for (const claim of ['~900 W', '3-year limited']) {
    assert.ok(all.includes(claim), `${claim} is retracted in the record but named nowhere on the pages`);
  }
});

test('the comparison names the bundle for every column, and is generated', () => {
  assert.match(
    source('home-freeze-dryers'),
    /data-machine-comparison/,
    'the comparison table is authored again — it must render from the record',
  );
  const html = built('home-freeze-dryers');
  for (const m of MACHINES) {
    assert.ok(html.includes(m.bundle), `the built comparison does not name the bundle "${m.bundle}"`);
  }
});

/**
 * VERIFICATION DATE — a claim class, and therefore a shape.
 *
 * `/compare/home-freeze-dryers` said three different things about when its own
 * figures were checked: the table caption said September 5, the methodology box
 * said August 31, and the opening paragraph said August 31. A dated claim whose
 * date is wrong is worse than an undated one, because the date is the whole
 * reason a reader trusts a price on a page that cannot be republished daily.
 *
 * The record owns the date. Any page that states one for these figures must
 * state the record's.
 */
test('every page dates these figures the way the record dates them', () => {
  const recorded = new Set(
    MACHINES.map((m) => {
      const [y, mo, d] = m.checked.split('-').map(Number);
      return new Date(Date.UTC(y, mo - 1, d)).toUTCString();
    }),
  );
  const asUTC = (month, day, year) =>
    new Date(Date.UTC(year, month, day)).toUTCString();
  const MONTHS = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };

  const wrong = [];
  for (const id of Object.keys(PAGES)) {
    const text = built(id).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    // "checked August 31, 2026", "as published ... on September 5, 2026"
    // Prose claims about when these figures were checked. The byline's own
    // "verified <date>" chip is deliberately NOT matched: it is generated from
    // `updatedDate ?? publishedDate`, which is an editorial-update date and not
    // a re-verification of prices at all. That conflation is a real problem —
    // this page prints "verified Aug 31, 2026" beside a correction dated
    // September 6 and figures the record dates September 5 — but it is a
    // question about what the field means, not a figure to fix here.
    const shape =
      /(?:checked|as published[^.]{0,40}?on|prices? (?:were |was )?checked)\s+([A-Z][a-z]+)\.?\s+(\d{1,2}),?\s+(\d{4})/g;
    for (const m of text.matchAll(shape)) {
      const month = MONTHS[m[1].slice(0, 3).toLowerCase()];
      if (month === undefined) continue;
      const stated = asUTC(month, Number(m[2]), Number(m[3]));
      if (!recorded.has(stated)) {
        wrong.push(`${id}: "${m[0].trim()}" — the record says ${[...recorded].join(', ')}`);
      }
    }
  }
  assert.deepEqual(wrong, [], 'a page dates the machine figures differently from the record');
});
