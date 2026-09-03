/**
 * Header behaviour: the mobile navigation drawer and the desktop search
 * overlay.
 *
 * Deliberately small. There is no hide-on-scroll, no condense-on-scroll and no
 * sliding indicator — the active link is marked in CSS from `aria-current`,
 * which the server already sets and this script only corrects for client-side
 * navigations.
 */
(() => {
  if (window.__spHeaderBound) return;
  window.__spHeaderBound = true;

  const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  /** Shared focus trap + body scroll lock, reused by the cart drawer. */
  const overlay = {
    open(panel, opener) {
      panel.hidden = false;
      panel.dataset.spOpener = '';
      overlay.current = { panel, opener };
      document.documentElement.classList.add('sp-locked');
      const first = panel.querySelector(FOCUSABLE);
      if (first) first.focus();
    },
    close() {
      const state = overlay.current;
      if (!state) return;
      state.panel.hidden = true;
      document.documentElement.classList.remove('sp-locked');
      overlay.current = null;
      if (state.opener) {
        state.opener.setAttribute('aria-expanded', 'false');
        state.opener.focus();
      }
    },
    current: null,
  };
  window.spOverlay = overlay;

  document.addEventListener('keydown', (e) => {
    const state = overlay.current;
    if (!state) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      overlay.close();
      return;
    }
    if (e.key !== 'Tab') return;
    const items = Array.from(state.panel.querySelectorAll(FOCUSABLE)).filter(
      (el) => el.offsetParent !== null || el === document.activeElement
    );
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  function bind() {
    // Close anything left open by the previous page.
    if (overlay.current) {
      overlay.current.panel.hidden = true;
      document.documentElement.classList.remove('sp-locked');
      overlay.current = null;
    }

    const header = document.querySelector('.site-header');
    if (!header) return;

    // Current-page marking, re-applied after client-side navigation.
    const path =
      window.location.pathname
        .replace(/index\.html$/, '')
        .replace(/\.html$/, '')
        .replace(/(.)\/$/, '$1') || '/';
    header.querySelectorAll('.site-nav a, .nav-drawer a').forEach((a) => {
      const href = (a.getAttribute('href') || '').replace(/(.)\/$/, '$1') || '/';
      if (href === path) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });

    header.querySelectorAll('[data-sp-overlay-open]').forEach((button) => {
      if (button.dataset.spBound) return;
      button.dataset.spBound = '1';
      button.addEventListener('click', () => {
        const panel = document.getElementById(button.getAttribute('aria-controls'));
        if (!panel) return;
        if (!panel.hidden) {
          overlay.close();
          return;
        }
        button.setAttribute('aria-expanded', 'true');
        overlay.open(panel, button);
      });
    });

    document.querySelectorAll('[data-sp-overlay-close]').forEach((button) => {
      if (button.dataset.spBound) return;
      button.dataset.spBound = '1';
      button.addEventListener('click', () => overlay.close());
    });

    document.querySelectorAll('.nav-drawer a').forEach((a) => {
      if (a.dataset.spBound) return;
      a.dataset.spBound = '1';
      a.addEventListener('click', () => overlay.close());
    });
  }

  document.addEventListener('astro:page-load', bind);
  if (document.readyState !== 'loading') bind();
  else document.addEventListener('DOMContentLoaded', bind);
})();
