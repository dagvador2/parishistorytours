/**
 * Transactional email of the self-guided tour purchase (Resend), EN + FR,
 * with the watermarked PDF attached.
 */
import { Resend } from "resend";
import { SUPPORT_EMAIL, type DigitalPurchase } from "./purchase";
import { pdfFilename } from "./pdf";

const FROM = "Paris History Tours <bookings@parishistorytours.com>";

const COPY = {
  en: {
    subject: "Your WWII Left Bank Self-Guided Tour is ready 🎧",
    hello: (name: string) => `Hello ${name},`,
    intro: "Thank you for your purchase. Your self-guided tour of the Left Bank is ready: nine audio sections narrated in my own voice, a map that guides you from stop to stop, and the photos from the printed guide, synchronised with the narration.",
    cta: "Open the tour",
    how: ["Open the link on your phone: it is your personal access, valid for good.", "The audio starts when you reach each stop. Subtitles and photos follow the narration.", "The PDF attached is the printed version of the guide, with the walking directions."],
    checklistTitle: "Before you leave",
    checklist: ["Open the page once on wifi and wait for “Ready for offline use” — the whole tour then works without data.", "Charge your phone and bring headphones.", "Start at 60 Boulevard Saint-Michel, in front of the building.", "Count about 90 minutes for the 2 km."],
    download: (url: string, days: number) => `A full offline package (PDF + audio files) can be downloaded for ${days} days here: ${url}`,
    support: `Questions? Reply to this email or write to ${SUPPORT_EMAIL}. Enjoy the walk.`,
    sign: "Clément — Paris History Tours",
  },
  fr: {
    subject: "Votre tour autoguidé Rive Gauche est prêt 🎧",
    hello: (name: string) => `Bonjour ${name},`,
    intro: "Merci pour votre achat. Votre visite libre de la Rive Gauche est prête : neuf sections audio racontées de ma propre voix, une carte qui vous guide d’étape en étape, et les photos du guide imprimé, synchronisées avec la narration.",
    cta: "Ouvrir la visite",
    how: ["Ouvrez le lien sur votre téléphone : c’est votre accès personnel, valable sans limite de temps.", "L’audio démarre quand vous arrivez à chaque étape. Sous-titres et photos suivent la narration.", "Le PDF joint est la version imprimée du guide, avec les indications de marche."],
    checklistTitle: "Avant de partir",
    checklist: ["Ouvrez la page une fois en wifi et attendez « Prêt pour le hors ligne » : toute la visite fonctionne ensuite sans données.", "Chargez votre téléphone et prenez des écouteurs.", "Commencez au 60 boulevard Saint-Michel, devant le bâtiment.", "Comptez environ 90 minutes pour les 2 km."],
    download: (url: string, days: number) => `Un pack hors ligne complet (PDF + fichiers audio) est téléchargeable pendant ${days} jours ici : ${url}`,
    support: `Une question ? Répondez à cet email ou écrivez à ${SUPPORT_EMAIL}. Bonne balade.`,
    sign: "Clément — Paris History Tours",
  },
} as const;

/** First name guessed from the email local part ("jane.doe" → "Jane"). */
export function firstNameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  const first = local.split(/[._+-]/)[0] ?? "";
  if (!first || /\d{3,}/.test(first)) return "";
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function buildPurchaseEmail(p: DigitalPurchase, accessUrl: string, zipUrl: string, downloadDays: number) {
  const c = COPY[p.language];
  const name = firstNameFromEmail(p.email);
  const li = (items: readonly string[]) => items.map((x) => `<li style="margin:0 0 8px">${esc(x)}</li>`).join("");
  const html = `<!doctype html><html><body style="margin:0;background:#fafaf7;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1a1a1a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fafaf7"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid rgba(26,26,26,.1)">
<tr><td style="padding:28px 32px 8px;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#1a1a1a">Paris History Tours</td></tr>
<tr><td style="padding:0 32px 8px;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#8a3b2e">WWII Left Bank · ${p.language === "fr" ? "Visite libre" : "Self-guided tour"}</td></tr>
<tr><td style="padding:16px 32px 0;font-size:16px;line-height:1.6">${esc(name ? c.hello(name) : c.hello("").replace(/ ,$/, ","))}</td></tr>
<tr><td style="padding:12px 32px 0;font-size:16px;line-height:1.6;color:#4a4a4a">${esc(c.intro)}</td></tr>
<tr><td style="padding:24px 32px" align="center"><a href="${accessUrl}" style="display:inline-block;background:#8a3b2e;color:#ffffff;text-decoration:none;font-weight:600;font-size:16px;padding:14px 28px;border-radius:4px">${esc(c.cta)}</a>
<div style="font-size:12px;color:#4a4a4a;margin-top:10px;word-break:break-all">${esc(accessUrl)}</div></td></tr>
<tr><td style="padding:0 32px;font-size:15px;line-height:1.6;color:#4a4a4a"><ol style="margin:0;padding-left:20px">${li(c.how)}</ol></td></tr>
<tr><td style="padding:24px 32px 0;font-family:Georgia,'Times New Roman',serif;font-size:18px">${esc(c.checklistTitle)}</td></tr>
<tr><td style="padding:8px 32px 0;font-size:15px;line-height:1.6;color:#4a4a4a"><ul style="margin:0;padding-left:20px">${li(c.checklist)}</ul></td></tr>
<tr><td style="padding:20px 32px 0;font-size:13px;line-height:1.6;color:#4a4a4a">${esc(c.download(zipUrl, downloadDays))}</td></tr>
<tr><td style="padding:24px 32px 0;font-size:14px;line-height:1.6;color:#4a4a4a">${esc(c.support)}</td></tr>
<tr><td style="padding:16px 32px 32px;font-size:14px;line-height:1.6">${esc(c.sign)}</td></tr>
</table>
<div style="font-size:11px;color:#4a4a4a;margin-top:16px">parishistorytours.com</div>
</td></tr></table></body></html>`;
  const text = [name ? c.hello(name) : c.hello("").trim(), "", c.intro, "", `${c.cta}: ${accessUrl}`, "", ...c.how.map((x, i) => `${i + 1}. ${x}`), "", c.checklistTitle, ...c.checklist.map((x) => `- ${x}`), "", c.download(zipUrl, downloadDays), "", c.support, c.sign].join("\n");
  return { subject: c.subject, html, text };
}

export async function sendPurchaseEmail(p: DigitalPurchase, accessUrl: string, zipUrl: string, downloadDays: number, pdf: Uint8Array): Promise<{ success: boolean; id?: string; error?: string }> {
  const key = (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.RESEND_API_KEY ?? process.env.RESEND_API_KEY;
  if (!key) return { success: false, error: "RESEND_API_KEY missing" };
  const resend = new Resend(key);
  const { subject, html, text } = buildPurchaseEmail(p, accessUrl, zipUrl, downloadDays);
  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: [p.email],
      replyTo: SUPPORT_EMAIL,
      subject,
      html,
      text,
      attachments: [{ filename: pdfFilename(p.language), content: Buffer.from(pdf).toString("base64") }],
    });
    if (error) return { success: false, error: error.message };
    return { success: true, id: data?.id };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}
