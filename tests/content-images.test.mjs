/**
 * Every image an article declares must resolve to a file that exists.
 *
 * This failed once, quietly. Two articles landed declaring heroes whose
 * photographs had not been delivered, eight call sites rendered `<img>` at
 * those paths, and nothing objected until `check-links` ran against the built
 * site — three pages into the build, with an error that named the missing URL
 * rather than the article that asked for it.
 *
 * The contract is deliberately NOT "an article may not name an undelivered
 * photograph". Naming the file you are waiting for is the whole point of the
 * slot: `heroImage()` resolves it against public/ and renders nothing until it
 * lands. What this test enforces is the other half — that the resolution
 * actually happens, so a slot is either dark or real, never broken.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ARTICLES = 'src/content/articles';
const PUBLIC = 'public';

function articles() {
  return readdirSync(ARTICLES)
    .filter((f) => f.endsWith('.json'))
    .map((f) => ({ slug: f.replace(/\.json$/, ''), data: JSON.parse(readFileSync(join(ARTICLES, f), 'utf8')) }));
}

test('a declared image path is well formed and local', () => {
  for (const { slug, data } of articles()) {
    if (!data.image) continue;
    assert.match(data.image.src, /^\/images\//, `${slug}: hero must live under /images/`);
    assert.ok(data.image.alt?.trim(), `${slug}: a hero needs alt text`);
  }
});

test('every declared image is either delivered or knowingly pending', () => {
  // Reported, not failed: an article legitimately names its photograph before
  // the photograph exists. The build must stay green while a slot is dark.
  const pending = [];
  for (const { slug, data } of articles()) {
    if (data.image && !existsSync(join(PUBLIC, data.image.src))) pending.push(`${slug} -> ${data.image.src}`);
  }
  if (pending.length) {
    console.log(`  [images] ${pending.length} hero slot(s) awaiting delivery:`);
    for (const p of pending) console.log(`    ${p}`);
  }
  assert.ok(true);
});

test('the built page never emits an img or a schema image for a missing file', () => {
  // The assertion that would have caught the original failure, stated over the
  // built site rather than the source: for every article whose photograph is
  // absent, no <img> and no JSON-LD `image` may reference it anywhere.
  const dist = 'dist';
  if (!existsSync(dist)) throw new Error('run `npm run build` before `npm test`');

  const pages = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, name.name);
      if (name.isDirectory()) walk(p);
      else if (name.name.endsWith('.html')) pages.push(p);
    }
  };
  walk(dist);

  const missing = articles()
    .filter(({ data }) => data.image && !existsSync(join(PUBLIC, data.image.src)))
    .map(({ data }) => data.image.src);

  for (const src of missing) {
    for (const page of pages) {
      const html = readFileSync(page, 'utf8');
      assert.ok(!html.includes(src), `${page} references the undelivered image ${src}`);
    }
  }
});
