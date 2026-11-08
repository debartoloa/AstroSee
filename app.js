/**
 * ============================================================================
 * AstroSee — Seeing & Astronomical Weather PWA
 * Engine: 7Timer! Astro Product API + Nominatim Geocoding + Leaflet.js
 * ============================================================================
 */

'use strict';

/* ==========================================================================
   1. 7TIMER! ASTRO PRODUCT DECODERS & LOOKUP TABLES
   ========================================================================== */

const SEVEN_TIMER_DECODERS = {
  /**
   * Cloud Cover (1 to 9)
   * 1: 0%-6%, 2: 6%-19%, 3: 19%-31%, 4: 31%-44%, 5: 44%-56%,
   * 6: 56%-69%, 7: 69%-81%, 8: 81%-94%, 9: 94%-100%
   */
  cloudcover(code) {
    const map = {
      1: { label: 'Sereno (0–6%)', pct: 3, level: 'opt', short: '0–6%' },
      2: { label: 'Quasi Sereno (6–19%)', pct: 12, level: 'opt', short: '6–19%' },
      3: { label: 'Poco Nuvoloso (19–31%)', pct: 25, level: 'mid', short: '19–31%' },
      4: { label: 'Parz. Velato (31–44%)', pct: 38, level: 'mid', short: '31–44%' },
      5: { label: 'Parz. Nuvoloso (44–56%)', pct: 50, level: 'mid', short: '44–56%' },
      6: { label: 'Molto Nuvoloso (56–69%)', pct: 62, level: 'bad', short: '56–69%' },
      7: { label: 'Nuvoloso (69–81%)', pct: 75, level: 'bad', short: '69–81%' },
      8: { label: 'Quasi Coperto (81–94%)', pct: 88, level: 'bad', short: '81–94%' },
      9: { label: 'Coperto (94–100%)', pct: 98, level: 'bad', short: '94–100%' }
    };
    return map[code] || { label: `Classe ${code}`, pct: 50, level: 'mid', short: `Cl.${code}` };
  },

  /**
   * Astronomical Seeing (1 to 8) - Lower is better!
   * 1: <0.5", 2: 0.5"-0.75", 3: 0.75"-1.0", 4: 1.0"-1.25",
   * 5: 1.25"-1.5", 6: 1.5"-2.0", 7: 2.0"-2.5", 8: >2.5"
   */
  seeing(code) {
    const map = {
      1: { label: 'Eccellente (<0.5")', arcsec: '<0.5"', level: 'opt', badge: 'Ottimo' },
      2: { label: 'Ottimo (0.5"–0.75")', arcsec: '0.5–0.75"', level: 'opt', badge: 'Ottimo' },
      3: { label: 'Buono (0.75"–1.0")', arcsec: '0.75–1.0"', level: 'opt', badge: 'Buono' },
      4: { label: 'Discreto (1.0"–1.25")', arcsec: '1.0–1.25"', level: 'mid', badge: 'Discreto' },
      5: { label: 'Mediocre (1.25"–1.5")', arcsec: '1.25–1.5"', level: 'mid', badge: 'Mediocre' },
      6: { label: 'Scarso (1.5"–2.0")', arcsec: '1.5–2.0"', level: 'bad', badge: 'Scarso' },
      7: { label: 'Cattivo (2.0"–2.5")', arcsec: '2.0–2.5"', level: 'bad', badge: 'Cattivo' },
      8: { label: 'Pessimo (>2.5")', arcsec: '>2.5"', level: 'bad', badge: 'Pessimo' }
    };
    return map[code] || { label: `Classe ${code}`, arcsec: '--', level: 'mid', badge: `Cl.${code}` };
  },

  /**
   * Atmospheric Transparency (1 to 8) - Lower is better!
   * Zenithal extinction in mag/airmass:
   * 1: <0.3, 2: 0.3-0.4, 3: 0.4-0.5, 4: 0.5-0.6, 5: 0.6-0.7, 6: 0.7-0.85, 7: 0.85-1.0, 8: >1.0
   */
  transparency(code) {
    const map = {
      1: { label: 'Cristallina (<0.3 mag)', ext: '<0.3 mag/am', level: 'opt' },
      2: { label: 'Molto Limpida (0.3–0.4)', ext: '0.3–0.4 mag', level: 'opt' },
      3: { label: 'Buona (0.4–0.5)', ext: '0.4–0.5 mag', level: 'opt' },
      4: { label: 'Discreta (0.5–0.6)', ext: '0.5–0.6 mag', level: 'mid' },
      5: { label: 'Leggera Foschia (0.6–0.7)', ext: '0.6–0.7 mag', level: 'mid' },
      6: { label: 'Velata / Umida (0.7–0.85)', ext: '0.7–0.85 mag', level: 'bad' },
      7: { label: 'Foschia Densa (0.85–1.0)', ext: '0.85–1.0 mag', level: 'bad' },
      8: { label: 'Opaca (>1.0 mag)', ext: '>1.0 mag', level: 'bad' }
    };
    return map[code] || { label: `Classe ${code}`, ext: '--', level: 'mid' };
  },

  /**
   * 10m Wind Speed (1 to 8) & Direction
   * 1: <0.3m/s, 2: 0.3-3.4m/s, 3: 3.4-8.0m/s, 4: 8.0-10.8m/s,
   * 5: 10.8-17.2m/s, 6: 17.2-24.5m/s, 7: 24.5-32.6m/s, 8: >32.6m/s
   */
  wind10m(windObj) {
    const speedCode = windObj && typeof windObj.speed === 'number' ? windObj.speed : 2;
    const dir = windObj && windObj.direction ? windObj.direction : 'N/D';
    const map = {
      1: { label: 'Calma (<1 km/h)', ms: '<0.3 m/s', kmh: '~1 km/h', level: 'opt' },
      2: { label: 'Brezza Leggera', ms: '0.3–3.4 m/s', kmh: '1–12 km/h', level: 'opt' },
      3: { label: 'Vento Moderato', ms: '3.4–8.0 m/s', kmh: '12–28 km/h', level: 'mid' },
      4: { label: 'Vento Sostenuto', ms: '8.0–10.8 m/s', kmh: '29–39 km/h', level: 'bad' },
      5: { label: 'Vento Forte', ms: '10.8–17.2 m/s', kmh: '39–62 km/h', level: 'bad' },
      6: { label: 'Burrasca', ms: '17.2–24.5 m/s', kmh: '62–88 km/h', level: 'bad' },
      7: { label: 'Tempesta', ms: '24.5–32.6 m/s', kmh: '88–117 km/h', level: 'bad' },
      8: { label: 'Uragano', ms: '>32.6 m/s', kmh: '>117 km/h', level: 'bad' }
    };
    const decoded = map[speedCode] || map[2];
    return { ...decoded, speedCode, dir };
  },

  /**
   * Lifted Index (Thermodynamic Stability)
   * Values in 7Timer: -10, -6, -4, -1, 2, 6, 10, 15
   * Positive values = Stable air (good laminar flow). Negative = Unstable/Convective.
   */
  liftedIndex(val) {
    if (val >= 6) {
      return { label: `Molto Stabile (+${val})`, desc: 'Aria stratificata ferma', level: 'opt' };
    }
    if (val >= 2) {
      return { label: `Stabile (+${val})`, desc: 'Assenza di moti convettivi', level: 'opt' };
    }
    if (val >= -1) {
      return { label: `Neutro (${val})`, desc: 'Debole rimescolamento', level: 'mid' };
    }
    if (val >= -4) {
      return { label: `Instabile (${val})`, desc: 'Termiche / turbolenza', level: 'bad' };
    }
    return { label: `Molto Instabile (${val})`, desc: 'Rischio convezione severa', level: 'bad' };
  }
};

