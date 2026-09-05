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
