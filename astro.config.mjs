import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readArticleDates, readGitDates, lastmodFor, toPathname } from './src/lib/lastmod.ts';
import { writeFileSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ASSETS, caption, widthsFor } from './src/lib/assets.ts';

// Resolved once per build, not once per URL: one git pass and one directory
// read, shared across every entry. See src/lib/lastmod.ts for why a missing
// date is preferred to a guessed one.
const lastmodSources = { articles: readArticleDates(), git: readGitDates() };

// Paths robots.txt disallows. Listing a disallowed URL in the sitemap asks a
// crawler to fetch something we have told it not to fetch, and the two files
// disagreeing is worse than either restriction on its own.
const EXCLUDED = new Set(['/thanks']);

let dated = 0;
let undatedPaths = [];

export default defineConfig({
  site: 'https://www.sublimepantry.com',
  trailingSlash: 'never',
  build: {
    format: 'file',
  },
  image: {
    // Shopify's CDN is the only remote host we optimise; everything else is
    // either local to public/ or not an image.
    domains: ['cdn.shopify.com'],
  },
  integrations: [
    sitemap({
      filter: (page) => !EXCLUDED.has(toPathname(page)),
      serialize(item) {
        const lastmod = lastmodFor(item.url, lastmodSources);
        if (lastmod) {
          dated += 1;
          return { ...item, lastmod: lastmod.toISOString() };
        }
        undatedPaths.push(toPathname(item.url));
        return item;
      },
    }),
    {
      name: 'sublime-pantry:asset-library',
      hooks: {
        // Two jobs, both of which exist because the failure they catch is
        // silent. The docs page is what gets read when the next article needs a
        // photograph, so it is generated from the manifest rather than kept by
        // hand — a stale catalogue is worse than none, because it is trusted.
        // The width check catches a template asking for more pixels than the
        // photograph has: the browser upscales, nothing errors, and the image
        // just looks soft on the one screen nobody tested on.
        'astro:build:done': ({ dir }) => {
          writeFileSync('docs/ASSET-LIBRARY.md', assetLibraryDoc());

          const oversize = [];
          const pages = [];
          const walk = (d) => {
            for (const entry of readdirSync(d, { withFileTypes: true })) {
              const p = join(d, entry.name);
              if (entry.isDirectory()) walk(p);
              else if (entry.name.endsWith('.html')) pages.push(p);
            }
          };
          const distDir = dir ? new URL(dir).pathname : 'dist';
          if (existsSync(distDir)) walk(distDir);

          for (const page of pages) {
            const html = readFileSync(page, 'utf8');
            for (const tag of html.match(/<img\b[^>]*>/g) ?? []) {
              const src = tag.match(/src="(\/images\/library\/[^"]+)"/)?.[1];
              const width = Number(tag.match(/width="(\d+)"/)?.[1] ?? 0);
              if (!src || !width) continue;
              const asset = ASSETS.find((a) => src.startsWith(`${a.src}/`));
              if (!asset) continue;
              const ratio = asset.ratios.find((r) => src.includes(`/${r.replace(':', 'x')}-`));
              const available = ratio ? Math.max(...widthsFor(asset, ratio)) : 0;
              if (width > available) {
                oversize.push(`${page.replace(distDir, '')}: ${asset.id} rendered at ${width}w, ${available}w available`);
              }
            }
          }

          console.log(`[assets] ${ASSETS.length} catalogued, docs/ASSET-LIBRARY.md written.`);
          for (const line of oversize.sort()) console.warn(`[assets] upscaled — ${line}`);
        },
      },
    },
    {
      name: 'sublime-pantry:lastmod-report',
      hooks: {
        // One line, after the sitemap has been serialised, saying which source
        // answered. A silent fallback to "no dates at all" — the shape a
        // shallow CI clone produces — is exactly the failure that would
        // otherwise ship unnoticed.
        'astro:build:done': () => {
          const gitFiles = lastmodSources.git.size;
          console.log(
            `[lastmod] ${dated} sitemap entries dated ` +
              `(${lastmodSources.articles.size} from content, git index: ${gitFiles} files).`,
          );
          if (undatedPaths.length) {
            console.log(`[lastmod] no date for: ${undatedPaths.sort().join(', ')}`);
          }
          if (gitFiles === 0) {
            console.warn('[lastmod] git history unavailable — static pages ship without lastmod.');
          }
        },
      },
    },
  ],
});

