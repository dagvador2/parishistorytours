/**
 * Live position through navigator.geolocation.watchPosition(), plus the
 * device compass heading when the platform provides one.
 *
 * - `denied` becomes true on PERMISSION_DENIED (the app then runs in
 *   "tap a pin" mode); other errors keep the last fix.
 * - Consecutive fixes accumulate `walked` metres, ignoring jitter below the
 *   reported accuracy so a stationary phone does not "walk".
 * - Dev aid: `?sim=lat,lng` (or `?sim=1` for the prototype's test position)
 *   replaces the GPS with a fixed point, `?sim=walk` moves it along the
 *   route at walking pace. Never active without the query parameter.
 */
import { useEffect, useRef, useState } from "react";
import { ROUTE, type LatLng } from "../../data/self-guided/left-bank-ww2";
import { dist } from "./geo";

export interface GeoState {
  user: LatLng | null;
  accuracy: number | null;
  denied: boolean;
  /** compass heading in degrees, null when unavailable */
  heading: number | null;
  /** metres walked since the hook started (jitter-filtered) */
  walked: number;
}

const SIM_POINT: LatLng = [48.8466, 2.3405];

function readSim(): { mode: "point" | "walk"; point: LatLng } | null {
  if (typeof window === "undefined") return null;
  const v = new URLSearchParams(window.location.search).get("sim");
  if (!v) return null;
  if (v === "walk") return { mode: "walk", point: ROUTE[0] };
  const m = v.match(/^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/);
  return { mode: "point", point: m ? [Number(m[1]), Number(m[2])] : SIM_POINT };
}

export function useGeolocation(enabled: boolean): GeoState & { requestCompass: () => void } {
  const [state, setState] = useState<GeoState>({ user: null, accuracy: null, denied: false, heading: null, walked: 0 });
  const last = useRef<{ pos: LatLng; acc: number } | null>(null);

  const push = (pos: LatLng, acc: number) => {
    setState((s) => {
      let walked = s.walked;
      if (last.current) {
        const d = dist(last.current.pos, pos);
        // Only count movement larger than the GPS noise of both fixes.
        if (d > Math.max(8, Math.min(50, (last.current.acc + acc) / 2))) {
          walked += d;
          last.current = { pos, acc };
        }
      } else {
        last.current = { pos, acc };
      }
      return { ...s, user: pos, accuracy: acc, denied: false, walked };
    });
  };

  useEffect(() => {
    if (!enabled) return;
    const sim = readSim();
    if (sim) {
      if (sim.mode === "point") {
        push(sim.point, 5);
        return;
      }
      // Walk the route at ~1.3 m/s, one fix per second.
      let seg = 0;
      let along = 0;
      const id = window.setInterval(() => {
        if (seg >= ROUTE.length - 1) return;
        const a = ROUTE[seg];
        const b = ROUTE[seg + 1];
        const len = dist(a, b);
        along += 1.3;
        if (along >= len) {
          seg += 1;
          along = 0;
          push(b, 5);
          return;
        }
        const f = along / len;
        push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f], 5);
      }, 1000);
      return () => window.clearInterval(id);
    }

    if (!("geolocation" in navigator)) {
      setState((s) => ({ ...s, denied: true }));
      return;
    }
    const id = navigator.geolocation.watchPosition(
      (p) => push([p.coords.latitude, p.coords.longitude], p.coords.accuracy ?? 30),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setState((s) => ({ ...s, denied: true }));
      },
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 },
    );
    return () => navigator.geolocation.clearWatch(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  // Compass. iOS 13+ requires an explicit permission request from a user gesture.
  const compassArmed = useRef(false);
  const listen = () => {
    if (compassArmed.current) return;
    compassArmed.current = true;
    const onOrient = (e: DeviceOrientationEvent) => {
      const ios = (e as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading;
      let h: number | null = null;
      if (typeof ios === "number" && !Number.isNaN(ios)) h = ios;
      else if (e.absolute && typeof e.alpha === "number") h = (360 - e.alpha) % 360;
      if (h !== null) setState((s) => (s.heading !== null && Math.abs(s.heading - h!) < 2 ? s : { ...s, heading: h }));
    };
    window.addEventListener("deviceorientationabsolute" as "deviceorientation", onOrient, true);
    window.addEventListener("deviceorientation", onOrient, true);
  };
  const requestCompass = () => {
    const DOE = (window as unknown as { DeviceOrientationEvent?: { requestPermission?: () => Promise<string> } }).DeviceOrientationEvent;
    if (DOE?.requestPermission) {
      DOE.requestPermission().then((r) => { if (r === "granted") listen(); }).catch(() => {});
    } else {
      listen();
    }
  };
  useEffect(() => {
    if (!enabled) return;
    const DOE = (window as unknown as { DeviceOrientationEvent?: { requestPermission?: () => Promise<string> } }).DeviceOrientationEvent;
    // Non-iOS: no permission needed, listen right away. iOS: wait for requestCompass() from a tap.
    if (!DOE?.requestPermission) listen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return { ...state, requestCompass };
}
