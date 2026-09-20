/**
 * Create the Stripe products of the self-guided tour — one per narration
 * language, so the Checkout page reads in the buyer's language — with their
 * early-bird and normal prices, and print the env lines.
 *
 * Run once per mode (test, then live):
 *   STRIPE_SECRET_KEY=sk_test_… pnpm tsx scripts/self-guided/tools/create-stripe-product.ts
 *
 * Idempotent by product name: an existing active product with the same name is
 * reused and only the missing prices are created.
 */
import Stripe from "stripe";
import { log } from "../lib/log.ts";
import { requireEnv } from "../lib/env.ts";

const PRODUCTS = [
  {
    lang: "EN",
    name: "WWII Left Bank Self-Guided Tour",
    description: "Self-guided audio walk of the WWII Left Bank tour: 9 sections narrated by the guide, GPS map, synchronised archive photographs, works offline.",
  },
  {
    lang: "FR",
    name: "Visite libre WW2 Rive Gauche",
    description: "Balade audio autoguidée du tour WW2 Rive Gauche : 9 sections racontées par le guide, carte GPS, photographies d’archives synchronisées, fonctionne hors ligne.",
  },
];

const TIERS = [
  { key: "EARLYBIRD", nickname: "Early bird", unit_amount: 1400 },
  { key: "NORMAL", nickname: "Normal", unit_amount: 1900 },
];

/**
 * Languages to create, from `--lang fr` (repeatable) — a language is only put on
 * sale once its narration is recorded, so English waits for its own recordings.
 * Without the flag, every language is created.
 */
function wantedLangs(): string[] {
  const args = process.argv.slice(2);
  const picked: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--lang" && args[i + 1]) picked.push(args[++i].toUpperCase());
    else if (args[i].startsWith("--lang=")) picked.push(args[i].slice(7).toUpperCase());
  }
  return picked;
}

async function main() {
  const key = requireEnv("STRIPE_SECRET_KEY");
  const stripe = new Stripe(key, { apiVersion: "2025-07-30.basil" });
  log.info("stripe", `mode ${key.startsWith("sk_live") ? "LIVE" : "test"}`);

  const picked = wantedLangs();
  const products = picked.length ? PRODUCTS.filter((p) => picked.includes(p.lang)) : PRODUCTS;
  if (!products.length) throw new Error(`No product matches --lang ${picked.join(", ")}`);
  log.info("scope", products.map((p) => p.lang).join(", "));

  const lines: string[] = [];
  for (const p of products) {
    const found = (await stripe.products.search({ query: `name:'${p.name}' AND active:'true'` })).data[0];
    const fields = {
      name: p.name,
      description: p.description,
      metadata: { product_slug: "left-bank-ww2", language: p.lang.toLowerCase() },
    };
    // Existing products are updated too, so a copy change here reaches Checkout.
    const product = found
      ? await stripe.products.update(found.id, fields)
      : await stripe.products.create({ ...fields, tax_code: "txcd_10302000" }); // digital audio content (non-streaming)
    log.info("product", `${p.lang} ${product.id} ${found ? "(updated)" : "(created)"}`);

    const existing = (await stripe.prices.list({ product: product.id, active: true, limit: 20 })).data;
    for (const t of TIERS) {
      const price =
        existing.find((x) => x.unit_amount === t.unit_amount && x.currency === "eur" && x.nickname === `${p.lang} ${t.nickname}`) ??
        (await stripe.prices.create({ product: product.id, currency: "eur", unit_amount: t.unit_amount, nickname: `${p.lang} ${t.nickname}`, tax_behavior: "inclusive" }));
      lines.push(`STRIPE_PRICE_ID_SELF_GUIDED_${p.lang}_${t.key}=${price.id}`);
    }
  }
  console.log("\nAdd to .env / Vercel:\n" + lines.join("\n") + "\nSELF_GUIDED_LAUNCH_DATE=" + new Date().toISOString());
}

main().catch((e) => {
  log.error("fatal", e instanceof Error ? e.message : String(e));
  process.exit(1);
});
