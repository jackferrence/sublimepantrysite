/**
 * The asset library's constraints, enforced rather than documented.
 *
 * `src/lib/assets.ts` records where each photograph came from and what it may
 * not be used for. A restriction written in a comment is a restriction someone
 * overrides in six months without noticing; these assertions are the reason the
 * manifest is worth keeping.
 *
 * The one that matters most is "no `not-product-imagery` asset reaches a
 * product surface". Those are stock photographs of somebody else's commercial
 * pouches. They may illustrate camping; they may never stand in for Trail line
 * packaging. Removing a label from a photograph does not make the pouch ours,
 * and the difference between illustrating an activity and depicting a product
 * we sell is the difference between an editorial image and a false claim.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ASSETS,
  DERIVATIVE_WIDTHS,
  derivative,
  findAsset,
  findAssets,
  getAsset,
  largest,
  srcSet,
  widthsFor,
} from '../src/lib/assets.ts';
import { CATALOG } from '../src/lib/commerce.ts';

const PUBLIC = 'public';
const RATIO_VALUE = { '16:9': 16 / 9, '4:5': 4 / 5, '1:1': 1 };

test('every asset src resolves to a real directory of derivatives', () => {
  for (const asset of ASSETS) {
    const dir = join(PUBLIC, asset.src);
    assert.ok(existsSync(dir), `${asset.id}: no derivatives at ${asset.src}`);
    assert.ok(readdirSync(dir).length > 0, `${asset.id}: ${asset.src} is empty`);
  }
});

test('every declared ratio has its derivatives on disk', () => {
  for (const asset of ASSETS) {
    for (const ratio of asset.ratios) {
      const widths = widthsFor(asset, ratio);
      assert.ok(widths.length > 0, `${asset.id}: ${ratio} declared but no width fits`);
      for (const width of widths) {
        const file = join(PUBLIC, derivative(asset, ratio, width));
        assert.ok(existsSync(file), `${asset.id}: missing ${derivative(asset, ratio, width)}`);
      }
    }
  }
});

test('no derivative is upscaled past the intrinsic crop', () => {
  for (const asset of ASSETS) {
    for (const ratio of asset.ratios) {
      const cropped = Math.min(
        asset.intrinsic.w,
        Math.round(asset.intrinsic.h * RATIO_VALUE[ratio]),
      );
      for (const width of widthsFor(asset, ratio)) {
        assert.ok(
          width <= cropped,
          `${asset.id}: ${ratio} at ${width}w exceeds the ${cropped}px crop`,
        );
      }
    }
  }
});

test('no derivative exists for a ratio the asset does not declare', () => {
  const wanted = new Set();
  for (const asset of ASSETS) {
    for (const ratio of asset.ratios) {
      for (const width of widthsFor(asset, ratio)) wanted.add(derivative(asset, ratio, width));
    }
  }
  for (const asset of ASSETS) {
    for (const file of readdirSync(join(PUBLIC, asset.src))) {
      assert.ok(
        wanted.has(`${asset.src}/${file}`),
        `${asset.id}: ${file} is on disk but not declared — a stale crop the ` +
          `manifest no longer claims, which findAssets will never return.`,
      );
    }
  }
});

test('every asset that is not ours carries a credit', () => {
  for (const asset of ASSETS.filter((a) => a.source !== 'own')) {
    assert.ok(
      asset.credit && asset.credit.trim().length > 0,
      `${asset.id}: source is "${asset.source}" but no credit is recorded`,
    );
  }
});

test('no not-product-imagery asset is referenced from commerce or a /shop route', () => {
  const restricted = ASSETS.filter((a) => (a.restrictions ?? []).includes('not-product-imagery'));
  assert.ok(restricted.length > 0, 'nothing carries the restriction — this test proves nothing');

  for (const asset of restricted) {
    for (const product of CATALOG) {
      for (const image of product.images) {
        assert.notEqual(image.assetId, asset.id, `${product.sku} names ${asset.id}`);
        assert.ok(!image.src.includes(asset.src), `${product.sku} links ${asset.src}`);
      }
    }
  }

  // Source, not built HTML: a /shop template that hard-codes the path bypasses
  // findAssets entirely, and that is exactly the route around the restriction
  // this test has to close.
  const routes = ['src/pages/shop.astro', ...shopRoutes()];
  for (const route of routes) {
    const source = readFileSync(route, 'utf8');
    for (const asset of restricted) {
      assert.ok(!source.includes(asset.src), `${route} references restricted ${asset.id}`);
      assert.ok(!source.includes(`'${asset.id}'`), `${route} names restricted ${asset.id}`);
    }
  }
});

function shopRoutes() {
  const dir = 'src/pages/shop';
  return existsSync(dir) ? readdirSync(dir).map((f) => join(dir, f)) : [];
}

test('findAssets refuses a restricted asset in a product context', () => {
  const camping = findAssets({ cls: 'camping' });
  assert.ok(camping.length > 0, 'no camping assets to test against');
  assert.deepEqual(findAssets({ cls: 'camping', context: 'product' }), []);
  assert.equal(findAsset({ cls: 'camping', context: 'product' }), null);
});

test('findAssets returns nothing rather than an approximate match', () => {
  // The failure this encodes: an article about machines receiving a photograph
  // of fruit because the slot was open and something had to fill it.
  assert.deepEqual(findAssets({ cls: 'equipment', subject: 'strawberry' }), []);
  assert.equal(findAsset({ cls: 'line-hero' }), null, 'line-hero must stay empty, not borrow');
  assert.equal(getAsset('no-such-asset'), null);
});

test('subject matching narrows and never widens', () => {
  const both = findAssets({ subject: ['freeze-dryer', 'vacuum-pump'] });
  const one = findAssets({ subject: ['freeze-dryer'] });
  assert.ok(both.length < one.length, 'a second subject term must narrow the result');
  assert.ok(both.every((a) => a.subject.includes('vacuum-pump')));
});

test('srcSet and largest agree with what is on disk', () => {
  for (const asset of ASSETS) {
    for (const ratio of asset.ratios) {
      const frame = largest(asset, ratio);
      assert.ok(frame, `${asset.id}: ${ratio} has no largest frame`);
      assert.ok(existsSync(join(PUBLIC, frame.src)));
      assert.equal(frame.h, Math.round(frame.w / RATIO_VALUE[ratio]));
      for (const candidate of srcSet(asset, ratio).split(', ')) {
        const [path] = candidate.split(' ');
        assert.ok(existsSync(join(PUBLIC, path)), `${asset.id}: srcset names missing ${path}`);
      }
    }
    for (const ratio of ['16:9', '4:5', '1:1'].filter((r) => !asset.ratios.includes(r))) {
      assert.equal(srcSet(asset, ratio), '', `${asset.id}: srcset for undeclared ${ratio}`);
      assert.equal(largest(asset, ratio), null, `${asset.id}: largest for undeclared ${ratio}`);
    }
  }
});

test('ids are unique, kebab-case, and match their src', () => {
  const seen = new Set();
  for (const asset of ASSETS) {
    assert.ok(/^[a-z0-9]+(-[a-z0-9.]+)*$/.test(asset.id), `${asset.id} is not kebab-case`);
    assert.ok(!seen.has(asset.id), `duplicate id ${asset.id}`);
    seen.add(asset.id);
    assert.equal(asset.src, `/images/library/${asset.id}`);
  }
});

test('alt text is present, specific, and never claims we tested the machine', () => {
  for (const asset of ASSETS) {
    assert.ok(asset.alt.length > 20, `${asset.id}: alt is too thin to be useful`);
    assert.ok(!/^(image|photo|picture) of/i.test(asset.alt), `${asset.id}: alt restates the medium`);
  }
  // The site states in print that we have bench-tested no machine. Alt on
  // equipment we do not own must not imply otherwise — no "our", and no first
  // person anywhere in the frame description.
  for (const asset of ASSETS.filter((a) => (a.restrictions ?? []).includes('not-our-equipment'))) {
    assert.ok(
      !/\b(our|we|us|my)\b/i.test(asset.alt),
      `${asset.id}: alt implies the machine is ours`,
    );
  }
});

test('every article assetId names a real asset', () => {
  const dir = 'src/content/articles';
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    const { image } = JSON.parse(readFileSync(join(dir, file), 'utf8'));
    if (!image?.assetId) continue;
    const asset = getAsset(image.assetId);
    assert.ok(asset, `${file}: unknown assetId "${image.assetId}"`);
    assert.ok(
      asset.ratios.includes('16:9'),
      `${file}: ${asset.id} has no 16:9 crop, so its hero would silently go dark`,
    );
  }
});

test('usedBy reflects the articles that actually name each asset', () => {
  const dir = 'src/content/articles';
  const expected = new Map();
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
    const { image } = JSON.parse(readFileSync(join(dir, file), 'utf8'));
    if (!image?.assetId) continue;
    const key = `article: ${file.replace(/\.json$/, '')}`;
    expected.set(image.assetId, [...(expected.get(image.assetId) ?? []), key]);
  }
  for (const asset of ASSETS) {
    assert.deepEqual(
      asset.usedBy.filter((u) => u.startsWith('article: ')),
      expected.get(asset.id) ?? [],
      `${asset.id}: usedBy disagrees with article front matter`,
    );
  }
});

test('the derivative width ladder is the one the generator emits', () => {
  assert.deepEqual([...DERIVATIVE_WIDTHS], [400, 800, 1600]);
  const { assets } = JSON.parse(readFileSync('assets/sources.json', 'utf8'));
  const declared = new Map(assets.map((a) => [a.id, a.ratios]));
  assert.equal(declared.size, ASSETS.length, 'sources.json and the manifest disagree on count');
  for (const asset of ASSETS) {
    assert.deepEqual(
      declared.get(asset.id),
      asset.ratios,
      `${asset.id}: sources.json and src/lib/assets.ts declare different ratios`,
    );
  }
});

test('every library image in the built site ships responsive candidates', () => {
  // Seven templates render article heroes into cards. Without candidates the
  // browser takes the `src`, which is the largest crop — a 1600px file into a
  // 350px card. Nothing errors and nothing looks wrong; the page is just slow.
  // `Img.astro` fills the srcset in from the library, and this is the assertion
  // that it actually did.
  const dist = 'dist';
  if (!existsSync(dist)) throw new Error('run `npm run build` before `npm test`');

  const pages = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (entry.name.endsWith('.html')) pages.push(p);
    }
  };
  walk(dist);

  let seen = 0;
  for (const page of pages) {
    for (const tag of readFileSync(page, 'utf8').match(/<img\b[^>]*>/g) ?? []) {
      if (!tag.includes('/images/library/')) continue;
      seen += 1;
      assert.match(tag, /srcset="/, `${page}: library image without candidates — ${tag.slice(0, 120)}`);

      const src = tag.match(/src="([^"]+)"/)[1];
      const asset = ASSETS.find((a) => src.startsWith(`${a.src}/`));
      assert.ok(asset, `${page}: ${src} is under /images/library/ but in no manifest entry`);

      const width = Number(tag.match(/width="(\d+)"/)?.[1] ?? 0);
      const ratio = asset.ratios.find((r) => src.includes(`/${r.replace(':', 'x')}-`));
      assert.ok(ratio, `${page}: ${src} names a ratio ${asset.id} does not declare`);
      assert.ok(
        width <= Math.max(...widthsFor(asset, ratio)),
        `${page}: ${asset.id} rendered at ${width}w, wider than any derivative`,
      );
    }
  }
  assert.ok(seen > 0, 'no library images in the built site — this test proves nothing');
});
