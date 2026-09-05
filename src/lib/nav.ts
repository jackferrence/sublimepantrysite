/**
 * The navigation tree — one source of truth for the header, the mobile drawer
 * and the footer.
 *
 * Six top-level items, two of which are dropdowns. Ten flat items is past the
 * point where a nav bar helps anyone find anything, so Shop and Learn group
 * their sections and Camping stays top-level on purpose: it is a distinct
 * audience, not a subtopic of Learn.
 *
 * `pending` marks a route that is designed but not yet built. The entry stays
 * here so the PR that adds the page un-gates it by deleting one word, and so
 * the nav test can prove that nothing we link to 404s in the meantime.
 */

export interface NavItem {
  /** Omitted on a group header: the trigger is a button, not a link. */
  href?: string;
  label: string;
  /** Route not built yet. Filtered out of every rendered nav. */
  pending?: boolean;
  children?: NavItem[];
}

export const PRIMARY_NAV: NavItem[] = [
  {
    label: 'Shop',
    children: [
      { href: '/shop', label: 'All products' },
      { href: '/shop/pantry', label: 'Pantry packaging', pending: true },
      { href: '/shop/trail', label: 'Trail packaging', pending: true },
      { href: '/shipping-returns', label: 'Shipping & returns' },
    ],
  },
  {
    label: 'Learn',
    children: [
      { href: '/guides', label: 'Guides' },
      { href: '/troubleshooting', label: 'Troubleshooting' },
      { href: '/compare', label: 'Comparisons' },
      { href: '/recipes', label: 'Recipes' },
      { href: '/start-selling', label: 'Selling what you dry' },
    ],
  },
  { href: '/camping', label: 'Camping', pending: true },
  { href: '/tools/batch-log', label: 'Batch Log' },
  { href: '/newsletter', label: 'Newsletter', pending: true },
  { href: '/about', label: 'About' },
];

export const FOOTER_SHOP: NavItem[] = [
  { href: '/shop', label: 'All products' },
  { href: '/shop/pantry', label: 'Pantry packaging', pending: true },
  { href: '/shop/trail', label: 'Trail packaging', pending: true },
  { href: '/shipping-returns', label: 'Shipping & returns' },
];

export const FOOTER_LEARN: NavItem[] = [
  { href: '/guides', label: 'Guides' },
  { href: '/troubleshooting', label: 'Troubleshooting' },
  { href: '/compare', label: 'Comparisons' },
  { href: '/recipes', label: 'Recipes' },
  { href: '/camping', label: 'Camping', pending: true },
  { href: '/tools/batch-log', label: 'Batch Log' },
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

/** Drop every entry whose page does not exist yet, children included. */
export function live(items: NavItem[]): NavItem[] {
  return items
    .filter((item) => !item.pending)
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

/** The Dry Batch archive, linked from the footer once the hub exists. */
export const NEWSLETTER_ARCHIVE: NavItem = { href: '/newsletter', label: 'Read past issues', pending: true };
