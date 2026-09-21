import React, { useEffect, useRef, useState } from 'react';

/** Un arrêt tel que la page le décrit : la carte n'en connaît que les
 *  coordonnées, le texte et la photo viennent de la section qui l'affiche. */
export type StopDetail = {
  photo?: string;
  title?: string;
  /** Nom court affiché à côté du médaillon ; à défaut, le nom interne. */
  label?: string;
  blurb?: string;
  time?: string;
  /** Deux phrases sur le lieu, dépliées au survol du médaillon (desktop). */
  description?: string;
};

interface TourMapProps {
  tour: 'left-bank' | 'right-bank' | 'general-history' | 'food-wine';
  /** Dans l'ordre des arrêts. Sans photo, les repères restent numérotés. */
  details?: StopDetail[];
}

const MAPBOX_TOKEN = import.meta.env.PUBLIC_MAPBOX_TOKEN;

// Définir un type unifié pour les stops principaux
type Stop = {
  name: string;
  coords: [number, number];
  theme?: string;
};

type Waypoint = { name: string; coords: [number, number] };

// Coordonnées des stops principaux Left Bank avec thèmes historiques
const leftBankStops: Stop[] = [
  { name: "Boulevard Saint-Michel", coords: [2.339351, 48.844696], theme: "Introduction & History Quiz" },
  { name: "Palais du Luxembourg", coords: [2.338257, 48.847677], theme: "The Fall of Paris" },
  { name: "La Sorbonne", coords: [2.343624, 48.849884], theme: "The Resistance" },
  { name: "Notre-Dame", coords: [2.347286, 48.853813], theme: "Liberation" }
];

// Points de passage rapides (petits arrêts)
const leftBankWaypoints: Waypoint[] = [
  { name: "Théâtre de l'Odéon", coords: [2.339046, 48.849861] },
  { name: "Rue Monsieur le Prince", coords: [2.340444, 48.848995] },
  { name: "Collège de France", coords: [2.344951, 48.849512] },
  { name: "Saint Severin Church", coords: [2.346410, 48.852279] },
];

// Coordonnées des stops principaux Right Bank avec thèmes historiques
const rightBankStops: Stop[] = [
  { name: "Bridge Alexander III", coords: [2.313925, 48.864547], theme: "Introduction & History Quiz" },
  { name: "Ministry of Foreign Affairs", coords: [2.316339, 48.862828], theme: "The Fall of Paris" },
  { name: "Concorde Square", coords: [2.321153, 48.865483], theme: "The Resistance" },
  { name: "Place Vendôme - The Ritz", coords: [2.329531, 48.867756], theme: "Liberation" }
];

// Points de passage rapides Right Bank (petits arrêts)
const rightBankWaypoints: Waypoint[] = [
  { name: "Concorde Bridge", coords: [2.319477, 48.863381] },
  { name: "Musée du Jeu de Paume", coords: [2.324681, 48.865602] },
  { name: "Rue Saint-Honoré", coords: [2.328747, 48.866584] },
];

// Coordonnées des stops principaux General History
const generalHistoryStops: Stop[] = [
  { name: "Thermes de Cluny", coords: [2.3442, 48.8509], theme: "Roman Lutetia" },
  { name: "Île de la Cité", coords: [2.3470, 48.8534], theme: "The Viking Siege" },
  { name: "Jardin des Tuileries", coords: [2.3275, 48.8635], theme: "The French Revolution" },
];

// Points de passage rapides General History
const generalHistoryWaypoints: Waypoint[] = [
  { name: "Rue Saint-Jacques", coords: [2.3440, 48.8490] },
  { name: "Pont Neuf", coords: [2.3415, 48.8568] },
];

