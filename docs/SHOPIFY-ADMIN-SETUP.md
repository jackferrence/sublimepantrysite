# Shopify Admin setup — the manual runbook

Everything in this file must be done by a human in Shopify Admin, Netlify, or Judge.me. Nothing here can be done from the repo.

Store: `zd-store-01m146jmxxhw739y7t7y11s669-paky1ta3.myshopify.com` · `shop.sublimepantry.com` · Basic plan · USD

Work top to bottom. Later sections depend on earlier ones.

---

## 0. Unlock the storefront — ✅ DONE (2026-09-03)

Completed. The Storefront API now returns `{"data":{"shop":{"name":"Sublime Pantry"}}}` and `/shop` renders live product data.

*Historical record of what was wrong:* **Online Store → Preferences → Restrict access to visitors with the password → OFF.**

The storefront was **password protected** (`onlineStore.passwordProtection.enabled = true`, verified 2026-09-03). `shop.sublimepantry.com` redirects every visitor to `/password`.

This does far more than hide the Shopify storefront. **Password protection locks the Online Store channel, which disables the Storefront API.** Every request from the Storefront Web Components on sublimepantry.com returns:

```
400  {"errors":[{"message":"Online Store channel is locked.","extensions":{"code":"BAD_REQUEST"}}]}
```

Consequences right now, on the live site:

- `www.sublimepantry.com/shop` renders **no products at all**.
- No price, no availability, no add-to-cart, no cart, no checkout.
- **Nobody can buy anything.** This is why the store shows sessions but zero carts and zero orders.

Nothing else in this runbook matters until this is off. Verify afterwards with:

```
curl -s -X POST https://shop.sublimepantry.com/api/2026-01/graphql.json \
  -H 'Content-Type: application/json' -d '{"query":"{shop{name}}"}'
```

It must return `{"data":{"shop":{"name":"Sublime Pantry"}}}`, not a `BAD_REQUEST`.

Then reload `www.sublimepantry.com/shop` and confirm a live price and an enabled **Add to cart** button appear.

---

## 1. Apps — already done ✅

Verified installed via the Admin API on 2026-09-03:

- ✅ **Shopify Flow**
- ✅ **Shopify Messaging**
- ✅ **Shopify Forms**
- ✅ **Judge.me Reviews**

Nothing to install. Two other apps are present that are unrelated to this stack (**Collective**, **Zapier**) plus MCP connectors — leave them alone or remove them deliberately, but do not add anything else. No popup, countdown, upsell, or "AI SEO" apps.

---

## 2. Discounts — ✅ mostly done, **one defect to fix**

### 2a. `WELCOME10` — created, working, but capped at ONE TOTAL USE 🚨

Verified live against the Storefront API on 2026-09-03: the code applies and takes $59.99 to $54.00.

**But `usageLimit` is set to `1`.** In Shopify that is the *store-wide total*, not per customer:

> "Limit number of times this discount can be used in total"

**The first customer who uses WELCOME10 consumes it permanently. Customer #2 gets "this discount code isn't valid."**

**Fix:** Discounts → `welcome10` → **uncheck "Limit number of times this discount can be used in total"** → Save.

Leave **"Limit to one use per customer" checked** — that is `appliesOncePerCustomer`, which is already set correctly and is the restriction you actually want.

Verify afterwards — `usageLimit` must be `null`:

```graphql
{ codeDiscountNodes(first: 5) { edges { node { codeDiscount {
  ... on DiscountCodeBasic { title usageLimit appliesOncePerCustomer } } } } } }
```

### 2b. Two lower-priority notes on `WELCOME10`

- **`combinesWith.shippingDiscounts` is `false`.** This blocks nothing today, because free shipping comes from a *rate condition*, not a discount (see §3). Set it to true anyway so a future shipping discount can stack. Discounts → `welcome10` → Combinations → tick "Shipping discounts".
- **The discount is scoped to the starter kit specifically**, not to the whole order (`customerGets.items` is a product selection). Identical behaviour on a one-product catalog. But when you add products, `WELCOME10` will silently discount only the starter kit. Change to "Entire order" if you want it to cover everything.
- The code is stored lowercase (`welcome10`). Harmless: Shopify matches discount codes case-insensitively, verified live with `WELCOME10`. The site renders the uppercase form.

### 2c. Automatic free shipping — **not needed, do not create**

The original plan called for a separate automatic free-shipping discount. It is unnecessary: the Domestic shipping rate already grants $0.00 above $45 (§3), and the discounted total of $54.00 clears it.

