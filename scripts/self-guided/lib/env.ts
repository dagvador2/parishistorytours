/**
 * Minimal .env loader (no dependency). Reads `<repo>/.env` once, never
 * overrides variables already present in the process environment.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

let loaded = false;

export function loadEnv(): void {
  if (loaded) return;
  loaded = true;
  const file = resolve(process.cwd(), ".env");
  if (!existsSync(file)) return;
  for (const raw of readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    // strip inline comments and surrounding quotes
    if (!/^["']/.test(value)) value = value.replace(/\s+#.*$/, "").trim();
    value = value.replace(/^(["'])(.*)\1$/, "$2");
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

export function requireEnv(name: string): string {
  loadEnv();
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing env var ${name} — see .env.example`);
  }
  return v;
}

export function optionalEnv(name: string, fallback: string): string {
  loadEnv();
  return process.env[name] || fallback;
}
