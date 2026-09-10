import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { CATALOG } from '../src/lib/commerce.ts';

test('every product has exact mapped media or renders the explicit pending state', () => {
  const gallery = readFileSync(new URL('../src/components/ProductGallery.astro', import.meta.url), 'utf8');
  assert.match(gallery, /Exact product media pending/i);
  for (const product of CATALOG) {
    for (const image of product.images) {
      assert.match(image.src, /^\/images\/library\//);
      assert.equal(image.source, 'manufacturer');
      assert.ok(image.highRes, `${product.sku}: mapped media lacks a zoom source`);
      assert.ok(existsSync(new URL(`../public${image.highRes}`, import.meta.url)), `${image.highRes} does not exist`);
      assert.ok(image.width > 0 && image.height > 0, `${product.sku}: intrinsic dimensions missing`);
    }
  }
});

test('the gallery exposes keyboard selection, zoom and truthful provenance', () => {
  const gallery = readFileSync(new URL('../src/components/ProductGallery.astro', import.meta.url), 'utf8');
  assert.match(gallery, /aria-pressed/);
  assert.match(gallery, /ArrowLeft|ArrowRight/);
  assert.match(gallery, /<dialog/);
  assert.match(gallery, /image\.caption/);
  assert.ok(!/stock photo/i.test(gallery));
});
