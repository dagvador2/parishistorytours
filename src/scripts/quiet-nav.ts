/**
 * Quiet nav client behavior:
 *  1. Smooth-scroll in-page anchor links, respecting the sticky 70px nav.
 *  2. Scroll-spy: add `.is-active` to the nav link whose section is currently in view.
 *
 * Runs on pages that render <Nav context="home">. Safe to run on tour pages too —
 * if an anchor target is absent, the smooth-scroll handler simply no-ops.
 */

const NAV_OFFSET = 100;

export function initQuietNav() {
  const navLinks = Array.from(
    document.querySelectorAll<HTMLAnchorElement>('[data-quiet-nav] [data-nav-link]')
  );
  if (navLinks.length === 0) return;

  // Smooth-scroll for same-page anchors
  navLinks.forEach((link) => {
    const href = link.getAttribute('href') || '';
    const hashOnly = href.startsWith('#');
    if (!hashOnly) return;
    link.addEventListener('click', (e) => {
      const id = href.slice(1);
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - NAV_OFFSET;
      window.scrollTo({ top, behavior: 'smooth' });
      history.replaceState(null, '', href);
    });
  });

  // Scroll-spy
  const sectionKeys = navLinks
    .map((l) => l.dataset.navLink)
    .filter((k): k is string => Boolean(k));
  const sections = sectionKeys
    .map((key) => ({ key, el: document.getElementById(key) }))
    .filter((s): s is { key: string; el: HTMLElement } => Boolean(s.el));
  if (sections.length === 0) return;

  function setActive(activeKey: string | null) {
    navLinks.forEach((link) => {
      link.classList.toggle('is-active', link.dataset.navLink === activeKey);
    });
  }

  let frame = 0;
  function onScroll() {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      const y = window.scrollY + NAV_OFFSET + 40;
      let current: string | null = null;
      for (const s of sections) {
        if (s.el.offsetTop <= y) current = s.key;
        else break;
      }
      setActive(current);
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}
