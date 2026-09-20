/**
 * A cue that is a short clip (the bullet marks on the Sorbonne's column) rather
 * than a still: an MP4 played in the well, muted and inline, looping for as
 * long as the cue is on screen.
 *
 * It runs on the audio clock like the two live maps, not on its own: it starts
 * again from zero when the cue comes round, it stops when the narration is
 * paused, and a seek moves it. Only a drift wider than DRIFT_SEC is corrected,
 * because setting `currentTime` on every frame would stutter the picture.
 *
 * The still of the same name is the poster, so the first frame is on screen
 * before a single byte of video has been decoded — the cut is the same as
 * between two photos.
 */
import { useEffect, useRef } from "react";
import type { ManifestMedia } from "../../lib/self-guided/types";

/** Beyond this, the clip is put back where the narration says it should be. */
const DRIFT_SEC = 0.4;

export default function ClipWell({ media, t, playing, onReady }: {
  media: ManifestMedia & { key: string };
  /** seconds since the cue started, from the audio clock */
  t: number;
  playing: boolean;
  onReady: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const duration = el.duration;
    if (Number.isFinite(duration) && duration > 0) {
      const want = Math.max(0, t) % duration;
      if (Math.abs(el.currentTime - want) > DRIFT_SEC) el.currentTime = want;
    }
    if (playing) {
      // Autoplay is allowed because the clip is muted; a refusal is not worth
      // reporting — the poster stays up and the narration is unaffected.
      void el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [playing, t, media.key]);

  return (
    <video
      key={media.key} ref={ref} src={media.video} poster={media.img}
      width={media.w} height={media.h}
      className="ag-well__img ag-well__img--in"
      muted playsInline autoPlay loop preload="auto" disableRemotePlayback
      // a clip carries no sound, and the narration owns the Media Session
      aria-hidden="true" tabIndex={-1}
      onLoadedData={onReady}
      style={media.pos ? { objectPosition: media.pos } : undefined}
    />
  );
}
