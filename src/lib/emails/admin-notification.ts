/**
 * The notification Clément gets. In French, and built to be dealt with on a
 * phone between two tours.
 *
 * Everything that matters is in the subject line, so a glance at the lock
 * screen is often the whole interaction. When it is opened, the first thing
 * under the thumb is a row of one-tap actions — WhatsApp, call, reply, add to
 * calendar — because the previous version printed a phone number as text and
 * left the copying to a human standing on a boulevard.
 */
import { C, SANS, SERIF, esc, shell } from './layout';
import { longDate, money, people, shortDate } from './format';
import { tourFacts } from './tours';
import { googleCalendarUrl } from './ics';
import type { BuiltEmail, EmailBooking } from './types';

/** Other people already on the same session — the context a solo guide needs. */
export interface SessionContext {
  booked: number;
  maxSpots: number;
  others: Array<{ name: string; participants: number; paymentMethod?: string | null }>;
}

type State = 'paid' | 'on_site' | 'request';

const STATES: Record<State, { banner: (a: string) => string; subject: string; colour: string }> = {
  paid: { banner: (a) => `PAYÉ · ${a} ENCAISSÉS`, subject: 'PAYÉ', colour: C.teal },
  on_site: { banner: (a) => `PAIEMENT SUR PLACE · ${a} À ENCAISSER`, subject: 'SUR PLACE', colour: C.gold },
  request: { banner: () => 'DEMANDE PRIVÉE · À CONFIRMER SOUS 24 H', subject: 'PRIVÉ', colour: C.gold },
};

/** Digits only, international format, for wa.me and tel:. */
function phoneDigits(phone?: string | null): string | null {
  const digits = (phone ?? '').replace(/[^\d]/g, '');
  return digits.length >= 8 ? digits : null;
}

function actionButton(href: string, label: string, solid = false): string {
  const style = solid
    ? `background:${C.ink};color:#ffffff;border:1px solid ${C.ink}`
    : `background:${C.card};color:${C.ink};border:1px solid ${C.outline}`;
  return `<td style="padding:0 7px 7px 0"><a href="${esc(href)}" style="display:inline-block;font-family:${SANS};font-size:13px;font-weight:bold;text-decoration:none;padding:10px 15px;${style}">${esc(label)}</a></td>`;
}

