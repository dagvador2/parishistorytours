/**
 * Eisenhower and Bradley, side by side.
 *
 *   pnpm tsx scripts/self-guided/tools/make-generals-diptych.ts
 *
 * The narration names the two men in one breath ("Eisenhower et Bradley, les
 * deux généraux en charge de l'avance alliée") and the archive shot that stood
 * there showed them with Koenig and a child between them — three faces for two
 * names. Two portraits on paper say it without a caption.
 *
 * Laid out for the player's well, which is about 0.96:1 on a handset and 1.3:1
 * on a wide screen: the canvas is the handset's ratio and the whole composition
 * — frames and names — sits inside the middle three quarters of the height, so
 * the wide crop takes paper and nothing else.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";
import { log } from "../lib/log.ts";
import { PATHS } from "../lib/sections.ts";

const W = 1200, H = 1250;
/** each portrait, in 3:4 */
const PW = 520, PH = Math.round((PW * 4) / 3);
const GAP = 40, LABEL = 62;
const X0 = Math.round((W - (PW * 2 + GAP)) / 2);
const Y0 = Math.round((H - (PH + LABEL)) / 2);

const PAPER = "#F7F3EC", INK = "#1C1714", HAIR = "#C9BCA8";

/** Source, and the 3:4 window of it that holds the head — measured once, by eye. */
const FACES = [
  { file: "eisenhower.jpg", left: 70, width: 900, height: 1200, name: "Eisenhower" },
  { file: "omar-bradley.jpeg", left: 24, width: 453, height: 604, name: "Bradley" },
];

(async () => {
  const cut = await Promise.all(FACES.map((f) =>
    sharp(resolve(PATHS.handoffDir, "originals", f.file))
      .extract({ left: f.left, top: 0, width: f.width, height: f.height })
      .resize(PW, PH).png().toBuffer()));

  const svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">${FACES.map((f, i) => {
    const x = X0 + i * (PW + GAP);
    return `<rect x="${x - 3}" y="${Y0 - 3}" width="${PW + 6}" height="${PH + 6}" fill="none" stroke="${HAIR}" stroke-width="3"/>
      <text x="${x + PW / 2}" y="${Y0 + PH + 46}" text-anchor="middle" font-family="Helvetica,Arial,sans-serif"
        font-size="38" font-weight="bold" fill="${INK}">${f.name}</text>`;
  }).join("")}</svg>`;

  const png = await sharp({ create: { width: W, height: H, channels: 3, background: PAPER } })
    .composite([
      ...cut.map((input, i) => ({ input, left: X0 + i * (PW + GAP), top: Y0 })),
      { input: Buffer.from(svg), left: 0, top: 0 },
    ]).png().toBuffer();

  const out = resolve(PATHS.handoffDir, "photos", "n91_eisenhower_bradley_portraits.png");
  writeFileSync(out, png);
  log.info("photo", `n91_eisenhower_bradley_portraits — ${W}x${H}, ${(png.length / 1024).toFixed(0)} KB`);
})();