// Nourritour — Food & Wine: 5 stops (Passage Verdeau + 4 artisans)
// Coordinates (user-provided, lat/lng from Google Maps):
//   Passage Verdeau — 48.873060, 2.342241  (start)
//   Madlen          — 48.874386, 2.342656  (6 rue Cadet, géocodé Mapbox)
//   Chataigner      — 48.877081, 2.339308
//   Thielen         — 48.878177, 2.339600
//   Flaconneurs     — 48.876205, 2.340546
const foodWineStops: Stop[] = [
  { name: "Passage Verdeau",            coords: [2.342241, 48.873060], theme: "Départ" },
  { name: "Maison Madlen",              coords: [2.342656, 48.874386], theme: "Madeleines" },
  { name: "Fromagerie Chataigner",      coords: [2.339308, 48.877081], theme: "Fromage" },
  { name: "Charcuterie Maison Thielen", coords: [2.339600, 48.878177], theme: "Charcuterie" },
  { name: "Les Flaconneurs",            coords: [2.340546, 48.876205], theme: "Dégustation" },
];
const foodWineWaypoints: Waypoint[] = [];

const TOUR_DATA: Record<TourMapProps['tour'], {
  stops: Stop[];
  waypoints: Waypoint[];
  center: [number, number];
  label: string;
  defaultInfo: string;
  /** Ordre de marche réel : stops et waypoints entrelacés. */
  path: [number, number][];
}> = {
  'left-bank': {
    stops: leftBankStops,
    waypoints: leftBankWaypoints,
    center: [2.3444, 48.8500],
    label: 'Left Bank',
    defaultInfo: '2.5 km · 4 stops · 2 h',
    path: [
      leftBankStops[0].coords,     // Boulevard Saint-Michel
      leftBankStops[1].coords,     // Palais du Luxembourg
      leftBankWaypoints[0].coords, // Théâtre de l'Odéon
      leftBankWaypoints[1].coords, // Rue Monsieur le Prince
      leftBankStops[2].coords,     // La Sorbonne
      leftBankWaypoints[2].coords, // Collège de France
      leftBankWaypoints[3].coords, // Saint Severin
      leftBankStops[3].coords,     // Notre-Dame
    ],
  },
  'right-bank': {
    stops: rightBankStops,
    waypoints: rightBankWaypoints,
    center: [2.3215, 48.8655],
    label: 'Right Bank',
    defaultInfo: '2.5 km · 4 stops · 2 h',
    path: [
      rightBankStops[0].coords,
      rightBankStops[1].coords,
      rightBankWaypoints[0].coords,
      rightBankStops[2].coords,
      rightBankWaypoints[1].coords,
      rightBankWaypoints[2].coords,
      rightBankStops[3].coords,
    ],
  },
  'general-history': {
    stops: generalHistoryStops,
    waypoints: generalHistoryWaypoints,
    center: [2.3380, 48.8560],
    label: 'General History',
    defaultInfo: '2.5 km · 3 stops · 1 h 30',
    path: [
      generalHistoryStops[0].coords,
      generalHistoryWaypoints[0].coords,
      generalHistoryStops[1].coords,
      generalHistoryWaypoints[1].coords,
      generalHistoryStops[2].coords,
    ],
  },
  'food-wine': {
    stops: foodWineStops,
    waypoints: foodWineWaypoints,
    center: [2.3425, 48.8790],
    label: 'Nourritour',
    defaultInfo: '~1 km · 5 stops · 3 h',
    path: foodWineStops.map((s) => s.coords),
  },
};

/**
 * Itinéraire piéton réel via l'API Directions de Mapbox.
 * - `walking` : réseau piéton (trottoirs, rues piétonnes, passerelles)
 * - `overview=full` : géométrie pleine résolution, sinon le tracé coupe les angles
 * - `walkway_bias=1` : privilégie fortement les voies piétonnes plutôt que les axes routiers
 * Retourne null si l'API échoue (on retombe alors sur la ligne droite, en pointillés).
 */
