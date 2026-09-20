/**
 * Invitation codes for the self-guided tour: a 100%-off coupon and the codes
 * you hand out. A guest goes through the normal funnel, types the code in
 * Checkout, pays nothing, and is delivered exactly like a buyer — same email,
 * same access window, and one row in digital_purchases at 0 cents, so the
 * invitations stay countable.
 *
 *   pnpm self-guided:promo --code AMIS2026 [--max 20] [--days 90]
 *
 * Idempotent: an existing code of the same name is reported, never duplicated.
 */
import Stripe from "stripe";
import { log } from "../lib/log.ts";
import { requireEnv } from "../lib/env.ts";

const COUPON_NAME = "Invitation visite libre (100%)";

function arg(name: string): string | undefined {
  const a = process.argv.slice(2);
  for (let i = 0; i < a.length; i++) {
    if (a[i] === `--${name}` && a[i + 1]) return a[i + 1];
    if (a[i].startsWith(`--${name}=`)) return a[i].slice(name.length + 3);
  }
  return undefined;
}

async function main() {
  const code = (arg("code") ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9]{4,32}$/.test(code)) throw new Error("Pass --code with 4 to 32 letters or digits, e.g. --code AMIS2026");
  const max = arg("max") ? Number(arg("max")) : undefined;
  if (max !== undefined && (!Number.isInteger(max) || max < 1)) throw new Error("--max must be a positive whole number");
  const days = arg("days") ? Number(arg("days")) : undefined;
  if (days !== undefined && (!Number.isInteger(days) || days < 1)) throw new Error("--days must be a positive whole number");

  const key = requireEnv("STRIPE_SECRET_KEY");
  const stripe = new Stripe(key, { apiVersion: "2025-07-30.basil" });
  log.info("stripe", `mode ${key.startsWith("sk_live") ? "LIVE" : "test"}`);

  const existing = (await stripe.promotionCodes.list({ code, limit: 1 })).data[0];
  if (existing) {
    log.warn("code", `${code} existe déjà (${existing.id}) — utilisations : ${existing.times_redeemed}${existing.max_redemptions ? `/${existing.max_redemptions}` : ""}, actif : ${existing.active}`);
    return;
  }

  // One shared coupon, reused by every invitation code.
  const coupon =
    (await stripe.coupons.list({ limit: 100 })).data.find((c) => c.name === COUPON_NAME && c.percent_off === 100 && c.valid) ??
    (await stripe.coupons.create({ name: COUPON_NAME, percent_off: 100, duration: "once" }));

  const promo = await stripe.promotionCodes.create({
    coupon: coupon.id,
    code,
    ...(max ? { max_redemptions: max } : {}),
    ...(days ? { expires_at: Math.floor(Date.now() / 1000) + days * 86400 } : {}),
  });

  log.info("coupon", `${coupon.id} (${COUPON_NAME})`);
  log.info("code", `${promo.code} → ${promo.id}`);
  console.log(`\nÀ partager : le code ${promo.code}, à saisir sur la page de paiement.`);
  console.log(`  utilisations : ${max ?? "illimitées"}${days ? ` · expire dans ${days} jours` : " · sans expiration"}`);
  console.log(`  page : https://www.parishistorytours.com/fr/self-guided-tour\n`);
}

main().catch((e) => {
  log.error("fatal", e instanceof Error ? e.message : String(e));
  process.exit(1);
});
