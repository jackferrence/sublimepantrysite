/**
 * Sublime Pantry — analytics event stub.
 *
 * Instruments the events the playbook requires (article engagement, tool use,
 * newsletter signup, affiliate outbound click, waitlist, add-to-cart, purchase)
 * without shipping a third-party tracker. Swap `send` for your
 * privacy-respecting analytics provider when one is chosen.
 */
(function () {
  'use strict';

  function send(name, data) {
    // Replace with a real provider (e.g. Plausible/Fathom custom events).
    if (window.spDebug) console.log('[sp-event]', name, data || {});
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

  // Affiliate outbound clicks (rel="sponsored" links) — none active at launch.
  document.addEventListener('click', function (e) {
    var a = e.target instanceof Element ? e.target.closest('a[rel~="sponsored"]') : null;
    if (a) send('affiliate_outbound_click', { href: a.href });
  });

  // Scroll completion (fires once at 90%).
  var fired = false;
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
