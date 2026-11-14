/**
 * ============================================================================
 * AstroSee — Local Storage Persistence Module (js/storage.js)
 * ============================================================================
 */

const STORAGE_KEYS = {
  LAST_LOCATION: 'astrosee_last_location_v1',
  LAST_FORECAST: 'astrosee_last_forecast_v1',
  RED_NIGHT_MODE: 'astrosee_red_night_v1'
};

export function saveLocation(lat, lon, name) {
  try {
    localStorage.setItem(
      STORAGE_KEYS.LAST_LOCATION,
      JSON.stringify({ lat, lon, name })
    );
  } catch (_) {}
}

export function loadLocation() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LAST_LOCATION);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed.lat === 'number' && typeof parsed.lon === 'number') {
      return parsed;
    }
  } catch (_) {}
  return null;
}

export function saveForecast(lat, lon, locationName, payload) {
  try {
    localStorage.setItem(
      STORAGE_KEYS.LAST_FORECAST,
      JSON.stringify({
        timestamp: Date.now(),
        lat,
        lon,
        locationName,
        payload
      })
    );
  } catch (_) {}
}

export function loadForecast() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LAST_FORECAST);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (cached && cached.payload && Array.isArray(cached.payload.dataseries)) {
      return cached;
    }
  } catch (_) {}
  return null;
}

export function saveRedNightMode(enabled) {
  try {
    localStorage.setItem(STORAGE_KEYS.RED_NIGHT_MODE, enabled ? '1' : '0');
  } catch (_) {}
}

export function loadRedNightMode() {
  try {
    return localStorage.getItem(STORAGE_KEYS.RED_NIGHT_MODE) === '1';
  } catch (_) {
    return false;
  }
}
