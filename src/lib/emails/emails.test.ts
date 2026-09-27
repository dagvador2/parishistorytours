/**
 * The email pieces that fail silently if they drift: the calendar invitation
 * across a DST switch, the date wording, and the clock guard that decides
 * whether a cron run proceeds. Everything else is copy, and copy is reviewed
 * by eye with `pnpm emails:preview`.
 */
import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { buildIcs } from './ics';
import { addMinutes, dayBefore, firstName, longDate, shortDate, weekdayBefore } from './format';
import { esc } from './layout';
import { bookingRef } from './types';
import { buildConfirmationEmail } from './booking-confirmation';
import { buildReminderEmail } from './reminder';
import type { EmailBooking } from './types';

const booking: EmailBooking = {
  ref: 'PHT-7431',
  name: 'Gillian Chan',
  email: 'gillian@example.com',
  phone: '+1 905 516 4780',
  message: null,
  tour: 'left-bank',
  tourType: 'regular',
  participants: 1,
  dateKey: '2026-11-15',
  time: '10:30',
  price: 59,
  paymentMethod: 'on_site',
  lang: 'en',
};

test('ics anchors the start on Paris wall clock, winter', () => {
  const ics = buildIcs({
    uid: 'PHT-7431',
    dateKey: '2026-11-15',
    time: '10:30',
    durationMinutes: 120,
    summary: 'WW2 Left Bank',
    description: 'x',
    location: 'Paris',
  });
  // Paris is UTC+1 in November: 10:30 local is 09:30Z.
  assert.match(ics, /DTSTART:20261115T093000Z/);
  assert.match(ics, /DTEND:20261115T113000Z/);
});

test('ics anchors the start on Paris wall clock, summer', () => {
  const ics = buildIcs({
    uid: 'x',
    dateKey: '2026-07-15',
    time: '10:30',
    durationMinutes: 120,
    summary: 'WW2 Left Bank',
    description: 'x',
    location: 'Paris',
  });
  // UTC+2 in July: the same 10:30 is 08:30Z.
  assert.match(ics, /DTSTART:20260715T083000Z/);
});

test('ics escapes and folds, and carries a day-before alarm', () => {
  const ics = buildIcs({
    uid: 'x',
    dateKey: '2026-11-15',
    time: '10:30',
    durationMinutes: 120,
    summary: 'Left Bank, WW2; a walk',
    description: 'Line one\nline two',
    location: 'Paris',
  });
  assert.match(ics, /SUMMARY:Left Bank\\, WW2\\; a walk/);
  assert.match(ics, /DESCRIPTION:Line one\\nline two/);
  assert.match(ics, /TRIGGER:-P1D/);
  assert.ok(ics.split('\r\n').every((l) => Buffer.byteLength(l) <= 75), 'every line folded to 75 octets');
});

test('dates are spelled out, never 15/11/2026', () => {
  assert.equal(longDate('2026-11-15', 'en'), 'Sunday, 15 November 2026');
  assert.equal(longDate('2026-11-15', 'fr'), 'dimanche 15 novembre 2026');
  assert.equal(shortDate('2026-11-15', 'en'), 'Sun 15 Nov');
  assert.equal(weekdayBefore('2026-11-15', 'en'), 'Saturday');
  assert.equal(dayBefore('2026-11-15'), '2026-11-14');
  assert.equal(dayBefore('2026-01-01'), '2025-12-31');
});

test('addMinutes stays on the clock', () => {
  assert.equal(addMinutes('10:30', 120), '12:30');
  assert.equal(addMinutes('23:30', 60), '00:30');
});

test('firstName refuses what is plainly not a first name', () => {
  assert.equal(firstName('Gillian Chan'), 'Gillian');
  assert.equal(firstName('  jean-pierre dupont '), 'jean-pierre');
  assert.equal(firstName(''), '');
  assert.equal(firstName('12345'), '');
  assert.equal(firstName(null), '');
});

test('customer input is escaped, not interpolated raw', () => {
  assert.equal(esc('Tom & "Jerry" <b>'), 'Tom &amp; &quot;Jerry&quot; &lt;b&gt;');
  const mail = buildConfirmationEmail({ ...booking, name: '<script>x</script> Eve' }, { whatsappUrl: 'https://wa.me/1' });
  assert.ok(!mail.html.includes('<script>x</script>'), 'no raw markup from a customer name');
});

test('booking reference is stable and short', () => {
  assert.equal(bookingRef('a1b2c3d4-0000-0000-0000-00000000f4a1'), 'PHT-F4A1');
  assert.match(bookingRef(null), /^PHT-\d{4}$/);
});

test('confirmation says one thing per state', () => {
  const onSite = buildConfirmationEmail(booking, { whatsappUrl: 'x' });
  assert.match(onSite.subject, /^Confirmed · WW2 Left Bank/);
  assert.match(onSite.html, /To pay on the day/i);

  const paid = buildConfirmationEmail({ ...booking, paymentMethod: 'stripe' }, { whatsappUrl: 'x' });
  assert.match(paid.html, /Paid in full/i);
  assert.ok(!/To pay on the day/i.test(paid.html), 'a paid booking is never asked for money');

  const request = buildConfirmationEmail(
    { ...booking, tourType: 'private', paymentMethod: null },
    { whatsappUrl: 'x' },
  );
  assert.match(request.subject, /^Received/);
  assert.ok(!/Confirmed/i.test(request.subject), 'a request is not a confirmation');
});

test('the tour language line appears only once a session carries one', () => {
  const unknown = buildConfirmationEmail(booking, { whatsappUrl: 'x' });
  assert.ok(!/guided in/i.test(unknown.html));
  const french = buildConfirmationEmail({ ...booking, lang: 'en', tourLanguage: 'fr' }, { whatsappUrl: 'x' });
  assert.match(french.html, /guided in French/);
});

test('the reminder refuses a tour with no meeting point', () => {
  assert.equal(buildReminderEmail({ ...booking, tour: 'right-bank' }, { whatsappUrl: 'x' }), null);
  assert.ok(buildReminderEmail(booking, { whatsappUrl: 'x' }) !== null);
});

test('every email carries a text part and a preheader', () => {
  const mails = [
    buildConfirmationEmail(booking, { whatsappUrl: 'x' }),
    buildReminderEmail(booking, { whatsappUrl: 'x' })!,
  ];
  for (const m of mails) {
    assert.ok(m.text.length > 200, 'plain-text part is real, not a stub');
    assert.match(m.html, /mso-hide:all/, 'preheader block present');
    assert.ok(!m.html.includes('undefined'), 'no undefined leaked into the markup');
  }
});
