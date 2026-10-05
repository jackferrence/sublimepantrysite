/**
 * The canonical URL and the sitemap must name the same address.
 *
 * The site builds with `trailingSlash: 'never'` and the sitemap lists `/about`.
 * For a month the canonical said `/about/`, so every page pointed search
 * engines at a different URL from the one the sitemap and the index agreed on.
 * Reads dist/, so `npm run build` must run first.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';

function htmlFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...htmlFiles(p));
    else if (entry.name.endsWith('.html')) out.push(p);
  }
  return out;
}

test('no canonical ends in a trailing slash, except the homepage', { skip: !existsSync(DIST) }, () => {
  const offenders = [];
  for (const file of htmlFiles(DIST)) {
    const href = readFileSync(file, 'utf8').match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    if (!href) continue;
    const path = new URL(href).pathname;
    if (path !== '/' && path.endsWith('/')) offenders.push(`${file}: ${href}`);
  }
  assert.deepEqual(offenders, []);
});

test('every title tag fits in a search result', { skip: !existsSync(DIST) }, () => {
  const offenders = [];
  for (const file of htmlFiles(DIST)) {
    const title = readFileSync(file, 'utf8').match(/<title>([^<]*)<\/title>/)?.[1] ?? '';
    const decoded = title.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
    if (decoded.length > 60) offenders.push(`${file}: ${decoded.length} chars`);
  }
  assert.deepEqual(offenders, []);
});
