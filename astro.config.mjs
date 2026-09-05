import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readArticleDates, readGitDates, lastmodFor, toPathname } from './src/lib/lastmod.ts';

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
