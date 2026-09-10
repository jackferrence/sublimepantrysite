import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const sourceSchema = z.object({
  title: z.string(),
  url: z.string().url(),
  publisher: z.string(),
  tier: z.enum(['primary', 'secondary']),
  accessDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'accessDate must be YYYY-MM-DD'),
});

/**
 * ISO 8601 duration, the only format schema.org accepts for a time property.
 * Days, hours and minutes are enough for a freeze-drying cycle: "PT45M",
 * "PT30H", "P1DT6H".
 */
const durationSchema = z
  .string()
  .regex(/^P(?!$)(?:\d+D)?(?:T(?!$)(?:\d+H)?(?:\d+M)?)?$/, 'must be an ISO 8601 duration, e.g. PT30H');

/**
 * Recipe extras. Every field optional and additive: a recipes-pillar article
 * renders and validates without any of them, and the Recipe JSON-LD claims
 * only what is declared here. Nothing is defaulted — an unstated yield or time
 * is absent from the markup rather than guessed.
 */
const recipeSchema = z.object({
  /** As written for a reader: "About 4 cups, from 6 lb fresh". */
  yield: z.string().optional(),
  prepTime: durationSchema.optional(),
  /** The freeze-dryer run. Maps to schema.org cookTime; see src/lib/schema.ts.
   *  This is "dry time" in docs/CLAUDE-CODE-PROMPT.md T2.1's vocabulary — same
   *  field, kept under its existing name rather than duplicated under a new
   *  one, since it already feeds Recipe JSON-LD. */
  cycleTime: durationSchema.optional(),
  totalTime: durationSchema.optional(),
  ingredients: z.array(z.string()).optional(),
  category: z.string().optional(),
  /** New with the docs/CLAUDE-CODE-PROMPT.md T4.3 recipe SpecSheet. As
   *  written for a reader, e.g. "Cover with warm water, ready in ~12 min". */
  rehydration: z.string().optional(),
  /** As written for a reader, e.g. "Fits one quart (7-mil) bag per batch". */
  bagSize: z.string().optional(),
});

const comparisonCriterionSchema = z.object({
  label: z.string(),
  note: z.string().optional(),
});

/**
 * Guide-only extras from docs/CLAUDE-CODE-PROMPT.md T2.1/T4.2 (VerdictBox,
 * ComparisonTable's testedProducts, HonestyBlock, LimitationsCallout, WhoFor).
 * All optional: an article whose pillar is 'guides' but predates this schema
 * renders and validates exactly as it did before — nothing here is required,
 * and nothing here is guessed if it's missing. A guide adopting these blocks
 * fills them in as it's written or edited, same as sources/faq/howTo already
 * work in this schema.
 */
const verdictSchema = z.object({
  label: z.enum(['Our pick', 'Also good', 'Budget pick']),
  productHandle: z.string(),
  why: z.string(),
});
const testedProductSchema = z.object({
  productHandle: z.string(),
  mil: z.string().optional(),
  capacityCc: z.string().optional(),
  pricePerUnit: z.string().optional(),
  sealType: z.string().optional(),
  foodSafeCert: z.string().optional(),
  note: z.string(),
});
const notTestedSchema = z.object({
  name: z.string(),
  reason: z.string(),
});

const articles = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/content/articles' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    kicker: z.string(),
    pillar: z.enum(['guides', 'troubleshooting', 'compare', 'recipes']),
    section: z.string().optional(),
    riskClass: z.enum(['standard', 'elevated']),
    publishedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    updatedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    /**
     * The date this article's figures were rechecked against their sources.
     *
     * Its own field, and deliberately not derived from anything. It used to be
     * `updatedDate ?? publishedDate`, which conflated two different claims —
     * "we edited this page" and "we rechecked these facts" — and published the
     * second when only the first had happened. /compare/home-freeze-dryers
     * printed "verified Aug 31, 2026" beside a correction dated September 6 and
     * figures dated September 5, and every editorial touch silently re-dated a
     * verification that had not occurred.
     *
     * Unset means unverified, and renders nothing. Set it only where a recheck
     * actually happened.
     */
    verifiedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    author: z.string().default('Jack Ferrence'),
    disclosure: z.string(),
    sources: z.array(sourceSchema).min(1, 'every article must cite at least one dated source'),
    comparisonCriteria: z.array(comparisonCriterionSchema).optional(),
    faq: z.array(z.object({ question: z.string(), answer: z.string() })).optional(),
    howTo: z
      .array(z.object({ name: z.string(), text: z.string() }))
      .optional(),
    /** Hero photograph. Optional: article heroes render nothing until a real
     *  photo exists — never a placeholder standing in for reporting.
     *
     *  Two shapes, and `assetId` is the one to use. It names an entry in
     *  src/lib/assets.ts, which owns the alt text, the credit and the
     *  restrictions; the article stores a pointer and nothing else. The bare
     *  `{ src, alt }` form is the legacy shape, kept only for a slot whose
     *  photograph is not catalogued, and it is how an article came to promise
     *  screen-reader users "a person loading a tray" for a frame with no
     *  person in it — alt drifts when it lives away from the photograph.
     *
     *  Both branches are `.strict()`: Zod strips unknown keys in silence, so
     *  without it a mistyped `assetID` would vanish and the hero would go dark
     *  with no error anywhere. */
    image: z
      .union([
        z.object({ assetId: z.string() }).strict(),
        z.object({ src: z.string(), alt: z.string(), credit: z.string().optional() }).strict(),
      ])
      .optional(),
    /** Hand-picked "keep reading" slugs; falls back to newest in the pillar. */
    related: z.array(z.string()).optional(),
    /** Recipe-pillar extras; see recipeSchema. */
    recipe: recipeSchema.optional(),
    /** Catalog handles this article deliberately references. */
    products: z.array(z.string()).optional(),
    /** VerdictBox entries, in display order. Guides pillar only, in practice. */
    verdicts: z.array(verdictSchema).optional(),
    /** ComparisonTable rows. Guides pillar only, in practice. */
    testedProducts: z.array(testedProductSchema).optional(),
    /** HonestyBlock's "didn't test" column. */
    notTested: z.array(notTestedSchema).optional(),
    /** LimitationsCallout body. Markdown/HTML string, same shape as bodyHtml. */
    limitations: z.string().optional(),
    /** WhoFor's two lists. */
    whoFor: z.array(z.string()).optional(),
    whoNotFor: z.array(z.string()).optional(),
    /** Shown next to "Updated" per T4.2. Distinct from verifiedDate above,
     *  which is about facts/figures generally; this is specifically "when did
     *  someone last run the tests/checks a verdict on this page depends on". */
    lastTested: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    bodyHtml: z.string(),
  }).refine(
    (data) => data.pillar !== 'compare' || (data.comparisonCriteria && data.comparisonCriteria.length > 0),
    { message: 'compare pillar articles must declare comparisonCriteria', path: ['comparisonCriteria'] },
  ),
});

export const collections = { articles };
