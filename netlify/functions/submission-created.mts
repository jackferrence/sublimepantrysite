/**
 * Netlify Forms → Klaviyo subscriber bridge.
 *
 * Netlify Forms is the system of record. This function is additive: it takes a
 * verified submission and subscribes the address to the Klaviyo list that the
 * welcome flow ("The Dry Batch") is triggered by. If it fails, the submission
 * is still in Netlify Forms and can be replayed by hand — a failure here must
 * never look like a successful subscribe.
 *
 * ---------------------------------------------------------------------------
 * Why the deprecated filename convention, and not `export default { formSubmitted }`
 * ---------------------------------------------------------------------------
 * Netlify now prefers subscribing to events by exporting an object of handler
 * methods, with the filename carrying no meaning. That format cannot be used
 * here. Its event object is, in full:
 *
 *     interface FormSubmittedEvent { data: Record<string, string> }
 *
 * — no form name and no submission timestamp. Without a form name there is no
 * way to tell this form from the `contact` form, so the allowlist below could
 * not be enforced; without a timestamp there is no consent time to record.
 *
 * The legacy convention — a function named `submission-created`, receiving the
 * raw event body — is the only shape that carries `form_name` and
 * `created_at`. It is still fully supported. The handler itself is the modern
 * v2 signature (Request in, Response out), not the old `exports.handler`.
 *
 * Revisit only if `FormSubmittedEvent` grows those two fields.
 * See docs/KLAVIYO-SUBSCRIBER-BRIDGE.md.
 */

/** The Netlify list the welcome flow is triggered by ("The Dry Batch"). */
const KLAVIYO_LIST_ID = 'QPLXmc';

/** Pinned Klaviyo API revision. Klaviyo versions by date; do not float this. */
const KLAVIYO_REVISION = '2025-07-15';

/**
 * Forms this function is allowed to act on.
 *
 * WHY THIS IS AN ALLOWLIST AND NOT A DENYLIST: every Netlify form on the site
 * triggers this same function, including `contact`. Someone emailing us a
 * question has not asked to join a marketing list, and subscribing them would
 * be manufacturing consent we were never given. A denylist would silently
 * start subscribing any form added later. Adding a name here is an assertion
 * that the form carries its own explicit, affirmative marketing opt-in.
 */
const SUBSCRIBING_FORMS = new Set(['freeze-drying-checklist']);

/**
 * Values accepted as affirmative marketing consent.
 *
 * WHY AN ALLOWLIST OF VALUES, AND NOT A TRUTHINESS CHECK: an unchecked HTML
 * checkbox is not submitted at all, but the surrounding fields still arrive,
 * so any "is the field present / is it truthy" test would read a stray or
 * malformed value as a yes. Consent has to be something the person actively
 * expressed, so only these exact values count. Netlify posts the checkbox's
 * `value` attribute — "yes" for this site's form, "on" when a checkbox has no
 * explicit value — and both are listed. Anything else is treated as no
 * consent, and no consent means no subscribe.
 */
const CONSENT_VALUES = new Set(['on', 'yes', 'true', '1']);

/** The subset of Netlify's submission-created payload this function relies on. */
interface NetlifySubmissionPayload {
  form_name?: string;
  created_at?: string;
  data?: Record<string, unknown>;
}

interface NetlifyEventBody {
  payload?: NetlifySubmissionPayload;
}

