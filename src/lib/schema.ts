/**
 * Structured-data builders.
 *
 * Kept out of the layouts so they can be unit-tested against real output
 * rather than eyeballed in a rendered page, and so the rule below lives in one
 * place instead of being re-decided at every call site.
 *
 * THE RULE: a builder emits a property only when the content declares it.
 * Never a default, never a placeholder, never a computed guess. Structured data
 * is a machine-readable claim about the page, and a Recipe that advertises a
 * cook time or a yield the article never states is an invented fact — the same
 * offence as writing it in the body, but harder to notice.
 */

/** The subset of an article's frontmatter these builders read. */
export interface RecipeSource {
  title: string;
  description: string;
  author: string;
  howTo?: { name: string; text: string }[];
  image?: { src: string; alt: string };
  recipe?: {
    yield?: string;
    prepTime?: string;
    cycleTime?: string;
    totalTime?: string;
    ingredients?: string[];
    category?: string;
  };
}

export interface RecipeContext {
  /** Absolute site origin, no trailing slash. */
  site: string;
  /** Absolute canonical URL of the article. */
  pageUrl: string;
  /** Publication date as an ISO 8601 timestamp. */
  publishedIso: string;
}

/**
 * Recipe JSON-LD for a recipes-pillar article.
 *
 * `cycleTime` maps to `cookTime` deliberately: on a freeze-drying recipe the
 * machine run is the cooking step, and it is the number a reader is actually
 * planning around. It is named `cycleTime` in the content because calling a
 * 30-hour freeze-dryer run a "cook time" in the CMS invites someone to fill it
 * in with an oven figure.
 *
 * Returns `null` when there is nothing beyond the article's own metadata to
 * say — a Recipe with no steps, no ingredients and no times is a type
 * annotation, not structured data, and claiming the type without the substance
 * is what earns a structured-data penalty.
 */
export function recipeJsonLd(source: RecipeSource, ctx: RecipeContext): Record<string, unknown> | null {
  const r = source.recipe ?? {};
  const steps = source.howTo ?? [];

  const hasSubstance =
    steps.length > 0 ||
    (r.ingredients?.length ?? 0) > 0 ||
    Boolean(r.yield || r.prepTime || r.cycleTime || r.totalTime);
  if (!hasSubstance) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: source.title,
    description: source.description,
    author: { '@type': 'Person', name: source.author, url: `${ctx.site}/about/` },
    datePublished: ctx.publishedIso,
    mainEntityOfPage: ctx.pageUrl,
    ...(source.image ? { image: [new URL(source.image.src, ctx.site).href] } : {}),
    ...(r.category ? { recipeCategory: r.category } : {}),
    ...(r.yield ? { recipeYield: r.yield } : {}),
    ...(r.prepTime ? { prepTime: r.prepTime } : {}),
    ...(r.cycleTime ? { cookTime: r.cycleTime } : {}),
    ...(r.totalTime ? { totalTime: r.totalTime } : {}),
    ...(r.ingredients?.length ? { recipeIngredient: r.ingredients } : {}),
    ...(steps.length
      ? { recipeInstructions: steps.map((s) => ({ '@type': 'HowToStep', name: s.name, text: s.text })) }
      : {}),
  };
}
