import type { Lang, Stop } from "../../data/self-guided/left-bank-ww2";
import { strings } from "./i18n";

interface Props {
  lang: Lang;
  stop: Stop;
  durationSec: number;
  onPlay: () => void;
}

/** Phase B: red block, "You've arrived at Stop 2", pulsing "Play audio (7 min)". */
export default function PlayerArrived({ lang, stop, durationSec, onPlay }: Props) {
  const t = strings(lang);
  const who = stop.kind === "stop" ? `${t.stop} ${stop.n}` : stop.name[lang];
  const min = Math.max(1, Math.round(durationSec / 60));
  return (
    <div className="ag-player ag-player--arrived">
      <div className="ag-arrived__row">
        <div className="ag-arrived__badge">{stop.badge}</div>
        <div className="ag-player__text">
          <div className="ag-arrived__eyebrow">{t.arrivedEyebrow}</div>
          <div className="ag-arrived__title">{t.arrivedAt} {who}</div>
        </div>
      </div>
      <div className="ag-arrived__cta-wrap">
        <span className="ag-arrived__halo" aria-hidden="true" />
        <button type="button" className="ag-arrived__cta" onClick={onPlay}>
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4 L20 12 L6 20 Z" fill="#8B0000" /></svg>
          <span>{t.playAudio} ({min} {t.min})</span>
        </button>
      </div>
    </div>
  );
}
