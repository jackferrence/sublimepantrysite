/**
 * Phase 5 — what an article says first, and how the site talks.
 *
 * M14: a deep visitor lands mid-funnel and needs the answer, not a runway.
 * Nine of eleven articles opened with a framing paragraph, and five carried a
 * "frequently asked question" whose answer was a verbatim copy of the article's
 * own meta description — a teaser served to readers and to FAQPage JSON-LD in
 * the position where an answer belongs.
 *
 * M13: the tone findings. Two of these are checked as shapes, because they are
 * claim classes that recur — a description of what the reader is (M13's status
 * judgments) and a description of what everyone else publishes. The rest is a
 * sweep of the exact phrases the audit named, which is the weaker check and is
 * why the shapes exist.
 *
 * M15: the footer newsletter promise. It appeared on all 32 pages, which is
 * what made it worth a test rather than a fix: a component in BaseLayout is the
 * mechanism by which one unverifiable sentence becomes thirty-two.
 *
 * CI builds before it tests. Locally, run `npm run build` first.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, globSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const articleDir = join(root, 'src/content/articles');

const articles = () =>
  readdirSync(articleDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => ({ slug: f.replace(/\.json$/, ''), data: JSON.parse(readFileSync(join(articleDir, f), 'utf8')) }));

const pages = () =>
  globSync('**/*.html', { cwd: dist }).map((f) => ({
    file: f,
    text: readFileSync(join(dist, f), 'utf8')
      .replace(/<script[\s\S]*?<\/script>/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&#39;|&rsquo;/g, "'")
      .replace(/\s+/g, ' '),
  }));

test('M14: every article answers before it frames', () => {
  for (const { slug, data } of articles()) {
    // Notices — a published correction, a methodology box — come before the
    // answer and stay there. The answer is the first prose the reader meets.
    const body = data.bodyHtml.replace(/^(\s*<div\b[\s\S]*?<\/div>\s*)+/, '');
    assert.match(
      body,
      /^<p><strong>The short version:<\/strong>/,
      `${slug}: opens with a runway rather than the answer`,
    );
  }
});

test('M14: no FAQ answer is the article\'s own teaser', () => {
  const offenders = [];
  for (const { slug, data } of articles()) {
    for (const entry of data.faq ?? []) {
      if (entry.answer.trim() === data.description.trim()) {
        offenders.push(`${slug}: "${entry.question}"`);
      }
      // A teaser can also be a near-copy. An answer that adds nothing to the
      // description is not an answer, whatever the punctuation does.
      const words = (s) => new Set(s.toLowerCase().match(/[a-z]{4,}/g) ?? []);
      const desc = words(data.description);
      const shared = [...words(entry.answer)].filter((w) => desc.has(w)).length;
      if (desc.size && shared / desc.size > 0.85 && entry.answer.length < data.description.length * 1.4) {
        offenders.push(`${slug}: "${entry.question}" restates the description`);
      }
    }
  }
  assert.deepEqual(offenders, [], 'an FAQ answer repeats the teaser instead of answering');
});

test('M13: the site does not grade its readers or its competitors', () => {
  // Two recurring shapes. "your first serious run" told a reader their earlier
  // batches were not serious; "there are enough of those already" graded other
  // people's recipe pages.
  const readerJudgment = /\byour first (?:serious|real|proper)\b|\bif you are serious\b|\banyone can\b/i;
  const competitorJudgment = /\benough of those already\b|\bunlike (?:most|other) (?:sites|blogs|pages)\b|\bmost (?:sites|blogs|recipe pages)\b/i;
  const retired = ['nothing invented', 'we will not pretend', "inspector's bad day", 'first serious run'];

  for (const { file, text } of pages()) {
    // The source register lists cited works under their published titles, and
    // one of them is PackFreshUSA's "Sealing Mylar Bags: Easy Methods Anyone
    // Can Use". That is their headline being quoted, not the site telling a
    // reader anyone can do it, and rewriting it would misquote the source.
    const ownVoice = text.replace(/Easy Methods Anyone Can Use/g, ' ');
    assert.doesNotMatch(ownVoice, readerJudgment, `${file}: judges the reader`);
    assert.doesNotMatch(text, competitorJudgment, `${file}: judges other publishers`);
    for (const phrase of retired) {
      assert.ok(!text.toLowerCase().includes(phrase), `${file}: retired M13 phrase "${phrase}" is still published`);
    }
  }
});

test('M15: the footer promises a newsletter it can keep, and names the checklist', () => {
  const retired = 'one cottage-selling insight';
  const footerPitch = readFileSync(join(root, 'src/components/Footer.astro'), 'utf8').match(
    /class="footer-line footer-pitch">([^<]+)</,
  )?.[1];
  assert.ok(footerPitch, 'the footer pitch is no longer where this test can read it');
  assert.match(footerPitch, /Starter Checklist/, 'the button below says "Get the checklist"; the sentence above it must say so too');
  assert.doesNotMatch(footerPitch, /each issue|every issue contains|one .* and one .*, weekly/i, 'a per-issue composition promise is back');

  const stillPublished = pages().filter((p) => p.text.toLowerCase().includes(retired)).map((p) => p.file);
  assert.deepEqual(stillPublished, [], 'the retired per-issue promise is still on these pages');
});

test('M16: the About counts are generated, not typed', () => {
  const about = readFileSync(join(root, 'src/pages/about.astro'), 'utf8');
  const strip = about.match(/const stats = \[[\s\S]*?\];/)?.[0];
  assert.ok(strip, 'the /about stats block is no longer where this test can read it');
  assert.doesNotMatch(strip, /value: \d+/, 'a count on /about is a typed number and will go stale silently');
  assert.match(strip, /articles\.length/, 'the article count is no longer derived from the collection');
});
