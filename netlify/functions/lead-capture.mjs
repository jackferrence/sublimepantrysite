/**
 * Lead capture → Shopify customer bridge.
 *
 * Receives a mirrored copy of the site's newsletter submission and upserts a
 * Shopify customer with explicit marketing consent, lifecycle tags, and source
 * metafields. Netlify Forms remains the system of record; this function is
 * additive and must never be the reason a lead is lost.
 *
 * Security invariants:
 *  - The Admin API token lives only in this function's environment. It is never
 *    sent to the browser and never logged.
 *  - A customer is only ever marked SUBSCRIBED when the submission carried an
 *    explicit marketing_consent === true. Absent consent, the request is
 *    rejected outright rather than written without consent.
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
  const tags = ['sp-lead', 'freeze-drying', 'source-site', `stage-${stage}`];
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
  if (!LIFECYCLE_STAGES.has(stage)) {
    return new Response('Bad Request', { status: 400 });
  }
  // Consent is not inferred, defaulted, or assumed. No consent, no write.
  if (payload.marketing_consent !== true) {
    return new Response('Marketing consent required', { status: 400 });
  }

  const shop = process.env.SHOPIFY_SHOP_DOMAIN;
  const token = process.env.SHOPIFY_ADMIN_API_TOKEN;
  if (!shop || !token) {
    // Documented no-op: Netlify Forms already captured this lead.
    console.info('[lead-capture] Shopify env vars absent; skipping customer sync.');
    return new Response(null, { status: 204 });
  }

  const now = new Date().toISOString();
  const metafields = [
    { namespace: 'sublime_pantry', key: 'lifecycle_stage', type: 'single_line_text_field', value: stage },
    { namespace: 'sublime_pantry', key: 'source_path', type: 'single_line_text_field', value: sourcePath || '/' },
    { namespace: 'sublime_pantry', key: 'lead_magnet', type: 'single_line_text_field', value: leadMagnet || 'none' },
  ];

  const emailMarketingConsent = {
    marketingState: 'SUBSCRIBED',
    marketingOptInLevel: 'SINGLE_OPT_IN',
    consentUpdatedAt: now,
  };

  try {
    const found = await shopifyGraphql(shop, token, FIND_CUSTOMER, {
      query: `email:"${email.replace(/"/g, '')}"`,
    });
    const existing = found?.customers?.edges?.[0]?.node;

    if (existing) {
      // Merge tags rather than replace: never drop tags Flow or Shopify set.
      const merged = Array.from(new Set([...(existing.tags ?? []), ...tagsFor(stage, leadMagnet)]));
      const result = await shopifyGraphql(shop, token, CUSTOMER_UPDATE, {
        input: { id: existing.id, tags: merged, emailMarketingConsent, metafields },
      });
      const errors = result?.customerUpdate?.userErrors ?? [];
      if (errors.length) throw new Error(errors.map((e) => e.message).join('; '));
    } else {
      const result = await shopifyGraphql(shop, token, CUSTOMER_UPSERT, {
        input: {
          email,
          tags: tagsFor(stage, leadMagnet),
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
