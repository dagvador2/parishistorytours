/**
 * Transactional email of the self-guided tour purchase (Resend), EN + FR.
 *
 * No attachment: the printed guide is exactly what the web app exists to keep
 * inside the app, so it is never emailed. A short welcome PDF can be attached
 * later by passing `attachment`.
 */
import { Resend } from "resend";
import { SUPPORT_EMAIL, type DigitalPurchase } from "./purchase";

const FROM = `Paris History Tours <${SUPPORT_EMAIL}>`;

const COPY = {
  en: {
    subject: "Your WWII Left Bank Self-Guided Tour is ready 🎧",
    hello: (name: string) => (name ? `Hello ${name},` : "Hello,"),
    intro: "Thank you for your purchase. Your self-guided tour of the Left Bank is ready: nine audio sections narrated in my own voice, a map that guides you from stop to stop, and the archive photographs, synchronised with the narration.",
    cta: "Open the tour",
    how: [
      "Open the link on your phone. It is your personal access.",
      "The audio starts when you reach each stop. Subtitles and photos follow the narration.",
      "Open the page once on wifi and wait for “Ready for offline use”: the whole tour is then stored on your phone and works without data.",
    ],
    validTitle: "Your access",
    valid: (days: number, date: string) => `The link works for ${days} days, until ${date}. Walk the tour during your stay; once the page is loaded on wifi it keeps working offline for the rest of that window.`,
    validLater: (opens: string, until: string) => `You chose to walk on a later date, so the tour opens on the evening of ${opens} and stays open until ${until}. Until then this email is all you need — the link will simply say it is not open yet.`,
    checklistTitle: "Before you leave",
    checklist: ["Charge your phone and bring headphones.", "Start at 60 Boulevard Saint-Michel, in front of the building.", "Count about 90 minutes for the 2 km."],
    support: `Questions? Reply to this email. Enjoy the walk.`,
    sign: "Clément — Paris History Tours",
    locale: "en-GB",
  },
  fr: {
    subject: "Votre tour autoguidé Rive Gauche est prêt 🎧",
    hello: (name: string) => (name ? `Bonjour ${name},` : "Bonjour,"),
    intro: "Merci pour votre achat. Votre visite libre de la Rive Gauche est prête : neuf sections audio racontées de ma propre voix, une carte qui vous guide d’étape en étape, et les photographies d’archives, synchronisées avec la narration.",
    cta: "Ouvrir la visite",
    how: [
      "Ouvrez le lien sur votre téléphone. C’est votre accès personnel.",
      "L’audio démarre quand vous arrivez à chaque étape. Sous-titres et photos suivent la narration.",
      "Ouvrez la page une fois en wifi et attendez « Prêt pour le hors ligne » : toute la visite est alors stockée sur votre téléphone et fonctionne sans données.",
    ],
    validTitle: "Votre accès",
    valid: (days: number, date: string) => `Le lien fonctionne ${days} jours, jusqu’au ${date}. Faites la visite pendant votre séjour ; une fois la page chargée en wifi, elle continue de fonctionner hors ligne jusqu’à cette date.`,
    validLater: (opens: string, until: string) => `Vous avez choisi une date plus tard : la visite s’ouvre le ${opens} au soir et reste ouverte jusqu’au ${until}. D’ici là, cet email suffit — le lien indiquera simplement que l’accès n’est pas encore ouvert.`,
    checklistTitle: "Avant de partir",
    checklist: ["Chargez votre téléphone et prenez des écouteurs.", "Commencez au 60 boulevard Saint-Michel, devant le bâtiment.", "Comptez environ 90 minutes pour les 2 km."],
    support: `Une question ? Répondez à cet email. Bonne balade.`,
    sign: "Clément — Paris History Tours",
    locale: "fr-FR",
  },
} as const;

/**
 * First name guessed from the email local part ("jane.doe" → "Jane").
 * Returns "" whenever the guess is not plausibly a first name — a run of
 * digits, or a long unseparated blob like "clemdaguetschott" — so the email
 * greets with a plain "Hello," rather than a mangled name.
 */
