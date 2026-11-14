/**
 * ============================================================================
 * AstroSee — External APIs & Telemetry Engine (js/api.js)
 * 7Timer! Astro Product + Open-Meteo GFS/Elevation + Nominatim OSM
 * ============================================================================
 */

export const BORTLE_SCALE = {
  1: { label: 'Cielo Buio Eccellente', sqm: '21.99–22.0', level: 'opt' },
  2: { label: 'Sito Veramente Buio', sqm: '21.89–21.99', level: 'opt' },
  3: { label: 'Cielo Rurale', sqm: '21.69–21.89', level: 'opt' },
  4: { label: 'Transizione Rurale/Suburbana', sqm: '20.49–21.69', level: 'opt' },
  5: { label: 'Cielo Suburbano', sqm: '19.50–20.49', level: 'mid' },
  6: { label: 'Suburbano Luminoso', sqm: '18.94–19.50', level: 'mid' },
  7: { label: 'Transizione Suburbana/Urbana', sqm: '18.38–18.94', level: 'bad' },
  8: { label: 'Cielo Urbano', sqm: '17.80–18.38', level: 'bad' },
  9: { label: 'Centro Città', sqm: '<17.80', level: 'bad' }
};

export async function fetchWithTimeout(url, timeoutMs = 8000, options = {}) {
  const controller = new AbortController();
  const timerId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timerId);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (err) {
    clearTimeout(timerId);
    throw err;
  }
}

/**
 * Converts Live Open-Meteo GFS/IFS atmospheric telemetry into exact 7Timer! Astro Product schema
 * when 7Timer! blocks browser CORS requests directly.
 */
async function fetchLiveOpenMeteoAsSevenTimer(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&hourly=temperature_2m,relative_humidity_2m,cloud_cover,wind_speed_10m,wind_direction_10m,visibility,lifted_index,precipitation&wind_speed_unit=ms&forecast_days=4`;
  const om = await fetchWithTimeout(url, 8000);
  if (!om || !om.hourly || !Array.isArray(om.hourly.time)) {
    throw new Error('Open-Meteo payload non valido');
  }

  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const hh = String(Math.floor(now.getUTCHours() / 3) * 3).padStart(2, '0');

  let startIdx = 0;
  const nowMs = now.getTime();
  for (let i = 0; i < om.hourly.time.length; i++) {
    const tMs = new Date(om.hourly.time[i] + 'Z').getTime();
    if (tMs >= nowMs - 2 * 3600 * 1000) {
      startIdx = i;
      break;
    }
  }

  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const dataseries = [];

  for (let step = 1; step <= 24; step++) {
    const idx = startIdx + step * 3;
    if (idx >= om.hourly.time.length) break;

    const ccPct = om.hourly.cloud_cover?.[idx] ?? 20;
    const rh = Math.round(om.hourly.relative_humidity_2m?.[idx] ?? 65);
    const temp = Math.round(om.hourly.temperature_2m?.[idx] ?? 10);
    const windMs = om.hourly.wind_speed_10m?.[idx] ?? 2.0;
    const windDeg = om.hourly.wind_direction_10m?.[idx] ?? 0;
    const visM = om.hourly.visibility?.[idx] ?? 24000;
    const rawLi = om.hourly.lifted_index?.[idx] ?? 4;
    const prec = om.hourly.precipitation?.[idx] ?? 0;

    const cloudcover = Math.min(9, Math.max(1, Math.ceil((ccPct + 1) / 11.2)));

    let windSpeedCode = 1;
    if (windMs >= 32.6) windSpeedCode = 8;
    else if (windMs >= 24.5) windSpeedCode = 7;
    else if (windMs >= 17.2) windSpeedCode = 6;
    else if (windMs >= 10.8) windSpeedCode = 5;
    else if (windMs >= 8.0) windSpeedCode = 4;
    else if (windMs >= 3.4) windSpeedCode = 3;
    else if (windMs >= 0.3) windSpeedCode = 2;
    const dirStr = dirs[Math.round(((windDeg % 360) / 45)) % 8];

    let liClass = 2;
    if (rawLi <= -8) liClass = -10;
    else if (rawLi <= -5) liClass = -6;
    else if (rawLi <= -2.5) liClass = -4;
    else if (rawLi <= 0.5) liClass = -1;
    else if (rawLi <= 4) liClass = 2;
    else if (rawLi <= 8) liClass = 6;
    else if (rawLi <= 12.5) liClass = 10;
    else liClass = 15;

    let transparency = 2;
    if (visM >= 28000 && rh < 65) transparency = 1;
    else if (visM >= 22000 && rh < 75) transparency = 2;
    else if (visM >= 16000 && rh < 82) transparency = 3;
    else if (visM >= 11000) transparency = 4;
    else if (visM >= 7000) transparency = 5;
    else if (visM >= 4000) transparency = 6;
    else if (visM >= 2000) transparency = 7;
    else transparency = 8;

    const stabilityPenalty = rawLi < 0 ? 2 : rawLi < 3 ? 1 : 0;
    const windPenalty = windSpeedCode >= 5 ? 3 : windSpeedCode === 4 ? 2 : windSpeedCode === 3 ? 1 : 0;
    const rhPenalty = rh >= 90 ? 1 : 0;
    const seeing = Math.min(8, Math.max(1, 1 + stabilityPenalty + windPenalty + rhPenalty));

    dataseries.push({
      timepoint: step * 3,
      cloudcover,
      seeing,
      transparency,
      lifted_index: liClass,
      rh2m: rh,
      wind10m: { direction: dirStr, speed: windSpeedCode },
      temp2m: temp,
      prec_type: prec > 0.2 ? 'rain' : 'none'
    });
  }

  return {
    product: 'astro',
    init: `${yyyy}${mm}${dd}${hh}`,
    dataseries
  };
}

/**
 * Resilient multi-tier forecast fetcher:
 * 1. Local Node proxy (/api/7timer)
 * 2. Direct 7Timer! API
 * 3. Live Open-Meteo GFS/IFS converted to 7Timer! schema
 */
export async function fetchAstroPayload(lat, lon) {
  const direct7TimerUrl = `https://www.7timer.info/bin/api.pl?lon=${lon.toFixed(4)}&lat=${lat.toFixed(4)}&product=astro&output=json`;
  const localProxyUrl = `/api/7timer?lon=${lon.toFixed(4)}&lat=${lat.toFixed(4)}`;

  if (window.location.protocol.startsWith('http')) {
    try {
      const proxyData = await fetchWithTimeout(localProxyUrl, 6500);
      if (proxyData && Array.isArray(proxyData.dataseries)) {
        return { data: proxyData, sourceLabel: '7Timer! Live' };
      }
    } catch (_) {}
  }

  try {
    const directData = await fetchWithTimeout(direct7TimerUrl, 6000);
    if (directData && Array.isArray(directData.dataseries)) {
      return { data: directData, sourceLabel: '7Timer! Live' };
    }
  } catch (_) {}

  try {
    const liveConverted = await fetchLiveOpenMeteoAsSevenTimer(lat, lon);
    if (liveConverted && Array.isArray(liveConverted.dataseries)) {
      return { data: liveConverted, sourceLabel: 'Live Astro GFS' };
    }
  } catch (_) {}

  return null;
}

