/**
 * Root island of the audioguide. Single screen, vertical flex:
 * header → segmented progress → map (flex 1) → bottom player, plus overlays
 * (expanded player, completion sheet, menu).
 */
import { useEffect, useReducer, useState } from "react";
import type { Lang } from "../../data/self-guided/left-bank-ww2";
import Header from "./Header";
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
        <div className="ag-center" style={{ background: "var(--ag-paper-2)" }}>
          {/* map + player land in the next commits */}
          {assets.lang !== assets.requested ? t.narrationFallback : `${assets.sections.length} sections · ${Math.round(assets.totalDurationSec / 60)} ${t.min}`}
        </div>
      )}
      {menuOpen && null}
    </div>
  );
}

export type { TourState };