/* ==========================================================================
   2. ASTRO QUALITY SCORE & AI OBSERVING ADVISOR ENGINE
   ========================================================================== */

/**
 * Computes a composite 0-100 Astronomical Observing Quality Score for a single 3-hour slot.
 * Weights cloud cover heavily (if overcast, observing is impossible), then seeing, transparency, wind, and LI.
 */
function computeAstroScore(slot) {
  // Cloud factor (0 to 38 pts)
  const cloudPts = Math.max(0, 38 - (slot.cloudcover - 1) * 4.75);
  // Seeing factor (0 to 28 pts)
  const seeingPts = Math.max(0, 28 - (slot.seeing - 1) * 4.0);
  // Transparency factor (0 to 18 pts)
  const transPts = Math.max(0, 18 - (slot.transparency - 1) * 2.55);
  // Wind factor (0 to 10 pts)
  const windSpeed = slot.wind10m?.speed || 2;
  const windPts = Math.max(0, 10 - (windSpeed - 1) * 2.2);
  // Stability factor (0 to 6 pts)
  const li = typeof slot.lifted_index === 'number' ? slot.lifted_index : 2;
  const liPts = li >= 2 ? 6 : li >= -1 ? 4 : 1;

  let raw = Math.round(cloudPts + seeingPts + transPts + windPts + liPts);

  // Heavy penalty if sky is overcast (cloudcover >= 7)
  if (slot.cloudcover >= 7) {
    raw = Math.min(raw, 28);
  } else if (slot.cloudcover === 6) {
    raw = Math.min(raw, 45);
  }
  if (slot.prec_type && slot.prec_type !== 'none') {
    raw = Math.min(raw, 15);
  }

  const score = Math.max(5, Math.min(100, raw));
  let semaphore = 'bad';
  let statusText = 'Sconsigliato';

  if (score >= 70) {
    semaphore = 'opt';
    statusText = 'Ottimo';
  } else if (score >= 42) {
    semaphore = 'mid';
    statusText = 'Discreto';
  }

  return { score, semaphore, statusText };
}

/**
 * Parses 7Timer! `init` string (e.g., "2026110806") into a UTC Date object.
 */
function parseSevenTimerInit(initStr) {
  if (!initStr || typeof initStr !== 'string' || initStr.length < 10) {
    return new Date();
  }
  const year = parseInt(initStr.slice(0, 4), 10);
  const month = parseInt(initStr.slice(4, 6), 10) - 1;
  const day = parseInt(initStr.slice(6, 8), 10);
  const hour = parseInt(initStr.slice(8, 10), 10);
  return new Date(Date.UTC(year, month, day, hour, 0, 0));
}

/**
 * Generates a realistic fallback 7Timer! dataset if the device is completely offline on first boot
 * and no cached response exists yet.
 */