function estimateBortleClass(geoData, elevationM) {
  const addr = geoData?.address || {};
  const category = geoData?.category || '';
  const type = geoData?.type || '';
  const pop = parseInt(geoData?.extratags?.population || '0', 10) || 0;
  const elev = typeof elevationM === 'number' ? elevationM : 200;

  let bortle = 5;

  const isNaturalOrMountain =
    ['natural', 'boundary', 'tourism', 'leisure'].includes(category) ||
    ['peak', 'mountain_pass', 'ridge', 'forest', 'park', 'nature_reserve', 'protected_area', 'glacier'].includes(type) ||
    Boolean(addr.peak || addr.mountain_pass || addr.nature_reserve);

  const isDenseUrban =
    Boolean(addr.neighbourhood || addr.quarter || addr.city_district || addr.suburb) &&
    Boolean(addr.city);

  if (pop >= 500000 || (isDenseUrban && elev < 300)) {
    bortle = 8;
    if (pop >= 1000000 || type === 'city_block' || category === 'amenity') bortle = 9;
  } else if (addr.city || pop >= 80000) {
    bortle = isNaturalOrMountain ? 5 : 7;
  } else if (addr.town || pop >= 10000) {
    bortle = elev >= 800 ? 5 : 6;
  } else if (addr.village || addr.hamlet) {
    if (elev >= 1500) bortle = 3;
    else if (elev >= 800) bortle = 4;
    else bortle = 5;
  } else if (isNaturalOrMountain || (!addr.city && !addr.town)) {
    if (elev >= 2100) bortle = 2;
    else if (elev >= 1300) bortle = 3;
    else bortle = 4;
  }

  if (elev >= 2300 && bortle > 2) bortle = Math.max(2, bortle - 1);
  return Math.max(1, Math.min(9, bortle));
}

