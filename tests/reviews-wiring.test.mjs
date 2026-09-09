/**
 * Judge.me reviews are wired to every product, and to real IDs.
 *
 * The integration existed and reached nothing. `getProductReviews` had exactly
 * one caller — the boxed starter kit's hand-built product page — and
 * `SHOPIFY_PRODUCT_IDS` had exactly one entry, that product's. When the kit was
 * archived on 2026-09-09 and its page removed, the whole feature became dead
 * code, and every test stayed green because no test knew it was supposed to run.
 *
 * That is the silent-absence shape this codebase keeps getting bitten by: a
 * capability that fails by doing nothing looks identical to a capability that
 * has nothing to do. These assertions make the difference visible.
 *
 * CI builds before it tests. Locally, run `npm run build` first.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, globSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { CATALOG } from '../src/lib/commerce.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Parsed, not imported: the map is module-private and should stay that way. */
function mappedIds() {
  const src = readFileSync(join(root, 'src/lib/reviews.ts'), 'utf8');
  const block = src.match(/const SHOPIFY_PRODUCT_IDS[^{]*\{([\s\S]*?)\n\};/);
  assert.ok(block, 'SHOPIFY_PRODUCT_IDS was renamed or removed');
  return new Map([...block[1].matchAll(/'([^']+)':\s*'([^']+)'/g)].map((m) => [m[1], m[2]]));
}

test('every catalog product has a Judge.me external_id', () => {
  const ids = mappedIds();
  const missing = CATALOG.filter((p) => !ids.has(p.handle)).map((p) => p.handle);
  assert.deepEqual(missing, [], 'a product would silently render without reviews');
});

test('the review map carries no product the catalog dropped', () => {
  const ids = mappedIds();
  const handles = new Set(CATALOG.map((p) => p.handle));
  const stale = [...ids.keys()].filter((h) => !handles.has(h));
  assert.deepEqual(stale, [], 'the review map still names a product we no longer sell');
});

test('each id is a distinct Shopify numeric product id', () => {
  const ids = mappedIds();
  for (const [handle, id] of ids) {
    assert.match(id, /^\d{6,}$/, `${handle}: not a numeric Shopify product id`);
  }
  const values = [...ids.values()];
  assert.equal(new Set(values).size, values.length, 'two products share one Judge.me external_id');
});

test('the product template actually calls the reviews integration', () => {
  // The assertion the old arrangement could not make. A map full of correct ids
  // is worth nothing if no page asks for them.
  const pdp = readFileSync(join(root, 'src/pages/shop/[handle].astro'), 'utf8');
  assert.match(pdp, /getProductReviews\(product\)/, 'the product page does not fetch reviews');
  assert.match(pdp, /<ProductReviews\s+reviews=\{reviews\}/, 'the product page does not render reviews');
});

test('no built product page invents a rating', () => {
  // aggregateRating may appear only where Judge.me returned real published
  // reviews. With Judge.me unconfigured, as in CI and local builds, that means
  // nowhere — and a star rating appearing anyway is a fabricated claim.
  const dist = join(root, 'dist');
  const pages = globSync('shop/*.html', { cwd: dist });
  assert.ok(pages.length >= 8, 'run `npm run build` first — product pages are missing');
  for (const file of pages) {
    const html = readFileSync(join(dist, file), 'utf8');
    if (!/"aggregateRating"/.test(html)) continue;
    assert.match(
      html,
      /collected by Judge\.me/,
      `${file}: emits aggregateRating with no visible reviews behind it`,
    );
  }
});