function createFallbackAstroPayload() {
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

/**
 * Generates the AI Observing Advisor synthesis for the currently selected slots.
 */
function buildAIObservingAdvisor(slots, locationName) {
  if (!slots || slots.length === 0) {
    return {
      bestScore: 0,
      headline: 'Nessuno slot disponibile per il filtro selezionato.',
      narrative: 'Prova ad ampliare l\'orizzonte orario con lo slider o a disattivare il filtro "Solo fasce notturne".',
      targets: ['Nessun target'],
      warnings: ['Nessun dato nel range selezionato.']
    };
  }

  // Prefer night/twilight slots when looking for the best astronomical window, fallback to all slots
  const nightSlots = slots.filter((s) => s.isNight);
  const candidatePool = nightSlots.length > 0 ? nightSlots : slots;

  // Find best contiguous 2-slot window or best single slot
  let bestSlot = candidatePool[0];
  for (const s of candidatePool) {
    if (s.quality.score > bestSlot.quality.score) {
      bestSlot = s;
    }
  }

  // Check if the adjacent slot is also good (>= 60) to form a wider time window
  const idxInAll = slots.findIndex((s) => s.timepoint === bestSlot.timepoint);
  const nextSlot = idxInAll >= 0 && idxInAll + 1 < slots.length ? slots[idxInAll + 1] : null;

  const startHourStr = formatHour(bestSlot.date);
  const endWindowDate =
    nextSlot && nextSlot.quality.score >= 62
      ? new Date(nextSlot.date.getTime() + 3 * 3600 * 1000)
      : new Date(bestSlot.date.getTime() + 3 * 3600 * 1000);
  const endHourStr = formatHour(endWindowDate);
  const dayLabel = formatShortDay(bestSlot.date);

  const seeInfo = SEVEN_TIMER_DECODERS.seeing(bestSlot.seeing);
  const cloudInfo = SEVEN_TIMER_DECODERS.cloudcover(bestSlot.cloudcover);
  const transInfo = SEVEN_TIMER_DECODERS.transparency(bestSlot.transparency);

  let headline = '';
  let narrative = '';

  if (bestSlot.quality.score >= 70) {
    headline = `Finestra ottimale ${dayLabel} dalle ${startHourStr} alle ${endHourStr}`;
    narrative = `Su <strong>${escapeHtml(locationName)}</strong> la finestra migliore va dalle <strong>${startHourStr} alle ${endHourStr}</strong> (${dayLabel}), con seeing stabile in <strong>classe ${bestSlot.seeing} (${seeInfo.arcsec})</strong>, copertura nuvolosa <strong>${cloudInfo.short}</strong> e trasparenza <strong>${transInfo.label.toLowerCase()}</strong>. Condizioni ideali per sessioni ad alta risoluzione e astrofotografia.`;
  } else if (bestSlot.quality.score >= 42) {
    headline = `Finestra discreta ${dayLabel} tra le ${startHourStr} e le ${endHourStr}`;
    narrative = `Condizioni osservative moderate: lo slot più favorevole si colloca dalle <strong>${startHourStr} alle ${endHourStr}</strong> (${dayLabel}) con seeing in <strong>classe ${bestSlot.seeing} (${seeInfo.arcsec})</strong> e nuvolosità <strong>${cloudInfo.short}</strong>. Consigli pose brevi o osservazione visuale a medi ingrandimenti.`;
  } else {
    headline = `Condizioni critiche nell'intervallo selezionato (Max ${bestSlot.quality.score}/100)`;
    narrative = `Il modello 7Timer! indica condizioni avverse nell'intervallo scelto. Il momento meno penalizzato è intorno alle <strong>${startHourStr} (${dayLabel})</strong>, ma con copertura nuvolosa <strong>${cloudInfo.label}</strong> e seeing in <strong>classe ${bestSlot.seeing}</strong>. Si suggerisce di posticipare la sessione.`;
  }

  // Recommended Astronomical Targets based on Seeing vs Transparency
  const targets = [];
  if (bestSlot.cloudcover <= 3) {
    if (bestSlot.seeing <= 2) {
      targets.push('🪐 Alta Risoluzione Planetaria & Lunare');
      targets.push('🌟 Stelle Doppie Strette (<1")');
    }
    if (bestSlot.transparency <= 2) {
      targets.push('🌌 Deep-Sky & Galassie Deboli (Banda Larga)');
    } else if (bestSlot.transparency <= 4) {
      targets.push('🔭 Nebulose a Emissione (Filtri H-Alpha / OIII)');
    }
    if (targets.length === 0) {
      targets.push('✨ Ammassi Aperti & Globulari Luminosi');
    }
  } else if (bestSlot.cloudcover <= 5) {
    targets.push('🌙 Osservazione Rapida tra Velature (Luna / Pianeti)');
  } else {
    targets.push('⏸️ Sospensione Osservativa / Manutenzione Ottiche');
  }

  // Detect Critical Warnings across the selected interval
  const warnings = [];
  const windySlots = slots.filter((s) => (s.wind10m?.speed || 1) >= 3);
  const cloudySlots = slots.filter((s) => s.cloudcover >= 6);
  const unstableSlots = slots.filter((s) => s.lifted_index <= -1);
  const badSeeingSlots = slots.filter((s) => s.seeing >= 5);
  const humidSlots = slots.filter((s) => typeof s.rh2m === 'number' && s.rh2m >= 80);

  if (windySlots.length > 0) {
    const firstWind = windySlots[0];
    const wInfo = SEVEN_TIMER_DECODERS.wind10m(firstWind.wind10m);
    warnings.push(
      `💨 Attenzione a raffiche di vento (${wInfo.kmh} da ${wInfo.dir}) intorno alle ${formatHour(firstWind.date)}: possibili micro-vibrazioni sulla montatura.`
    );
  }

  if (cloudySlots.length > 0) {
    const firstCloud = cloudySlots[0];
    warnings.push(
      `☁️ Passaggio di nuvolosità compatta o velature spesse a partire dalle ${formatHour(firstCloud.date)} (${formatShortDay(firstCloud.date)}).`
    );
  }

  if (unstableSlots.length > 0) {
    const firstUnstable = unstableSlots[0];
    warnings.push(
      `⚡ Atmosfera termodinamicamente instabile (LI ${firstUnstable.lifted_index}) intorno alle ${formatHour(firstUnstable.date)}: turbolenza convettiva in quota.`
    );
  } else if (badSeeingSlots.length > 0) {
    const firstBadSee = badSeeingSlots[0];
    warnings.push(
      `🌊 Degrado del seeing (classe ${firstBadSee.seeing}, >1.25") previsto verso le ${formatHour(firstBadSee.date)}.`
    );
  }

  if (humidSlots.length > 0) {
    warnings.push(
      `💧 Umidità relativa elevata (>80%): attiva le fasce anticondensa e il paraluce per evitare appannamento della lastra correttrice.`
    );
  }

  if (warnings.length === 0) {
    warnings.push(
      '✅ Nessuna criticità severa rilevata: colonna d\'aria stabile, vento calmo al suolo e assenza di perturbazioni.'
    );
  }

  return {
    bestSlotTimepoint: bestSlot.timepoint,
    bestScore: bestSlot.quality.score,
    headline,
    narrative,
    targets,
    warnings
  };
}

/* ==========================================================================
   3. APPLICATION STATE & DOM REFERENCES
   ========================================================================== */

const APP_STATE = {
  lat: 45.8665,
  lon: 11.5268,
  locationName: 'Osservatorio di Asiago',
  horizonHours: 24,
  filterMode: 'hours', // 'tonight' | 'hours'
  nightOnly: false,
  raw7TimerData: null,
  processedSlots: [],
  map: null,
  marker: null,
  isOfflineData: false
};

const STORAGE_KEYS = {
  LAST_LOCATION: 'astrosee_last_location_v1',
  LAST_FORECAST: 'astrosee_last_forecast_v1',
  RED_NIGHT_MODE: 'astrosee_red_night_v1'
};

/* ==========================================================================
   4. INITIALIZATION & EVENT LISTENERS
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  initServiceWorker();
  restoreSavedPreferences();
  initLeafletMap();
  bindUIEvents();
  updateConnectionBadge();
  fetchAstroForecast(APP_STATE.lat, APP_STATE.lon, APP_STATE.locationName);
});

function initServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .register('./sw.js')
      .catch((err) => console.warn('Service Worker non registrato:', err));
  }
  window.addEventListener('online', updateConnectionBadge);
  window.addEventListener('offline', updateConnectionBadge);
}

function updateConnectionBadge() {
  const pill = document.getElementById('connection-status');
  const label = document.getElementById('connection-label');
  if (!pill || !label) return;

  if (!navigator.onLine || APP_STATE.isOfflineData) {
    pill.classList.add('offline');
    label.textContent = navigator.onLine ? 'Cache Locale' : 'Offline (Cache)';
  } else {
    pill.classList.remove('offline');
    label.textContent = '7Timer! Live';
  }
}

function restoreSavedPreferences() {
  try {
    const savedLoc = localStorage.getItem(STORAGE_KEYS.LAST_LOCATION);
    if (savedLoc) {
      const parsed = JSON.parse(savedLoc);
      if (typeof parsed.lat === 'number' && typeof parsed.lon === 'number') {
        APP_STATE.lat = parsed.lat;
        APP_STATE.lon = parsed.lon;
        APP_STATE.locationName = parsed.name || 'Posizione salvata';
      }
    }
    const redMode = localStorage.getItem(STORAGE_KEYS.RED_NIGHT_MODE);
    if (redMode === '1') {
      document.body.classList.add('red-night-mode');
      document.getElementById('btn-night-vision')?.classList.add('active-red');
    }
  } catch (e) {
    console.warn('Impossibile leggere preferenze locali:', e);
  }
}

/* ==========================================================================
   5. INTERACTIVE MAP (LEAFLET.JS) & GEOLOCATION / GEOCODING
   ========================================================================== */

function initLeafletMap() {
  const mapEl = document.getElementById('astro-map');
  if (!mapEl || typeof L === 'undefined') return;

  APP_STATE.map = L.map('astro-map', {
    center: [APP_STATE.lat, APP_STATE.lon],
    zoom: 7,
    zoomControl: true,
    attributionControl: false
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 17
  }).addTo(APP_STATE.map);

  // Custom glowing cyan pin icon
  const pinIcon = L.divIcon({
    className: 'custom-astro-pin',
    html: `<div style="
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: #38bdf8;
      border: 3px solid #050711;
      box-shadow: 0 0 14px #38bdf8, 0 0 28px rgba(56,189,248,0.8);
    "></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11]
  });

  APP_STATE.marker = L.marker([APP_STATE.lat, APP_STATE.lon], {
    draggable: true,
    icon: pinIcon
  }).addTo(APP_STATE.map);

  // Click anywhere on map to relocate
  APP_STATE.map.on('click', (e) => {
    const { lat, lng } = e.latlng;
    selectCoordinates(lat, lng, `Mappa (${lat.toFixed(2)}°, ${lng.toFixed(2)}°)`);
    reverseGeocodeName(lat, lng);
  });

  // Drag marker to relocate
  APP_STATE.marker.on('dragend', () => {
    const pos = APP_STATE.marker.getLatLng();
    selectCoordinates(pos.lat, pos.lng, `Pin (${pos.lat.toFixed(2)}°, ${pos.lng.toFixed(2)}°)`);
    reverseGeocodeName(pos.lat, pos.lng);
  });
}

function selectCoordinates(lat, lon, name, panMap = true) {
  const clampedLat = Math.max(-85, Math.min(85, Number(lat)));
  const clampedLon = Math.max(-180, Math.min(180, Number(lon)));

  APP_STATE.lat = clampedLat;
  APP_STATE.lon = clampedLon;
  if (name) {
    APP_STATE.locationName = name;
  }

  updateCoordinatesReadout();

  if (APP_STATE.marker) {
    APP_STATE.marker.setLatLng([clampedLat, clampedLon]);
  }
  if (panMap && APP_STATE.map) {
    APP_STATE.map.setView([clampedLat, clampedLon], Math.max(APP_STATE.map.getZoom(), 8), {
      animate: true
    });
  }

  try {
    localStorage.setItem(
      STORAGE_KEYS.LAST_LOCATION,
      JSON.stringify({ lat: clampedLat, lon: clampedLon, name: APP_STATE.locationName })
    );
  } catch (_) {}

  fetchAstroForecast(clampedLat, clampedLon, APP_STATE.locationName);
}

function updateCoordinatesReadout() {
  const nameEl = document.getElementById('active-location-label');
  const coordsEl = document.getElementById('active-coords-label');
  if (nameEl) nameEl.textContent = APP_STATE.locationName;
  if (coordsEl) {
    const ns = APP_STATE.lat >= 0 ? 'N' : 'S';
    const ew = APP_STATE.lon >= 0 ? 'E' : 'W';
    coordsEl.textContent = `${Math.abs(APP_STATE.lat).toFixed(3)}°${ns}, ${Math.abs(APP_STATE.lon).toFixed(3)}°${ew}`;
  }
}

/**
 * Reverse geocodes coordinates via Nominatim OpenStreetMap to display locality name when clicking map
 */
async function reverseGeocodeName(lat, lon) {
  if (!navigator.onLine) return;
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}&zoom=12&accept-language=it`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return;
    const data = await res.json();
    const addr = data.address || {};
    const locality =
      addr.Peak ||
      addr.mountain_pass ||
      addr.village ||
      addr.town ||
      addr.city ||
      addr.municipality ||
      addr.county ||
      data.name;
    if (locality) {
      APP_STATE.locationName = locality;
      updateCoordinatesReadout();
      renderFilteredView();
    }
  } catch (_) {
    // Keep coordinate fallback label if offline or rate-limited
  }
}

/**
 * Forward geocoding search via Nominatim OpenStreetMap API
 */
async function searchCityNominatim(query) {
  const dropdown = document.getElementById('geocode-dropdown');
  if (!query || query.trim().length < 2) {
    dropdown?.classList.add('hidden');
    return;
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
      query.trim()
    )}&limit=5&accept-language=it`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error('Errore Nominatim');
    const results = await res.json();

    if (!Array.isArray(results) || results.length === 0) {
      dropdown.innerHTML = `<li class="geocode-item"><span class="geocode-item-sub">Nessuna località trovata per "${escapeHtml(query)}"</span></li>`;
      dropdown.classList.remove('hidden');
      return;
    }

    dropdown.innerHTML = results
      .map((item) => {
        const parts = (item.display_name || '').split(',');
        const primary = parts[0]?.trim() || item.name || 'Località';
        const secondary = parts.slice(1, 4).join(',').trim();
        return `
          <li class="geocode-item" role="option" data-lat="${item.lat}" data-lon="${item.lon}" data-name="${escapeHtml(primary)}">
            <strong>${escapeHtml(primary)}</strong>
            <span class="geocode-item-sub">${escapeHtml(secondary)} (${Number(item.lat).toFixed(2)}°, ${Number(item.lon).toFixed(2)}°)</span>
          </li>
        `;
      })
      .join('');
    dropdown.classList.remove('hidden');
  } catch (err) {
    showToast('Ricerca città non disponibile offline. Usa la mappa o i preset.');
  }
}

/**
 * Acquires coordinates via browser native navigator.geolocation
 */
function acquireBrowserGPS() {
  if (!('geolocation' in navigator)) {
    showToast('Geolocalizzazione GPS non supportata da questo browser.');
    return;
  }

  const btn = document.getElementById('btn-gps');
  const origHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<span>Ricerca segnale satellitare GPS...</span>`;

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      btn.disabled = false;
      btn.innerHTML = origHtml;
      const { latitude, longitude } = pos.coords;
      showToast('Posizione GPS acquisita con successo!');
      selectCoordinates(latitude, longitude, 'Posizione GPS Attuale');
      reverseGeocodeName(latitude, longitude);
    },
    (err) => {
      btn.disabled = false;
      btn.innerHTML = origHtml;
      let msg = 'Impossibile ottenere il GPS. Usa la mappa o cerca la città.';
      if (err.code === 1) msg = 'Permesso GPS negato. Seleziona il punto sulla mappa.';
      showToast(msg);
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
  );
}

