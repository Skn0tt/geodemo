import { addCoordinate, getRouteCoordinates, clearRoute, showHistoryRoute } from './map.ts';
import { calculateTotalDistance, haversineDistance, type Coordinate } from './geo.ts';
import { saveRun, generateId, type Run } from './storage.ts';

export type RunState = 'stopped' | 'running' | 'paused';

// Run state
let state: RunState = 'stopped';
let watchId: number | null = null;
let startTime: number | null = null;
let pausedTime = 0;
let pauseStart: number | null = null;
let currentRunId: string | null = null;
let lastPosition: { lng: number; lat: number } | null = null;

// Callbacks for UI updates
let onDistanceUpdate: ((distance: number) => void) | null = null;
let onStateChange: ((state: RunState) => void) | null = null;

// Accuracy and jitter thresholds
const MAX_ACCURACY = 30; // meters - ignore readings less accurate than this
const MIN_MOVEMENT = 3; // meters - ignore movements smaller than this (GPS jitter)

/**
 * Set callback for distance updates
 */
export function setOnDistanceUpdate(callback: (distance: number) => void): void {
  onDistanceUpdate = callback;
}

/**
 * Set callback for state changes
 */
export function setOnStateChange(callback: (state: RunState) => void): void {
  onStateChange = callback;
}

/**
 * Get current run state
 */
export function getState(): RunState {
  return state;
}

/**
 * Get elapsed time in milliseconds (excluding paused time)
 */
export function getElapsedTime(): number {
  if (!startTime) return 0;

  if (state === 'paused' && pauseStart) {
    return pauseStart - startTime - pausedTime;
  }

  if (state === 'running') {
    return Date.now() - startTime - pausedTime;
  }

  return 0;
}

/**
 * Get current distance in meters
 */
export function getCurrentDistance(): number {
  const coords = getRouteCoordinates();
  return calculateTotalDistance(coords);
}

/**
 * Get last known position
 */
export function getLastPosition(): { lng: number; lat: number } | null {
  return lastPosition;
}

/**
 * Start or resume tracking
 */
export function startTracking(): void {
  if (!navigator.geolocation) {
    alert('Geolocation is not supported by your browser');
    return;
  }

  if (state === 'stopped') {
    // Fresh start
    currentRunId = generateId();
    startTime = Date.now();
    pausedTime = 0;
    clearRoute();
  } else if (state === 'paused' && pauseStart) {
    // Resume from pause
    pausedTime += Date.now() - pauseStart;
    pauseStart = null;
  }

  state = 'running';
  onStateChange?.(state);

  watchId = navigator.geolocation.watchPosition(handlePositionUpdate, handlePositionError, {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0,
  });
}

/**
 * Pause tracking
 */
export function pauseTracking(): void {
  if (state !== 'running') return;

  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }

  pauseStart = Date.now();
  state = 'paused';
  onStateChange?.(state);
}

/**
 * Finish and save the run
 */
export function finishRun(): void {
  if (state === 'stopped') return;

  // Stop watching
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }

  const coordinates = getRouteCoordinates();
  const distance = calculateTotalDistance(coordinates);
  const duration = getElapsedTime();

  // Only save if we have actual data
  if (coordinates.length > 0 && duration > 0 && currentRunId && startTime) {
    const run: Run = {
      id: currentRunId,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date().toISOString(),
      duration,
      distance,
      coordinates,
    };
    saveRun(run);

    // Show the completed run as a history route so polyline remains visible
    showHistoryRoute(coordinates);
  }

  // Reset state (but keep route visible)
  state = 'stopped';
  startTime = null;
  pausedTime = 0;
  pauseStart = null;
  currentRunId = null;
  lastPosition = null;
  // Note: clearRoute() is called in startTracking() when beginning a new run

  onStateChange?.(state);
}

/**
 * Handle incoming position update
 */
function handlePositionUpdate(position: GeolocationPosition): void {
  const { latitude, longitude, accuracy } = position.coords;

  // Filter out inaccurate readings
  if (accuracy > MAX_ACCURACY) {
    console.log(`Skipping inaccurate reading: ${accuracy.toFixed(1)}m accuracy`);
    return;
  }

  const coords = getRouteCoordinates();

  // Filter out GPS jitter (very small movements)
  if (coords.length > 0) {
    const lastCoord = coords[coords.length - 1];
    const movement = haversineDistance(lastCoord, [longitude, latitude] as Coordinate);

    if (movement < MIN_MOVEMENT) {
      console.log(`Skipping jitter: ${movement.toFixed(1)}m movement`);
      return;
    }
  }

  // Update last position
  lastPosition = { lng: longitude, lat: latitude };

  // Add to map
  addCoordinate(longitude, latitude);

  // Notify distance update
  const distance = calculateTotalDistance(getRouteCoordinates());
  onDistanceUpdate?.(distance);
}

/**
 * Handle geolocation error
 */
function handlePositionError(error: GeolocationPositionError): void {
  console.error('Geolocation error:', error.message);

  switch (error.code) {
    case error.PERMISSION_DENIED:
      alert('Location permission denied. Please enable location access to track your run.');
      break;
    case error.POSITION_UNAVAILABLE:
      console.log('Position unavailable, will retry...');
      break;
    case error.TIMEOUT:
      console.log('Location request timed out, will retry...');
      break;
  }
}
