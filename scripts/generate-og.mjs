/**
 * Per-page Open Graph images.
 *
 * Runs before `astro build` and writes 1200x630 PNGs into `public/og/`, one per
 * page, plus the site default at `public/og-image.png`. Rendering happens with
 * satori (layout -> SVG) and resvg (SVG -> PNG); there is no headless browser
 * and no network call, so a build stays reproducible offline.
 *
 * The filename for a page is its path with slashes flattened — `/` is `home`,
 * `/guides/which-freeze-dryer` is `guides-which-freeze-dryer`. `ogSlug()` in
 * src/lib/og.ts computes the same name, and BaseLayout only references an image
 * that actually exists on disk.
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import satori from 'satori';
import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const assets = join(root, 'scripts', 'assets');
const outDir = join(root, 'public', 'og');

const WIDTH = 1200;
const HEIGHT = 630;

const PAPER = '#FAF8F4';
const INK = '#000000';
const INK_SOFT = '#6b5f55';
const BRAND = '#8B4A21';
const BRAND_TINT = '#f6e8dc';

const fonts = [
  { name: 'Source Sans 3', data: readFileSync(join(assets, 'source-sans-3-600.ttf')), weight: 600, style: 'normal' },
];

/** Supplied primary logo, byte-for-byte with original clearspace and colors. */
function mark() {
  const artwork = readFileSync(join(root, 'public/brand/approved/01-wordmark/sublimepantry-inline-ink-ice.svg'));
  const src = `data:image/svg+xml;base64,${artwork.toString('base64')}`;
  return { type: 'img', props: { src, width: 360, height: 360 * 265 / 1406 } };
}

function card({ title, kicker }) {
  return {
    type: 'div',
    props: {
      style: {
        width: '1200px',
        height: '630px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: PAPER,
        padding: '72px',
        fontFamily: 'Source Sans 3',
      },
      children: [
        {
          type: 'div',
          props: {
            style: { display: 'flex', alignItems: 'center', gap: '18px' },
            children: [
              mark(),
            ],
          },
        },
        {
          type: 'div',
          props: {
            style: { display: 'flex', flexDirection: 'column', gap: '20px' },
            children: [
              {
                type: 'div',
                props: {
                  style: {
                    fontSize: '22px', fontWeight: 600, letterSpacing: '2px',
                    textTransform: 'uppercase', color: BRAND,
                  },
                  children: kicker,
                },
              },
              {
                type: 'div',
                props: {
                  style: {
                    fontFamily: 'Source Sans 3', fontWeight: 600,
                    fontSize: title.length > 78 ? '54px' : '66px',
                    lineHeight: 1.08, letterSpacing: '-1.5px', color: INK,
                  },
                  children: title,
                },
              },
            ],
          },
        },
        {
          type: 'div',
          props: {
            style: { display: 'flex', justifyContent: 'space-between', fontSize: '22px', color: INK_SOFT },
            children: [
              { type: 'div', props: { children: 'www.sublimepantry.com' } },
              { type: 'div', props: { children: 'Sourced · dated · human-reviewed' } },
            ],
          },
        },
      ],
    },
  };
}

async function render(spec, file) {
  const svg = await satori(card(spec), { width: WIDTH, height: HEIGHT, fonts });
  // Pinned explicitly: sharp scales SVG input by its DPI setting, so the output
  // size is stated rather than inherited. Open Graph wants exactly 1200x630.
  await sharp(Buffer.from(svg), { density: 72 })
    .resize(WIDTH, HEIGHT, { fit: 'fill' })
    .png()
    .toFile(file);
}

/** Static pages that are not content entries. */
const STATIC_PAGES = [
  { path: '/', kicker: 'Home freeze-drying', title: 'Home freeze-drying, batch by batch' },
  { path: '/guides', kicker: 'Guides', title: 'Freeze-drying guides' },
  { path: '/troubleshooting', kicker: 'Troubleshooting', title: 'Fix this batch' },
  { path: '/compare', kicker: 'Comparisons', title: 'Comparisons with stated criteria' },
  { path: '/recipes', kicker: 'Recipes', title: 'Freeze-drying recipes' },
  { path: '/shop', kicker: 'Shop', title: 'Freeze-drying supplies, without the junk drawer.' },
  { path: '/about', kicker: 'About', title: 'About Sublime Pantry' },
  { path: '/start-selling', kicker: 'Cottage business', title: 'Start selling what you dry' },
  { path: '/tools/batch-log', kicker: 'Free tool', title: 'The Batch Log & Cost Tracker' },
  { path: '/shipping-returns', kicker: 'Orders', title: 'Shipping & returns' },
  { path: '/editorial-standards', kicker: 'How we work', title: 'Editorial standards' },
  { path: '/review-methodology', kicker: 'How we work', title: 'Review methodology' },
  { path: '/corrections', kicker: 'How we work', title: 'Corrections' },
  { path: '/affiliate-disclosure', kicker: 'How we work', title: 'Affiliate disclosure' },
  { path: '/privacy', kicker: 'Legal', title: 'Privacy policy' },
  { path: '/contact', kicker: 'Contact', title: 'Get in touch' },
];

export function ogSlug(path) {
  const clean = path.replace(/^\/+|\/+$/g, '');
  return clean === '' ? 'home' : clean.replace(/\//g, '-');
}

async function main() {
  mkdirSync(outDir, { recursive: true });

  const articlesDir = join(root, 'src', 'content', 'articles');
  const articles = readdirSync(articlesDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      const data = JSON.parse(readFileSync(join(articlesDir, f), 'utf8'));
      return {
        path: `/${data.pillar}/${f.replace(/\.json$/, '')}`,
        kicker: data.section ?? data.kicker,
        title: data.title,
      };
    });

  const pages = [...STATIC_PAGES, ...articles];
  for (const page of pages) {
    await render(page, join(outDir, `${ogSlug(page.path)}.png`));
  }

  // The site-wide default, used by any page without its own card.
  await render(
    { kicker: 'Home freeze-drying', title: 'Home freeze-drying, batch by batch' },
    join(root, 'public', 'og-image.png')
  );

  console.log(`generate-og: wrote ${pages.length} page cards + og-image.png`);
}

if (!existsSync(assets)) {
  throw new Error('generate-og: scripts/assets fonts are missing');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