Adding one would be a second mechanism doing the same job, with two ways to misconfigure it. Skip it.

### 2d. Offer enabled on the site ✅

`LAUNCH_OFFER.enabled` is now `true`, so the offer renders on the homepage, `/shop`, the product page and the checklist page, and `WELCOME10` is pre-applied to the cart component.

**This depends on §2a being fixed.** If the usage cap stays at 1, the site will be advertising a code that dies after a single customer.

## 3. Shipping — ✅ correctly configured (earlier guidance here was wrong)

**Settings → Shipping and delivery → General profile → Domestic**

An earlier version of this document said there were two duplicate "Standard" rates and told you to delete the $0.00 one. **That was a misreading and the advice was wrong — do not delete anything.**

There is **one** rate definition:

| Rate | Price | Condition |
|---|---|---|
| Standard | $6.25 | none |
| Standard | $0.00 | `TOTAL_PRICE >= $45.00` |

Both rows share the same `DeliveryMethodDefinition` ID; the second is a **rate range condition** on the first, which is a normal free-shipping-threshold setup. Shopify presents the customer with **one** option, not two — confirmed live: a cart at $54.00 returns a single `Standard` option at `$0.00`.

**The dependency to watch:** the threshold is evaluated on the **post-discount** total. At $59.99 less 10% = $54.00, there is $9.00 of headroom. If the starter kit price drops below ~$50, or a cheaper product becomes the main offer, the total falls under $45 and customers start paying $6.25 while the site still promises free shipping. Re-verify this whenever the price changes.

**Still outstanding:** no rates exist outside the Domestic zone, so international customers cannot check out. Either add a zone or state US-only shipping on the product page.

## 4. Taxes, payments, checkout

- **Settings → Taxes and duties** — configure for your nexus.
- **Settings → Payments** — confirm a live provider is active and payouts are configured.
- **Settings → Checkout** — set branding (logo, colours, typography) so checkout reads as Sublime Pantry. Enable the marketing opt-in checkbox at checkout, unchecked by default.
- **Settings → Notifications** — enable **abandoned checkout** recovery.

---

## 5. Flow workflows

Build all five from `docs/SHOPIFY-FLOW-WORKFLOWS.md`, in this order:

1. **Flow 1** — Manual PackFresh fulfillment alert (order paid + SKU `MSMBS7MIL001` → tags + internal email). **You cannot ship without this.**
2. **Flow 5** — Fulfillment exception (unfulfilled 48h → staff alert).
3. **Flow 2** — Starter-kit buyer segmentation.
4. **Flow 3** — New lead segmentation (`Customer tags added` → `seq-*` tag).
5. **Flow 4** — Review eligibility (after Judge.me, §7).

Set the internal email recipient on Flows 1 and 5 to an address you actually watch.

---

## 6. Email automations + segments

- Create the segments in `docs/SHOPIFY-FORMS.md` (Customers → Segments).
- Build the automations in `docs/EMAIL-AUTOMATIONS.md`, in the build order given at the foot of that file. Flow C email 1 and abandoned checkout come first.
- Do **not** mention `WELCOME10` in any email until §2 is complete.
- Configure Shopify Forms per `docs/SHOPIFY-FORMS.md` — Shopify-native surfaces only, tagged `source-shopify-store`. Do not replace the site's own form.

---

## 7. Judge.me

1. Judge.me Admin → **Settings → Integrations → View API tokens**.
2. Copy the **Private API token** and shop domain.
3. Add to Netlify env vars (§8).
4. **Settings → Review requests:** trigger after fulfillment, delay **7–14 days** (manual dropship transit is slow and variable).
5. Do not import, seed, or generate any review. See `docs/REVIEWS-INTEGRATION.md`.

---

## 8. Environment variables

**Netlify → Site configuration → Environment variables.** Never in the repo, never in client code. Template: `.env.example`.

| Variable | Used by | Scope | Value |
|---|---|---|---|
| `SHOPIFY_SHOP_DOMAIN` | `lead-capture.mjs` | Functions (runtime) | `zd-store-01m146jmxxhw739y7t7y11s669-paky1ta3.myshopify.com` |
| `SHOPIFY_CLIENT_ID` | `lead-capture.mjs` | Functions (runtime) | Dev Dashboard app Client ID |
| `SHOPIFY_CLIENT_SECRET` | `lead-capture.mjs` | Functions (runtime) | Dev Dashboard app Client secret |
| `SHOPIFY_ADMIN_API_TOKEN` | `lead-capture.mjs` | Functions (runtime) | *Only if you already have a long-lived `shpat_…` token. Takes precedence.* |
| `JUDGEME_SHOP_DOMAIN` | `src/lib/reviews.ts` | **Build** | same myshopify domain |
| `JUDGEME_PRIVATE_TOKEN` | `src/lib/reviews.ts` | **Build** | Judge.me private token |

