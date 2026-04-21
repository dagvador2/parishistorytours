import React, { useEffect, useRef } from 'react';

interface TourMapProps {
  tour: 'left-bank' | 'right-bank' | 'general-history' | 'food-wine';
}

const TourMap: React.FC<TourMapProps> = ({ tour }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);

  // Définir un type unifié pour les stops principaux
  type Stop = {
    name: string;
    coords: [number, number];
    theme?: string;
  };

  // Coordonnées des stops principaux Left Bank avec thèmes historiques
  const leftBankStops: Stop[] = [
    { name: "Boulevard Saint-Michel", coords: [2.339351, 48.844696], theme: "Introduction & History Quiz" },
    { name: "Palais du Luxembourg", coords: [2.338257, 48.847677], theme: "The Fall of Paris" },
    { name: "La Sorbonne", coords: [2.343624, 48.849884], theme: "The Resistance" },
    { name: "Notre-Dame", coords: [2.347286, 48.853813], theme: "Liberation" }
  ];

  // Points de passage rapides (petits arrêts)
  const leftBankWaypoints = [
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
  const rightBankWaypoints = [
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
  const generalHistoryWaypoints = [
    { name: "Rue Saint-Jacques", coords: [2.3440, 48.8490] as [number, number] },
    { name: "Pont Neuf", coords: [2.3415, 48.8568] as [number, number] },
  ];

  // Nourritour — Food & Wine: 5 stops (Passage Verdeau + 4 artisans)
  // Coordinates (user-provided, lat/lng from Google Maps):
  //   Passage Verdeau — 48.873060, 2.342241  (start)
  //   Madlen          — 48.8754,   2.3456   (6 rue Cadet — estimated; confirm)
  //   Chataigner      — 48.877081, 2.339308
  //   Thielen         — 48.878177, 2.339600
  //   Flaconneurs     — 48.876205, 2.340546
  const foodWineStops: Stop[] = [
    { name: "Passage Verdeau",            coords: [2.342241, 48.873060], theme: "Départ" },
    { name: "Maison Madlen",              coords: [2.345600, 48.875400], theme: "Madeleines" },
    { name: "Fromagerie Chataigner",      coords: [2.339308, 48.877081], theme: "Fromage" },
    { name: "Charcuterie Maison Thielen", coords: [2.339600, 48.878177], theme: "Charcuterie" },
    { name: "Les Flaconneurs",            coords: [2.340546, 48.876205], theme: "Dégustation" },
  ];
  const foodWineWaypoints: { name: string; coords: [number, number] }[] = [];

  const stops = tour === 'left-bank'
    ? leftBankStops
    : tour === 'right-bank'
      ? rightBankStops
      : tour === 'food-wine'
        ? foodWineStops
        : generalHistoryStops;

  useEffect(() => {
    if (!mapContainer.current) return;

    let mapboxgl: any;
    let cleanup: (() => void) | undefined;

    (async () => {
      const mod = await import('mapbox-gl');
      await import('mapbox-gl/dist/mapbox-gl.css');
      mapboxgl = mod.default;

    mapboxgl.accessToken = import.meta.env.PUBLIC_MAPBOX_TOKEN;

    // Calculer le centre en fonction du tour
    const centerCoords: [number, number] = tour === 'left-bank'
      ? [2.3444, 48.8500] // Centre pour Left Bank
      : tour === 'right-bank'
        ? [2.3215, 48.8655] // Centre pour Right Bank
        : tour === 'food-wine'
          ? [2.3425, 48.8790] // Centre pour Nourritour (9ème)
          : [2.3380, 48.8560]; // Centre pour General History

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      // Quiet: desaturated light style for an editorial paper feel
      style: 'mapbox://styles/mapbox/light-v11',
      center: centerCoords,
      zoom: 14,
      attributionControl: false
    });

    map.current.on('load', async () => {
      // Quiet numbered markers: 28px circle, cream fill, 1px ink border, Playfair numeral.
      // Inline styles keep this independent of the page's Tailwind layer.
      stops.forEach((stop, index) => {
        const el = document.createElement('div');
        el.className = 'quiet-marker';
        el.innerHTML = `
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

        new mapboxgl.Marker(el)
          .setLngLat(stop.coords as [number, number])
          .setPopup(
            new mapboxgl.Popup({ offset: 18, className: 'quiet-popup' }).setHTML(`
              <div style="padding:4px 2px;font-family:'Inter Variable',system-ui,sans-serif;">
                <div style="font-family:'Playfair Display Variable',Georgia,serif;font-weight:500;font-size:15px;color:#1a1a1a;margin-bottom:4px;">${stop.name}</div>
                <div style="font-size:11px;letter-spacing:0.15em;text-transform:uppercase;color:#4a4a4a;">Stop ${index + 1}${stop.theme ? ' · ' + stop.theme : ''}</div>
              </div>
            `)
          )
          .addTo(map.current!);
      });

      // Waypoints: small teal dots, no border.
      const waypoints = tour === 'left-bank'
        ? leftBankWaypoints
        : tour === 'right-bank'
          ? rightBankWaypoints
          : tour === 'food-wine'
            ? foodWineWaypoints
            : generalHistoryWaypoints;

      waypoints.forEach((waypoint) => {
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
          .setLngLat(waypoint.coords as [number, number])
          .setPopup(
            new mapboxgl.Popup({ offset: 10, className: 'quiet-popup' }).setHTML(`
              <div style="padding:4px 2px;font-family:'Inter Variable',system-ui,sans-serif;">
                <div style="font-family:'Playfair Display Variable',Georgia,serif;font-weight:500;font-size:14px;color:#1a1a1a;">${waypoint.name}</div>
              </div>
            `)
          )
          .addTo(map.current!);
      });

      // Calculer l'itinéraire piéton réel
      await drawWalkingRoute();

      // Ajuster la vue pour inclure tous les points du tour
      const bounds = new mapboxgl.LngLatBounds();

      // Ajouter tous les stops principaux aux bounds
      stops.forEach(stop => bounds.extend(stop.coords as mapboxgl.LngLatLike));
      // Ajouter tous les waypoints aux bounds
      waypoints.forEach(waypoint => bounds.extend(waypoint.coords as mapboxgl.LngLatLike));

      // Ajuster la vue avec un padding approprié
      map.current!.fitBounds(bounds, {
        padding: { top: 50, bottom: 50, left: 50, right: 50 },
        maxZoom: 15
      });
    });

    cleanup = () => {
      if (map.current) {
        map.current.remove();
      }
    };
    })();

    return () => { cleanup?.(); };
  }, [tour]);

  const drawWalkingRoute = async () => {
    try {
      // Combiner tous les points dans l'ordre du parcours
      const allPoints: [number, number][] = [];

      if (tour === 'left-bank') {
        allPoints.push(leftBankStops[0].coords);
        allPoints.push(leftBankStops[1].coords);
        allPoints.push(leftBankWaypoints[0].coords as [number, number]);
        allPoints.push(leftBankWaypoints[1].coords as [number, number]);
        allPoints.push(leftBankWaypoints[2].coords as [number, number]);
        allPoints.push(leftBankStops[2].coords);
        allPoints.push(leftBankWaypoints[3].coords as [number, number]);
        allPoints.push(leftBankStops[3].coords);
      } else if (tour === 'right-bank') {
        allPoints.push(rightBankStops[0].coords);
        allPoints.push(rightBankStops[1].coords);
        allPoints.push(rightBankWaypoints[0].coords as [number, number]);
        allPoints.push(rightBankStops[2].coords);
        allPoints.push(rightBankWaypoints[1].coords as [number, number]);
        allPoints.push(rightBankWaypoints[2].coords as [number, number]);
        allPoints.push(rightBankStops[3].coords);
      } else if (tour === 'food-wine') {
        // Nourritour: Verdeau → Madlen → Chataigner → Thielen → Flaconneurs
        allPoints.push(foodWineStops[0].coords); // Passage Verdeau
        allPoints.push(foodWineStops[1].coords); // Madlen
        allPoints.push(foodWineStops[2].coords); // Chataigner
        allPoints.push(foodWineStops[3].coords); // Thielen
        allPoints.push(foodWineStops[4].coords); // Flaconneurs
      } else {
        // General History route
        allPoints.push(generalHistoryStops[0].coords); // Thermes de Cluny
        allPoints.push(generalHistoryWaypoints[0].coords); // Rue Saint-Jacques
        allPoints.push(generalHistoryStops[1].coords); // Île de la Cité
        allPoints.push(generalHistoryWaypoints[1].coords); // Pont Neuf
        allPoints.push(generalHistoryStops[2].coords); // Jardin des Tuileries
      }

      // Créer la chaîne de coordonnées pour l'API Directions
      const coordinates = allPoints.map(coords => coords.join(',')).join(';');

      // Appel à l'API Directions de Mapbox pour l'itinéraire piéton
      const directionsResponse = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/walking/${coordinates}?geometries=geojson&access_token=${mapboxgl.accessToken}`
      );

      const directionsData = await directionsResponse.json();

      if (directionsData.routes && directionsData.routes.length > 0) {
        const route = directionsData.routes[0];

        // Ajouter l'itinéraire réel à la carte
        map.current!.addSource('walking-route', {
          'type': 'geojson',
          'data': {
            'type': 'Feature',
            'properties': {},
            'geometry': route.geometry
          }
        });

        map.current!.addLayer({
          'id': 'walking-route',
          'type': 'line',
          'source': 'walking-route',
          'layout': {
            'line-join': 'round',
            'line-cap': 'round'
          },
          'paint': {
            // Quiet teal (--teal)
            'line-color': '#3a4a48',
            'line-width': 2,
            'line-opacity': 0.95
          }
        });

        // Mettre à jour les infos de distance et durée
        const distance = (route.distance / 1000).toFixed(1); // en km
        const duration = Math.round(route.duration / 60); // en minutes

        // Mettre à jour l'affichage avec les vraies données
        updateRouteInfo(distance, duration);
      }
    } catch (error) {
      console.error('Erreur lors du calcul de l\'itinéraire:', error);

      // Fallback: tracer une ligne droite si l'API échoue
      const routeCoords = stops.map(stop => stop.coords);

      map.current!.addSource('fallback-route', {
        'type': 'geojson',
        'data': {
          'type': 'Feature',
          'properties': {},
          'geometry': {
            'type': 'LineString',
            'coordinates': routeCoords
          }
        }
      });

      map.current!.addLayer({
        'id': 'fallback-route',
        'type': 'line',
        'source': 'fallback-route',
        'layout': {
          'line-join': 'round',
          'line-cap': 'round'
        },
        'paint': {
          'line-color': '#3a4a48',
          'line-width': 2,
          'line-opacity': 0.75
        }
      });
    }
  };

  const updateRouteInfo = (distance: string, duration: number) => {
    // Mettre à jour l'affichage avec les vraies données de l'itinéraire
    const infoElement = document.querySelector('.route-info');
    if (infoElement) {
      infoElement.innerHTML = `${distance}km • ${stops.length} stops • ${duration} minutes`;
    }
  };

  const tourLabel = tour === 'left-bank'
    ? 'Left Bank'
    : tour === 'right-bank'
      ? 'Right Bank'
      : tour === 'food-wine'
        ? 'Nourritour'
        : 'General History';

  const defaultRouteInfo = tour === 'general-history'
    ? '2.5 km · 3 stops · 1 h 30'
    : tour === 'food-wine'
      ? '~1 km · 5 stops · 3 h'
      : '2.5 km · 4 stops · 2 h';

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
          {tourLabel}
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
          {defaultRouteInfo}
        </div>
      </div>
    </div>
  );
};

export default TourMap;