/* ==========================================================================
   6. 7TIMER! ASTRO API INTEGRATION & OFFLINE CACHE
   ========================================================================== */

async function fetchAstroForecast(lat, lon, locationName) {
  const loader = document.getElementById('loading-state');
  const cardsContainer = document.getElementById('forecast-cards-container');
  loader?.classList.remove('hidden');
  if (cardsContainer) cardsContainer.style.opacity = '0.4';

  const endpoint = `https://www.7timer.info/bin/api.pl?lon=${lon.toFixed(4)}&lat=${lat.toFixed(4)}&product=astro&output=json`;

  try {
    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), 11000);

    const response = await fetch(endpoint, { signal: controller.signal });
    clearTimeout(timerId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data || !Array.isArray(data.dataseries)) {
      throw new Error('Formato JSON 7Timer! non valido');
    }

    APP_STATE.raw7TimerData = data;
    APP_STATE.isOfflineData = false;

    // Persist in localStorage for rural/mountain offline access
    try {
      localStorage.setItem(
        STORAGE_KEYS.LAST_FORECAST,
        JSON.stringify({
          timestamp: Date.now(),
          lat,
          lon,
          locationName,
          payload: data
        })
      );
    } catch (_) {}

    processSevenTimerPayload(data);
    updateConnectionBadge();
  } catch (err) {
    console.warn('7Timer! fetch fallito, uso cache offline o simulazione:', err);
    APP_STATE.isOfflineData = true;
    updateConnectionBadge();

    // Try loading last cached forecast from localStorage
    let loadedFromCache = false;
    try {
      const cachedRaw = localStorage.getItem(STORAGE_KEYS.LAST_FORECAST);
      if (cachedRaw) {
        const cached = JSON.parse(cachedRaw);
        if (cached && cached.payload && Array.isArray(cached.payload.dataseries)) {
          APP_STATE.raw7TimerData = cached.payload;
          processSevenTimerPayload(cached.payload);
          loadedFromCache = true;
          showToast('Connessione assente: caricata ultima previsione salvata in cache.');
        }
      }
    } catch (_) {}

    if (!loadedFromCache) {
      const fallback = createFallbackAstroPayload();
      APP_STATE.raw7TimerData = fallback;
      processSevenTimerPayload(fallback);
      showToast('Modalità offline: caricato modello astronomico di backup.');
    }
  } finally {
    loader?.classList.add('hidden');
    if (cardsContainer) cardsContainer.style.opacity = '1';
  }
}

