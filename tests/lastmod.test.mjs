/**
 * Sitemap `lastmod`.
 *
 * The property this pins down is that a date is either true or absent. A
 * comparison page promises a re-check every ninety days, and `lastmod` is how
 * a crawler learns the promise was kept — which only works if the value cannot
 * be a build timestamp wearing a content date's clothes.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  toPathname,
  readArticleDates,
  readGitDates,
  pageSourceCandidates,
  lastmodFor,
} from '../src/lib/lastmod.ts';

const articles = readArticleDates();

test('a sitemap URL is reduced to the pathname the content is keyed by', () => {
  assert.equal(toPathname('https://www.sublimepantry.com/'), '/');
  assert.equal(toPathname('https://www.sublimepantry.com/about'), '/about');
  assert.equal(toPathname('https://www.sublimepantry.com/about/'), '/about');
  assert.equal(toPathname('https://www.sublimepantry.com/guides/index.html'), '/guides');
  assert.equal(toPathname('https://www.sublimepantry.com/index.html'), '/');
  assert.equal(toPathname('/compare/storage-containers'), '/compare/storage-containers');
});

test('article dates come from the content, updatedDate winning', () => {
  assert.ok(articles.size > 0, 'the collection should not be empty');
  const raw = JSON.parse(readFileSync('src/content/articles/which-freeze-dryer.json', 'utf8'));
  const expected = raw.updatedDate ?? raw.publishedDate;
  assert.equal(articles.get('/guides/which-freeze-dryer'), expected);
});

test('an article lastmod is its content date at midnight UTC, not the build time', () => {
  const sources = { articles, git: new Map() };
  const out = lastmodFor('https://www.sublimepantry.com/guides/which-freeze-dryer', sources);
  assert.equal(out.toISOString(), `${articles.get('/guides/which-freeze-dryer')}T00:00:00.000Z`);
});

test('a static page falls back to its source file\'s last commit', () => {
  const sources = {
    articles,
    git: new Map([['src/pages/about.astro', '2026-09-03T21:19:51.000Z']]),
  };
  const out = lastmodFor('https://www.sublimepantry.com/about', sources);
  assert.equal(out.toISOString(), '2026-09-03T21:19:51.000Z');
});

test('an unknown page gets no date rather than a guessed one', () => {
  const out = lastmodFor('https://www.sublimepantry.com/nowhere', { articles, git: new Map() });
  assert.equal(out, undefined);
});

test('a missing git history degrades to no dates, never to today', () => {
  // The shape a shallow CI clone produces. Static pages lose their lastmod;
  // articles keep theirs, because their date lives in the content.
  const sources = { articles, git: new Map() };
  assert.equal(lastmodFor('https://www.sublimepantry.com/about', sources), undefined);
  assert.ok(lastmodFor('https://www.sublimepantry.com/compare/storage-containers', sources));
});

test('route-to-source resolution prefers the flat file over the directory index', () => {
  assert.deepEqual(pageSourceCandidates('/').slice(0, 1), ['src/pages/index.astro']);
  const guides = pageSourceCandidates('/guides');
  assert.equal(guides[0], 'src/pages/guides.astro');
  assert.ok(guides.includes('src/pages/guides/index.astro'));
  assert.equal(pageSourceCandidates('/tools/batch-log')[0], 'src/pages/tools/batch-log.astro');
});

test('git dates are readable in this repo and resolve real page sources', () => {
  // Not asserting a value — the point is that the mechanism finds the file at
  // all. If this ever starts failing locally, the fallback above is what ships.
  const git = readGitDates();
  assert.ok(git.size > 0, 'git history should be readable in a working checkout');
  assert.ok(git.has('src/pages/about.astro'), 'about.astro should have a commit date');
});
