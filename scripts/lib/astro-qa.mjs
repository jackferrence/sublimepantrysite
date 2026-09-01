import { execFileSync } from 'node:child_process';
import { repoRoot } from './config.mjs';

/**
 * Runs the same QA gate CI runs: astro check + astro build, then the
 * internal link/JSON-LD checker against dist/. Throws on any failure —
 * the controller must never open a PR for content that fails this gate.
 */
export function runAstroQa() {
  const cwd = repoRoot();
  const log = [];

  try {
    log.push(run('npm', ['run', 'build'], cwd, { CI: '1', ASTRO_TELEMETRY_DISABLED: '1' }));
    log.push(run('python3', ['.github/scripts/check-links.py', 'dist'], cwd));
    return { passed: true, log: log.join('\n') };
  } catch (err) {
    return { passed: false, log: log.join('\n') + '\n' + (err.stdout ?? err.message ?? String(err)) };
  }
}

function run(cmd, args, cwd, extraEnv = {}) {
  return execFileSync(cmd, args, {
    cwd,
    env: { ...process.env, ...extraEnv },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}
