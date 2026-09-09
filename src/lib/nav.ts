/**
 * The navigation tree — one source of truth for the header, the mobile drawer
 * and the footer.
 *
 * Six top-level items, two of which are dropdowns. Ten flat items is past the
 * point where a nav bar helps anyone find anything, so Shop and Learn group
 * their sections and Camping stays top-level on purpose: it is a distinct
 * audience, not a subtopic of Learn.
 *
 * Two flags, two different facts, and they must not be merged into one.
 *
 * `pending` marks a route that is designed but not yet built. The entry stays
 * here so the PR that adds the page un-gates it by deleting one word, and so
 * the nav test can prove that nothing we link to 404s in the meantime.
 *
 * `unlisted` marks a route that exists and is deliberately kept out of the nav.
 * /recipes is the case: the page is live and useful, and U06 says not to give
 * it a nav slot until it has recipes in it. Overloading `pending` for this
 * would have been one word cheaper and would have destroyed what `pending`
 * guarantees — the nav test asserts that a pending route does NOT exist, and a
 * flag that means both "missing" and "hidden" can prove neither.
 *
 * It is not a parking space for speculation. `/shop/pantry` and `/shop/trail`
 * sat here naming a product taxonomy that no longer exists. Both were removed
 * rather than relabelled: renaming a route to a line
 * that still does not exist buys nothing, and a nav config should describe what
 * is real. Add the entry back in the PR that adds the page.
 */

export interface NavItem {
  /** Omitted on a group header: the trigger is a button, not a link. */
  href?: string;
  label: string;
  /** Route not built yet. Filtered out of every rendered nav. */
  pending?: boolean;
  /** Route exists, deliberately not linked. Filtered out of every rendered nav. */
  unlisted?: boolean;
  children?: NavItem[];
}

export const PRIMARY_NAV: NavItem[] = [
  {
    label: 'Shop',
    children: [
      { href: '/shop', label: 'All products' },
      { href: '/shipping-returns', label: 'Shipping & returns' },
    ],
  },
  {
    label: 'Learn',
    children: [
      { href: '/guides', label: 'Guides' },
      { href: '/troubleshooting', label: 'Troubleshooting' },
      { href: '/compare', label: 'Comparisons' },
      { href: '/recipes', label: 'Recipes', unlisted: true },
      { href: '/start-selling', label: 'Selling what you dry' },
    ],
  },
  { href: '/camping', label: 'Camping', pending: true },
  // The hub, not the tool. The header should not need editing every time the
  // toolbox grows, and /tools/batch-log is still its own route.
  { href: '/tools', label: 'Tools' },
  { href: '/newsletter', label: 'Newsletter' },
  { href: '/about', label: 'About' },
];

export const FOOTER_SHOP: NavItem[] = [
  { href: '/shop', label: 'All products' },
  { href: '/shipping-returns', label: 'Shipping & returns' },
];

export const FOOTER_LEARN: NavItem[] = [
  { href: '/guides', label: 'Guides' },
  { href: '/troubleshooting', label: 'Troubleshooting' },
  { href: '/compare', label: 'Comparisons' },
  { href: '/recipes', label: 'Recipes', unlisted: true },
  { href: '/camping', label: 'Camping', pending: true },
  { href: '/tools', label: 'Tools' },
  { href: '/start-selling', label: 'Selling what you dry' },
];

export const FOOTER_COMPANY: NavItem[] = [
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
  { href: '/editorial-standards', label: 'Editorial Standards' },
  { href: '/review-methodology', label: 'Review Methodology' },
  { href: '/affiliate-disclosure', label: 'Affiliate Disclosure' },
  { href: '/corrections', label: 'Corrections' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
  { href: '/rss.xml', label: 'RSS' },
];

/** Drop every entry we do not link — unbuilt or deliberately unlisted. */
export function live(items: NavItem[]): NavItem[] {
  return items
    .filter((item) => !item.pending && !item.unlisted)
    .map((item) => (item.children ? { ...item, children: live(item.children) } : item))
    .filter((item) => !item.children || item.children.length > 0);
}

/**
 * Exact match only. This is what earns `aria-current="page"`, and nothing else
 * does — announcing "current page" on a dropdown trigger that is not the page
 * is a worse signal than no signal.
 */
export function isCurrentPage(path: string, href: string | undefined): boolean {
  if (!href) return false;
  return path === href;
}

/**
 * Prefix match across the item and its children. Drives `data-section-current`,
 * which is a purely visual state — Learn stays underlined while you read
 * /guides/rehydration-problems.
 */
export function isCurrentSection(path: string, item: NavItem): boolean {
  const hit = (href?: string) => !!href && (path === href || path.startsWith(`${href}/`));
  if (hit(item.href)) return true;
  return (item.children ?? []).some((child) => hit(child.href));
}

/**
 * The Dry Batch archive.
 *
 * `unlisted`, not `pending`, and the distinction is the whole reason the two
 * flags exist. /newsletter is built — `pending` would now be a false statement
 * about the route, and the nav test would say so. What is missing is not the
 * page but the thing the label promises: "Read past issues" says there are past
 * issues, and there are none. So the route exists and we choose not to link it.
 *
 * Drop `unlisted` in the PR that publishes the first issue.
 */
export const NEWSLETTER_ARCHIVE: NavItem = { href: '/newsletter', label: 'Read past issues', unlisted: true };
