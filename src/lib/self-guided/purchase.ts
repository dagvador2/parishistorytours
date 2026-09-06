/**
 * Digital purchases of the self-guided tour: pricing (one Stripe product per
 * language, early-bird window), access tokens, and the digital_purchases table
 * (service role only).
 *
 * Access is time-limited: the link opens the web app for SELF_GUIDED_ACCESS_DAYS
 * days after purchase (the visitor walks the tour during their stay). The web
 * app caches itself for offline use during that window; there is no separate
 * download package, and the printed guide is never handed out — it is the very
 * content the app exists to protect.
 */
import { randomBytes } from "node:crypto";
import Stripe from "stripe";
import { supabaseAdmin } from "../supabase-admin";

export const PRODUCT_SLUG = "left-bank-ww2";
export const EARLY_BIRD_DAYS = 30;
export const SUPPORT_EMAIL = "clement@parishistorytours.com";

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
  access_expires_at: string;
  last_accessed_at: string | null;
}

function env(name: string): string | undefined {
  const v = ((import.meta as unknown as { env?: Record<string, string | undefined> }).env?.[name]) ?? process.env[name];
  return v && v.length > 0 ? v : undefined;
}

/** How long the access link stays valid. Short on purpose; 7 days covers a typical stay. */
export function accessDays(): number {
  const n = Number(env("SELF_GUIDED_ACCESS_DAYS") ?? 7);
  return Number.isFinite(n) && n >= 1 && n <= 365 ? Math.round(n) : 7;
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

/** `STRIPE_PRICE_ID_SELF_GUIDED_FR_NORMAL` and friends: one product per language. */
export function priceEnvKey(lang: PurchaseLang, tier: "EARLYBIRD" | "NORMAL"): string {
  return `STRIPE_PRICE_ID_SELF_GUIDED_${lang.toUpperCase()}_${tier}`;
}

/** Early bird while now < SELF_GUIDED_LAUNCH_DATE + 30 days, normal price otherwise. */
export function getActivePriceId(lang: PurchaseLang, now: Date = new Date()): ActivePrice {
  const early = env(priceEnvKey(lang, "EARLYBIRD"));
  const normal = env(priceEnvKey(lang, "NORMAL"));
  if (!normal) throw new Error(`Missing ${priceEnvKey(lang, "NORMAL")}`);
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
  lang: PurchaseLang;
  amountCents: number;
  currency: string;
  /** the regular price, for the strikethrough during early bird */
  normalAmountCents: number;
}

const priceCache = new Map<string, { at: number; value: PriceInfo }>();

/** Live amounts from Stripe (cached 5 min per instance and per language). */
export async function fetchPriceInfo(lang: PurchaseLang, now: Date = new Date()): Promise<PriceInfo> {
  const active = getActivePriceId(lang, now);
  const cached = priceCache.get(lang);
  if (cached && Date.now() - cached.at < 5 * 60_000 && cached.value.priceId === active.priceId) return cached.value;
  const s = stripe();
  const [price, normal] = await Promise.all([
    s.prices.retrieve(active.priceId),
    active.earlyBird ? s.prices.retrieve(env(priceEnvKey(lang, "NORMAL"))!) : null,
  ]);
  const value: PriceInfo = {
    ...active,
    lang,
    amountCents: price.unit_amount ?? 0,
    currency: price.currency,
    normalAmountCents: normal?.unit_amount ?? price.unit_amount ?? 0,
  };
  priceCache.set(lang, { at: Date.now(), value });
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
    access_expires_at: new Date(now.getTime() + 365 * 86400_000).toISOString(), last_accessed_at: null,
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
    access_expires_at: new Date(Date.now() + accessDays() * 86400_000).toISOString(),
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

export function accessExpired(p: DigitalPurchase, now: Date = new Date()): boolean {
  return new Date(p.access_expires_at).getTime() <= now.getTime();
}

/** Whole days left before the access expires (0 on the last day). */
export function accessDaysLeft(p: DigitalPurchase, now: Date = new Date()): number {
  return Math.max(0, Math.floor((new Date(p.access_expires_at).getTime() - now.getTime()) / 86400_000));
}

export function accessUrl(origin: string, p: Pick<DigitalPurchase, "access_token" | "language">): string {
  const prefix = p.language === "fr" ? "/fr" : "";
  return `${origin}${prefix}/self-guided-tour/access?token=${p.access_token}`;
}
