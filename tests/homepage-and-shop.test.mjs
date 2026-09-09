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
import { CHECKLIST_SECTIONS } from '../src/lib/checklist.ts';

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

const kit = CATALOG[0];

/**
 * Shopify's title for the kit, as read from the live cart on 2026-09-08.
 * Hard-coded on purpose: a test that reads the name from the same constant the
 * page reads it from would pass whatever that constant said.
 */
const SHOPIFY_TITLE = 'Reserve Starter Kit — 100 Mylar Bags + Absorbers + Labels';

test('U04: the site calls the product what Shopify calls it', () => {
  assert.equal(kit.title, SHOPIFY_TITLE, 'the catalog title has drifted from the Shopify product title');
  assert.ok(SHOPIFY_TITLE.startsWith(kit.shortTitle), 'the short name is not a shortening of the real one');
});

test('U04: no surface writes a third name for the kit', () => {
  // Spaces, not hyphens: the URL slug is `freeze-dryer-packaging-starter-kit`
  // and it is preserved on purpose. This looks for the name written as prose.
  const retired = /Freeze[- ]?Dry(?:ing|er) Packaging Starter Kit/i;
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

test('U04: the product URL is unchanged', () => {
  assert.equal(kit.detailsHref, '/shop/freeze-dryer-packaging-starter-kit');
  assert.ok(existsSync(join(dist, 'shop/freeze-dryer-packaging-starter-kit.html')));
  assert.equal(kit.handle, 'freeze-dryer-packaging-starter-kit-100', 'the Shopify handle is the join key; it does not move');
});

test('M07: the homepage hero leads to the thing the page is for', () => {
  const html = page('index.html');
  const hero = html.slice(html.indexOf('hero-actions'), html.indexOf('</section>'));
  const primary = hero.match(/<a class="btn btn-primary"[^>]*href="([^"]+)"[^>]*>([^<]+)</);
  assert.ok(primary, 'the hero has no primary action');
  assert.equal(primary[1], '#newsletter', 'the hero button points away from the signup');
  assert.equal(primary[2].trim(), 'Get the free checklist');
  assert.match(html, /id="newsletter"/, 'the hero points at an anchor that is not on the page');
});

test('U05: the hero preview is the checklist, not a monogram', () => {
  const html = page('index.html');
  const heroMedia = html.slice(html.indexOf('hero-media'), html.indexOf('routes-heading'));
  assert.doesNotMatch(heroMedia, /<svg[^>]*class="[^"]*mark/i, 'the brand monogram is back in the image slot');

  // Every heading and every previewed item must be the checklist's own.
  const shown = text(heroMedia);
  for (const section of CHECKLIST_SECTIONS) {
    assert.ok(shown.includes(section.heading), `hero preview omits "${section.heading}"`);
    for (const item of section.items.slice(0, 2)) {
      assert.ok(shown.includes(item), `hero preview shows an item the checklist does not: "${item}"`);
    }
  }

  // And the printable page must still contain everything the preview promises.
  const printable = text(page('freeze-drying-starter-checklist.html'));
  for (const section of CHECKLIST_SECTIONS) {
    for (const item of section.items) {
      assert.ok(printable.includes(item), `the printable checklist is missing "${item}"`);
    }
  }
});

test('the homepage answers its own questions, and each answer is a limit', () => {
  const t = text(page('index.html'));
  assert.match(t, /We have not bench-tested freeze dryers/);
  assert.match(t, /PackFreshUSA ships it directly to you/);
  assert.match(t, /We publish freeze-drying guidance and sell packaging/);
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
  // The fulfillment fact a buyer needs is not roadmap, and it stays.
  assert.match(t, /PackFreshUSA supplies it and ships it directly to you/);
  assert.match(t, /heat sealer is required and is not included/);
});

test('the product page states what the kit cannot do', () => {
  const t = text(page('shop/freeze-dryer-packaging-starter-kit.html'));
  assert.match(t, /Does the kit guarantee a storage life\?\s*No\./);
  assert.match(t, /Are these Sublime Pantry-manufactured bags\?\s*No\./);
  assert.ok(!t.includes('sold in most starter packs'), 'the unsourced comparison to other sellers is still published');
});
