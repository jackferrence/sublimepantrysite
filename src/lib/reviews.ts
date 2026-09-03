/**
 * Judge.me reviews — build-time fetch.
 *
 * SublimePantry.com is not a Shopify theme, so the Judge.me theme widget is not
 * available to us. Judge.me's REST API is the supported path for a custom
 * storefront: https://judge.me/help/en/articles/8409180-using-judge-me-api
 *
 * The private API token grants read/write and must stay server-side. This module
 * runs only during `astro build` (Node), never in the browser, so the token is
 * never shipped. Reviews are baked into the static HTML.
 *
 * Behaviour when JUDGEME_* env vars are absent (local dev, PR previews, and any
 * build before Judge.me is configured): return an empty result. The product page
 * then renders no review section and no aggregateRating — never placeholder or
 * invented content.
 */
import type { CatalogProduct } from './commerce';

const API_BASE = 'https://api.judge.me/api/v1';

export interface Review {
  id: number;
  rating: number;
  title: string;
  body: string;
  reviewerName: string;
  verified: boolean;
  createdAt: string;
}

export interface ProductReviews {
  reviews: Review[];
  aggregate: { ratingValue: number; reviewCount: number } | null;
  /** True when the integration is configured, whether or not reviews exist. */
  configured: boolean;
}

const EMPTY: ProductReviews = { reviews: [], aggregate: null, configured: false };

/** Shopify numeric product ID, needed as Judge.me's `external_id`. */
const SHOPIFY_PRODUCT_IDS: Record<string, string> = {
  'freeze-dryer-packaging-starter-kit-100': '9601875640597',
};

async function getJson(url: string): Promise<any | null> {
  try {
    const res = await fetch(url, { headers: { accept: 'application/json' } });
    if (!res.ok) {
      console.warn(`[reviews] Judge.me responded ${res.status}; rendering without reviews.`);
      return null;
    }
    return await res.json();
  } catch (error) {
    console.warn('[reviews] Judge.me request failed; rendering without reviews.', error);
    return null;
  }
}

export async function getProductReviews(product: CatalogProduct): Promise<ProductReviews> {
  const token = import.meta.env.JUDGEME_PRIVATE_TOKEN;
  const shopDomain = import.meta.env.JUDGEME_SHOP_DOMAIN;
  const externalId = SHOPIFY_PRODUCT_IDS[product.handle];

  if (!token || !shopDomain || !externalId) return EMPTY;

  // Resolve the Shopify product ID to Judge.me's internal product ID.
  const lookup = await getJson(
    `${API_BASE}/products/-1?shop_domain=${encodeURIComponent(shopDomain)}&api_token=${encodeURIComponent(token)}&external_id=${encodeURIComponent(externalId)}`,
  );
  const judgemeProductId = lookup?.product?.id;
  if (!judgemeProductId) return { ...EMPTY, configured: true };

  const data = await getJson(
    `${API_BASE}/reviews?shop_domain=${encodeURIComponent(shopDomain)}&api_token=${encodeURIComponent(token)}&product_id=${judgemeProductId}&published=true&per_page=20&page=1`,
  );
  const raw: any[] = Array.isArray(data?.reviews) ? data.reviews : [];

  const reviews: Review[] = raw
    .filter((r) => typeof r?.rating === 'number' && r.rating >= 1 && r.rating <= 5)
    .map((r) => ({
      id: r.id,
      rating: r.rating,
      title: (r.title ?? '').trim(),
      body: (r.body ?? '').trim(),
      reviewerName: (r.reviewer?.name ?? 'Verified buyer').trim(),
      verified: Boolean(r.verified === 'buyer' || r.verified === true),
      createdAt: r.created_at ?? '',
    }));

  if (!reviews.length) return { ...EMPTY, configured: true };

  const sum = reviews.reduce((total, r) => total + r.rating, 0);
  return {
    reviews,
    aggregate: {
      ratingValue: Number((sum / reviews.length).toFixed(2)),
      reviewCount: reviews.length,
    },
    configured: true,
  };
}
