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

/**
 * Brand files, by name rather than by path.
 *
 * These are the downloadable / off-site versions and keep the artwork's own
 * colours. The on-site mark is `Mark.astro`, which redraws the same geometry
 * from design tokens.
 *
 * One template may reach for a file here, and only one: the header brand block
 * (`BrandBlock.astro`). That block is the plate — the artwork's own #b0ddec
 * ground, bleeding to the top and left edges of the header — and a redrawn
 * token version would be reproducing the background rather than showing the
 * artwork. Everywhere else still goes through `Mark.astro` or `publicImage`.
 *
 * `reversed*` are knockouts: white letterforms that vanish on --paper and
 * --surface. They exist for dark or plated grounds only, which is why they are
 * grouped separately rather than sitting in one flat list where someone
 * reaching for "the white one" would drop an invisible logo into the header.
 */
export const BRAND = {
  /** For light grounds. The default press mark. */
  mark: '/brand/mark-black.svg',
  markPng: '/brand/mark-black.png',
  /** On the logo's own pale-blue plate. Good for social avatars. */
  markPlate: '/brand/mark-black-plate.svg',
  markPlatePng: '/brand/mark-black-plate.png',
  reversed: {
    /** White letterforms, --brand outline. Dark grounds only. */
    brand: '/brand/mark-reversed-brand.svg',
    brandPng: '/brand/mark-reversed-brand.png',
    /** White letterforms, frost outline. Lowest contrast of the set. */
    frost: '/brand/mark-reversed-frost.svg',
    frostPng: '/brand/mark-reversed-frost.png',
    /** The same two, on the pale-blue plate. */
    brandPlate: '/brand/mark-reversed-brand-plate.svg',
    frostPlate: '/brand/mark-reversed-frost-plate.svg',
  },
} as const;
