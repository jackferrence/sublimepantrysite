/**
 * The IndexNow submitter's two load-bearing properties.
 *
 * This script sat in the repo unrun for a week with a hardcoded
 * `HOST="sublimepantry.netlify.app"` while every URL in the sitemap has always
 * been `www.sublimepantry.com`. IndexNow rejects a submission whose urlList
 * does not belong to `host`, so every ping it could have made would have been
 * refused — silently, because nothing called it.
 *
 * Both assertions below exist because "it looked right" is what shipped the
 * bug. The host is now derived from the sitemap, and the script exits 0 on
 * every failure path, and neither is left to inspection.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SCRIPT = 'scripts/indexnow-ping.sh';

function sitemapDir(locs) {
  const dir = mkdtempSync(join(tmpdir(), 'indexnow-'));
  writeFileSync(
    join(dir, 'sitemap-0.xml'),
    `<?xml version="1.0"?><urlset>${locs.map((l) => `<loc>${l}</loc>`).join('')}</urlset>`,
  );
  return dir;
}

/** Runs the script, returning stdout and exit code — never throwing. */
function run(env = {}, args = []) {
  try {
    const stdout = execFileSync(SCRIPT, args, {
      env: { ...process.env, ...env },
      encoding: 'utf8',
      timeout: 60_000,
    });
    return { stdout, code: 0 };
  } catch (e) {
    return { stdout: `${e.stdout ?? ''}${e.stderr ?? ''}`, code: e.status ?? 1 };
  }
}

test('host is derived from the sitemap, never hardcoded', () => {
  const dir = sitemapDir(['https://example.test/a', 'https://example.test/b']);
  const { stdout, code } = run({ SITEMAP_DIR: dir }, ['--dry-run']);
  assert.equal(code, 0);
  const payload = JSON.parse(stdout.slice(stdout.indexOf('{')));
  assert.equal(payload.host, 'example.test', 'host must come from the URLs');
  assert.equal(payload.keyLocation, 'https://example.test/a7366f75afb9a795378933d753c283a6.txt');
  for (const url of payload.urlList) {
    assert.ok(
      new URL(url).host === payload.host,
      `${url} does not belong to host ${payload.host} — IndexNow would reject this`,
    );
  }
});

test('the key in the script matches the key file served from public/', () => {
  const script = readFileSync(SCRIPT, 'utf8');
  const key = script.match(/^KEY="([0-9a-f]{32})"$/m)?.[1];
  assert.ok(key, 'no 32-hex key found in the script');
  const served = readFileSync(`public/${key}.txt`, 'utf8').trim();
  assert.equal(served, key, `public/${key}.txt must contain exactly the key`);
});

test('a sitemap spanning two hosts is skipped, not guessed at', () => {
  const dir = sitemapDir(['https://a.test/x', 'https://b.test/y']);
  const { stdout, code } = run({ SITEMAP_DIR: dir }, ['--dry-run']);
  assert.equal(code, 0);
  assert.match(stdout, /multiple hosts/);
  assert.doesNotMatch(stdout, /urlList/, 'must not build a payload it cannot send');
});

test('every failure path exits 0 — a ping must never fail a deploy', () => {
  const cases = [
    ['missing sitemap directory', { SITEMAP_DIR: join(tmpdir(), 'indexnow-absent-dir') }],
    ['sitemap with no <loc>', { SITEMAP_DIR: sitemapDir([]) }],
    ['unreachable endpoint', {
      SITEMAP_DIR: sitemapDir(['https://example.test/a']),
      INDEXNOW_ENDPOINT: 'https://indexnow.invalid-tld-xyz/submit',
    }],
  ];
  for (const [name, env] of cases) {
    const { code } = run(env);
    assert.equal(code, 0, `${name}: exited ${code}, which would fail the deploy`);
  }
});

test('an empty directory is skipped rather than treated as an empty site', () => {
  const dir = mkdtempSync(join(tmpdir(), 'indexnow-bare-'));
  mkdirSync(join(dir, 'sub'), { recursive: true });
  const { stdout, code } = run({ SITEMAP_DIR: dir });
  assert.equal(code, 0);
  assert.match(stdout, /no sitemap/);
});

test('Netlify can resolve the build plugin the way Netlify resolves it', () => {
  // This is the assertion that would have caught the deploy failure. The plugin
  // shipped as `index.mjs` with a `manifest.yml` and no `package.json`, which
  // looks complete and is not: Netlify resolves a local plugin directory with
  // Node's own module resolution, which looks for `index.js` or a `package.json`
  // `main`, finds neither, and fails the whole build with
  //   Plugin could not be found using local path: ./plugins/indexnow
  // before any of the fail-soft logic in the script gets a chance to run.
  const require = createRequire(import.meta.url);
  const resolved = require.resolve(join(process.cwd(), 'plugins/indexnow'));
  assert.match(resolved, /plugins\/indexnow\/index\.mjs$/);

  const pkg = JSON.parse(readFileSync('plugins/indexnow/package.json', 'utf8'));
  assert.equal(pkg.main, 'index.mjs');
  assert.equal(pkg.type, 'module', 'index.mjs uses ESM syntax');

  // netlify.toml must point at the directory that actually exists.
  const toml = readFileSync('netlify.toml', 'utf8');
  const pkgPath = toml.match(/^\s*package\s*=\s*"([^"]+)"/m)?.[1];
  assert.equal(pkgPath, '/plugins/indexnow');
  assert.ok(existsSync('plugins/indexnow/manifest.yml'), 'a local plugin needs manifest.yml');
});

test('the plugin skips every context that is not production', async () => {
  const { onSuccess } = await import('../plugins/indexnow/index.mjs');
  for (const context of ['deploy-preview', 'branch-deploy', 'dev', undefined]) {
    const logged = [];
    const realLog = console.log;
    const realContext = process.env.CONTEXT;
    console.log = (m) => logged.push(String(m));
    if (context === undefined) delete process.env.CONTEXT;
    else process.env.CONTEXT = context;
    try {
      await onSuccess({ constants: {}, utils: {} });
    } finally {
      console.log = realLog;
      if (realContext === undefined) delete process.env.CONTEXT;
      else process.env.CONTEXT = realContext;
    }
    assert.match(
      logged.join('\n'),
      /not production — skipping/,
      `context "${context}" must not submit`,
    );
  }
});
