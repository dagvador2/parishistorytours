/**
 * Root island of the audioguide. Single screen, vertical flex:
 * header → segmented progress → map (flex 1) → bottom player, plus overlays
 * (expanded player, completion sheet, menu).
 */
import { useEffect, useMemo, useReducer, useState } from "react";
import { STOPS, type Lang } from "../../data/self-guided/left-bank-ww2";
import Header from "./Header";
import MapView from "./MapView";
import NextStopCard from "./NextStopCard";
import PlayerArrived from "./PlayerArrived";
import PlayerWalking from "./PlayerWalking";
import Progress from "./Progress";
import { bearing, dist } from "./geo";
import { strings } from "./i18n";
import { loadState, reducer, saveState, type TourState } from "./state";
import { useAssets } from "./useAssets";
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

  useEffect(() => saveState(state), [state]);

  const { assets, error, loading, reload } = useAssets(state.audioLang ?? state.lang);
  const section = assets?.sections[state.idx];

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

  const onPinTap = (i: number) => {
    setMenuOpen(false);
    dispatch({ type: "arrive", idx: i });
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
            <PlayerArrived lang={state.lang} stop={stop} durationSec={section.durationSec} onPlay={() => dispatch({ type: "play" })} />
          )}
        </>
      )}
      {menuOpen && null}
    </div>
  );
}

export type { TourState };
