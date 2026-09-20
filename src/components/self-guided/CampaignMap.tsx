/**
 * A campaign map, drawn and animated by the player: the German offensive of
 * May 1940 at stop 2, the Allied advance of 1944 at the last stop.
 *
 * The 1940 one used to be four pre-rendered animated WebP files, and it failed
 * the way every baked animation does: they ran on their own clock, so they
 * carried on through a pause, ignored a seek, and — because the player preloads
 * the next few photos and the browser shares one animation timeline between
 * elements pointing at the same file — were usually part-way through by the
 * time they appeared. A loop cannot stop, either, so the one story had to be
 * cut into four files, each starting again from an empty map.
 *
 * Here it is a single continuous map on the audio clock. Every arrow is drawn
 * at the second it is spoken (`media.offensive.beats` / `media.strategic.beats`,
 * resolved against the narration by the pipeline) and then stays, stepping back
 * as the next phase takes over. Pause and it freezes; scrub and it follows;
 * listen again and it starts from an empty map, as it should.
 *
 * The drawing itself lives in `campaignScene.ts`, which
 * `tools/preview-campaign-map.ts` renders to PNG — one drawing, two renderers,
 * so a preview cannot flatter the page.
 */
import type { CampaignGeography } from "../../data/self-guided/campaign-map";
import type { Lang } from "../../data/self-guided/left-bank-ww2";
import type { ManifestCampaign, ManifestMedia } from "../../lib/self-guided/types";
import { ARROW_INKS, campaignEndsAt, campaignScene, markerId, type Shape } from "./campaignScene";
import { useSmoothTime } from "./liveMap";

const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "Helvetica, Arial, sans-serif";

function draw(s: Shape, key: string) {
  switch (s.k) {
    case "path":
      return (
        <path key={key} d={s.d} fill="none" stroke={s.stroke} strokeWidth={s.w} strokeLinecap="round" strokeLinejoin="round"
          strokeDasharray={s.dash} markerEnd={s.marker ? `url(#${s.marker})` : undefined} opacity={s.op} />
      );
    case "circle":
      return <circle key={key} cx={s.cx} cy={s.cy} r={s.r} fill={s.fill} stroke={s.stroke} strokeWidth={s.sw} opacity={s.op} />;
    case "rect":
      return <rect key={key} x={s.x} y={s.y} width={s.w} height={s.h} rx={s.rx} fill={s.fill} stroke={s.stroke} strokeWidth={s.sw} opacity={s.op} />;
    case "text":
      return (
        <text key={key} x={s.x} y={s.y} fontFamily={s.serif ? SERIF : SANS} fontSize={s.size}
          fontWeight={s.bold ? 700 : undefined} fontStyle={s.italic ? "italic" : undefined}
          fill={s.fill} textAnchor={s.anchor} opacity={s.op}
          {...(s.halo ? { stroke: s.halo, strokeWidth: s.size * 0.18, paintOrder: "stroke" } : {})}>
          {s.s}
        </text>
      );
    case "image":
      return <image key={key} href={s.href} x={s.x} y={s.y} width={s.w} height={s.h} preserveAspectRatio="xMidYMid slice" opacity={s.op} />;
    case "group":
      return <g key={key} transform={s.transform} opacity={s.op}>{s.items.map((c, i) => draw(c, `${key}.${i}`))}</g>;
  }
}

export default function CampaignMap(
  { media, campaign, geo, t: audioT, playing, lang }:
  { media: ManifestMedia & { key: string }; campaign: ManifestCampaign; geo: CampaignGeography; t: number; playing: boolean; lang: Lang },
) {
  const t = useSmoothTime(audioT, playing, campaignEndsAt(campaign.beats, geo));
  const shapes = campaignScene({
    W: media.w, H: media.h, proj: campaign.proj, credit: campaign.credit, lang, geo,
    beats: campaign.beats, t,
  });

  return (
    <div className="ag-livemap">
      <img src={media.img} alt="" className="ag-well__img" decoding="async" />
      {/* `slice` is object-fit: cover, so the overlay is cropped exactly like the photo */}
      <svg className="ag-livemap__svg" viewBox={`0 0 ${media.w} ${media.h}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          {ARROW_INKS.map((c) => (
            <marker key={c} id={markerId(c)} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="4.6" markerHeight="4.6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill={c} />
            </marker>
          ))}
        </defs>
        {shapes.map((s, i) => draw(s, String(i)))}
      </svg>
    </div>
  );
}
