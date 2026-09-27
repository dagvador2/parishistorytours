/**
 * The confirmation the customer gets the moment they book.
 *
 * One template, three states, because they are the same document with a
 * different answer to "is this settled?":
 *   paid     — money taken, nothing to do
 *   on_site  — place held, money on the day
 *   request  — private tour, nothing held and nothing charged yet
 *
 * The old version told on-site bookers "thank you for your booking request"
 * while also telling them the booking was confirmed, because the on-site
 * branch reused the request wording. They are three states now, and each one
 * says one thing.
 */
import {
  C,
  bullets,
  button,
  esc,
  footer,
  guideCard,
  heading,
  masthead,
  notice,
  paragraph,
  sectionTitle,
  shell,
  steps,
  ticket,
  type TicketRow,
  PHONE_DISPLAY,
  SUPPORT_EMAIL,
  SITE,
} from './layout';
import { firstName, longDate, money, people, shortDate, weekday, weekdayBefore, type Lang } from './format';
import { tourFacts } from './tours';
import type { BuiltEmail, EmailBooking } from './types';

export type ConfirmationState = 'paid' | 'on_site' | 'request';

export function confirmationState(b: EmailBooking): ConfirmationState {
  if (b.paymentMethod === 'on_site') return 'on_site';
  if (b.tourType === 'private') return 'request';
  return 'paid';
}