/** Reads a form field as a trimmed string; anything non-string becomes ''. */
function field(data: Record<string, unknown>, name: string): string {
  const value = data[name];
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * Netlify sends `created_at` as an ISO 8601 timestamp. Normalise it so Klaviyo
 * always receives a valid one, and fall back to now rather than recording a
 * consent time we cannot parse.
 */
function consentTimestamp(raw: string | undefined): string {
  if (raw) {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return new Date().toISOString();
}

function klaviyoHeaders(apiKey: string): HeadersInit {
  return {
    // The key lives only in this function's environment. It is never returned
    // to the caller, never logged, and never reaches client code.
    Authorization: `Klaviyo-API-Key ${apiKey}`,
    revision: KLAVIYO_REVISION,
    accept: 'application/vnd.api+json',
    'content-type': 'application/vnd.api+json',
  };
}

/** Logs a failed Klaviyo call. Body may name the offending field; it holds no secret. */
async function logKlaviyoFailure(label: string, response: Response): Promise<void> {
  const body = await response.text().catch(() => '<unreadable>');
  console.error(
    `[submission-created] Klaviyo ${label} failed (${response.status}): ${body.slice(0, 500)}`,
  );
}

export default async (req: Request): Promise<Response> => {
  let body: NetlifyEventBody;
  try {
    body = (await req.json()) as NetlifyEventBody;
  } catch {
    console.error('[submission-created] Event body was not JSON.');
    return new Response(null, { status: 400 });
  }

  const payload = body.payload ?? {};
  const formName = typeof payload.form_name === 'string' ? payload.form_name : '';
  const data = (payload.data ?? {}) as Record<string, unknown>;

  // Hard stop for every other form on the site. See SUBSCRIBING_FORMS.
  if (!SUBSCRIBING_FORMS.has(formName)) {
    console.info(`[submission-created] Form "${formName}" is not a subscribing form; ignoring.`);
    return new Response(null, { status: 200 });
  }

  // Hard stop without affirmative consent. See CONSENT_VALUES.
  const consent = field(data, 'marketing_consent').toLowerCase();
  if (!CONSENT_VALUES.has(consent)) {
    console.warn(
      `[submission-created] Submission to "${formName}" carried no affirmative marketing consent; not subscribing.`,
    );
    return new Response(null, { status: 200 });
  }

  const email = field(data, 'email').toLowerCase();
  if (!email) {
    // The /thanks follow-up posts to this same form and may legitimately carry
    // no address. Nothing to subscribe; not an error.
    console.info(`[submission-created] Submission to "${formName}" had no email address; nothing to do.`);
    return new Response(null, { status: 200 });
  }

  const apiKey = process.env.KLAVIYO_PRIVATE_API_KEY;
  if (!apiKey) {
    console.error('[submission-created] KLAVIYO_PRIVATE_API_KEY is not set; cannot subscribe.');
    return new Response(null, { status: 500 });
  }

  const consentedAt = consentTimestamp(payload.created_at);
  const customSource = `netlify:${formName}`;
  const properties = {
    email_pref: 'both',
    audience: 'unknown',
    signup_source: field(data, 'source_path') || '/',
    lead_magnet: field(data, 'lead_magnet') || formName,
    consent_timestamp: consentedAt,
  };

  let degraded = false;

  // Klaviyo's bulk-subscribe endpoint accepts only email, phone_number,
  // subscriptions and age_gated_date_of_birth on a profile — it has no
  // `properties` field, and Klaviyo documents setting properties as a separate
  // call. Properties go first so that a profile is never left subscribed with
  // the source metadata missing; a failure here is logged and surfaced in the
  // status code, but must not stop the subscribe, because the person did
  // consent and the welcome flow is what they were promised.
  const importResponse = await fetch('https://a.klaviyo.com/api/profile-import', {
    method: 'POST',
    headers: klaviyoHeaders(apiKey),
    body: JSON.stringify({
      data: {
        type: 'profile',
        attributes: { email, properties },
      },
    }),
  });

  if (!importResponse.ok) {
    await logKlaviyoFailure('profile-import', importResponse);
    degraded = true;
  }

  const subscribeResponse = await fetch(
    'https://a.klaviyo.com/api/profile-subscription-bulk-create-jobs',
    {
      method: 'POST',
      headers: klaviyoHeaders(apiKey),
      body: JSON.stringify({
        data: {
          type: 'profile-subscription-bulk-create-job',
          attributes: {
            custom_source: customSource,
            profiles: {
              data: [
                {
                  type: 'profile',
                  attributes: {
                    email,
                    subscriptions: {
                      email: {
                        marketing: {
                          consent: 'SUBSCRIBED',
                          consented_at: consentedAt,
                        },
                      },
                    },
                  },
                },
              ],
            },
          },
          relationships: {
            list: { data: { type: 'list', id: KLAVIYO_LIST_ID } },
          },
        },
      }),
    },
  );

  if (!subscribeResponse.ok) {
    await logKlaviyoFailure('bulk-subscribe', subscribeResponse);
    return new Response(null, { status: 502 });
  }

  if (degraded) {
    // Subscribed, but the profile properties did not land. Loud on purpose.
    return new Response(null, { status: 502 });
  }

  console.info(`[submission-created] Subscribed a "${formName}" lead to list ${KLAVIYO_LIST_ID}.`);
  return new Response(null, { status: 200 });
};
