/**
 * Photography that has not been shot yet.
 *
 * Every image slot on the site names the file it is waiting for. This resolves
 * that name against `public/` at build time: if the photograph exists it is
 * used, and if it does not the caller renders its placeholder instead of an
 * <img> that would 404. Dropping a file into `public/images/` is all it takes
 * to switch a slot over — no code change, no forgotten placeholder.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const PUBLIC_DIR = join(process.cwd(), 'public');

export function publicImage(path: string): string | undefined {
  return existsSync(join(PUBLIC_DIR, path)) ? path : undefined;
}
