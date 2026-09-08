import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Parse MACHINES and RETRACTED_MACHINE_CLAIMS out of the TS record. */
function readRecord() {
  const src = readFileSync(join(root, 'src/lib/machines.ts'), 'utf8');
  const block = src.slice(src.indexOf('export const MACHINES'), src.indexOf('export const RETRACTED'));
  const machines = [...block.matchAll(/\{([^{}]+)\}/g)].map((m) => {
    const o = {};
    for (const f of m[1].matchAll(/(\w+):\s*'((?:[^'\\]|\\.)*)'/g)) o[f[1]] = f[2].replace(/\\'/g, "'");
    return o;
  });
  const retBlock = src.slice(src.indexOf('export const RETRACTED'));
  const retracted = [...retBlock.matchAll(/claim:\s*'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1].replace(/\\'/g, "'"));
  return { machines, retracted };
}

const { machines, retracted } = readRecord();

const ARTICLES = ['home-freeze-dryers', 'which-freeze-dryer'];
const bodies = Object.fromEntries(
  ARTICLES.map((id) => {
    const d = JSON.parse(readFileSync(join(root, `src/content/articles/${id}.json`), 'utf8'));
    // Every string field, not just the body: the tables have travelled into
    // captions and structured data before.
    return [id, JSON.stringify(d)];
  }),
);

test('the record parsed', () => {
  assert.equal(machines.length, 3, `expected 3 machines, parsed ${machines.length}`);
  assert.ok(retracted.length >= 4, `expected the retraction list, parsed ${retracted.length}`);
  for (const m of machines) {
    for (const k of ['model', 'bundle', 'price', 'load', 'power', 'pump', 'warranty', 'checked']) {
      assert.ok(m[k], `${m.model ?? '?'} is missing ${k}`);
    }
    assert.match(m.checked, /^\d{4}-\d{2}-\d{2}$/, `${m.model}: checked must be YYYY-MM-DD`);
  }
});

/**
 * A retraction is allowed to name the number it retracts — "an earlier version
 * said ~900 W" is the opposite of republishing it. So sentences that announce a
 * correction are removed before the scan; everything else must be clean.
 */
function liveClaims(blob) {
  // The blob is stringified JSON, so authored line breaks arrive as the two
  // characters \ and n. Collapse them to real whitespace or sentence splitting
  // and phrase matching both silently fail.
  return blob
    .replace(/\\n/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => !/An earlier version|has been removed|been corrected|Correction,/i.test(sentence))
    .join(' ');
}

test('no article republishes a retracted machine claim', () => {
  for (const [id, blob] of Object.entries(bodies)) {
    const live = liveClaims(blob);
    for (const claim of retracted) {
      assert.ok(
        !live.includes(claim),
        `${id} still states the retracted claim ${JSON.stringify(claim)} outside a retraction`,
      );
    }
  }
});

test('each retracted claim is actually retracted somewhere, not just deleted', () => {
  // The two machine articles between them should own the retraction of any
  // number they used to publish. This keeps the list honest as it grows.
  const all = Object.values(bodies).join(' ');
  for (const claim of ['~900 W', '3-year limited']) {
    assert.ok(all.includes(claim), `${claim} is retracted in the record but named nowhere on the pages`);
  }
});

test('both articles agree with the record on price, load, power and warranty', () => {
  // Figures are quoted with en dashes and non-breaking spellings in the HTML;
  // compare on a normalised form so a typographic difference is not a failure.
  const norm = (s) => s.replace(/[‐-―]/g, '-').replace(/\s+/g, ' ');
  for (const m of machines) {
    for (const field of ['price', 'load', 'power', 'warranty']) {
      const value = norm(m[field]);
      const present = Object.entries(bodies).filter(([, blob]) => norm(blob).includes(value));
      assert.ok(
        present.length > 0,
        `${m.model} ${field} ${JSON.stringify(m[field])} appears in neither article — ` +
          `the record and the pages have drifted`,
      );
    }
  }
});

test('the spec comparison names the bundle for every column', () => {
  const blob = bodies['home-freeze-dryers'];
  for (const m of machines) {
    assert.ok(blob.includes(m.bundle), `home-freeze-dryers does not name the bundle "${m.bundle}"`);
  }
});
