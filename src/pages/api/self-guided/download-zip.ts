/**
 * GET /api/self-guided/download-zip?token=…&lang=en|fr
 * Offline package: watermarked PDF + the 9 MP3, streamed as a zip (stored,
 * MP3 does not compress). Refused after download_expires_at; counts downloads.
 */
import type { APIRoute } from "astro";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { Zip, ZipPassThrough } from "fflate";
import { PRODUCT_ID } from "../../../data/self-guided/left-bank-ww2";
import { getJson, r2 } from "../../../lib/self-guided/r2";
import type { Manifest } from "../../../lib/self-guided/types";
import { pdfFilename, watermarkPdf } from "../../../lib/self-guided/pdf";
import { downloadAvailable, findPurchaseByToken, incrementDownloadCount } from "../../../lib/self-guided/purchase";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const purchase = await findPurchaseByToken(url.searchParams.get("token") ?? "").catch(() => null);
  if (!purchase) return new Response("Invalid token", { status: 401 });
  if (!downloadAvailable(purchase)) return new Response("The offline download period has ended (30 days after purchase). The web app remains accessible.", { status: 410 });
  const lang = url.searchParams.get("lang") === "fr" ? "fr" : url.searchParams.get("lang") === "en" ? "en" : purchase.language;

  const manifest = await getJson<Manifest>(`manifest/${PRODUCT_ID}/${lang}.json`);
  if (!manifest) return new Response("This language is not available yet", { status: 404 });

  const { client, bucket } = r2();
  const folder = lang === "fr" ? "WW2-Rive-Gauche-Visite-Libre" : "WW2-Left-Bank-Self-Guided-Tour";

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const zip = new Zip((err, chunk, final) => {
        if (err) { controller.error(err); return; }
        controller.enqueue(chunk);
        if (final) controller.close();
      });
      const add = async (name: string, bytes: Uint8Array) => {
        const f = new ZipPassThrough(`${folder}/${name}`);
        zip.add(f);
        f.push(bytes, true);
      };
      try {
        await add(pdfFilename(lang), await watermarkPdf(lang, purchase.email));
        for (const s of manifest.sections) {
          const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: s.audio }));
          const bytes = await res.Body!.transformToByteArray();
          await add(`${s.id}.mp3`, bytes);
        }
        await add("README.txt", new TextEncoder().encode(lang === "fr"
          ? `Tour autoguidé WW2 Rive Gauche — Paris History Tours\nLicence personnelle : ${purchase.email}. Ne pas redistribuer.\nLes 9 fichiers audio suivent l'ordre du parcours ; le PDF contient les indications de marche.\n`
          : `WW2 Left Bank Self-Guided Tour — Paris History Tours\nPersonal licence: ${purchase.email}. Do not redistribute.\nThe 9 audio files follow the route order; the PDF has the walking directions.\n`));
        zip.end();
      } catch (e) {
        controller.error(e);
      }
    },
  });

  incrementDownloadCount(purchase).catch(() => {});
  return new Response(stream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${folder}.zip"`,
      "Cache-Control": "private, no-store",
    },
  });
};
