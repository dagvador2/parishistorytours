/**
 * The email that goes out at 6 pm the evening before a walk.
 *
 * The confirmation has promised it since the first line — "I'll send the exact
 * meeting point the evening before" — and until now that promise was kept by
 * hand, one WhatsApp message at a time. This is the message that stops people
 * arriving at the wrong end of a boulevard, and the one that stops the
 * no-shows: it names the spot, shows it, links it on a map, and says what the
 * sky will be doing.
 *
 * It refuses to send for a tour whose meeting point has not been set. A vague
 * reminder is worse than none.
 */
import {
  C,
  SANS,
  button,
  esc,
  factTable,
  footer,
  guideCard,
  heading,
  masthead,
  paragraph,
  shell,
  PHONE_DISPLAY,
} from './layout';
import { addMinutes, longDate, money, type Lang } from './format';
import { tourFacts } from './tours';
import type { Forecast } from './weather';
import type { BuiltEmail, EmailBooking } from './types';

const COPY = {
  en: {
    eyebrow: (d: string, t: string) => `tomorrow · ${d}, ${t}`,
    subject: (t: string) => `Tomorrow ${t} — where to find me`,
    preheader: (addr: string, w: string) => `${addr}. ${w}`,
    title: 'Here’s where to find me.',
    lead: (time: string, address: string, detail: string) =>
      `Tomorrow at <strong>${time}</strong> we meet at <strong>${address}</strong>. ${detail} This is the photo — it is the spot you are looking for.`,
    map: 'Open in Google Maps',
    weatherLabel: 'Tomorrow in Paris',
    weather: (start: number, high: number) => `<strong>${start}°C at the start</strong>, up to ${high}°C`,
    weatherRain: (chance: number) => ` · ${chance}% chance of rain during the walk`,
    weatherAdviceRain:
      'Bring a jacket and something for your head. We walk anyway — much of the route is sheltered, and rain suits the story.',
    weatherAdviceCold: 'Dress warmly: two hours outdoors in November is colder than two hours feel indoors.',
    weatherAdviceFine: 'Comfortable shoes and water are all you need.',
    spotTitle: 'On the day',
    spotBody:
      'I arrive ten minutes early. If you can’t see me, or you’re running late, send a WhatsApp — my phone is in my hand until we start.',
    rowPay: 'To pay',
    rowPayValue: (a: string) => `<strong>${a}</strong> · cash or card, at the end`,
    rowFinish: 'We finish',
    rowFinishValue: (time: string, place: string) => `around ${time}, ${place}`,
    rowBring: 'Bring',
    rowBringValue: 'walking shoes, water, a jacket',
    rowGroup: 'Group',
    late: 'Running late? Message me',
    footer: (ref: string, time: string) => `Booking ${ref} · see you tomorrow at ${time}`,
  },
  fr: {
    eyebrow: (d: string, t: string) => `demain · ${d}, ${t}`,
    subject: (t: string) => `Demain ${t} — où me trouver`,
    preheader: (addr: string, w: string) => `${addr}. ${w}`,
    title: 'Voici où me trouver.',
    lead: (time: string, address: string, detail: string) =>
      `Demain à <strong>${time}</strong>, rendez-vous au <strong>${address}</strong>. ${detail} Voici la photo — c’est l’endroit que vous cherchez.`,
    map: 'Ouvrir dans Google Maps',
    weatherLabel: 'Demain à Paris',
    weather: (start: number, high: number) => `<strong>${start}°C au départ</strong>, jusqu’à ${high}°C`,
    weatherRain: (chance: number) => ` · ${chance}% de risque de pluie pendant la visite`,
    weatherAdviceRain:
      'Prenez une veste et de quoi vous couvrir la tête. On marche quand même — une bonne partie du parcours est abritée, et la pluie va bien à l’histoire.',
    weatherAdviceCold: 'Couvrez-vous : deux heures dehors en novembre, c’est plus froid que deux heures ne le laissent croire.',
    weatherAdviceFine: 'Des chaussures confortables et de l’eau suffisent.',
    spotTitle: 'Le jour J',
    spotBody:
      'J’arrive dix minutes en avance. Si vous ne me voyez pas, ou si vous êtes en retard, envoyez un WhatsApp — j’ai mon téléphone en main jusqu’au départ.',
    rowPay: 'À régler',
    rowPayValue: (a: string) => `<strong>${a}</strong> · espèces ou carte, à la fin`,
    rowFinish: 'On termine',
    rowFinishValue: (time: string, place: string) => `vers ${time}, ${place}`,
    rowBring: 'À prendre',
    rowBringValue: 'chaussures de marche, eau, une veste',
    rowGroup: 'Groupe',
    late: 'Un retard ? Écrivez-moi',
    footer: (ref: string, time: string) => `Réservation ${ref} · à demain ${time}`,
  },
} as const;

