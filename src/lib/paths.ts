/**
 * Canonical path for a rendered page.
 *
 * The site builds with `build.format: 'file'`, so at build time
 * `Astro.url.pathname` is the *file* path — `/index.html`, or
 * `/guides/complete-batch-workflow.html` — not the URL a reader ever sees.
 *
 * That value was being written into `source_path` on the lead form, which meant
 * Netlify Forms, the Shopify customer metafield and Plausible all recorded
 * `/index.html` as the acquisition page. Normalise once, here.
 */
export function normalizePath(pathname: string): string {
  const withoutExtension = pathname.replace(/\.html$/, '');
  const withoutIndex = withoutExtension.replace(/\/index$/, '/');
  const trimmed = withoutIndex.replace(/(.+)\/$/, '$1');
  return trimmed || '/';
}

/**
 * Klaviyo hosted preference page.
 *
 * Left empty on purpose — the footer renders the "Manage email preferences"
 * link only when this is filled in, so we never ship a link to nowhere. Paste
 * the hosted preference-page URL from Klaviyo here.
 */
export const PREFERENCE_CENTER_URL = '';
