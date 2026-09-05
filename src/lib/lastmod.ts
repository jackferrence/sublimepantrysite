/**
 * `lastmod` for the sitemap.
 *
 * Two different questions, answered two different ways.
 *
 * For an article, the content is the authority: `updatedDate ?? publishedDate`
 * is the date a human decided the page's claims still hold. That is exactly
 * what a comparison page's ninety-day re-check promise is about, and it is the
 * date a crawler needs in order to notice the promise was kept.
 *
 * For a static page there is no such field, so the last commit that touched its
 * source file is the closest honest answer.
 *
 * When neither is available — git is missing, the clone is too shallow to reach
 * the file's last commit, or the page has never been committed — this emits no
 * `lastmod` at all. An absent date costs a little crawl efficiency. A wrong one
 * (today's date on every page, every build) teaches a crawler that our dates
 * mean nothing, which is the thing we are trying to buy here.
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export interface LastmodSources {
  /** Pathname (no trailing slash, no extension) -> YYYY-MM-DD, from content. */
  articles: Map<string, string>;
  /** Repo-relative source path -> ISO timestamp, from git. */
  git: Map<string, string>;
}

/** Strip the origin, the trailing slash and any `.html` off a sitemap URL. */
export function toPathname(url: string): string {
  let path: string;
  try {
    path = new URL(url).pathname;
  } catch {
    path = url;
  }
  path = path.replace(/\.html$/, '').replace(/\/index$/, '/');
  if (path.length > 1) path = path.replace(/\/$/, '');
  return path || '/';
}

/**
 * Read the article collection straight off disk.
 *
 * The Astro config runs before the content layer exists, so this parses the
 * JSON rather than calling `getCollection`. The two fields it reads are the two
 * the schema already guarantees.
 */
export function readArticleDates(base = 'src/content/articles'): Map<string, string> {
  const out = new Map<string, string>();
  if (!existsSync(base)) return out;
  for (const file of readdirSync(base)) {
    if (!file.endsWith('.json')) continue;
    try {
      const data = JSON.parse(readFileSync(join(base, file), 'utf8'));
      if (!data.pillar || !data.publishedDate) continue;
      const slug = file.replace(/\.json$/, '');
      out.set(`/${data.pillar}/${slug}`, data.updatedDate ?? data.publishedDate);
    } catch {
      // A malformed article is the content schema's problem to report, loudly,
      // during `astro check`. It is not this function's job to fail the build.
    }
  }
  return out;
}

/**
 * Last commit date per file, from one `git log` pass rather than one call per
 * page. Returns an empty map — never throws — when git is unavailable.
 */
export function readGitDates(): Map<string, string> {
  const out = new Map<string, string>();
  let log: string;
  try {
    log = execFileSync('git', ['log', '--pretty=format:%x00%cI', '--name-only', '--no-renames'], {
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return out;
  }

  // History is newest-first, so the first date a path is seen under is its last
  // modification; later sightings are older commits and are ignored.
  let current = '';
  for (const line of log.split('\n')) {
    if (line.startsWith('\0')) {
      current = line.slice(1).trim();
      continue;
    }
    const file = line.trim();
    if (!file || !current || out.has(file)) continue;
    out.set(file, current);
  }
  return out;
}

/**
 * Candidate source files for a static route, in the order Astro would resolve
 * them. `/about` is `src/pages/about.astro` before `src/pages/about/index.astro`.
 */
export function pageSourceCandidates(pathname: string): string[] {
  if (pathname === '/') return ['src/pages/index.astro'];
  const rel = pathname.replace(/^\//, '');
  return [
    `src/pages/${rel}.astro`,
    `src/pages/${rel}/index.astro`,
    `src/pages/${rel}.ts`,
    `src/pages/${rel}.md`,
  ];
}

/**
 * The date to publish for one sitemap URL, or `undefined` to omit it.
 *
 * Article dates are date-only in the content, so they become midnight UTC —
 * the same convention the Article JSON-LD and the visible byline already use,
 * which keeps all three agreeing about when a page changed.
 */
export function lastmodFor(url: string, sources: LastmodSources): Date | undefined {
  const pathname = toPathname(url);

  const articleDate = sources.articles.get(pathname);
  if (articleDate) return new Date(`${articleDate}T00:00:00.000Z`);

  for (const candidate of pageSourceCandidates(pathname)) {
    const iso = sources.git.get(candidate);
    if (iso) return new Date(iso);
  }
  return undefined;
}