const COPY = {
  en: {
    eyebrowTour: (t: string) => `${t} · walking tour`,
    eyebrowRequest: (t: string) => `${t} · private tour request`,
    subjectConfirmed: (t: string, d: string, h: string) => `Confirmed · ${t}, ${d} at ${h}`,
    subjectRequest: (d: string) => `Received · your private tour request for ${d}`,
    preheaderOnSite: (a: string, where: string | null) =>
      `${where ? `We meet at ${where}.` : 'The exact meeting point reaches you the evening before.'} ${a} to settle on the day.`,
    preheaderPaid: (where: string | null) =>
      `Paid and settled. ${where ? `We meet at ${where}.` : 'The exact meeting point reaches you the evening before.'}`,
    preheaderRequest: 'I check the slot and come back to you within 24 hours, usually sooner.',
    titleBooked: (n: string) => (n ? `You’re booked, ${n}.` : 'You’re booked.'),
    titleRequest: (n: string) => (n ? `Got it, ${n}.` : 'Got it.'),
    leadOnSite: (where: string | null) =>
      where
        ? `Your place is held. We meet at ${where} — the evening before, I’ll send a reminder with the map and the weather.`
        : 'Your place is held. I’ll send the exact meeting point the evening before the walk, with a photo of the spot so you can’t miss it.',
    leadPaid: (where: string | null) =>
      where
        ? `Paid and confirmed — nothing left to do. We meet at ${where}; the evening before, I’ll send a reminder with the map and the weather.`
        : 'Paid and confirmed — nothing left to do. I’ll send the exact meeting point the evening before the walk, with a photo of the spot so you can’t miss it.',
    leadRequest:
      'Your request has reached me. I guide every tour myself, so I check the slot against my own diary before I answer — within 24 hours, usually the same evening.',
    rowTour: 'Tour',
    rowGroup: 'Group',
    rowOnFoot: 'On foot',
    rowMeeting: 'Meeting point',
    rowLanguage: 'Language',
    rowEstimate: 'Estimate',
    rowReference: 'Reference',
    smallGroup: 'small group, 10 max',
    yourPartyOnly: 'your party only',
    forTheGroup: (a: string) => `${a} for the group`,
    guidedIn: (l: Lang) => (l === 'fr' ? 'guided in French' : 'guided in English'),
    timeNote: 'Paris time · please arrive 10 minutes early',
    timeNoteRequest: 'Paris time · nothing is charged yet',
    requested: (d: string) => `requested · ${d}`,
    awaiting: 'awaiting my reply',
    toPay: 'To pay on the day',
    toPayNote: 'cash or card, I carry a reader',
    paid: 'Paid in full',
    calendar: 'Add to your calendar',
    calendarNote: 'The .ics file is attached to this email',
    nextTitle: 'What happens next',
    stepBefore: (day: string, known: boolean) => ({
      lead: `${day}, 6 pm.`,
      rest: known
        ? 'A reminder lands in your inbox — the map, a photo of the spot, and tomorrow’s weather.'
        : 'I email you the exact meeting point, with a photo and a map link.',
    }),
    stepArrive: (day: string, time: string) => ({
      lead: `${day}, ${time}.`,
      rest: 'I’ll be there, waiting for you.',
    }),
    stepEndPay: (place: string, amount: string) => ({
      lead: 'At the end,',
      rest: `you settle the ${amount} — we finish ${place}.`,
    }),
    stepEnd: (place: string) => ({ lead: 'Two hours later,', rest: `we finish ${place}.` }),
    stepReply: { lead: 'Within 24 hours,', rest: 'I confirm the slot or propose the nearest one that works.' },
    stepConfirm: { lead: 'You confirm,', rest: 'and pay online or on the day — whichever suits you.' },
    stepMeeting: {
      lead: 'The evening before,',
      rest: 'you get the meeting point with a photo and a map link.',
    },
    beforeTitle: 'Before you come',
    before: (day: string, refundable: boolean) => [
      'Comfortable shoes are all you need.',
      'Children are welcome.',
      ...(refundable ? [`Free cancellation until ${day}. Cancelled on the day itself, half the amount is refunded.`] : []),
    ],
    privateNote:
      'A private walk bends to you: we can slow down at one stop, add another, or start an hour later. Tell me what matters to your group and I’ll shape it.',
    guideTitle: '<strong>Clément</strong> — your guide on the day',
    guideTitleRequest: '<strong>Clément</strong> — I’ll be the one replying',
    guideBody: 'Anything at all before the walk — a question, a delay, a change of plan — write to me. I answer myself.',
    guideBodyRequest: 'In a hurry, or travelling tomorrow? WhatsApp is faster than email.',
    whatsapp: 'Message me on WhatsApp',
    footerBooking: (ref: string, day: string | null) =>
      day ? `Booking ${ref} · free cancellation until ${day}` : `Booking ${ref}`,
    footerRequest: (ref: string) => `Request ${ref} · no payment taken at this stage`,
  },
  fr: {
    eyebrowTour: (t: string) => `${t} · visite guidée`,
    eyebrowRequest: (t: string) => `${t} · demande de visite privée`,
    subjectConfirmed: (t: string, d: string, h: string) => `Confirmé · ${t}, ${d} à ${h}`,
    subjectRequest: (d: string) => `Bien reçu · votre demande de visite privée du ${d}`,
    preheaderOnSite: (a: string, where: string | null) =>
      `${where ? `Rendez-vous au ${where}.` : 'Le point de rendez-vous exact vous arrive la veille.'} ${a} à régler sur place.`,
    preheaderPaid: (where: string | null) =>
      `Payé, c’est réglé. ${where ? `Rendez-vous au ${where}.` : 'Le point de rendez-vous exact vous arrive la veille.'}`,
    preheaderRequest: 'Je vérifie le créneau et je vous réponds sous 24 h, souvent bien avant.',
    titleBooked: (n: string) => (n ? `C’est réservé, ${n}.` : 'C’est réservé.'),
    titleRequest: (n: string) => (n ? `Bien reçu, ${n}.` : 'Bien reçu.'),
    leadOnSite: (where: string | null) =>
      where
        ? `Votre place est retenue. Rendez-vous au ${where} — la veille au soir, je vous envoie un rappel avec la carte et la météo.`
        : 'Votre place est retenue. Je vous envoie le point de rendez-vous exact la veille au soir, avec une photo du lieu pour que vous ne puissiez pas le manquer.',
    leadPaid: (where: string | null) =>
      where
        ? `Payé et confirmé — vous n’avez plus rien à faire. Rendez-vous au ${where} ; la veille au soir, je vous envoie un rappel avec la carte et la météo.`
        : 'Payé et confirmé — vous n’avez plus rien à faire. Je vous envoie le point de rendez-vous exact la veille au soir, avec une photo du lieu.',
    leadRequest:
      'Votre demande m’est bien parvenue. Je guide chaque visite moi-même, je vérifie donc le créneau dans mon propre agenda avant de vous répondre — sous 24 h, souvent le soir même.',
    rowTour: 'Visite',
    rowGroup: 'Groupe',
    rowOnFoot: 'À pied',
    rowMeeting: 'Rendez-vous',
    rowLanguage: 'Langue',
    rowEstimate: 'Estimation',
    rowReference: 'Référence',
    smallGroup: 'petit groupe, 10 max',
    yourPartyOnly: 'votre groupe uniquement',
    forTheGroup: (a: string) => `${a} pour le groupe`,
    guidedIn: (l: Lang) => (l === 'fr' ? 'guidée en français' : 'guidée en anglais'),
    timeNote: 'heure de Paris · merci d’arriver 10 minutes avant',
    timeNoteRequest: 'heure de Paris · rien n’est encore débité',
    requested: (d: string) => `souhaité · ${d}`,
    awaiting: 'en attente de ma réponse',
    toPay: 'À régler le jour même',
    toPayNote: 'espèces ou carte, j’ai un lecteur',
    paid: 'Payé en totalité',
    calendar: 'Ajouter à mon agenda',
    calendarNote: 'Le fichier .ics est joint à ce mail',
    nextTitle: 'Ce qui se passe ensuite',
    stepBefore: (day: string, known: boolean) => ({
      lead: `${day}, 18 h.`,
      rest: known
        ? 'un rappel arrive dans votre boîte — la carte, une photo du lieu, et la météo du lendemain.'
        : 'je vous envoie le point de rendez-vous exact, avec une photo et un lien vers la carte.',
    }),
    stepArrive: (day: string, time: string) => ({
      lead: `${day}, ${time}.`,
      rest: 'je suis là, à vous attendre.',
    }),
    stepEndPay: (place: string, amount: string) => ({
      lead: 'À la fin,',
      rest: `vous réglez les ${amount} — nous terminons ${place}.`,
    }),
    stepEnd: (place: string) => ({ lead: 'Deux heures plus tard,', rest: `nous terminons ${place}.` }),
    stepReply: { lead: 'Sous 24 h,', rest: 'je confirme le créneau ou je vous en propose un tout proche.' },
    stepConfirm: { lead: 'Vous confirmez,', rest: 'et vous payez en ligne ou sur place — comme vous préférez.' },
    stepMeeting: {
      lead: 'La veille au soir,',
      rest: 'vous recevez le point de rendez-vous avec une photo et un lien vers la carte.',
    },
    beforeTitle: 'Avant de venir',
    before: (day: string, refundable: boolean) => [
      'Des chaussures confortables, c’est tout ce qu’il vous faut.',
      'Les enfants sont les bienvenus.',
      ...(refundable ? [`Annulation gratuite jusqu’au ${day}. Annulée le jour même, la moitié du montant est remboursée.`] : []),
    ],
    privateNote:
      'Une visite privée s’adapte à vous : on peut s’attarder sur un arrêt, en ajouter un autre, ou partir une heure plus tard. Dites-moi ce qui compte pour votre groupe et je la façonne.',
    guideTitle: '<strong>Clément</strong> — votre guide le jour J',
    guideTitleRequest: '<strong>Clément</strong> — c’est moi qui vous répondrai',
    guideBody:
      'La moindre question avant la visite — un imprévu, un retard, un changement — écrivez-moi. C’est moi qui réponds.',
    guideBodyRequest: 'Pressé, ou vous voyagez demain ? WhatsApp va plus vite que le mail.',
    whatsapp: 'M’écrire sur WhatsApp',
    footerBooking: (ref: string, day: string | null) =>
      day ? `Réservation ${ref} · annulation gratuite jusqu’au ${day}` : `Réservation ${ref}`,
    footerRequest: (ref: string) => `Demande ${ref} · aucun paiement à ce stade`,
  },
} as const;

