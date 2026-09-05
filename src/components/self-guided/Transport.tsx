interface Props {
  playing: boolean;
  theme: "light" | "dark";
  onPrev: () => void;
  onBack: () => void;
  onToggle: () => void;
  onFwd: () => void;
  onSkip: () => void;
}

/** ⏮ · −15 · ▶/❚❚ · +15 · ⏭ on a symmetric 48/48/64/48/48 grid so Play sits dead-centre. */
export default function Transport({ playing, theme, onPrev, onBack, onToggle, onFwd, onSkip }: Props) {
  const ink = theme === "dark" ? "#F7F3EC" : "#1C1714";
  const glyph = theme === "dark" ? "#8B0000" : "#F7F3EC";
  return (
    <div className={`ag-transport ag-transport--${theme}`}>
      <button type="button" className="ag-transport__side" aria-label="Previous stop" onClick={onPrev}>
        <span className="ag-transport__glyph"><span className="ag-transport__bar" style={{ background: ink }} /><svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true"><path d="M19 4 L5 12 L19 20 Z" fill={ink} /></svg></span>
      </button>
      <button type="button" className="ag-transport__side" onClick={onBack}>−15</button>
      <button type="button" className="ag-transport__play" aria-label={playing ? "Pause" : "Play"} onClick={onToggle}>
        {playing ? (
          <span className="ag-transport__pause"><span style={{ background: glyph }} /><span style={{ background: glyph }} /></span>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" style={{ display: "block" }} aria-hidden="true"><path d="M7 4 L21 12 L7 20 Z" fill={glyph} /></svg>
        )}
      </button>
      <button type="button" className="ag-transport__side" onClick={onFwd}>+15</button>
      <button type="button" className="ag-transport__side" aria-label="Skip to next stop" onClick={onSkip}>
        <span className="ag-transport__glyph"><svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4 L19 12 L5 20 Z" fill={ink} /></svg><span className="ag-transport__bar" style={{ background: ink }} /></span>
      </button>
    </div>
  );
}