function weatherAdvice(f: Forecast, t: (typeof COPY)['en'] | (typeof COPY)['fr']): string {
  if (f.rainChance >= 40) return t.weatherAdviceRain;
  if (f.tempStart <= 8) return t.weatherAdviceCold;
  return t.weatherAdviceFine;
}

/** Null when the tour has no confirmed meeting point — the cron then skips it. */
export function buildReminderEmail(
  b: EmailBooking,
  opts: { whatsappUrl: string; forecast?: Forecast | null },
): BuiltEmail | null {
  const lang: Lang = b.lang;
  const t = COPY[lang];
  const facts = tourFacts(b.tour);
  const mp = facts.meetingPoint;
  if (!mp) return null;

  const amount = b.price != null && b.paymentMethod === 'on_site' ? money(b.price, lang) : null;
  const endTime = addMinutes(b.time, facts.durationMinutes);

  const weatherRow = opts.forecast
    ? `<tr><td class="pht-pad" style="padding:22px 30px 0">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.ticket};border:1px solid ${C.lineSoft}">
      <tr><td style="padding:16px 20px;font-family:${SANS}">
        <div style="font-size:10.5px;font-weight:bold;letter-spacing:1.3px;color:${C.gold}">${esc(t.weatherLabel).toUpperCase()}</div>
        <div style="font-size:16px;color:${C.ink};padding-top:5px">${t.weather(opts.forecast.tempStart, opts.forecast.tempHigh)}${opts.forecast.rainChance >= 20 ? t.weatherRain(opts.forecast.rainChance) : ''}</div>
        <div style="font-size:13.5px;line-height:1.55;color:${C.muted};padding-top:4px">${esc(weatherAdvice(opts.forecast, t))}</div>
      </td></tr>
    </table>
  </td></tr>`
    : '';

  const photoRow = mp.photo
    ? `<tr><td class="pht-pad" style="padding:20px 30px 0">
    <img src="${esc(mp.photo)}" width="496" alt="${esc(mp.photoAlt[lang])}" style="display:block;width:100%;max-width:496px;height:auto;border:1px solid ${C.line}">
    <div style="font-family:${SANS};font-size:12px;line-height:1.5;color:${C.faint};padding-top:7px">${esc(mp.address)} · ${esc(mp.transit[lang])}</div>
  </td></tr>`
    : paragraph(`<span style="font-size:13px;color:${C.faint}">${esc(mp.transit[lang])}</span>`, 10);

  const facts2 = [
    ...(amount ? [{ label: t.rowPay, value: t.rowPayValue(amount) }] : []),
    { label: t.rowFinish, value: esc(t.rowFinishValue(endTime, facts.endsAt[lang])) },
    { label: t.rowBring, value: esc(t.rowBringValue) },
  ];

  const rows = [
    masthead(t.eyebrow(longDate(b.dateKey, lang), b.time)),
    heading(t.title),
    paragraph(t.lead(esc(b.time), esc(mp.address), esc(mp.detail[lang]))),
    photoRow,
    button({ href: mp.mapUrl, label: t.map, topPad: 16 }),
    weatherRow,
    guideCard({ title: `<strong>${esc(t.spotTitle)}</strong>`, body: t.spotBody, rule: false, topPad: 24 }),
    factTable(facts2),
    button({ href: opts.whatsappUrl, label: t.late, variant: 'outline', topPad: 20 }),
    footer([`Clément · Paris History Tours · ${PHONE_DISPLAY}`, t.footer(b.ref, b.time)]),
  ].join('\n');

  const plain = (s: string) => s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ');
  const text = [
    t.title,
    '',
    plain(t.lead(b.time, mp.address, mp.detail[lang])),
    mp.transit[lang],
    `${t.map}: ${mp.mapUrl}`,
    '',
    ...(opts.forecast
      ? [
          `${t.weatherLabel}: ${plain(t.weather(opts.forecast.tempStart, opts.forecast.tempHigh))}${opts.forecast.rainChance >= 20 ? plain(t.weatherRain(opts.forecast.rainChance)) : ''}`,
          weatherAdvice(opts.forecast, t),
          '',
        ]
      : []),
    t.spotTitle,
    t.spotBody,
    '',
    ...facts2.map((f) => `${f.label}: ${plain(f.value)}`),
    '',
    `${t.late}: ${opts.whatsappUrl}`,
    '',
    'Clément — Paris History Tours',
  ].join('\n');

  // The Gmail preview line: the address, then the one other thing that changes
  // what someone puts on before leaving.
  const previewTail = opts.forecast
    ? plain(t.weather(opts.forecast.tempStart, opts.forecast.tempHigh)) +
      (opts.forecast.rainChance >= 20 ? plain(t.weatherRain(opts.forecast.rainChance)) : '')
    : mp.transit[lang];

  return {
    subject: t.subject(b.time),
    html: shell({ preheader: t.preheader(mp.address, previewTail), rows }),
    text,
  };
}
