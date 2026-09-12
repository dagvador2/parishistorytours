/**
 * GA4 conversion events, sent through gtag.js.
 *
 * BaseLayout loads gtag.js for G-26695P8H33 directly (deferred until idle) —
 * the GTM container this site used to load (GTM-K6M2KKL7) is empty, so GA4
 * never actually started through it. gtag() queues its arguments in
 * window.dataLayer; anything pushed before the library boots is replayed once
 * it loads, so calling track() is always safe, at any time.
 */
type TrackParams = Record<string, string | number | boolean | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function track(event: string, params: TrackParams = {}): void {
  try {
    window.dataLayer = window.dataLayer || [];
    // Same shim as the official snippet — gtag must push the *arguments
    // object* (not a plain object) for the library to process it.
    if (!window.gtag) {
      window.gtag = function gtag() {
        // eslint-disable-next-line prefer-rest-params
        window.dataLayer!.push(arguments);
      };
    }
    window.gtag("event", event, params);
  } catch {
    /* analytics must never break the page */
  }
}

/**
 * Delegated click tracking for links that exist all over the site:
 * WhatsApp, email, partner-platform logos, and any element carrying an
 * explicit data-track="event_name" attribute.
 */
export function initClickTracking(): void {
  document.addEventListener(
    'click',
    (e) => {
      const target = e.target as HTMLElement | null;
      const el = target?.closest?.('a, button') as HTMLElement | null;
      if (!el) return;

      const explicit = el.getAttribute('data-track');
      if (explicit) {
        track(explicit, { path: location.pathname });
        return;
      }

      const href = el.getAttribute('href') || '';
      if (href.includes('wa.me')) {
        track('contact_whatsapp', { path: location.pathname });
      } else if (href.startsWith('mailto:')) {
        track('contact_email', { path: location.pathname });
      } else if (el.closest('.qlogos__item')) {
        track('click_partner', {
          partner: el.getAttribute('aria-label') || 'unknown',
          path: location.pathname,
        });
      }
    },
    { capture: true }
  );
}
