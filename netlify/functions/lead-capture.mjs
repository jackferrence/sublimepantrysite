/**
 * Lead capture → Shopify customer bridge.
 *
 * Receives a mirrored copy of the site's newsletter submission and upserts a
 * Shopify customer with explicit marketing consent, lifecycle tags, and source
 * metafields. Netlify Forms remains the system of record; this function is
 * additive and must never be the reason a lead is lost.
 *
 * Authentication supports both of Shopify's paths, because which one a store
 * can use depends on how it was created:
 *
 *  1. Client credentials grant (preferred, and the current path for new apps).
 *     Set SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET. The function exchanges
 *     them for a token at runtime. Tokens last 24h (expires_in 86399), so they
 *     are cached in module scope and renewed a minute before expiry. Requires
 *     the app and the store to be in the same Shopify organization, else
 *     Shopify returns `shop_not_permitted`.
 *
 *  2. A long-lived Admin API token. Set SHOPIFY_ADMIN_API_TOKEN. This covers
 *     legacy admin-created custom apps and custom-distribution apps installed
 *     via the authorization code grant. Takes precedence when both are set.
 *
 * Shopify retired admin-created custom apps on 2026-01-01, so path 1 is the
 * likely one for this store. See docs/SHOPIFY-ADMIN-SETUP.md §8.
 *
 * Security invariants:
 *  - Credentials live only in this function's environment. They are never sent
 *    to the browser and never logged.
 *  - A customer is only ever marked SUBSCRIBED when the submission carried an
 *    explicit marketing_consent === true. Absent consent, the request is
 *    rejected outright rather than written without consent.
 *
 * Two submissions reach this function for one person, because /thanks posts to
 * the same form as the signup:
 *
 *  1. The signup itself. It knows the acquisition page and the lead magnet but
 *     not the lifecycle stage — the qualifying question is asked afterwards.
 *     A missing stage is therefore "not asked yet", not a bad request; the
 *     stage metafield and the stage- tag are simply omitted.
 *  2. The /thanks follow-up. It knows the stage and nothing else of value. Its
 *     source_path is "/thanks", which is not where the lead came from, and its
 *     timestamp is not when consent was given. It writes the stage and touches
 *     nothing else — including the consent record.
 *
 * Development / unconfigured behaviour: when the Shopify env vars are missing,
 * the function returns 204 without attempting any API call. It is a documented
 * no-op, not a silent failure of a real call.
 */

const API_VERSION = '2026-07';

const LIFECYCLE_STAGES = new Set([
  'considering',
  'new-owner',
  'active-owner',
  'cottage-seller',
]);

/** The page the qualifying-question follow-up posts from. See the header. */
const FOLLOW_UP_SOURCE_PATH = '/thanks';

/**
 * Cached client-credentials token. Module scope persists across invocations on
 * a warm Lambda, so a burst of signups costs one token exchange, not one each.
 * A cold start simply fetches a new one.
 */
let cachedToken = null;

async function getAccessToken(shop) {
  const staticToken = process.env.SHOPIFY_ADMIN_API_TOKEN;
  if (staticToken) return staticToken;

  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  // Renew a minute early so a token cannot expire mid-request.
  if (cachedToken && cachedToken.expiresAt - 60_000 > Date.now()) {
    return cachedToken.value;
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
    // The body names the cause (commonly shop_not_permitted, when the app and
    // store are not in the same Shopify organization). It contains no secret.
    const detail = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${detail.slice(0, 200)}`);
  }

  const body = await res.json();
  if (!body.access_token) throw new Error('Token exchange returned no access_token');

  cachedToken = {
    value: body.access_token,
    expiresAt: Date.now() + (Number(body.expires_in) || 86_399) * 1000,
  };
  return cachedToken.value;
}

const CUSTOMER_UPSERT = `
  mutation LeadUpsert($input: CustomerInput!) {
    customerCreate(input: $input) {
      customer { id email }
      userErrors { field message }
    }
  }
`;

const CUSTOMER_UPDATE = `
  mutation LeadUpdate($input: CustomerInput!) {
    customerUpdate(input: $input) {
      customer { id email }
      userErrors { field message }
    }
  }
`;

const FIND_CUSTOMER = `
  query FindCustomer($query: String!) {
    customers(first: 1, query: $query) {
      edges { node { id tags } }
    }
  }
`;

async function shopifyGraphql(shop, token, query, variables) {
  const res = await fetch(`https://${shop}/admin/api/${API_VERSION}/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(`Shopify Admin API returned ${res.status}`);
  }

  const body = await res.json();
  if (body.errors?.length) {
    throw new Error(`Shopify GraphQL error: ${body.errors.map((e) => e.message).join('; ')}`);
  }
  return body.data;
}

function tagsFor(stage, leadMagnet) {
  const tags = ['sp-lead', 'freeze-drying', 'source-site'];
  if (stage) tags.push(`stage-${stage}`);
  if (leadMagnet === 'freeze-drying-starter-checklist') tags.push('lead-starter-checklist');
  return tags;
}

