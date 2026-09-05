/**
 * Header behaviour: the desktop dropdowns, the mobile navigation drawer and
 * the search overlay.
 *
 * Deliberately small. There is no hide-on-scroll, no condense-on-scroll and no
 * sliding indicator — the active link is marked in CSS from `aria-current`,
 * which the server already sets and this script only corrects for client-side
 * navigations.
 *
 * The dropdowns are disclosures, not ARIA menus. Tab walks through the links
 * like any other navigation; arrows are an accelerator, not a cage. Nothing
 * here is load-bearing: with this file absent the panels still open on
 * :focus-within and (where the device really hovers) on hover.
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


  /**
   * Desktop dropdowns.
   *
   * Once this runs, `aria-expanded` is the single source of truth — the
   * CSS-only :focus-within and :hover rules stand down behind
   * `[data-nav-enhanced]`. Without that handoff, closing with Escape returns
   * focus to the trigger, :focus-within matches again, and the panel reopens
   * under you.
   */
  function bindDropdowns(header) {
    const nav = header.querySelector('.site-nav');
    if (!nav) return;
    nav.setAttribute('data-nav-enhanced', '');

    const groups = Array.from(nav.querySelectorAll('.has-menu'));
    if (!groups.length) return;

    // Only bind hover on a device that actually hovers. On a touch laptop or
    // tablet, hover fires on tap and the panel opens under the user's finger
    // before their click has registered — they then "close" it by completing
    // the tap they already started.
    const canHover = window.matchMedia('(hover: hover)').matches;

    const links = (group) => Array.from(group.querySelectorAll('.nav-menu a'));

    function close(group) {
      const trigger = group.querySelector('.nav-trigger');
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
      delete group.dataset.spPinned;
      clearTimeout(group.spCloseTimer);
    }

    function closeAll(except) {
      groups.forEach((group) => {
        if (group !== except) close(group);
      });
    }

    function open(group, focusFirst) {
      closeAll(group);
      clearTimeout(group.spCloseTimer);
      const trigger = group.querySelector('.nav-trigger');
      if (trigger) trigger.setAttribute('aria-expanded', 'true');
      if (focusFirst) {
        const first = links(group)[0];
        if (first) first.focus();
      }
    }

    const isOpen = (group) =>
      group.querySelector('.nav-trigger')?.getAttribute('aria-expanded') === 'true';

    function move(group, from, delta) {
      const items = links(group);
      if (!items.length) return;
      const index = items.indexOf(from);
      if (index === -1) return;
      items[(index + delta + items.length) % items.length].focus();
    }

    function focusEdge(group, last) {
      const items = links(group);
      if (!items.length) return;
      items[last ? items.length - 1 : 0].focus();
    }

    groups.forEach((group) => {
      if (group.dataset.spBound) return;
      group.dataset.spBound = '1';

      const trigger = group.querySelector('.nav-trigger');
      if (!trigger) return;

      // Hover and click both open, so a naive toggle breaks on hover devices:
      // moving the pointer to the trigger opens the panel, and the click the
      // user makes to commit to it closes the thing they were reaching for.
      // A click therefore *pins* the panel open, and only a second click on
      // the trigger closes it. Hover-opened panels stay unpinned and still
      // close on mouseleave.
      trigger.addEventListener('click', () => {
        if (isOpen(group) && group.dataset.spPinned) close(group);
        else {
          open(group, false);
          group.dataset.spPinned = '1';
        }
      });

      trigger.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open(group, true);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          open(group, false);
          focusEdge(group, true);
        }
      });

      group.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          if (!isOpen(group)) return;
          e.preventDefault();
          close(group);
          trigger.focus();
          return;
        }
        const link = e.target instanceof Element ? e.target.closest('.nav-menu a') : null;
        if (!link) return;
        if (e.key === 'ArrowDown') { e.preventDefault(); move(group, link, 1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); move(group, link, -1); }
        else if (e.key === 'Home') { e.preventDefault(); focusEdge(group, false); }
        else if (e.key === 'End') { e.preventDefault(); focusEdge(group, true); }
      });

      // Tabbing or clicking out of the group closes it. focusout fires before
      // the new element takes focus, so read it from relatedTarget.
      group.addEventListener('focusout', (e) => {
        if (!group.contains(e.relatedTarget)) close(group);
      });

      if (canHover) {
        group.addEventListener('mouseenter', () => open(group, false));
        // A diagonal cursor path from the trigger to the second item leaves the
        // group for a few frames. Closing instantly makes the menu feel
        // hostile. This is a timing grace, not motion, so prefers-reduced-motion
        // does not touch it.
        group.addEventListener('mouseleave', () => {
          if (group.dataset.spPinned) return;
          clearTimeout(group.spCloseTimer);
          group.spCloseTimer = setTimeout(() => close(group), 150);
        });
      }
    });

    if (!nav.dataset.spBound) {
      nav.dataset.spBound = '1';
      document.addEventListener('click', (e) => {
        if (!nav.contains(e.target)) closeAll(null);
      });
      document.addEventListener('keydown', (e) => {
        // The overlay handler owns Escape while a drawer is open.
        if (e.key === 'Escape' && !overlay.current) closeAll(null);
      });
    }
  }

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
    const clean = (href) => (href || '').replace(/(.)\/$/, '$1') || '/';
    const inSection = (href) => href !== '/' && (path === href || path.startsWith(href + '/'));

    header.querySelectorAll('.site-nav a, .nav-drawer a').forEach((a) => {
      if (clean(a.getAttribute('href')) === path) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });

    // `data-section-current` is visual only. A trigger is not a page, so it
    // never gets aria-current — announcing "current page" on a button that
    // isn't the page is a worse signal than no signal.
    header.querySelectorAll('.site-nav > ul > li > a, .nav-drawer-list a').forEach((a) => {
      a.toggleAttribute('data-section-current', inSection(clean(a.getAttribute('href'))));
    });
    header.querySelectorAll('.site-nav .nav-trigger').forEach((trigger) => {
      const menu = document.getElementById(trigger.getAttribute('aria-controls'));
      const hit = menu
        ? Array.from(menu.querySelectorAll('a')).some((a) => inSection(clean(a.getAttribute('href'))))
        : false;
      trigger.toggleAttribute('data-section-current', hit);
    });

    bindDropdowns(header);

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
