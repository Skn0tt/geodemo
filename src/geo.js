/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {[number, number]} coord1 - [lng, lat]
 * @param {[number, number]} coord2 - [lng, lat]
 * @returns {number} Distance in meters
 */
export function haversineDistance(coord1, coord2) {
  const R = 6371000; // Earth's radius in meters
  
  const lat1 = toRadians(coord1[1]);
  const lat2 = toRadians(coord2[1]);
  const deltaLat = toRadians(coord2[1] - coord1[1]);
  const deltaLng = toRadians(coord2[0] - coord1[0]);

  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Convert degrees to radians
 * @param {number} degrees 
 * @returns {number}
 */
function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate total distance of a route
 * @param {Array<[number, number]>} coordinates - Array of [lng, lat] points
 * @returns {number} Total distance in meters
 */
export function calculateTotalDistance(coordinates) {
  if (coordinates.length < 2) return 0;

  let totalDistance = 0;
  for (let i = 1; i < coordinates.length; i++) {
    totalDistance += haversineDistance(coordinates[i - 1], coordinates[i]);
  }

  return totalDistance;
}
