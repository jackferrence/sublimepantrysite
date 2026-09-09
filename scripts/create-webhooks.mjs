#!/usr/bin/env node
/**
 * Wire Shopify's product and inventory changes to a Netlify rebuild.
 *
 * The site is statically built, and `Product` JSON-LD now carries `offers` with
 * a `price` and an `availability` resolved at build time (see src/lib/stock.ts).
 * That markup is a claim about what a customer can buy right now, and between
 * deploys it is only as true as the last build. These two subscriptions are what
 * make it true: a price or stock change in Shopify posts to the Netlify build
 * hook, the site rebuilds, and the claim catches up within a deploy.
 *
 * Without them, `offers.availability` can say InStock for a product that sold
 * out days ago, which is the exact failure docs/COMMERCE-ARCHITECTURE.md warned
 * about when it said to leave `offers` out.
 *
 * Idempotent: it reads the existing subscriptions first and creates only what is
 * missing, so re-running after a partial failure is safe and cannot produce two
 * subscriptions posting to the same URL for the same topic.
 *
 * Usage — one command:
 *
 *   SHOPIFY_STORE_DOMAIN=<shop>.myshopify.com \
 *   SHOPIFY_ADMIN_TOKEN=<token> \
 *   NETLIFY_BUILD_HOOK_URL=<url> \
 *   node scripts/create-webhooks.mjs
 *
 * Credentials, same two paths as netlify/functions/lead-capture.mjs:
 *   SHOPIFY_ADMIN_TOKEN / SHOPIFY_ADMIN_API_TOKEN    (takes precedence)
 *   SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET        (client credentials grant)
 *
 * Scopes needed: write_products (to manage webhooks), read_products,
 * read_inventory. A token minted for the customer bridge has none of those, and
 * the failure is a 403 on the mutation rather than on the token exchange — so
 * the scope error is reported explicitly rather than left as "something failed".
 *
 * The build hook URL is a credential: anyone holding it can trigger production
 * builds. It is passed in the environment and is never written to this repo.
 */
import process from 'node:process';

const API_VERSION = '2026-07';

/** Topic → why this one. Both are needed; they fire on different events. */
const TOPICS = {
  PRODUCTS_UPDATE: 'a title, price or status change',
  INVENTORY_LEVELS_UPDATE: 'a stock movement, including selling the last unit',
};

const fail = (message) => {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
};

const shop = process.env.SHOPIFY_STORE_DOMAIN || process.env.SHOPIFY_SHOP_DOMAIN;
const callbackUrl = process.env.NETLIFY_BUILD_HOOK_URL;

if (!shop) fail('Set SHOPIFY_STORE_DOMAIN to the <shop>.myshopify.com domain.');
if (!callbackUrl) fail('Set NETLIFY_BUILD_HOOK_URL to the Netlify build hook for `main`.');
if (!/^https:\/\/api\.netlify\.com\/build_hooks\/[A-Za-z0-9]+$/.test(callbackUrl)) {
  fail(`NETLIFY_BUILD_HOOK_URL does not look like a Netlify build hook: ${callbackUrl}`);
}

async function getAccessToken() {
  const staticToken = process.env.SHOPIFY_ADMIN_TOKEN || process.env.SHOPIFY_ADMIN_API_TOKEN;
  if (staticToken) return staticToken;

  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    fail(
      'No Shopify credentials. Set SHOPIFY_ADMIN_TOKEN, or SHOPIFY_CLIENT_ID and\n' +
        '  SHOPIFY_CLIENT_SECRET. The app needs write_products, read_products and\n' +
        '  read_inventory on a released version.',
    );
  }

  const res = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  if (!res.ok) {
    fail(`Shopify token exchange failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  }
  const body = await res.json();
  if (!body.access_token) fail('Shopify token exchange returned no access_token.');
  return body.access_token;
}

const token = await getAccessToken();

async function admin(query, variables) {
  const res = await fetch(`https://${shop}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': token },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(20_000),
  });
  if (res.status === 401 || res.status === 403) {
    fail(
      `Shopify returned ${res.status}. The credentials are valid but the app is missing a\n` +
        '  scope. Webhook management needs write_products; the monitor also needs\n' +
        '  read_products and read_inventory. Add them to a released version of the app\n' +
        '  in the Shopify Dev Dashboard, reinstall on the store, then re-run.',
    );
  }
  if (!res.ok) fail(`Shopify Admin API returned ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const body = await res.json();
  if (body.errors) fail(`Shopify Admin API errors: ${JSON.stringify(body.errors).slice(0, 400)}`);
  return body.data;
}

const EXISTING = `
  query {
    webhookSubscriptions(first: 100) {
      nodes { id topic uri }
    }
  }
`;

const CREATE = `
  mutation Create($topic: WebhookSubscriptionTopic!, $sub: WebhookSubscriptionInput!) {
    webhookSubscriptionCreate(topic: $topic, webhookSubscription: $sub) {
      webhookSubscription { id topic uri }
      userErrors { field message }
    }
  }
`;

const existing = (await admin(EXISTING)).webhookSubscriptions.nodes;

for (const [topic, why] of Object.entries(TOPICS)) {
  const already = existing.find(
    (n) => n.topic === topic && n.uri === callbackUrl,
  );
  if (already) {
    console.log(`· ${topic} already posts to the build hook (${already.id}) — ${why}`);
    continue;
  }
  const result = await admin(CREATE, { topic, sub: { callbackUrl, format: 'JSON' } });
  const { webhookSubscription, userErrors } = result.webhookSubscriptionCreate;
  if (userErrors?.length) {
    fail(`Could not create ${topic}: ${userErrors.map((e) => e.message).join('; ')}`);
  }
  console.log(`✓ ${topic} → build hook (${webhookSubscription.id}) — fires on ${why}`);
}

const after = (await admin(EXISTING)).webhookSubscriptions.nodes.filter(
  (n) => n.uri === callbackUrl,
);
console.log(`\n${after.length} subscription(s) now post to that build hook:`);
for (const n of after) console.log(`  ${n.topic}`);

if (after.length !== Object.keys(TOPICS).length) {
  fail('Expected both topics to be wired. One is missing — re-run, or check the app scopes.');
}

console.log(
  '\nVerify: change a product\'s inventory in Shopify, then check for a new deploy with\n' +
    'deploy_source "api" in the Netlify dashboard.',
);
