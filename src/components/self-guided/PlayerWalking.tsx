import type { Lang } from "../../data/self-guided/left-bank-ww2";
import { strings } from "./i18n";
import { stopLabel } from "./labels";
import { distanceLabels } from "./NextStopCard";

interface Props {
  lang: Lang;
  idx: number;
  gpsDenied: boolean;
  distanceM: number | null;
  onArrive: () => void;
}

/** Phase A: white bar, "Head to Stop 2 — …", distance, "I'm here" fallback. */
export default function PlayerWalking({ lang, idx, gpsDenied, distanceM, onArrive }: Props) {
  const t = strings(lang);
  const d = distanceLabels(lang, gpsDenied ? null : distanceM);
  return (
    <div className="ag-player ag-player--walking">
      <div className="ag-player__disc"><span className="ag-player__dot" /></div>
      <div className="ag-player__text">
        <div className="ag-player__title">{t.headTo} {stopLabel(idx, lang)}</div>
        <div className="ag-player__sub">{gpsDenied ? t.gpsOff : d.sub || "…"}</div>
      </div>
      <button type="button" className="ag-btn-ghost" onClick={onArrive}>{t.imHere}</button>
    </div>
  );
}
