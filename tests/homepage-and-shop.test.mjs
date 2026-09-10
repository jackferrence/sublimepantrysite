/**
 * Phase 4, batch 1 — the homepage, the shop and the product page.
 *
 * Three things here are worth a test rather than a look.
 *
 * The product had two names. The page said "Freeze-Drying Packaging Starter
 * Kit"; the cart and the checkout said "Reserve Starter Kit — 100 Mylar Bags +
 * Absorbers + Labels", because that is the Shopify title. A buyer read one name
 * on the page and a different one at the moment they paid. Shopify owns the
 * name, so the assertion is that our copy of it is Shopify's, and that no
 * surface writes a third one.
 *
 * That product is archived as of 2026-09-09 — we no longer resell PackFreshUSA's
 * boxed set — and the pin below covers all eight live products rather than the
 * one. Pinning a single product was itself part of the failure: seven titles
 * could move without anything here noticing.
 *
 * The homepage exists to convert a consented subscription and pointed at two
 * other things first. The hero's own button now goes to the form.
 *
 * The hero image slot held the brand monogram — U05 — and section 7 asks for
 * "the real printable checklist preview", explicitly not an invented test bench
 * or stock photography presented as our own batches. The preview renders from
 * the same data as the printable page, and this asserts they match, because a
 * preview that has drifted from the thing it previews is an advertisement.
 *
 * CI builds before it tests. Locally, run `npm run build` first.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, globSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { CATALOG } from '../src/lib/commerce.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

function page(file) {
  const path = join(dist, file);
  assert.ok(existsSync(path), `run \`npm run build\` first (${file})`);
  return readFileSync(path, 'utf8');
}

const text = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');

/**
 * Shopify's title for every live product, read from the live store.
 *
 * Hard-coded on purpose: a test that reads the name from the same constant the
 * page reads it from would pass whatever that constant said.
 *
 * Read from the Admin API on 2026-09-09, filtered to `status:active`. Every
 * ACTIVE handle is here and nothing else is — an archived product must not
 * appear, because the catalog must not list one.
 *
 * This still only catches the site drifting from a name someone wrote down, not
 * the name being changed underneath it. That half is scripts/check-shopify-title.mjs,
 * which now reads this map as well as the catalog.
 */
const SHOPIFY_TITLES = {
  'snack-bags-6x6-50-pack-absorbers': 'Snack Bags 6×6 — 50 Pack with Absorbers',
  'snack-bags-6x6-100-pack-absorbers': 'Snack Bags 6×6 — 100 Pack with Absorbers',
  '100cc-oxygen-absorber-refill-100-count': '100cc Oxygen Absorber Refill — 100 Count',
  'mini-heat-sealer-for-mylar-bags': 'Mini Heat Sealer for Mylar Bags',
  'starter-set-50-bags-50-absorbers-sealer': 'Starter Set — 50 Bags, 50 Absorbers, Sealer',
  'season-set-100-bags-100-absorbers-sealer': 'Season Set — 100 Bags, 100 Absorbers, Sealer',
  'quart-bags-8x12-50-pack-300cc-absorbers': 'Quart Bags 8×12 — 50 Pack with 300cc Absorbers',
  '300cc-oxygen-absorber-refill-100-count': '300cc Oxygen Absorber Refill — 100 Count',
};

test('U04: the site calls every product what Shopify calls it', () => {
  assert.deepEqual(
    CATALOG.map((p) => p.handle).sort(),
    Object.keys(SHOPIFY_TITLES).sort(),
    'the catalog and the pinned Shopify titles disagree about which products exist',
  );
  for (const product of CATALOG) {
    const shopify = SHOPIFY_TITLES[product.handle];
    assert.equal(product.title, shopify, `${product.handle}: the catalog title has drifted from the Shopify title`);
    assert.ok(
      shopify.startsWith(product.shortTitle),
      `${product.handle}: the short name is not a shortening of the real one`,
    );
  }
});

