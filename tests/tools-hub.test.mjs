/**
 * The tools hub, the newsletter page, and the homepage slot.
 *
 * The hub is driven by `TOOLS` so that adding a calculator is one edit. The
 * risk in that arrangement is the opposite of drift: a hub that renders
 * something the registry does not contain, or omits something it does. Both
 * directions are asserted.
 *
 * The homepage slot is the interesting one. It renders nothing until a tool
 * sets `homepageEmbed`, and nothing does today — so the assertion is that an
 * empty registry produces an empty slot rather than a placeholder advertising a
 * tool that is not there. A "coming soon" panel is the same class of claim as a
 * nav item pointing at a 404.
 *
 * CI builds before it tests. Locally, run `npm run build` first.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { TOOLS, liveTools, homepageTool } from '../src/lib/tools.ts';

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
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');

test('every tool in the registry is a route that exists', () => {
  for (const tool of TOOLS) {
    const stem = join(root, 'src/pages', tool.href.replace(/^\//, ''));
    const builds = existsSync(`${stem}.astro`) || existsSync(join(stem, 'index.astro'));
    assert.equal(
      builds,
      !tool.pending,
      `${tool.href}: a listed tool must build, and a pending one must not`,
    );
  }
});

test('the hub renders every live tool, and only those', () => {
  const html = page('tools.html');
  const t = text(html);
  for (const tool of liveTools()) {
    assert.ok(t.includes(tool.name), `the hub omits ${tool.name}`);
    assert.ok(t.includes(tool.answers), `the hub omits what ${tool.name} answers`);
    assert.ok(html.includes(`href="${tool.href}"`), `the hub does not link ${tool.href}`);
  }
  const entries = (html.match(/<li class="tool"[^>]*>/g) ?? []).length + (html.includes('class="featured-tool"') ? 1 : 0);
  assert.equal(entries, liveTools().length, 'the hub renders an entry the registry does not contain');
});

test('the hub leads with the question, not the tool name', () => {
  // A reader deciding whether to open something is matching it against a
  // question they already have. Compare within the card, on decoded text: the
  // name is "&amp;"-escaped in markup and the <head> says it first.
  const html = page('tools.html');
  for (const card of html.match(/<li class="tool"[^>]*>[\s\S]*?<\/li>/g) ?? []) {
    const t = text(card);
    const tool = liveTools().find((x) => t.includes(x.answers));
    assert.ok(tool, `a card matches no tool: ${t.slice(0, 60)}`);
    assert.ok(
      t.indexOf(tool.answers) < t.indexOf(tool.name),
      `${tool.name}: the card leads with the name rather than the question`,
    );
  }
});

test('the homepage renders the one tool selected by the canonical registry', () => {
  const html = page('index.html');
  const embedded = homepageTool();
  assert.ok(embedded, 'the finished tools department needs one featured homepage utility');
  assert.equal(liveTools().filter((tool) => tool.homepageEmbed).length, 1);
  assert.match(html, /id="workbench-heading"/);
  assert.ok(text(html).includes(embedded.name), `${embedded.name} is selected but absent from the homepage`);
});

test('the nav links the hub, not any single tool', () => {
  const nav = readFileSync(join(root, 'src/lib/nav.ts'), 'utf8');
  const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const live = stripComments(nav);
  assert.match(live, /\{ href: '\/tools', label: 'Tools' \}/);
  assert.ok(
    !/\{ href: '\/tools\/[^']*', label:/.test(live),
    'the nav links an individual tool — it should link the hub so the header does not change as the toolbox grows',
  );
});

test('the newsletter page describes the email before asking for an address', () => {
  const html = page('newsletter.html');
  const t = text(html);
  assert.match(t, /weekly email on batch decisions, troubleshooting and storage/i);
  assert.match(t, /Starter Checklist/);
  // The form is email and consent only. Scope to <main>: every page also
  // carries the footer's compact signup, which has the same two fields.
  const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
  const inputs = [...main.matchAll(/<input[^>]*name="([^"]+)"[^>]*>/g)].map((m) => m[1]);
  const visible = inputs.filter((n) => !['form-name', 'lead_magnet', 'source_path', 'bot-field'].includes(n));
  assert.deepEqual(visible.sort(), ['email', 'marketing_consent'], `unexpected fields: ${visible.join(', ')}`);
  // And it claims no back issues, because there are none.
  assert.match(t, /no back issues to read yet/i);
  assert.ok(!/Read past issues/.test(text(page('index.html'))), 'the footer links an archive that does not exist');
});
