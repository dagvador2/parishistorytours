/**
 * Tour state machine + persistence.
 *
 *   walking → arrived → playing → walking(idx+1) … → complete
 *
 * Everything needed to resume after a phone lock or a reload is persisted in
 * localStorage on every change (elapsed is throttled by the audio engine).
 */
import { STOPS, type Lang } from "../../data/self-guided/left-bank-ww2";

export type Phase = "walking" | "arrived" | "playing" | "complete";

export interface TourState {
  phase: Phase;
  /** current stop index, 0–8 */
  idx: number;
  /** number of stops finished; drives the progress bar and visited pins */
  completed: number;
  /** playback position of the current section, seconds */
  elapsed: number;
  /** UI language */
  lang: Lang;
  /** narration language preference; null = follow the UI language */
  audioLang: Lang | null;
  gpsDenied: boolean;
  /** expanded (full-screen) vs mini player while playing */
  expanded: boolean;
  /** epoch ms of the first play, for the completion recap */
  startedAt: number | null;
  finishedAt: number | null;
  /** metres walked, accumulated from GPS fixes */
  walkedM: number;
}

export const STORAGE_KEY = "pht:self-guided:left-bank-ww2:v1";

export function initialState(lang: Lang): TourState {
  return { phase: "walking", idx: 0, completed: 0, elapsed: 0, lang, audioLang: null, gpsDenied: false, expanded: false, startedAt: null, finishedAt: null, walkedM: 0 };
}

export function loadState(lang: Lang): TourState {
  const base = initialState(lang);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return base;
    const s = JSON.parse(raw) as Partial<TourState>;
    const idx = Math.min(STOPS.length - 1, Math.max(0, Number(s.idx ?? 0)));
    return {
      ...base,
      ...s,
      idx,
      completed: Math.min(STOPS.length, Math.max(0, Number(s.completed ?? 0))),
      elapsed: Math.max(0, Number(s.elapsed ?? 0)),
      lang: s.lang === "fr" || s.lang === "en" ? s.lang : lang,
      audioLang: s.audioLang === "fr" || s.audioLang === "en" ? s.audioLang : null,
      phase: (["walking", "arrived", "playing", "complete"] as Phase[]).includes(s.phase as Phase) ? (s.phase as Phase) : "walking",
    };
  } catch {
    return base;
  }
}

export function saveState(s: TourState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* private mode / quota: the tour still works, it just won't resume */
  }
}

export type Action =
  | { type: "arrive"; idx: number }
  | { type: "play" }
  | { type: "finish" }
  | { type: "prev" }
  | { type: "seek"; elapsed: number }
  | { type: "tick"; elapsed: number }
  | { type: "expand" }
  | { type: "collapse" }
  | { type: "setLang"; lang: Lang }
  | { type: "setAudioLang"; lang: Lang | null }
  | { type: "setGpsDenied"; denied: boolean }
  | { type: "walked"; metres: number }
  | { type: "restart" };

export function reducer(s: TourState, a: Action): TourState {
  switch (a.type) {
    case "arrive":
      // Tapping a pin forces arrival on that stop, even one already visited.
      return { ...s, phase: "arrived", idx: a.idx, elapsed: 0, expanded: false };
    case "play":
      return { ...s, phase: "playing", elapsed: 0, expanded: true, startedAt: s.startedAt ?? Date.now() };
    case "finish": {
      const next = s.idx + 1;
      if (next >= STOPS.length) return { ...s, phase: "complete", completed: STOPS.length, elapsed: 0, expanded: false, finishedAt: Date.now() };
      return { ...s, phase: "walking", idx: next, completed: Math.max(s.completed, next), elapsed: 0, expanded: false };
    }
    case "prev":
      // ⏮ = restart the track, or go to the previous stop if within the first 5 s
      if (s.elapsed > 5 || s.idx === 0) return { ...s, elapsed: 0 };
      return { ...s, idx: s.idx - 1, elapsed: 0 };
    case "seek":
      return { ...s, elapsed: Math.max(0, a.elapsed) };
    case "tick":
      return s.elapsed === a.elapsed ? s : { ...s, elapsed: a.elapsed };
    case "expand":
      return s.expanded ? s : { ...s, expanded: true };
    case "collapse":
      return s.expanded ? { ...s, expanded: false } : s;
    case "setLang":
      return { ...s, lang: a.lang };
    case "setAudioLang":
      return { ...s, audioLang: a.lang };
    case "setGpsDenied":
      return s.gpsDenied === a.denied ? s : { ...s, gpsDenied: a.denied };
    case "walked":
      return { ...s, walkedM: s.walkedM + a.metres };
    case "restart":
      return { ...initialState(s.lang), audioLang: s.audioLang, gpsDenied: s.gpsDenied };
    default:
      return s;
  }
}