/**
 * Transforms raw 7Timer! `dataseries` into enriched chronological slot objects.
 */
function processSevenTimerPayload(data) {
  const initDate = parseSevenTimerInit(data.init);
  const now = new Date();

  const modelInfoEl = document.getElementById('model-init-info');
  if (modelInfoEl) {
    const statusSuffix = APP_STATE.isOfflineData ? ' (Cache Offline)' : ' (Live API)';
    modelInfoEl.textContent = `Init Run: ${initDate.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })}${statusSuffix}`;
  }

  const enriched = (data.dataseries || []).map((item) => {
    const slotDate = new Date(initDate.getTime() + item.timepoint * 3600 * 1000);
    const localHour = slotDate.getHours();
    const isNight = localHour >= 18 || localHour <= 6;
    const quality = computeAstroScore(item);

    return {
      ...item,
      date: slotDate,
      localHour,
      isNight,
      quality,
      hoursFromNow: Math.round((slotDate.getTime() - now.getTime()) / (3600 * 1000))
    };
  });

  // Keep slots that are not older than 3 hours in the past
  const upcoming = enriched.filter((s) => s.hoursFromNow >= -3);
  APP_STATE.processedSlots = upcoming.length > 0 ? upcoming : enriched;

  renderFilteredView();
}

/* ==========================================================================
   7. FILTERING & UI RENDERING (ADVISOR, KPI, CHART, CARDS)
   ========================================================================== */

