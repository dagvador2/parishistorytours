/**
 * PDF handed to the buyer.
 *
 * The 38-page printed guide (`pdf/<product>/<lang>/master.pdf`) is deliberately
 * NOT downloadable: it is the content the web app exists to keep inside the
 * app. Only a short welcome sheet, when one is uploaded to the bucket at
 * `pdf/<product>/<lang>/welcome.pdf`, is served — watermarked with the buyer's
 * email and generated on the fly, never stored.
 */
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { objectExists, r2 } from "./r2";
import { PRODUCT_SLUG } from "./purchase";

export type Lang = "en" | "fr";

const cache = new Map<string, Promise<Uint8Array>>();

export function welcomePdfKey(lang: Lang): string {
  return `pdf/${PRODUCT_SLUG}/${lang}/welcome.pdf`;
}

/** Is a welcome sheet available for that language? (drives the menu entry) */
export function welcomePdfExists(lang: Lang): Promise<boolean> {
  return objectExists(welcomePdfKey(lang));
}

function loadPdf(key: string): Promise<Uint8Array> {
  let p = cache.get(key);
  if (!p) {
    p = (async () => {
      const { client, bucket } = r2();
      const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      if (!res.Body) throw new Error(`empty body for ${key}`);
      return res.Body.transformToByteArray();
    })();
    cache.set(key, p);
    p.catch(() => cache.delete(key));
  }
  return p;
}

export async function watermarkPdf(lang: Lang, email: string): Promise<Uint8Array | null> {
  const key = welcomePdfKey(lang);
  if (!(await objectExists(key))) return null;
  const src = await loadPdf(key);
  const doc = await PDFDocument.load(src, { ignoreEncryption: true });
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const text = `Licensed to ${email} — parishistorytours.com — Do not redistribute`;
  const size = 7.5;
  const width = font.widthOfTextAtSize(text, size);
  for (const page of doc.getPages()) {
    const { width: pw } = page.getSize();
    page.drawText(text, { x: Math.max(12, (pw - width) / 2), y: 14, size, font, color: rgb(0.62, 0.62, 0.62) });
  }
  doc.setProducer("Paris History Tours");
  return doc.save({ useObjectStreams: true });
}

export function pdfFilename(lang: Lang): string {
  return lang === "fr" ? "WW2-Rive-Gauche-Visite-Libre.pdf" : "WW2-Left-Bank-Self-Guided-Tour.pdf";
}
