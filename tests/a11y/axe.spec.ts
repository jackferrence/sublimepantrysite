import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * docs/CLAUDE-CODE-PROMPT.md T5.1. axe-core over one representative page per
 * template, in light and dark (`colorScheme` emulation), at 375px and
 * 1280px. Fails on `serious`/`critical` violations only — `moderate`/`minor`
 * findings are real but are not what a CI gate should block a deploy on;
 * see the printed violation list in a failure for anything at a lower
 * severity worth a follow-up pass.
 *
 * Real URLs from the built site, not invented fixtures — every one of
 * these is a page that actually exists in `dist/` after `npm run build`
 * (confirmed this session: dist/guides/freeze-drying-milk.html,
 * dist/troubleshooting/storage-failure.html,
 * dist/shop/quart-bags-8x12-50-pack-300cc-absorbers.html, dist/shop.html,
 * dist/review-methodology.html, dist/404.html, dist/index.html).
 *
 * No recipe page exists yet — `src/content/articles/*.json` has zero
 * `pillar: 'recipes'` entries as of this session (grepped to confirm) — so
 * "one recipe" from T5.1's list is skipped rather than pointed at a
 * fixture that doesn't represent real content. Add it back the day a real
 * recipe publishes.
 */
const PAGES: Array<{ name: string; path: string }> = [
  { name: 'home', path: '/' },
  { name: 'guide', path: '/guides/freeze-drying-milk/' },
  { name: 'article (troubleshooting)', path: '/troubleshooting/storage-failure/' },
  { name: 'product', path: '/shop/quart-bags-8x12-50-pack-300cc-absorbers/' },
  { name: 'store index', path: '/shop/' },
  { name: 'how we test', path: '/review-methodology/' },
  { name: '404', path: '/404/' },
];

const VIEWPORTS = [
  { name: '375px', width: 375, height: 800 },
  { name: '1280px', width: 1280, height: 900 },
];

const SCHEMES: Array<'light' | 'dark'> = ['light', 'dark'];

for (const page of PAGES) {
  for (const viewport of VIEWPORTS) {
    for (const scheme of SCHEMES) {
      test(`${page.name} — ${viewport.name} — ${scheme}`, async ({ page: browserPage }) => {
        await browserPage.emulateMedia({ colorScheme: scheme });
        await browserPage.setViewportSize({ width: viewport.width, height: viewport.height });
        await browserPage.goto(page.path);

        const results = await new AxeBuilder({ page: browserPage })
          .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
          .analyze();

        const blocking = results.violations.filter(
          (v) => v.impact === 'serious' || v.impact === 'critical',
        );

        if (blocking.length > 0) {
          const summary = blocking
            .map((v) => `[${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} node(s))`)
            .join('\n');
          console.error(`axe violations on ${page.path}:\n${summary}`);
        }

        expect(blocking, `serious/critical axe violations on ${page.path}`).toEqual([]);
      });
    }
  }
}
