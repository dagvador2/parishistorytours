/**
 * Fills every [data-next-session="<tour-slug>"] placeholder with the next
 * available session for that tour: "Next date: Sat, Sep 5 · 10:30 AM · 6 spots left".
 * The hour is always the Paris one — see src/lib/paris-time.ts.
 *
 * Honest urgency — real dates and real remaining spots straight from the DB.
 * Elements stay hidden when the API fails or a tour has no upcoming session,
 * so the page never shows a broken or empty line.
 */
import { formatParisDate, formatParisTime } from '../lib/paris-time';

interface UpcomingSlot {
  start_time: string;
  free: number;
  tour_type: string;
}

export async function initNextSessions(): Promise<void> {
  const els = Array.from(document.querySelectorAll<HTMLElement>('[data-next-session]'));
  if (els.length === 0) return;

  const lang = document.documentElement.lang === 'fr' ? 'fr' : 'en';
  const locale = lang === 'fr' ? 'fr-FR' : 'en-US';

  let slots: UpcomingSlot[] = [];
  try {
    const res = await fetch('/api/sessions?upcoming=50');
    if (!res.ok) return;
    const data = await res.json();
    if (!Array.isArray(data?.slots)) return;
    slots = data.slots;
  } catch {
    return;
  }

  const firstBySlug: Record<string, UpcomingSlot> = {};
  for (const s of slots) {
    if (!firstBySlug[s.tour_type]) firstBySlug[s.tour_type] = s;
  }

  for (const el of els) {
    const slug = el.dataset.nextSession;
    const slot = slug ? firstBySlug[slug] : undefined;
    if (!slot) continue;

    const dateStr = formatParisDate(slot.start_time, locale, {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
    const timeStr = formatParisTime(slot.start_time, locale, { hour12: lang !== 'fr' });
    const spotsTpl =
      el.dataset.spotsTemplate || (lang === 'fr' ? '{n} places restantes' : '{n} spots left');
    const label = el.dataset.nextLabel || (lang === 'fr' ? 'Prochaine date :' : 'Next date:');

    // Build with textContent only — API strings must never be injected as HTML.
    el.textContent = '';
    const labelEl = document.createElement('span');
    labelEl.className = 'pht-next__label';
    labelEl.textContent = `${label} `;
    const strong = document.createElement('b');
    strong.textContent = `${dateStr} · ${timeStr}`;
    const spotsEl = document.createElement('span');
    spotsEl.className = 'pht-next__spots' + (slot.free <= 3 ? ' is-low' : '');
    spotsEl.textContent = spotsTpl.replace('{n}', String(slot.free));
    el.append(labelEl, strong, document.createTextNode(' · '), spotsEl);
    el.hidden = false;
  }
}
