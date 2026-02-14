import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface TourMapProps {
  tour: 'left-bank' | 'right-bank';
}

const TourMap: React.FC<TourMapProps> = ({ tour }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

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

  const stops = tour === 'left-bank' ? leftBankStops : rightBankStops;

  useEffect(() => {
    if (!mapContainer.current) return;

    mapboxgl.accessToken = import.meta.env.PUBLIC_MAPBOX_TOKEN;

    // Calculer le centre en fonction du tour
    const centerCoords: [number, number] = tour === 'left-bank' 
      ? [2.3444, 48.8500] // Centre pour Left Bank
      : [2.3215, 48.8655]; // Centre pour Right Bank

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v11',
      center: centerCoords,
      zoom: 14,
      attributionControl: false
    });

    map.current.on('load', async () => {
      // Ajouter les markers pour chaque stop principal (numérotés)
      stops.forEach((stop, index) => {
        const el = document.createElement('div');
        el.className = 'custom-marker';
        el.innerHTML = `
          <div class="w-10 h-10 bg-gray-600 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-lg">
            ${index + 1}
          </div>
        `;

        new mapboxgl.Marker(el)
          .setLngLat(stop.coords as [number, number])
          .setPopup(
            new mapboxgl.Popup({ offset: 25 }).setHTML(`
              <div class="p-3 text-center">
                <h3 class="font-bold text-gray-800 text-lg">${stop.name}</h3>
                <p class="text-sm text-gray-600 mb-2">Stop ${index + 1}</p>
                <p class="text-sm font-medium text-gray-600">${stop.theme || 'Historical theme'}</p>
              </div>
            `)
          )
          .addTo(map.current!);
      });

      // Ajouter les petits points pour les arrêts rapides
      if (tour === 'left-bank') {
        leftBankWaypoints.forEach((waypoint) => {
          const el = document.createElement('div');
          el.className = 'waypoint-marker';
          el.innerHTML = `
            <div class="w-4 h-4 bg-gray-500 border-2 border-white rounded-full shadow-md"></div>
          `;

          new mapboxgl.Marker(el)
            .setLngLat(waypoint.coords as [number, number])
            .setPopup(
              new mapboxgl.Popup({ offset: 15 }).setHTML(`
                <div class="p-2 text-center">
                  <h3 class="font-bold text-gray-800 text-sm">${waypoint.name}</h3>
                  <p class="text-xs text-gray-600">Quick stop</p>
                </div>
              `)
            )
            .addTo(map.current!);
        });
      } else if (tour === 'right-bank') {
        rightBankWaypoints.forEach((waypoint) => {
          const el = document.createElement('div');
          el.className = 'waypoint-marker';
          el.innerHTML = `
            <div class="w-4 h-4 bg-gray-500 border-2 border-white rounded-full shadow-md"></div>
          `;

          new mapboxgl.Marker(el)
            .setLngLat(waypoint.coords as [number, number])
            .setPopup(
              new mapboxgl.Popup({ offset: 15 }).setHTML(`
                <div class="p-2 text-center">
                  <h3 class="font-bold text-gray-800 text-sm">${waypoint.name}</h3>
                  <p class="text-xs text-gray-600">Quick stop</p>
                </div>
              `)
            )
            .addTo(map.current!);
        });
      }

      // Calculer l'itinéraire piéton réel
      await drawWalkingRoute();

      // Ajuster la vue pour inclure tous les points du tour
      const bounds = new mapboxgl.LngLatBounds();
      const waypoints = tour === 'left-bank' ? leftBankWaypoints : rightBankWaypoints;
      
      // Ajouter tous les stops principaux aux bounds
      stops.forEach(stop => bounds.extend(stop.coords as mapboxgl.LngLatLike));
      // Ajouter tous les waypoints aux bounds
      waypoints.forEach(waypoint => bounds.extend(waypoint.coords as mapboxgl.LngLatLike));
      
      // Ajuster la vue avec un padding approprié
      map.current!.fitBounds(bounds, { 
        padding: { top: 50, bottom: 50, left: 50, right: 50 },
        maxZoom: 15
      });

      // Animation du parcours
      // animateRoute(); // Function not defined, so this is commented out to prevent errors
    });

    return () => {
      if (map.current) {
        map.current.remove();
      }
    };
  }, [tour]);

  const drawWalkingRoute = async () => {
    try {
      // Combiner tous les points dans l'ordre du parcours
      const allPoints = [];
      
      if (tour === 'left-bank') {
        // Organisation de l'ordre du parcours selon votre séquence
        allPoints.push(leftBankStops[0].coords); // Boulevard Saint-Michel (stop 1)
        
        allPoints.push(leftBankStops[1].coords); // Palais du Luxembourg (stop 2)
        
        allPoints.push(leftBankWaypoints[0].coords); // Théâtre de l'Odéon (petit point)
        
        allPoints.push(leftBankWaypoints[1].coords); // Rue Monsieur le Prince (petit point)
        
        allPoints.push(leftBankWaypoints[2].coords); // Collège de France (petit point)
        
        allPoints.push(leftBankStops[2].coords); // La Sorbonne (stop 3)
        
        allPoints.push(leftBankWaypoints[3].coords); // Saint Severin Church (petit point)
        
        allPoints.push(leftBankStops[3].coords); // Notre-Dame (stop 4)
      } else if (tour === 'right-bank') {
        // Organisation de l'ordre du parcours Right Bank
        allPoints.push(rightBankStops[0].coords); // Bridge Alexander III (stop 1)
        
        allPoints.push(rightBankStops[1].coords); // Ministry of Foreign Affairs (stop 2)
        
        allPoints.push(rightBankWaypoints[0].coords); // Concorde Bridge (petit point)
        
        allPoints.push(rightBankStops[2].coords); // Concorde Square (stop 3)
        
        allPoints.push(rightBankWaypoints[1].coords); // Musée du Jeu de Paume (petit point)
        
        allPoints.push(rightBankWaypoints[2].coords); // Rue Saint-Honoré (petit point)
        
        allPoints.push(rightBankStops[3].coords); // Place Vendôme - The Ritz (stop 4)
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
            'line-color': '#374151',
            'line-width': 4,
            'line-opacity': 0.8
          }
        });

        // Ajouter une ligne en pointillés pour montrer le sens
        map.current!.addLayer({
          'id': 'walking-route-dashed',
          'type': 'line',
          'source': 'walking-route',
          'layout': {
            'line-join': 'round',
            'line-cap': 'round'
          },
          'paint': {
            'line-color': '#ffffff',
            'line-width': 2,
            'line-dasharray': [2, 2],
            'line-opacity': 0.8
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
          'line-color': '#374151',
          'line-width': 4,
          'line-opacity': 0.6
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

  return (
    <div className="relative">
      <div 
        ref={mapContainer} 
        className="w-full h-96 rounded-lg shadow-lg"
        style={{ minHeight: '400px' }}
      />
      <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg">
        <h4 className="font-semibold text-gray-800">
          {tour === 'left-bank' ? 'Left Bank Tour' : 'Right Bank Tour'}
        </h4>
        <p className="text-sm text-gray-600 route-info">2.5km • 4 stops • 2 hours</p>
      </div>
    </div>
  );
};

export default TourMap;