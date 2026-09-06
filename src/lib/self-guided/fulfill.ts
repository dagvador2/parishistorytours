/**
 * Fulfilment of a paid Checkout Session of the digital product (called by
 * the Stripe webhook): idempotent insert, then the access email. No guide is
 * attached — the tour lives in the web app.
 */
import type Stripe from "stripe";
import { accessDays, accessUrl, findPurchaseBySession, insertPurchase, PRODUCT_SLUG, type PurchaseLang } from "./purchase";
import { pdfFilename, watermarkPdf } from "./pdf";
import { sendPurchaseEmail } from "./email";

export function isDigitalProductSession(session: Stripe.Checkout.Session): boolean {
  return session.mode === "payment" && session.metadata?.product_slug === PRODUCT_SLUG;
}

export function siteOrigin(): string {
  const meta = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  return meta?.PUBLIC_SITE_URL ?? process.env.PUBLIC_SITE_URL ?? "https://www.parishistorytours.com";
}

export async function fulfillDigitalPurchase(session: Stripe.Checkout.Session, origin = siteOrigin()): Promise<{ created: boolean; emailSent: boolean; error?: string }> {
  // Idempotence: a retried webhook must not insert or email twice.
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
  let emailSent = false;
  let error: string | undefined;
  try {
    // Attached only if a short welcome sheet has been uploaded for that language.
    const welcome = await watermarkPdf(purchase.language, purchase.email).catch(() => null);
    const r = await sendPurchaseEmail(purchase, url, accessDays(), welcome ? { filename: pdfFilename(purchase.language), content: welcome } : undefined);
    emailSent = r.success;
    error = r.error;
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }
  if (!emailSent) console.error("[self-guided] purchase saved but email failed:", error, "purchaseId=", purchase.id);
  return { created: true, emailSent, error };
}
