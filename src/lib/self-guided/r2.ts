/**
 * R2 access for the webapp. The client, endpoint and presign logic are the
 * ones of the audio pipeline (scripts/self-guided/lib/r2.ts); only the
 * configuration source differs: Astro exposes env vars through import.meta.env.
 */
import { GetObjectCommand, HeadObjectCommand, type S3Client } from "@aws-sdk/client-s3";
import { presignGet, r2Client, type R2Config } from "../../../scripts/self-guided/lib/r2.ts";

export { presignGet };

/** Signed URLs live 2 h; the client refetches the manifest before that. */
export const SIGNED_URL_TTL_SEC = 2 * 3600;

function env(name: string): string | undefined {
  const v = (import.meta.env as Record<string, string | undefined>)[name] ?? process.env[name];
  return v && v.length > 0 ? v : undefined;
}

export function r2ConfigFromAstroEnv(): R2Config {
  const missing: string[] = [];
  const read = (name: string) => {
    const v = env(name);
    if (!v) missing.push(name);
    return v ?? "";
  };
  const cfg: R2Config = {
    accountId: read("R2_ACCOUNT_ID"),
    accessKeyId: read("R2_ACCESS_KEY_ID"),
    secretAccessKey: read("R2_SECRET_ACCESS_KEY"),
    bucket: read("R2_BUCKET_NAME"),
    jurisdiction: env("R2_JURISDICTION") ?? "",
  };
  if (missing.length) throw new Error(`Missing env var(s): ${missing.join(", ")}`);
  return cfg;
}

let cached: { client: S3Client; bucket: string } | undefined;

export function r2(): { client: S3Client; bucket: string } {
  if (!cached) {
    const cfg = r2ConfigFromAstroEnv();
    cached = { client: r2Client(cfg), bucket: cfg.bucket };
  }
  return cached;
}

export async function objectExists(key: string): Promise<boolean> {
  const { client, bucket } = r2();
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (e) {
    const err = e as { name?: string; $metadata?: { httpStatusCode?: number } };
    if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) return false;
    throw e;
  }
}

/** Read a small JSON object (the manifest) from the bucket; undefined when absent. */
export async function getJson<T>(key: string): Promise<T | undefined> {
  const { client, bucket } = r2();
  try {
    const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const body = await res.Body?.transformToString("utf8");
    return body ? (JSON.parse(body) as T) : undefined;
  } catch (e) {
    const err = e as { name?: string; $metadata?: { httpStatusCode?: number } };
    if (err.name === "NoSuchKey" || err.$metadata?.httpStatusCode === 404) return undefined;
    throw e;
  }
}

export function sign(key: string): Promise<string> {
  const { client, bucket } = r2();
  return presignGet(client, bucket, key, SIGNED_URL_TTL_SEC);
}
