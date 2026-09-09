import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, basename } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'src/content/articles');

/**
 * The citation invariant, in both directions:
 *   every [n] in the body resolves to a source, and every source is cited.
 *
 * Direction one holds site-wide today. Direction two does not: nine articles
 * predate the sourced-article format and carry a small register with no inline
 * citations at all. They are listed below rather than excused — bringing them
 * up is research work (re-verifying each claim against its source), which is
 * why it is its own phase and not a copy edit.
 *
 * The allowlist is a ratchet, not a waiver. An entry that starts passing FAILS
 * this suite until it is deleted from the list, so the list can only shrink.
 */
const UNCITED_REGISTER_ALLOWLIST = new Set([
  'batch-not-dry',
  // Still the thin, generated-comparison article: its replacement was held
  // back because reconciling it against src/lib/machines.ts would have meant
  // choosing between two sourced figures, which is research, not a copy edit.
  'home-freeze-dryers',
  'rehydration-problems',
  'storage-containers',
  'vacuum-error',
]);

/**
 * PRODUCT.md: "every article carries at least two sources with access dates."
 * content.config.ts only enforces min(1), so these two shipped under the bar.
 * Same ratchet rule applies.
 */
const SINGLE_SOURCE_ALLOWLIST = new Set(['rehydration-problems', 'vacuum-error']);

const articles = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => {
    const id = basename(f, '.json');
    const a = { id, ...JSON.parse(readFileSync(join(dir, f), 'utf8')) };
    /*
     * Every surface the article ships, not just the body.
     *
     * FAQ answers and howTo steps render on the page and carry [n] markers of
     * their own, so a register entry cited only from an FAQ answer is cited.
     * Reading bodyHtml alone reported one as an orphan, and the fix that
     * suggests — delete the source — would have deleted a real citation and
     * left the FAQ claim unattributed. Same reasoning as the extractor in
     * claim-shapes.test.mjs: a string that ships is a surface.
     */
    a.citedText = [
      a.bodyHtml,
      ...(a.faq ?? []).flatMap((q) => [q.question, q.answer]),
      ...(a.howTo ?? []).flatMap((h) => [h.name, h.text]),
    ].join(' ');
    return a;
  });

test('there are articles to check', () => {
  assert.ok(articles.length >= 11, `expected the full article set, saw ${articles.length}`);
});

test('every [n] resolves to a source in the register', () => {
  for (const a of articles) {
    const cited = [...a.citedText.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1]));
    const dangling = [...new Set(cited)].filter((n) => n < 1 || n > a.sources.length);
    assert.deepEqual(
      dangling,
      [],
      `${a.id}: cites ${JSON.stringify(dangling)} but the register has ${a.sources.length} entries`,
    );
  }
});

test('every register entry is cited in the body', () => {
  for (const a of articles) {
    if (UNCITED_REGISTER_ALLOWLIST.has(a.id)) continue;
    const cited = new Set([...a.citedText.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])));
    const uncited = a.sources.map((_, i) => i + 1).filter((n) => !cited.has(n));
    assert.deepEqual(uncited, [], `${a.id}: register entries ${JSON.stringify(uncited)} are never cited`);
  }
});

test('the uncited-register allowlist only shrinks', () => {
  for (const id of UNCITED_REGISTER_ALLOWLIST) {
    const a = articles.find((x) => x.id === id);
    assert.ok(a, `allowlisted article ${id} no longer exists — drop it from the list`);
    const cited = new Set([...a.citedText.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])));
    const uncited = a.sources.map((_, i) => i + 1).filter((n) => !cited.has(n));
    assert.ok(
      uncited.length > 0,
      `${id} now cites every source — remove it from UNCITED_REGISTER_ALLOWLIST`,
    );
  }
});

test('every article carries at least two sources', () => {
  for (const a of articles) {
    if (SINGLE_SOURCE_ALLOWLIST.has(a.id)) continue;
    assert.ok(a.sources.length >= 2, `${a.id}: only ${a.sources.length} source(s)`);
  }
});

test('the single-source allowlist only shrinks', () => {
  for (const id of SINGLE_SOURCE_ALLOWLIST) {
    const a = articles.find((x) => x.id === id);
    assert.ok(a, `allowlisted article ${id} no longer exists — drop it from the list`);
    assert.ok(
      a.sources.length < 2,
      `${id} now has ${a.sources.length} sources — remove it from SINGLE_SOURCE_ALLOWLIST`,
    );
  }
});

test('every source has a URL and an access date', () => {
  for (const a of articles) {
    for (const [i, s] of a.sources.entries()) {
      assert.match(s.url, /^https?:\/\//, `${a.id} [${i + 1}]: bad url ${s.url}`);
      assert.match(
        s.accessDate ?? '',
        /^\d{4}-\d{2}-\d{2}$/,
        `${a.id} [${i + 1}] (${s.title}): accessDate must be YYYY-MM-DD`,
      );
    }
  }
});
