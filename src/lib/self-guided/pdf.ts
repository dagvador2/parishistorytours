/**
 * Watermarked PDF: the master (R2) with a light footer on every page,
 * generated on the fly, never stored.
 */
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { r2 } from "./r2";
import { PRODUCT_SLUG } from "./purchase";

const masters = new Map<string, Promise<Uint8Array>>();

export function masterPdfKey(lang: "en" | "fr"): string {
  return `pdf/${PRODUCT_SLUG}/${lang}/master.pdf`;
}

/** The master bytes, fetched once per function instance. */
export function loadMasterPdf(lang: "en" | "fr"): Promise<Uint8Array> {
  const key = masterPdfKey(lang);
  let p = masters.get(key);
  if (!p) {
    p = (async () => {
      const { client, bucket } = r2();
      const res = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      if (!res.Body) throw new Error(`empty body for ${key}`);
      return res.Body.transformToByteArray();
    })();
    masters.set(key, p);
    p.catch(() => masters.delete(key));
  }
  return p;
}

export async function watermarkPdf(lang: "en" | "fr", email: string): Promise<Uint8Array> {
  const src = await loadMasterPdf(lang);
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

export function pdfFilename(lang: "en" | "fr"): string {
  return lang === "fr" ? "WW2-Rive-Gauche-Visite-Libre.pdf" : "WW2-Left-Bank-Self-Guided-Tour.pdf";
}
