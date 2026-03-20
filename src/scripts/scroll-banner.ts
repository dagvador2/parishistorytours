/**
 * Scroll-based banner show/hide + scroll to booking section.
 * Used on homepage (desktop + mobile banners) and tour pages (single banner).
 */
export function initScrollBanner(options: {
  bannerIds: string[];
  bookBtnIds: string[];
  showAfterPx?: number;
  bookingSectionSelector?: string;
}) {
  const {
    bannerIds,
    bookBtnIds,
    showAfterPx = 200,
    bookingSectionSelector = '#book-tour, div[id*="book-tour"], [id="book-tour"]',
  } = options;

  const banners = bannerIds.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];

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

    for (const banner of banners) {
      if (shouldShow) {
        banner.classList.remove('-translate-y-full');
      } else {
        banner.classList.add('-translate-y-full');
      }
    }
  }

  // Bind book buttons
  for (const id of bookBtnIds) {
    document.getElementById(id)?.addEventListener('click', scrollToBooking);
  }

  window.addEventListener('scroll', handleScroll, { passive: true });
}
