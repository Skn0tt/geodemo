import maplibregl, { GeoJSONSource, LngLatLike, Map, Marker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { Coordinate } from './geo.ts';

let map: Map | null = null;
let startMarker: Marker | null = null;
let currentMarker: Marker | null = null;
let routeSource: GeoJSONSource | null = null;

// GeoJSON data for the active route
const routeData: GeoJSON.FeatureCollection<GeoJSON.LineString> = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: [],
      },
    },
  ],
};

// GeoJSON data for history route display
const historyRouteData: GeoJSON.FeatureCollection<GeoJSON.LineString> = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'LineString',
        coordinates: [],
      },
    },
  ],
};

// Stadia Maps - free for development, no API key needed for localhost
// Options: osm_bright (vibrant), outdoors (terrain), alidade_smooth (minimal)
const STADIA_STYLE = 'https://tiles.stadiamaps.com/styles/osm_bright.json';

const LAST_POSITION_KEY = 'runTracker_lastPosition';

interface StoredPosition {
  lng: number;
  lat: number;
}

/**
 * Get last known position from storage
 */
function getStoredPosition(): StoredPosition | null {
  try {
    const data = localStorage.getItem(LAST_POSITION_KEY);
    if (!data) return null;
    const parsed = JSON.parse(data) as unknown;
    // Validate it's a proper position object
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'lng' in parsed &&
      'lat' in parsed &&
      typeof (parsed as StoredPosition).lng === 'number' &&
      typeof (parsed as StoredPosition).lat === 'number'
    ) {
      return parsed as StoredPosition;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Save position to storage
 */
export function savePosition(lng: number, lat: number): void {
  try {
    localStorage.setItem(LAST_POSITION_KEY, JSON.stringify({ lng, lat }));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Initialize the map
 */
export function initMap(): Promise<void> {
  return new Promise((resolve) => {
    // Try to start at last known position
    const lastPos = getStoredPosition();
    const initialCenter: LngLatLike = lastPos ? [lastPos.lng, lastPos.lat] : [0, 0];
    const initialZoom = lastPos ? 15 : 2;

    map = new maplibregl.Map({
      container: 'map',
      style: STADIA_STYLE,
      center: initialCenter,
      zoom: initialZoom,
    });

    // Add navigation controls
    map.addControl(new maplibregl.NavigationControl(), 'bottom-right');

    map.on('load', () => {
      if (!map) return;

      // Add route source and layer for active run
      map.addSource('route', {
        type: 'geojson',
        data: routeData,
      });

      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#ef4444',
          'line-width': 5,
          'line-opacity': 0.9,
        },
      });

      // Add history route source and layer
      map.addSource('history-route', {
        type: 'geojson',
        data: historyRouteData,
      });

      map.addLayer({
        id: 'history-route-line',
        type: 'line',
        source: 'history-route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#6366f1',
          'line-width': 4,
          'line-opacity': 0.7,
        },
      });

      routeSource = map.getSource('route') as GeoJSONSource;
      resolve();
    });
  });
}

/**
 * Add a coordinate to the active route
 */
export function addCoordinate(lng: number, lat: number): void {
  if (!map) return;

  const coords: LngLatLike = [lng, lat];

  // Save for next session
  savePosition(lng, lat);

  // Add start marker on first coordinate
  if (routeData.features[0].geometry.coordinates.length === 0) {
    startMarker = new maplibregl.Marker({ color: '#10b981' }).setLngLat(coords).addTo(map);

    currentMarker = new maplibregl.Marker({ color: '#3b82f6' }).setLngLat(coords).addTo(map);

    // Fast jump to location
    map.jumpTo({ center: coords, zoom: 16 });
  } else {
    // Update current position marker
    currentMarker?.setLngLat(coords);
  }

  // Add to route and update source
  routeData.features[0].geometry.coordinates.push([lng, lat]);
  routeSource?.setData(routeData);
  updatePolylineAria();
}

/**
 * Get current route coordinates
 */
export function getRouteCoordinates(): Coordinate[] {
  return [...routeData.features[0].geometry.coordinates] as Coordinate[];
}

/**
 * Clear the active route
 */
export function clearRoute(): void {
  routeData.features[0].geometry.coordinates = [];
  routeSource?.setData(routeData);
  updatePolylineAria();

  if (startMarker) {
    startMarker.remove();
    startMarker = null;
  }
  if (currentMarker) {
    currentMarker.remove();
    currentMarker = null;
  }
}

/**
 * Show a historical route on the map
 */
export function showHistoryRoute(coordinates: Coordinate[]): void {
  if (!map || !coordinates || coordinates.length === 0) return;

  historyRouteData.features[0].geometry.coordinates = coordinates;
  (map.getSource('history-route') as GeoJSONSource).setData(historyRouteData);
  updatePolylineAria();

  // Fit map to show entire route
  const bounds = coordinates.reduce((bounds, coord) => {
    return bounds.extend(coord as LngLatLike);
  }, new maplibregl.LngLatBounds(coordinates[0] as LngLatLike, coordinates[0] as LngLatLike));

  map.fitBounds(bounds, { padding: 60 });
}

/**
 * Clear the history route display
 */
export function clearHistoryRoute(): void {
  if (!map) return;
  historyRouteData.features[0].geometry.coordinates = [];
  (map.getSource('history-route') as GeoJSONSource)?.setData(historyRouteData);
  updatePolylineAria();
}

/**
 * Center map on given coordinates
 */
export function centerOnUser(lng: number, lat: number): void {
  map?.easeTo({ center: [lng, lat], zoom: 16 });
}

/**
 * Update aria-label on the map canvas with polyline coordinates
 */
function updatePolylineAria(): void {
  if (!map) return;

  const canvas = map.getCanvas();
  if (!canvas) return;

  // Check active route first, then history route
  let coordinates = routeData.features[0].geometry.coordinates;
  if (coordinates.length === 0) {
    coordinates = historyRouteData.features[0].geometry.coordinates;
  }

  if (coordinates.length === 0) {
    canvas.setAttribute('aria-label', 'Map');
  } else if (coordinates.length === 1) {
    const point = coordinates[0];
    canvas.setAttribute('aria-label', `Map with route at ${point[1].toFixed(6)},${point[0].toFixed(6)}`);
  } else {
    const start = coordinates[0];
    const end = coordinates[coordinates.length - 1];
    canvas.setAttribute('aria-label', `Map with route from ${start[1].toFixed(6)},${start[0].toFixed(6)} to ${end[1].toFixed(6)},${end[0].toFixed(6)}`);
  }
}

/**
 * Get the map instance (for advanced usage)
 */
export function getMap(): Map | null {
  return map;
}
