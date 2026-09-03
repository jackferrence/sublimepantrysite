/**
 * The complete icon set for the site.
 *
 * Ten Lucide glyphs, inlined from `lucide-static` at build time. Nothing else
 * is allowed: no icon fonts, no sprite sheets, no other library. Adding an
 * eleventh icon is a design decision, so it has to happen here.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export const ICON_NAMES = [
  'external-link',
  'shopping-bag',
  'search',
  'menu',
  'x',
  'chevron-right',
  'check-circle',
  'shield-check',
  'package',
  'undo-2',
] as const;

export type IconName = (typeof ICON_NAMES)[number];

/** Lucide renamed `check-circle` to `circle-check` in v1; map our stable names. */
const FILES: Record<IconName, string> = {
  'external-link': 'external-link',
  'shopping-bag': 'shopping-bag',
  search: 'search',
  menu: 'menu',
  x: 'x',
  'chevron-right': 'chevron-right',
  'check-circle': 'circle-check',
  'shield-check': 'shield-check',
  package: 'package',
  'undo-2': 'undo-2',
};

const cache = new Map<IconName, string>();

/** The children of the Lucide `<svg>` — paths only, no wrapper. */
export function iconBody(name: IconName): string {
  const cached = cache.get(name);
  if (cached) return cached;
  const path = require.resolve(`lucide-static/icons/${FILES[name]}.svg`);
  const svg = readFileSync(path, 'utf8');
  const inner = svg.slice(svg.indexOf('>', svg.indexOf('<svg')) + 1, svg.lastIndexOf('</svg>')).trim();
  cache.set(name, inner);
  return inner;
}