export function buildConfirmationEmail(
  b: EmailBooking,
  opts: { whatsappUrl: string; calendarUrl?: string },
): BuiltEmail {
  const lang = b.lang;
  const t = COPY[lang];
  const facts = tourFacts(b.tour);
  const state = confirmationState(b);
  const name = firstName(b.name);
  const tour = facts.name[lang];
  const dateLong = longDate(b.dateKey, lang);
  const dayBeforeName = weekdayBefore(b.dateKey, lang);
  const amount = b.price != null ? money(b.price, lang) : null;
  // The address goes into the confirmation itself as soon as it is known —
  // promising it "the evening before" when it is already decided reads oddly.
  const where = facts.meetingPoint?.address ?? null;

  // ── ticket rows ─────────────────────────────────────────────────────────
  const rows: TicketRow[] = [
    { label: t.rowTour, value: esc(state === 'request' ? `${tour} · ${lang === 'fr' ? 'privée' : 'private'}` : tour) },
    {
      label: t.rowGroup,
      value: esc(`${people(b.participants, lang)} · ${state === 'request' ? t.yourPartyOnly : t.smallGroup}`),
    },
  ];
  if (state !== 'request') rows.push({ label: t.rowOnFoot, value: esc(facts.onFoot[lang]) });
  if (state !== 'request' && where) rows.push({ label: t.rowMeeting, value: `<strong>${esc(where)}</strong>` });
  // Printed only once a session carries a language of its own; until then the
  // row would be a guess, and a wrong guess here strands someone on a pavement.
  if (b.tourLanguage) rows.push({ label: t.rowLanguage, value: `<strong>${esc(t.guidedIn(b.tourLanguage))}</strong>` });
  if (state === 'request' && amount) rows.push({ label: t.rowEstimate, value: t.forTheGroup(amount) });
  rows.push({ label: t.rowReference, value: esc(b.ref) });

  // ── the three states ────────────────────────────────────────────────────
  const isRequest = state === 'request';
  const subject = isRequest
    ? t.subjectRequest(shortDate(b.dateKey, lang))
    : t.subjectConfirmed(tour, shortDate(b.dateKey, lang), b.time);
  const preheader = isRequest
    ? t.preheaderRequest
    : state === 'on_site'
      ? t.preheaderOnSite(amount ?? '', where)
      : t.preheaderPaid(where);

  const stepList = isRequest
    ? [t.stepReply, t.stepConfirm, t.stepMeeting]
    : [
        t.stepBefore(dayBeforeName, where !== null),
        t.stepArrive(weekday(b.dateKey, lang), b.time),
        state === 'on_site' && amount
          ? t.stepEndPay(facts.endsAt[lang], amount.replace(/&nbsp;/g, ' '))
          : t.stepEnd(facts.endsAt[lang]),
      ];

  // Only money already taken can be refunded, so only a paid booking gets a
  // cancellation line; on-site bookers simply do not come.
  const cancelDay = state === 'paid' ? weekdayBefore(b.dateKey, lang) : null;

  const rowsHtml = [
    masthead(isRequest ? t.eyebrowRequest(tour) : t.eyebrowTour(tour)),
    heading(isRequest ? t.titleRequest(name) : t.titleBooked(name)),
    paragraph(esc(isRequest ? t.leadRequest : state === 'on_site' ? t.leadOnSite(where) : t.leadPaid(where))),
    ticket({
      dateLine: isRequest ? t.requested(dateLong) : dateLong,
      time: b.time,
      timeNote: isRequest ? t.timeNoteRequest : t.timeNote,
      rows,
      accent: isRequest ? C.gold : C.rouge,
      status: isRequest ? t.awaiting : undefined,
    }),
    !isRequest && state === 'on_site' && amount
      ? notice({ label: t.toPay, value: `<strong>${amount}</strong> <span style="font-size:14px;color:${C.muted}">· ${esc(t.toPayNote)}</span>`, tone: 'gold' })
      : '',
    !isRequest && state === 'paid' && amount
      ? notice({ label: t.paid, value: `<strong>${amount}</strong>`, tone: 'teal' })
      : '',
    !isRequest && opts.calendarUrl
      ? button({ href: opts.calendarUrl, label: t.calendar, variant: 'outline', note: t.calendarNote })
      : '',
    sectionTitle(t.nextTitle),
    steps(stepList),
    isRequest ? paragraph(esc(t.privateNote), 24) : sectionTitle(t.beforeTitle, 24),
    isRequest ? '' : bullets(t.before(cancelDay ?? '', state === 'paid')),
    guideCard({
      title: isRequest ? t.guideTitleRequest : t.guideTitle,
      body: isRequest ? t.guideBodyRequest : t.guideBody,
      cta: { href: opts.whatsappUrl, label: t.whatsapp },
      topPad: isRequest ? 24 : 26,
    }),
    footer([
      `Paris History Tours · ${SITE.replace('https://', '')}`,
      `${SUPPORT_EMAIL} · ${PHONE_DISPLAY}`,
      isRequest ? t.footerRequest(b.ref) : t.footerBooking(b.ref, cancelDay),
    ]),
  ].join('\n');

  const strip = (s: string) => s.replace(/&nbsp;/g, ' ');
  const text = [
    isRequest ? t.titleRequest(name) : t.titleBooked(name),
    '',
    isRequest ? t.leadRequest : state === 'on_site' ? t.leadOnSite(where) : t.leadPaid(where),
    '',
    `${dateLong} — ${b.time} (${isRequest ? t.timeNoteRequest : t.timeNote})`,
    ...rows.map((r) => `${r.label}: ${strip(r.value.replace(/<[^>]+>/g, ''))}`),
    '',
    ...(state === 'on_site' && amount ? [`${t.toPay}: ${strip(amount)} (${t.toPayNote})`, ''] : []),
    ...(state === 'paid' && amount ? [`${t.paid}: ${strip(amount)}`, ''] : []),
    t.nextTitle,
    ...stepList.map((s, i) => `${i + 1}. ${s.lead} ${s.rest}`),
    '',
    ...(isRequest ? [t.privateNote] : [t.beforeTitle, ...t.before(cancelDay ?? '', state === 'paid').map((x) => `- ${x}`)]),
    '',
    `${t.whatsapp}: ${opts.whatsappUrl}`,
    '',
    'Clément — Paris History Tours',
    `${SUPPORT_EMAIL} · ${PHONE_DISPLAY}`,
  ].join('\n');

  return { subject, html: shell({ preheader, rows: rowsHtml }), text };
}
