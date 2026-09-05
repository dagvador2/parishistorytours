/**
 * Print a presigned GET URL for an object of the private bucket (default 2 h),
 * and optionally check it answers.
 *
 *   pnpm tsx scripts/self-guided/tools/presign.ts manifest/left-bank-ww2/fr.json [--expires 7200] [--check]
 *
 * This is the same helper the webapp's asset route will use (lib/r2.ts presignGet).
 */
import { parseArgs } from "../lib/args.ts";
import { log } from "../lib/log.ts";
import { presignGet, r2Client, r2ConfigFromEnv } from "../lib/r2.ts";

async function main() {
  const args = parseArgs();
  const key = process.argv.slice(2).find((a) => !a.startsWith("--"));
  if (!key) throw new Error("usage: presign.ts <object key> [--expires <seconds>] [--check]");
  const cfg = r2ConfigFromEnv();
  const url = await presignGet(r2Client(cfg), cfg.bucket, key, Number(args.get("expires") ?? 7200));
  console.log(url);
  if (args.has("check")) {
    const res = await fetch(url, { method: "GET", headers: { Range: "bytes=0-0" } });
    log.info("check", `HTTP ${res.status} ${res.headers.get("content-type")} ${res.headers.get("content-range") ?? res.headers.get("content-length")} cache-control=${res.headers.get("cache-control")}`);
    if (!res.ok) process.exit(1);
  }
}

main().catch((e) => {
  log.error("fatal", e instanceof Error ? e.message : String(e));
  process.exit(1);
});
