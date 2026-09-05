/**
 * One <audio> element for the whole session (iOS unlocks it on the first
 * user-initiated play and keeps it playable afterwards), driven by its own
 * events: `timeupdate` feeds the subtitle/photo sync, `ended` advances the
 * tour. No setInterval anywhere.
 */
import { useCallback, useEffect, useRef, useState } from "react";

export interface AudioEngine {
  playing: boolean;
  duration: number;
  /** Load a source and position; plays only when `autoplay` (must come from a user gesture on iOS). */
  load: (src: string, startAt: number, autoplay: boolean) => void;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (t: number) => void;
  skip: (delta: number) => void;
  stop: () => void;
  element: () => HTMLAudioElement | null;
}

interface Options {
  onTime: (t: number) => void;
  onEnded: () => void;
}

export function useAudioEngine({ onTime, onEnded }: Options): AudioEngine {
  const el = useRef<HTMLAudioElement | null>(null);
  const src = useRef<string>("");
  const cb = useRef({ onTime, onEnded });
  cb.current = { onTime, onEnded };
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  /** Start position waiting for metadata; ticks are ignored until it is applied (a load() resets currentTime to 0 and fires timeupdate). */
  const pendingStart = useRef<number | null>(null);

  useEffect(() => {
    const a = new Audio();
    a.preload = "auto";
    (a as HTMLAudioElement & { playsInline?: boolean }).playsInline = true;
    a.setAttribute("playsinline", "");
    const onTimeUpdate = () => {
      if (pendingStart.current !== null || a.readyState < 1) return;
      cb.current.onTime(a.currentTime);
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEndedEv = () => { setPlaying(false); cb.current.onEnded(); };
    const onMeta = () => {
      setDuration(Number.isFinite(a.duration) ? a.duration : 0);
      if (pendingStart.current !== null) {
        const at = pendingStart.current;
        pendingStart.current = null;
        if (at > 0) a.currentTime = at;
        cb.current.onTime(a.currentTime);
      }
    };
    a.addEventListener("timeupdate", onTimeUpdate);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onEndedEv);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("durationchange", onMeta);
    el.current = a;
    return () => {
      a.pause();
      a.removeAttribute("src");
      a.load();
      el.current = null;
    };
  }, []);

  const load = useCallback((next: string, startAt: number, autoplay: boolean) => {
    const a = el.current;
    if (!a) return;
    const sameKey = (u: string) => u.split("?")[0];
    if (sameKey(src.current) !== sameKey(next)) {
      src.current = next;
      pendingStart.current = startAt;
      a.src = next;
      a.load();
    } else if (Math.abs(a.currentTime - startAt) > 1.5) {
      a.currentTime = startAt;
    }
    if (autoplay) void a.play().catch(() => setPlaying(false));
  }, []);

  const play = useCallback(() => { void el.current?.play().catch(() => setPlaying(false)); }, []);
  const pause = useCallback(() => el.current?.pause(), []);
  const toggle = useCallback(() => { const a = el.current; if (!a) return; if (a.paused) void a.play().catch(() => setPlaying(false)); else a.pause(); }, []);
  const seek = useCallback((t: number) => {
    const a = el.current;
    if (!a) return;
    const max = Number.isFinite(a.duration) && a.duration > 0 ? a.duration - 0.5 : Number.MAX_SAFE_INTEGER;
    a.currentTime = Math.min(max, Math.max(0, t));
    cb.current.onTime(a.currentTime);
  }, []);
  const skip = useCallback((delta: number) => { const a = el.current; if (a) seek(a.currentTime + delta); }, [seek]);
  const stop = useCallback(() => {
    const a = el.current;
    if (!a) return;
    a.pause();
    src.current = "";
    a.removeAttribute("src");
    a.load();
    setDuration(0);
  }, []);
  const element = useCallback(() => el.current, []);

  return { playing, duration, load, play, pause, toggle, seek, skip, stop, element };
}
