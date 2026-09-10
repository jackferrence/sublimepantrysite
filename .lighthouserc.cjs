/**
 * docs/CLAUDE-CODE-PROMPT.md T5.2. `staticDistDir` — LHCI serves `dist/`
 * with its own static server, so this sidesteps the `astro preview`
 * daemon problem noted in playwright.config.ts entirely; no custom server
 * needed here.
 *
 * Real URLs (not invented ones) — same three as tests/a11y/axe.spec.ts's
 * home/guide/product targets, confirmed present in `dist/` this session.
 */
module.exports = {
  ci: {
    collect: {
      staticDistDir: './dist',
      url: [
        'http://localhost/index.html',
        'http://localhost/guides/freeze-drying-milk.html',
        'http://localhost/shop/quart-bags-8x12-50-pack-300cc-absorbers.html',
      ],
      numberOfRuns: 1,
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 1 }],
        'categories:best-practices': ['error', { minScore: 0.95 }],
        'categories:seo': ['error', { minScore: 0.95 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 200 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
