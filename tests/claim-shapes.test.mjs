/**
 * Claim shapes — one extractor, five shapes, every surface.
 *
 * The rule: any claim class that appears in more than one place gets a shape
 * assertion and renders from one constant. Fixed-string sweeps are a second
 * pass, never the first.
 *
 * That rule was right and the implementation was wrong, in a way that took
 * seven escapes to see. Every shape read `pages()`, which stripped scripts and
 * tags and handed back visible prose. So every shape could only ever find a
 * claim a reader would see — and claims do not live only there:
 *
 *   the ≤0.25 aw target        an SVG <text> label, lowercase
 *   "decades-class shelf life"  an SVG <desc>
 *   "Free, US only"             a two-word table cell, not a sentence
 *   the old product name        an <img alt>
 *   "storage that lasts"        the site-wide <meta name="description">
 *   "warranty should cover"     howTo[n].text, inside JSON-LD
 *   "the community fix …"       the same, in a second article
 *
 * Enumerating those seven and adding seven checks would leave the eighth. The
 * pattern is not "sometimes claims are in alt text". The pattern is that a
 * claim can be anywhere a string is shipped, and prose is simply the surface we
 * happen to look at.
 *
 * So this file inverts the default. `surfaces()` takes everything a page ships
 * and subtracts only markup structure: text nodes, human-readable attributes,
 * and every string leaf of every JSON-LD block, recursively. A shape that
 * cannot find a claim in alt text is now a bug in the shape, not a gap in the
 * scan — and a new hiding place has to be actively excluded rather than
 * passively missed.
 *
 * A statement is what a shape judges. For prose that is a sentence, because
 * attribution and negation live in the surrounding words. For an attribute, a
 * JSON string or a table cell it is the whole value, because "Free, US only"
 * has no sentence around it and waiting for one is how it survived a phase.
 *
 * CI builds before it tests. Locally, run `npm run build` first.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, globSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');

/** Attributes whose values a person reads or a machine quotes. */
const READABLE_ATTRS = ['alt', 'aria-label', 'title', 'placeholder', 'content', 'aria-description'];

const tidy = (s) =>
  s
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;|&#34;/g, '"')
    .replace(/&#39;|&rsquo;|&apos;/g, "'")
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&rarr;/g, '→')
    .replace(/&hellip;/g, '…')
    .replace(/\s+/g, ' ')
    .trim();

/** Every string leaf of a parsed JSON-LD graph, however deep. */
function jsonStrings(value, out = []) {
  if (typeof value === 'string') {
    // URLs and type names are identifiers, not claims.
    if (!/^(https?:|\/|#|@)/.test(value) && value.length > 1) out.push(value);
  } else if (Array.isArray(value)) {
    for (const v of value) jsonStrings(v, out);
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      if (k === '@type' || k === '@context' || k === '@id') continue;
      jsonStrings(v, out);
    }
  }
  return out;
}

/**
 * Everything one built page says, as statements a shape can judge.
 *
 * Each entry is `{ where, statement }`. `where` names the surface so a failure
 * tells you which of the seven you are standing in.
 */
function surfaces(html) {
  const out = [];
  const push = (where, s) => {
    const t = tidy(s);
    if (t) out.push({ where, statement: t });
  };

  // 1. JSON-LD, before it is stripped as a script. FAQ answers, howTo steps,
  //    product descriptions, breadcrumb names.
  for (const m of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    try {
      for (const s of jsonStrings(JSON.parse(m[1]))) push('json-ld', s);
    } catch {
      /* a malformed block is check-links' problem, not this file's */
    }
  }

  const body = html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ');

  // 2. Readable attribute values — alt, aria-label, title, placeholder, and
  //    <meta content>, which is where the site-wide description lives.
  for (const tag of body.matchAll(/<[a-zA-Z][^>]*>/g)) {
    for (const attr of READABLE_ATTRS) {
      const v = tag[0].match(new RegExp(`\\b${attr}="([^"]*)"`));
      if (v) push(attr === 'content' ? 'meta' : attr, v[1]);
    }
  }

  // 3. Table cells, whole. A two-word cell is a statement with no sentence
  //    around it, and judging it by sentence is how one survived a phase.
  for (const cell of body.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/g)) {
    push('table-cell', cell[1].replace(/<[^>]+>/g, ' '));
  }

  // 4. SVG <title> and <desc>, whole — a diagram's text equivalent.
  for (const el of body.matchAll(/<(title|desc)\b[^>]*>([\s\S]*?)<\/\1>/g)) {
    push(el[1] === 'title' ? 'title' : 'desc', el[2].replace(/<[^>]+>/g, ' '));
  }

  // 5. Everything else that renders, sentence by sentence — including SVG
  //    <text> labels, which are text nodes like any other.
  const prose = tidy(body.replace(/<[^>]+>/g, ' '));
  for (const sentence of prose.split(/(?<=[.!?])\s+/)) push('prose', sentence);

  return out;
}

