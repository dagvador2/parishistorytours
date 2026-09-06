/**
 * The manifest of a product with every bucket key resolved to a presigned
 * URL. Shared by the access route (token) and the assets route.
 */
import { PRODUCT_ID } from "../../data/self-guided/left-bank-ww2";
import { getJson, objectExists, sign, SIGNED_URL_TTL_SEC } from "./r2";
import type { AssetsResponse, Manifest } from "./types";

export const LANGS = ["en", "fr"] as const;
export type Lang = (typeof LANGS)[number];

// The list of available manifests changes only when the pipeline uploads a
// new language: remember it for a few minutes per function instance.
let availableCache: { at: number; langs: Lang[] } | undefined;
const AVAILABLE_TTL_MS = 5 * 60 * 1000;

export async function availableLangs(product: string): Promise<Lang[]> {
  if (availableCache && Date.now() - availableCache.at < AVAILABLE_TTL_MS) return availableCache.langs;
  const flags = await Promise.all(LANGS.map((l) => objectExists(`manifest/${product}/${l}.json`)));
  const langs = LANGS.filter((_, i) => flags[i]);
  availableCache = { at: Date.now(), langs };
  return langs;
}

export class AssetsError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/**
 * @param pdfUrl  what the "Download PDF" menu entry should open, or null when no
 *                welcome sheet is published (the printed guide is never served).
 */
export async function buildAssets(product: string, requested: Lang, pdfUrl: string | null = null): Promise<AssetsResponse> {
  if (product !== PRODUCT_ID) throw new AssetsError(404, "Unknown product");
  if (!LANGS.includes(requested)) throw new AssetsError(400, "lang must be en or fr");
  const available = await availableLangs(product);
  if (available.length === 0) throw new AssetsError(503, "No manifest available for this product yet");
  const lang = available.includes(requested) ? requested : available[0];

  const manifest = await getJson<Manifest>(`manifest/${product}/${lang}.json`);
  if (!manifest) {
    availableCache = undefined;
    throw new AssetsError(503, "Manifest disappeared");
  }

  const expiresAt = new Date(Date.now() + SIGNED_URL_TTL_SEC * 1000).toISOString();
  const [sections] = await Promise.all([
    Promise.all(
      manifest.sections.map(async (s) => ({
        id: s.id,
        index: s.index,
        durationSec: s.durationSec,
        sourceHash: s.sourceHash,
        subs: s.subs,
        audioKey: s.audio,
        audio: await sign(s.audio),
        media: await Promise.all(s.media.map(async (m) => ({ ...m, key: m.img, img: await sign(m.img) }))),
      })),
    ),
  ]);

  return { product, lang, requested, available, generatedAt: manifest.generatedAt, totalDurationSec: manifest.totalDurationSec, expiresAt, pdf: pdfUrl, sections };
}

export const jsonResponse = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "private, no-store", ...extra },
  });
