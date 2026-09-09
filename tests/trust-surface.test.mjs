/**
 * The commerce trust surface: terms, privacy, and the support address.
 *
 * These read built HTML, because the failure being guarded against is a policy
 * page that has drifted from what the site does — and a policy page is exactly
 * the kind of file nobody re-reads. The previous privacy policy promised "if
 * we add analytics, we will use a privacy-respecting provider and update this
 * policy first" while Plausible was already loading on every page. It had been
 * wrong for weeks, and nothing failed.
 *
 * CI builds before it tests. Locally, run `npm run build` first.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { SUPPORT_EMAIL } from '../src/lib/paths.ts';

const DIST = new URL('../dist/', import.meta.url);
const SRC = new URL('../src/', import.meta.url);

function built(file) {
  const path = new URL(file, DIST);
  if (!existsSync(path)) {
    throw new Error(`dist/${file} is missing — run \`npm run build\` before \`npm test\`.`);
  }
  return readFileSync(path, 'utf8');
}

const source = (file) => readFileSync(new URL(file, SRC), 'utf8');

test('the support address reaches every surface a customer would look on', () => {
  for (const file of [
    'contact.html',
    'shipping-returns.html',
    'terms.html',
    'privacy.html',
    'shop/starter-set-50-bags-50-absorbers-sealer.html',
  ]) {
    assert.ok(built(file).includes(SUPPORT_EMAIL), `${file} must give the support address`);
  }
});

test('the Organization schema publishes the same address the pages do', () => {
  // A knowledge-graph contact that disagrees with the contact page is a fact
  // about the business stated two ways.
  assert.ok(built('index.html').includes(`"email":"${SUPPORT_EMAIL}"`));
});

test('the terms cover every section the launch actually needs', () => {
  const html = built('terms.html');
  for (const heading of [
    'What we sell',
    'Pricing',
    'Orders and payment',
    'Shipping',
    'Returns',
    'Liability',
    'Governing law',
    'Contact',
  ]) {
    assert.ok(html.includes(`>${heading}<`), `terms must have a "${heading}" section`);
  }
  assert.ok(html.includes('State of California'), 'governing law must be stated');
  assert.ok(html.includes('Shopify Payments'), 'the payment processor must be named');
  assert.ok(
    html.includes('not medical, legal, regulatory, or professional food-safety advice'),
    'the standing editorial disclaimer must carry through to the terms',
  );
});

test('the terms are linked from the footer, not orphaned', () => {
  assert.match(source('lib/nav.ts'), /\{ href: '\/terms', label: 'Terms' \}/);
  assert.ok(built('index.html').includes('href="/terms"'), 'the footer must link /terms');
});

test('privacy names every processor that actually receives data', () => {
  const html = built('privacy.html');
  for (const processor of ['Netlify', 'Klaviyo', 'Shopify', 'Shopify Payments', 'Plausible']) {
    assert.ok(html.includes(processor), `privacy must name ${processor}`);
  }
  // PackFreshUSA was on this list while they drop-shipped the boxed kit and
  // received buyers' addresses. That product is archived and we fulfil from our
  // own stock, so naming them as a processor would over-disclose — it would
  // claim we hand your address to a third party we no longer send it to.
  assert.ok(
    !/<li><strong>PackFreshUSA<\/strong>/.test(html),
    'PackFreshUSA is still listed as a processor receiving customer data',
  );
  assert.ok(html.includes('local storage'), 'the Batch Log storage claim must be stated');
});

test('the analytics section matches the analytics that is actually installed', () => {
  // The ratchet. If someone swaps or adds a provider in BaseLayout without
  // touching the policy, this is what notices.
  const layout = source('layouts/BaseLayout.astro');
  const privacy = built('privacy.html');

  const installed = {
    Plausible: /plausible\.io/.test(layout),
    'Google Analytics': /googletagmanager|google-analytics|gtag/.test(layout),
    'Meta Pixel': /connect\.facebook\.net|fbq\(/.test(layout),
  };

  for (const [name, present] of Object.entries(installed)) {
    if (present) {
      assert.ok(privacy.includes(name), `${name} is installed but the privacy policy does not name it`);
    }
  }

  // And the negative direction: we claim there is no ad network, so there had
  // better not be one.
  assert.ok(!installed['Google Analytics'], 'privacy claims no Google Analytics');
  assert.ok(!installed['Meta Pixel'], 'privacy claims no advertising pixel');
});

test('the policy does not promise to update itself later', () => {
  // The exact shape of the old failure: a forward-looking promise standing in
  // for a present-tense fact.
  const privacy = built('privacy.html');
  assert.ok(
    !/If we add analytics/i.test(privacy),
    'state what is installed now, not what we would do if we installed something',
  );
});

test('the buy box and the shipping page agree about who ships the box', () => {
  // Inverted on 2026-09-09, when the last drop-shipped product was archived.
  // The assertion is the same one — the buy box and /shipping-returns must tell
  // the buyer the same story about who packs the box — but the true story is
  // now that we do, on every product, with no order splitting in two.
  assert.match(
    built('shipping-returns.html'),
    /is assembled from our own wholesale stock, held here, and packed and shipped by us/,
    'the shipping page no longer states who ships',
  );
  assert.ok(
    !built('shop.html').includes('ships it directly to you'),
    'the shop still describes a drop-shipped product',
  );
});

test('no page reintroduces the source-cost claim', () => {
  // Commit 05576f3 removed "sold at source cost / no markup" from five places
  // when the kit went from $59.99 to $74.99, because the claim stopped being
  // true. It is an easy sentence to write again from memory — this is the
  // ratchet that catches it. (Drafting these terms is how that was discovered.)
  const offenders = [];
  for (const file of ['terms.html', 'privacy.html', 'shop.html', 'shop/season-set-100-bags-100-absorbers-sealer.html']) {
    if (/source cost|no markup|priced at cost/i.test(built(file))) offenders.push(file);
  }
  assert.deepEqual(offenders, [], 'the kit is not sold at source cost at $74.99');
});
