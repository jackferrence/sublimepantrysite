import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const sourceSchema = z.object({
  title: z.string(),
  url: z.string().url(),
  publisher: z.string(),
  tier: z.enum(['primary', 'secondary']),
  accessDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'accessDate must be YYYY-MM-DD'),
});

const comparisonCriterionSchema = z.object({
  label: z.string(),
  note: z.string().optional(),
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
    author: z.string().default('Jack Ferrence'),
    disclosure: z.string(),
    sources: z.array(sourceSchema).min(1, 'every article must cite at least one dated source'),
    comparisonCriteria: z.array(comparisonCriterionSchema).optional(),
    faq: z.array(z.object({ question: z.string(), answer: z.string() })).optional(),
    howTo: z
      .array(z.object({ name: z.string(), text: z.string() }))
      .optional(),
    /** Hero photograph. Optional: article heroes render nothing until a real
     *  photo exists — never a placeholder standing in for reporting. */
    image: z.object({ src: z.string(), alt: z.string(), credit: z.string().optional() }).optional(),
    /** Hand-picked "keep reading" slugs; falls back to newest in the pillar. */
    related: z.array(z.string()).optional(),
    /** Catalog handles this article deliberately references. */
    products: z.array(z.string()).optional(),
    bodyHtml: z.string(),
  }).refine(
    (data) => data.pillar !== 'compare' || (data.comparisonCriteria && data.comparisonCriteria.length > 0),
    { message: 'compare pillar articles must declare comparisonCriteria', path: ['comparisonCriteria'] },
  ),
});

export const collections = { articles };
