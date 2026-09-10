/**
 * The header brand block.
 *
 * Removing the wordmark removes the site's name from the page. Everything here
 * exists to prove it did not actually leave: not from the accessible tree, not
 * from the HTML a crawler reads, and not from the structured data. A logo that
 * looks right and announces nothing is the failure this guards against.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const DIST = new URL('../dist/', import.meta.url);
const built = (f) => {
  const p = new URL(f, DIST);
  if (!existsSync(p)) throw new Error(`dist/${f} missing — run \`npm run build\` first`);
  return readFileSync(p, 'utf8');
};
const header = (html) => html.slice(html.indexOf('<header'), html.indexOf('</header>'));
const footer = (html) => html.slice(html.indexOf('<footer'), html.indexOf('</footer>'));

test('the home link carries an accessible name', () => {
  // axe reports zero violations on this page; this pins the specific attribute
  // axe was reading, so a refactor that drops it fails here rather than in a
  // manual audit six months later.
  assert.match(header(built('index.html')), /<a href="\/" class="brand" aria-label="Sublime Pantry — home"/);
});

test('the brand name survives in the HTML, visually hidden', () => {
  // The SEO and AI-search signal. The wordmark is gone from the design; the
  // string is not gone from the document.
  assert.match(header(built('index.html')), /<span class="sr-only"[^>]*>Sublime Pantry<\/span>/);
});

test('the supplied artwork is decorative, so the link is not announced twice', () => {
  assert.match(header(built('index.html')), /<img class="brand-wordmark" src="\/brand\/approved\/[^"]+\.svg" alt=""/);
});

test('the artwork the header points at actually exists', () => {
  const m = /<img[^>]+src="(\/brand\/[^"]+\.svg)"/.exec(header(built('index.html')));
  assert.ok(m, 'the brand block must reference a file');
  assert.ok(existsSync(new URL(`../public${m[1]}`, import.meta.url)), `${m[1]} is not in public/`);
});

test('Organization structured data still carries the name', () => {
  const org = [...built('index.html').matchAll(/<script[^>]*ld\+json[^>]*>([\s\S]*?)<\/script>/g)]
    .flatMap(([, j]) => { const p = JSON.parse(j); return p['@graph'] ?? [p]; })
    .find((n) => n['@type'] === 'Organization');
  assert.equal(org.name, 'Sublime Pantry');
});

test('the footer keeps the full lockup', () => {
  const f = footer(built('index.html'));
  assert.match(f, /sublimepantry-tagline-ink-ice\.svg/, 'the footer must use the supplied tagline lockup');
  assert.ok(!/<svg[^>]*class="mark/.test(f), 'retired reconstructed mark returned');
});

test('the approved ice colour has one primitive and semantic aliases use it', () => {
  const source = readFileSync(new URL('../src/styles/tokens.tokens.json', import.meta.url), 'utf8');
  const tokens = JSON.parse(source);
  assert.equal(tokens.color.brand.ice.$value, '#B4D9EC');
  assert.equal((source.match(/#B4D9EC/gi) ?? []).length, 1, 'the approved hex belongs to one primitive token');
  const css = readFileSync(new URL('../public/styles/base.css', import.meta.url), 'utf8');
  assert.match(css, /--logo-frost:\s*var\(--color-brand-ice\)/);
});

test('the documented rules match what the code does', () => {
  // A rule the code contradicts is worse than no rule: the next person cannot
  // tell which is authoritative.
  const media = readFileSync(new URL('../src/lib/media.ts', import.meta.url), 'utf8');
  assert.match(media, /Roman SP is the single selected monogram/);
  assert.match(media, /\/brand\/approved/);
  const component = readFileSync(new URL('../src/components/BrandBlock.astro', import.meta.url), 'utf8');
  assert.match(component, /BRAND\.wordmark/);
  assert.match(component, /BRAND\.mark/);
  assert.ok(!/Sublime Pantry<\/|<svg|<path/.test(component), 'the component must not typeset or redraw the mark');
});

test('the approved contexts select the inline wordmark and roman SP monogram', () => {
  const html = header(built('index.html'));
  assert.match(html, /sublimepantry-inline-ink-ice\.svg/);
  assert.match(html, /sublimepantry-sp-ink-ice\.svg/);
  assert.match(html, /brand-wordmark[^>]*width="1406"/);
});

test('the display system names Bodoni Moda and retires the temporary faces', () => {
  const tokens = readFileSync(new URL('../src/styles/tokens.tokens.json', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../public/styles/base.css', import.meta.url), 'utf8');
  assert.match(tokens, /Bodoni Moda Variable/);
  assert.ok(!/Didot|Ibarra Real Nova/.test(tokens + css));
  assert.match(css, /font-optical-sizing:\s*auto/);
});

test('Bodoni Moda Variable is declared, self-hosted, and not left an orphaned dependency', () => {
  // The site self-hosts every face rather than linking Google Fonts or a
  // package CDN, so a missing @font-face here means the family falls back to
  // plain serif even though the package is installed. And an installed
  // package the CSS never references is dead weight the same way.
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.ok(
    pkg.dependencies?.['@fontsource-variable/bodoni-moda'],
    '@fontsource-variable/bodoni-moda must be a declared dependency',
  );
  const css = readFileSync(new URL('../public/styles/base.css', import.meta.url), 'utf8');
  const faces = [...css.matchAll(/@font-face\{font-family:"Bodoni Moda Variable";[^}]*\}/g)];
  assert.ok(faces.length > 0, 'base.css must declare @font-face for Bodoni Moda Variable');
  for (const [face] of faces) {
    assert.match(face, /src:url\("\/fonts\/[^"]+\.woff2"\) format\("woff2-variations"\)/, 'must self-host from /fonts, not a remote CDN');
    const file = face.match(/\/fonts\/([^"]+\.woff2)/)[1];
    assert.ok(existsSync(new URL(`../public/fonts/${file}`, import.meta.url)), `public/fonts/${file} referenced but missing`);
  }
});
