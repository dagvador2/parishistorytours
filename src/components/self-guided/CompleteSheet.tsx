/** Phase D — completion bottom sheet over a scrim: recap, review CTA, in-person tours, restart. */
import { REVIEW_URL, SITE_URL, STOPS, type Lang } from "../../data/self-guided/left-bank-ww2";
import { hoursMinutes } from "./geo";
import { strings } from "./i18n";

interface Props {
  lang: Lang;
  /** seconds between the first play and the end */
  durationSec: number | null;
  walkedM: number;
  onRestart: () => void;
  onReviewClick: () => void;
}

export default function CompleteSheet({ lang, durationSec, walkedM, onRestart, onReviewClick }: Props) {
  const t = strings(lang);
  const km = walkedM > 0 ? `${(walkedM / 1000).toFixed(1)} km` : "—";
  const dur = durationSec !== null && durationSec > 0 ? hoursMinutes(durationSec, t.hour, t.min) : "—";
  return (
    <div className="ag-scrim ag-scrim--complete" role="dialog" aria-label={t.completeEyebrow}>
      <div className="ag-sheet ag-sheet--complete">
        <div className="ag-sheet__head">
          <div className="ag-monogram ag-monogram--40">P</div>
          <div className="ag-sheet__eyebrow">{t.completeEyebrow}</div>
        </div>
        <div>
          <div className="ag-sheet__title">{t.completeTitle}</div>
          <div className="ag-sheet__body">{t.completeBody}</div>
        </div>
        <div className="ag-recap">
          <div className="ag-recap__cell"><div className="ag-recap__value">{dur}</div><div className="ag-recap__label">{t.recapTime}</div></div>
          <div className="ag-recap__cell"><div className="ag-recap__value">{km}</div><div className="ag-recap__label">{t.recapDist}</div></div>
          <div className="ag-recap__cell"><div className="ag-recap__value">{STOPS.length} / {STOPS.length}</div><div className="ag-recap__label">{t.recapStops}</div></div>
        </div>
        <div className="ag-sheet__ctas">
          <a href={REVIEW_URL} target="_blank" rel="noopener" className="ag-cta ag-cta--primary" onClick={onReviewClick}>{t.ctaReview}</a>
          <a href={SITE_URL} target="_blank" rel="noopener" className="ag-cta ag-cta--secondary">{t.ctaTours}</a>
        </div>
        <button type="button" className="ag-sheet__restart" onClick={onRestart}>{t.restart}</button>
      </div>
    </div>
  );
}
