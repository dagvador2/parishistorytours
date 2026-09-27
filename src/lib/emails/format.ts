/**
 * Dates, names and money as they must read in a customer's inbox.
 *
 * The old templates called `toLocaleDateString()` with no options, which gave
 * "15/11/2026" — a date a North American reader parses as the 11th of the
 * month, if they parse it at all. Everything here spells the day out, and
 * anchors the calendar day at UTC noon so no timezone can shift it.
 */

export type Lang = 'en' | 'fr';

export function asLang(value: unknown): Lang {
  return value === 'fr' ? 'fr' : 'en';
}

const LOCALE: Record<Lang, string> = { en: 'en-GB', fr: 'fr-FR' };

function atNoon(dateKey: string): Date {
  return new Date(`${dateKey}T12:00:00Z`);
}

/** "Sunday 15 November 2026" · "dimanche 15 novembre 2026" */
export function longDate(dateKey: string, lang: Lang): string {
  return atNoon(dateKey).toLocaleDateString(LOCALE[lang], {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** "Sun 15 Nov" · "dim. 15 nov." — for subject lines, where every char counts. */
export function shortDate(dateKey: string, lang: Lang): string {
  return atNoon(dateKey).toLocaleDateString(LOCALE[lang], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });
}

/** "Saturday" · "samedi" — the day before, named, for "what happens next". */
export function weekdayBefore(dateKey: string, lang: Lang): string {
  const d = atNoon(dateKey);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toLocaleDateString(LOCALE[lang], { weekday: 'long', timeZone: 'UTC' });
}

/** The calendar day before `dateKey`, as a key. */
export function dayBefore(dateKey: string): string {
  const d = atNoon(dateKey);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** "10:30" plus `minutes`, on the clock — used for the end time. */
export function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = (h * 60 + m + minutes) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** EN "€59" · FR "59 €". Mirrors src/lib/price.ts for the email side. */
export function money(amount: number | string, lang: Lang): string {
  return lang === 'fr' ? `${amount}&nbsp;€` : `€${amount}`;
}

/**
 * "Gillian Chan" → "Gillian". Falls back to the whole string when there is no
 * space, and to "" when the field holds something that is plainly not a name,
 * so the greeting degrades to "Hello," rather than "Hello ,".
 */
export function firstName(full: string | null | undefined): string {
  const trimmed = (full ?? '').trim();
  if (!trimmed || trimmed.length > 60) return '';
  const first = trimmed.split(/\s+/)[0];
  if (first.length < 2 || /\d/.test(first)) return '';
  return first;
}

/** "1 person" · "4 people" · "1 personne" · "4 personnes" */
export function people(n: number, lang: Lang): string {
  if (lang === 'fr') return `${n} ${n === 1 ? 'personne' : 'personnes'}`;
  return `${n} ${n === 1 ? 'person' : 'people'}`;
}

/** "Sunday" · "dimanche" — the day of the walk, named. */
export function weekday(dateKey: string, lang: Lang): string {
  return atNoon(dateKey).toLocaleDateString(LOCALE[lang], { weekday: 'long', timeZone: 'UTC' });
}
