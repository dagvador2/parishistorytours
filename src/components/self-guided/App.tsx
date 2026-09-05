/**
 * Root island of the audioguide. Single screen, vertical flex:
 * header → segmented progress → map (flex 1) → bottom player, plus overlays
 * (expanded player, completion sheet, menu).
 */
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { STOPS, type Lang } from "../../data/self-guided/left-bank-ww2";
import Header from "./Header";
import MapView from "./MapView";
import NextStopCard from "./NextStopCard";
import PlayerArrived from "./PlayerArrived";
import PlayerExpanded from "./PlayerExpanded";
import PlayerMini from "./PlayerMini";
import PlayerWalking from "./PlayerWalking";
import Progress from "./Progress";
import { bearing, dist } from "./geo";
import { strings } from "./i18n";
import { loadState, reducer, saveState, type TourState } from "./state";
import { useAssets } from "./useAssets";
import { useAudioEngine } from "./useAudioEngine";
import { useGeolocation } from "./useGeolocation";

interface Props {
  lang: Lang;
}

export default function App({ lang: urlLang }: Props) {
  const [state, dispatch] = useReducer(reducer, urlLang, (l) => loadState(l));
  const [menuOpen, setMenuOpen] = useState(false);
  const [recenterTick, setRecenterTick] = useState(0);
  const t = strings(state.lang);
  const stop = STOPS[state.idx];

  // The URL prefix wins over the stored language when the visitor opens the other locale on purpose.
  useEffect(() => {
    if (urlLang !== state.lang) dispatch({ type: "setLang", lang: urlLang });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlLang]);

  useEffect(() => {
    document.getElementById("ag-splash")?.remove();
  }, []);

  // Persistence: every change is saved, except that playback ticks are throttled to one write per 3 s
  // (plus a flush when the page is hidden, i.e. lock screen / app switch).
  const lastSave = useRef<{ at: number; snapshot: TourState | null }>({ at: 0, snapshot: null });
  const stateRef = useRef(state);
  stateRef.current = state;
  useEffect(() => {
    const prev = lastSave.current.snapshot;
    const onlyElapsed = prev !== null && Object.keys(state).every((k) => k === "elapsed" || (state as unknown as Record<string, unknown>)[k] === (prev as unknown as Record<string, unknown>)[k]);
    if (onlyElapsed && Date.now() - lastSave.current.at < 3000) return;
    saveState(state);
    lastSave.current = { at: Date.now(), snapshot: state };
  }, [state]);
  useEffect(() => {
    const flush = () => saveState(stateRef.current);
    document.addEventListener("visibilitychange", flush);
    window.addEventListener("pagehide", flush);
    return () => { document.removeEventListener("visibilitychange", flush); window.removeEventListener("pagehide", flush); };
  }, []);

  const { assets, error, loading, reload } = useAssets(state.audioLang ?? state.lang);
  const section = assets?.sections[state.idx];
  const narrationNote = assets && assets.lang !== state.lang ? t.narrationFallback : null;

  // Position + compass. When the visitor turned location off in the menu, the watch is released.
  const geo = useGeolocation(!state.gpsDenied);
  useEffect(() => {
    if (geo.denied && !state.gpsDenied) dispatch({ type: "setGpsDenied", denied: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo.denied]);
  // iOS asks for compass permission only from a user gesture: arm it on the first tap.
  useEffect(() => {
    const once = () => { geo.requestCompass(); document.removeEventListener("touchend", once); document.removeEventListener("click", once); };
    document.addEventListener("touchend", once, { passive: true });
    document.addEventListener("click", once);
    return () => { document.removeEventListener("touchend", once); document.removeEventListener("click", once); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const user = state.gpsDenied ? null : geo.user;
  const distanceM = useMemo(() => (user ? dist(user, stop.pos) : null), [user, stop]);
  const arrowDeg = useMemo(() => {
    if (!user) return null;
    const b = bearing(user, stop.pos);
    return geo.heading === null ? b : (b - geo.heading + 360) % 360;
  }, [user, stop, geo.heading]);

  // Audio engine. `wantsAutoplay` is set by user gestures (Play, ⏮ to previous stop) so that a restored
  // "playing" state after a reload shows the player paused instead of trying an autoplay iOS would block.
  const wantsAutoplay = useRef(false);
  const audio = useAudioEngine({
    onTime: useCallback((tSec: number) => dispatch({ type: "tick", elapsed: tSec }), []),
    onEnded: useCallback(() => dispatch({ type: "finish" }), []),
  });
  const audioSrc = state.phase === "playing" ? section?.audio ?? null : null;
  useEffect(() => {
    if (!audioSrc) {
      audio.stop();
      return;
    }
    audio.load(audioSrc, stateRef.current.elapsed, wantsAutoplay.current);
    wantsAutoplay.current = false;
    // Only the source identity matters (signed URLs change on refresh but the key does not).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioSrc?.split("?")[0], state.idx]);

  const onPlay = () => { wantsAutoplay.current = true; dispatch({ type: "play" }); };
  const onPrev = () => { wantsAutoplay.current = true; if (state.elapsed > 5 || state.idx === 0) audio.seek(0); dispatch({ type: "prev" }); };
  const onSeek = (sec: number) => { audio.seek(sec); };
  const onPinTap = (i: number) => { setMenuOpen(false); dispatch({ type: "arrive", idx: i }); };

  const playerProps = section && {
    lang: state.lang, idx: state.idx, stop, section, elapsed: state.elapsed, playing: audio.playing, narrationNote,
    onToggle: audio.toggle, onPrev, onBack: () => audio.skip(-15), onFwd: () => audio.skip(15), onSkip: () => dispatch({ type: "finish" }), onSeek,
  };

  return (
    <div className="ag-app" data-phase={state.phase}>
      <Header lang={state.lang} phase={state.phase} completed={state.completed} onMenu={() => setMenuOpen((o) => !o)} />
      <Progress phase={state.phase} idx={state.idx} completed={state.completed} />
      {error && !assets ? (
        <div className="ag-center">
          <div>{t.loadError}</div>
          <button type="button" className="ag-btn-ghost" onClick={() => void reload()}>{t.retry}</button>
        </div>
      ) : !assets ? (
        <div className="ag-center">{loading ? t.loading : ""}</div>
      ) : (
        <>
          <MapView lang={state.lang} phase={state.phase} idx={state.idx} completed={state.completed} gpsDenied={state.gpsDenied} user={user} recenterTick={recenterTick} onPinTap={onPinTap}>
            {state.gpsDenied && (
              <div className="ag-gps-banner" role="status">
                <span className="ag-gps-banner__dot" />
                <span className="ag-gps-banner__text">{t.gpsOff}</span>
                <button type="button" className="ag-gps-banner__btn" onClick={() => dispatch({ type: "setGpsDenied", denied: false })}>{t.enable}</button>
              </div>
            )}
            <button type="button" className="ag-fab" aria-label="Recenter" onClick={() => setRecenterTick((n) => n + 1)}>
              <span className="ag-crosshair" />
            </button>
            {state.phase === "walking" && <NextStopCard lang={state.lang} stop={stop} gpsDenied={state.gpsDenied} distanceM={distanceM} arrowDeg={arrowDeg} />}
          </MapView>

          {state.phase === "walking" && (
            <PlayerWalking lang={state.lang} idx={state.idx} gpsDenied={state.gpsDenied} distanceM={distanceM} onArrive={() => dispatch({ type: "arrive", idx: state.idx })} />
          )}
          {state.phase === "arrived" && section && (
            <PlayerArrived lang={state.lang} stop={stop} durationSec={section.durationSec} onPlay={onPlay} />
          )}
          {state.phase === "playing" && playerProps && !state.expanded && (
            <PlayerMini {...playerProps} onExpand={() => dispatch({ type: "expand" })} />
          )}
          {state.phase === "playing" && playerProps && state.expanded && (
            <PlayerExpanded {...playerProps} onCollapse={() => dispatch({ type: "collapse" })} />
          )}
        </>
      )}
      {menuOpen && null}
    </div>
  );
}

export type { TourState };