export default async (request) => {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return new Response('Bad Request', { status: 400 });
  }

  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  const stage = typeof payload.stage === 'string' ? payload.stage : '';
  const sourcePath = typeof payload.source_path === 'string' ? payload.source_path : '';
  const leadMagnet = typeof payload.lead_magnet === 'string' ? payload.lead_magnet : '';

  if (!email || !email.includes('@')) {
    return new Response('Bad Request', { status: 400 });
  }
  // An unrecognised stage is dropped, not rejected: the signup form does not
  // ask the question, and refusing every signup for not knowing the answer yet
  // is what kept this sync from ever writing a customer.
  const lifecycleStage = LIFECYCLE_STAGES.has(stage) ? stage : '';
  // Consent is not inferred, defaulted, or assumed. No consent, no write.
  if (payload.marketing_consent !== true) {
    return new Response('Marketing consent required', { status: 400 });
  }

  const shop = process.env.SHOPIFY_SHOP_DOMAIN;
  if (!shop) {
    // Documented no-op: Netlify Forms already captured this lead.
    console.info('[lead-capture] SHOPIFY_SHOP_DOMAIN absent; skipping customer sync.');
    return new Response(null, { status: 204 });
  }

  let token;
  try {
    token = await getAccessToken(shop);
  } catch (error) {
    console.error('[lead-capture] Could not obtain an access token:', error.message);
    return new Response(null, { status: 202 });
  }
  if (!token) {
    console.info('[lead-capture] No Shopify credentials configured; skipping customer sync.');
    return new Response(null, { status: 204 });
  }

  const now = new Date().toISOString();
  const isFollowUp = sourcePath === FOLLOW_UP_SOURCE_PATH;

  const stageMetafield = lifecycleStage
    ? [{ namespace: 'sublime_pantry', key: 'lifecycle_stage', type: 'single_line_text_field', value: lifecycleStage }]
    : [];

  const metafields = isFollowUp
    ? stageMetafield
    : [
        ...stageMetafield,
        { namespace: 'sublime_pantry', key: 'source_path', type: 'single_line_text_field', value: sourcePath || '/' },
        { namespace: 'sublime_pantry', key: 'lead_magnet', type: 'single_line_text_field', value: leadMagnet || 'none' },
      ];

  // Omitted entirely on the follow-up. Re-sending it would move
  // consentUpdatedAt to the moment they answered a survey, which is not when
  // permission was given.
  const emailMarketingConsent = isFollowUp
    ? undefined
    : {
        marketingState: 'SUBSCRIBED',
        marketingOptInLevel: 'SINGLE_OPT_IN',
        consentUpdatedAt: now,
      };

  // The follow-up is an update to someone who already exists. If it does not
  // find them, there is nothing to enrich and nothing worth creating from a
  // survey answer alone.
  if (isFollowUp && !metafields.length) {
    console.info('[lead-capture] Follow-up carried no recognised stage; nothing to update.');
    return new Response(null, { status: 204 });
  }

  try {
    const found = await shopifyGraphql(shop, token, FIND_CUSTOMER, {
      query: `email:"${email.replace(/"/g, '')}"`,
    });
    const existing = found?.customers?.edges?.[0]?.node;

    if (existing) {
      // Merge tags rather than replace: never drop tags Flow or Shopify set.
      const merged = Array.from(new Set([...(existing.tags ?? []), ...tagsFor(lifecycleStage, leadMagnet)]));
      const result = await shopifyGraphql(shop, token, CUSTOMER_UPDATE, {
        input: {
          id: existing.id,
          tags: merged,
          ...(emailMarketingConsent ? { emailMarketingConsent } : {}),
          metafields,
        },
      });
      const errors = result?.customerUpdate?.userErrors ?? [];
      if (errors.length) throw new Error(errors.map((e) => e.message).join('; '));
    } else if (isFollowUp) {
      // No customer to enrich. The signup write is the one that creates them.
      console.info('[lead-capture] Follow-up for an address with no customer record; skipping.');
    } else {
      const result = await shopifyGraphql(shop, token, CUSTOMER_UPSERT, {
        input: {
          email,
          tags: tagsFor(lifecycleStage, leadMagnet),
          emailMarketingConsent,
          metafields: [
            ...metafields,
            { namespace: 'sublime_pantry', key: 'first_touch_date', type: 'date', value: now.slice(0, 10) },
          ],
        },
      });
      const errors = result?.customerCreate?.userErrors ?? [];
      if (errors.length) throw new Error(errors.map((e) => e.message).join('; '));
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    // Log without the email address; Netlify Forms still holds the lead.
    console.error('[lead-capture] Shopify sync failed:', error.message);
    return new Response(null, { status: 202 });
  }
};

export const config = { path: '/.netlify/functions/lead-capture' };