function getFilteredSlots() {
  const all = APP_STATE.processedSlots || [];
  if (all.length === 0) return [];

  let filtered = [];

  if (APP_STATE.filterMode === 'tonight') {
    // Next 18 hours, prioritizing twilight & night hours (18:00 - 06:00)
    const withinNextNight = all.slice(0, 9).filter((s) => s.isNight);
    filtered = withinNextNight.length > 0 ? withinNextNight : all.slice(0, 6);
  } else {
    // Filter by horizon slider hours relative to the first available slot
    const baseTimepoint = all[0].timepoint;
    filtered = all.filter((s) => s.timepoint - baseTimepoint < APP_STATE.horizonHours);
  }

  if (APP_STATE.nightOnly) {
    const nightFiltered = filtered.filter((s) => s.isNight);
    if (nightFiltered.length > 0) {
      filtered = nightFiltered;
    }
  }

  return filtered;
}

function renderFilteredView() {
  const slots = getFilteredSlots();
  const advisor = buildAIObservingAdvisor(slots, APP_STATE.locationName);

  renderAdvisorBox(advisor);
  renderKPIStrip(slots);
  renderTrendChart(slots, advisor.bestSlotTimepoint);
  renderForecastCards(slots, advisor.bestSlotTimepoint);
}

function renderAdvisorBox(advisor) {
  const scoreBadge = document.getElementById('advisor-score-badge');
  const headlineEl = document.getElementById('advisor-headline');
  const narrativeEl = document.getElementById('advisor-narrative');
  const targetsEl = document.getElementById('advisor-targets');
  const warningsEl = document.getElementById('advisor-warnings');

  if (scoreBadge) {
    scoreBadge.textContent = `Indice Max: ${advisor.bestScore}/100`;
  }
  if (headlineEl) {
    headlineEl.textContent = advisor.headline;
  }
  if (narrativeEl) {
    narrativeEl.innerHTML = advisor.narrative;
  }
  if (targetsEl) {
    targetsEl.innerHTML = advisor.targets
      .map((t) => `<span class="target-tag">${escapeHtml(t)}</span>`)
      .join('');
  }
  if (warningsEl) {
    warningsEl.innerHTML = advisor.warnings
      .map((w) => `<li><span>${escapeHtml(w)}</span></li>`)
      .join('');
  }
}

function renderKPIStrip(slots) {
  const bestSeeEl = document.getElementById('kpi-best-seeing');
  const bestSeeSub = document.getElementById('kpi-best-seeing-sub');
  const bestTransEl = document.getElementById('kpi-best-trans');
  const bestTransSub = document.getElementById('kpi-best-trans-sub');
  const clearSlotsEl = document.getElementById('kpi-clear-slots');
  const clearSlotsSub = document.getElementById('kpi-clear-slots-sub');
  const windLiEl = document.getElementById('kpi-wind-li');
  const windLiSub = document.getElementById('kpi-wind-li-sub');

  if (!slots || slots.length === 0) return;

  // Best Seeing
  const minSeeSlot = slots.reduce((prev, curr) => (curr.seeing < prev.seeing ? curr : prev), slots[0]);
  const seeDecoded = SEVEN_TIMER_DECODERS.seeing(minSeeSlot.seeing);
  if (bestSeeEl) bestSeeEl.textContent = `Classe ${minSeeSlot.seeing} (${seeDecoded.arcsec})`;
  if (bestSeeSub) bestSeeSub.textContent = `${seeDecoded.badge} • ore ${formatHour(minSeeSlot.date)}`;

  // Best Transparency
  const minTransSlot = slots.reduce(
    (prev, curr) => (curr.transparency < prev.transparency ? curr : prev),
    slots[0]
  );
  const transDecoded = SEVEN_TIMER_DECODERS.transparency(minTransSlot.transparency);
  if (bestTransEl) bestTransEl.textContent = `Classe ${minTransSlot.transparency}`;
  if (bestTransSub) bestTransSub.textContent = `${transDecoded.ext} • ore ${formatHour(minTransSlot.date)}`;

  // Clear Sky Slots count (cloudcover <= 2)
  const clearCount = slots.filter((s) => s.cloudcover <= 2).length;
  if (clearSlotsEl) clearSlotsEl.textContent = `${clearCount} / ${slots.length} slot`;
  if (clearSlotsSub) clearSlotsSub.textContent = `${clearCount * 3}h di cielo sereno (<19%)`;

  // Average / Max Wind & Lifted Index
  const maxWindSlot = slots.reduce(
    (prev, curr) => ((curr.wind10m?.speed || 1) > (prev.wind10m?.speed || 1) ? curr : prev),
    slots[0]
  );
  const windDecoded = SEVEN_TIMER_DECODERS.wind10m(maxWindSlot.wind10m);
  const avgLi = Math.round(
    slots.reduce((acc, s) => acc + (typeof s.lifted_index === 'number' ? s.lifted_index : 2), 0) /
      slots.length
  );
  if (windLiEl) windLiEl.textContent = windDecoded.kmh;
  if (windLiSub) windLiSub.textContent = `Dir. ${windDecoded.dir} • LI medio: ${avgLi > 0 ? '+' + avgLi : avgLi}`;
}

