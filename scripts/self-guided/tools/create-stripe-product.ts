/**
 * Create the Stripe product of the self-guided tour with its two prices and
 * print the env lines. Run once per mode (test, then live):
 *
 *   STRIPE_SECRET_KEY=sk_test_… pnpm tsx scripts/self-guided/tools/create-stripe-product.ts
 *
 * Uses STRIPE_SECRET_KEY from the environment (or .env). Idempotent by
 * product name: an existing active product with the same name is reused and
 * missing prices are added.
 */
import Stripe from "stripe";
import { log } from "../lib/log.ts";
import { requireEnv } from "../lib/env.ts";

const NAME = "WWII Left Bank Self-Guided Tour";
const PRICES = [
  { key: "STRIPE_PRICE_ID_SELF_GUIDED_EARLYBIRD", nickname: "Early bird", unit_amount: 900 },
  { key: "STRIPE_PRICE_ID_SELF_GUIDED_NORMAL", nickname: "Normal", unit_amount: 1400 },
];

async function main() {
  const key = requireEnv("STRIPE_SECRET_KEY");
  const stripe = new Stripe(key, { apiVersion: "2025-07-30.basil" });
  const mode = key.startsWith("sk_live") ? "LIVE" : "test";
  log.info("stripe", `mode ${mode}`);

  const found = (await stripe.products.search({ query: `name:'${NAME}' AND active:'true'` })).data[0];
  const product =
    found ??
    (await stripe.products.create({
      name: NAME,
      description: "Self-guided audio walk of the WWII Left Bank tour: 9 narrated sections, GPS map, synchronised archive photos, 38-page PDF, offline mode. English and French included.",
      metadata: { product_slug: "left-bank-ww2" },
      tax_code: "txcd_10302000", // digital audio content (non-streaming)
    }));
  log.info("product", `${product.id} ${found ? "(existing)" : "(created)"}`);

  const existing = (await stripe.prices.list({ product: product.id, active: true, limit: 20 })).data;
  const lines: string[] = [];
  for (const p of PRICES) {
    const price =
      existing.find((x) => x.unit_amount === p.unit_amount && x.currency === "eur") ??
      (await stripe.prices.create({ product: product.id, currency: "eur", unit_amount: p.unit_amount, nickname: p.nickname, tax_behavior: "inclusive" }));
    lines.push(`${p.key}=${price.id}`);
  }
  console.log("\nAdd to .env / Vercel:\n" + lines.join("\n") + "\nSELF_GUIDED_LAUNCH_DATE=" + new Date().toISOString());
}

main().catch((e) => {
  log.error("fatal", e instanceof Error ? e.message : String(e));
  process.exit(1);
});
