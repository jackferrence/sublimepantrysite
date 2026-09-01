import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { load as loadYaml } from 'js-yaml';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));

let cached;

export function loadConfig() {
  if (cached) return cached;
  const raw = readFileSync(`${ROOT}site.yaml`, 'utf8');
  cached = loadYaml(raw);
  return cached;
}

export function repoRoot() {
  return ROOT;
}
