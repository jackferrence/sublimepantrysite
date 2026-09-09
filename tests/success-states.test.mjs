/**
 * A success state must not be asserted before anything succeeded.
 *
 * /thanks told every visitor "Confirmed" and "your first issue arrives within a
 * week", including someone who had simply opened the URL — and the contact form
 * posted there too, so a support request was answered with a newsletter
 * confirmation. Same class as a buy box printing "In stock" before any
 * inventory is fetched.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const page = (f) => {
  const p = join(root, 'dist', f);
  assert.ok(existsSync(p), `run \`npm run build\` first (${f})`);
  return readFileSync(p, 'utf8');
};

/** Visible text: drop scripts and any element the server marked hidden. */
const visible = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<(div|section)[^>]*\bhidden\b[^>]*>[\s\S]*?<\/\1>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');

test('/thanks asserts nothing to a cold visitor', () => {
  const v = visible(page('thanks.html'));
  assert.doesNotMatch(v, /Confirmed/i, '/thanks tells an unsubmitted visitor they are confirmed');
  assert.doesNotMatch(v, /arrives within a week/i, '/thanks promises a newsletter issue to a cold visitor');
  assert.doesNotMatch(v, /One quick question/i, '/thanks asks a subscriber-only question of a cold visitor');
});

test('/thanks still gives a cold visitor the checklist', () => {
  const v = visible(page('thanks.html'));
  assert.match(v, /Starter Checklist/i);
  assert.match(page('thanks.html'), /href="\/freeze-drying-starter-checklist/);
});

test('/thanks carries a confirmed state, served hidden', () => {
  const html = page('thanks.html');
  assert.match(html, /data-signup-confirmed[^>]*hidden/, 'the confirmed block must be hidden in the served HTML');
  assert.match(html, /data-signup-cold/, 'the cold block must exist');
  assert.match(html, /sp-signup-submitted/, 'the reveal must be gated on submission evidence');
});

test('the contact form no longer posts to the newsletter confirmation', () => {
  const html = page('contact.html');
  const contactForm = html.match(/<form[^>]*name="contact"[^>]*>/)[0];
  assert.match(contactForm, /action="\/message-received"/);
  assert.doesNotMatch(contactForm, /action="\/thanks"/, 'a support request must not land on a newsletter confirmation');
});

test('/message-received asserts nothing to a cold visitor', () => {
  const v = visible(page('message-received.html'));
  assert.doesNotMatch(v, /your message is in/i);
  assert.match(v, /nothing has been sent/i, 'the cold state must say plainly that nothing was sent');
});

test('/message-received promises no newsletter and no checklist', () => {
  // Scoped to <main>: the footer carries the site-wide signup block on every
  // page, which is fine. What must not happen is the confirmation copy itself
  // telling someone who reported a typo that they are now subscribed.
  const main = page('message-received.html').match(/<main[\s\S]*?<\/main>/)[0].replace(/<[^>]+>/g, ' ');
  assert.doesNotMatch(main, /Dry Batch/i, 'a contact confirmation must not promise a newsletter');
  assert.doesNotMatch(main, /Open the Starter Checklist/i, 'a contact confirmation must not promise the lead magnet');
  assert.match(main, /did not subscribe you|not a newsletter signup/i, 'it should say so plainly');
});

test('both confirmation pages stay out of the index', () => {
  for (const f of ['thanks.html', 'message-received.html']) {
    assert.match(page(f), /name="robots" content="noindex/, `${f} must be noindex`);
  }
});