export function firstNameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  const first = local.split(/[._+\-]/)[0] ?? "";
  if (first.length < 3 || first.length > 13 || /\d/.test(first) || !/^[\p{L}'\u2019]+$/u.test(first)) return "";
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function buildPurchaseEmail(p: DigitalPurchase, accessUrl: string, accessDays: number) {
  const c = COPY[p.language];
  const name = firstNameFromEmail(p.email);
  const fmt = (iso: string) => new Date(iso).toLocaleDateString(c.locale, { day: "numeric", month: "long", year: "numeric" });
  const until = fmt(p.access_expires_at);
  // Bought for a later walk: the app opens the evening before that day.
  const opensLater = new Date(p.access_starts_at).getTime() - Date.now() > 12 * 3600_000;
  const validLine = opensLater ? c.validLater(fmt(p.access_starts_at), until) : c.valid(accessDays, until);
  const li = (items: readonly string[], tag: "ol" | "ul") => items.map((x) => `<li style="margin:0 0 8px">${esc(x)}</li>`).join("");
  const html = `<!doctype html><html><body style="margin:0;background:#fafaf7;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1a1a1a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fafaf7"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid rgba(26,26,26,.1)">
<tr><td style="padding:28px 32px 8px;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#1a1a1a">Paris History Tours</td></tr>
<tr><td style="padding:0 32px 8px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#8a3b2e">WWII Left Bank · ${p.language === "fr" ? "Visite libre" : "Self-guided tour"}</td></tr>
<tr><td style="padding:16px 32px 0;font-size:16px;line-height:1.6">${esc(c.hello(name))}</td></tr>
<tr><td style="padding:12px 32px 0;font-size:16px;line-height:1.6;color:#4a4a4a">${esc(c.intro)}</td></tr>
<tr><td style="padding:24px 32px" align="center"><a href="${accessUrl}" style="display:inline-block;background:#8a3b2e;color:#ffffff;text-decoration:none;font-weight:600;font-size:16px;padding:14px 28px;border-radius:4px">${esc(c.cta)}</a>
<div style="font-size:12px;color:#4a4a4a;margin-top:10px;word-break:break-all">${esc(accessUrl)}</div></td></tr>
<tr><td style="padding:0 32px;font-size:15px;line-height:1.6;color:#4a4a4a"><ol style="margin:0;padding-left:20px">${li(c.how, "ol")}</ol></td></tr>
<tr><td style="padding:24px 32px 0;font-family:Georgia,'Times New Roman',serif;font-size:18px">${esc(c.validTitle)}</td></tr>
<tr><td style="padding:8px 32px 0;font-size:15px;line-height:1.6;color:#4a4a4a">${esc(validLine)}</td></tr>
<tr><td style="padding:24px 32px 0;font-family:Georgia,'Times New Roman',serif;font-size:18px">${esc(c.checklistTitle)}</td></tr>
<tr><td style="padding:8px 32px 0;font-size:15px;line-height:1.6;color:#4a4a4a"><ul style="margin:0;padding-left:20px">${li(c.checklist, "ul")}</ul></td></tr>
<tr><td style="padding:24px 32px 0;font-size:14px;line-height:1.6;color:#4a4a4a">${esc(c.support)}</td></tr>
<tr><td style="padding:16px 32px 32px;font-size:14px;line-height:1.6">${esc(c.sign)}</td></tr>
</table>
<div style="font-size:11px;color:#4a4a4a;margin-top:16px">parishistorytours.com</div>
</td></tr></table></body></html>`;
  const text = [
    c.hello(name), "", c.intro, "", `${c.cta}: ${accessUrl}`, "",
    ...c.how.map((x, i) => `${i + 1}. ${x}`), "",
    c.validTitle, validLine, "",
    c.checklistTitle, ...c.checklist.map((x) => `- ${x}`), "",
    c.support, c.sign,
  ].join("\n");
  return { subject: c.subject, html, text };
}

export interface EmailAttachment {
  filename: string;
  content: Uint8Array;
}

export async function sendPurchaseEmail(
  p: DigitalPurchase,
  accessUrl: string,
  accessDays: number,
  attachment?: EmailAttachment,
): Promise<{ success: boolean; id?: string; error?: string }> {
  const key = (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.RESEND_API_KEY ?? process.env.RESEND_API_KEY;
  if (!key) return { success: false, error: "RESEND_API_KEY missing" };
  const resend = new Resend(key);
  const { subject, html, text } = buildPurchaseEmail(p, accessUrl, accessDays);
  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: [p.email],
      replyTo: SUPPORT_EMAIL,
      subject,
      html,
      text,
      ...(attachment ? { attachments: [{ filename: attachment.filename, content: Buffer.from(attachment.content).toString("base64") }] } : {}),
    });
    if (error) return { success: false, error: error.message };
    return { success: true, id: data?.id };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}
