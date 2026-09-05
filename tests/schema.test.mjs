/**
 * Recipe structured data.
 *
 * The builder's contract is negative as much as positive: it must never emit a
 * yield, a time, an ingredient list or a step the article did not state.
 * Structured data is a machine-readable claim, and an invented cook time is an
 * invented fact that no proofreader will catch.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recipeJsonLd } from '../src/lib/schema.ts';

const ctx = {
  site: 'https://www.sublimepantry.com',
  pageUrl: 'https://www.sublimepantry.com/recipes/strawberries/',
  publishedIso: '2026-09-01T00:00:00.000Z',
};

const base = {
  title: 'Freeze-dried strawberries',
  description: 'Slice, tray, run, seal.',
  author: 'Jack Ferrence',
};

test('an article with nothing recipe-specific to say gets no Recipe block', () => {
  // A Recipe with no steps, no ingredients and no times is a type annotation,
  // not structured data.
  assert.equal(recipeJsonLd(base, ctx), null);
  assert.equal(recipeJsonLd({ ...base, recipe: {} }, ctx), null);
  assert.equal(recipeJsonLd({ ...base, howTo: [] }, ctx), null);
});

test('steps alone are enough substance', () => {
  const out = recipeJsonLd({ ...base, howTo: [{ name: 'Slice', text: 'Even 3/8in slices.' }] }, ctx);
  assert.equal(out['@type'], 'Recipe');
  assert.deepEqual(out.recipeInstructions, [
    { '@type': 'HowToStep', name: 'Slice', text: 'Even 3/8in slices.' },
  ]);
});

test('only declared fields are emitted', () => {
  const out = recipeJsonLd({ ...base, recipe: { yield: 'About 4 cups' } }, ctx);
  assert.equal(out.recipeYield, 'About 4 cups');
  for (const absent of ['prepTime', 'cookTime', 'totalTime', 'recipeIngredient', 'recipeCategory', 'image']) {
    assert.ok(!(absent in out), `${absent} must not be invented`);
  }
});

test('cycleTime becomes cookTime — the machine run is the cooking step', () => {
  const out = recipeJsonLd({ ...base, recipe: { cycleTime: 'PT30H', prepTime: 'PT20M' } }, ctx);
  assert.equal(out.cookTime, 'PT30H');
  assert.equal(out.prepTime, 'PT20M');
  // Not summed into a totalTime nobody stated.
  assert.ok(!('totalTime' in out));
});

test('a relative image src is resolved against the site origin', () => {
  const out = recipeJsonLd(
    { ...base, howTo: [{ name: 'x', text: 'y' }], image: { src: '/images/recipes/berries.jpg', alt: 'Berries' } },
    ctx,
  );
  assert.deepEqual(out.image, ['https://www.sublimepantry.com/images/recipes/berries.jpg']);
});

test('the full shape carries every declared field and no others', () => {
  const out = recipeJsonLd(
    {
      ...base,
      howTo: [{ name: 'Slice', text: 'Even slices.' }],
      recipe: {
        yield: 'About 4 cups, from 6 lb fresh',
        prepTime: 'PT20M',
        cycleTime: 'PT30H',
        totalTime: 'P1DT7H',
        ingredients: ['6 lb strawberries'],
        category: 'Fruit',
      },
    },
    ctx,
  );
  assert.deepEqual(Object.keys(out).sort(), [
    '@context', '@type', 'author', 'cookTime', 'datePublished', 'description',
    'mainEntityOfPage', 'name', 'prepTime', 'recipeCategory', 'recipeIngredient',
    'recipeInstructions', 'recipeYield', 'totalTime',
  ]);
  assert.equal(out.author.url, 'https://www.sublimepantry.com/about/');
});

/* ------------------------------------------------------------------------- *
 * Structured data as it actually ships.
 *
 * The tests above check one builder in isolation. These read the built HTML,
 * because the question that matters to a crawler is not "does the builder
 * work" but "what types does this page claim, together, in the file you
 * served". A layout that quietly stops passing `jsonLd` through, or a
 * component that emits a second BreadcrumbList, is invisible to a unit test
 * and obvious here.
 *
 * CI builds before it tests (.github/workflows/ci.yml), so dist/ is present.
 * Locally, run `npm run build` first.
 * ------------------------------------------------------------------------- */
import { readFileSync, existsSync } from 'node:fs';

const DIST = new URL('../dist/', import.meta.url);

function page(file) {
  const path = new URL(file, DIST);
  if (!existsSync(path)) {
    throw new Error(`dist/${file} is missing — run \`npm run build\` before \`npm test\`.`);
  }
  return readFileSync(path, 'utf8');
}

/**
 * Every JSON-LD block on the page, with `@graph` members hoisted to the top
 * level — a graph is a container, not a claim, so its members are what the
 * page is actually asserting.
 */
function jsonLdNodes(html) {
  const nodes = [];
  const re = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g;
  for (const [, body] of html.matchAll(re)) {
    const parsed = JSON.parse(body);
    for (const block of Array.isArray(parsed) ? parsed : [parsed]) {
      if (Array.isArray(block['@graph'])) nodes.push(...block['@graph']);
      else nodes.push(block);
    }
  }
  return nodes;
}

/** Top-level @types only. Nested Person, ListItem and Question repeat legitimately. */
function topLevelTypes(html) {
  return jsonLdNodes(html).map((n) => n['@type']);
}