export async function fetchBortleData(lat, lon) {
  const elevUrl = `https://api.open-meteo.com/v1/elevation?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}`;
  const geoUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}&zoom=14&extratags=1&accept-language=it`;

  const [elevRes, geoRes] = await Promise.allSettled([
    fetchWithTimeout(elevUrl, 5500),
    fetchWithTimeout(geoUrl, 5500, { headers: { Accept: 'application/json' } })
  ]);

  const elevationM =
    elevRes.status === 'fulfilled' && Array.isArray(elevRes.value?.elevation)
      ? Math.round(elevRes.value.elevation[0])
      : null;
  const geoData = geoRes.status === 'fulfilled' ? geoRes.value : null;

  const bortleClass = estimateBortleClass(geoData, elevationM);
  return {
    bortleClass,
    elevationM,
    ...BORTLE_SCALE[bortleClass]
  };
}

export async function reverseGeocode(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}&zoom=12&accept-language=it`;
  const data = await fetchWithTimeout(url, 5500, { headers: { Accept: 'application/json' } });
  const addr = data.address || {};
  return (
    addr.Peak ||
    addr.mountain_pass ||
    addr.village ||
    addr.town ||
    addr.city ||
    addr.municipality ||
    addr.county ||
    data.name ||
    null
  );
}

export async function searchNominatim(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
    query.trim()
  )}&limit=5&accept-language=it`;
  return await fetchWithTimeout(url, 6000, { headers: { Accept: 'application/json' } });
}

export function createFallbackAstroPayload() {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const hh = String(Math.floor(now.getUTCHours() / 6) * 6).padStart(2, '0');

  const pattern = [
    { tp: 3, cc: 3, see: 3, tr: 3, li: 2, ws: 2, wd: 'NW', t: 11, rh: 68 },
    { tp: 6, cc: 2, see: 2, tr: 2, li: 6, ws: 2, wd: 'N', t: 8, rh: 64 },
    { tp: 9, cc: 1, see: 2, tr: 1, li: 6, ws: 1, wd: 'N', t: 6, rh: 60 },
    { tp: 12, cc: 1, see: 1, tr: 2, li: 10, ws: 1, wd: 'NE', t: 5, rh: 58 },
    { tp: 15, cc: 2, see: 2, tr: 2, li: 6, ws: 2, wd: 'NE', t: 7, rh: 62 },
    { tp: 18, cc: 4, see: 4, tr: 3, li: 2, ws: 3, wd: 'E', t: 13, rh: 55 },
    { tp: 21, cc: 5, see: 4, tr: 4, li: -1, ws: 3, wd: 'SE', t: 15, rh: 60 },
    { tp: 24, cc: 3, see: 3, tr: 3, li: 2, ws: 2, wd: 'S', t: 11, rh: 70 },
    { tp: 27, cc: 2, see: 2, tr: 2, li: 6, ws: 2, wd: 'SW', t: 8, rh: 72 },
    { tp: 30, cc: 1, see: 2, tr: 1, li: 6, ws: 2, wd: 'W', t: 7, rh: 68 },
    { tp: 33, cc: 2, see: 3, tr: 2, li: 2, ws: 2, wd: 'NW', t: 6, rh: 70 },
    { tp: 36, cc: 4, see: 4, tr: 4, li: -1, ws: 3, wd: 'NW', t: 10, rh: 65 },
    { tp: 39, cc: 6, see: 5, tr: 5, li: -4, ws: 4, wd: 'W', t: 14, rh: 74 },
    { tp: 42, cc: 7, see: 6, tr: 6, li: -4, ws: 4, wd: 'SW', t: 13, rh: 82 },
    { tp: 45, cc: 5, see: 4, tr: 4, li: -1, ws: 3, wd: 'W', t: 10, rh: 78 },
    { tp: 48, cc: 2, see: 2, tr: 2, li: 6, ws: 2, wd: 'NW', t: 8, rh: 66 },
    { tp: 51, cc: 1, see: 1, tr: 1, li: 10, ws: 1, wd: 'N', t: 6, rh: 60 },
    { tp: 54, cc: 1, see: 2, tr: 1, li: 10, ws: 1, wd: 'N', t: 5, rh: 58 },
    { tp: 57, cc: 2, see: 2, tr: 2, li: 6, ws: 2, wd: 'NE', t: 7, rh: 60 },
    { tp: 60, cc: 3, see: 3, tr: 3, li: 2, ws: 2, wd: 'E', t: 12, rh: 55 },
    { tp: 63, cc: 3, see: 3, tr: 3, li: 2, ws: 2, wd: 'E', t: 14, rh: 54 },
    { tp: 66, cc: 2, see: 2, tr: 2, li: 6, ws: 2, wd: 'NE', t: 10, rh: 62 },
    { tp: 69, cc: 1, see: 2, tr: 1, li: 6, ws: 1, wd: 'N', t: 7, rh: 64 },
    { tp: 72, cc: 1, see: 2, tr: 2, li: 6, ws: 2, wd: 'N', t: 6, rh: 65 }
  ];

  return {
    product: 'astro',
    init: `${yyyy}${mm}${dd}${hh}`,
    dataseries: pattern.map((p) => ({
      timepoint: p.tp,
      cloudcover: p.cc,
      seeing: p.see,
      transparency: p.tr,
      lifted_index: p.li,
      rh2m: p.rh,
      wind10m: { direction: p.wd, speed: p.ws },
      temp2m: p.t,
      prec_type: 'none'
    }))
  };
}
