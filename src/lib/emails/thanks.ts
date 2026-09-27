/**
 * The morning-after email.
 *
 * Its job is a Google review, and it has exactly one button for that. The two
 * cards below it are deliberately quiet — a walk that has just ended is a bad
 * moment to sell hard, and a good moment to be remembered. It goes out at 9 am
 * the next day, never the same evening, when people are at dinner.
 *
 * No price is printed for the self-guided tour: that price is tiered in Stripe
 * and would go stale in an email template within weeks.
 */
import {
  C,
  SANS,
  SERIF,
  button,
  esc,
  footer,
  guideCard,
  heading,
  masthead,
  paragraph,
  shell,
  PHONE_DISPLAY,
  SITE,
  SUPPORT_EMAIL,
} from './layout';
import { firstName, type Lang } from './format';
import { tourFacts } from './tours';
import type { BuiltEmail, EmailBooking } from './types';

/**
 * One true detail per tour, so the email reads as if written by the person who
 * was standing there — because it was.
 */
const MEMORY: Record<string, Record<Lang, string>> = {
  'left-bank': {
    en: 'I hope the bullet holes on the Sorbonne wall stay with you. Most people walk past them every day of their lives without ever looking up.',
    fr: 'J’espère que les impacts de balles sur le mur de la Sorbonne vous resteront. La plupart des gens passent devant toute leur vie sans jamais lever les yeux.',
  },
  'right-bank': {
    en: 'I hope the Place Vendôme looks different to you now — a square most visitors photograph for the jewellers, and you know what stood in it.',
    fr: 'J’espère que la place Vendôme n’a plus tout à fait le même visage — une place que la plupart photographient pour les joailliers, et vous savez ce qui s’y tenait.',
  },
};

const COPY = {
  en: {
    eyebrow: (t: string) => `yesterday · ${t}`,
    subject: (n: string) => (n ? `Thank you for walking with me, ${n}` : 'Thank you for walking with me'),
    preheader: 'A word about yesterday — and, if you feel like it, a review.',
    title: 'Thank you for walking with me.',
    ask: 'I run these walks on my own. No agency, no marketing budget — just people finding me on Google. If the two hours were worth it, a few lines there help more than you’d think.',
    review: 'Leave a review on Google',
    reviewNote: 'Takes about a minute',
    stillTitle: 'If you’re still in Paris',
    audioLabel: 'Self-guided audio walk',
    audioTitle: 'The Left Bank again, in my voice, at your pace',
    audioBody: 'Nine sections, archive photographs, works offline — for the corners we didn’t have time for.',
    audioCta: 'See the walk',
    otherLabel: 'The other bank',
    otherTitle: 'WW2 Right Bank · Concorde, Vendôme, Alexandre III',
    otherBody: 'The occupier’s Paris: the requisitioned hotels, the Kommandantur, the Luftwaffe’s headquarters.',
    otherCta: 'See the dates',
    sign: 'And if a question comes back to you next week, just reply. I like those emails.',
  },
  fr: {
    eyebrow: (t: string) => `hier · ${t}`,
    subject: (n: string) => (n ? `Merci d’avoir marché avec moi, ${n}` : 'Merci d’avoir marché avec moi'),
    preheader: 'Un mot sur hier — et, si le cœur vous en dit, un avis.',
    title: 'Merci d’avoir marché avec moi.',
    ask: 'Je fais ces visites seul. Pas d’agence, pas de budget publicitaire — juste des gens qui me trouvent sur Google. Si ces deux heures en valaient la peine, quelques lignes là-bas aident plus que vous ne le croyez.',
    review: 'Laisser un avis sur Google',
    reviewNote: 'Une minute, à peu près',
    stillTitle: 'Si vous êtes encore à Paris',
    audioLabel: 'Visite libre en audio',
    audioTitle: 'La Rive Gauche à nouveau, de ma voix, à votre rythme',
    audioBody: 'Neuf sections, des photographies d’archives, fonctionne hors ligne — pour les coins que nous n’avons pas eu le temps de voir.',
    audioCta: 'Voir la visite',
    otherLabel: 'L’autre rive',
    otherTitle: 'WW2 Rive Droite · Concorde, Vendôme, Alexandre III',
    otherBody: 'Le Paris de l’occupant : les hôtels réquisitionnés, la Kommandantur, l’état-major de la Luftwaffe.',
    otherCta: 'Voir les dates',
    sign: 'Et si une question vous revient la semaine prochaine, répondez simplement. J’aime ces mails-là.',
  },
} as const;

