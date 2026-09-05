/**
 * Digital purchases of the self-guided tour: pricing (early bird window),
 * access tokens, and the digital_purchases table (service role only).
 */
import { randomBytes } from "node:crypto";
import Stripe from "stripe";
import { supabaseAdmin } from "../supabase-admin";

export const PRODUCT_SLUG = "left-bank-ww2";
export const EARLY_BIRD_DAYS = 30;
export const DOWNLOAD_DAYS = 30;
export const SUPPORT_EMAIL = "hello@parishistorytours.com";

export type PurchaseLang = "en" | "fr";

export interface DigitalPurchase {
  id: string;
  email: string;
  product_slug: string;
  stripe_session_id: string;
  stripe_payment_intent_id: string | null;
  access_token: string;
  language: PurchaseLang;
  amount_paid_cents: number;
  currency: string;
  purchased_at: string;
  download_expires_at: string;
  download_count: number;
  last_accessed_at: string | null;
}

function env(name: string): string | undefined {
  const v = ((import.meta as unknown as { env?: Record<string, string | undefined> }).env?.[name]) ?? process.env[name];
  return v && v.length > 0 ? v : undefined;
}

let stripeClient: Stripe | null = null;
export function stripe(): Stripe {
  if (!stripeClient) {
    const key = env("STRIPE_SECRET_KEY");
    if (!key) throw new Error("Missing STRIPE_SECRET_KEY");
    stripeClient = new Stripe(key, { apiVersion: "2025-07-30.basil" });
  }
  return stripeClient;
}

export interface ActivePrice {
  priceId: string;
  earlyBird: boolean;
  /** days left in the early-bird window (0 when not early bird) */
  daysLeft: number;
}

/** Early bird price while now < SELF_GUIDED_LAUNCH_DATE + 30 days, normal price otherwise (or when no launch date is set). */
export function getActivePriceId(now: Date = new Date()): ActivePrice {
  const early = env("STRIPE_PRICE_ID_SELF_GUIDED_EARLYBIRD");
  const normal = env("STRIPE_PRICE_ID_SELF_GUIDED_NORMAL");
  if (!normal) throw new Error("Missing STRIPE_PRICE_ID_SELF_GUIDED_NORMAL");
  const launchRaw = env("SELF_GUIDED_LAUNCH_DATE");
  const launch = launchRaw ? new Date(launchRaw) : null;
  if (early && launch && !Number.isNaN(launch.getTime())) {
    const end = launch.getTime() + EARLY_BIRD_DAYS * 86400_000;
    if (now.getTime() < end) {
      return { priceId: early, earlyBird: true, daysLeft: Math.max(1, Math.ceil((end - now.getTime()) / 86400_000)) };
    }
  }
  return { priceId: normal, earlyBird: false, daysLeft: 0 };
}

export interface PriceInfo extends ActivePrice {
  amountCents: number;
  currency: string;
  /** the regular price, for the strikethrough during early bird */
  normalAmountCents: number;
}

let priceCache: { at: number; value: PriceInfo } | null = null;

/** Live amounts from Stripe (cached 5 min per instance). */
export async function fetchPriceInfo(now: Date = new Date()): Promise<PriceInfo> {
  if (priceCache && Date.now() - priceCache.at < 5 * 60_000 && priceCache.value.earlyBird === getActivePriceId(now).earlyBird) return priceCache.value;
  const active = getActivePriceId(now);
  const s = stripe();
  const [price, normal] = await Promise.all([
    s.prices.retrieve(active.priceId),
    active.earlyBird ? s.prices.retrieve(env("STRIPE_PRICE_ID_SELF_GUIDED_NORMAL")!) : null,
  ]);
  const value: PriceInfo = {
    ...active,
    amountCents: price.unit_amount ?? 0,
    currency: price.currency,
    normalAmountCents: normal?.unit_amount ?? price.unit_amount ?? 0,
  };
  priceCache = { at: Date.now(), value };
  return value;
}

export function newAccessToken(): string {
  return randomBytes(24).toString("base64url");
}

