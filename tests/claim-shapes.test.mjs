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

  let body = html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ');

  // 1b. The source register, as its own surface.
  //
  //     Every statement in it is somebody else's published title, publisher and
  //     access date. "How to Package Freeze-dried Food So It Keeps For 25 Years"
  //     is Harvest Right's title for their own page; quoting it accurately is
  //     the entire point of a citation, and SHELF LIFE reading it as our promise
  //     inverts what the register is for.
  //
  //     It is tagged rather than dropped. Deleting a region would leave a piece
  //     of every page that no shape could ever see — which is the failure this
  //     extractor exists to prevent — so the text is still extracted, still
  //     addressable, and merely skipped by `sweep` unless a shape asks for it.
  for (const block of body.matchAll(/<section class="sources"[\s\S]*?<\/section>/g)) {
    const region = block[0];
    for (const item of region.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)) {
      push('sources', item[1].replace(/<[^>]+>/g, ' '));
    }
    for (const sentence of tidy(region.replace(/<[^>]+>/g, ' ')).split(/(?<=[.!?])\s+/)) {
      push('sources', sentence);
    }
  }
  body = body.replace(/<section class="sources"[\s\S]*?<\/section>/g, ' ');

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

  // 4. List items, whole. Same reasoning as a table cell, and found the same
  //    way: the THICKNESS shape below went green because `<li>` text fell into
  //    the prose bucket, where the splitter joins on sentence ends and a list
  //    of short items has none. "100 heavy-duty 7 mil Mylar bags" was scored
  //    together with three later items, one of which said "seal" — so the
  //    mechanism the shape requires was satisfied by a different sentence about
  //    a different thing. A bullet is a statement with no sentence around it.
  for (const item of body.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)) {
    push('list-item', item[1].replace(/<[^>]+>/g, ' '));
  }

  // 5. SVG <title> and <desc>, whole — a diagram's text equivalent.
  for (const el of body.matchAll(/<(title|desc)\b[^>]*>([\s\S]*?)<\/\1>/g)) {
    push(el[1] === 'title' ? 'title' : 'desc', el[2].replace(/<[^>]+>/g, ' '));
  }

  // 6. Everything else that renders, sentence by sentence — including SVG
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
function sweep({ shape, allow, label, includeSources = false }) {
  const offenders = [];
  for (const { file, surfaces: found } of pages()) {
    for (const { where, statement } of found) {
      // Attribution by construction: a source register entry is a quotation of
      // someone else's title. A shape that genuinely wants to read it — one
      // checking that we cite what we say we cite, say — opts in.
      if (where === 'sources' && !includeSources) continue;
      if (!shape.test(statement)) continue;
      shape.lastIndex = 0;
      if (allow(statement, where)) continue;
      offenders.push(`${file} [${where}] ${label}: "${statement.slice(0, 160)}"`);
    }
  }
  return [...new Set(offenders)];
}

/* ------------------------------------------------------------------ */

/**
 * A statement carrying a bracketed citation marker is quoting a source.
 *
 * Used by two shapes, so it is written once. "from $4,595 — sold out on
 * 2026-09-05 [18]" is a sourced fact about a manufacturer's own listing: the
 * stocking claim is theirs, and so is the price. Without this, a comparison
 * article citing a third-party price that happens to equal one of ours reads as
 * an undisclosed offer, and a machine that a publisher lists as sold out reads
 * as a claim about our shelf.
 *
 * It is deliberately narrow. It licenses the *presence of a source*, not the
 * wording — a sentence with a citation still has to survive every other shape.
 */
const ATTRIBUTED = (statement) => /\[\d+\]/.test(statement);

/**
 * Claiming a product will be, or has been, stocked again.
 *
 * `restock` is qualified because "restocking fee" is a returns-policy term and
 * has nothing to do with whether a product is coming back. It fired on
 * /shipping-returns, which is the shape being wrong rather than the copy.
 */
const STOCK_SHAPE =
  /\bsold\s*out\b|\bback\s+in\s+stock\b|\brestock(?:ing|ed|s)?\b(?!\s+fees?\b)|\bin\s+stock\s+soon\b|\bcoming\s+back\b|\bwhen\s+it\s+returns\b/i;

/* ------------------------------------------------------------------ */

/**
 * Both narrowings are asserted in both directions.
 *
 * A shape that has been loosened to stop a false positive is only worth having
 * if it still fires on the thing it was written for, and the loosening is
 * exactly the edit nobody re-checks. These fail if `restock` stops matching a
 * real restocking promise, or if the citation allowance grows into "any price
 * near a number".
 */
test('the narrowed rules still fire on what they were written for', () => {
  // STOCK: the returns-policy sense is out, the stocking promise is not.
  assert.ok(!STOCK_SHAPE.test('A 15% restocking fee applies to opened items.'));
  assert.ok(!STOCK_SHAPE.test('Restocking fees are deducted from the refund.'));
  assert.ok(STOCK_SHAPE.test('We restock this every spring.'));
  assert.ok(STOCK_SHAPE.test('It will be restocked in October.'));
  assert.ok(STOCK_SHAPE.test('Sold out.'));
  assert.ok(STOCK_SHAPE.test('Back in stock soon.'));

  // OWNERSHIP: a citation attributes a figure; a bare price does not.
  assert.ok(ATTRIBUTED('Harvest Right lists the medium at $2,995 [18].'));
  assert.ok(!ATTRIBUTED('Harvest Right lists the medium at $2,995.'));
  assert.ok(!ATTRIBUTED('$14.99 USD'));
  assert.ok(!ATTRIBUTED('Priced at $14.99 in 2026'), 'a bare year is not a citation');
});

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