function renderTrendChart(slots, bestTimepoint) {
  const chartEl = document.getElementById('trend-chart');
  if (!chartEl) return;

  if (!slots || slots.length === 0) {
    chartEl.innerHTML = `<p style="font-size:0.78rem; color:var(--text-muted);">Nessun dato da graficare.</p>`;
    return;
  }

  chartEl.innerHTML = slots
    .map((slot) => {
      const { score, semaphore } = slot.quality;
      const colorVar =
        semaphore === 'opt'
          ? 'var(--status-opt-text)'
          : semaphore === 'mid'
          ? 'var(--status-mid-text)'
          : 'var(--status-bad-text)';
      const isBest = slot.timepoint === bestTimepoint;

      return `
        <div class="trend-col" data-target-slot="slot-${slot.timepoint}" title="Ore ${formatHour(slot.date)} — Indice Astro ${score}/100">
          <span class="trend-score-pill" style="color: ${colorVar};">${isBest ? '★' : ''}${score}</span>
          <div class="trend-bar-track" style="${isBest ? 'border: 1px solid var(--status-opt-border);' : ''}">
            <div class="trend-bar-fill" style="height: ${score}%; background: ${colorVar};"></div>
          </div>
          <span class="trend-time">${formatHour(slot.date)}</span>
          <span class="trend-day">${formatShortDay(slot.date)}</span>
        </div>
      `;
    })
    .join('');

  // Click bar to scroll smoothly to its corresponding detailed card
  chartEl.querySelectorAll('.trend-col').forEach((col) => {
    col.addEventListener('click', () => {
      const targetId = col.getAttribute('data-target-slot');
      const card = document.getElementById(targetId);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.style.borderColor = 'var(--accent-cyan)';
        setTimeout(() => {
          card.style.borderColor = '';
        }, 1400);
      }
    });
  });
}

function renderForecastCards(slots, bestTimepoint) {
  const container = document.getElementById('forecast-cards-container');
  const countBadge = document.getElementById('slots-count-badge');
  if (!container) return;

  if (countBadge) {
    countBadge.textContent = `${slots.length} blocchi (${slots.length * 3}h)`;
  }

  if (slots.length === 0) {
    container.innerHTML = `<p style="font-size:0.84rem; color:var(--text-secondary);">Nessuna previsione disponibile per i filtri selezionati.</p>`;
    return;
  }

  container.innerHTML = slots
    .map((slot) => {
      const see = SEVEN_TIMER_DECODERS.seeing(slot.seeing);
      const trans = SEVEN_TIMER_DECODERS.transparency(slot.transparency);
      const cloud = SEVEN_TIMER_DECODERS.cloudcover(slot.cloudcover);
      const wind = SEVEN_TIMER_DECODERS.wind10m(slot.wind10m);
      const li = SEVEN_TIMER_DECODERS.liftedIndex(
        typeof slot.lifted_index === 'number' ? slot.lifted_index : 2
      );

      const isBest = slot.timepoint === bestTimepoint;
      const phaseIcon = slot.isNight ? '🌙' : '☀️';
      const tempStr = typeof slot.temp2m === 'number' ? `${slot.temp2m}°C` : '--°C';
      const rhStr = typeof slot.rh2m === 'number' ? `${slot.rh2m}%` : '--%';

      return `
        <article id="slot-${slot.timepoint}" class="slot-card ${isBest ? 'best-slot' : ''}">
          <div class="slot-top">
            <div class="slot-time-group">
              <span class="slot-phase-icon" aria-hidden="true">${phaseIcon}</span>
              <div>
                <span class="slot-hour">${formatHour(slot.date)} – ${formatHour(new Date(slot.date.getTime() + 3 * 3600 * 1000))}</span>
                <span class="slot-date">${formatFullDate(slot.date)} (+${slot.timepoint}h)</span>
              </div>
            </div>
            <span class="status-badge status-${slot.quality.semaphore}">
              ${isBest ? '★ Top Finestra • ' : ''}${slot.quality.statusText} (${slot.quality.score}/100)
            </span>
          </div>

          <div class="metrics-grid">
            <!-- Seeing -->
            <div class="metric-item">
              <div class="metric-header">
                <span>SEEING (Cl. ${slot.seeing}/8)</span>
                <span class="metric-dot dot-${see.level}"></span>
              </div>
              <span class="metric-val">${see.arcsec}</span>
              <span class="metric-sub">${see.label}</span>
            </div>

            <!-- Cloud Cover -->
            <div class="metric-item">
              <div class="metric-header">
                <span>NUVOLE (Cl. ${slot.cloudcover}/9)</span>
                <span class="metric-dot dot-${cloud.level}"></span>
              </div>
              <span class="metric-val">${cloud.short}</span>
              <span class="metric-sub">${cloud.label}</span>
            </div>

            <!-- Transparency -->
            <div class="metric-item">
              <div class="metric-header">
                <span>TRASPARENZA (Cl. ${slot.transparency}/8)</span>
                <span class="metric-dot dot-${trans.level}"></span>
              </div>
              <span class="metric-val">${trans.ext}</span>
              <span class="metric-sub">${trans.label}</span>
            </div>

            <!-- Wind 10m -->
            <div class="metric-item">
              <div class="metric-header">
                <span>VENTO 10m (${wind.dir})</span>
                <span class="metric-dot dot-${wind.level}"></span>
              </div>
              <span class="metric-val">${wind.kmh}</span>
              <span class="metric-sub">${wind.label} (${wind.ms})</span>
            </div>
          </div>

          <div class="slot-footer">
            <span>⚡ Stabilità LI: <strong style="color: var(--text-primary);">${li.label}</strong></span>
            <span>🌡️ Temp: <strong>${tempStr}</strong> • 💧 UR: <strong>${rhStr}</strong></span>
          </div>
        </article>
      `;
    })
    .join('');
}

