import { test } from 'node:test';
import assert from 'node:assert/strict';

// Mirrors src/lib/paths.ts. The site builds with `build.format: 'file'`, so
// Astro.url.pathname is a file path at build time; source_path must not inherit
// that shape or every lead from the homepage is recorded as "/index.html".
function normalizePath(pathname) {
  const withoutExtension = pathname.replace(/\.html$/, '');
  const withoutIndex = withoutExtension.replace(/\/index$/, '/');
  const trimmed = withoutIndex.replace(/(.+)\/$/, '$1');
  return trimmed || '/';
}

test('normalizePath maps built file paths back to public URLs', () => {
  assert.equal(normalizePath('/index.html'), '/');
  assert.equal(normalizePath('/'), '/');
  assert.equal(normalizePath('/shop.html'), '/shop');
  assert.equal(normalizePath('/shop'), '/shop');
  assert.equal(normalizePath('/guides/complete-batch-workflow.html'), '/guides/complete-batch-workflow');
  assert.equal(normalizePath('/shop/freeze-dryer-packaging-starter-kit.html'), '/shop/freeze-dryer-packaging-starter-kit');
  assert.equal(normalizePath('/guides/'), '/guides');
});

/**
 * The support address.
 *
 * A personal gmail account was on /shipping-returns as the returns contact.
 * That is the address a customer writes to when a $60 order arrives damaged,
 * and it reads — correctly — as a store that may not be answering. It is also
 * the address the Organization structured data publishes to the knowledge
 * graph, so it is a fact about the business, not a page detail.
 *
 * This test is a ratchet: once removed, it cannot come back by hand.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { SUPPORT_EMAIL } from '../src/lib/paths.ts';

function sourceFiles(dir = 'src') {
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...sourceFiles(path));
    else if (/\.(astro|ts|tsx|js|mjs|json)$/.test(name)) out.push(path);
  }
  return out;
}

test('the support address is the store address, on one line, in one place', () => {
  assert.equal(SUPPORT_EMAIL, 'support@sublimepantry.com');
});

test('no free-mailbox address appears anywhere the site can render it', () => {
  const offenders = [];
  for (const file of sourceFiles()) {
    const body = readFileSync(file, 'utf8');
    // The comment in this test file and in paths.ts explains the rule; the
    // rule is about addresses, so only match something shaped like one.
    const hits = body.match(/[\w.+-]+@(?:gmail|yahoo|hotmail|outlook|icloud|aol)\.com/gi);
    if (hits) offenders.push(`${file}: ${[...new Set(hits)].join(', ')}`);
  }
  assert.deepEqual(offenders, [], `use SUPPORT_EMAIL instead:\n${offenders.join('\n')}`);
});
