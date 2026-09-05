/**
 * Phase C — full-screen player: photo well (44 % height) with cued photos,
 * caption, centred subtitle, seek, transport, footer. Collapses on chevron,
 * header tap or a > 70 px swipe down.
 */
import { useRef } from "react";
import type { Lang, Stop } from "../../data/self-guided/left-bank-ww2";
import type { AssetsResponse } from "../../lib/self-guided/types";
import { mmss } from "./geo";
import { strings } from "./i18n";
import { kindLabel, stopLabel } from "./labels";
import SeekBar from "./SeekBar";
import { currentMedia, currentSub, subtitleSize } from "./sync";
import Transport from "./Transport";

export interface PlayerProps {
  lang: Lang;
  idx: number;
  stop: Stop;
  section: AssetsResponse["sections"][number];
  elapsed: number;
  playing: boolean;
  /** shown when the narration language differs from the UI language */
  narrationNote: string | null;
  onToggle: () => void;
  onPrev: () => void;
  onBack: () => void;
  onFwd: () => void;
  onSkip: () => void;
  onSeek: (t: number) => void;
}

export function nowPlayingEyebrow(lang: Lang, stop: Stop): string {
  const t = strings(lang);
  const place = stop.place[lang];
  return `${t.nowPlaying} · ${kindLabel(stop, lang)}${place ? ` · ${place}` : ""}`;
}

export function footerLine(lang: Lang, idx: number, elapsed: number, duration: number): string {
  const t = strings(lang);
  return `${mmss(Math.max(0, duration - elapsed))} ${t.left} · ${t.next}: ${stopLabel(idx + 1, lang)}`;
}

export default function PlayerExpanded({ lang, idx, stop, section, elapsed, playing, narrationNote, onToggle, onPrev, onBack, onFwd, onSkip, onSeek, onCollapse }: PlayerProps & { onCollapse: () => void }) {
  const t = strings(lang);
  const dragY = useRef<number | null>(null);
  const photo = currentMedia(section.media, elapsed);
  const sub = currentSub(section.subs, elapsed);
  const text = sub?.text ?? "";

  return (
    <div
      className="ag-expanded"
      onTouchStart={(e) => { dragY.current = e.touches[0].clientY; }}
      onTouchEnd={(e) => { if (dragY.current !== null && e.changedTouches[0].clientY - dragY.current > 70) onCollapse(); dragY.current = null; }}
    >
      <div className="ag-expanded__top" onClick={onCollapse} role="button" aria-label="Collapse player">
        <span className="ag-expanded__chevron"><span /></span>
        <div className="ag-expanded__title">
          <div className="ag-expanded__handle" />
          <div className="ag-expanded__eyebrow">{nowPlayingEyebrow(lang, stop)}</div>
        </div>
        <span style={{ width: 44, height: 44 }} />
      </div>

      <div className="ag-well">
        {photo ? (
          <img key={photo.key} src={photo.img} alt="" width={photo.w} height={photo.h} className="ag-well__img" decoding="async" />
        ) : (
          <div className="ag-well__empty">
            <div className="ag-well__badge">{stop.badge}</div>
            <div className="ag-well__hint">{t.lookAround}</div>
          </div>
        )}
      </div>
      <div className="ag-caption">{photo?.cap ?? ""}</div>

      <div className="ag-subtitle">
        <div className="ag-subtitle__text" style={{ fontSize: subtitleSize(text) }}>{text}</div>
      </div>

      <div className="ag-controls">
        {narrationNote && <div className="ag-controls__note">{narrationNote}</div>}
        <SeekBar elapsed={elapsed} duration={section.durationSec} theme="dark" onSeek={onSeek} />
        <Transport playing={playing} theme="dark" onPrev={onPrev} onBack={onBack} onToggle={onToggle} onFwd={onFwd} onSkip={onSkip} />
        <div className="ag-controls__footer">{footerLine(lang, idx, elapsed, section.durationSec)}</div>
      </div>
    </div>
  );
}
