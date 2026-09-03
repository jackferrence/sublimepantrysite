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
import { Resvg } from '@resvg/resvg-js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const assets = join(root, 'scripts', 'assets');
const outDir = join(root, 'public', 'og');

const PAPER = '#faf7f1';
const INK = '#221d19';
const INK_SOFT = '#6b5f55';
const BRAND = '#8a3d10';
const BRAND_TINT = '#f6e8dc';

const fonts = [
  { name: 'Ibarra Real Nova', data: readFileSync(join(assets, 'ibarra-real-nova-600.ttf')), weight: 600, style: 'normal' },
  { name: 'Ibarra Real Nova', data: readFileSync(join(assets, 'ibarra-real-nova-400.ttf')), weight: 400, style: 'normal' },
  { name: 'Source Sans 3', data: readFileSync(join(assets, 'source-sans-3-600.ttf')), weight: 600, style: 'normal' },
];

/** The mark, embedded as an SVG data URI — satori renders <img>, not <svg>. */
function markSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <rect x="56" y="64" width="144" height="160" rx="24" fill="${BRAND_TINT}" stroke="${INK}" stroke-width="14"/>
  <rect x="72" y="32" width="112" height="32" rx="12" fill="${BRAND}"/>
  <g stroke="${BRAND}" stroke-width="13" stroke-linecap="round">
    <line x1="128" y1="96" x2="128" y2="192"/>
    <line x1="86.4" y1="120" x2="169.6" y2="168"/>
    <line x1="169.6" y1="120" x2="86.4" y2="168"/>
  </g>
</svg>`;
}

function mark(size) {
  const src = `data:image/svg+xml;base64,${Buffer.from(markSvg()).toString('base64')}`;
  return { type: 'img', props: { src, width: size, height: size } };
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
              mark(64),
              {
                type: 'div',
                props: {
                  style: { fontFamily: 'Ibarra Real Nova', fontSize: '34px', fontWeight: 600, color: INK },
                  children: 'Sublime Pantry',
                },
              },
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
                    fontFamily: 'Ibarra Real Nova', fontWeight: 600,
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
  const svg = await satori(card(spec), { width: 1200, height: 630, fonts });
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
  writeFileSync(file, png);
}

/** Static pages that are not content entries. */
const STATIC_PAGES = [
  { path: '/', kicker: 'Home freeze-drying', title: 'Home freeze-drying, batch by batch' },
  { path: '/guides', kicker: 'Guides', title: 'Freeze-drying guides' },
  { path: '/troubleshooting', kicker: 'Troubleshooting', title: 'Fix this batch' },
  { path: '/compare', kicker: 'Comparisons', title: 'Comparisons with stated criteria' },
  { path: '/recipes', kicker: 'Recipes', title: 'Freeze-drying recipes' },
  { path: '/shop', kicker: 'Shop', title: 'Freeze-drying supplies, without the junk drawer.' },
  { path: '/shop/freeze-dryer-packaging-starter-kit', kicker: 'Sold by Sublime Pantry', title: 'Freeze-Drying Packaging Starter Kit' },
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
