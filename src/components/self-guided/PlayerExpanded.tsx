/**
 * Phase C — full-screen player: photo well (44 % height) with cued photos,
 * caption, centred subtitle, seek, transport, footer. Collapses on chevron,
 * header tap or a > 70 px swipe down.
 */
import { useEffect, useRef, useState } from "react";
import type { Lang, Stop } from "../../data/self-guided/left-bank-ww2";
import { OFFENSIVE_GEO } from "../../data/self-guided/offensive-1940";
import { STRATEGIC_GEO } from "../../data/self-guided/strategic-1944";
import type { AssetsResponse } from "../../lib/self-guided/types";
import CampaignMap from "./CampaignMap";
import ClipWell from "./ClipWell";
import { mmss } from "./geo";
import { strings } from "./i18n";
import { kindLabel, stopLabel } from "./labels";
import RouteMap from "./RouteMap";
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

  // The photo that was showing before this one, held underneath until the new
  // one has decoded. Without it the well's own background shows through, which
  // reads as a blink — most visible between the two map loops, which differ by
  // a single arrow.
  const showing = useRef<typeof photo>(null);
  const [under, setUnder] = useState<typeof photo>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const before = showing.current;
    showing.current = photo;
    setReady(false);
    if (!before || !photo || before.key === photo.key) return;
    setUnder(before);
  }, [photo?.key]);

  // Clear the outgoing photo once the incoming one has decoded — one frame
  // later, so the browser has painted the new photo before the old one goes.
  useEffect(() => {
    if (!ready || !under) return;
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setUnder(null)));
    return () => cancelAnimationFrame(id);
  }, [ready, under?.key]);

  // Decode the next few photos ahead of their cue, so a cut lands on an image
  // that is already in memory rather than one still arriving.
  const media = section.media;
  useEffect(() => {
    const at = photo ? media.findIndex((m) => m.key === photo.key) : -1;
    for (const m of media.slice(at + 1, at + 4)) {
      // for a clip this is its poster, which is what the cut lands on; the MP4
      // itself is already in the offline cache
      const img = new Image();
      img.decoding = "async";
      img.src = m.img;
    }
  }, [media, photo?.key]);

  // An image already in cache can finish before React attaches onLoad, so the
  // element is asked directly on mount as well.
  const markReady = (el: HTMLImageElement | null) => { if (el?.complete) setReady(true); };

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
          <>
            {under && under.key !== photo.key && (
              <img key={`under-${under.key}`} src={under.img} alt="" className="ag-well__img ag-well__img--under" aria-hidden="true"
                style={under.pos ? { objectPosition: under.pos } : undefined} />
            )}
            {photo.video ? (
              // A clip, played in a <video> on the audio clock — see ClipWell.
              <ClipWell media={photo} t={elapsed - photo.t} playing={playing} onReady={() => setReady(true)} />
            ) : photo.route ? (
              // Drawn live, on the audio clock — see RouteMap.
              <RouteMap media={photo} t={elapsed - photo.t} playing={playing} lang={lang} />
            ) : photo.offensive || photo.strategic ? (
              // Likewise for the two campaign maps — see CampaignMap.
              <CampaignMap
                media={photo} campaign={(photo.offensive ?? photo.strategic)!}
                geo={photo.strategic ? STRATEGIC_GEO : OFFENSIVE_GEO}
                t={elapsed - photo.t} playing={playing} lang={lang}
              />
            ) : (
              <img
                key={photo.key} src={photo.img} alt="" width={photo.w} height={photo.h}
                className={`ag-well__img ${ready ? "ag-well__img--in" : "ag-well__img--wait"}`}
                decoding="async" ref={markReady} onLoad={() => setReady(true)}
                style={photo.pos ? { objectPosition: photo.pos } : undefined}
              />
            )}
          </>
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
