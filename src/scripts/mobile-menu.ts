/**
 * Hamburger menu toggle for mobile navigation.
 * Used on homepage (EN and FR).
 */
export function initMobileMenu() {
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  const hamburgerIcon = document.getElementById('hamburger-icon');
  const closeIcon = document.getElementById('close-icon');
  const mobileMenuItems = document.querySelectorAll('.mobile-menu-item');

  let isMenuOpen = false;

  function toggleMobileMenu() {
    isMenuOpen = !isMenuOpen;

    if (isMenuOpen) {
      mobileMenu?.classList.remove('hidden');
      setTimeout(() => {
        mobileMenu?.classList.remove('opacity-0', 'scale-95');
        mobileMenu?.classList.add('opacity-100', 'scale-100');
      }, 10);
      hamburgerIcon?.classList.add('hidden');
      closeIcon?.classList.remove('hidden');
    } else {
      mobileMenu?.classList.remove('opacity-100', 'scale-100');
      mobileMenu?.classList.add('opacity-0', 'scale-95');
      setTimeout(() => {
        mobileMenu?.classList.add('hidden');
      }, 200);
      hamburgerIcon?.classList.remove('hidden');
      closeIcon?.classList.add('hidden');
    }
  }

  mobileMenuBtn?.addEventListener('click', toggleMobileMenu);

  // Smooth scroll to section on menu item click
  mobileMenuItems.forEach((item) => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = item.getAttribute('href')?.substring(1);
      const targetElement = document.getElementById(targetId || '');

      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(() => toggleMobileMenu(), 300);
      }
    });
  });

  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (
      isMenuOpen &&
      mobileMenu &&
      !mobileMenu.contains(e.target as Node) &&
      mobileMenuBtn &&
      !mobileMenuBtn.contains(e.target as Node)
    ) {
      toggleMobileMenu();
    }
  });
}
