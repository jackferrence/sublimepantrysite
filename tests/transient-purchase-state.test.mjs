/**
 * A loading state must not impersonate a purchase state, and a shipping claim
 * must not outrun the rule.
 *
 * Asserted against the BUILT output, not the source. Both defects this covers
 * survived a clean source sweep: the shipping claim lived in three components
 * under a `meta=` prop, and what a customer sees before hydration is only
 * visible once the page is rendered.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { globSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

const built = () => {
  assert.ok(existsSync(dist), 'run `npm run build` before this suite');
  return globSync('**/*.html', { cwd: dist }).map((f) => ({ file: f, html: readFileSync(join(dist, f), 'utf8') }));
};

const strip = (s) => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

/** Everything Shopify paints before its JS answers. */
function placeholders(html) {
  return [...html.matchAll(/<div[^>]*shopify-loading-placeholder[^>]*>([\s\S]*?)<\/div>/g)].map((m) => m[1]);
}

test('no loading placeholder asserts an inventory state', () => {
  for (const { file, html } of built()) {
    for (const p of placeholders(html)) {
      const text = strip(p);
      assert.doesNotMatch(text, /\bIn stock\b/i, `${file}: a placeholder claims "In stock" before any inventory is fetched — ${text}`);
      assert.doesNotMatch(text, /out of stock/i, `${file}: a placeholder claims stock state — ${text}`);
    }
  }
});

test('no loading placeholder offers a cart action it cannot perform', () => {
  for (const { file, html } of built()) {
    for (const p of placeholders(html)) {
      // An anchor navigates away; it must never be labelled as a cart action.
      for (const a of p.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/g)) {
        assert.doesNotMatch(
          strip(a[1]),
          /add to cart/i,
          `${file}: a link inside a loading placeholder is labelled "Add to cart" but navigates off-site`,
        );
      }
    }
  }
});

test('any control in a loading placeholder is inert', () => {
  for (const { file, html } of built()) {
    for (const p of placeholders(html)) {
      for (const b of p.matchAll(/<button\b[^>]*>/g)) {
        assert.match(b[0], /disabled|aria-disabled/, `${file}: an enabled button sits in a loading placeholder`);
      }
      for (const s of p.matchAll(/<span\b[^>]*class="[^"]*btn[^"]*"[^>]*>/g)) {
        assert.match(s[0], /aria-disabled/, `${file}: a button-styled span in a placeholder is not marked disabled`);
      }
    }
  }
});

test('no page states free shipping without its condition', () => {
  // The live rule is US-only, free at $45 or more, $6.25 below. Any surface
  // that mentions free shipping must carry the threshold or the qualifier.
  const bare = /Ships free\s*(?:·|-|—)?\s*US(?!\s*shipping over)/i;
  for (const { file, html } of built()) {
    const text = strip(html);
    const m = text.match(bare);
    assert.equal(m, null, `${file}: unconditional free-shipping claim ${JSON.stringify(m?.[0])}`);
  }
});

test('the shipping record is the only place the rule is written', () => {
  const src = readFileSync(join(root, 'src/lib/commerce.ts'), 'utf8');
  assert.match(src, /freeThreshold:\s*45/);
  assert.match(src, /flatRate:\s*6\.25/);
  for (const f of ['src/components/CartDrawer.astro', 'src/pages/shop.astro', 'src/components/ToolsMentioned.astro']) {
    assert.match(readFileSync(join(root, f), 'utf8'), /SHIPPING\./, `${f} does not render shipping from the record`);
  }
});