/**
 * `docs/ASSET-LIBRARY.md` — the page to read before writing the next article,
 * so "what photography do we have?" is answerable without opening the folder.
 *
 * Generated from the manifest on every build. Restrictions and unverified
 * provenance are printed in the table rather than left in a field nobody
 * opens: a constraint you have to go looking for is a constraint that gets
 * missed.
 */
function assetLibraryDoc() {
  const byClass = new Map();
  for (const asset of ASSETS) byClass.set(asset.cls, [...(byClass.get(asset.cls) ?? []), asset]);

  const lines = [
    '<!-- Generated by astro.config.mjs on every build. Do not edit by hand. -->',
    '# Asset library',
    '',
    `${ASSETS.length} catalogued photographs. Templates request these by intent —`,
    '`findAssets({ cls: \'camping\', ratio: \'16:9\' })` — never by path, so a slot cannot be',
    'filled by whatever happened to be lying in `public/images/`.',
    '',
    'An empty result renders nothing. That is correct behaviour, not a bug to paper over.',
    '',
    '- **Originals** live in `assets/originals/`. Three exceed 5 MB and are gitignored;',
    '  `assets/README.md` says where they are kept.',
    '- **Derivatives** are generated by `node assets/build-derivatives.mjs` and committed.',
    '- **Constraints** are enforced by `tests/assets.test.mjs`, not by convention.',
    '',
  ];

  for (const [cls, assets] of [...byClass].sort()) {
    lines.push(`## ${cls} (${assets.length})`, '');
    for (const asset of assets) {
      const thumbRatio = asset.ratios[0];
      const thumb = `../public${asset.src}/${thumbRatio.replace(':', 'x')}-400.webp`;
      const restrictions = asset.restrictions?.length
        ? asset.restrictions.map((r) => `\`${r}\``).join(', ')
        : '—';
      const used = asset.usedBy.length ? asset.usedBy.join('<br>') : '*unplaced*';
      lines.push(
        `### \`${asset.id}\``,
        '',
        `<img src="${thumb}" alt="${asset.alt.replace(/"/g, '&quot;')}" width="200">`,
        '',
        `| | |`,
        `|---|---|`,
        `| Alt | ${asset.alt} |`,
        `| Source | \`${asset.source}\` |`,
        `| Credit | ${caption(asset) ?? '—'} |`,
        `| Ratios | ${asset.ratios.map((r) => `\`${r}\``).join(', ')} |`,
        `| Intrinsic | ${asset.intrinsic.w}×${asset.intrinsic.h} |`,
        `| Widths | ${asset.ratios.map((r) => `${r}: ${widthsFor(asset, r).join('/')}`).join(' · ')} |`,
        `| Subject | ${asset.subject.map((s) => `\`${s}\``).join(', ')} |`,
        `| Restrictions | ${restrictions} |`,
        `| Used by | ${used} |`,
        '',
      );
    }
  }

  const empty = ['product', 'food', 'equipment', 'camping', 'process', 'line-hero', 'brand']
    .filter((cls) => !byClass.has(cls));
  if (empty.length) {
    lines.push(
      '## Classes with nothing in them',
      '',
      ...empty.map((cls) => `- \`${cls}\` — no asset qualifies. \`findAssets({ cls: '${cls}' })\` returns \`[]\`, and any slot asking for one renders nothing.`),
      '',
    );
  }

  lines.push(
    '## Provenance',
    '',
    'Assets marked `provenance-unverified` arrived with their EXIF stripped and no licence',
    'record. They are labelled `stock` / `Stock photo` because that is the conservative',
    'reading, not because the source is known. If a licence record turns up, upgrade the',
    'entry in `src/lib/assets.ts`.',
    '',
  );
  return lines.join('\n');
}
