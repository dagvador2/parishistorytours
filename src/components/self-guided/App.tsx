/**
 * Root island of the audioguide. Single screen, vertical flex:
 * header → segmented progress → map (flex 1) → bottom player, plus overlays
 * (expanded player, completion sheet, menu).
 */
import { useEffect, useReducer, useState } from "react";
import type { Lang } from "../../data/self-guided/left-bank-ww2";
import Header from "./Header";
import MapView from "./MapView";
import Progress from "./Progress";
import { strings } from "./i18n";
import { loadState, reducer, saveState, type TourState } from "./state";
import { useAssets } from "./useAssets";

interface Props {
  lang: Lang;
}

export default function App({ lang: urlLang }: Props) {
  const [state, dispatch] = useReducer(reducer, urlLang, (l) => loadState(l));
  const [menuOpen, setMenuOpen] = useState(false);
  const [recenterTick, setRecenterTick] = useState(0);
  // Position comes from the geolocation hook (later commit); null until then.
  const user = null;
  const t = strings(state.lang);

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
          <MapView
            lang={state.lang}
            phase={state.phase}
            idx={state.idx}
            completed={state.completed}
            gpsDenied={state.gpsDenied}
            user={user}
            recenterTick={recenterTick}
            onPinTap={(i) => { setMenuOpen(false); dispatch({ type: "arrive", idx: i }); }}
          >
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
          </MapView>
          {/* player lands in the next commits */}
        </>
      )}
      {menuOpen && null}
    </div>
  );
}

export type { TourState };
