/**
 * Root island of the audioguide. Single screen, vertical flex:
 * header → segmented progress → map (flex 1) → bottom player, plus overlays
 * (expanded player, completion sheet, menu).
 */
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { GEOFENCE_RADIUS_M, STOPS, type Lang } from "../../data/self-guided/left-bank-ww2";
import { track } from "../../scripts/track";
import { WHATSAPP_NUMBER } from "../../lib/whatsapp";
import CompleteSheet from "./CompleteSheet";
import Header from "./Header";
import MapView from "./MapView";
import Menu from "./Menu";
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
import { useMediaSession } from "./useMediaSession";
import { useOffline } from "./useOffline";
import { currentMedia } from "./sync";
import { useGeolocation } from "./useGeolocation";

interface Props {
  lang: Lang;
}

const localePath = (lang: Lang) => (lang === "fr" ? "/fr/self-guided-tour/access" : "/self-guided-tour/access");

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

  const { assets, purchase, error, loading, reload } = useAssets(state.audioLang ?? state.lang);
  const section = assets?.sections[state.idx];
  const narrationNote = assets && assets.lang !== state.lang ? t.narrationFallback : null;

  // Service worker + precache of the whole tour (audio, photos, PDF, basemap) for offline use.
  const offline = useOffline(assets, urlLang === "fr" ? "/fr/self-guided-tour/" : "/self-guided-tour/");

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

  // Walked distance: fold the hook's accumulator into the persisted state.
  const walkedSeen = useRef(0);
  useEffect(() => {
    const delta = geo.walked - walkedSeen.current;
    if (delta > 0) { walkedSeen.current = geo.walked; dispatch({ type: "walked", metres: delta }); }
  }, [geo.walked]);

  // Geofence: while walking, entering ~25 m of the next stop triggers "arrived" (once per stop).
  const autoArrived = useRef<number>(-1);
  useEffect(() => {
    if (state.phase !== "walking" || distanceM === null) return;
    const acc = geo.accuracy ?? 999;
    if (distanceM <= GEOFENCE_RADIUS_M && acc <= 60 && autoArrived.current !== state.idx) {
      autoArrived.current = state.idx;
      dispatch({ type: "arrive", idx: state.idx });
    }
  }, [distanceM, geo.accuracy, state.phase, state.idx]);

  // Analytics (GA4 through the site's track helper).
  useEffect(() => {
    if (state.phase === "arrived") track("sg_stop_reached", { stop: stop.sectionId, index: state.idx });
    if (state.phase === "complete") track("sg_tour_complete", {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.idx]);

  // Audio engine. `wantsAutoplay` is set by user gestures (Play, ⏮ to previous stop) so that a restored
  // "playing" state after a reload shows the player paused instead of trying an autoplay iOS would block.
  const wantsAutoplay = useRef(false);
  const audio = useAudioEngine({
    onTime: useCallback((tSec: number) => dispatch({ type: "tick", elapsed: tSec }), []),
    onEnded: useCallback(() => { track("sg_audio_completed", { stop: STOPS[stateRef.current.idx].sectionId }); dispatch({ type: "finish" }); }, []),
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

  // Lock-screen controls. Handlers read the latest state through refs, they are registered once.
  const handlersRef = useRef({ play: audio.play, pause: audio.pause, prev: () => {}, next: () => {}, back: () => audio.skip(-15), fwd: () => audio.skip(15), seekTo: audio.seek });
  handlersRef.current.prev = () => onPrev();
  handlersRef.current.next = () => dispatch({ type: "finish" });
  const artwork = section ? currentMedia(section.media, state.elapsed) : null;
  useMediaSession(state.phase === "playing", state.lang, stop, artwork ? { src: artwork.img, w: artwork.w, h: artwork.h } : null, {
    play: () => handlersRef.current.play(), pause: () => handlersRef.current.pause(), prev: () => handlersRef.current.prev(), next: () => handlersRef.current.next(),
    back: () => handlersRef.current.back(), fwd: () => handlersRef.current.fwd(), seekTo: (sec) => handlersRef.current.seekTo(sec),
  });

  const onPlay = () => { wantsAutoplay.current = true; dispatch({ type: "play" }); };
  const onPrev = () => { wantsAutoplay.current = true; if (state.elapsed > 5 || state.idx === 0) audio.seek(0); dispatch({ type: "prev" }); };
  const onSeek = (sec: number) => { audio.seek(sec); };
  const onPinTap = (i: number) => { setMenuOpen(false); dispatch({ type: "arrive", idx: i }); };
  const onSetLang = (l: Lang) => {
    dispatch({ type: "setLang", lang: l });
    // Keep the URL on the matching locale so a reload does not undo the choice.
    if (window.location.pathname !== localePath(l)) window.history.replaceState(null, "", localePath(l) + window.location.search);
    document.documentElement.lang = l;
  };
  const onRestart = (confirm: boolean) => {
    if (confirm && !window.confirm(t.restartConfirm)) return;
    autoArrived.current = -1;
    setMenuOpen(false);
    dispatch({ type: "restart" });
  };

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
          <div className="ag-center__title">{error === "network" ? t.loadError : t.accessErrorTitle}</div>
          {error !== "network" && <div>{error === "no_token" ? t.accessNoToken : t.accessInvalid}</div>}
          <div className="ag-center__actions">
            {error === "network" && <button type="button" className="ag-btn-ghost" onClick={() => void reload()}>{t.retry}</button>}
            <a className="ag-btn-ghost" href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener">{t.support}</a>
            <a className="ag-btn-ghost" href={state.lang === "fr" ? "/fr/self-guided-tour" : "/self-guided-tour"}>{t.productPage}</a>
          </div>
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
          {state.phase === "complete" && (
            <CompleteSheet
              lang={state.lang}
              durationSec={state.startedAt && state.finishedAt ? (state.finishedAt - state.startedAt) / 1000 : null}
              walkedM={state.walkedM}
              onRestart={() => onRestart(false)}
              onReviewClick={() => track("sg_review_cta", {})}
            />
          )}
        </>
      )}
      {menuOpen && (
        <Menu
          lang={state.lang}
          audioLang={assets?.lang ?? state.audioLang ?? state.lang}
          available={assets?.available ?? []}
          gpsDenied={state.gpsDenied}
          pdfUrl={assets?.pdf ?? null}
          zipUrl={purchase?.downloadAvailable ? purchase.zipUrl : null}
          offline={offline}
          onClose={() => setMenuOpen(false)}
          onSetLang={onSetLang}
          onSetAudioLang={(l) => dispatch({ type: "setAudioLang", lang: l })}
          onToggleGps={() => dispatch({ type: "setGpsDenied", denied: !state.gpsDenied })}
          onRestart={() => onRestart(true)}
          onPdfClick={() => track("sg_pdf_download", {})}
        />
      )}
    </div>
  );
}

export type { TourState };
