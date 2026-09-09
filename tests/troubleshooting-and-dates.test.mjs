/**
 * Phase 4, batch 4 — the troubleshooting pages, and what "verified" means.
 *
 * `verifiedDate` was `updatedDate ?? publishedDate`, which answered a question
 * nobody had asked it: not "when were these figures rechecked?" but "when did
 * anyone last touch this file?". Every editorial edit silently re-dated a
 * verification that had not happened, and an article nobody had ever rechecked
 * still published a verification date — its publication date, wearing the word
 * "verified". It is its own optional field now, with no fallback, and unset
 * renders nothing.
 *
 * The troubleshooting pages carried three claims this site cannot make: a
 * fifteen-minute promise about work on somebody else's machine, an assurance
 * about what somebody else's warranty covers, and a heating instruction for
 * food sourced to "the community". The first was introduced by me in Phase 5.
 *
 * And "Tools mentioned in this guide" appeared on three articles that mention
 * no tool.
 *
 * CI builds before it tests. Locally, run `npm run build` first.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, globSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const articleDir = join(root, 'src/content/articles');

const articles = () =>
  readdirSync(articleDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => ({ slug: f.replace(/\.json$/, ''), data: JSON.parse(readFileSync(join(articleDir, f), 'utf8')) }));

function page(file) {
  const path = join(dist, file);
  assert.ok(existsSync(path), `run \`npm run build\` first (${file})`);
  return readFileSync(path, 'utf8');
}

const text = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/\s+/g, ' ');

/** Everything a page ships, prose or not — head, alt, JSON-LD, SVG. */
const raw = (html) => html.replace(/\s+/g, ' ');

test('a verification date is never derived from an edit', () => {
  const lib = readFileSync(join(root, 'src/lib/articles.ts'), 'utf8');
  const fn = lib.slice(lib.indexOf('export function verifiedDate'), lib.indexOf('export function nextCheckDate'));
  assert.ok(!/updatedDate|publishedDate/.test(fn), 'verifiedDate() has a fallback again');
  assert.match(fn, /entry\.data\.verifiedDate/);
});

test('only an article with a recorded recheck shows a verification date', () => {
  const dated = articles().filter((a) => a.data.verifiedDate);
  assert.ok(dated.length > 0, 'nothing carries a verification date at all');

  for (const { slug, data } of articles()) {
    const file = `${data.pillar}/${slug}.html`;
    if (!existsSync(join(dist, file))) continue;
    const shows = /Figures verified/.test(page(file));
    assert.equal(
      shows,
      Boolean(data.verifiedDate) && data.pillar === 'compare',
      `${slug}: the badge and the recorded verification disagree`,
    );
  }
});

test('the comparisons hub omits the date it does not have', () => {
  const t = text(page('compare.html'));
  const cards = [...t.matchAll(/(\d+) criteria([^A-Z]*)/g)].map((m) => m[2]);
  assert.ok(cards.length >= 3, 'expected three comparison cards');
  const dated = cards.filter((c) => /verified/.test(c));
  assert.equal(dated.length, articles().filter((a) => a.data.verifiedDate && a.data.pillar === 'compare').length,
    'a card claims a verification the article does not record, or drops one it does');
});

test('the troubleshooting pages make no promise about somebody else’s machine', () => {
  const offenders = [];
  for (const f of globSync('**/*.html', { cwd: dist })) {
    const body = raw(readFileSync(join(dist, f), 'utf8'))
      // A retraction may name what it retracts.
      .split(/(?<=[.!?])\s+/)
      .filter((s) => !/An earlier version|has been removed/i.test(s))
      .join(' ');
    if (/takes about fifteen minutes|in fifteen minutes/i.test(body)) offenders.push(`${f}: fifteen-minute promise`);
    if (/warranty should cover/i.test(body)) offenders.push(`${f}: assures what a warranty covers`);
  }
  assert.deepEqual(offenders, [], 'a page promises something it cannot know');
});

test('no page passes on an unsourced instruction to heat food', () => {
  const offenders = globSync('**/*.html', { cwd: dist }).filter((f) => {
    const body = raw(readFileSync(join(dist, f), 'utf8'))
      .split(/(?<=[.!?])\s+/)
      .filter((s) => !/An earlier version|has been removed/i.test(s))
      .join(' ');
    return /(?:community|widely[- ]shared|people) (?:fix|trick|workaround)/i.test(body) || /warm it in a low oven/i.test(body);
  });
  assert.deepEqual(offenders, [], 'an unsourced workaround is still published');
});

test('"Tools mentioned in this guide" only appears where a tool is mentioned', () => {
  for (const { slug, data } of articles()) {
    const file = `${data.pillar}/${slug}.html`;
    if (!existsSync(join(dist, file))) continue;
    const shows = /Tools mentioned in this guide/.test(page(file));
    const mentions = /freeze-dryer-packaging-starter-kit/.test(data.bodyHtml);
    assert.equal(shows, mentions, `${slug}: the heading and the article disagree about whether a tool is mentioned`);
  }
});

test('front matter cannot insert a product an article never mentions', () => {
  const stripComments = (t) =>
    t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const src = stripComments(readFileSync(join(root, 'src/components/ToolsMentioned.astro'), 'utf8'));
  assert.ok(!/declared/.test(src), 'the front-matter escape hatch is back');
  const layout = readFileSync(join(root, 'src/layouts/ArticleLayout.astro'), 'utf8');
  assert.ok(!/declared=/.test(layout), 'the layout still passes a declared product list');
});