export async function findPurchaseBySession(sessionId: string): Promise<DigitalPurchase | null> {
  const { data, error } = await supabaseAdmin().from("digital_purchases").select("*").eq("stripe_session_id", sessionId).maybeSingle();
  if (error) throw new Error(`digital_purchases lookup failed: ${error.message}`);
  return (data as DigitalPurchase | null) ?? null;
}

/**
 * Optional development bypass: when SELF_GUIDED_DEV_TOKEN is set, that exact
 * token opens the webapp without a purchase (field tests before launch, local
 * dev without the database). Unset in production.
 */
function devPurchase(token: string): DigitalPurchase | null {
  const dev = env("SELF_GUIDED_DEV_TOKEN");
  if (!dev || dev.length < 6 || token !== dev) return null;
  const now = new Date();
  return {
    id: "dev", email: "dev@parishistorytours.com", product_slug: PRODUCT_SLUG, stripe_session_id: "cs_test_dev", stripe_payment_intent_id: null,
    access_token: dev, language: "en", amount_paid_cents: 0, currency: "eur", purchased_at: now.toISOString(),
    download_expires_at: new Date(now.getTime() + DOWNLOAD_DAYS * 86400_000).toISOString(), download_count: 0, last_accessed_at: null,
  };
}

export async function findPurchaseByToken(token: string): Promise<DigitalPurchase | null> {
  const dev = devPurchase(token);
  if (dev) return dev;
  if (!token || token.length < 16 || token.length > 128 || !/^[A-Za-z0-9_-]+$/.test(token)) return null;
  const { data, error } = await supabaseAdmin().from("digital_purchases").select("*").eq("access_token", token).maybeSingle();
  if (error) throw new Error(`digital_purchases lookup failed: ${error.message}`);
  return (data as DigitalPurchase | null) ?? null;
}

export interface NewPurchase {
  email: string;
  stripeSessionId: string;
  stripePaymentIntentId: string | null;
  language: PurchaseLang;
  amountPaidCents: number;
  currency: string;
}

/** Insert a purchase; on a unique violation (webhook retry) the existing row is returned. */
export async function insertPurchase(p: NewPurchase): Promise<{ purchase: DigitalPurchase; created: boolean }> {
  const row = {
    email: p.email.toLowerCase(),
    product_slug: PRODUCT_SLUG,
    stripe_session_id: p.stripeSessionId,
    stripe_payment_intent_id: p.stripePaymentIntentId,
    access_token: newAccessToken(),
    language: p.language,
    amount_paid_cents: p.amountPaidCents,
    currency: p.currency,
    download_expires_at: new Date(Date.now() + DOWNLOAD_DAYS * 86400_000).toISOString(),
  };
  const { data, error } = await supabaseAdmin().from("digital_purchases").insert(row).select("*").single();
  if (error) {
    if (error.code === "23505") {
      const existing = await findPurchaseBySession(p.stripeSessionId);
      if (existing) return { purchase: existing, created: false };
    }
    throw new Error(`digital_purchases insert failed: ${error.message}`);
  }
  return { purchase: data as DigitalPurchase, created: true };
}

export async function touchLastAccess(id: string): Promise<void> {
  if (id === "dev") return;
  await supabaseAdmin().from("digital_purchases").update({ last_accessed_at: new Date().toISOString() }).eq("id", id);
}

export async function incrementDownloadCount(p: DigitalPurchase): Promise<void> {
  if (p.id === "dev") return;
  await supabaseAdmin().from("digital_purchases").update({ download_count: p.download_count + 1 }).eq("id", p.id);
}

export function downloadAvailable(p: DigitalPurchase, now: Date = new Date()): boolean {
  return new Date(p.download_expires_at).getTime() > now.getTime();
}

export function accessUrl(origin: string, p: Pick<DigitalPurchase, "access_token" | "language">): string {
  const prefix = p.language === "fr" ? "/fr" : "";
  return `${origin}${prefix}/self-guided-tour/access?token=${p.access_token}`;
}