/* ==========================================================================
   8. UI CONTROLS & INTERACTION BINDINGS
   ========================================================================== */

function bindUIEvents() {
  // 1. GPS Button
  document.getElementById('btn-gps')?.addEventListener('click', acquireBrowserGPS);

  // 2. City Geocoding Search Form & Live Debounced Input
  const searchForm = document.getElementById('search-form');
  const searchInput = document.getElementById('city-search-input');
  const dropdown = document.getElementById('geocode-dropdown');

  let debounceTimer = null;
  searchInput?.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    const val = searchInput.value;
    if (val.trim().length < 3) {
      dropdown?.classList.add('hidden');
      return;
    }
    debounceTimer = setTimeout(() => searchCityNominatim(val), 420);
  });

  searchForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    clearTimeout(debounceTimer);
    searchCityNominatim(searchInput?.value || '');
  });

  dropdown?.addEventListener('click', (e) => {
    const item = e.target.closest('.geocode-item');
    if (!item || !item.hasAttribute('data-lat')) return;
    const lat = parseFloat(item.getAttribute('data-lat'));
    const lon = parseFloat(item.getAttribute('data-lon'));
    const name = item.getAttribute('data-name') || 'Località';
    dropdown.classList.add('hidden');
    if (searchInput) searchInput.value = name;
    selectCoordinates(lat, lon, name);
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#search-form')) {
      dropdown?.classList.add('hidden');
    }
  });

  // 3. Preset Location Chips
  document.querySelectorAll('.preset-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const lat = parseFloat(chip.getAttribute('data-lat'));
      const lon = parseFloat(chip.getAttribute('data-lon'));
      const name = chip.getAttribute('data-name');
      selectCoordinates(lat, lon, name);
    });
  });

  // 4. Time Filter Pills & Horizon Slider
  const filterPills = document.querySelectorAll('.filter-pill');
  const slider = document.getElementById('horizon-slider');
  const sliderLabel = document.getElementById('slider-horizon-val');

  filterPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      filterPills.forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');

      const mode = pill.getAttribute('data-mode');
      if (mode === 'tonight') {
        APP_STATE.filterMode = 'tonight';
        if (sliderLabel) sliderLabel.textContent = 'Stasera / Notte (18:00–06:00)';
      } else {
        APP_STATE.filterMode = 'hours';
        const hrs = parseInt(pill.getAttribute('data-hours') || '24', 10);
        APP_STATE.horizonHours = hrs;
        if (slider) slider.value = String(hrs);
        if (sliderLabel) sliderLabel.textContent = `Prossime ${hrs} ore`;
      }
      renderFilteredView();
    });
  });

  slider?.addEventListener('input', () => {
    const hrs = parseInt(slider.value, 10);
    APP_STATE.filterMode = 'hours';
    APP_STATE.horizonHours = hrs;
    if (sliderLabel) sliderLabel.textContent = `Prossime ${hrs} ore`;

    filterPills.forEach((p) => {
      const pillHrs = parseInt(p.getAttribute('data-hours') || '0', 10);
      p.classList.toggle('active', pillHrs === hrs);
    });

    renderFilteredView();
  });

  // 5. Night-Only Checkbox
  const nightCheckbox = document.getElementById('toggle-night-only');
  nightCheckbox?.addEventListener('change', () => {
    APP_STATE.nightOnly = nightCheckbox.checked;
    renderFilteredView();
  });

  // 6. Red Night-Vision Mode Toggle
  const nightBtn = document.getElementById('btn-night-vision');
  nightBtn?.addEventListener('click', () => {
    const isRed = document.body.classList.toggle('red-night-mode');
    nightBtn.classList.toggle('active-red', isRed);
    try {
      localStorage.setItem(STORAGE_KEYS.RED_NIGHT_MODE, isRed ? '1' : '0');
    } catch (_) {}
    showToast(
      isRed
        ? 'Modalità Visione Notturna Rossa attivata (protezione pupilla).'
        : 'Modalità Deep Space standard ripristinata.'
    );
  });

  // 7. Refresh Forecast Button
  document.getElementById('btn-refresh')?.addEventListener('click', () => {
    showToast('Aggiornamento dati da 7Timer! in corso...');
    fetchAstroForecast(APP_STATE.lat, APP_STATE.lon, APP_STATE.locationName);
  });

  updateCoordinatesReadout();
}

/* ==========================================================================
   9. UTILITY HELPERS
   ========================================================================== */

function formatHour(date) {
  return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
}

function formatShortDay(date) {
  return date.toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit' });
}

function formatFullDate(date) {
  return date.toLocaleDateString('it-IT', { weekday: 'short', day: '2-digit', month: 'short' });
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

let toastTimeout = null;
function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 3200);
}
