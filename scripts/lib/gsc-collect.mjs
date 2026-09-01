// Read-only Google Search Console collector, authenticated via Workload
// Identity Federation. The workflow uses `google-github-actions/auth@v2`
// with `workload_identity_provider` + `service_account`, which exchanges
// the GitHub OIDC token for short-lived GCP credentials and points
// GOOGLE_APPLICATION_CREDENTIALS at an ephemeral *external_account*
// credential config (no private key material) — this module just uses
// Application Default Credentials. It refuses to run if
// GOOGLE_APPLICATION_CREDENTIALS instead points at a real downloaded
// service-account key.
import { readFileSync } from 'node:fs';
import { GoogleAuth } from 'google-auth-library';
import { google } from 'googleapis';
import { loadConfig } from './config.mjs';

const READONLY_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';

export function assertNoServiceAccountKey() {
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credPath) return; // fine — no ADC configured, caller decides what to do
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(credPath, 'utf8'));
  } catch {
    return; // not a JSON credential file we can inspect; let google-auth-library fail on its own
  }
  if (parsed.type === 'service_account') {
    throw new Error(
      'GOOGLE_APPLICATION_CREDENTIALS points at a downloaded service-account key (type: "service_account"). ' +
        'This pipeline uses Workload Identity Federation only — a committed/downloaded private key must never ' +
        'be used here. Use google-github-actions/auth with workload_identity_provider instead.',
    );
  }
  // type === "external_account" (WIF) is the expected, safe case — no key material.
}

/** Builds a read-only Search Console client from Application Default Credentials. */
export async function getSearchConsoleClient() {
  assertNoServiceAccountKey();
  const auth = new GoogleAuth({ scopes: [READONLY_SCOPE] });
  const authClient = await auth.getClient();
  return google.searchconsole({ version: 'v1', auth: authClient });
}

/**
 * Read-only query against the Search Analytics API.
 * Returns [{ query, clicks, impressions, ctr, position }].
 */
export async function fetchTopQueries(searchConsoleClient, { lookbackDays } = {}) {
  const config = loadConfig();
  const days = lookbackDays ?? config.searchConsole.lookbackDays;
  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  const fmt = (d) => d.toISOString().slice(0, 10);

  const res = await searchConsoleClient.searchanalytics.query({
    siteUrl: config.searchConsole.property,
    requestBody: {
      startDate: fmt(start),
      endDate: fmt(end),
      dimensions: ['query'],
      rowLimit: 250,
      dataState: 'all',
    },
  });

  return (res.data.rows ?? []).map((row) => ({
    query: row.keys[0],
    clicks: row.clicks ?? 0,
    impressions: row.impressions ?? 0,
    ctr: row.ctr ?? 0,
    position: row.position ?? 0,
  }));
}

/**
 * Read-only page-level query, used to detect existing coverage/staleness
 * signals for the content-gap score.
 */
export async function fetchPagePerformance(searchConsoleClient, { lookbackDays } = {}) {
  const config = loadConfig();
  const days = lookbackDays ?? config.searchConsole.lookbackDays;
  const end = new Date();
  const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
  const fmt = (d) => d.toISOString().slice(0, 10);

  const res = await searchConsoleClient.searchanalytics.query({
    siteUrl: config.searchConsole.property,
    requestBody: {
      startDate: fmt(start),
      endDate: fmt(end),
      dimensions: ['page'],
      rowLimit: 250,
      dataState: 'all',
    },
  });

  return (res.data.rows ?? []).map((row) => ({
    page: row.keys[0],
    clicks: row.clicks ?? 0,
    impressions: row.impressions ?? 0,
    ctr: row.ctr ?? 0,
    position: row.position ?? 0,
  }));
}
