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
 * Table accessibility and small-screen shape, applied when the body is rendered.
 *
 * Article bodies are authored content and are never edited in place, so
 * everything a table needs is added here instead:
 *
 *  - `scope="col"` on header cells that lack it, and `scope="row"` on the
 *    leading cell of a body row. That leading cell is authored as `<td>` in
 *    four of the six tables; a row label that is not a row header leaves every
 *    value in the row unlabelled to a screen reader;
 *  - an empty corner `<th>` demoted to `<td>`. An empty header cell has no
 *    accessible name and labels nothing; the corner of a comparison table is a
 *    spacer, and marking it as data says so without inventing a column title;
 *  - a focusable, named scroll region, and a visible cue that it scrolls;
 *  - a stacked-card equivalent of every entity-per-column comparison, because
 *    the buying guide's table is eleven columns wide and no amount of scrolling
 *    makes that readable on a phone.
 */
export function polishTables(html: string): string {
  return rewriteScrollers(
    html
      .replace(/<thead>([\s\S]*?)<\/thead>/g, (thead) =>
        thead
          // An empty corner header names nothing; demote it to a data cell.
          .replace(/<th\b([^>]*)>(\s*)<\/th>/g, '<td$1>$2</td>')
          .replace(/<th\b(?![^>]*\bscope=)([^>]*)>/g, '<th$1 scope="col">')
      )
      .replace(/<tbody>([\s\S]*?)<\/tbody>/g, (tbody) =>
        tbody.replace(/<tr>([\s\S]*?)<\/tr>/g, (_row, cells: string) =>
          `<tr>${cells.replace(
            /^(\s*)<td\b([^>]*)>([\s\S]*?)<\/td>/,
            '$1<th$2 scope="row">$3</th>',
          )}</tr>`,
        )
      ),
  );
}

/**
 * A horizontally scrolling region has to be reachable from the keyboard, and
 * has to say that it scrolls.
 *
 * `.table-scroll` is `overflow-x: auto`, so on a narrow screen the spec
 * comparison scrolls sideways — and a mouse or a finger can do that while a
 * keyboard cannot, because nothing inside the region takes focus. axe reports
 * it as `scrollable-region-focusable`, severity serious, and it sat on the
 * flagship buying guide.
 *
 * `tabindex="0"` makes the region focusable and therefore scrollable with the
 * arrow keys. A focusable element also needs a name and a role, or a screen
 * reader announces an unlabelled stop. The table's own `<caption>` is already
 * the right sentence; the same wrapper is used for diagrams, where the `<svg>`
 * `<title>` is the right sentence instead. The old fallback announced a
 * diagram as "Table, scrolls horizontally", which is a description of the
 * wrapper rather than of what is inside it.
 *
 * The inset shadow on the right edge was the only signal that there was more
 * table off-screen, and a shadow is not a cue anyone has to notice. `.table-cue`
 * says it in words. It ships `hidden` and is revealed by `revealScrollCues` only
 * where the region is actually wider than its box, because a cue that says
 * "scrolls sideways" beside a table that fits is one more claim the page cannot
 * support. With scripting off nothing is revealed, and nothing is asserted.
 *
 * Applied here rather than in the article JSON: the wrapper is authored in
 * `bodyHtml`, and fixing it per article means fixing it again in every article
 * written after this one.
 */
function rewriteScrollers(html: string): string {
  return html.replace(
    /<div class="table-scroll">([\s\S]*?)<\/div>/g,
    (whole, inner: string) => {
      if (/tabindex=/.test(whole)) return whole;
      const caption = plain(inner.match(/<caption\b[^>]*>([\s\S]*?)<\/caption>/)?.[1]);
      const svgTitle = plain(inner.match(/<title\b[^>]*>([\s\S]*?)<\/title>/)?.[1]);
      const label = caption || svgTitle || 'Table, scrolls horizontally';
      const open = (extra: string) =>
        `<div class="table-scroll${extra}" tabindex="0" role="region" aria-label="${escapeAttr(label)}">`;

      const cards = /<table\b/.test(inner) ? stackedCards(inner, caption) : '';
      return (
        `${open(cards ? ' has-cards' : '')}${inner}</div>` +
        `<p class="table-cue" hidden>Scrolls sideways.</p>` +
        cards
      );
    },
  );
}

/**
 * The same comparison, one card per thing being compared.
 *
 * U10 in the messaging audit: a ten-model, eleven-column table is a horizontal
 * scanning burden on a phone, and the criterion label scrolls out of sight
 * before the reader reaches the model they came for. The audit offers two
 * remedies — sticky row labels with a scroll cue, or stacked cards. Both are
 * used: sticky labels and the cue wherever the table is shown, cards below
 * 44rem, which is also where a 200%-zoomed desktop lands.
 *
 * Only entity-per-column tables are converted, identified by a corner cell that
 * is empty or reads "Spec". That corner is the tell: when the top-left cell
 * names nothing, the column headers are the things being compared and the rows
 * are criteria, so transposing into one card per column is faithful. When the
 * corner names something ("Line item", "Equation"), the table is a calculation
 * read left to right, the columns are not comparable entities, and turning them
 * into cards would misrepresent it. Those two stay tables and scroll.
 *
 * Cell HTML is copied through untouched, so the cards carry the same figures
 * and the same citation markers as the table — there is one source of the
 * numbers, and it is the authored table. Nothing here can introduce a value the
 * table does not contain, which is the only property that matters: the audit
 * asks for equivalent text, not a second version of the specs.
 */
function stackedCards(tableHtml: string, caption: string): string {
  const head = tableHtml.match(/<thead>[\s\S]*?<\/thead>/)?.[0];
  const body = tableHtml.match(/<tbody>[\s\S]*?<\/tbody>/)?.[0];
  if (!head || !body) return '';

  const headCells = cellsOf(head);
  if (headCells.length < 4) return '';
  const corner = plain(headCells[0]);
  if (corner && !/^spec/i.test(corner)) return '';

  const names = headCells.slice(1);
  const rows = (body.match(/<tr>[\s\S]*?<\/tr>/g) ?? [])
    .map(cellsOf)
    .filter((cells) => cells.length === headCells.length);
  if (rows.length === 0) return '';

  const cards = names
    .map((name, column) => {
      const pairs = rows
        .map((cells) => `<dt>${cells[0]}</dt><dd>${cells[column + 1]}</dd>`)
        .join('');
      return `<li class="table-card"><p class="table-card-name">${name}</p><dl class="table-card-specs">${pairs}</dl></li>`;
    })
    .join('');

  const note = caption ? `<p class="table-cards-caption">${escapeText(caption)}</p>` : '';
  return `<div class="table-cards"><ul class="table-card-list" role="list">${cards}</ul>${note}</div>`;
}

/** The cells of a single `<tr>`, inner HTML preserved, in document order. */
function cellsOf(rowHtml: string): string[] {
  return [...rowHtml.matchAll(/<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/g)].map((m) => m[1]);
}

/** Tag-stripped, whitespace-collapsed text of an HTML fragment. */
function plain(fragment: string | undefined): string {
  return (fragment ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

const escapeText = (s: string) => s.replace(/&(?!#?\w+;)/g, '&amp;').replace(/</g, '&lt;');
const escapeAttr = (s: string) => escapeText(s).replace(/"/g, '&quot;');

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
