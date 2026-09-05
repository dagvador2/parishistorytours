import { STOPS, type Lang, type Stop } from "../../data/self-guided/left-bank-ww2";
import { strings } from "./i18n";

/** "Stop 2 — Palais du Luxembourg" / "Start — Introduction" / "Interstop — …" / "End of tour" */
export function stopLabel(i: number, lang: Lang): string {
  const s = STOPS[i];
  const t = strings(lang);
  if (!s) return t.end;
  if (s.kind === "stop") return `${t.stop} ${s.n} — ${s.name[lang]}`;
  if (s.kind === "intro") return `${t.start} — ${s.name[lang]}`;
  return `${t.inter} — ${s.name[lang]}`;
}

/** "Stop 2" / "Start" / "Interstop" */
export function kindLabel(s: Stop, lang: Lang): string {
  const t = strings(lang);
  if (s.kind === "stop") return `${t.stop} ${s.n}`;
  if (s.kind === "intro") return t.start;
  return t.inter;
}
