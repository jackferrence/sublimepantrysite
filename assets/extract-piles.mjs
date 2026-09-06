/**
 * Pile extractor for the isolated-on-white fruit sheets.
 *
 * Adobe sells these as contact sheets: one file holding eight or ten separate
 * piles of freeze-dried fruit on a white ground. The first pass at this library
 * used crops somebody had cut by hand, which is how three of them arrived at
 * 200-430px — too small to clear the 400px derivative floor, and one (banana)
 * too small to make any declared ratio at all.
 *
 * Cutting them again by hand would reproduce the problem with different
 * numbers. This finds the piles instead: threshold the sheet, read the runs of
 * ink between the white gutters, and emit one full-resolution crop per pile.
 * The sheet is 10772px wide, so every pile comes out well past 1600.
 *
 *   node assets/extract-piles.mjs <sheet.jpeg> <out-dir> [--min-width 900]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import sharp from 'sharp';

const [, , sheetPath, outDir, ...rest] = process.argv;
if (!sheetPath || !outDir) {
  console.error('usage: node assets/extract-piles.mjs <sheet> <out-dir> [--min-width N]');
  process.exit(1);
}
const minWidth = Number(rest[rest.indexOf('--min-width') + 1]) || 900;

/** Anything this far below pure white counts as subject, not ground. */
const INK = 244;
/** A gutter narrower than this is a gap inside one pile, not between two. */
const GUTTER = 0.012;
/** Padding around a pile, as a fraction of its own size. */
const PAD = 0.04;

const SCALE_W = 1600;
const image = sharp(sheetPath);
const { width: fullW, height: fullH } = await image.metadata();

const { data, info } = await sharp(sheetPath)
  .resize(SCALE_W)
  .greyscale()
  .raw()
  .toBuffer({ resolveWithObject: true });

const ink = (x, y) => data[y * info.width + x] < INK;

/** Ranges along `n` where `has` is true, merging gaps under `minGap`. */
function runs(n, has, minGap) {
  const spans = [];
  let start = null;
  let gap = 0;
  for (let i = 0; i < n; i += 1) {
    if (has(i)) {
      if (start === null) start = i;
      gap = 0;
    } else if (start !== null) {
      gap += 1;
      if (gap > minGap) {
        spans.push([start, i - gap]);
        start = null;
        gap = 0;
      }
    }
  }
  if (start !== null) spans.push([start, n - 1]);
  return spans;
}

// Rows first (the sheets are laid out in bands), then columns within each band.
const rowGap = Math.round(info.height * GUTTER);
const colGap = Math.round(info.width * GUTTER);
const bands = runs(info.height, (y) => {
  for (let x = 0; x < info.width; x += 1) if (ink(x, y)) return true;
  return false;
}, rowGap);

const boxes = [];
for (const [y0, y1] of bands) {
  for (const [x0, x1] of runs(info.width, (x) => {
    for (let y = y0; y <= y1; y += 1) if (ink(x, y)) return true;
    return false;
  }, colGap)) {
    // Tighten vertically inside this column — piles in a band differ in height.
    const [ty0, ty1] = runs(y1 - y0 + 1, (dy) => {
      for (let x = x0; x <= x1; x += 1) if (ink(x, y0 + dy)) return true;
      return false;
    }, rowGap).reduce((a, b) => [Math.min(a[0], b[0]), Math.max(a[1], b[1])], [Infinity, -Infinity]);
    boxes.push({ x0, x1, y0: y0 + ty0, y1: y0 + ty1 });
  }
}

const k = fullW / info.width;
mkdirSync(outDir, { recursive: true });
const manifest = [];

for (const [i, b] of boxes.entries()) {
  const w = (b.x1 - b.x0 + 1) * k;
  const h = (b.y1 - b.y0 + 1) * k;
  const padX = w * PAD;
  const padY = h * PAD;
  const left = Math.max(0, Math.round(b.x0 * k - padX));
  const top = Math.max(0, Math.round(b.y0 * k - padY));
  const width = Math.min(fullW - left, Math.round(w + padX * 2));
  const height = Math.min(fullH - top, Math.round(h + padY * 2));
  if (width < minWidth) continue;

  const crop = sharp(sheetPath).extract({ left, top, width, height });

  // Mean colour of the FOOD, for a first guess at which fruit it is. Two traps
  // here, both of which produced a wrong answer first time: `.stats()` on a
  // chained pipeline reads the source image and ignores the extract, so every
  // pile reports the same numbers; and averaging the whole crop averages in the
  // white ground, which washes a blueberry pile towards a banana one. So:
  // measure the buffer, and only the pixels that are not background.
  const { data: px, info: ci } = await crop
    .clone()
    .resize(200, null, { fit: 'inside' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  let r = 0, g = 0, bl = 0, n = 0;
  for (let i = 0; i < px.length; i += ci.channels) {
    if (px[i] > INK && px[i + 1] > INK && px[i + 2] > INK) continue;
    r += px[i]; g += px[i + 1]; bl += px[i + 2]; n += 1;
  }
  [r, g, bl] = n ? [r, g, bl].map((c) => Math.round(c / n)) : [255, 255, 255];
  const guess = r > 200 && g > 190 && bl > 165 ? 'banana'
    : r - bl > 40 ? 'strawberry'
    : 'blueberry';

  const name = `${basename(sheetPath, '.jpeg')}-${String(i).padStart(2, '0')}-${guess}.jpeg`;
  await crop.jpeg({ quality: 92 }).toFile(join(outDir, name));
  manifest.push({ name, width, height, rgb: [r, g, bl], guess });
}

writeFileSync(join(outDir, 'piles.json'), JSON.stringify(manifest, null, 2));
for (const m of manifest) console.log(`  ${m.name.padEnd(46)} ${m.width}x${m.height}  rgb(${m.rgb})`);
console.log(`[piles] ${manifest.length} extracted from ${fullW}x${fullH}.`);
