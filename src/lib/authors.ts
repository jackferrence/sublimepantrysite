/**
 * The masthead.
 *
 * Sublime Pantry is an institutional publication, not a personal one. What is
 * meant to carry credibility here is the method — stated criteria, dated
 * sources, a published re-check schedule, a public corrections log — and not a
 * biography. A named editor is part of that: Consumer Reports has editors. A
 * face is not, which is why there is no portrait field on this record and no
 * `brand` asset in the library to fill one. See docs/ASSET-LIBRARY.md, where
 * that class is documented as empty by decision rather than empty pending.
 *
 * The role is deliberately "Editor" and never "practitioner". Every claim about
 * hands-on testing on this site is a negative one — the pages say plainly that
 * no machine has been bench-tested — and a byline implying otherwise would
 * undercut the only thing the site is staked on.
 */
export interface Author {
  name: string;
  role: string;
  bio: string;
  /** Monogram for the byline tile. Stands in for a portrait permanently, not
   *  as a placeholder: see the note above. */
  initials: string;
  url: string;
}

export const JACK_FERRENCE: Author = {
  name: 'Jack Ferrence',
  role: 'Editor, Sublime Pantry',
  bio: 'Jack edits Sublime Pantry, a home freeze-drying publication built on manufacturer documentation, food-safety literature, and dated sources rather than forum lore. He reviews and approves every page before it publishes, and logs every correction in public.',
  initials: 'JF',
  url: '/about',
};

export const AUTHORS: Record<string, Author> = {
  'Jack Ferrence': JACK_FERRENCE,
};

export function getAuthor(name: string): Author {
  return AUTHORS[name] ?? JACK_FERRENCE;
}
