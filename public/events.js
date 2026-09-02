/**
 * Sublime Pantry — analytics events.
 *
 * Instruments the events the playbook requires (article engagement, tool use,
 * newsletter signup, affiliate outbound click, waitlist, add-to-cart, purchase)
 * and forwards them to Plausible (loaded in <head>, script.outbound-links.js —
 * privacy-respecting, no cookies, matches the site's stated analytics stance).
 */
(function () {
  'use strict';

  // This script re-runs on every client-side navigation (view transitions
  // swap the page but re-insert this tag each time). Document-level
  // listeners must only ever be bound once, or clicks/submits would fire
  // Plausible events multiple times per page.
  if (window.__spEventsInit) return;
  window.__spEventsInit = true;

  function send(name, data) {
    if (window.spDebug) console.log('[sp-event]', name, data || {});
    if (typeof window.plausible === 'function') window.plausible(name, data ? { props: data } : undefined);
  }

  // Declarative events: any element with data-sp-event fires on click/submit.
  document.addEventListener('click', function (e) {
    var el = e.target instanceof Element ? e.target.closest('[data-sp-event]') : null;
    if (el && el.tagName !== 'FORM') send(el.getAttribute('data-sp-event'), { href: el.getAttribute('href') });
  });
  document.addEventListener('submit', function (e) {
    var el = e.target instanceof Element ? e.target.closest('form[data-sp-event]') : null;
    if (el) send(el.getAttribute('data-sp-event'));
  });

  // Instant submit feedback on the newsletter form: the POST itself still
  // does a real navigation to /thanks, but the button should react the
  // moment the reader clicks it, not once the network round-trip finishes.
  document.addEventListener('submit', function (e) {
    var form = e.target instanceof Element ? e.target.closest('form[name="dry-batch-signup"]') : null;
    if (!form) return;
    var btn = form.querySelector('button[type="submit"]');
    if (!btn || btn.disabled) return;
    btn.disabled = true;
    btn.dataset.label = btn.textContent;
    btn.textContent = 'Subscribing…';
    form.classList.add('is-submitting');
  });

  // Affiliate outbound clicks (rel="sponsored" links) — none active at launch.
  document.addEventListener('click', function (e) {
    var a = e.target instanceof Element ? e.target.closest('a[rel~="sponsored"]') : null;
    if (a) send('affiliate_outbound_click', { href: a.href });
  });

  // Scroll completion (fires once per page at 90%). Client-side navigation
  // doesn't reload this script, so re-arm the flag on every new page.
  var fired = false;
  document.addEventListener('astro:page-load', function () {
    fired = false;
  });
  window.addEventListener('scroll', function () {
    if (fired) return;
    var h = document.documentElement;
    if (h.scrollTop + window.innerHeight >= h.scrollHeight * 0.9) {
      fired = true;
      send('scroll_complete', { path: location.pathname });
    }
  }, { passive: true });

  window.spTrack = send;
})();
