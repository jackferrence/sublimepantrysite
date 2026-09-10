import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

/**
 * docs/CLAUDE-CODE-PROMPT.md T5.5. Screenshots one representative page per
 * template at 375/768/1280/1600px in both colour schemes, into
 * docs/screens/. Requires `node scripts/static-server.mjs` (or any server
 * on :4321 serving a fresh `dist/`) already running — this script doesn't
 * start one itself, so a repeat run against unbuilt/stale content doesn't
 * silently happen.
 *
 * Real URLs, same set as tests/a11y/axe.spec.ts and .lighthouserc.cjs.
 */
const OUT = process.argv[2] || 'docs/screens';
mkdirSync(OUT, { recursive: true });

const PAGES = [
  { name: 'home', path: '/' },
  { name: 'guide', path: '/guides/freeze-drying-milk/' },
  { name: 'product', path: '/shop/quart-bags-8x12-50-pack-300cc-absorbers/' },
  { name: 'store-index', path: '/shop/' },
  { name: 'how-we-test', path: '/review-methodology/' },
];
const WIDTHS = [375, 768, 1280, 1600];
const SCHEMES = ['light', 'dark'];

const browser = await chromium.launch();
for (const scheme of SCHEMES) {
  const context = await browser.newContext({ colorScheme: scheme });
  const page = await context.newPage();
  for (const p of PAGES) {
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(`http://localhost:4321${p.path}`, { waitUntil: 'networkidle' });
      const file = `${OUT}/${p.name}-${width}-${scheme}.png`;
      await page.screenshot({ path: file, fullPage: true });
      console.log('wrote', file);
    }
  }
  await context.close();
}
await browser.close();
