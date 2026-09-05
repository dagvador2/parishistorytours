/**
 * Lock-screen / background controls through the Media Session API:
 * title = stop name, artist = "WWII Left Bank · Paris History Tours",
 * artwork = current photo. Handlers map to the transport row.
 */
import { useEffect } from "react";
import type { Lang, Stop } from "../../data/self-guided/left-bank-ww2";

interface Handlers {
  play: () => void;
  pause: () => void;
  prev: () => void;
  next: () => void;
  back: () => void;
  fwd: () => void;
  seekTo: (t: number) => void;
}

const ARTIST = "WWII Left Bank · Paris History Tours";

export function useMediaSession(active: boolean, lang: Lang, stop: Stop, artwork: { src: string; w: number; h: number } | null, handlers: Handlers) {
  useEffect(() => {
    if (!active || !("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    ms.metadata = new MediaMetadata({
      title: stop.name[lang],
      artist: ARTIST,
      album: lang === "fr" ? "Visite libre" : "Self-guided tour",
      artwork: artwork ? [{ src: artwork.src, sizes: `${artwork.w}x${artwork.h}`, type: "image/webp" }] : [],
    });
    return () => {
      ms.metadata = null;
    };
  }, [active, lang, stop, artwork?.src]);

  useEffect(() => {
    if (!active || !("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    const set = (action: MediaSessionAction, fn: MediaSessionActionHandler | null) => {
      try { ms.setActionHandler(action, fn); } catch { /* unsupported action on this platform */ }
    };
    set("play", () => handlers.play());
    set("pause", () => handlers.pause());
    set("previoustrack", () => handlers.prev());
    set("nexttrack", () => handlers.next());
    set("seekbackward", () => handlers.back());
    set("seekforward", () => handlers.fwd());
    set("seekto", (d) => { if (typeof d.seekTime === "number") handlers.seekTo(d.seekTime); });
    return () => {
      (["play", "pause", "previoustrack", "nexttrack", "seekbackward", "seekforward", "seekto"] as MediaSessionAction[]).forEach((a) => set(a, null));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}
