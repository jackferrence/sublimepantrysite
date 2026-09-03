import { existsSync } from 'node:fs';
import { join } from 'node:path';

const PUBLIC_DIR = join(process.cwd(), 'public');

/**
 * The masthead. One person writes and reviews everything here, and the site
 * says so on every article rather than implying a newsroom.
 */
export interface Author {
  name: string;
  role: string;
  bio: string;
  portrait: string;
  initials: string;
  url: string;
}

export const JACK_FERRENCE: Author = {
  name: 'Jack Ferrence',
  role: 'Editor, Sublime Pantry',
  bio: 'Jack runs Sublime Pantry, a home freeze-drying publication built on manufacturer documentation, food-safety literature, and dated sources rather than forum lore. He reviews and approves every page before it publishes.',
  portrait: '/brand/author.jpg',
  initials: 'JF',
  url: '/about',
};

export const AUTHORS: Record<string, Author> = {
  'Jack Ferrence': JACK_FERRENCE,
};

export function getAuthor(name: string): Author {
  return AUTHORS[name] ?? JACK_FERRENCE;
}

/**
 * Whether the portrait file actually exists in `public/`.
 *
 * The photograph has not been shot yet. Rather than ship an <img> that 404s
 * and renders a broken-image glyph, the byline falls back to an initials tile
 * until the file lands — and switches over automatically once it does, with no
 * code change.
 */
export function hasPortrait(author: Author): boolean {
  return existsSync(join(PUBLIC_DIR, author.portrait));
}
