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
