import { writeFileSync, existsSync } from 'node:fs';
import { loadConfig, repoRoot } from './config.mjs';
import { articleExists } from './existing-content.mjs';

/**
 * Converts a validated DraftContent into the exact shape the Astro content
 * collection (src/content.config.ts) expects, and writes exactly one file.
 * Refuses to overwrite an existing article — a slug collision is a bug in
 * research (it was supposed to check existing coverage) and must fail loud,
 * not silently clobber a human-reviewed article.
 */
export function writeArticleFile(draftContent) {
  if (articleExists(draftContent.slug)) {
    throw new Error(`Refusing to write: src/content/articles/${draftContent.slug}.json already exists.`);
  }

  const config = loadConfig();
  const today = new Date().toISOString().slice(0, 10);

  const record = {
    title: draftContent.title,
    description: draftContent.description,
    kicker: draftContent.kicker,
    pillar: draftContent.pillar,
    riskClass: draftContent.riskClass,
    publishedDate: today,
    author: draftContent.author ?? 'Jack Ferrence',
    disclosure: draftContent.disclosure,
    sources: draftContent.sources,
    ...(draftContent.comparisonCriteria ? { comparisonCriteria: draftContent.comparisonCriteria } : {}),
    bodyHtml: draftContent.bodyHtml,
  };

  const outPath = `${repoRoot()}${config.paths.contentCollection}/${draftContent.slug}.json`;
  if (existsSync(outPath)) {
    throw new Error(`Refusing to overwrite existing file: ${outPath}`);
  }
  writeFileSync(outPath, JSON.stringify(record, null, 2) + '\n');
  return outPath;
}
