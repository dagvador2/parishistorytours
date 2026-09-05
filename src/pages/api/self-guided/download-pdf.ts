/** GET /api/self-guided/download-pdf?token=…&lang=en|fr → watermarked PDF (permanent access). */
import type { APIRoute } from "astro";
import { pdfFilename, watermarkPdf } from "../../../lib/self-guided/pdf";
import { findPurchaseByToken } from "../../../lib/self-guided/purchase";

export const prerender = false;

export const GET: APIRoute = async ({ url }) => {
  const purchase = await findPurchaseByToken(url.searchParams.get("token") ?? "").catch(() => null);
  if (!purchase) return new Response("Invalid token", { status: 401 });
  const lang = url.searchParams.get("lang") === "fr" ? "fr" : url.searchParams.get("lang") === "en" ? "en" : purchase.language;
  try {
    const pdf = await watermarkPdf(lang, purchase.email);
    return new Response(new Blob([pdf as BlobPart], { type: "application/pdf" }), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(pdf.byteLength),
        "Content-Disposition": `inline; filename="${pdfFilename(lang)}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    console.error("[self-guided/download-pdf]", e);
    return new Response("PDF generation failed", { status: 500 });
  }
};
