/**
 * The calendar invitation attached to a confirmed booking.
 *
 * Written in UTC rather than with a VTIMEZONE block: the start instant is
 * resolved through paris-time, so a 10:30 Paris slot lands at 09:30Z in
 * winter and 08:30Z in summer, and every calendar app in the world then
 * renders it back in the reader's own zone — which, for once, is what we
 * want. A traveller in Toronto should see the tour at their 04:30, not at a
 * "10:30" that means nothing until they land.
 */
import { parisWallClockToUTC } from '../paris-time';

/** RFC 5545 escaping: backslash, semicolon, comma and newlines are special. */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** Content lines are folded at 75 octets, continuation lines starting with a space. */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [line.slice(0, 75)];
  let rest = line.slice(75);
  while (rest.length > 74) {
    parts.push(' ' + rest.slice(0, 74));
    rest = rest.slice(74);
  }
  if (rest) parts.push(' ' + rest);
  return parts.join('\r\n');
}

function stamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export interface IcsOptions {
  /** Stable per booking, so a re-sent email updates the entry instead of duplicating it. */
  uid: string;
  /** "2026-11-15" — Paris calendar day. */
  dateKey: string;
  /** "10:30" — Paris wall clock. */
  time: string;
  durationMinutes: number;
  summary: string;
  description: string;
  location: string;
  url?: string;
}

export function buildIcs(o: IcsOptions): string {
  const start = parisWallClockToUTC(o.dateKey, `${o.time}:00.000`);
  const end = new Date(start.getTime() + o.durationMinutes * 60_000);

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Paris History Tours//Booking//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${escapeText(o.uid)}@parishistorytours.com`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escapeText(o.summary)}`,
    `DESCRIPTION:${escapeText(o.description)}`,
    `LOCATION:${escapeText(o.location)}`,
    ...(o.url ? [`URL:${escapeText(o.url)}`] : []),
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeText(o.summary)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return lines.map(fold).join('\r\n') + '\r\n';
}

/**
 * One-tap "add to calendar" for clients that won't open an attachment —
 * and for the admin email, where a tap beats downloading a file.
 */
export function googleCalendarUrl(o: Omit<IcsOptions, 'uid'>): string {
  const start = parisWallClockToUTC(o.dateKey, `${o.time}:00.000`);
  const end = new Date(start.getTime() + o.durationMinutes * 60_000);
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: o.summary,
    dates: `${stamp(start)}/${stamp(end)}`,
    details: o.description,
    location: o.location,
    ctz: 'Europe/Paris',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
