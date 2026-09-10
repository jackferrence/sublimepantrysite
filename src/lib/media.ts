/**
 * Photography that has not been shot yet.
 *
 * Every image slot on the site names the file it is waiting for. This resolves
 * that name against `public/` at build time: if the photograph exists it is
 * used, and if it does not the caller renders its placeholder instead of an
 * <img> that would 404. Dropping a file into `public/images/` is all it takes
 * to switch a slot over — no code change, no forgotten placeholder.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const PUBLIC_DIR = join(process.cwd(), 'public');

export function publicImage(path: string): string | undefined {
  return existsSync(join(PUBLIC_DIR, path)) ? path : undefined;
}

/** Approved outlined artwork, unchanged including its built-in clearspace.
 * BrandBlock and Mark render these files; never derive logo color from tokens.
 * Roman SP is the single selected monogram. White artwork is for dark grounds.
 *
 * Per the docs/CLAUDE-CODE-PROMPT.md rebuild (docs/DECISIONS.md): this file
 * and its asset kit already satisfy BRAND.md § The ghost — the ink-ice /
 * ink-rust / rust-ice wordmark variants below already bake the offset
 * "ghost" second copy into the supplied artwork itself, which is exactly
 * what Appendix B specifies for the logo files. Nothing here needed to
 * change for the three-tier token migration (T1.2): these are static asset
 * paths, not CSS custom properties, and the light/white variant pairing
 * already covers the new automatic prefers-color-scheme dark mode without
 * a code change — dark grounds already select `wordmarkDark`.
 */
const LOGOS = '/brand/approved';
export const BRAND = {
  wordmark: `${LOGOS}/01-wordmark/sublimepantry-inline-ink-ice.svg`,
  wordmarkDark: `${LOGOS}/01-wordmark/sublimepantry-inline-white-ice.svg`,
  wordmarkIce: `${LOGOS}/01-wordmark/sublimepantry-inline-ink-rust.svg`,
  tagline: `${LOGOS}/01-wordmark/sublimepantry-tagline-ink-ice.svg`,
  stacked: `${LOGOS}/01-wordmark/sublimepantry-stacked-ink-ice.svg`,
  mark: `${LOGOS}/02-monogram/sublimepantry-sp-ink-ice.svg`,
  markSmall: `${LOGOS}/02-monogram/sublimepantry-sp-solid-ink.svg`,
  markPng: `${LOGOS}/02-monogram/sublimepantry-sp-ink-ice-512px.png`,
  appIcon: `${LOGOS}/03-app-icons/sublimepantry-icon-square-on-paper-512px.png`,
  favicon: '/favicon.svg',
} as const;
