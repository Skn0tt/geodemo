const STORAGE_KEY = 'runTracker_history';

/**
 * @typedef {Object} Run
 * @property {string} id - Unique identifier
 * @property {string} startTime - ISO 8601 start time
 * @property {string} endTime - ISO 8601 end time
 * @property {number} duration - Duration in milliseconds
 * @property {number} distance - Distance in meters
 * @property {Array<[number, number]>} coordinates - Array of [lng, lat] points
 */

/**
 * Get all runs from storage
 * @returns {Run[]}
 */
export function getRuns() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (e) {
    console.error('Failed to load runs from storage:', e);
    return [];
  }
}

/**
 * Save a run to storage
 * @param {Run} run 
 */
export function saveRun(run) {
  const runs = getRuns();
  runs.unshift(run); // Add to beginning (newest first)
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
  } catch (e) {
    console.error('Failed to save run to storage:', e);
    // If storage is full, try removing oldest runs
    if (e.name === 'QuotaExceededError') {
      const trimmedRuns = runs.slice(0, 50); // Keep only 50 most recent
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedRuns));
    }
  }
}

/**
 * Get a specific run by ID
 * @param {string} id 
 * @returns {Run | undefined}
 */
export function getRunById(id) {
  const runs = getRuns();
  return runs.find(run => run.id === id);
}

/**
 * Delete a run by ID
 * @param {string} id 
 */
export function deleteRun(id) {
  const runs = getRuns();
  const filtered = runs.filter(run => run.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

/**
 * Generate a unique ID for a run
 * @returns {string}
 */
export function generateId() {
  return `run_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
