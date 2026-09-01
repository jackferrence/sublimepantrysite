(() => {
  const header = document.querySelector('.site-header');
  const nav = document.querySelector('.site-nav');
  if (!header || !nav) return;
  const list = nav.querySelector('ul');
  const links = Array.from(nav.querySelectorAll('a'));
  if (!links.length) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // --- Mark the current page so the existing aria-current styling (and our
  // indicator) has something real to key off, without an Astro layout pass. ---
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
      break;
    }
  }

  // --- Sliding indicator ------------------------------------------------
  const indicator = document.createElement('span');
  indicator.className = 'nav-indicator';
  indicator.setAttribute('aria-hidden', 'true');
  list.style.position = list.style.position || 'relative';
  list.appendChild(indicator);

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

  let resetTimer;
  function toRest(animate) {
    clearTimeout(resetTimer);
    place(currentLink, animate);
  }

  links.forEach((a) => {
    a.addEventListener('mouseenter', () => place(a, true));
    a.addEventListener('focus', () => place(a, true));
  });
  nav.addEventListener('mouseleave', () => toRest(true));
  nav.addEventListener('focusout', (e) => {
    if (!nav.contains(e.relatedTarget)) toRest(true);
  });

  // Position on load (no animation) and on resize (layout can shift widths).
  requestAnimationFrame(() => toRest(false));
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => toRest(false), 120);
  });

  // --- Scroll-condense + hide/reveal -------------------------------------
  if (reduceMotion) return;

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
})();