test('every page carries the site identity, and carries it once', () => {
  for (const file of ['index.html', 'about.html', 'shop.html', 'guides/which-freeze-dryer.html']) {
    const types = topLevelTypes(page(file));
    assert.equal(types.filter((t) => t === 'Organization').length, 1, `${file}: one Organization`);
    assert.equal(types.filter((t) => t === 'WebSite').length, 1, `${file}: one WebSite`);
  }
});

test('the Organization publishes a contact route and no unmaintained identities', () => {
  const org = jsonLdNodes(page('index.html')).find((n) => n['@type'] === 'Organization');
  const contact = org.contactPoint[0];
  assert.equal(contact['@type'], 'ContactPoint');
  assert.equal(contact.contactType, 'customer support');
  assert.match(contact.email, /@sublimepantry\.com$/);
  // Empty is the correct value until a profile is real; the property being
  // absent entirely would be a different (and also acceptable) claim, so pin
  // the one we chose.
  assert.deepEqual(org.sameAs, []);
});

test('an article that declares steps and questions emits HowTo and FAQPage', () => {
  // Deliberately a troubleshooting article: at the time of writing it is the
  // only pillar whose content actually declares howTo[] and faq[]. None of the
  // three guides or two comparisons do, so the guide templates emit Article and
  // nothing more. The mechanism is correct; the coverage is a content gap.
  const types = topLevelTypes(page('troubleshooting/vacuum-error.html'));
  for (const expected of ['Organization', 'WebSite', 'BreadcrumbList', 'Article', 'HowTo', 'FAQPage']) {
    assert.ok(types.includes(expected), `expected ${expected}, got ${types.join(', ')}`);
  }
  assert.ok(!types.includes('Recipe'), 'only the recipes pillar is a Recipe');
});

test('an article with no steps and no questions claims neither type', () => {
  // The negative half of the same contract: absent content must produce absent
  // markup, not an empty HowTo or a FAQPage with no questions.
  const types = topLevelTypes(page('guides/complete-batch-workflow.html'));
  assert.ok(types.includes('Article'));
  assert.ok(!types.includes('HowTo'), 'no steps declared, so no HowTo');
  assert.ok(!types.includes('FAQPage'), 'no questions declared, so no FAQPage');
});

test('a comparison adds CollectionPage', () => {
  const types = topLevelTypes(page('compare/home-freeze-dryers.html'));
  assert.ok(types.includes('Article'));
  assert.ok(types.includes('CollectionPage'));
});

test('a static page claims nothing beyond identity and breadcrumbs', () => {
  const types = topLevelTypes(page('editorial-standards.html')).sort();
  assert.deepEqual(types, ['BreadcrumbList', 'Organization', 'WebSite']);
});

test('no page emits the same top-level type twice', () => {
  // The failure this catches: two BreadcrumbLists, because a page rendered
  // Breadcrumbs itself *and* used a layout that renders them.
  for (const file of [
    'index.html',
    'about.html',
    'shop.html',
    'editorial-standards.html',
    'guides/complete-batch-workflow.html',
    'compare/home-freeze-dryers.html',
    'troubleshooting/vacuum-error.html',
  ]) {
    const types = topLevelTypes(page(file));
    const seen = new Set();
    for (const t of types) {
      assert.ok(!seen.has(t), `${file}: ${t} emitted twice`);
      seen.add(t);
    }
  }
});

test('an Article dates itself and names a linked human author', () => {
  const article = jsonLdNodes(page('guides/which-freeze-dryer.html')).find((n) => n['@type'] === 'Article');
  assert.ok(article.headline);
  assert.equal(article.author['@type'], 'Person');
  assert.match(article.author.url, /\/about\/?$/);
  assert.match(article.datePublished, /^\d{4}-\d{2}-\d{2}T/);
  assert.match(article.dateModified, /^\d{4}-\d{2}-\d{2}T/);
  assert.ok(article.publisher['@id'].endsWith('#organization'), 'publisher points at the Organization node');
});

test('the confirmation page is withheld from the index in both places', () => {
  assert.match(page('thanks.html'), /<meta name="robots" content="noindex, follow">/);
  const robots = readFileSync(new URL('robots.txt', DIST), 'utf8');
  assert.match(robots, /^Disallow: \/thanks$/m);
  assert.ok(!readFileSync(new URL('sitemap-0.xml', DIST), 'utf8').includes('/thanks'));
});

test('robots.txt names every answer engine, and allows each one', () => {
  const robots = readFileSync(new URL('robots.txt', DIST), 'utf8');
  for (const agent of [
    'GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-Web',
    'PerplexityBot', 'Google-Extended', 'Bingbot',
  ]) {
    const block = new RegExp(`^User-agent: ${agent}\\nAllow: /$`, 'm');
    assert.match(robots, block, `${agent} must be named and allowed`);
  }
  assert.match(robots, /^Sitemap: https:\/\/www\.sublimepantry\.com\/sitemap-index\.xml$/m);
});

test('llms.txt indexes every published article and nothing that is not built', () => {
  const llms = readFileSync(new URL('llms.txt', DIST), 'utf8');
  assert.match(llms, /^# Sublime Pantry$/m);
  for (const slug of [
    'compare/home-freeze-dryers', 'compare/storage-containers',
    'guides/which-freeze-dryer', 'guides/complete-batch-workflow', 'guides/cottage-economics',
    'tools/batch-log',
  ]) {
    assert.ok(llms.includes(`https://www.sublimepantry.com/${slug})`), `llms.txt must link ${slug}`);
  }
  // /camping is still `pending` in src/lib/nav.ts. Advertising a route the
  // site does not serve is the one way this file can actively mislead.
  assert.ok(!llms.includes('/camping'), 'llms.txt must not link a pending route');
});
