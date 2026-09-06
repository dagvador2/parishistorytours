/**
 * Bottom-sheet menu: UI language, narration language (only when several
 * exist on the bucket), PDF, WhatsApp, location toggle, restart, offline
 * status, attribution.
 */
import { WHATSAPP_NUMBER } from "../../lib/whatsapp";
import type { Lang } from "../../data/self-guided/left-bank-ww2";
import { strings } from "./i18n";

export interface OfflineStatus {
  state: "idle" | "unsupported" | "preparing" | "ready" | "failed";
  done: number;
  total: number;
}

interface Props {
  lang: Lang;
  /** language of the narration actually served */
  audioLang: Lang;
  available: Lang[];
  gpsDenied: boolean;
  /** short welcome sheet, null while none is published */
  pdfUrl: string | null;
  /** whole days left before the access link expires, null for the dev token */
  daysLeft: number | null;
  offline: OfflineStatus;
  onClose: () => void;
  onSetLang: (l: Lang) => void;
  onSetAudioLang: (l: Lang) => void;
  onToggleGps: () => void;
  onRestart: () => void;
  onPdfClick: () => void;
}

function Segmented({ value, onChange }: { value: Lang; onChange: (l: Lang) => void }) {
  return (
    <span className="ag-seg">
      {(["en", "fr"] as Lang[]).map((l) => (
        <button key={l} type="button" className={`ag-seg__btn${value === l ? " ag-seg__btn--on" : ""}`} onClick={() => onChange(l)} aria-pressed={value === l}>{l.toUpperCase()}</button>
      ))}
    </span>
  );
}

export default function Menu({ lang, audioLang, available, gpsDenied, pdfUrl, daysLeft, offline, onClose, onSetLang, onSetAudioLang, onToggleGps, onRestart, onPdfClick }: Props) {
  const t = strings(lang);
  const offlineLine =
    offline.state === "preparing" ? `${t.offlinePreparing} ${offline.done}/${offline.total} ${t.offlineAudio}`
    : offline.state === "ready" ? t.offlineReady
    : offline.state === "failed" ? t.offlineFailed
    : offline.state === "unsupported" ? t.offlineNotSupported
    : "";
  return (
    <div className="ag-scrim ag-scrim--menu" onClick={onClose} role="dialog" aria-label="Menu">
      <div className="ag-sheet ag-sheet--menu" onClick={(e) => e.stopPropagation()}>
        <div className="ag-sheet__grab" />
        <div className="ag-row">
          <span className="ag-row__label">{t.language}</span>
          <Segmented value={lang} onChange={onSetLang} />
        </div>
        {available.length > 1 ? (
          <div className="ag-row">
            <span className="ag-row__label">{t.narration}</span>
            <Segmented value={audioLang} onChange={onSetAudioLang} />
          </div>
        ) : audioLang !== lang ? (
          <div className="ag-row ag-row--note">{t.narrationFallbackLong}</div>
        ) : null}
        {pdfUrl && (
          <a href={pdfUrl} target="_blank" rel="noopener" className="ag-row ag-row--link" onClick={onPdfClick}>
            <span>{t.pdf}</span><span className="ag-row__hint">↓</span>
          </a>
        )}
        <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener" className="ag-row ag-row--link">
          <span>{t.support}</span><span className="ag-row__hint">WhatsApp ↗</span>
        </a>
        <div className="ag-row">
          <span className="ag-row__label">{t.location}</span>
          <button type="button" className="ag-pill" onClick={onToggleGps}>{gpsDenied ? t.off : t.on}</button>
        </div>
        {daysLeft !== null && (
          <div className="ag-row">
            <span className="ag-row__label">{t.accessLeft}</span>
            <span className="ag-row__hint">{daysLeft <= 0 ? t.accessLastDay : t.accessDays.replace("{days}", String(daysLeft))}</span>
          </div>
        )}
        <button type="button" className="ag-row ag-row--danger" onClick={onRestart}>{t.restart}</button>
        {offlineLine && <div className={`ag-offline ag-offline--${offline.state}`} role="status">{offlineLine}</div>}
        <div className="ag-sheet__foot">Paris History Tours · parishistorytours.com<br />{t.mapAttribution}</div>
      </div>
    </div>
  );
}
