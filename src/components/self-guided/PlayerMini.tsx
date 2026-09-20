/** Phase C' — collapsed player above the map. Header tap re-expands. */
import { footerLine, nowPlayingEyebrow, type PlayerProps } from "./PlayerExpanded";
import SeekBar from "./SeekBar";
import { currentMedia } from "./sync";
import Transport from "./Transport";

export default function PlayerMini({ lang, idx, stop, section, elapsed, playing, narrationNote, onToggle, onPrev, onBack, onFwd, onSkip, onSeek, onExpand }: PlayerProps & { onExpand: () => void }) {
  const photo = currentMedia(section.media, elapsed);
  return (
    <div className="ag-player ag-player--mini">
      <div className="ag-mini__head" onClick={onExpand} role="button" aria-label="Expand player">
        {photo && <img src={photo.img} alt="" className="ag-mini__thumb" style={photo.pos ? { objectPosition: photo.pos } : undefined} />}
        <div className="ag-player__text">
          <div className="ag-mini__eyebrow">{nowPlayingEyebrow(lang, stop)}</div>
          <div className="ag-mini__name">{stop.name[lang]}</div>
        </div>
        <span className="ag-mini__chevron"><span /></span>
      </div>
      {narrationNote && <div className="ag-mini__note">{narrationNote}</div>}
      <SeekBar elapsed={elapsed} duration={section.durationSec} theme="light" onSeek={onSeek} />
      <Transport playing={playing} theme="light" onPrev={onPrev} onBack={onBack} onToggle={onToggle} onFwd={onFwd} onSkip={onSkip} />
      <div className="ag-mini__footer">{footerLine(lang, idx, elapsed, section.durationSec)}</div>
    </div>
  );
}
