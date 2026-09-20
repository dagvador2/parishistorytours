/**
 * Every tour time on this site is a Paris wall-clock time.
 *
 * `Date#toLocale*` renders in the *visitor's* timezone, so a London customer
 * read our 10:30 session as "9:30 AM" and wrote in asking whether the site was
 * broken. It wasn't — it was helpfully translating, which is exactly what a
 * meeting point in the 5th arrondissement must never do. Everything that turns
 * a stored instant into a date or an hour goes through this module, which pins
 * the timezone to Europe/Paris (DST included) whoever is looking.
 */

export const PARIS_TZ = 'Europe/Paris';

/** Paris wall clock at a given instant, read back as its numeric parts. */
const wallFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: PARIS_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

function wallParts(at: Date): Record<string, number> {
  const p: Record<string, number> = {};
  for (const { type, value } of wallFmt.formatToParts(at)) {
    if (type !== 'literal') p[type] = Number(value);
  }
  return p;
}

/** Paris offset, in ms, at that instant — +1h in winter, +2h in summer. */
function offsetMs(at: Date): number {
  const p = wallParts(at);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - at.getTime();
}

/** "2026-10-10" — the Paris calendar day an instant falls on. */
export function parisDateKey(value: string | number | Date): string {
  const p = wallParts(new Date(value));
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

/** "10:30" — the Paris wall-clock time of an instant, 24h, for storage. */
export function parisTimeKey(value: string | number | Date): string {
  const p = wallParts(new Date(value));
  return `${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`;
}

/**
 * The instant at which the Paris clock reads `dateKey` at `time`.
 * The offset is sampled twice so a slot sitting on a DST switch resolves to
 * the offset that actually applies to it rather than the one an hour earlier.
 */
export function parisWallClockToUTC(dateKey: string, time = '00:00:00.000'): Date {
  const naive = new Date(`${dateKey}T${time}Z`);
  const first = offsetMs(naive);
  const guess = new Date(naive.getTime() - first);
  const second = offsetMs(guess);
  return second === first ? guess : new Date(naive.getTime() - second);
}

/**
 * The UTC bounds of one Paris calendar day — for `gte`/`lte` queries.
 * The last second is padded out in ms rather than asked of the formatter,
 * which only resolves to the second.
 */
export function parisDayRangeUTC(dateKey: string): { beginISO: string; endISO: string } {
  const lastSecond = parisWallClockToUTC(dateKey, '23:59:59.000');
  return {
    beginISO: parisWallClockToUTC(dateKey, '00:00:00.000').toISOString(),
    endISO: new Date(lastSecond.getTime() + 999).toISOString(),
  };
}

/** Localised date of an instant, always as seen from Paris. */
export function formatParisDate(
  value: string | number | Date,
  locale: string,
  options: Intl.DateTimeFormatOptions = {}
): string {
  return new Date(value).toLocaleDateString(locale, { timeZone: PARIS_TZ, ...options });
}

/** Localised hour of an instant, always as seen from Paris. */
export function formatParisTime(
  value: string | number | Date,
  locale: string,
  options: Intl.DateTimeFormatOptions = {}
): string {
  return new Date(value).toLocaleTimeString(locale, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: PARIS_TZ,
    ...options,
  });
}
