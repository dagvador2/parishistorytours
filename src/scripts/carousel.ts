/**
 * Generic carousel with swipe support.
 * Used on tour pages for topics, gallery, and stops carousels.
 */
export function initCarousel(options: {
  carouselId: string;
  indicatorsId: string;
  totalItems: number;
  prevBtnId?: string;
  nextBtnId?: string;
  autoPlayMs?: number;
  minSwipeDistance?: number;
}) {
  const {
    carouselId,
    indicatorsId,
    totalItems,
    prevBtnId,
    nextBtnId,
    autoPlayMs,
    minSwipeDistance = 50,
  } = options;

  let currentIndex = 0;
  const carousel = document.getElementById(carouselId);
  const indicators = document.querySelectorAll(`#${indicatorsId} button`);
  const prevBtn = prevBtnId ? document.getElementById(prevBtnId) : null;
  const nextBtn = nextBtnId ? document.getElementById(nextBtnId) : null;

  function update() {
    const offset = -currentIndex * 100;
    if (carousel) {
      carousel.style.transform = `translateX(${offset}%)`;
    }
    indicators.forEach((indicator, index) => {
      indicator.classList.toggle('bg-gray-800', index === currentIndex);
      indicator.classList.toggle('bg-gray-300', index !== currentIndex);
    });
  }

  function next() {
    currentIndex = (currentIndex + 1) % totalItems;
    update();
  }

  function prev() {
    currentIndex = (currentIndex - 1 + totalItems) % totalItems;
    update();
  }

  nextBtn?.addEventListener('click', next);
  prevBtn?.addEventListener('click', prev);

  indicators.forEach((indicator, index) => {
    indicator.addEventListener('click', () => {
      currentIndex = index;
      update();
    });
  });

  // Touch/swipe support
  if (carousel) {
    let touchStartX = 0;
    let touchEndX = 0;

    carousel.addEventListener(
      'touchstart',
      (e) => {
        touchStartX = e.changedTouches[0].screenX;
      },
      { passive: true },
    );

    carousel.addEventListener(
      'touchend',
      (e) => {
        touchEndX = e.changedTouches[0].screenX;
        const deltaX = touchEndX - touchStartX;
        if (Math.abs(deltaX) > minSwipeDistance) {
          if (deltaX > 0) {
            prev();
          } else {
            next();
          }
        }
      },
      { passive: true },
    );
  }

  if (autoPlayMs && autoPlayMs > 0) {
    setInterval(next, autoPlayMs);
  }
}