function card(label: string, title: string, body: string, href: string, cta: string): string {
  return `<tr><td class="pht-pad" style="padding:10px 30px 0">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.ticket};border:1px solid ${C.lineSoft}">
    <tr><td style="padding:16px 18px;font-family:${SANS}">
      <div style="font-size:10.5px;font-weight:bold;letter-spacing:1.2px;color:${C.gold}">${esc(label).toUpperCase()}</div>
      <div style="font-size:15.5px;color:${C.ink};padding-top:4px">${esc(title)}</div>
      <div style="font-size:13.5px;line-height:1.55;color:${C.muted};padding-top:4px">${esc(body)} — <a href="${esc(href)}" style="color:${C.rouge};font-weight:bold">${esc(cta)}</a></div>
    </td></tr>
  </table>
</td></tr>`;
}

export function buildThanksEmail(b: EmailBooking, opts: { reviewUrl: string }): BuiltEmail {
  const lang: Lang = b.lang;
  const t = COPY[lang];
  const facts = tourFacts(b.tour);
  const name = firstName(b.name);
  const memory = MEMORY[b.tour]?.[lang];
  const suffix = lang === 'fr' ? '/fr' : '';

  // The Right Bank card is pointless for someone who has just walked it.
  const showOther = b.tour !== 'right-bank';

  const rows = [
    masthead(t.eyebrow(facts.name[lang])),
    heading(t.title),
    paragraph(esc(name ? `${name} — ${memory ?? ''}`.trim() : (memory ?? ''))),
    paragraph(esc(t.ask), 14),
    button({ href: opts.reviewUrl, label: t.review, note: t.reviewNote, topPad: 22 }),
    `<tr><td class="pht-pad" style="padding:28px 30px 0">
      <div style="border-top:1px solid ${C.lineSoft};padding-top:18px;font-family:${SERIF};font-size:18px;color:${C.ink}">${esc(t.stillTitle)}</div>
    </td></tr>`,
    card(t.audioLabel, t.audioTitle, t.audioBody, `${SITE}${suffix}/self-guided-tour`, t.audioCta),
    showOther ? card(t.otherLabel, t.otherTitle, t.otherBody, `${SITE}${suffix}/tours/right-bank`, t.otherCta) : '',
    guideCard({ title: `<strong>Clément</strong>`, body: t.sign, rule: false, topPad: 24 }),
    footer([`Paris History Tours · ${SITE.replace('https://', '')}`, `${SUPPORT_EMAIL} · ${PHONE_DISPLAY}`]),
  ].join('\n');

  const text = [
    t.title,
    '',
    name ? `${name} — ${memory ?? ''}`.trim() : (memory ?? ''),
    '',
    t.ask,
    '',
    `${t.review}: ${opts.reviewUrl}`,
    '',
    t.stillTitle,
    `- ${t.audioTitle} : ${SITE}${suffix}/self-guided-tour`,
    ...(showOther ? [`- ${t.otherTitle} : ${SITE}${suffix}/tours/right-bank`] : []),
    '',
    t.sign,
    'Clément — Paris History Tours',
  ].join('\n');

  return { subject: t.subject(name), html: shell({ preheader: t.preheader, rows }), text };
}

/** Google's "write a review" deep link for the place id we already configure. */
export function googleReviewUrl(placeId?: string): string {
  return placeId
    ? `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`
    : 'https://www.google.com/maps/search/?api=1&query=Paris+History+Tours';
}
