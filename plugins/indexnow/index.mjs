/**
 * Submit published URLs to IndexNow after a successful production deploy.
 *
 * `onSuccess` and not `onPostBuild`: the ping tells search engines to come and
 * fetch these URLs, so it has to happen after the deploy is live. Pinging from
 * onPostBuild would invite a crawler to fetch a URL that is still 404.
 *
 * Two guards:
 *
 *  - Production only. A deploy preview's sitemap still carries production URLs,
 *    so a preview build would submit URLs it did not publish — and would do it
 *    on every push to every PR, which is how a key gets rate-limited.
 *  - Nothing here can fail the deploy. The deploy already succeeded by the time
 *    this runs; failing the build afterwards over a search-engine ping would
 *    turn a shipped site into a red build. Every path resolves, and the script
 *    itself exits 0 unconditionally.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

export const onSuccess = async ({ constants, utils }) => {
  const context = process.env.CONTEXT ?? 'unknown';

  if (context !== 'production') {
    console.log(`[indexnow] context is "${context}", not production — skipping.`);
    return;
  }

  try {
    const { stdout, stderr } = await run('./scripts/indexnow-ping.sh', [], {
      env: { ...process.env, SITEMAP_DIR: constants.PUBLISH_DIR ?? 'dist' },
      timeout: 60_000,
      maxBuffer: 1024 * 1024,
    });
    if (stdout) console.log(stdout.trimEnd());
    if (stderr) console.log(stderr.trimEnd());
  } catch (error) {
    // Reported, never thrown. utils.status marks it visible in the deploy log
    // summary without touching the deploy's own success.
    console.log(`[indexnow] ping did not complete: ${error.message}`);
    utils?.status?.show({
      title: 'IndexNow ping skipped',
      summary: 'The deploy succeeded; the search-engine ping did not.',
      text: String(error.message).slice(0, 500),
    });
  }
};
