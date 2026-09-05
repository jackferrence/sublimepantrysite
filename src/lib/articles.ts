/**
 * Shared helpers for turning content entries into links and card props.
 */
import type { CollectionEntry } from 'astro:content';
import { publicImage } from './media';
import { caption, getAsset, largest, srcSet, type AssetRatio } from './assets';

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
  return makeScrollersFocusable(
    html.replace(/<thead>([\s\S]*?)<\/thead>/g, (thead) =>
      thead
        // An empty corner header names nothing; demote it to a data cell.
        .replace(/<th\b([^>]*)>(\s*)<\/th>/g, '<td$1>$2</td>')
        .replace(/<th\b(?![^>]*\bscope=)([^>]*)>/g, '<th$1 scope="col">')
    ),
  );
}

/**
 * A horizontally scrolling table has to be reachable from the keyboard.
 *
 * `.table-scroll` is `overflow-x: auto`, so on a narrow screen the spec
 * comparison scrolls sideways — and a mouse or a finger can do that while a
 * keyboard cannot, because nothing inside the region takes focus. axe reports
 * it as `scrollable-region-focusable`, severity serious, and it sat on the
 * flagship buying guide.
 *
 * `tabindex="0"` makes the region focusable and therefore scrollable with the
 * arrow keys. A focusable element also needs a name and a role, or a screen
 * reader announces an unlabelled stop; the table's own `<caption>` is already
 * the right sentence, so it is reused rather than a second one invented.
 *
 * Applied here rather than in the article JSON: the wrapper is authored in
 * `bodyHtml`, and fixing it per article means fixing it again in every article
 * written after this one.
 */
function makeScrollersFocusable(html: string): string {
  return html.replace(
    /<div class="table-scroll">([\s\S]*?)<\/div>/g,
    (whole, inner: string) => {
      if (/tabindex=/.test(whole)) return whole;
      const caption = inner.match(/<caption\b[^>]*>([\s\S]*?)<\/caption>/)?.[1];
      const label = caption
        ? caption.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
        : 'Table, scrolls horizontally';
      const attr = label.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
      return `<div class="table-scroll" tabindex="0" role="region" aria-label="${attr}">${inner}</div>`;
    },
  );
}

/**
 * The article's hero photograph, resolved and ready to render.
 *
 * Every call site that renders an article image must go through here — there
 * are eight of them, and the one that forgets is the one that breaks. An
 * unresolved slot is not cosmetic: `<img src>` pointing at a missing file ships
 * a broken-image glyph and `check-links` fails the build on it.
 *
 * Two ways an article can name its hero. `assetId` looks the photograph up in
 * the asset library, which owns the alt text, the credit and the restrictions;
 * this is the shape to use, because alt that lives with the photograph cannot
 * drift away from what is actually in the frame. A bare `{ src, alt }` still
 * resolves against `public/` for a slot whose photograph is not catalogued.
 *
 * Returns `undefined` until the photograph lands, at which point every surface
 * picks it up at once with no code change.
 */
/** Article heroes render wide; the library must have generated this crop. */
const HERO_RATIO: AssetRatio = '16:9';

export interface HeroImage {
  src: string;
  /** Empty for a legacy `{ src, alt }` hero, which has no derivatives. */
  srcSet?: string;
  alt: string;
  credit?: string;
  width: number;
  height: number;
}

export function heroImage(entry: Article): HeroImage | undefined {
  const declared = entry.data.image;
  if (!declared) return undefined;

  if ('assetId' in declared) {
    const asset = getAsset(declared.assetId);
    if (!asset) return undefined;
    const frame = largest(asset, HERO_RATIO);
    if (!frame) return undefined;
    return {
      src: frame.src,
      srcSet: srcSet(asset, HERO_RATIO),
      alt: asset.alt,
      credit: caption(asset),
      width: frame.w,
      height: frame.h,
    };
  }

  const resolved = publicImage(declared.src);
  if (!resolved) return undefined;
  return { src: resolved, alt: declared.alt, credit: declared.credit, width: 1280, height: 720 };
}
