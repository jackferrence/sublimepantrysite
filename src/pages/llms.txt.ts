/**
 * /llms.txt — the machine-readable index of what this site can be cited for.
 *
 * Generated from the content collection rather than checked into public/,
 * because a hand-maintained index of a growing site is a stale index of a
 * growing site. Every article that exists appears here the build after it
 * lands; nothing appears here that is not a real, rendered page.
 *
 * Format follows the llms.txt convention: an H1 site name, one paragraph of
 * orientation, then H2 sections of `- [title](url): one-line summary` links.
 * The summary is the article's own description — not a second, looser sentence
 * written for crawlers that could drift from what the page actually says.
 */
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { PILLAR_LABEL, newestFirst, type Article } from '../lib/articles';
import { PRIMARY_NAV, FOOTER_COMPANY, FOOTER_LEARN, live } from '../lib/nav';

const SITE = 'https://www.sublimepantry.com';

const INTRO =
  'Sublime Pantry publishes evidence-based educational content and free tools for home ' +
  'freeze-drying: which machine to buy, why a batch failed, how to store what came out of it, ' +
  'and the economics and rules of selling freeze-dried food from home. Every article cites ' +
  'dated primary or secondary sources, carries a named human editor, and discloses when it ' +
  'references a product we sell. Comparison pages state the date their figures were verified ' +
  'and the date of the next scheduled re-check.';

/** The order sections appear in, most citable first. */
const PILLAR_ORDER: Article['data']['pillar'][] = ['compare', 'guides', 'troubleshooting', 'recipes'];

/**
 * Non-article pages worth citing, with a summary each.
 *
 * Keyed by href and cross-checked against the nav below, so a page that is
 * still `pending` in src/lib/nav.ts never gets advertised here. That is the
 * whole guard: this file links only to routes the site actually serves.
 */
const STATIC_PAGES: { href: string; title: string; summary: string }[] = [
  {
    href: '/tools/batch-log',
    title: 'Batch Log',
    summary:
      'A free freeze-drying batch log. Records tray load, cycle time and outcome so runs can be ' +
      'compared; data stays in the browser and is never sent to a server.',
  },
  {
    href: '/camping',
    title: 'Camping and backpacking meals',
    summary:
      'Freeze-dried meals for the pack, argued on cost per serving and carried weight rather than ' +
      'on preparedness.',
  },
  {
    href: '/editorial-standards',
    title: 'Editorial Standards',
    summary:
      'How articles here are researched, sourced, edited and corrected, including where AI assists ' +
      'research and where a named human is accountable.',
  },
  {
    href: '/review-methodology',
    title: 'Review Methodology',
    summary:
      'What we do and do not test, how specifications are verified against manufacturer ' +
      'documentation, and why unverified claims are omitted rather than hedged.',
  },
  {
    href: '/corrections',
    title: 'Corrections',
    summary: 'Logged corrections to published articles, with the date and what changed.',
  },
  {
    href: '/about',
    title: 'About and editorial team',
    summary: 'Who writes and edits Sublime Pantry, and what they are accountable for.',
  },
  {
    href: '/affiliate-disclosure',
    title: 'Affiliate Disclosure',
    summary: 'Commercial relationships that could affect what is recommended here.',
  },
];

/** Every href the nav is willing to render — i.e. every route that exists. */
function liveHrefs(): Set<string> {
  const out = new Set<string>();
  const walk = (items: ReturnType<typeof live>) => {
    for (const item of items) {
      if (item.href) out.add(item.href);
      if (item.children) walk(item.children);
    }
  };
  walk(live(PRIMARY_NAV));
  walk(live(FOOTER_LEARN));
  walk(live(FOOTER_COMPANY));
  return out;
}

function link(title: string, href: string, summary: string): string {
  return `- [${title}](${SITE}${href}): ${summary}`;
}

export async function GET(_context: APIContext) {
  const entries = (await getCollection('articles')).sort(newestFirst);
  const existing = liveHrefs();

  const lines: string[] = ['# Sublime Pantry', '', `> ${INTRO}`, ''];

  for (const pillar of PILLAR_ORDER) {
    const inPillar = entries.filter((e) => e.data.pillar === pillar);
    if (!inPillar.length) continue;
    lines.push(`## ${PILLAR_LABEL[pillar]}`, '');
    for (const e of inPillar) {
      lines.push(link(e.data.title, `/${e.data.pillar}/${e.id}`, e.data.description));
    }
    lines.push('');
  }

  const tools = STATIC_PAGES.filter((p) => p.href.startsWith('/tools/') || p.href === '/camping');
  const editorial = STATIC_PAGES.filter((p) => !tools.includes(p));

  const section = (heading: string, pages: typeof STATIC_PAGES) => {
    const shown = pages.filter((p) => existing.has(p.href));
    if (!shown.length) return;
    lines.push(`## ${heading}`, '');
    for (const p of shown) lines.push(link(p.title, p.href, p.summary));
    lines.push('');
  };

  section('Tools and hubs', tools);
  section('Editorial policy', editorial);

  return new Response(`${lines.join('\n').trimEnd()}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