const pages = () =>
  globSync('**/*.html', { cwd: dist }).map((file) => ({
    file,
    surfaces: surfaces(readFileSync(join(dist, file), 'utf8')),
  }));

/**
 * Run one shape across every surface of every page.
 *
 * `allow` decides whether a matching statement is acceptable. It receives the
 * statement and its surface, because what makes a claim safe differs by
 * surface: prose can attribute or deny in the same sentence, while a table cell
 * or an alt attribute has nowhere to put the qualification and therefore must
 * not carry the claim at all.
 */
function sweep({ shape, allow, label }) {
  const offenders = [];
  for (const { file, surfaces: found } of pages()) {
    for (const { where, statement } of found) {
      if (!shape.test(statement)) continue;
      shape.lastIndex = 0;
      if (allow(statement, where)) continue;
      offenders.push(`${file} [${where}] ${label}: "${statement.slice(0, 160)}"`);
    }
  }
  return [...new Set(offenders)];
}

/* ------------------------------------------------------------------ */

test('SHIPPING: free shipping is never claimed without its condition', () => {
  // Three tenses and two noun phrases, because it has been written in all of
  // them: "Ships free · US only", "shipped free while we validate fulfillment",
  // "with shipping included", "Free, US only".
  const shape =
    /\bfree\s+(?:US\s+)?shipping\b|\bships?\s+free\b|\bshipp(?:ed|ing)\s+free\b|\bshipping\s+included\b|\bincludes?\s+shipping\b|\bfree,?\s+U\.?S\.?[- ]only\b/i;
  const qualified = /\$45|45 or more|over \$?45|threshold|shipping-returns|clears the/i;
  // Naming the subject is not asserting the terms: "what free shipping covers"
  // is a description of a policy page, not a promise about an order.
  const descriptive = /\b(?:what|how|whether|which)\b[^.]*\b(?:free\s+(?:US\s+)?shipping|ships?\s+free)\b/i;
  assert.deepEqual(
    sweep({
      shape,
      label: 'unqualified free-shipping claim',
      // A cell or an attribute has nowhere to put the condition, so it must
      // carry it inline or not make the claim.
      allow: (s) => qualified.test(s) || descriptive.test(s),
    }),
    [],
  );
});

