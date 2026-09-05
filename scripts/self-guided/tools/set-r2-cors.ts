/**
 * Apply the CORS policy the webapp needs on the private bucket: the browser
 * fetches presigned MP3/photos/PDF with Range headers from the site's origin
 * (and the service worker caches them, which requires CORS, not opaque,
 * responses).
 *
 *   pnpm tsx scripts/self-guided/tools/set-r2-cors.ts [--origin https://extra.example]
 */
import { GetBucketCorsCommand, PutBucketCorsCommand } from "@aws-sdk/client-s3";
import { parseArgs } from "../lib/args.ts";
import { log } from "../lib/log.ts";
import { r2Client, r2ConfigFromEnv } from "../lib/r2.ts";

const ORIGINS = [
  "https://www.parishistorytours.com",
  "https://parishistorytours.com",
  "https://*.vercel.app",
  "http://localhost:4321",
  "http://localhost:4399",
  "https://*.trycloudflare.com",
];

async function main() {
  const args = parseArgs();
  const extra = args.get("origin");
  const origins = extra ? [...ORIGINS, extra] : ORIGINS;
  const cfg = r2ConfigFromEnv();
  const client = r2Client(cfg);
  await client.send(
    new PutBucketCorsCommand({
      Bucket: cfg.bucket,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedOrigins: origins,
            AllowedMethods: ["GET", "HEAD"],
            AllowedHeaders: ["Range", "If-None-Match", "If-Modified-Since"],
            ExposeHeaders: ["Content-Range", "Content-Length", "Accept-Ranges", "ETag", "Content-Type"],
            MaxAgeSeconds: 86400,
          },
        ],
      },
    }),
  );
  const cors = await client.send(new GetBucketCorsCommand({ Bucket: cfg.bucket }));
  log.info("cors", JSON.stringify(cors.CORSRules, null, 2));
}

main().catch((e) => {
  log.error("fatal", e instanceof Error ? e.message : String(e));
  process.exit(1);
});
