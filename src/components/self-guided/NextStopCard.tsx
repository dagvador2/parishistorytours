import { WALK_M_PER_MIN, type Lang, type Stop } from "../../data/self-guided/left-bank-ww2";
import { strings } from "./i18n";
import { kindLabel } from "./labels";

interface Props {
  lang: Lang;
  stop: Stop;
  gpsDenied: boolean;
  /** metres to the stop, null when the position is unknown */
  distanceM: number | null;
  /** arrow rotation in degrees (bearing to the stop, relative to the device heading when known) */
  arrowDeg: number | null;
}

export function distanceLabels(lang: Lang, distanceM: number | null) {
  const t = strings(lang);
  if (distanceM === null) return { m: null, dist: "—", walk: "", sub: "" };
  const m = Math.round(distanceM / 10) * 10;
  const min = Math.max(1, Math.round(m / WALK_M_PER_MIN));
  return { m, dist: `${m} m`, walk: `≈ ${min} ${t.min}`, sub: `${m} m — ${t.about} ${min} ${t.minWalk}` };
}

/** Floating dark card over the map while walking: bearing arrow, next stop, live distance. */
export default function NextStopCard({ lang, stop, gpsDenied, distanceM, arrowDeg }: Props) {
  const t = strings(lang);
  const noGps = gpsDenied || distanceM === null;
  const d = distanceLabels(lang, gpsDenied ? null : distanceM);
  return (
    <div className="ag-next" role="status">
      <div className="ag-next__disc">
        {noGps || arrowDeg === null ? (
          <span className="ag-next__ring" />
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" style={{ transform: `rotate(${arrowDeg}deg)`, transition: "transform .4s ease" }} aria-hidden="true">
            <path d="M12 3 L19 20 L12 16 L5 20 Z" fill="#F7F3EC" />
          </svg>
        )}
      </div>
      <div className="ag-next__text">
        <div className="ag-next__eyebrow">{gpsDenied ? t.tapPin : `${t.next} · ${kindLabel(stop, lang)}`}</div>
        <div className="ag-next__name">{stop.name[lang]}</div>
      </div>
      <div className="ag-next__dist">
        <div className="ag-next__m">{d.dist}</div>
        <div className="ag-next__walk">{d.walk}</div>
      </div>
    </div>
  );
}
