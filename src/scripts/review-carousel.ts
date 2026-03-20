/**
 * Review carousel with show more/less toggle.
 * Used on homepage.
 */

declare global {
  interface Window {
    toggleReview: (index: number) => void;
  }
}

export function initReviewCarousel(totalReviews: number = 4) {
  // Show more / less toggle
  function toggleReview(index: number) {
    const preview = document.querySelector(`.review-preview-${index}`);
    const full = document.querySelector(`.review-full-${index}`);
    const button = document.querySelector(`.show-more-${index}`);

    if (!preview || !full || !button) return;

    if (preview.classList.contains('hidden')) {
      preview.classList.remove('hidden');
      full.classList.add('hidden');
      button.textContent = 'Show more';
    } else {
      preview.classList.add('hidden');
      full.classList.remove('hidden');
      button.textContent = 'Show less';
    }
  }

  window.toggleReview = toggleReview;

  // Carousel navigation
  let currentReviewIndex = 0;
  const carousel = document.getElementById('review-carousel');
  const indicators = document.querySelectorAll('#review-indicators button');
  const prevBtn = document.getElementById('prev-review');
  const nextBtn = document.getElementById('next-review');

  function updateCarousel() {
    const offset = -currentReviewIndex * 100;
    if (carousel) {
      carousel.style.transform = `translateX(${offset}%)`;
    }
    indicators.forEach((indicator, index) => {
      indicator.classList.toggle('bg-gray-800', index === currentReviewIndex);
      indicator.classList.toggle('bg-gray-300', index !== currentReviewIndex);
    });
  }

  function nextReview() {
    currentReviewIndex = (currentReviewIndex + 1) % totalReviews;
    updateCarousel();
  }

  function prevReview() {
    currentReviewIndex = (currentReviewIndex - 1 + totalReviews) % totalReviews;
    updateCarousel();
  }

  nextBtn?.addEventListener('click', nextReview);
  prevBtn?.addEventListener('click', prevReview);

  indicators.forEach((indicator, index) => {
    indicator.addEventListener('click', () => {
      currentReviewIndex = index;
      updateCarousel();
    });
  });
}
