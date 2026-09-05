/**
 * Cloudflare R2 through the AWS S3 v3 SDK. Private bucket, dedicated to the
 * digital product; the webapp (chantier B) serves objects through presigned
 * URLs, never directly.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { GetObjectCommand, HeadBucketCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { optionalEnv, requireEnv } from "./env.ts";

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  /** "eu" for a bucket created under the EU jurisdiction (this one), "" otherwise */
  jurisdiction: string;
}

export function r2ConfigFromEnv(): R2Config {
  return {
    accountId: requireEnv("R2_ACCOUNT_ID"),
    accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
    secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
    bucket: requireEnv("R2_BUCKET_NAME"),
    jurisdiction: optionalEnv("R2_JURISDICTION", ""),
  };
}

/** Jurisdiction-restricted buckets live on a dedicated S3 endpoint: <account>.eu.r2.cloudflarestorage.com */
export function r2Endpoint(cfg: Pick<R2Config, "accountId" | "jurisdiction">): string {
  const j = cfg.jurisdiction && cfg.jurisdiction !== "default" ? `${cfg.jurisdiction}.` : "";
  return `https://${cfg.accountId}.${j}r2.cloudflarestorage.com`;
}

export function r2Client(cfg: R2Config): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: r2Endpoint(cfg),
    credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
  });
}

export async function assertBucket(client: S3Client, bucket: string): Promise<void> {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch (e) {
    const name = (e as { name?: string }).name;
    throw new Error(
      `cannot access bucket "${bucket}" (${name}). Create it (tools/create-r2-bucket.ts) and use an R2 API token with Object Read & Write scoped to it.`,
    );
  }
}

/** ETag of a single-part upload is the hex MD5 of the body: enough to skip unchanged files. */
export function md5Hex(buf: Buffer): string {
  return createHash("md5").update(buf).digest("hex");
}

export async function remoteEtag(client: S3Client, bucket: string, key: string): Promise<string | undefined> {
  try {
    const r = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return r.ETag?.replace(/"/g, "");
  } catch (e) {
    if ((e as { name?: string }).name === "NotFound" || (e as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404) return undefined;
    throw e;
  }
}

export async function putFile(client: S3Client, bucket: string, key: string, file: string, contentType: string, cacheControl: string): Promise<void> {
  await client.send(
    new PutObjectCommand({ Bucket: bucket, Key: key, Body: readFileSync(file), ContentType: contentType, CacheControl: cacheControl }),
  );
}

/** Presigned GET, default 2 h (what the webapp's asset route will hand out). */
export async function presignGet(client: S3Client, bucket: string, key: string, expiresInSec = 2 * 3600): Promise<string> {
  return getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn: expiresInSec });
}

export function contentTypeFor(key: string): string {
  if (key.endsWith(".mp3")) return "audio/mpeg";
  if (key.endsWith(".json")) return "application/json";
  if (key.endsWith(".pdf")) return "application/pdf";
  if (key.endsWith(".webp")) return "image/webp";
  return "application/octet-stream";
}

/** Manifests change on regeneration; everything else is content-addressed by name and can be cached hard. */
export function cacheControlFor(key: string): string {
  return key.startsWith("manifest/") ? "no-cache" : "public, max-age=31536000, immutable";
}