test('SHELF LIFE: no storage duration is promised in our own voice', () => {
  // Three forms. With a verb and a duration: "stays crisp for decades". As a
  // bare label: "a 25-year pantry shelf", "decades-class shelf life". And with
  // neither — "storage that lasts", which was in the site-wide meta
  // description, promising durability with no number to check it against. The
  // last one is the hardest to see and the easiest to write.
  const durability = /\b(?:storage|packaging|bags?|containers?|food)\s+that\s+(?:actually\s+)?(?:lasts?|keeps?|survives?|holds? up)\b/i;
  const shape =
    /(?:stays?|keeps?|lasts?|good|crisp|fresh)\s+(?:for\s+)?(?:decades|\d+\s*years|a lifetime|forever)|\b\d{1,3}[- ]year\b|\bdecades?[- ](?:class|scale|long)\b|\blifetime\b/i;
  const storage = /shelf|storage|pantry|store[ds]?\b|keeps?\b|last/i;
  const allowed =
    /no verification|supposedly|claims?|attributed|commercially|manufacturer|Iowa State|Minnesota|\bnot\b|\bnever\b|\bpoor\b|unsuitable|warrant|re-?check|reusable|An earlier version|has been removed/i;
  assert.deepEqual(
    sweep({
      shape,
      label: 'shelf-life promise',
      allow: (s) => !storage.test(s) || allowed.test(s),
    }),
    [],
  );
  // A durability promise needs no duration to be a promise, and having no
  // duration is what makes it uncheckable.
  assert.deepEqual(
    sweep({
      shape: durability,
      label: 'durability promise with nothing to check it against',
      allow: (s) => allowed.test(s),
    }),
    [],
  );
});

test('TESTING: the site never claims hands-on testing', () => {
  const shape = /\bwe\b(?:\s+\w+){0,3}\s+(?:bench-?)?tested\b|\bour (?:own )?(?:tests?|measurements)\b/i;
  assert.deepEqual(
    sweep({
      shape,
      label: 'claims hands-on testing',
      allow: (s) => /\bnot\b|\bnever\b|\bhave not\b|\bif we\b|\bwould\b/i.test(s),
    }),
    [],
  );
});

test('FREQUENCY: no claim about how often something happens', () => {
  // M12's family, and §8.12's. Every instance so far has been invented: "the
  // most common cause", "nine times out of ten", "in order of likelihood",
  // "catches almost everything".
  const shape =
    /\b(?:most common|nine times out of ten|almost everything|in order of likelihood|usually the cause|most (?:vacuum errors|batches|failures))\b/i;
  assert.deepEqual(
    sweep({
      shape,
      label: 'unmeasured frequency claim',
      allow: (s) => /nobody publishes|An earlier version|has been removed|\bnot\b/i.test(s),
    }),
    [],
  );
});

test('PRODUCT NAME: the site calls the product one thing, and it is the catalog name', () => {
  // A product name is a claim about what the customer receives, and it has now
  // drifted twice in two days — once when the site and Shopify disagreed, once
  // when Shopify renamed the product hours after they were reconciled. It
  // appears on the H1, the cards, the breadcrumb, the buy box, two JSON-LD
  // blocks and the photograph's alt text, and the alt text is the surface that
  // escaped the first time.
  //
  // This asserts internal consistency across every surface. That the catalog
  // name is *Shopify's* name is asserted separately, against a hard-coded
  // string, in tests/homepage-and-shop.test.mjs — a shape cannot check that,
  // because both sides of the comparison would come from the same file.
  const commerce = readFileSync(join(root, 'src/lib/commerce.ts'), 'utf8');
  const title = commerce.match(/^\s*title: '(.+)',$/m)[1];
  const shortTitle = commerce.match(/^\s*shortTitle: '(.+)',$/m)[1];
  assert.ok(title.startsWith(shortTitle), 'the short name is not a shortening of the full one');

  // Anchor on the phrase and read backwards: every occurrence of "Starter Kit"
  // must be the tail of an approved name. Matching forwards from a capital
  // letter swallows whatever precedes it — "Sublime Pantry Freeze-Drying
  // Packaging Starter Kit" in alt text, a breadcrumb trail in prose — and
  // reports a correct name as a wrong one.
  const allowed = [shortTitle, title.split(' — ')[0]];
  const offenders = [];
  for (const { file, surfaces: found } of pages()) {
    for (const { where, statement } of found) {
      for (const m of statement.matchAll(/Starter Kit\b/g)) {
        const upTo = statement.slice(0, m.index + m[0].length);
        if (allowed.some((name) => upTo.endsWith(name))) continue;
        offenders.push(
          `${file} [${where}] a third name for the kit: "…${upTo.slice(-60)}"`,
        );
      }
    }
  }
  assert.deepEqual([...new Set(offenders)], [], 'the site calls the product something the catalog does not');
});

