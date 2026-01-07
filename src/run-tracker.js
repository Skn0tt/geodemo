import { addCoordinate, getRouteCoordinates, clearRoute } from './map.js';
import { calculateTotalDistance, haversineDistance } from './geo.js';
import { saveRun, generateId } from './storage.js';

// Run state
let state = 'stopped'; // 'stopped' | 'running' | 'paused'
let watchId = null;
let startTime = null;
let pausedTime = 0;
let pauseStart = null;
let currentRunId = null;
let lastPosition = null;

// Callbacks for UI updates
let onDistanceUpdate = null;
let onStateChange = null;

// Accuracy and jitter thresholds
const MAX_ACCURACY = 30; // meters - ignore readings less accurate than this
const MIN_MOVEMENT = 3;  // meters - ignore movements smaller than this (GPS jitter)

/**
 * Set callback for distance updates
 * @param {(distance: number) => void} callback 
 */
export function setOnDistanceUpdate(callback) {
  onDistanceUpdate = callback;
}

/**
 * Set callback for state changes
 * @param {(state: string) => void} callback 
 */
export function setOnStateChange(callback) {
  onStateChange = callback;
}

/**
 * Get current run state
 * @returns {'stopped' | 'running' | 'paused'}
 */
export function getState() {
  return state;
}

/**
 * Get elapsed time in milliseconds (excluding paused time)
 * @returns {number}
 */
export function getElapsedTime() {
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
 * @returns {number}
 */
export function getCurrentDistance() {
  const coords = getRouteCoordinates();
  return calculateTotalDistance(coords);
}

/**
 * Get last known position
 * @returns {{lng: number, lat: number} | null}
 */
export function getLastPosition() {
  return lastPosition;
}

/**
 * Start or resume tracking
 */
export function startTracking() {
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

  watchId = navigator.geolocation.watchPosition(
    handlePositionUpdate,
    handlePositionError,
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );
}

/**
 * Pause tracking
 */
export function pauseTracking() {
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
export function finishRun() {
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
  if (coordinates.length > 0 && duration > 0) {
    const run = {
      id: currentRunId,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date().toISOString(),
      duration,
      distance,
      coordinates
    };
    saveRun(run);
  }

  // Reset state
  state = 'stopped';
  startTime = null;
  pausedTime = 0;
  pauseStart = null;
  currentRunId = null;
  lastPosition = null;
  clearRoute();
  
  onStateChange?.(state);
}

/**
 * Handle incoming position update
 * @param {GeolocationPosition} position 
 */
function handlePositionUpdate(position) {
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
    const movement = haversineDistance(lastCoord, [longitude, latitude]);
    
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
 * @param {GeolocationPositionError} error 
 */
function handlePositionError(error) {
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