export function buildAdminEmail(
  b: EmailBooking,
  opts: { state: State; context?: SessionContext | null },
): BuiltEmail {
  const facts = tourFacts(b.tour);
  const tour = facts.name.fr;
  const amount = b.price != null ? money(b.price, 'fr') : '—';
  const amountPlain = amount.replace(/&nbsp;/g, ' ');
  const s = STATES[opts.state];
  const dateLong = longDate(b.dateKey, 'fr');
  const digits = phoneDigits(b.phone);

  const subject = `${s.subject} · ${b.participants} pax · ${shortDate(b.dateKey, 'fr')} ${b.time} · ${b.name}`;
  const preheader =
    opts.state === 'request'
      ? `Demande privée pour ${b.participants} personnes. À confirmer sous 24 h.`
      : `${amountPlain} ${opts.state === 'on_site' ? 'à encaisser le jour même' : 'encaissés'}.` +
        (opts.context ? ` ${opts.context.booked} inscrits sur ${opts.context.maxSpots} à ce créneau.` : '');

  // ── actions ─────────────────────────────────────────────────────────────
  const actions = [
    digits ? actionButton(`https://wa.me/${digits}`, 'WhatsApp', true) : '',
    digits ? actionButton(`tel:+${digits}`, 'Appeler') : '',
    actionButton(`mailto:${b.email}`, 'Répondre'),
    actionButton(
      googleCalendarUrl({
        dateKey: b.dateKey,
        time: b.time,
        durationMinutes: facts.durationMinutes,
        summary: `${tour} — ${b.name} (${b.participants} pax)`,
        description: `${b.email}${b.phone ? ` · ${b.phone}` : ''} · ${amountPlain}`,
        location: facts.meetingPoint?.address ?? 'Paris',
      }),
      'Agenda',
    ),
  ].join('');

  // ── fiche ───────────────────────────────────────────────────────────────
  const fiche: Array<[string, string]> = [
    ['Téléphone', b.phone ? esc(b.phone) : '<span style="color:' + C.faint + '">non renseigné</span>'],
    ['Email', esc(b.email)],
    ['Montant', `<strong>${amount}</strong> · ${opts.state === 'on_site' ? 'sur place' : opts.state === 'paid' ? 'payé en ligne' : 'estimation'}`],
    ['Langue du mail', b.lang === 'fr' ? 'français' : 'anglais'],
    ...(b.tourLanguage ? ([['Langue de la visite', b.tourLanguage === 'fr' ? 'français' : 'anglais']] as Array<[string, string]>) : []),
    ...(b.source && b.source !== 'direct' ? ([['Source', esc(b.source)]] as Array<[string, string]>) : []),
    ['Référence', esc(b.ref)],
  ];
  const ficheRows = fiche
    .map(
      ([label, value], i) => `<tr>
      <td style="padding:10px 0;font-family:${SANS};font-size:11px;letter-spacing:.9px;color:${C.faint};width:34%;${i === fiche.length - 1 ? '' : `border-bottom:1px solid ${C.hair}`}">${label.toUpperCase()}</td>
      <td style="padding:10px 0;font-family:${SANS};font-size:14.5px;color:${C.ink};text-align:right;${i === fiche.length - 1 ? '' : `border-bottom:1px solid ${C.hair}`}">${value}</td>
    </tr>`,
    )
    .join('');

  // ── message client ──────────────────────────────────────────────────────
  const messageBlock = b.message
    ? `<tr><td style="padding:6px 22px 0">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.ticket};border-left:3px solid ${C.outline}">
      <tr><td style="padding:12px 16px;font-family:${SANS}">
        <div style="font-size:10.5px;font-weight:bold;letter-spacing:1.1px;color:${C.faint}">MESSAGE DU CLIENT</div>
        <div style="font-size:14px;line-height:1.55;color:${C.ink2};padding-top:5px">« ${esc(b.message)} »</div>
      </td></tr>
    </table>
  </td></tr>`
    : '';

  // ── contexte du créneau ─────────────────────────────────────────────────
  const ctx = opts.context;
  const contextBlock = ctx
    ? `<tr><td style="padding:18px 22px 0">
    <div style="font-family:${SANS};font-size:10.5px;font-weight:bold;letter-spacing:1.3px;color:${C.faint}">LE CRÉNEAU DE ${esc(b.time)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:8px;font-family:${SANS};font-size:14px;color:${C.ink2}">
      ${ctx.others
        .map(
          (o) => `<tr>
        <td style="padding:5px 0;border-bottom:1px solid ${C.hair}">${esc(o.name)} · ${o.participants} pax</td>
        <td align="right" style="padding:5px 0;border-bottom:1px solid ${C.hair};color:${o.paymentMethod === 'on_site' ? C.gold : C.teal}">${o.paymentMethod === 'on_site' ? 'sur place' : 'payé'}</td>
      </tr>`,
        )
        .join('')}
      <tr>
        <td style="padding:7px 0;font-weight:bold;color:${C.ink}">${ctx.booked} inscrits sur ${ctx.maxSpots}</td>
        <td align="right" style="padding:7px 0;color:${C.faint}">${Math.max(0, ctx.maxSpots - ctx.booked)} places restantes</td>
      </tr>
    </table>
  </td></tr>`
    : '';

  const rows = `
  <tr><td style="background:${s.colour};padding:9px 22px;font-family:${SANS};font-size:11px;font-weight:bold;letter-spacing:1.6px;color:#ffffff">${esc(s.banner(amountPlain))}</td></tr>
  <tr><td style="padding:20px 22px 0;font-family:${SANS}">
    <div style="font-size:11px;font-weight:bold;letter-spacing:1.3px;color:${C.faint}">${esc(dateLong).toUpperCase()}</div>
    <div style="font-family:${SERIF};font-size:30px;line-height:1.15;color:${C.ink};padding-top:3px">${esc(b.time)} · ${b.participants} pax</div>
    <div style="font-size:15px;color:${C.ink2};padding-top:4px">${esc(b.name)} · ${esc(tour)} · ${esc(b.tourType === 'private' ? 'visite privée' : 'groupe régulier')}</div>
  </td></tr>
  <tr><td style="padding:16px 22px 0">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>${actions}</tr></table>
  </td></tr>
  <tr><td style="padding:14px 22px 0">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-family:${SANS};border-top:1px solid ${C.lineSoft}">${ficheRows}</table>
  </td></tr>
  ${messageBlock}
  ${contextBlock}
  <tr><td style="padding:18px 22px 24px">
    <div style="border-top:1px solid ${C.lineSoft};padding-top:12px;font-family:${SANS};font-size:12px;line-height:1.6;color:${C.faint}">
      ${opts.state === 'request' ? 'À confirmer : réponds sous 24 h.' : `Rappel automatique au client : <strong style="color:${C.ink2}">la veille à 18:00</strong>`}<br>
      Répondre à ce mail écrit directement à ${esc(b.name)}.
    </div>
  </td></tr>`;

  const text = [
    s.banner(amountPlain),
    `${dateLong} · ${b.time} · ${people(b.participants, 'fr')}`,
    `${b.name} · ${tour} · ${b.tourType === 'private' ? 'visite privée' : 'groupe régulier'}`,
    '',
    ...fiche.map(([label, value]) => `${label}: ${value.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ')}`),
    ...(b.message ? ['', `Message du client : « ${b.message} »`] : []),
    ...(ctx ? ['', `Créneau de ${b.time} : ${ctx.booked} inscrits sur ${ctx.maxSpots}.`] : []),
    ...(digits ? ['', `WhatsApp : https://wa.me/${digits}`] : []),
  ].join('\n');

  return { subject, html: shell({ preheader, rows }), text };
}
