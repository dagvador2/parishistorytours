/**
 * Renders every transactional email to .email-preview/ so they can be opened
 * in a browser without sending anything.
 *
 * `pnpm emails:preview` — then open .email-preview/index.html.
 *
 * Nothing here touches Resend or Supabase: the builders are pure, which is
 * the whole reason they were split out of the sending layer. Use it after
 * editing copy, and before deploying anything that changes a template.
 */
import fs from 'node:fs';
import path from 'node:path';
import { buildConfirmationEmail } from '../../src/lib/emails/booking-confirmation';
import { buildAdminEmail } from '../../src/lib/emails/admin-notification';
import { buildReminderEmail } from '../../src/lib/emails/reminder';
import { buildThanksEmail, googleReviewUrl } from '../../src/lib/emails/thanks';
import type { EmailBooking } from '../../src/lib/emails/types';
import type { Lang } from '../../src/lib/emails/format';

const OUT = path.resolve('.email-preview');

const base: EmailBooking = {
  ref: 'PHT-7431',
  name: 'Gillian Chan',
  email: 'gillianachan@gmail.com',
  phone: '+1 905 516 4780',
  message: 'My grandfather was with the Canadian forces in 1944 — is there any chance we pass the spot where they entered the city?',
  tour: 'left-bank',
  tourType: 'regular',
  participants: 1,
  dateKey: '2026-11-15',
  time: '10:30',
  price: 59,
  paymentMethod: 'on_site',
  lang: 'en',
  tourLanguage: null,
  source: 'direct',
};

const wa = 'https://wa.me/33620622480';
const cal = 'https://calendar.google.com/calendar/render?action=TEMPLATE';

function variants(lang: Lang) {
  const b = (over: Partial<EmailBooking>): EmailBooking => ({ ...base, lang, ...over });
  return [
    {
      slug: `confirmation-on-site-${lang}`,
      title: `Confirmation · paiement sur place · ${lang.toUpperCase()}`,
      mail: buildConfirmationEmail(b({ paymentMethod: 'on_site' }), { whatsappUrl: wa, calendarUrl: cal }),
    },
    {
      slug: `confirmation-paid-${lang}`,
      title: `Confirmation · payé en ligne · ${lang.toUpperCase()}`,
      mail: buildConfirmationEmail(b({ paymentMethod: 'stripe', participants: 2, price: 118 }), {
        whatsappUrl: wa,
        calendarUrl: cal,
      }),
    },
    {
      slug: `confirmation-private-${lang}`,
      title: `Confirmation · demande privée · ${lang.toUpperCase()}`,
      mail: buildConfirmationEmail(b({ tourType: 'private', paymentMethod: null, participants: 4, price: 320 }), {
        whatsappUrl: wa,
      }),
    },
    {
      slug: `confirmation-on-site-other-language-${lang}`,
      title: `Confirmation · visite guidée dans l'autre langue · ${lang.toUpperCase()}`,
      mail: buildConfirmationEmail(b({ tourLanguage: lang === 'fr' ? 'en' : 'fr' }), {
        whatsappUrl: wa,
        calendarUrl: cal,
      }),
    },
    {
      slug: `reminder-${lang}`,
      title: `Rappel J-1 · ${lang.toUpperCase()}`,
      mail: buildReminderEmail(b({}), {
        whatsappUrl: wa,
        forecast: { tempStart: 9, tempHigh: 12, rainChance: 55 },
      }),
    },
    {
      slug: `thanks-${lang}`,
      title: `Merci J+1 · ${lang.toUpperCase()}`,
      mail: buildThanksEmail(b({}), { reviewUrl: googleReviewUrl('PLACE_ID') }),
    },
  ];
}

const admin = [
  {
    slug: 'admin-on-site',
    title: 'Admin · paiement sur place',
    mail: buildAdminEmail(base, {
      state: 'on_site',
      context: {
        booked: 3,
        maxSpots: 10,
        others: [{ name: 'Marta Reyes', participants: 2, paymentMethod: 'stripe' }],
      },
    }),
  },
  {
    slug: 'admin-paid',
    title: 'Admin · payé en ligne',
    mail: buildAdminEmail({ ...base, paymentMethod: 'stripe', message: null, participants: 2, price: 118 }, {
      state: 'paid',
      context: { booked: 5, maxSpots: 10, others: [{ name: 'Tom Ek', participants: 3, paymentMethod: 'stripe' }] },
    }),
  },
  {
    slug: 'admin-private',
    title: 'Admin · demande privée',
    mail: buildAdminEmail({ ...base, tourType: 'private', paymentMethod: null, participants: 4, price: 320 }, {
      state: 'request',
      context: null,
    }),
  },
];

const all = [...variants('en'), ...variants('fr'), ...admin].filter((v) => v.mail !== null) as Array<{
  slug: string;
  title: string;
  mail: { subject: string; html: string; text: string };
}>;

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

for (const v of all) {
  fs.writeFileSync(path.join(OUT, `${v.slug}.html`), v.mail.html);
  fs.writeFileSync(path.join(OUT, `${v.slug}.txt`), `Subject: ${v.mail.subject}\n\n${v.mail.text}\n`);
}

const index = `<!doctype html><meta charset="utf-8"><title>Aperçu des mails</title>
<style>
  body{margin:0;font:15px/1.6 -apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;background:#e7e8ea;color:#1c1d20}
  header{padding:28px 24px;border-bottom:1px solid #d3d5d9}
  h1{margin:0;font-size:22px}
  p{margin:6px 0 0;color:#62646a}
  ul{list-style:none;margin:0;padding:18px 24px;display:grid;gap:10px;grid-template-columns:repeat(auto-fill,minmax(320px,1fr))}
  li{background:#fff;border:1px solid #d3d5d9;padding:14px 16px}
  a{color:#8a3b2e;font-weight:600;text-decoration:none}
  code{font-size:12.5px;color:#62646a;display:block;margin-top:4px;overflow-wrap:anywhere}
</style>
<header><h1>Aperçu des mails</h1><p>${all.length} messages rendus. Le fichier .txt à côté de chacun est la version texte réellement envoyée.</p></header>
<ul>${all
  .map(
    (v) =>
      `<li><a href="${v.slug}.html">${v.title}</a> · <a href="${v.slug}.txt" style="font-weight:400">texte</a><code>${v.mail.subject.replace(/</g, '&lt;')}</code></li>`,
  )
  .join('')}</ul>`;
fs.writeFileSync(path.join(OUT, 'index.html'), index);

console.log(`${all.length} mails écrits dans ${OUT}`);
console.log(`Ouvrir : ${path.join(OUT, 'index.html')}`);
