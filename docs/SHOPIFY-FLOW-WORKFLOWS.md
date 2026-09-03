# Shopify Flow workflows

Flow is **already installed** on the store (verified via the Admin API). These workflows must be built in **Shopify Admin → Apps → Flow**; they cannot be created from this repo.

Hero SKU referenced throughout: **`MSMBS7MIL001`** (Freeze-Drying Packaging Starter Kit).

## Conventions used below

- **Trigger** / **Condition** / **Action** map 1:1 to Flow's three block types.
- Actions marked **[app]** depend on another app being installed and exposing that action to Flow. Verify the action actually appears in your Flow action picker before relying on it. If it does not, use the stated fallback.
- Flow's `Send internal email` action is a first-party Flow action and always available.

---

## FLOW 1 — Manual PackFresh fulfillment alert

**Purpose:** every starter-kit order requires a human to place a supplier order at PackFreshUSA. Nothing about that is automated, by design.

- **Trigger:** `Order paid`
- **Condition:** `Order` → `Line items` → `any` → `Variant / SKU` `contains` `MSMBS7MIL001`
- **Actions, in order:**
  1. `Add order tags` → `PACKFRESH-MANUAL`
  2. `Add order tags` → `VALIDATION-DROPSHIP`
  3. `Add customer tags` → `starter-kit-buyer`
  4. `Send internal email`
     - **To:** the store owner address
     - **Subject:** `Manual PackFreshUSA order required — {{order.name}}`
     - **Body must include:**
       - `{{order.name}}` (order number)
       - `{{order.shippingAddress.name}}`
       - `{{order.shippingAddress.address1}}`, `address2`, `city`, `provinceCode`, `zip`, `countryCode`
       - each line item's title, SKU and quantity
       - a link to `docs/MANUAL-FULFILLMENT.md`'s SOP

> **Do not add any action that places the supplier order.** PackFreshUSA ordering stays manual through soft launch. Flow's job is to make sure a human is told, with everything they need in one message.

---

## FLOW 2 — New starter-kit buyer segmentation

**Purpose:** a purchase is the strongest evidence we have that someone owns a freeze dryer. Move them out of the pre-owner audience.

- **Trigger:** `Order paid`
- **Condition:** `Order` → `Line items` → `any` → `Variant / SKU` `contains` `MSMBS7MIL001`
- **Actions:**
  1. `Add customer tags` → `starter-kit-buyer`
  2. `Add customer tags` → `freeze-drying-owner`
  3. `Remove customer tags` → `stage-considering`
     - Only this one. Do **not** remove `stage-new-owner`, `stage-active-owner` or `stage-cottage-seller`: those remain true after a purchase, and a cottage seller who buys packaging is still a cottage seller.
  4. **[app]** `Shopify Email` / `Shopify Messaging` → enter the *Starter-kit buyer* automation, **if and only if** that action appears in your action list.
     - **Fallback if it does not:** leave this out. Build Flow C in `docs/EMAIL-AUTOMATIONS.md` as a *customer-tag-triggered* automation inside Shopify Messaging instead, keyed on `starter-kit-buyer`. The tag written in step 1 is the trigger. This is the more robust design anyway.

Note that Flow 1 and Flow 2 share a trigger and condition. Keep them as two workflows: one is an operations alert, one is marketing segmentation, and you will want to disable or edit them independently.

---

## FLOW 3 — New lead segmentation

**Purpose:** route a new website lead into the right welcome sequence.

- **Trigger:** `Customer tags added`
  - Chosen over `Customer created` deliberately: `lead-capture.mjs` creates the customer and applies tags in one mutation, but for an *existing* customer it only updates tags. `Customer created` would miss every returning subscriber who changes stage.
- **Condition:** one workflow per branch, or a single workflow with three condition branches:

| If tag added is | Then |
|---|---|
| `stage-considering` | `Add customer tags` → `seq-pre-owner` |
| `stage-new-owner` **or** `stage-active-owner` | `Add customer tags` → `seq-owner` |
| `stage-cottage-seller` | `Add customer tags` → `seq-seller` |

- **Action:** the `Add customer tags` above. The `seq-*` tag is what the Shopify Messaging automation listens for.

Using a dedicated `seq-*` tag rather than triggering the email directly from Flow keeps the email tool's entry condition visible inside the email tool, and lets you re-enrol or suppress someone by editing a tag.

**Guard:** add a condition `Customer` → `tags` `does not contain` `starter-kit-buyer` on the pre-owner branch, so a buyer never drops back into a "should you buy a freeze dryer" sequence.

---

## FLOW 4 — Review eligibility

**Purpose:** ask for a review only after the customer actually has the product.

- **Trigger:** `Order fulfilled`
  - Shopify does not expose a reliable *delivered* trigger for manually fulfilled orders without a carrier-tracked integration. `Order fulfilled` fires when tracking is added, which is the closest honest signal we have. Compensate with a wait.
- **Condition:** `Order` → `Line items` → `any` → `SKU` `contains` `MSMBS7MIL001`
- **Actions:**
  1. `Wait` → `7 days` (approximate transit + first-use time)
  2. `Add customer tags` → `review-eligible`
  3. **[app]** Judge.me review-request action, **only if** Judge.me exposes one in your Flow action picker.
     - **Fallback, and the recommended default:** do not use Flow for the request at all. Judge.me has its own native Shopify order integration and schedules review request emails itself. Configure the delay in Judge.me. Use this Flow only to apply the `review-eligible` tag for segmentation and reporting.

See `docs/REVIEWS-INTEGRATION.md`.

---

## FLOW 5 — Fulfillment exception alert

**Purpose:** a manual dropship order that nobody actioned is the single most likely way to burn an early customer.

- **Trigger:** `Order paid`
- **Actions, in order:**
  1. `Condition` → `Order` → `tags` `contains` `PACKFRESH-MANUAL`
  2. `Wait` → `2 days`
  3. `Condition` → `Order` → `Fulfillment status` `is not` `Fulfilled`
  4. `Send internal email`
     - **Subject:** `UNFULFILLED after 48h — {{order.name}}`
     - **Body:** order number, order date, customer shipping destination, and a direct link to the order.

The wait must come after the tag condition so the workflow does not hold state for every order on the store. Two days is a starting threshold — tighten it once you know PackFreshUSA's real turnaround.

---

## Build order

1. Flow 1 (you cannot ship an order without it).
2. Flow 5 (it protects Flow 1 from human error).
3. Flow 2.
4. Flow 3.
5. Flow 4 — after Judge.me is configured.

## Testing each workflow

Flow runs only on real events. To test 1, 2 and 5, place the real test order described in `docs/SOFT-LAUNCH-CHECKLIST.md` and confirm: the two order tags appear, the customer tag appears, and the internal email arrives. To test Flow 3, submit the site's newsletter form with each stage value and confirm the `seq-*` tag lands. Check **Flow → Activity** for every run; a workflow that silently did nothing usually failed its condition, most often because the SKU condition was set on the product rather than the variant.
