# Manual Fulfillment SOP — PackFreshUSA Validation Phase

This workflow is temporary. It exists only to validate demand before Sublime Pantry moves to bulk inventory or a formal supplier fulfillment relationship.

## Product

- Sublime Pantry product: Freeze-Drying Packaging Starter Kit — 100 Bags + Absorbers + Labels
- Shopify product GID: `gid://shopify/Product/9601875640597`
- Shopify variant GID: `gid://shopify/ProductVariant/50142251778325`
- Supplier: PackFreshUSA
- Supplier SKU: `MSMBS7MIL001`
- Supplier product URL: `https://packfreshusa.com/packfreshusa-mylar-bags-and-oxygen-absorbers-box-set-7-mil-100-pack/`
- Current supplier merchandise cost: `$59.99` before supplier shipping and tax
- Sublime Pantry validation price: `$59.99`
- Internal action: `ORDER FROM PACKFRESHUSA`

## Every-order workflow

1. Confirm the Shopify order is paid and the shipping address is complete.
2. Confirm the line item is SKU `MSMBS7MIL001`.
3. Open the PackFreshUSA source product URL.
4. Confirm the supplier SKU, current contents, retail price, and stock have not materially changed.
5. Place one PackFreshUSA order using the customer's Shopify shipping address as the ship-to address.
6. Use Sublime Pantry's own billing/payment information for the supplier purchase. Do not expose the customer's payment credentials.
7. Record the supplier order number in the Shopify order's internal notes or equivalent staff-only field.
8. When PackFreshUSA provides tracking, add the tracking carrier and tracking number to the Shopify fulfillment.
9. Mark the Shopify line item fulfilled only after the supplier order has actually shipped.
10. If PackFreshUSA is out of stock, changes the kit contents, or raises the landed cost materially, hold fulfillment and review before ordering a substitute.

## Customer-facing promise

The listing should describe the stable 100-bag / 100-absorber / 100-label box-set configuration only. Do not promise temporary promotions or bonus items, including PackFreshUSA's limited-time mini sealer, unless they become a permanent verified inclusion.

## Validation economics

Selling price intentionally matches current supplier merchandise cost. This is not a zero-loss transaction: supplier shipping/tax and Shopify payment-processing fees may make each validation order loss-making. Treat that difference as validation/customer-acquisition spend and record it.

For each validation order, record:

- Shopify order number
- gross customer payment
- supplier merchandise cost
- supplier shipping
- supplier tax
- Shopify/payment fees
- refunds, if any
- final validation loss/profit
- supplier order number
- ship date
- delivery date

## Stop conditions

Pause the listing and review before accepting additional orders if any of the following happen:

- Supplier SKU changes or disappears.
- Stable box contents no longer match the Sublime Pantry listing.
- PackFreshUSA prevents third-party direct shipment to customer addresses.
- Supplier shipping times become unacceptable.
- The supplier retail price rises enough that the validation loss is no longer intentional.
- Customer complaints indicate packaging, branding, invoices, or fulfillment experience are confusing.

## Graduation to bulk

Move away from this workflow after demand is validated. The preferred next state is a direct supplier agreement or bulk inventory with branded Sublime Pantry presentation, defined unit economics, predictable shipping, owned photography, replenishment products, and automated fulfillment/tracking.