test('THICKNESS: a mil figure is never a benefit on its own', () => {
  // The launch catalog is 4.3 mil and the starter kit is 7 mil, so "thicker"
  // is now a comparison the site can make about its own shelf — which is
  // exactly when it starts being written as a virtue. Film thickness does not
  // by itself say how a bag performs: the foil ply is what blocks light and
  // slows oxygen transfer, and the seal decides whether either matters. A mil
  // figure may be stated as a fact, and it may be called better *if the
  // sentence says what the difference does*. It may not stand in for that.
  const thickness = /\b\d+(?:\.\d+)?\s*-?\s*mil\b/i;
  const asBenefit =
    /\b(?:thicker|heavier|heavy-?duty|stronger|tougher|sturdier|more durable|better|superior|premium|robust|best)\b/i;
  // The mechanism: what the extra film actually does.
  const mechanism =
    /\bbarrier|puncture|pinhole|tear|abrasion|handling|foil|ply|laminate|light|oxygen|transmission|seal|weld|opaque/i;
  assert.deepEqual(
    sweep({
      shape: thickness,
      label: 'thickness stated as a benefit with no mechanism',
      allow: (s) => !asBenefit.test(s) || mechanism.test(s),
    }),
    [],
  );
});

test('STOCK: nothing is "sold out" or coming "back in stock"', () => {
  // The quart line is listed at zero inventory and has never been stocked, so
  // "sold out" describes a run that did not happen and "back in stock" promises
  // a return to a state that never existed. Both are ordinary shop words, which
  // is why they need a shape rather than a memo — zero inventory does the work
  // and the copy says only what is true.
  //
  // "Out of stock" is deliberately not here: for a product we do stock, it is a
  // true statement of a present state, and banning it would push the copy
  // towards something vaguer rather than something more honest.
  assert.deepEqual(
    sweep({
      shape: STOCK_SHAPE,
      label: 'asserts a stocking history the product does not have',
      // A bracketed citation marker is attribution: "from $4,595 — sold out on
      // 2026-09-05 [18]" is a sourced fact about a manufacturer's own listing,
      // not a claim about what we have stocked. The shape has to allow the
      // attributed form or it fails on exactly the sentences worth publishing.
      allow: (s) =>
        /\bnever\b|\bnot\b|An earlier version|has been removed/i.test(s) || /\[\d+\]/.test(s),
    }),
    [],
  );
});

test('OWNERSHIP: any page showing our product price discloses that we sell it', () => {
  const commerce = readFileSync(join(root, 'src/lib/commerce.ts'), 'utf8');
  const label = commerce.match(/OWNERSHIP_LABEL = '([^']+)'/)[1];
  // Every price, not the first one. This read `match(...)` — one price — for as
  // long as the catalog had one product in it, and would have gone on passing
  // while eight new prices published with no disclosure beside any of them. A
  // rule that only covers the first row of a list is not a rule about the list.
  const prices = [...commerce.matchAll(/displayPrice: '([^']+)'/g)].map((m) => m[1].split(' ')[0]);
  assert.ok(prices.length >= 2, 'the price sweep is reading fewer prices than the catalog has');
  const missing = [];
  for (const { file, surfaces: f } of pages()) {
    // The disclosure is a page-level fact: if it is anywhere on the page, the
    // price on that page is disclosed. Only the *price* is judged per
    // statement, because that is where attribution lives.
    if (f.some((x) => x.statement.includes(label))) continue;
    for (const { where, statement } of f) {
      for (const price of prices) {
        if (!statement.includes(price)) continue;
        if (ATTRIBUTED(statement)) continue;
        missing.push(`${file} [${where}]: ${price}`);
      }
    }
  }
  assert.deepEqual([...new Set(missing)], [], `pages show a price without "${label}"`);
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
      <ul><li>100 heavy-duty 7 mil Mylar bags</li><li>A heat sealer</li></ul>
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
  // Whole, and separately: scored together, the second item's "sealer" would
  // answer for the first item's thickness claim.
  assert.ok(
    found.some((x) => x.where === 'list-item' && x.statement === '100 heavy-duty 7 mil Mylar bags'),
    'list item not reached as a statement of its own',
  );
  assert.ok(has('desc', 'decades-class shelf life'), 'SVG desc not reached');
  assert.ok(has('title', 'Storage comparison'), 'SVG title not reached');
  assert.ok(has('prose', 'longest — decades-class, sealed'), 'SVG text label not reached');
  assert.ok(has('prose', 'An ordinary sentence.'), 'prose not split into sentences');
});

test('the source register is extracted, and is not swept as our voice', () => {
  // A real citation whose own title carries a shelf-life duration.
  const sample = `
    <html><body>
      <p>Our own sentence about storage.</p>
      <section class="sources" aria-labelledby="sources-heading"><h2>Sources</h2><ol>
        <li><a href="https://example.com/x">How to Package Freeze-dried Food So It Keeps For 25 Years</a>
            — Harvest Right, accessed 2026-08-31</li>
      </ol></section>
    </body></html>`;
  const found = surfaces(sample);

  // Still reached. Dropping the region outright would leave part of every
  // article that no shape could ever look at.
  assert.ok(
    found.some((x) => x.where === 'sources' && x.statement.includes('Keeps For 25 Years')),
    'the source register is no longer extracted at all',
  );
  // And attributed to nothing else: the title must not also arrive as prose,
  // or the shapes would read it as ours by another route.
  assert.ok(
    !found.some((x) => x.where !== 'sources' && x.statement.includes('Keeps For 25 Years')),
    'a source title is leaking into a swept surface',
  );
  // The page's own sentence is untouched by the carve-out.
  assert.ok(found.some((x) => x.where === 'prose' && x.statement.includes('Our own sentence')));
});
