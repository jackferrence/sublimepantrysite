/**
 * Availability, derived from Shopify at build time.
 *
 * Shopify owns inventory. The site is static, so "is this purchasable?" has to
 * be answered once, at build, and baked into the HTML — otherwise the first
 * paint either says nothing (and the card is useless without JavaScript) or
 * guesses (and the guess is what a customer acts on).
 *
 * The rule this module exists to enforce:
 *
 *   **A product must never render as purchasable because a fetch errored.**
 *
 * Every failure path — network, non-200, malformed JSON, a handle Shopify did
 * not return — resolves to `false`. Unknown is not optimistic here. The worst
 * case of failing closed is that a buyable product shows as unstocked for one
 * deploy; the worst case of failing open is taking money for a thing that does
 * not exist, which is the failure that costs a refund and a customer.
 *
 * Source: the Online Store's public `products.json`, which needs no credential
 * and returns `variants[].available` straight from Shopify's inventory state.
 * That matters — a build-time secret would mean the shop silently fails closed
 * on any deploy where the variable is unset, which is the same silent-absence
 * failure this file is written to avoid. Nothing here is authenticated, so
 * nothing here can be un-authenticated by a rotated key.
 *
 * The Storefront web components still hydrate live availability on top of this
 * for anyone with JavaScript. This is the floor, not the ceiling.
 */
import { CATALOG, SHOPIFY_STORE_DOMAIN, type CatalogProduct } from './commerce';

export interface StockedProduct extends CatalogProduct {
  /** True only if Shopify said so at build time. False on any doubt. */
  inStock: boolean;
}

const ENDPOINT = `https://${SHOPIFY_STORE_DOMAIN}/products.json?limit=250`;

/** Shopify's shape, narrowed to the one field this module trusts. */
interface PublicProduct {
  handle?: unknown;
  variants?: { available?: unknown }[];
}

/**
 * Ask Shopify which handles are purchasable.
 *
 * Returns an empty map on every failure, which makes every product unstocked.
 * The warning is deliberately loud: a shop that has quietly gone all-sold-out
 * is a build worth looking at, and a silent empty map is how that goes unseen
 * for a week.
 */
async function fetchAvailability(): Promise<Map<string, boolean>> {
  const available = new Map<string, boolean>();
  try {
    const response = await fetch(ENDPOINT, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      console.warn(`[stock] Shopify returned ${response.status}; every product will render unstocked.`);
      return available;
    }
    const body = (await response.json()) as { products?: PublicProduct[] };
    if (!Array.isArray(body?.products)) {
      console.warn('[stock] Shopify returned no product array; every product will render unstocked.');
      return available;
    }
    for (const product of body.products) {
      if (typeof product?.handle !== 'string') continue;
      const variants = Array.isArray(product.variants) ? product.variants : [];
      // `available === true` and nothing looser. A missing field is not a yes.
      available.set(product.handle, variants.some((v) => v?.available === true));
    }
  } catch (error) {
    console.warn(
      `[stock] Could not reach Shopify (${error instanceof Error ? error.message : String(error)}); every product will render unstocked.`,
    );
    return new Map();
  }
  return available;
}

/** Resolved once per build, not once per page that asks. */
let cached: Promise<StockedProduct[]> | undefined;

/**
 * The catalog, each product carrying the availability Shopify reported.
 *
 * A handle Shopify did not return is `false`, not absent — a product that has
 * been unpublished or deleted in Shopify must stop being purchasable on the
 * site in the same deploy, and `?? false` is what makes that automatic.
 */
export function stockedCatalog(): Promise<StockedProduct[]> {
  cached ??= fetchAvailability().then((available) =>
    CATALOG.map((product) => ({ ...product, inStock: available.get(product.handle) ?? false })),
  );
  return cached;
}

/** One product by handle, or undefined if it is not in the catalog. */
export async function stockedProduct(handle: string): Promise<StockedProduct | undefined> {
  return (await stockedCatalog()).find((product) => product.handle === handle);
}

/**
 * What a card or buy box says when the product is not purchasable.
 *
 * Never "sold out" and never "back in stock": both assert a stocking history,
 * and for the quart line there isn't one — we have never had it. The products
 * that have never been stocked carry a `stockNote` explaining that and offering
 * the newsletter; everything else gets the neutral sentence.
 */
export const NOT_STOCKED_LABEL = 'Not currently stocked';

export function stockNoteFor(product: StockedProduct): string {
  return product.stockNote ?? 'Not currently stocked. Availability is set in Shopify and updates on the next deploy.';
}
