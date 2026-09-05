#!/usr/bin/env python3
"""
Extract photo captions from the EN and FR PDF masters.

The 33 handoff photos are named p<EN page>_<n>. Each photo appears in both
PDFs as the same embedded image (identical bytes), with its caption set in
9 pt italic right below it. The FR PDF has one extra page from page 32 on,
so we match photos across languages by image digest, not by page number.

Usage:  python3 scripts/self-guided/tools/extract-pdf-captions.py
Writes: scripts/self-guided/config/captions.pdf.json
Needs:  PyMuPDF (`pip install pymupdf`)
"""
import hashlib
import json
import os
import re
import sys

try:
    import fitz  # PyMuPDF
except ImportError:  # pragma: no cover
    sys.exit("PyMuPDF is required: pip install pymupdf")

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
PDF = {lang: os.path.join(ROOT, "scripts/audio-source/left-bank-ww2/pdf", lang, "master.pdf") for lang in ("en", "fr")}
PHOTOS = os.path.join(ROOT, "design/audioguide-handoff/photos")
OUT = os.path.join(ROOT, "scripts/self-guided/config/captions.pdf.json")

MIN_SIZE = 200  # ignore icons / decorations

# Captions the layout heuristic cannot see (set too far below the image);
# transcribed by hand from the PDFs.
MANUAL = {
    ("p29_22", "fr"): "Le général Philippe Leclerc — commandant de la 2e Division Blindée française, qui mènera la poussée alliée dans Paris.",
    ("p32_25", "en"): "Jean Callet — pilot of the Piper Cub mission, 24 August 1944.",
}


def page_images(doc):
    """Yield (page_no, y0, digest, caption) for every large image, top-to-bottom per page."""
    for pno, page in enumerate(doc, 1):
        blocks = [b for b in page.get_text("dict")["blocks"] if b["type"] == 0]
        imgs = []
        for info in page.get_image_info(xrefs=True):
            if info["width"] < MIN_SIZE or info["height"] < MIN_SIZE:
                continue
            try:
                digest = hashlib.md5(doc.extract_image(info["xref"])["image"]).hexdigest()[:12]
            except Exception:
                continue
            imgs.append((info["bbox"], digest))
        for bbox, digest in sorted(imgs, key=lambda t: t[0][1]):
            x0, y0, x1, y1 = bbox
            # caption = nearest italic 9 pt block starting within 120 pt below the image
            cands = []
            for b in blocks:
                if not (y1 - 2 <= b["bbox"][1] <= y1 + 120):
                    continue
                spans = [s for l in b["lines"] for s in l["spans"]]
                if not spans:
                    continue
                italic = bool(spans[0]["flags"] & 2)
                size = round(spans[0]["size"])
                if italic and size <= 9:
                    cands.append((b["bbox"][1], b["bbox"][3], " ".join(s["text"] for s in spans)))
            # a caption wrapped onto a second line can come back as a second block:
            # merge italic blocks that follow each other closely
            cands.sort()
            merged = []
            last_bottom = None
            for top, bottom, text in cands:
                if merged and last_bottom is not None and top - last_bottom < 6:
                    merged[-1] += " " + text
                else:
                    if merged:
                        break  # a gap means a different paragraph
                    merged.append(text)
                last_bottom = bottom
            caption = re.sub(r"\s+", " ", merged[0]).strip() if merged else ""
            yield pno, y0, digest, caption


def main():
    en = fitz.open(PDF["en"])
    fr = fitz.open(PDF["fr"])
    en_rows = list(page_images(en))
    fr_by_digest = {d: (p, cap) for p, _, d, cap in page_images(fr)}

    # handoff photo name -> (EN page, order on page)
    photos = sorted(f[:-4] for f in os.listdir(PHOTOS) if f.endswith(".png"))
    by_page = {}
    for p, y0, d, cap in en_rows:
        by_page.setdefault(p, []).append((d, cap))

    out = {}
    missing = []
    for name in photos:
        m = re.match(r"p(\d+)_(\d+)$", name)
        page = int(m.group(1))
        imgs = by_page.get(page, [])
        # order on page = position among this page's photos in the handoff naming
        siblings = [n for n in photos if n.startswith(f"p{page:02d}_")]
        k = siblings.index(name)
        if k >= len(imgs):
            missing.append(name)
            continue
        digest, cap_en = imgs[k]
        fr_page, cap_fr = fr_by_digest.get(digest, (None, ""))
        cap_en = cap_en or MANUAL.get((name, "en"), "")
        cap_fr = cap_fr or MANUAL.get((name, "fr"), "")
        out[name] = {
            "enPage": page,
            "frPage": fr_page,
            "digest": digest,
            "en": cap_en,
            "fr": cap_fr,
        }
        if not cap_en or not cap_fr:
            missing.append(f"{name} (caption en={'ok' if cap_en else 'MISSING'} fr={'ok' if cap_fr else 'MISSING'})")

    with open(OUT, "w", encoding="utf8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"{len(out)} photos matched -> {os.path.relpath(OUT, ROOT)}")
    if missing:
        print("check by hand:")
        for m in missing:
            print("  -", m)


if __name__ == "__main__":
    main()
