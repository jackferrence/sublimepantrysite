/**
 * Per-page Open Graph card lookup.
 *
 * `scripts/generate-og.mjs` writes one PNG per page into `public/og/` before
 * the Astro build; this resolves the card for a given path and falls back to
 * the site default when a page has none. Existence is checked on disk so a
 * build can never emit an og:image URL that 404s.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';

// Resolved against the project root rather than `import.meta.url`: this module
// is bundled during `astro build`, so its own URL is not a stable anchor for
// finding files in `public/`.
const PUBLIC_DIR = join(process.cwd(), 'public');

export function ogSlug(path: string): string {
  const clean = path.replace(/^\/+|\/+$/g, '');
  return clean === '' ? 'home' : clean.replace(/\//g, '-');
}

export function ogImagePath(path: string): string {
  const candidate = `/og/${ogSlug(path)}.png`;
  return existsSync(join(PUBLIC_DIR, candidate)) ? candidate : '/og-image.png';
}
