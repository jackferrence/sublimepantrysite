/**
 * Phase 4, batch 3 — the pages that describe how the site works.
 *
 * These carry a particular risk: a trust page is a set of claims about our own
 * conduct, and nothing on the site checks whether they are still true. Four
 * were not.
 *
 * The review methodology described a full bench-test protocol — identical loads
 * by weight, energy metering, noise measurements, "reproducible by any reader
 * with the same equipment" — for a test bench that does not exist. The
 * corrections page promised to "respond to every report". The affiliate
 * disclosure cited the FTC's guides as though compliance were a credential. And
 * the no-affiliate review date was written in two places that disagreed.
 *
 * CI builds before it tests. Locally, run `npm run build` first.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, globSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { AFFILIATE_REVIEWED } from '../src/lib/commerce.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

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
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');

test('the review methodology does not describe a test bench we do not have', () => {
  const t = text(page('review-methodology.html'));
  for (const phrase of ['energy metering', 'noise measurements', 'reproducible by any reader']) {
    // The retraction is allowed to name what it retracts; a live commitment is not.
    const live = t
      .split(/(?<=[.!?])\s+/)
      .filter((s) => !/An earlier version|has been removed/i.test(s))
      .join(' ');
    assert.ok(!live.includes(phrase), `a fixed future test protocol is still promised: "${phrase}"`);
  }
  assert.match(t, /have not committed to a testing program/, 'the page no longer says testing is uncommitted');
});

test('the review methodology says what happens when sources disagree', () => {
  const t = text(page('review-methodology.html'));
  assert.match(t, /When sources disagree/i);
  assert.match(t, /do not manufacture a single answer/i);
  // Including when the two disagreeing sources are our own pages.
  assert.match(t, /two of our pages publish different figures/i);
});

test('the corrections page promises nothing it cannot keep', () => {
  const t = text(page('corrections.html'));
  assert.ok(
    !/respond to every report/i.test(t),
    'the corrections page still promises a response to every report',
  );
  assert.match(t, /Report it/i, 'the page no longer invites reports at all');
});

test('the corrections log records the corrections that were published', () => {
  const html = page('corrections.html');
  const entries = html.match(/<time datetime="\d{4}-\d{2}-\d{2}">/g) ?? [];
  assert.ok(entries.length >= 7, `expected the published corrections to be logged, found ${entries.length}`);

  const t = text(html);
  // Each of these was corrected in an article with a visible retraction note and
  // had no log entry. A retraction the log does not carry is half a correction.
  for (const subject of [
    'Pump type stated incorrectly',
    'water-activity',
    'handling history',
    '3-year limited',
    '~900 W',
    'USDA',
  ]) {
    assert.ok(t.includes(subject), `the log does not record the ${subject} correction`);
  }
  assert.match(t, /logged on the date the corrections were published, not the date the errors were made/i,
    'the log must say what its dates mean');
});

test('the affiliate disclosure does not wear compliance as a credential', () => {
  const t = text(page('affiliate-disclosure.html'));
  assert.ok(!/FTC/.test(t), 'the page still cites the regulator as a credential');
  assert.match(t, /reviews or testimonials that did not come from real, identified people/i);
});

test('the no-affiliate review date is written once', () => {
  const stated = globSync('**/*.html', { cwd: dist })
    .map((f) => ({ f, m: text(readFileSync(join(dist, f), 'utf8')).match(/as of ([A-Z][a-z]+ \d{1,2}, \d{4})/i) }))
    .filter((x) => x.m);
  assert.ok(stated.length >= 2, 'expected the claim on at least the disclosure and About');
  for (const { f, m } of stated) {
    assert.equal(m[1], AFFILIATE_REVIEWED, `${f} dates the affiliate review differently from the constant`);
  }
});

test('no page orders a diagnosis by frequency it has not measured', () => {
  // §8.12: "Do not label diagnosis order as frequency without data." The vacuum
  // error page said "in order of likelihood" in its description, its FAQ answer,
  // an SVG label ("Most vacuum errors end right here") and its closing
  // paragraph — four surfaces, three of them not visible prose.
  const shape = /in order of likelihood|most (?:vacuum errors|common (?:cause|leak|failure))|nine times out of ten/i;
  const offenders = globSync('**/*.html', { cwd: dist }).filter((f) => {
    const raw = readFileSync(join(dist, f), 'utf8');
    // Scan everything, not just prose: alt text, <title>, <desc> and meta all
    // carried claims before.
    return shape.test(raw.replace(/\s+/g, ' '));
  });
  assert.deepEqual(offenders, [], 'a page orders causes by an unmeasured frequency');
});

test('no page promises that storage lasts', () => {
  // "storage that lasts" survived in the site-wide meta description in
  // BaseLayout, so it was on every page in <head> and in none of them visibly.
  const offenders = globSync('**/*.html', { cwd: dist }).filter((f) =>
    /storage that (?:actually )?lasts/i.test(readFileSync(join(dist, f), 'utf8')),
  );
  assert.deepEqual(offenders, [], 'an unqualified durability claim is still published');
});