### Getting Shopify credentials — the flow changed on 2026-01-01

**The old route is gone.** Settings → Apps and sales channels → *Develop apps* no longer creates new apps; Shopify retired admin-created custom apps on 1 January 2026. There is no token to copy out of the Shopify admin any more. An earlier version of this document told you to use that route — it was wrong.

The current route produces a **Client ID and Client secret**, and the function exchanges them for a 24-hour token at runtime (cached, renewed a minute before expiry). You never copy a token.

1. Go to **https://dev.shopify.com/dashboard** → **Apps** → **Create app** → **Start from Dev Dashboard**. Name it `Sublime Pantry site bridge`.
2. **Versions** tab → set access scopes to exactly **`read_customers`** and **`write_customers`** → **Release**.
   The function only upserts customers. Do not grant order, product, or payment scopes it never uses.
3. **Home** → **Install app** → select the Sublime Pantry store → **Install**.
4. **Settings** → copy the **Client ID** and **Client secret**.
5. Put them in Netlify as `SHOPIFY_CLIENT_ID` and `SHOPIFY_CLIENT_SECRET`. Leave `SHOPIFY_ADMIN_API_TOKEN` unset.

**If you hit `shop_not_permitted`:** the client credentials grant only works when the app and the store are in the **same Shopify organization** in the Dev Dashboard. This store was not created from the Dev Dashboard, so this is a real possibility. Check **Dev Dashboard → Stores** and confirm Sublime Pantry is listed.

If it is not, use **custom distribution** instead: in the app's distribution settings choose *Custom distribution*, generate the install link for this store, install it, and complete the authorization code grant once to obtain a long-lived `shpat_…` offline token. Set that as `SHOPIFY_ADMIN_API_TOKEN` and leave the client credentials unset — the function supports both and prefers the static token when present. (Custom apps are exempt from Shopify's expiring-token mandate, so this token does not need refreshing.)

**Verify either path** after deploying, by submitting the real form and checking the customer appears in Shopify. A failed token exchange logs `Could not obtain an access token: …` in the Netlify function log and returns 202 — the lead is still safe in Netlify Forms.

None of these use Astro's `PUBLIC_` prefix, so none can reach the browser.

---

## 9. Netlify

- **Site configuration → Functions:** confirm `lead-capture` is deployed. The functions directory is declared in `netlify.toml`; it deploys automatically on merge.
- **Forms:** confirm `freeze-drying-checklist` still appears and is still receiving submissions after this deploy. It is the fallback for the whole lead system.
- Set the four env vars from §8, then **trigger a redeploy** — build-time vars (Judge.me) only take effect on a new build.
- Optional, once product data changes matter for structured data: create a **build hook**, and call it from a Shopify webhook on `products/update`. Only after that exists should `offers` be added to the product JSON-LD.

---

## 10. Housekeeping

- **Products:** 9 archived template products (yoga sets, massage balls, etc.) from the store's original theme remain. Archived products are not publicly reachable, but delete them so the catalog is honest.
- **Collections:** several `Archive —` and `Draft —` prefixed collections exist. They are not linked from the site, but confirm none is reachable on `shop.sublimepantry.com`.
- **Draft products** (`quart-mylar-bags…`, `300cc-oxygen-absorbers…`, gallon bags, candy pouches, desiccant+labels) stay **draft** until sourcing and fulfillment are verified. The site no longer references any of them. Adding one to the site means adding it to `CATALOG` in `src/lib/commerce.ts` **and** to `SHOPIFY_PRODUCT_IDS` in `src/lib/reviews.ts`.
- **Inventory:** the starter kit is at 5 units with policy DENY. It will sell out and correctly disable the buy button. Raise it deliberately when supply is confirmed.

---

## Order of operations

```
§0 UNLOCK STOREFRONT   ← nothing works until this is done
  └─ §1 apps (done)
      └─ §3 shipping ─┬─ §2 discounts ── §2c verify ── §2d enable offer on site
                  └─ §4 taxes/payments/checkout
                          └─ §5 Flow 1 + 5      ← required before any real order
                                  └─ §8 env vars ── §9 redeploy
                                          └─ §6 email  ·  §7 Judge.me
                                                  └─ test order (SOFT-LAUNCH-CHECKLIST §62–64)
```
