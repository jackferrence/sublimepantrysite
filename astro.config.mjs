import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://www.sublimepantry.com',
  trailingSlash: 'never',
  build: {
    format: 'file',
  },
  image: {
    // Shopify's CDN is the only remote host we optimise; everything else is
    // either local to public/ or not an image.
    domains: ['cdn.shopify.com'],
  },
  integrations: [sitemap()],
});
