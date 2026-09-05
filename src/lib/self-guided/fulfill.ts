/**
 * Fulfilment of a paid Checkout Session of the digital product (called by
 * the Stripe webhook): idempotent insert, watermarked PDF, email.
 */
import type Stripe from "stripe";
import { accessUrl, DOWNLOAD_DAYS, findPurchaseBySession, insertPurchase, PRODUCT_SLUG, type PurchaseLang } from "./purchase";
import { watermarkPdf } from "./pdf";
import { sendPurchaseEmail } from "./email";

export function isDigitalProductSession(session: Stripe.Checkout.Session): boolean {
  return session.mode === "payment" && session.metadata?.product_slug === PRODUCT_SLUG;
}

export function siteOrigin(): string {
  return (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.PUBLIC_SITE_URL ?? process.env.PUBLIC_SITE_URL ?? "https://www.parishistorytours.com";
}

export async function fulfillDigitalPurchase(session: Stripe.Checkout.Session, origin = siteOrigin()): Promise<{ created: boolean; emailSent: boolean; error?: string }> {
  // Idempotence: a retried webhook must not insert, generate or email twice.
  const existing = await findPurchaseBySession(session.id);
  if (existing) return { created: false, emailSent: false };

  const email = session.customer_details?.email ?? session.customer_email;
  if (!email) throw new Error(`session ${session.id} has no customer email`);
  const language: PurchaseLang = session.metadata?.language === "fr" ? "fr" : "en";
  const { purchase, created } = await insertPurchase({
    email,
    stripeSessionId: session.id,
    stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null,
    language,
    amountPaidCents: session.amount_total ?? 0,
    currency: session.currency ?? "eur",
  });
  if (!created) return { created: false, emailSent: false };

  const url = accessUrl(origin, purchase);
  const zipUrl = `${origin}/api/self-guided/download-zip?token=${purchase.access_token}&lang=${purchase.language}`;
  let emailSent = false;
  let error: string | undefined;
  try {
    const pdf = await watermarkPdf(purchase.language, purchase.email);
    const r = await sendPurchaseEmail(purchase, url, zipUrl, DOWNLOAD_DAYS, pdf);
    emailSent = r.success;
    error = r.error;
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }
  if (!emailSent) console.error("[self-guided] purchase saved but email failed:", error, "purchaseId=", purchase.id);
  return { created: true, emailSent, error };
}