test('the archived kit is gone from the catalog, not merely hidden', () => {
  const archived = 'freeze-dryer-packaging-starter-kit-100';
  assert.ok(!CATALOG.some((p) => p.handle === archived), 'an ARCHIVED Shopify product is still in the catalog');
});

test('U04: no surface publishes a retired product name', () => {
  // Both names the boxed set ever had are retired together: the product is
  // archived, so neither may appear on a published page. "Reserve Starter Kit"
  // was the earlier title; "Freeze-Drying Packaging Starter Kit" the later one.
  const retired = /Reserve Starter Kit|Freeze-Drying Packaging Starter Kit/i;
  const offenders = globSync('**/*.html', { cwd: dist })
    .filter((f) => retired.test(readFileSync(join(dist, f), 'utf8')))
    .concat(
      // Comments are allowed to name the retired title — the note in
      // commerce.ts explaining why it was retired is the reason this passes.
      globSync('src/**/*.{astro,ts}', { cwd: root }).filter((f) =>
        retired.test(
          readFileSync(join(root, f), 'utf8')
            .replace(/\/\*[\s\S]*?\*\//g, ' ')
            .replace(/(^|[^:])\/\/.*$/gm, '$1'),
        ),
      ),
    );
  assert.deepEqual(offenders, [], 'the old product name is still published');
});

test('the archived product URL redirects rather than rendering or 404ing', () => {
  // It had inbound links, so a 404 is the worse of the two failures. What must
  // not happen is the third option: a page that still looks purchasable.
  assert.ok(
    !existsSync(join(dist, 'shop/freeze-dryer-packaging-starter-kit.html')),
    'the archived product still renders a page',
  );
  const redirects = readFileSync(join(dist, '_redirects'), 'utf8');
  assert.match(
    redirects,
    /^\/shop\/freeze-dryer-packaging-starter-kit\s+\/shop\s+301$/m,
    'the archived product URL does not redirect to /shop',
  );
});

test('M07: the homepage leads with a current answer and an editorial trust path', () => {
  const html = page('index.html');
  const t = text(html);
  assert.match(t, /The complete batch workflow/);
  assert.match(t, /How we publish/);
  assert.ok(t.indexOf('The complete batch workflow') < t.indexOf('Find your next step'));
});

test('U05: the homepage task index covers the three reader jobs', () => {
  const html = page('index.html');
  const shown = text(html);
  assert.match(shown, /Choose the machine/);
  assert.match(shown, /Run and troubleshoot batches/);
  assert.match(shown, /Package and store the result/);
  assert.doesNotMatch(html, /<svg[^>]*class="[^"]*mark/i, 'a reconstructed monogram returned as homepage decoration');
});

test('the homepage answers its own questions, and each answer is a limit', () => {
  const t = text(page('index.html'));
  assert.match(t, /We have not bench-tested freeze dryers/);
  assert.match(t, /From our own stock/);
  assert.match(t, /Choose packaging after checking the food/);
  assert.match(t, /Sources you can follow\. Limits made clear/);
});

test('U06: the shop describes the product, not the roadmap', () => {
  const t = text(page('shop.html'));
  for (const staging of [
    'Validation launch',
    'validating demand',
    'Next after validation',
    'stay unlisted',
    'branded fulfillment',
  ]) {
    assert.ok(!t.includes(staging), `shop still carries staging copy: "${staging}"`);
  }
  // The fulfillment fact a buyer needs is not roadmap, and it stays — it is
  // just a different fact now that nothing is drop-shipped.
  assert.match(t, /Everything on this page is held here and packed by us/);
  assert.match(t, /heat sealer is required and is not included/);
});

// Removed with the product: 'the product page states what the kit cannot do'
// asserted the FAQ on shop/freeze-dryer-packaging-starter-kit.html, a page that
// no longer exists. The equivalent limits for the live range are asserted by
// the generic PDP tests; there is nothing here to re-point it at.
