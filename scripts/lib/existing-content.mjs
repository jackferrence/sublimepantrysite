import { readFileSync, readdirSync } from 'node:fs';
import { loadConfig, repoRoot } from './config.mjs';

/** Returns [{ slug, pillar, title }] for every article already in the content collection. */
export function listExistingArticles() {
  const config = loadConfig();
  const dir = `${repoRoot()}${config.paths.contentCollection}`;
  const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
  return files.map((f) => {
    const data = JSON.parse(readFileSync(`${dir}/${f}`, 'utf8'));
    return { slug: f.replace(/\.json$/, ''), pillar: data.pillar, title: data.title };
  });
}

export function articleExists(slug) {
  return listExistingArticles().some((a) => a.slug === slug);
}
