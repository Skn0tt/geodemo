import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

let map = null;
let startMarker = null;
let currentMarker = null;
let routeSource = null;

// GeoJSON data for the active route
const routeData = {
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: []
    }
  }]
};

// GeoJSON data for history route display
const historyRouteData = {
  type: 'FeatureCollection',
  features: [{
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: []
    }
  }]
};

// Stadia Maps - free for development, no API key needed for localhost
// Options: osm_bright (vibrant), outdoors (terrain), alidade_smooth (minimal)
const STADIA_STYLE = 'https://tiles.stadiamaps.com/styles/osm_bright.json';

const LAST_POSITION_KEY = 'runTracker_lastPosition';

/**
 * Get last known position from storage
 * @returns {{lng: number, lat: number} | null}
 */
function getStoredPosition() {
  try {
    const data = localStorage.getItem(LAST_POSITION_KEY);
    if (!data) return null;
    const parsed = JSON.parse(data);
    // Validate it's a proper position object
    if (typeof parsed.lng === 'number' && typeof parsed.lat === 'number') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Save position to storage
 * @param {number} lng
 * @param {number} lat
 */
export function savePosition(lng, lat) {
  try {
    localStorage.setItem(LAST_POSITION_KEY, JSON.stringify({ lng, lat }));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Initialize the map
 * @returns {Promise<void>}
 */
export function initMap() {
  return new Promise((resolve) => {
    // Try to start at last known position
    const lastPos = getStoredPosition();
    const initialCenter = lastPos ? [lastPos.lng, lastPos.lat] : [0, 0];
    const initialZoom = lastPos ? 15 : 2;

    map = new maplibregl.Map({
      container: 'map',
      style: STADIA_STYLE,
      center: initialCenter,
      zoom: initialZoom
    });

    // Add navigation controls
    map.addControl(new maplibregl.NavigationControl(), 'bottom-right');

    map.on('load', () => {
      // Add route source and layer for active run
      map.addSource('route', {
        type: 'geojson',
        data: routeData
      });

      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#ef4444',
          'line-width': 5,
          'line-opacity': 0.9
        }
      });

      // Add history route source and layer
      map.addSource('history-route', {
        type: 'geojson',
        data: historyRouteData
      });

      map.addLayer({
        id: 'history-route-line',
        type: 'line',
        source: 'history-route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#6366f1',
          'line-width': 4,
          'line-opacity': 0.7
        }
      });

      routeSource = map.getSource('route');
      resolve();
    });
  });
}

/**
 * Add a coordinate to the active route
 * @param {number} lng - Longitude
 * @param {number} lat - Latitude
 */
export function addCoordinate(lng, lat) {
  const coords = [lng, lat];

  // Save for next session
  savePosition(lng, lat);
  
  // Add start marker on first coordinate
  if (routeData.features[0].geometry.coordinates.length === 0) {
    startMarker = new maplibregl.Marker({ color: '#10b981' })
      .setLngLat(coords)
      .addTo(map);
    
    currentMarker = new maplibregl.Marker({ color: '#3b82f6' })
      .setLngLat(coords)
      .addTo(map);
    
    // Fast jump to location
    map.jumpTo({ center: coords, zoom: 16 });
  } else {
    // Update current position marker
    currentMarker.setLngLat(coords);
  }

  // Add to route and update source
  routeData.features[0].geometry.coordinates.push(coords);
  routeSource.setData(routeData);
}

/**
 * Get current route coordinates
 * @returns {Array<[number, number]>}
 */
export function getRouteCoordinates() {
  return [...routeData.features[0].geometry.coordinates];
}

/**
 * Clear the active route
 */
export function clearRoute() {
  routeData.features[0].geometry.coordinates = [];
  routeSource?.setData(routeData);
  
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
 * @param {Array<[number, number]>} coordinates
 */
export function showHistoryRoute(coordinates) {
  if (!coordinates || coordinates.length === 0) return;

  historyRouteData.features[0].geometry.coordinates = coordinates;
  map.getSource('history-route').setData(historyRouteData);

  // Fit map to show entire route
  const bounds = coordinates.reduce((bounds, coord) => {
    return bounds.extend(coord);
  }, new maplibregl.LngLatBounds(coordinates[0], coordinates[0]));

  map.fitBounds(bounds, { padding: 60 });
}

/**
 * Clear the history route display
 */
export function clearHistoryRoute() {
  historyRouteData.features[0].geometry.coordinates = [];
  map.getSource('history-route')?.setData(historyRouteData);
}

/**
 * Center map on given coordinates
 * @param {number} lng - Longitude
 * @param {number} lat - Latitude
 */
export function centerOnUser(lng, lat) {
  map.easeTo({ center: [lng, lat], zoom: 16 });
}

/**
 * Get the map instance (for advanced usage)
 * @returns {maplibregl.Map}
 */
export function getMap() {
  return map;
}
