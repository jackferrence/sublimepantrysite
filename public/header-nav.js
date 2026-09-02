(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Kept on `window`, not module scope: Astro may or may not re-execute this
  // script tag on a given navigation (it dedupes identical `<script src>`
  // tags), so a fresh module-scope WeakSet here could lose track of what's
  // already bound and double-bind listeners on a header that does persist.
  const boundLists = (window.__spBoundNavLists ??= new WeakSet());
  const boundHeaders = (window.__spBoundNavHeaders ??= new WeakSet());
  if (window.__spNavPageLoadBound) return;
  window.__spNavPageLoadBound = true;

  // `astro:page-load` fires after the very first load *and* after every
  // client-side navigation. Everything page-dependent lives in here, and it
  // re-queries the DOM fresh each time rather than trusting that a
  // `transition:persist` header kept our JS-added markup (in practice the
  // indicator span does not reliably survive a swap).
  document.addEventListener('astro:page-load', () => {
    const header = document.querySelector('.site-header');
    const nav = document.querySelector('.site-nav');
    if (!header || !nav) return;
    const list = nav.querySelector('ul');
    const links = Array.from(nav.querySelectorAll('a'));
    if (!list || !links.length) return;

    // --- Current-page marking -------------------------------------------
    const path = window.location.pathname
      .replace(/index\.html$/, '')
      .replace(/\.html$/, '')
      .replace(/\/$/, '') || '/';
    let currentLink = null;
    for (const a of links) {
      const href = a.getAttribute('href').replace(/\/$/, '') || '/';
      if (href === path) {
        a.setAttribute('aria-current', 'page');
        currentLink = a;
      } else {
        a.removeAttribute('aria-current');
      }
    }

    // --- Sliding indicator (recreated if a navigation dropped it) -------
    let indicator = list.querySelector('.nav-indicator');
    if (!indicator) {
      indicator = document.createElement('span');
      indicator.className = 'nav-indicator';
      indicator.setAttribute('aria-hidden', 'true');
      list.appendChild(indicator);
    }

    function place(el, animate) {
      if (!el) {
        indicator.style.opacity = '0';
        return;
      }
      const listRect = list.getBoundingClientRect();
      const rect = el.getBoundingClientRect();
      const x = rect.left - listRect.left;
      indicator.style.transitionDuration = animate && !reduceMotion ? '' : '0s';
      indicator.style.transform = `translateX(${x}px) scaleX(${rect.width})`;
      indicator.style.opacity = '1';
    }
    place(currentLink, true);

    // --- Mobile nav collapse: close the drawer on every fresh page --------
    const toggle = nav.querySelector('.nav-toggle');
    if (toggle) {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
    }

    // --- One-time listener binding per live list/header node ------------
    if (!boundLists.has(list)) {
      boundLists.add(list);
      links.forEach((a) => {
        a.addEventListener('mouseenter', () => place(a, true));
        a.addEventListener('focus', () => place(a, true));
        a.addEventListener('click', () => closeDrawer());
      });
      nav.addEventListener('mouseleave', () => place(currentLink, true));
      nav.addEventListener('focusout', (e) => {
        if (!nav.contains(e.relatedTarget)) place(currentLink, true);
      });

      let resizeTimer;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => place(currentLink, false), 120);
      });

      function closeDrawer() {
        nav.classList.remove('is-open');
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
      }
      function openDrawer() {
        nav.classList.add('is-open');
        if (toggle) toggle.setAttribute('aria-expanded', 'true');
      }

      if (toggle) {
        nav.classList.add('js-collapsible');
        toggle.hidden = false;
        toggle.addEventListener('click', () => {
          if (nav.classList.contains('is-open')) closeDrawer();
          else openDrawer();
        });
        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape' && nav.classList.contains('is-open')) {
            closeDrawer();
            toggle.focus();
          }
        });
        document.addEventListener('click', (e) => {
          if (nav.classList.contains('is-open') && !nav.contains(e.target)) closeDrawer();
        });
      }
    }

    if (!boundHeaders.has(header) && !reduceMotion) {
      boundHeaders.add(header);
      const CONDENSE_AT = 40;
      const HIDE_AFTER = 140;
      let lastY = window.scrollY;
      let ticking = false;

      function onScroll() {
        const y = Math.max(0, window.scrollY);
        header.classList.toggle('is-condensed', y > CONDENSE_AT);
        if (y > HIDE_AFTER && y > lastY) {
          header.classList.add('is-hidden');
        } else if (y < lastY || y <= HIDE_AFTER) {
          header.classList.remove('is-hidden');
        }
        lastY = y;
        ticking = false;
      }

      window.addEventListener(
        'scroll',
        () => {
          if (!ticking) {
            requestAnimationFrame(onScroll);
            ticking = true;
          }
        },
        { passive: true }
      );
    }
  });
})();
