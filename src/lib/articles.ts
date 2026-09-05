/**
 * Shared helpers for turning content entries into links and card props.
 */
import type { CollectionEntry } from 'astro:content';
import { publicImage } from './media';

export type Article = CollectionEntry<'articles'>;

/** Every pillar is a top-level section; the URL is always /<pillar>/<slug>. */
export function articleHref(entry: Article): string {
  return `/${entry.data.pillar}/${entry.id}`;
}

export const PILLAR_LABEL: Record<Article['data']['pillar'], string> = {
  guides: 'Guides',
  troubleshooting: 'Troubleshooting',
  compare: 'Comparisons',
  recipes: 'Recipes',
};

export function formatDate(date: string): string {
  return new Date(`${date}T00:00:00.000Z`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/** The date a comparison's figures were last confirmed against their sources. */
export function verifiedDate(entry: Article): string {
  return entry.data.updatedDate ?? entry.data.publishedDate;
}

/** Ninety days after the last verification — the next scheduled price check. */
export function nextCheckDate(entry: Article): string {
  const d = new Date(`${verifiedDate(entry)}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 90);
  return d.toISOString().slice(0, 10);
}

export function newestFirst(a: Article, b: Article): number {
  return b.data.publishedDate.localeCompare(a.data.publishedDate);
}

export interface TocEntry {
  id: string;
  text: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Build the table of contents from the body's H2s, giving any heading that
 * lacks an `id` a stable one so the rail can always link to it.
 *
 * Returns the (possibly rewritten) HTML alongside the entries, so the anchors
 * and the headings can never disagree.
 */
export function withToc(bodyHtml: string): { html: string; toc: TocEntry[] } {
  const toc: TocEntry[] = [];
  const seen = new Set<string>();

  const html = bodyHtml.replace(/<h2([^>]*)>([\s\S]*?)<\/h2>/g, (match, attrs: string, inner: string) => {
    const text = inner.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (!text) return match;

    const existing = /\sid=["']([^"']+)["']/.exec(attrs);
    let id = existing?.[1] ?? slugify(text);
    let n = 2;
    while (seen.has(id)) id = `${slugify(text)}-${n++}`;
    seen.add(id);

    toc.push({ id, text });
    return existing ? match : `<h2${attrs} id="${id}">${inner}</h2>`;
  });

  return { html, toc };
}

/**
 * Table accessibility, applied when the body is rendered.
 *
 * Article bodies are authored content and are never edited in place, so the two
 * things every table needs are added here instead:
 *
 *  - `scope="col"` on header cells that lack it, and `scope="row"` on the
 *    leading header cell of a body row;
 *  - an empty corner `<th>` demoted to `<td>`. An empty header cell has no
 *    accessible name and labels nothing; the corner of a comparison table is a
 *    spacer, and marking it as data says so without inventing a column title.
 */
export function polishTables(html: string): string {
  return html.replace(/<thead>([\s\S]*?)<\/thead>/g, (thead) =>
    thead
      // An empty corner header names nothing; demote it to a data cell.
      .replace(/<th\b([^>]*)>(\s*)<\/th>/g, '<td$1>$2</td>')
      .replace(/<th\b(?![^>]*\bscope=)([^>]*)>/g, '<th$1 scope="col">')
  );
}

/**
 * The article's hero photograph, if the file actually exists.
 *
 * An article declares the image it is waiting for; the file arrives later.
 * Every call site that renders an article image must go through here, because
 * an unresolved slot is not a cosmetic problem — `<img src>` pointing at a
 * missing file ships a broken-image glyph, and `check-links` fails the build on
 * it. Returns `undefined` until the photograph lands, at which point every
 * surface picks it up at once with no code change.
 *
 * Deliberately co-located with the other article helpers rather than inlined at
 * each call site: there are eight of them, and the one that forgets is the one
 * that breaks.
 */
export function heroImage(entry: Article): { src: string; alt: string } | undefined {
  const declared = entry.data.image;
  if (!declared) return undefined;
  const resolved = publicImage(declared.src);
  return resolved ? { src: resolved, alt: declared.alt } : undefined;
}
