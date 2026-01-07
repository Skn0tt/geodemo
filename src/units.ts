const METERS_PER_MILE = 1609.344;
const METERS_PER_KM = 1000;
const FEET_PER_METER = 3.28084;

/**
 * Detect if user's locale uses imperial units
 */
export function isImperial(): boolean {
  try {
    const locale = navigator.language || 'en-US';
    const localeObj = new Intl.Locale(locale);
    const region = localeObj.region || '';

    // Countries primarily using miles for distance
    const imperialRegions = ['US', 'GB', 'MM', 'LR'];

    return imperialRegions.includes(region);
  } catch {
    // Fallback: check if language string contains US or GB
    const lang = navigator.language || 'en-US';
    return lang.includes('US') || lang.includes('GB');
  }
}

/**
 * Format distance in user's preferred units
 */
export function formatDistance(meters: number): string {
  if (isImperial()) {
    const miles = meters / METERS_PER_MILE;
    if (miles < 0.1) {
      const feet = Math.round(meters * FEET_PER_METER);
      return `${feet} ft`;
    }
    return `${miles.toFixed(2)} mi`;
  } else {
    const km = meters / METERS_PER_KM;
    if (km < 1) {
      return `${Math.round(meters)} m`;
    }
    return `${km.toFixed(2)} km`;
  }
}

/**
 * Format duration in HH:MM:SS format
 */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number): string => n.toString().padStart(2, '0');

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Format date for display
 */
export function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString(navigator.language, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format time for display
 */
export function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString(navigator.language, {
    hour: '2-digit',
    minute: '2-digit',
  });
}
