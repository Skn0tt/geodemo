import type { Coordinate } from './geo.ts';

export interface Run {
  id: string;
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  duration: number; // milliseconds
  distance: number; // meters
  coordinates: Coordinate[];
}

const STORAGE_KEY = 'runTracker_history';

/**
 * Get all runs from storage
 */
export function getRuns(): Run[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data) as Run[];
  } catch (e) {
    console.error('Failed to load runs from storage:', e);
    return [];
  }
}

/**
 * Save a run to storage
 */
export function saveRun(run: Run): void {
  const runs = getRuns();
  runs.unshift(run); // Add to beginning (newest first)

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(runs));
  } catch (e) {
    console.error('Failed to save run to storage:', e);
    // If storage is full, try removing oldest runs
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      const trimmedRuns = runs.slice(0, 50); // Keep only 50 most recent
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedRuns));
    }
  }
}

/**
 * Get a specific run by ID
 */
export function getRunById(id: string): Run | undefined {
  const runs = getRuns();
  return runs.find((run) => run.id === id);
}

/**
 * Delete a run by ID
 */
export function deleteRun(id: string): void {
  const runs = getRuns();
  const filtered = runs.filter((run) => run.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

/**
 * Generate a unique ID for a run
 */
export function generateId(): string {
  return `run_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
