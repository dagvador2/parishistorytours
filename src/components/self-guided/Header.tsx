import { STOPS, type Lang } from "../../data/self-guided/left-bank-ww2";
import { strings } from "./i18n";
import type { Phase } from "./state";

interface Props {
  lang: Lang;
  phase: Phase;
  completed: number;
  onMenu: () => void;
}

export default function Header({ lang, phase, completed, onMenu }: Props) {
  const t = strings(lang);
  const done = phase === "complete" ? STOPS.length : completed;
  return (
    <header className="ag-header">
      <div className="ag-monogram" aria-hidden="true">P</div>
      <div className="ag-header__text">
        <div className="ag-header__title">WWII Left Bank</div>
        <div className="ag-header__eyebrow">{t.selfGuided} · {done} {t.of} {STOPS.length} {t.stops}</div>
      </div>
      <button type="button" className="ag-iconbtn" aria-label="Menu" onClick={onMenu}>
        <span className="ag-burger"><span /><span /><span /></span>
      </button>
    </header>
  );
}
