import type { ProductImage } from './commerce.ts';
/** Explicit matching supplier components. Bundle frames are labeled component views, never a whole-kit photo. */
const MEDIA: Record<string, ProductImage> = {
  "packfresh-6x6-bag-100cc-absorbers": {
    "assetId": "packfresh-6x6-bag-100cc-absorbers",
    "src": "/images/library/packfresh-6x6-bag-100cc-absorbers/1x1-800.webp",
    "highRes": "/images/product-originals/packfresh-6x6-bag-100cc-absorbers.webp",
    "alt": "A 6 by 6 inch flat Mylar bag with rounded corners beside a sealed pack of PackFreshUSA 100cc oxygen absorbers.",
    "kind": "studio",
    "source": "manufacturer",
    "caption": "Photo: PackFreshUSA · Component view; quantity is listed in contents.",
    "width": 800,
    "height": 800
  },
  "packfresh-6x6-bag-dimensions": {
    "assetId": "packfresh-6x6-bag-dimensions",
    "src": "/images/library/packfresh-6x6-bag-dimensions/1x1-800.webp",
    "highRes": "/images/product-originals/packfresh-6x6-bag-dimensions.webp",
    "alt": "A 6 by 6 inch flat Mylar bag with its width and height dimensioned at 6 inches on each side.",
    "kind": "packaging",
    "source": "manufacturer",
    "caption": "Photo: PackFreshUSA · Component view; quantity is listed in contents.",
    "width": 800,
    "height": 800
  },
  "packfresh-quart-flat-with-absorbers": {
    "assetId": "packfresh-quart-flat-with-absorbers",
    "src": "/images/library/packfresh-quart-flat-with-absorbers/1x1-800.webp",
    "highRes": "/images/product-originals/packfresh-quart-flat-with-absorbers.webp",
    "alt": "A quart flat Mylar bag beside a sealed pack of PackFreshUSA oxygen absorbers.",
    "kind": "studio",
    "source": "manufacturer",
    "caption": "Photo: PackFreshUSA · Component view; quantity is listed in contents.",
    "width": 800,
    "height": 800
  },
  "packfresh-quart-flat-dimensions": {
    "assetId": "packfresh-quart-flat-dimensions",
    "src": "/images/library/packfresh-quart-flat-dimensions/1x1-800.webp",
    "highRes": "/images/product-originals/packfresh-quart-flat-dimensions.webp",
    "alt": "A quart flat Mylar bag dimensioned at 12 inches tall by 8 inches wide.",
    "kind": "packaging",
    "source": "manufacturer",
    "caption": "Photo: PackFreshUSA · Component view; quantity is listed in contents.",
    "width": 800,
    "height": 800
  },
  "packfresh-mini-sealer-open": {
    "assetId": "packfresh-mini-sealer-open",
    "src": "/images/library/packfresh-mini-sealer-open/4x5-800.webp",
    "highRes": "/images/product-originals/packfresh-mini-sealer-open.jpg",
    "alt": "A PackFreshUSA mini bag sealer standing upright with its jaws open and its cord trailing.",
    "kind": "studio",
    "source": "manufacturer",
    "caption": "Photo: PackFreshUSA · Component view; quantity is listed in contents.",
    "width": 800,
    "height": 1000
  },
  "packfresh-mini-sealer-angled": {
    "assetId": "packfresh-mini-sealer-angled",
    "src": "/images/library/packfresh-mini-sealer-angled/4x5-800.webp",
    "highRes": "/images/product-originals/packfresh-mini-sealer-angled.webp",
    "alt": "A PackFreshUSA mini bag sealer seen at an angle, jaws open, showing the heating strip.",
    "kind": "studio",
    "source": "manufacturer",
    "caption": "Photo: PackFreshUSA · Component view; quantity is listed in contents.",
    "width": 800,
    "height": 1000
  },
  "packfresh-mini-sealer-sealing-bag": {
    "assetId": "packfresh-mini-sealer-sealing-bag",
    "src": "/images/library/packfresh-mini-sealer-sealing-bag/4x5-800.webp",
    "highRes": "/images/product-originals/packfresh-mini-sealer-sealing-bag.webp",
    "alt": "A hand closing a PackFreshUSA mini bag sealer across the open top of a Mylar bag.",
    "kind": "in-use",
    "source": "manufacturer",
    "caption": "Photo: PackFreshUSA · Component view; quantity is listed in contents.",
    "width": 800,
    "height": 1000
  }
};
const snack = ['packfresh-6x6-bag-100cc-absorbers', 'packfresh-6x6-bag-dimensions'];
const sealer = ['packfresh-mini-sealer-open', 'packfresh-mini-sealer-angled', 'packfresh-mini-sealer-sealing-bag'];
const quart = ['packfresh-quart-flat-with-absorbers', 'packfresh-quart-flat-dimensions'];
const BY_SKU: Record<string, string[]> = {
 'SP-SNK-50': snack, 'SP-SNK-100': snack, 'SP-TOOL-HM150': sealer,
 'SP-BUNDLE-STARTER': [...snack,...sealer], 'SP-BUNDLE-SEASON': [...snack,...sealer],
 'SP-QT-50': quart
};
export function productMedia(sku: string): ProductImage[] { return (BY_SKU[sku] ?? []).map(id => MEDIA[id]); }
