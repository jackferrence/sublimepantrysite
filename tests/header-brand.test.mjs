/**
 * The header brand block.
 *
 * Removing the wordmark removes the site's name from the page. Everything here
 * exists to prove it did not actually leave: not from the accessible tree, not
 * from the HTML a crawler reads, and not from the structured data. A logo that
 * looks right and announces nothing is the failure this guards against.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const DIST = new URL('../dist/', import.meta.url);
const built = (f) => {
  const p = new URL(f, DIST);
  if (!existsSync(p)) throw new Error(`dist/${f} missing — run \`npm run build\` first`);
  return readFileSync(p, 'utf8');
};
const header = (html) => html.slice(html.indexOf('<header'), html.indexOf('</header>'));
const footer = (html) => html.slice(html.indexOf('<footer'), html.indexOf('</footer>'));

test('the home link carries an accessible name', () => {
  // axe reports zero violations on this page; this pins the specific attribute
  // axe was reading, so a refactor that drops it fails here rather than in a
  // manual audit six months later.
  assert.match(header(built('index.html')), /<a href="\/" class="brand" aria-label="Sublime Pantry — home"/);
});

test('the brand name survives in the HTML, visually hidden', () => {
  // The SEO and AI-search signal. The wordmark is gone from the design; the
  // string is not gone from the document.
  assert.match(header(built('index.html')), /<span class="sr-only"[^>]*>Sublime Pantry<\/span>/);
});

test('the plate is decorative, so the link is not announced twice', () => {
  assert.match(header(built('index.html')), /<img src="\/brand\/[^"]+\.svg" alt=""/);
});

test('the artwork the header points at actually exists', () => {
  const m = /<img src="(\/brand\/[^"]+\.svg)"/.exec(header(built('index.html')));
  assert.ok(m, 'the brand block must reference a file');
  assert.ok(existsSync(new URL(`../public${m[1]}`, import.meta.url)), `${m[1]} is not in public/`);
});

test('Organization structured data still carries the name', () => {
  const org = [...built('index.html').matchAll(/<script[^>]*ld\+json[^>]*>([\s\S]*?)<\/script>/g)]
    .flatMap(([, j]) => { const p = JSON.parse(j); return p['@graph'] ?? [p]; })
    .find((n) => n['@type'] === 'Organization');
  assert.equal(org.name, 'Sublime Pantry');
});

test('the footer keeps the full lockup', () => {
  // This change is header-only. The footer is where the wordmark still reads.
  const f = footer(built('index.html'));
  assert.ok(f.includes('Sublime Pantry'), 'the footer wordmark must remain');
  assert.match(f, /<svg[^>]*class="mark/, 'the footer keeps the token-drawn Mark');
});

test('the plate colour has exactly one name', () => {
  const css = readFileSync(new URL('../public/styles/base.css', import.meta.url), 'utf8');
  const declarations = [...css.matchAll(/--([a-z-]+):\s*#b0ddec/gi)].map((m) => m[1]);
  assert.deepEqual(declarations, ['logo-frost'], 'one hex, one token — no --ice-pale duplicate');
});

test('the documented rules match what the code does', () => {
  // A rule the code contradicts is worse than no rule: the next person cannot
  // tell which is authoritative.
  const media = readFileSync(new URL('../src/lib/media.ts', import.meta.url), 'utf8');
  assert.ok(media.includes('BrandBlock'), 'media.ts must name the one sanctioned exception');
  const css = readFileSync(new URL('../public/styles/base.css', import.meta.url), 'utf8');
  assert.ok(/header brand block/.test(css), '--logo-frost must permit the block it is used for');
});