async function fetchWalkingRoute(path: [number, number][], signal: AbortSignal) {
  if (!MAPBOX_TOKEN || path.length < 2) return null;

  // L'API Directions accepte 25 coordonnées max — nos parcours en font 5 à 8.
  const coordinates = path.map((c) => `${c[0]},${c[1]}`).join(';');
  const url =
    `https://api.mapbox.com/directions/v5/mapbox/walking/${coordinates}` +
    `?geometries=geojson&overview=full&walkway_bias=1&steps=false` +
    `&access_token=${MAPBOX_TOKEN}`;

  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Directions API ${res.status}`);

  const data = await res.json();
  if (data.code !== 'Ok' || !data.routes?.length) {
    throw new Error(`Directions API: ${data.code ?? 'no route'}`);
  }
  return data.routes[0] as {
    geometry: { type: 'LineString'; coordinates: [number, number][] };
    distance: number;
    duration: number;
  };
}

/** Fiche de survol : largeur, air autour du médaillon, marge au bord du cadre. */
const CARD_WIDTH = 272;
const CARD_GAP = 10;
const CARD_MARGIN = 12;

/**
 * Déplie une fiche au survol d'un médaillon : la photo en grand, le nom du
 * lieu et deux phrases sur ce qu'on y raconte.
 *
 * La fiche est un enfant du repère, donc elle suit la carte quand on la
 * déplace. Elle bascule à gauche du médaillon quand elle déborderait du cadre,
 * et se décale verticalement plutôt que de se faire couper en haut ou en bas.
 */
function attachHoverCard({
  el,
  instance,
  stop,
  detail,
  meta,
  title,
}: {
  el: HTMLElement;
  instance: any;
  stop: Stop;
  detail: StopDetail;
  meta: string;
  title: string;
}) {
  const body = detail.description || detail.blurb;

  const card = document.createElement('div');
  // La liste d'arrêts dit déjà tout ça à côté de la carte : la fiche est un
  // agrément visuel, elle n'a pas à être relue par un lecteur d'écran.
  card.setAttribute('aria-hidden', 'true');
  card.style.cssText = [
    'position:absolute',
    'top:50%',
    `width:${CARD_WIDTH}px`,
    'background:#fafaf7',
    'border:1px solid rgba(26,26,26,0.12)',
    'border-radius:2px',
    'box-shadow:0 12px 32px -14px rgba(0,0,0,0.45)',
    'overflow:hidden',
    'opacity:0',
    'transform:translateY(-50%) scale(0.96)',
    'transform-origin:left center',
    'transition:opacity 200ms ease, transform 280ms cubic-bezier(0.32,0.72,0,1)',
    'pointer-events:none',
    'will-change:opacity, transform',
  ].join(';');

  card.innerHTML = `
    ${detail.photo
      ? `<img src="${detail.photo}" alt="" loading="lazy" decoding="async"
             style="width:100%;height:148px;object-fit:cover;display:block;background:#efeee9;" />`
      : ''}
    <div style="padding:12px 14px 14px;font-family:'Inter Variable',system-ui,sans-serif;">
      <div style="font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:#4a4a4a;margin-bottom:5px;">${meta}</div>
      <div style="font-family:'Playfair Display Variable',Georgia,serif;font-weight:500;font-size:17px;line-height:1.2;color:#1a1a1a;">${title}</div>
      ${body
        ? `<p style="font-size:12.5px;line-height:1.5;color:#4a4a4a;margin:7px 0 0;">${body}</p>`
        : ''}
    </div>
  `;
  el.appendChild(card);

  const label = el.querySelector<HTMLElement>('[data-stop-label]');
  const medallion = el.querySelector<HTMLElement>('[data-stop-medallion]');

  let shift = 0;
  let hideTimer: ReturnType<typeof setTimeout> | undefined;

  const place = () => {
    const container = instance.getContainer() as HTMLElement;
    const width = container.clientWidth;
    const height = container.clientHeight;
    const point = instance.project(stop.coords);
    const halfMarker = el.offsetWidth / 2;

    // Positions possibles du bord gauche de la fiche, en pixels du conteneur :
    // à droite du médaillon, puis à sa gauche. Si aucune ne tient, la fiche se
    // centre sur le repère et rentre de force dans le cadre.
    const right = point.x + halfMarker + CARD_GAP;
    const left = point.x - halfMarker - CARD_GAP - CARD_WIDTH;
    const x =
      right + CARD_WIDTH <= width - CARD_MARGIN ? right
      : left >= CARD_MARGIN ? left
      : Math.min(
          Math.max(CARD_MARGIN, point.x - CARD_WIDTH / 2),
          width - CARD_MARGIN - CARD_WIDTH,
        );

    const half = card.offsetHeight / 2;
    shift = 0;
    if (point.y - half < CARD_MARGIN) shift = CARD_MARGIN - (point.y - half);
    else if (point.y + half > height - CARD_MARGIN) shift = height - CARD_MARGIN - (point.y + half);

    // `el` est posé par Mapbox, centré sur les coordonnées : on repasse en
    // coordonnées locales pour que la fiche suive le repère sans recalcul.
    card.style.left = `${x - (point.x - halfMarker)}px`;
    card.style.transformOrigin = x < point.x ? 'right center' : 'left center';
  };

  const render = (visible: boolean) => {
    place();
    card.style.transform = `translateY(calc(-50% + ${shift}px)) scale(${visible ? 1 : 0.96})`;
    card.style.opacity = visible ? '1' : '0';
  };

  const follow = () => render(true);

  const show = () => {
    if (hideTimer) clearTimeout(hideTimer);
    el.style.zIndex = '4';
    render(true);
    if (label) label.style.opacity = '0';
    if (medallion) {
      medallion.style.transform = 'scale(1.08)';
      medallion.style.boxShadow = '0 6px 16px rgba(0,0,0,0.28)';
    }
    instance.on('move', follow);
  };

  const hide = () => {
    instance.off('move', follow);
    card.style.transform = `translateY(calc(-50% + ${shift}px)) scale(0.96)`;
    card.style.opacity = '0';
    if (label) label.style.opacity = '';
    if (medallion) {
      medallion.style.transform = '';
      medallion.style.boxShadow = '';
    }
    // Rendre sa place dans la pile une fois la fiche effacée, sinon elle
    // passerait derrière ses voisines en plein fondu.
    hideTimer = setTimeout(() => { el.style.zIndex = ''; }, 300);
  };

  el.addEventListener('mouseenter', show);
  el.addEventListener('mouseleave', hide);
}

const TourMap: React.FC<TourMapProps> = ({ tour, details = [] }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const data = TOUR_DATA[tour];
  const [routeInfo, setRouteInfo] = useState<string>(data.defaultInfo);

  useEffect(() => {
    if (!mapContainer.current) return;

    const controller = new AbortController();
    let disposed = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      const [mod] = await Promise.all([
        import('mapbox-gl'),
        import('mapbox-gl/dist/mapbox-gl.css'),
      ]);
      if (disposed) return;

      const mapboxgl = mod.default;
      mapboxgl.accessToken = MAPBOX_TOKEN;

      const instance = new mapboxgl.Map({
        container: mapContainer.current!,
        // Quiet: desaturated light style for an editorial paper feel
        style: 'mapbox://styles/mapbox/light-v11',
        center: data.center,
        zoom: 14,
        attributionControl: false,
      });
      map.current = instance;

      // Lancer l'appel Directions en parallèle du chargement du style :
      // le tracé est prêt dès que la carte peut l'afficher.
      const routePromise = fetchWalkingRoute(data.path, controller.signal).catch((err) => {
        if (err?.name !== 'AbortError') {
          console.error('Itinéraire piéton indisponible, repli en ligne droite :', err);
        }
        return null;
      });

      instance.on('load', async () => {
        if (disposed) return;

        // Les arrêts portent leur propre photo en médaillon : sur mobile, la
        // carte remplace à elle seule la longue liste qui la suivait.
        // Styles en ligne : indépendants de la couche Tailwind de la page.

        // Au-dessus de 900px et avec une souris, le médaillon se déplie en
        // fiche au survol. Un doigt ne survole pas : sur mobile la bulle au
        // tap reste la seule fiche, et la liste d'arrêts est juste au-dessus.
        const canHover =
          typeof window.matchMedia === 'function' &&
          window.matchMedia('(hover: hover) and (min-width: 900px)').matches;

        data.stops.forEach((stop, index) => {
          const detail = details[index] ?? {};
          const title = detail.title || stop.name;

          const el = document.createElement('div');
          el.className = 'quiet-marker';
          // Le nom est posé à côté du médaillon, hors de la boîte de 52px :
          // le repère reste ainsi centré sur ses coordonnées exactes.
          const label = detail.label || stop.name;

          el.innerHTML = detail.photo
            ? `
              <div style="position:relative;width:52px;height:52px;">
                <div data-stop-medallion style="
                  width:52px;height:52px;
                  border-radius:50%;
                  overflow:hidden;
                  border:2px solid #fafaf7;
                  box-shadow:0 2px 6px rgba(0,0,0,0.22);
                  background:#efeee9;
                  transition:transform 260ms cubic-bezier(0.32,0.72,0,1), box-shadow 260ms ease;
                ">
                  <img src="${detail.photo}" alt="" loading="lazy" decoding="async"
                       style="width:100%;height:100%;object-fit:cover;display:block;" />
                </div>
                <div style="
                  position:absolute;right:-3px;bottom:-3px;
                  width:20px;height:20px;
                  display:grid;place-items:center;
                  background:#fafaf7;
                  color:#1a1a1a;
                  border:1px solid #1a1a1a;
                  border-radius:50%;
                  font-family:'Playfair Display Variable', Georgia, serif;
                  font-weight:500;
                  font-size:11px;
                  line-height:1;
                ">${index + 1}</div>
                <div data-stop-label style="
                  position:absolute;left:60px;top:50%;
                  transform:translateY(-50%);
                  transition:opacity 160ms ease;
                  white-space:nowrap;
                  padding:3px 9px;
                  background:rgba(250,250,247,0.94);
                  border:1px solid rgba(26,26,26,0.12);
                  border-radius:2px;
                  box-shadow:0 1px 3px rgba(0,0,0,0.10);
                  font-family:'Playfair Display Variable', Georgia, serif;
                  font-weight:500;
                  font-size:13px;
                  line-height:1.2;
                  color:#1a1a1a;
                ">${label}</div>
              </div>
            `
            : `
              <div style="
                width:28px;height:28px;
                display:grid;place-items:center;
                background:#fafaf7;
                color:#1a1a1a;
                border:1px solid #1a1a1a;
                border-radius:50%;
                font-family:'Playfair Display Variable', Georgia, serif;
                font-weight:500;
                font-size:13px;
                line-height:1;
                box-shadow:0 1px 2px rgba(0,0,0,0.06);
              ">${index + 1}</div>
            `;
          el.style.cursor = 'pointer';

          const meta = [`${index + 1}`, detail.time, stop.theme].filter(Boolean).join(' · ');

          const marker = new mapboxgl.Marker(el, { offset: detail.photo ? [0, -6] : [0, 0] })
            .setLngLat(stop.coords);

          if (canHover) {
            // Pas le thème de l'arrêt ici : il n'existe qu'en anglais, et le
            // titre traduit le porte déjà (« Palais du Luxembourg - La Chute »).
            attachHoverCard({
              el,
              instance,
              stop,
              detail,
              meta: [`${index + 1}`, detail.time].filter(Boolean).join(' · '),
              title,
            });
          } else {
            marker.setPopup(
              new mapboxgl.Popup({ offset: detail.photo ? 30 : 18, className: 'quiet-popup' }).setHTML(`
                <div style="padding:4px 2px;font-family:'Inter Variable',system-ui,sans-serif;max-width:220px;">
                  <div style="font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#4a4a4a;margin-bottom:4px;">${meta}</div>
                  <div style="font-family:'Playfair Display Variable',Georgia,serif;font-weight:500;font-size:15px;line-height:1.25;color:#1a1a1a;">${title}</div>
                  ${detail.blurb ? `<div style="font-size:12px;line-height:1.45;color:#4a4a4a;margin-top:6px;">${detail.blurb}</div>` : ''}
                </div>
              `)
            );
          }

          marker.addTo(instance);
        });

        // Waypoints: small teal dots, no border.
        data.waypoints.forEach((waypoint) => {
          const el = document.createElement('div');
          el.className = 'quiet-waypoint';
          el.innerHTML = `
            <div style="
              width:8px;height:8px;
              background:#3a4a48;
              border-radius:50%;
              opacity:0.75;
            "></div>
          `;

          new mapboxgl.Marker(el)
            .setLngLat(waypoint.coords)
            .setPopup(
              new mapboxgl.Popup({ offset: 10, className: 'quiet-popup' }).setHTML(`
                <div style="padding:4px 2px;font-family:'Inter Variable',system-ui,sans-serif;">
                  <div style="font-family:'Playfair Display Variable',Georgia,serif;font-weight:500;font-size:14px;color:#1a1a1a;">${waypoint.name}</div>
                </div>
              `)
            )
            .addTo(instance);
        });

        const route = await routePromise;
        if (disposed || !instance.getStyle()) return;

        const lineCoords = route
          ? route.geometry.coordinates
          : data.path; // repli : ligne droite, signalée en pointillés

        instance.addSource('walking-route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: { type: 'LineString', coordinates: lineCoords },
          },
        });

        // Liseré crème sous le tracé : le chemin reste lisible par-dessus les rues,
        // les parcs et la Seine du style light-v11.
        instance.addLayer({
          id: 'walking-route-casing',
          type: 'line',
          source: 'walking-route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            'line-color': '#fafaf7',
            'line-width': 6,
            'line-opacity': 0.9,
          },
        });

        instance.addLayer({
          id: 'walking-route',
          type: 'line',
          source: 'walking-route',
          layout: { 'line-join': 'round', 'line-cap': 'round' },
          paint: {
            // Quiet teal (--teal)
            'line-color': '#3a4a48',
            'line-width': 2.5,
            'line-opacity': route ? 0.95 : 0.5,
            ...(route ? {} : { 'line-dasharray': [2, 2] as any }),
          },
        });

        if (route) {
          const distance = (route.distance / 1000).toFixed(1);
          const duration = Math.round(route.duration / 60);
          setRouteInfo(`${distance} km · ${data.stops.length} stops · ${duration} min walk`);
        }

        // Cadrer sur le tracé lui-même (et pas seulement les points),
        // pour qu'aucun détour de rue ne sorte du cadre.
        const bounds = new mapboxgl.LngLatBounds();
        lineCoords.forEach((c) => bounds.extend(c as [number, number]));
        data.stops.forEach((s) => bounds.extend(s.coords));
        data.waypoints.forEach((w) => bounds.extend(w.coords));

        instance.fitBounds(bounds, {
          padding: { top: 56, bottom: 56, left: 56, right: 56 },
          maxZoom: 15.5,
          duration: 0,
        });
      });

      cleanup = () => {
        instance.remove();
        if (map.current === instance) map.current = null;
      };
    })();

    return () => {
      disposed = true;
      controller.abort();
      cleanup?.();
    };
  }, [tour]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div
        ref={mapContainer}
        style={{ width: '100%', height: '100%', minHeight: '360px' }}
      />
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          background: 'rgba(250, 250, 247, 0.94)',
          border: '1px solid rgba(26, 26, 26, 0.1)',
          padding: '10px 14px',
          backdropFilter: 'blur(4px)',
          fontFamily: "'Inter Variable', system-ui, sans-serif",
          lineHeight: 1.3,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: '#4a4a4a',
            marginBottom: 4,
          }}
        >
          {data.label}
        </div>
        <div
          className="route-info"
          style={{
            fontFamily: "'Playfair Display Variable', Georgia, serif",
            fontSize: 14,
            fontWeight: 500,
            color: '#1a1a1a',
            letterSpacing: '0.01em',
          }}
        >
          {routeInfo}
        </div>
      </div>
    </div>
  );
};

export default TourMap;
