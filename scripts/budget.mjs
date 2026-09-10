import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

/**
 * docs/CLAUDE-CODE-PROMPT.md T5.3. Reads `dist/` after a build and fails if
 * any page's CSS exceeds 50KB gz, its JS exceeds 30KB gz, or its total
 * transfer (HTML + CSS + JS, per T5.3's own wording — images are
 * explicitly excluded: "excluding the largest image") exceeds 500KB gz.
 *
 * Per-page composition is read from the actual `<link rel="stylesheet">`
 * and `<script src="...">` references in each built HTML file — only
 * same-origin (local) files count toward the budget; a `<script src=
 * "https://plausible.io/...">` or the Shopify Storefront runtime CDN
 * script are third-party and not something this repo's own bundle size
 * choices control. A de-duplicated cache means shared files (base.css,
 * tokens.css, header-nav.js, events.js) are only gzipped once, not once
 * per page that references them.
 */
const DIST_PATH = fileURLToPath(new URL('../dist/', import.meta.url));

const CSS_BUDGET = 50 * 1024;
const JS_BUDGET = 30 * 1024;
const TOTAL_BUDGET = 500 * 1024;

if (!existsSync(DIST_PATH)) {
  console.error('dist/ does not exist — run `npm run build` first.');
  process.exit(1);
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('.html')) out.push(full);
  }
}

const htmlFiles = [];
walk(DIST_PATH.replace(/\/$/, ''), htmlFiles);

const gzipSizeCache = new Map();
function gzipSizeOf(localPath) {
  if (gzipSizeCache.has(localPath)) return gzipSizeCache.get(localPath);
  const filePath = join(DIST_PATH, localPath.replace(/^\//, ''));
  let size = 0;
  if (existsSync(filePath) && statSync(filePath).isFile()) {
    size = gzipSync(readFileSync(filePath)).length;
  }
  gzipSizeCache.set(localPath, size);
  return size;
}

function isLocal(src) {
  return typeof src === 'string' && src.startsWith('/') && !src.startsWith('//');
}

const failures = [];

for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  const relPage = file.slice(DIST_PATH.replace(/\/$/, '').length) || '/';

  const cssSrcs = [...html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']/g)]
    .map((m) => m[1])
    .filter(isLocal);
  const jsSrcs = [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/g)]
    .map((m) => m[1])
    .filter(isLocal)
    .filter((src) => extname(src) === '.js' || extname(src) === '.mjs');

  const cssBytes = cssSrcs.reduce((sum, src) => sum + gzipSizeOf(src), 0);
  const jsBytes = jsSrcs.reduce((sum, src) => sum + gzipSizeOf(src), 0);
  const htmlBytes = gzipSync(Buffer.from(html)).length;
  const totalBytes = htmlBytes + cssBytes + jsBytes;

  if (cssBytes > CSS_BUDGET) {
    failures.push(`${relPage}: CSS ${(cssBytes / 1024).toFixed(1)}KB gz > ${CSS_BUDGET / 1024}KB budget (${cssSrcs.join(', ') || 'none'})`);
  }
  if (jsBytes > JS_BUDGET) {
    failures.push(`${relPage}: JS ${(jsBytes / 1024).toFixed(1)}KB gz > ${JS_BUDGET / 1024}KB budget (${jsSrcs.join(', ') || 'none'})`);
  }
  if (totalBytes > TOTAL_BUDGET) {
    failures.push(`${relPage}: total (HTML+CSS+JS, excluding images) ${(totalBytes / 1024).toFixed(1)}KB gz > ${TOTAL_BUDGET / 1024}KB budget`);
  }
}

console.log(`Checked ${htmlFiles.length} built pages against CSS <=${CSS_BUDGET / 1024}KB / JS <=${JS_BUDGET / 1024}KB / total <=${TOTAL_BUDGET / 1024}KB (gzip, excluding images).`);

if (failures.length > 0) {
  console.error(`\n${failures.length} budget failure(s):\n${failures.join('\n')}`);
  process.exit(1);
}

console.log('All pages within budget.');
