import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Mirrors the two helpers in src/lib/nav.ts. The distinction they encode is the
// point of the test: only an exact match is a "page", and only a page may carry
// aria-current. A dropdown trigger is never the page.
const hit = (path, href) => !!href && (path === href || path.startsWith(`${href}/`));
const isCurrentPage = (path, href) => !!href && path === href;
const isCurrentSection = (path, item) =>
  hit(path, item.href) || (item.children ?? []).some((child) => hit(path, child.href));

/** Parse the exported trees out of nav.ts without needing a TS toolchain. */
function readNav() {
  const source = readFileSync(join(root, 'src/lib/nav.ts'), 'utf8');
  const entries = [];
  const re = /\{\s*href:\s*'([^']+)',\s*label:\s*'[^']*'(,\s*(pending|unlisted):\s*true)?\s*\}/g;
  let m;
  while ((m = re.exec(source))) {
    entries.push({ href: m[1], pending: m[3] === 'pending', unlisted: m[3] === 'unlisted' });
  }
  assert.ok(entries.length > 10, 'expected to parse the nav tree');
  return entries;
}

/** A page exists at this href. */
function builds(href) {
  const pages = join(root, 'src/pages');
  if (href === '/rss.xml') return existsSync(join(pages, 'rss.xml.ts'));
  const stem = join(pages, href.replace(/^\//, ''));
  return existsSync(`${stem}.astro`) || existsSync(join(stem, 'index.astro'));
}

test('every linked nav href resolves to a page that exists', () => {
  for (const { href, pending, unlisted } of readNav()) {
    if (pending || unlisted) continue;
    assert.ok(builds(href), `nav links to ${href} but no page builds it`);
  }
});

test('every pending nav href is a route that does not exist yet', () => {
  for (const { href, pending } of readNav()) {
    if (!pending) continue;
    assert.ok(!builds(href), `${href} now exists — it is built, so it is not \`pending\`. Use \`unlisted\` if you mean to keep it out of the nav.`);
  }
});

/**
 * The mirror. `pending` and `unlisted` both hide an entry, and hiding is the
 * only thing they share: pending says the page is not built, unlisted says it
 * is built and we choose not to link it. Asserting only the first lets the
 * second rot into it, and then neither flag proves anything — which is exactly
 * what happens if you reach for `pending` to hide a live page.
 */
test('every unlisted nav href is a route that DOES exist', () => {
  const unlistedEntries = readNav().filter((e) => e.unlisted);
  assert.ok(unlistedEntries.length > 0, 'expected at least one unlisted route');
  for (const { href } of unlistedEntries) {
    assert.ok(builds(href), `${href} is marked \`unlisted\` but nothing builds it — that is \`pending\``);
  }
});

test('an unlisted route is reachable but not in any rendered nav', () => {
  // /recipes is live and useful; U06 says it does not get a nav slot until it
  // has recipes in it.
  assert.ok(builds('/recipes'), '/recipes should still be a live route');
  const source = readFileSync(join(root, 'src/lib/nav.ts'), 'utf8');
  assert.match(source, /\{ href: '\/recipes', label: '[^']*', unlisted: true \}/);
});

test('aria-current is exact-match only', () => {
  assert.equal(isCurrentPage('/shop', '/shop'), true);
  // "All products" must not claim to be the current page while you are on a
  // tier landing page underneath it.
  assert.equal(isCurrentPage('/shop/pantry', '/shop'), false);
  assert.equal(isCurrentPage('/guides/rehydration-problems', '/guides'), false);
});

test('section state follows the whole subtree', () => {
  const learn = {
    label: 'Learn',
    children: [{ href: '/guides' }, { href: '/troubleshooting' }, { href: '/compare' }],
  };
  assert.equal(isCurrentSection('/guides/rehydration-problems', learn), true);
  assert.equal(isCurrentSection('/troubleshooting', learn), true);
  assert.equal(isCurrentSection('/shop', learn), false);
  // A group header has no href of its own, so it can only light up through a
  // child — never because the path happens to start with its label.
  assert.equal(isCurrentSection('/learn', learn), false);

  const camping = { href: '/camping', label: 'Camping' };
  assert.equal(isCurrentSection('/camping/trail-meals', camping), true);
  assert.equal(isCurrentSection('/', camping), false);
});
