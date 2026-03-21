/**
 * Scroll-based banner show/hide + scroll to booking section.
 * Used on homepage (desktop + mobile banners) and tour pages (single banner).
 * Supports both top banners (slide down) and bottom mobile CTA bars (slide up).
 */
export function initScrollBanner(options: {
  bannerIds: string[];
  bookBtnIds: string[];
  bottomBarIds?: string[];
  showAfterPx?: number;
  bookingSectionSelector?: string;
}) {
  const {
    bannerIds,
    bookBtnIds,
    bottomBarIds = [],
    showAfterPx = 200,
    bookingSectionSelector = '#book-tour, div[id*="book-tour"], [id="book-tour"]',
  } = options;

  const banners = bannerIds.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];
  const bottomBars = bottomBarIds.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];

  function scrollToBooking() {
    const bookingSection = document.querySelector(bookingSectionSelector);
    if (bookingSection) {
      bookingSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function handleScroll() {
    const currentScrollY = window.scrollY;
    const bookingSection = document.querySelector(bookingSectionSelector);
    let hideThreshold = window.innerHeight;

    if (bookingSection) {
      const rect = bookingSection.getBoundingClientRect();
      hideThreshold = currentScrollY + rect.top - 100;
    }

    const shouldShow = currentScrollY > showAfterPx && currentScrollY < hideThreshold;

    // Top banners: slide down when shown
    for (const banner of banners) {
      if (shouldShow) {
        banner.classList.remove('-translate-y-full');
      } else {
        banner.classList.add('-translate-y-full');
      }
    }

    // Bottom bars: slide up when shown
    for (const bar of bottomBars) {
      if (shouldShow) {
        bar.classList.remove('translate-y-full');
      } else {
        bar.classList.add('translate-y-full');
      }
    }
  }

  // Bind book buttons
  for (const id of bookBtnIds) {
    document.getElementById(id)?.addEventListener('click', scrollToBooking);
  }

  window.addEventListener('scroll', handleScroll, { passive: true });
}
