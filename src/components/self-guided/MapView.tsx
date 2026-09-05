/**
 * The map: sepia basemap, dashed route, main-stop and interstop pins, user
 * dot with pulse, auto framing on [user, next stop]. Overlays (GPS banner,
 * next-stop card, recenter FAB) are rendered by the parent as children.
 */
import { useEffect, useRef } from "react";
import type * as maplibregl from "maplibre-gl";
// MapLibre 6 resolves its worker relative to its own module URL, which breaks
// once Vite pre-bundles the dependency. Let Vite bundle the worker itself.
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import { ROUTE, STOPS, type Lang, type LatLng } from "../../data/self-guided/left-bank-ww2";
import { buildStyle } from "./mapStyle";
import type { Phase } from "./state";

interface Props {
  lang: Lang;
  phase: Phase;
  idx: number;
  completed: number;
  gpsDenied: boolean;
  user: LatLng | null;
  /** increment to re-run fitView (recenter FAB) */
  recenterTick: number;
  onPinTap: (idx: number) => void;
  children?: React.ReactNode;
}

const toLngLat = (p: LatLng): [number, number] => [p[1], p[0]];

function pinHtml(i: number, done: boolean, isNext: boolean): string {
  const s = STOPS[i];
  const ring = isNext ? "outline:4px solid rgba(139,0,0,.28);" : "";
  if (s.kind === "stop") {
    return `<div style="width:32px;height:32px;border-radius:50%;background:${done ? "#B4A79A" : "#8B0000"};color:#F7F3EC;border:3px solid #fff;box-sizing:border-box;display:grid;place-items:center;font:700 13px Georgia,serif;box-shadow:0 2px 6px rgba(0,0,0,.3);${ring}">${done ? "✓" : s.n}</div>`;
  }
  return `<div style="width:16px;height:16px;border-radius:50%;background:${done ? "#B4A79A" : "#F7F3EC"};border:3px solid ${done ? "#B4A79A" : "#8B0000"};box-sizing:border-box;box-shadow:0 1px 4px rgba(0,0,0,.25);${ring}"></div>`;
}

export default function MapView({ lang, phase, idx, completed, gpsDenied, user, recenterTick, onPinTap, children }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const lib = useRef<typeof maplibregl | null>(null);
  const pins = useRef<maplibregl.Marker[]>([]);
  const userMarker = useRef<maplibregl.Marker | null>(null);
  const ready = useRef(false);
  const latest = useRef({ phase, idx, completed, gpsDenied, user, onPinTap });
  latest.current = { phase, idx, completed, gpsDenied, user, onPinTap };

  const fitView = () => {
    const m = map.current;
    const L = lib.current;
    if (!m || !L) return;
    const { phase, idx, gpsDenied, user } = latest.current;
    const pts: LatLng[] = phase === "complete" || gpsDenied || !user ? STOPS.map((s) => s.pos) : [user, STOPS[idx].pos];
    const b = new L.LngLatBounds();
    pts.forEach((p) => b.extend(toLngLat(p)));
    m.fitBounds(b, { padding: { top: 40, left: 50, bottom: 90, right: 50 }, maxZoom: 17, duration: 600 });
  };

  const drawPins = () => {
    const m = map.current;
    const L = lib.current;
    if (!m || !L) return;
    const { phase, idx, completed } = latest.current;
    if (pins.current.length === 0) {
      pins.current = STOPS.map((s, i) => {
        const el = document.createElement("div");
        el.style.cursor = "pointer";
        el.setAttribute("role", "button");
        el.setAttribute("aria-label", s.name[lang]);
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          latest.current.onPinTap(i);
        });
        return new L.Marker({ element: el, anchor: "center" }).setLngLat(toLngLat(s.pos)).addTo(m);
      });
    }
    pins.current.forEach((marker, i) => {
      const done = phase === "complete" || i < completed;
      const isNext = i === idx && phase !== "complete";
      marker.getElement().innerHTML = pinHtml(i, done, isNext);
      marker.getElement().style.zIndex = STOPS[i].kind === "stop" ? "2" : "1";
    });
  };

  const drawUser = () => {
    const m = map.current;
    const L = lib.current;
    if (!m || !L) return;
    const { user, gpsDenied } = latest.current;
    if (!user || gpsDenied) {
      userMarker.current?.remove();
      userMarker.current = null;
      return;
    }
    if (!userMarker.current) {
      const el = document.createElement("div");
      el.className = "ag-user";
      el.innerHTML = "<b></b><i></i>";
      el.style.pointerEvents = "none";
      userMarker.current = new L.Marker({ element: el, anchor: "center" }).setLngLat(toLngLat(user)).addTo(m);
      userMarker.current.getElement().style.zIndex = "3";
    } else {
      userMarker.current.setLngLat(toLngLat(user));
    }
  };

  useEffect(() => {
    if (!container.current) return;
    let disposed = false;
    let cleanup: (() => void) | undefined;
    (async () => {
      const [mod, pm] = await Promise.all([import("maplibre-gl"), import("pmtiles"), import("maplibre-gl/dist/maplibre-gl.css")]);
      if (disposed) return;
      const L: typeof maplibregl = mod;
      lib.current = L;
      L.setWorkerUrl(maplibreWorkerUrl);
      // PMTiles protocol, registered once per page.
      if (!(window as unknown as { __agPmtiles?: boolean }).__agPmtiles) {
        L.addProtocol("pmtiles", new pm.Protocol().tile);
        (window as unknown as { __agPmtiles?: boolean }).__agPmtiles = true;
      }
      const m = new L.Map({
        container: container.current!,
        style: buildStyle(lang),
        center: toLngLat(STOPS[0].pos),
        zoom: 15,
        minZoom: 13,
        maxZoom: 18.5,
        attributionControl: false,
        pitchWithRotate: false,
        dragRotate: false,
        touchPitch: false,
      });
      m.touchZoomRotate.disableRotation();
      map.current = m;
      m.on("load", () => {
        if (disposed) return;
        m.addSource("route", {
          type: "geojson",
          data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: ROUTE.map(toLngLat) } },
        });
        m.addLayer({
          id: "route",
          type: "line",
          source: "route",
          layout: { "line-cap": "round", "line-join": "round" },
          paint: { "line-color": "#8B0000", "line-width": 3, "line-opacity": 0.6, "line-dasharray": [0.1, 2.3] },
        });
        ready.current = true;
        drawPins();
        drawUser();
        fitView();
      });
      const ro = new ResizeObserver(() => {
        m.resize();
      });
      ro.observe(container.current!);
      cleanup = () => {
        ro.disconnect();
        pins.current.forEach((p) => p.remove());
        pins.current = [];
        userMarker.current?.remove();
        userMarker.current = null;
        m.remove();
        map.current = null;
        ready.current = false;
      };
    })();
    return () => {
      disposed = true;
      cleanup?.();
    };
    // The map is created once; language only affects labels, handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (ready.current) map.current?.setStyle(buildStyle(lang), { diff: true });
  }, [lang]);

  useEffect(() => {
    if (!ready.current) return;
    drawPins();
    fitView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, idx, completed, gpsDenied]);

  useEffect(() => {
    if (ready.current) drawUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (recenterTick > 0 && ready.current) fitView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recenterTick]);

  return (
    <div className="ag-map">
      <div ref={container} className="ag-map__canvas" />
      {children}
    </div>
  );
}
