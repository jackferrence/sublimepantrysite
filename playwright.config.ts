import { defineConfig } from '@playwright/test';

/**
 * docs/CLAUDE-CODE-PROMPT.md T5.1. Serves the already-built `dist/` (this
 * config never runs `npm run build` itself — `npm run test:a11y` does that
 * first, same as the site's own `npm test` requires `npm run build` before
 * it for the same reason: tests read what actually shipped, not source).
 * `webServer` starts a static file server against `dist/` and tears it
 * down after the run.
 */
export default defineConfig({
  testDir: './tests/a11y',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4321',
  },
  webServer: {
    // Not `astro preview`: it daemonizes and detaches on its own (astro
    // preview status/stop manage it separately), which Playwright's
    // webServer reports as "exited early" even once it's genuinely
    // serving — confirmed this session. scripts/static-server.mjs is a
    // plain foreground Node process instead.
    command: 'node scripts/static-server.mjs',
    url: 'http://localhost:4321',
    reuseExistingServer: false,
    timeout: 15_000,
  },
});
