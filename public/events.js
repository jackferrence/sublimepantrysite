/**
 * Sublime Pantry — analytics event layer.
 *
 * Forwards a fixed funnel taxonomy to Plausible (loaded in <head>,
 * script.outbound-links.js — cookieless, matches the site's stated stance).
 * The taxonomy and every prop is documented in docs/ANALYTICS-EVENTS.md.
 *
 * Privacy rule, enforced below: no email address, name, or other personal
 * identifier is ever passed to Plausible. Only page paths, product identifiers,
 * campaign fields, and the coarse lifecycle stage the reader self-selected.
 */
(function () {
  'use strict';

  // This script re-runs on every client-side navigation (view transitions
  // swap the page but re-insert this tag each time). Document-level
  // listeners must only ever be bound once, or clicks/submits would fire
  // Plausible events multiple times per page.
  if (window.__spEventsInit) return;
  window.__spEventsInit = true;

  var PII_KEYS = /^(email|e_mail|name|first_name|last_name|phone|address)$/i;

  function clean(data) {
    var out = {};
    if (!data) return out;
    Object.keys(data).forEach(function (key) {
      var value = data[key];
      // Never let a personal identifier reach the analytics provider, even if
      // a caller passes one by mistake.
      if (PII_KEYS.test(key)) return;
      if (value === undefined || value === null || value === '') return;
      out[key] = String(value);
    });
    return out;
  }

  function send(name, data) {
    var props = clean(data);
    props.path = props.path || location.pathname;
    if (window.spDebug) console.log('[sp-event]', name, props);
    if (typeof window.plausible === 'function') window.plausible(name, { props: props });
  }

  /** Reads the optional data-sp-props JSON blob off an element. */
  function propsOf(el) {
    var raw = el.getAttribute('data-sp-props');
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch (e) {
      return {};
    }
  }

  /** Campaign attribution from the URL, so guide → product hops are traceable. */
  function campaignProps() {
    var params = new URLSearchParams(location.search);
    var out = {};
    if (params.get('utm_campaign')) out.campaign = params.get('utm_campaign');
    if (params.get('utm_content')) out.content = params.get('utm_content');
    if (params.get('utm_source')) out.source = params.get('utm_source');
    return out;
  }

  // --- Declarative click/submit events -------------------------------------
  // Any element with data-sp-event fires on click; forms fire on submit.
  document.addEventListener('click', function (e) {
    var el = e.target instanceof Element ? e.target.closest('[data-sp-event]') : null;
    if (!el || el.tagName === 'FORM') return;
    var data = propsOf(el);
    if (el.tagName === 'A' && el.getAttribute('href')) data.destination = el.getAttribute('href');
    send(el.getAttribute('data-sp-event'), data);
  });

  document.addEventListener('submit', function (e) {
    var el = e.target instanceof Element ? e.target.closest('form[data-sp-event]') : null;
    if (el) send(el.getAttribute('data-sp-event'), propsOf(el));
  });

  // --- Declarative view events ---------------------------------------------
  // data-sp-view fires once when the element first becomes visible. Used for
  // product_view, lead_magnet_view and promo_view.
  var seen = new WeakSet();
  var observer =
    'IntersectionObserver' in window
      ? new IntersectionObserver(
          function (entries) {
            entries.forEach(function (entry) {
              if (!entry.isIntersecting || seen.has(entry.target)) return;
              seen.add(entry.target);
              observer.unobserve(entry.target);
              var data = propsOf(entry.target);
              var campaign = campaignProps();
              Object.keys(campaign).forEach(function (k) { data[k] = campaign[k]; });
              send(entry.target.getAttribute('data-sp-view'), data);
            });
          },
          { threshold: 0.3 },
        )
      : null;

  function armViewEvents() {
    document.querySelectorAll('[data-sp-view]').forEach(function (el) {
      if (seen.has(el)) return;
      if (observer) observer.observe(el);
      else {
        // No IntersectionObserver: report the exposure rather than lose it.
        seen.add(el);
        send(el.getAttribute('data-sp-view'), propsOf(el));
      }
    });
  }

  // --- Newsletter form ------------------------------------------------------
  // The POST does a real navigation to the checklist page. The signup_start
  // event and the button state must both react at click time, not after the
  // network round-trip. The email itself is never included.
  document.addEventListener('submit', function (e) {
    var form = e.target instanceof Element ? e.target.closest('form[name="freeze-drying-checklist"]') : null;
    if (!form) return;

    var stage = form.querySelector('[name="stage"]');
    var sourcePath = form.querySelector('[name="source_path"]');
    var leadMagnet = form.querySelector('[name="lead_magnet"]');
    send('newsletter_signup', {
      lifecycle_stage: stage && stage.value,
      source_path: sourcePath && sourcePath.value,
      lead_magnet: leadMagnet && leadMagnet.value,
    });

    var btn = form.querySelector('button[type="submit"]');
    if (!btn || btn.disabled) return;
    btn.disabled = true;
    btn.dataset.label = btn.textContent;
    btn.textContent = 'Subscribing…';
    form.classList.add('is-submitting');
  });

  // First interaction with the form counts as intent, separately from submit.
  var signupStarted = false;
  document.addEventListener(
    'focusin',
    function (e) {
      if (signupStarted) return;
      var el = e.target instanceof Element ? e.target : null;
      var form = el && el.closest('form[name="freeze-drying-checklist"]');
      if (!form) return;
      signupStarted = true;
      var sourcePath = form.querySelector('[name="source_path"]');
      send('newsletter_signup_start', { source_path: sourcePath && sourcePath.value });
    },
    true,
  );

  // --- Checkout handoff -----------------------------------------------------
  // Storefront Web Components do not dispatch a documented checkout event, so
  // there is no honest way to observe a completed purchase from this page.
  // What we CAN observe is the handoff: a click on the checkout link inside the
  // <shopify-cart> shadow root, which navigates to Shopify-hosted checkout.
  // Purchase and revenue attribution is Shopify's analytics, not ours.
  document.addEventListener(
    'click',
    function (e) {
      if (!e.composedPath) return;
      var path = e.composedPath();
      var inCart = false;
      var link = null;
      for (var i = 0; i < path.length; i++) {
        var node = path[i];
        if (!(node instanceof Element)) continue;
        if (!link && node.tagName === 'A' && node.getAttribute('href')) link = node;
        if (node.tagName === 'SHOPIFY-CART') { inCart = true; break; }
      }
      if (!inCart || !link) return;
      var href = link.getAttribute('href') || '';
      if (!/\/checkouts?\//.test(href) && !/shopify\.com/.test(href)) return;
      send('checkout_handoff', { cart_id: link.id || undefined });
    },
    true,
  );

  // --- Affiliate outbound clicks (rel="sponsored") --------------------------
  document.addEventListener('click', function (e) {
    var a = e.target instanceof Element ? e.target.closest('a[rel~="sponsored"]') : null;
    if (a) send('affiliate_outbound_click', { destination: a.href });
  });

  // --- Scroll completion (once per page, at 90%) ----------------------------
  var scrollFired = false;
  window.addEventListener(
    'scroll',
    function () {
      if (scrollFired) return;
      var h = document.documentElement;
      if (h.scrollTop + window.innerHeight >= h.scrollHeight * 0.9) {
        scrollFired = true;
        send('scroll_complete');
      }
    },
    { passive: true },
  );

  // Client-side navigation doesn't reload this script: re-arm per-page state.
  document.addEventListener('astro:page-load', function () {
    scrollFired = false;
    signupStarted = false;
    armViewEvents();
  });
  armViewEvents();

  window.spTrack = send;
})();
