/**
 * GET /api/self-guided/assets?product=left-bank-ww2&lang=en
 *
 * Returns the audio manifest of the product with every bucket key (MP3,
 * photos, PDF) replaced by a presigned R2 URL valid ~2 h. The bucket is
 * private and the client never talks to R2 directly.
 *
 * Languages: the manifest of the requested language is served when it exists
 * on the bucket; otherwise the first available one is served and the response
 * says so (`requested` vs `lang`, plus `available`). The UI language and the
 * narration language are decoupled on the client for that reason.
 */
import type { APIRoute } from "astro";
import { PRODUCT_ID } from "../../../data/self-guided/left-bank-ww2";
import { selfGuidedDevMode } from "../../../lib/self-guided/dev-mode";
import { getJson, objectExists, sign, SIGNED_URL_TTL_SEC } from "../../../lib/self-guided/r2";
import type { AssetsResponse, Manifest } from "../../../lib/self-guided/types";

export const prerender = false;

const LANGS = ["en", "fr"] as const;
type Lang = (typeof LANGS)[number];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "private, no-store" },
  });

// The list of available manifests changes only when the pipeline uploads a
// new language: remember it for a few minutes per function instance.
let availableCache: { at: number; langs: Lang[] } | undefined;
const AVAILABLE_TTL_MS = 5 * 60 * 1000;

async function availableLangs(product: string): Promise<Lang[]> {
  if (availableCache && Date.now() - availableCache.at < AVAILABLE_TTL_MS) return availableCache.langs;
  const flags = await Promise.all(LANGS.map((l) => objectExists(`manifest/${product}/${l}.json`)));
  const langs = LANGS.filter((_, i) => flags[i]);
  availableCache = { at: Date.now(), langs };
  return langs;
}

export const GET: APIRoute = async ({ url }) => {
  if (!selfGuidedDevMode()) return json({ error: "Not found" }, 404);

  const product = url.searchParams.get("product") ?? PRODUCT_ID;
  const requested = (url.searchParams.get("lang") ?? "en") as Lang;
  if (product !== PRODUCT_ID) return json({ error: "Unknown product" }, 404);
  if (!LANGS.includes(requested)) return json({ error: "lang must be en or fr" }, 400);

  try {
    const available = await availableLangs(product);
    if (available.length === 0) return json({ error: "No manifest available for this product yet" }, 503);
    const lang = available.includes(requested) ? requested : available[0];

    const manifest = await getJson<Manifest>(`manifest/${product}/${lang}.json`);
    if (!manifest) {
      availableCache = undefined;
      return json({ error: "Manifest disappeared" }, 503);
    }

    const expiresAt = new Date(Date.now() + SIGNED_URL_TTL_SEC * 1000).toISOString();
    const [pdf, sections] = await Promise.all([
      sign(`pdf/${product}/${lang}/master.pdf`),
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

    const body: AssetsResponse = {
      product,
      lang,
      requested,
      available,
      generatedAt: manifest.generatedAt,
      totalDurationSec: manifest.totalDurationSec,
      expiresAt,
      pdf,
      sections,
    };
    return json(body);
  } catch (e) {
    console.error("[self-guided/assets]", e);
    return json({ error: "Failed to load assets", details: e instanceof Error ? e.message : String(e) }, 500);
  }
};
