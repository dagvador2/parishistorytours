import { useRef } from "react";
import { mmss } from "./geo";

interface Props {
  elapsed: number;
  duration: number;
  theme: "light" | "dark";
  onSeek: (t: number) => void;
}

/** 24 px hit area, 4 px track, 14 px thumb. Tap or drag seeks. */
export default function SeekBar({ elapsed, duration, theme, onSeek }: Props) {
  const bar = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const pct = duration > 0 ? Math.min(100, (elapsed / duration) * 100) : 0;

  const seekFromX = (clientX: number) => {
    const r = bar.current?.getBoundingClientRect();
    if (!r || duration <= 0) return;
    const f = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    onSeek(f * duration);
  };

  return (
    <div className={`ag-seek ag-seek--${theme}`}>
      <div
        ref={bar}
        className="ag-seek__bar"
        role="slider"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(elapsed)}
        onPointerDown={(e) => { dragging.current = true; (e.target as HTMLElement).setPointerCapture?.(e.pointerId); seekFromX(e.clientX); }}
        onPointerMove={(e) => { if (dragging.current) seekFromX(e.clientX); }}
        onPointerUp={() => { dragging.current = false; }}
        onPointerCancel={() => { dragging.current = false; }}
      >
        <div className="ag-seek__track" />
        <div className="ag-seek__fill" style={{ width: `${pct}%` }} />
        <div className="ag-seek__thumb" style={{ left: `calc(${pct}% - 7px)` }} />
      </div>
      <div className="ag-seek__times"><span>{mmss(elapsed)}</span><span>{mmss(duration)}</span></div>
    </div>
  );
}
