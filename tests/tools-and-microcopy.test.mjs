/**
 * Phase 4, batch 5 — the tool pages, the printed page, and the global microcopy.
 *
 * Two of these are claims in disguise.
 *
 * The Batch Log invited readers to ask for "a cross-device batch-log app with
 * cloud backup, per-food cycle predictions, and printable cottage-food
 * records". Nothing of the sort is being built. §8.24 says to remove the
 * speculative cloud app and prediction features, and not to add tool
 * capabilities as part of a copy change.
 *
 * The checklist's print stylesheet hid the one rule the sheet exists to enforce
 * — "packaging cannot fix an under-dried batch" — while printing the site
 * header, the footer and the newsletter form. A checklist ends up taped to a
 * machine; the paper is what has to carry the warning.
 *
 * CI builds before it tests. Locally, run `npm run build` first.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { CHECKLIST_RULE } from '../src/lib/checklist.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function page(file) {
  const path = join(root, 'dist', file);
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

test('§8.24: the Batch Log describes the tool that exists', () => {
  const t = text(page('tools/batch-log.html'));
  for (const speculative of ['cloud backup', 'cycle predictions', 'cross-device', 'Want this as a real app']) {
    assert.ok(!t.includes(speculative), `the Batch Log still advertises "${speculative}"`);
  }
  // And states the limits of local storage, with the privacy policy beside them.
  assert.match(t, /no server backup and no sync between devices/i);
  assert.match(t, /Clearing browser data removes them/i);
  assert.match(page('tools/batch-log.html'), /href="\/privacy"/);
});

test('§8.25: the printed checklist carries the rule and drops the site', () => {
  const html = page('freeze-drying-starter-checklist.html');
  const block = html.match(/@media print\{([\s\S]*?)\}(?=[^{]*$|\s*<\/style>)/)?.[1] ?? html.match(/@media print\{([\s\S]{0,900})/)?.[1];
  assert.ok(block, 'the checklist has no print stylesheet at all');

  for (const gone of ['.site-header', '.site-footer', '.newsletter', '.breadcrumbs', '.print-button', '.checklist-shop']) {
    assert.ok(block.includes(gone), `${gone} still prints`);
  }
  assert.match(
    block,
    /\.checklist-note[^{]*\{[^}]*display:block!important/,
    'the one rule the checklist exists to enforce is hidden on the paper',
  );
  // And it is the rule, from the shared constant, not a paraphrase.
  assert.ok(text(html).includes(CHECKLIST_RULE), 'the printed rule is not the checklist rule');
});

test('§8: the global navigation says what its controls do', () => {
  const home = page('index.html');
  for (const [name, why] of [
    ['Search Sublime Pantry', 'the search control is unnamed or names only the concept'],
    ['Open shopping cart', 'the cart button does not name its action'],
    ['Open menu', 'the menu button does not name its action'],
  ]) {
    assert.ok(home.includes(name), `${why} — expected "${name}"`);
  }
  assert.match(home, /placeholder="Search machines, batch problems and storage/);
  // The no-results line names what to try instead of quoting the failed query.
  const bundles = readFileSync(join(root, 'dist/index.html'), 'utf8');
  assert.ok(
    bundles.includes('No matching articles. Try a food, machine or symptom.'),
    'the empty search state does not suggest what would work',
  );
});
