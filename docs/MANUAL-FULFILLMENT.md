# Fulfillment SOP — assembled and shipped by us

We buy packaging wholesale, assemble the sets ourselves, and ship every order
from our own stock. Nothing is drop-shipped and no customer address leaves
Shopify for a third-party fulfiller.

This replaced the PackFreshUSA drop-ship workflow on 2026-09-09, when the boxed
`freeze-dryer-packaging-starter-kit-100` (SKU `MSMBS7MIL001`) was archived. That
SOP had us placing a supplier order per customer order and shipping the
manufacturer's sealed box direct. Nothing in this file inherits from it: the
supplier relationship is now purchasing, not fulfillment.

## What we hold

Eight ACTIVE products, all assembled or picked here. PackFreshUSA remains the
supplier for absorbers (their branding is on the packets, and the listings say
so) and for bag stock. They are a vendor we buy cases from; they never see an
order.

| SKU | Product | Bill of materials |
|---|---|---|
| `SP-SNK-50` | Snack Bags 6×6 — 50 Pack | 50 × 6"×6" 4.3 mil bag, 50 × 100cc absorber |
| `SP-SNK-100` | Snack Bags 6×6 — 100 Pack | 100 × 6"×6" 4.3 mil bag, 100 × 100cc absorber |
| `SP-QT-50` | Quart Bags 8×12 — 50 Pack | 50 × 8"×12" 4.3 mil bag, 50 × 300cc absorber |
| `SP-OA100-100` | 100cc Absorber Refill | 10 × sealed 10-pack, 100cc |
| `SP-OA300-100` | 300cc Absorber Refill | 10 × sealed 10-pack, 300cc |
| `SP-TOOL-HM150` | Mini Heat Sealer | 1 × HM-150 hand-held sealer |
| `SP-BUNDLE-STARTER` | Starter Set | 50 × 6"×6" bag, 50 × 100cc absorber, 1 × HM-150 |
| `SP-BUNDLE-SEASON` | Season Set | 100 × 6"×6" bag, 100 × 100cc absorber, 1 × HM-150 |

The two bundles are the only assembled-to-order items. Everything else is a
pick.

> **Absorbers are consumed by exposure, not by time on the shelf.** Open a
> sealed 10-pack only when you are packing a set that needs it, and use the
> whole 10-pack. A part-used 10-pack left open is spent stock, not inventory.

## Every-order workflow

1. Confirm the Shopify order is paid and the shipping address is complete.
2. Read the line items. Assemble each bundle from the bill of materials above;
   pick the rest.
3. For a bundle, count the absorbers into the set **last**, from a freshly
   opened sealed 10-pack, and close the outer bag immediately.
4. Weigh the packed parcel and record the weight on the order. See *Shipping
   cost* below — this is the only way the free-shipping threshold ever gets a
   real number under it.
5. Buy the label in Shopify, against the order.
6. Add tracking to the Shopify fulfillment and mark the line items fulfilled.
   For us this is one step, not two: we are not waiting on a supplier.
7. Decrement inventory in Shopify if it did not decrement automatically.

There is no supplier order to place, no supplier order number to record, and no
window during which the customer is waiting on a third party. If an order cannot
ship, it is because we are out of a component — see *Stop conditions*.

## Shipping cost

**Unresolved, and it blocks the free-shipping threshold.** Every variant in
Shopify carries a weight of `0 lbs`, the store bills a flat manual rate rather
than a carrier-calculated one, and no label has ever been bought — the single
order to date (#1001) shipped at `$0.00` and was never fulfilled. So there is no
observed parcel cost for any product.

USPS, UPS, FedEx and DHL carrier services are all active on the store, so
Shopify can return real rates as soon as variant weights are set. Until they
are, do not move the threshold in `SHIPPING` (`src/lib/commerce.ts`) — a
threshold picked without a parcel cost under it is a guess wearing a number.

To resolve: weigh one assembled Season Set and one Snack Bags 6×6 — 50 Pack,
set those weights on the variants, and read the rate Shopify quotes to a
representative destination.

## Customer-facing promise

The listing describes the bill of materials above and nothing else. Do not
promise bonus items, temporary inclusions, or a shelf life. The absorber packets
carry PackFreshUSA's branding and the listings say so; do not present the
contents as manufactured by us.

## Per-order record

For each order, record:

- Shopify order number
- gross customer payment
- discount applied (`WELCOME10` is 10% off everything — see `docs/SHOPIFY-ADMIN-SETUP.md`)
- wholesale cost of the components consumed
- packed weight and the label cost actually paid
- Shopify/payment fees
- refunds, if any
- contribution margin
- ship date

Label cost is the line that was never recorded under the drop-ship SOP, and it
is the one the shipping threshold depends on.

## Stop conditions

Pause the affected listing and review before accepting further orders if:

- A component runs out and the reorder has not landed. Set the Shopify
  inventory to zero rather than letting the listing sell what we cannot pack.
- Wholesale cost moves enough that a set is loss-making at its list price.
- The bag or absorber spec changes, so the listing's stated mil, size or cc no
  longer matches what is in the box.
- Assembly time per bundle stops being worth the margin on it.
- Customer complaints indicate the assembled set is confusing or incomplete.
