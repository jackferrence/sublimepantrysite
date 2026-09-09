/**
 * Claim classes that appear in more than one place get a SHAPE assertion and
 * render from one constant.
 *
 * Fixed-string sweeps are a second pass, never the first: a false shipping
 * claim ("Ships free · US only") sat on all 32 pages through an entire phase
 * because that exact phrase was not in the sweep list. A shape catches the
 * claim you did not think to search for.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, globSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const pages = () =>
  globSync('**/*.html', { cwd: dist }).map((f) => ({
    file: f,
    text: readFileSync(join(dist, f), 'utf8').replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '),
  }));

/** The sentence a match sits in, for judging attribution and negation. */
function sentenceAround(text, index) {
  const start = text.lastIndexOf('.', index) + 1;
  const end = text.indexOf('.', index);
  return text.slice(start, end === -1 ? text.length : end + 1).trim();
}

test('SHIPPING: no page states free shipping without its condition', () => {
  const shape = /\bfree\s+(?:US\s+)?shipping\b|\bShips?\s+free\b/gi;
  const qualified = /\$45|45 or more|over \$?45|threshold|shipping-returns/i;
  for (const { file, text } of pages()) {
    for (const m of text.matchAll(shape)) {
      const s = sentenceAround(text, m.index);
      assert.ok(qualified.test(s), `${file}: unqualified free-shipping claim — "${s.slice(0, 150)}"`);
    }
  }
});

test('SHELF LIFE: no shelf-life promise in our own voice', () => {
  const shape = /(?:stays?|keeps?|lasts?|last|good|crisp|fresh)\s+(?:for\s+)?(?:decades|\d+\s*years|a lifetime|forever)/gi;
  // A shelf-life figure is allowed when the sentence attributes it or denies it.
  const attributed = /no verification|supposedly|claims?|manufacturer|commercially|not\b|Iowa State|Minnesota|guarantee\w* no|makes no/i;
  for (const { file, text } of pages()) {
    for (const m of text.matchAll(shape)) {
      const s = sentenceAround(text, m.index);
      assert.ok(attributed.test(s), `${file}: unattributed shelf-life promise — "${s.slice(0, 170)}"`);
    }
  }
});

test('TESTING: the site never claims hands-on testing', () => {
  const shape = /\bwe\b(?:\s+\w+){0,3}\s+(?:bench-?)?tested\b/gi;
  for (const { file, text } of pages()) {
    for (const m of text.matchAll(shape)) {
      const s = sentenceAround(text, m.index);
      assert.match(s, /\bnot\b|\bnever\b|\bhave not\b/i, `${file}: claims hands-on testing — "${s.slice(0, 150)}"`);
    }
  }
});

test('OWNERSHIP: any page showing our product price discloses that we sell it', () => {
  const label = readFileSync(join(root, 'src/lib/commerce.ts'), 'utf8').match(/OWNERSHIP_LABEL = '([^']+)'/)[1];
  const price = readFileSync(join(root, 'src/lib/commerce.ts'), 'utf8').match(/displayPrice: '([^']+)'/)[1].split(' ')[0];
  const missing = pages().filter((p) => p.text.includes(price) && !p.text.includes(label)).map((p) => p.file);
  assert.deepEqual(missing, [], `pages show ${price} without "${label}"`);
});

test('PRICE: our product price is written in exactly one place', () => {
  const offenders = globSync('src/**/*.{astro,ts}', { cwd: root })
    .filter((f) => f !== 'src/lib/commerce.ts')
    .filter((f) => /\$\d+\.\d{2}/.test(readFileSync(join(root, f), 'utf8')));
  assert.deepEqual(offenders, [], 'a product price is hardcoded outside src/lib/commerce.ts');
});
