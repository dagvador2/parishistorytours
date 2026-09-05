/**
 * One-off: create the private R2 bucket through the Cloudflare API.
 *
 *   CLOUDFLARE_API_TOKEN=… pnpm tsx scripts/self-guided/tools/create-r2-bucket.ts [--location weur] [--jurisdiction eu]
 *
 * Needs R2_ACCOUNT_ID and R2_BUCKET_NAME (from .env) and a Cloudflare API token
 * with "Workers R2 Storage: Write" on the account (passed in the environment,
 * not stored in this repo). The S3 access keys used by upload-r2.ts are a
 * separate, bucket-scoped "R2 API token" created in the dashboard:
 * R2 > Manage API tokens > Object Read & Write > this bucket only.
 */
import { parseArgs } from "../lib/args.ts";
import { requireEnv } from "../lib/env.ts";
import { log } from "../lib/log.ts";

async function main() {
  const args = parseArgs();
  const token = requireEnv("CLOUDFLARE_API_TOKEN");
  const account = requireEnv("R2_ACCOUNT_ID");
  const name = requireEnv("R2_BUCKET_NAME");
  const location = args.get("location") ?? "weur";
  const jurisdiction = args.get("jurisdiction") ?? "eu";
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  const list = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/r2/buckets`, { headers });
  const listed = (await list.json()) as { success: boolean; result?: { buckets: { name: string; location?: string }[] }; errors: { message: string }[] };
  if (!listed.success) throw new Error(`list buckets: ${listed.errors.map((e) => e.message).join("; ")}`);
  if (listed.result?.buckets.some((b) => b.name === name)) {
    log.info("r2", `bucket "${name}" already exists, nothing to do`);
    return;
  }
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/r2/buckets`, {
    method: "POST",
    headers: { ...headers, "cf-r2-jurisdiction": jurisdiction },
    body: JSON.stringify({ name, locationHint: location, storageClass: "Standard" }),
  });
  const data = (await res.json()) as { success: boolean; result?: { name: string; location?: string; jurisdiction?: string; creation_date?: string }; errors: { message: string }[] };
  if (!data.success) throw new Error(`create bucket: ${data.errors.map((e) => e.message).join("; ")}`);
  log.info("r2", `created bucket "${data.result?.name}" location=${data.result?.location ?? location} jurisdiction=${data.result?.jurisdiction ?? jurisdiction}`);
  console.log(`\nNext: dashboard > R2 > Manage API tokens > create token "Object Read & Write" scoped to "${name}",\nthen fill R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY in .env.\n`);
}

main().catch((e) => {
  log.error("fatal", e instanceof Error ? e.message : String(e));
  process.exit(1);
});