test('OWNERSHIP: any page showing our product price discloses that we sell it', () => {
  const commerce = readFileSync(join(root, 'src/lib/commerce.ts'), 'utf8');
  const label = commerce.match(/OWNERSHIP_LABEL = '([^']+)'/)[1];
  const price = commerce.match(/displayPrice: '([^']+)'/)[1].split(' ')[0];
  const missing = pages()
    .filter(({ surfaces: f }) => {
      const all = f.map((x) => x.statement).join(' ');
      return all.includes(price) && !all.includes(label);
    })
    .map((p) => p.file);
  assert.deepEqual(missing, [], `pages show ${price} without "${label}"`);
});

test('PRICE and SHIPPING TERMS are written in exactly one source file', () => {
  const stripComments = (src) =>
    src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/.*$/gm, '$1');

  const offenders = [];
  for (const file of globSync('src/**/*.{astro,ts}', { cwd: root })) {
    if (file === 'src/lib/commerce.ts') continue;
    const src = stripComments(readFileSync(join(root, file), 'utf8'));
    if (/\$\d+\.\d{2}/.test(src)) offenders.push(`${file}: a price`);
    src.split('\n').forEach((line, i) => {
      const scope = /\bU\.?S\.?[- ]only\b/i.test(line);
      const paid = /\b(free\s+(?:US\s+)?shipping|ships?\s+free)\b/i.test(line) && /\$\d/.test(line);
      if ((scope || paid) && !line.includes('SHIPPING.')) offenders.push(`${file}:${i + 1}: a shipping term`);
    });
  }
  assert.deepEqual(offenders, [], 'a price or a shipping term is written outside src/lib/commerce.ts');
});

/**
 * The extractor is the load-bearing part, so it is tested directly. Each of
 * these is a real escape, in the surface it actually hid in. If a future
 * refactor narrows `surfaces()` back to prose, this fails before the shapes do
 * — which matters, because the shapes would go green and mean nothing.
 */
test('the extractor reaches every surface a claim has hidden in', () => {
  const sample = `
    <html><head>
      <meta name="description" content="storage that lasts, and the economics">
      <script type="application/ld+json">{"@type":"HowTo","step":[{"@type":"HowToStep","text":"warranty should cover it"}]}</script>
    </head><body>
      <img src="a.jpg" alt="the Sublime Pantry freeze-drying packaging starter kit">
      <table><tr><td>Shipping</td><td>Free, US only</td></tr></table>
      <figure><svg><title>Storage comparison</title><desc>decades-class shelf life</desc>
        <text>longest — decades-class, sealed</text></svg></figure>
      <p>An ordinary sentence. A second one.</p>
    </body></html>`;
  const found = surfaces(sample);
  const has = (where, needle) =>
    found.some((s) => s.where === where && s.statement.includes(needle));

  assert.ok(has('meta', 'storage that lasts'), 'meta description not reached');
  assert.ok(has('json-ld', 'warranty should cover'), 'JSON-LD string not reached');
  assert.ok(has('alt', 'packaging starter kit'), 'alt text not reached');
  assert.ok(has('table-cell', 'Free, US only'), 'table cell not reached as a whole');
  assert.ok(has('desc', 'decades-class shelf life'), 'SVG desc not reached');
  assert.ok(has('title', 'Storage comparison'), 'SVG title not reached');
  assert.ok(has('prose', 'longest — decades-class, sealed'), 'SVG text label not reached');
  assert.ok(has('prose', 'An ordinary sentence.'), 'prose not split into sentences');
});
