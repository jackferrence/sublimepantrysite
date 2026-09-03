/**
 * Storefront failure handling.
 *
 * The Shopify Storefront Web Components render their own error text directly
 * into the page when the Storefront API is unreachable — for example
 * "GraphQL Client:" followed by an empty message when the Online Store channel
 * is locked (which is what a password-protected storefront does). A customer
 * must never see that.
 *
 * This script waits for the purchase block to appear. If it has not appeared in
 * time, it hides whatever the component rendered and reveals a plain fallback
 * that tells the truth and offers a working route to the product.
 *
 * It never fabricates a price and never renders a fake buy button.
 */
(function () {
  'use strict';

  var TIMEOUT_MS = 6000;

  function resolve(context) {
    if (context.dataset.spResolved) return;

    // The template's purchase block carries data-commerce-ready. Its presence
    // means Shopify answered and the real price and button are on the page.
    if (context.querySelector('[data-commerce-ready]')) {
      context.dataset.spResolved = 'ok';
      return;
    }

    context.dataset.spResolved = 'failed';
    // An inline style is required here: the component's own stylesheet sets a
    // display value that beats the `hidden` attribute's UA rule.
    context.style.display = 'none';

    var fallback = context.parentElement && context.parentElement.querySelector('[data-commerce-fallback]');
    if (fallback) fallback.hidden = false;

    if (typeof window.spTrack === 'function') {
      window.spTrack('storefront_unavailable', {
        product_handle: context.getAttribute('handle') || undefined,
      });
    }
  }

  function watch() {
    document.querySelectorAll('shopify-context').forEach(function (context) {
      if (context.dataset.spWatching) return;
      context.dataset.spWatching = '1';

      var observer = new MutationObserver(function () {
        if (context.querySelector('[data-commerce-ready]')) {
          observer.disconnect();
          context.dataset.spResolved = 'ok';
        }
      });
      observer.observe(context, { childList: true, subtree: true });

      setTimeout(function () {
        observer.disconnect();
        resolve(context);
      }, TIMEOUT_MS);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', watch);
  } else {
    watch();
  }
  document.addEventListener('astro:page-load', watch);
})();
