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
  const re = /\{\s*href:\s*'([^']+)',\s*label:\s*'[^']*'(,\s*pending:\s*true)?\s*\}/g;
  let m;
  while ((m = re.exec(source))) entries.push({ href: m[1], pending: Boolean(m[2]) });
  assert.ok(entries.length > 10, 'expected to parse the nav tree');
  return entries;
}

test('every non-pending nav href resolves to a page that exists', () => {
  const pages = join(root, 'src/pages');
  for (const { href, pending } of readNav()) {
    if (pending) continue;
    if (href === '/rss.xml') {
      assert.ok(existsSync(join(pages, 'rss.xml.ts')), 'rss.xml.ts is missing');
      continue;
    }
    const stem = join(pages, href.replace(/^\//, ''));
    const found = existsSync(`${stem}.astro`) || existsSync(join(stem, 'index.astro'));
    assert.ok(found, `nav links to ${href} but no page builds it`);
  }
});

test('every pending nav href is a route that does not exist yet', () => {
  const pages = join(root, 'src/pages');
  for (const { href, pending } of readNav()) {
    if (!pending) continue;
    const stem = join(pages, href.replace(/^\//, ''));
    const found = existsSync(`${stem}.astro`) || existsSync(join(stem, 'index.astro'));
    assert.ok(!found, `${href} now exists — drop \`pending: true\` from nav.ts`);
  }
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
