/**
 * Derivative generator for the asset library.
 *
 * Reads `assets/sources.json`, centre-crops each original to the ratios that
 * entry declares, and writes WebP derivatives at 400 / 800 / 1600 wide into
 * `public/images/library/<id>/<ratio>-<width>.webp`.
 *
 * Two rules are enforced here rather than trusted to whoever runs it:
 *
 *  - Never upscale. A width is skipped when it exceeds the cropped width, so a
 *    432px-wide crop produces a 400 and nothing else. Upscaling a small crop to
 *    1600 produces a file that is bigger, slower and no sharper — and, worse,
 *    a manifest that claims a resolution the photograph does not have.
 *  - Only the declared ratios. `sources.json` lists a ratio only when a centre
 *    crop to it keeps the subject whole; a panorama does not get a 1:1 just
 *    because the loop could have produced one.
 *
 * Not in `scripts/` on purpose: that directory is the build's, and this runs by
 * hand when photography lands. Output is committed, so a normal build never
 * needs sharp.
 *
 *   node assets/build-derivatives.mjs           # write derivatives
 *   node assets/build-derivatives.mjs --check   # report, write nothing
 */
import { readFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ORIGINALS = join(ROOT, 'assets/originals');
const OUT_ROOT = join(ROOT, 'public/images/library');
const WIDTHS = [400, 800, 1600];

/** Ratio name -> width/height. The manifest's `ratios` union uses these keys. */
export const RATIO = { '16:9': 16 / 9, '4:5': 4 / 5, '1:1': 1 };

/** `<id>/<ratio>-<width>.webp`, with the colon out of the filename. */
export function derivativePath(id, ratio, width) {
  return `${id}/${ratio.replace(':', 'x')}-${width}.webp`;
}

const check = process.argv.includes('--check');
const { assets } = JSON.parse(readFileSync(join(ROOT, 'assets/sources.json'), 'utf8'));

/** White, for `fit: 'contain'`. Matches the ground these subjects are shot on. */
const GROUND = { r: 255, g: 255, b: 255, alpha: 1 };

const report = [];
for (const { id, file, ratios, fit = 'cover' } of assets) {
  const src = join(ORIGINALS, file);
  if (!existsSync(src)) throw new Error(`${id}: missing original ${file}`);

  const { width: iw, height: ih } = await sharp(src).metadata();
  const outDir = join(OUT_ROOT, id);
  if (!check) {
    rmSync(outDir, { recursive: true, force: true });
    mkdirSync(outDir, { recursive: true });
  }

  const written = [];
  for (const ratio of ratios) {
    const target = RATIO[ratio];
    if (!target) throw new Error(`${id}: unknown ratio ${ratio}`);

    // Two ways to reach a ratio, and the subject decides which.
    //
    // `cover` centre-crops. Right for a photograph with a real scene in it,
    // where trimming the edges loses context but not the subject.
    //
    // `contain` scales the whole frame in and pads with white. Right for food
    // isolated on white, where every pile is wider than it is tall: a 1:1 crop
    // of a 2.2:1 mound cuts 55% of the width off the subject, while padding is
    // invisible because the ground is already white. The first pass here
    // cropped everything and would have quietly sliced the ends off three of
    // the four fruit piles.
    //
    // "Never upscale" is measured against whichever the visitor actually gets:
    // the cropped width for cover, the full width for contain.
    const cw = fit === 'contain' ? iw : Math.min(iw, Math.round(ih * target));
    const ch = Math.min(ih, Math.round(iw / target));

    for (const width of WIDTHS) {
      if (width > cw) continue;
      const out = derivativePath(id, ratio, width);
      if (!check) {
        // One resize, not two. Chaining `.resize()` twice does not crop then
        // scale — the second call replaces the first, and every derivative
        // silently keeps the original aspect ratio. `fit: 'cover'` against an
        // explicit width AND height is what actually crops.
        await sharp(src)
          .resize(width, Math.round(width / target), {
            fit,
            position: 'centre',
            ...(fit === 'contain' ? { background: GROUND } : {}),
          })
          .webp({ quality: 82 })
          .toFile(join(OUT_ROOT, out));
      }
      written.push(out);
    }
    if (!written.some((w) => w.includes(ratio.replace(':', 'x')))) {
      throw new Error(`${id}: ${ratio} crop is ${cw}px wide — under the 400px floor.`);
    }
  }
  report.push({ id, intrinsic: `${iw}x${ih}`, files: written.length });
}

const total = report.reduce((n, r) => n + r.files, 0);
for (const r of report) console.log(`  ${r.id.padEnd(38)} ${r.intrinsic.padEnd(11)} ${r.files} files`);
console.log(`[assets] ${report.length} assets, ${total} derivatives${check ? ' (check only)' : ''}.`);
