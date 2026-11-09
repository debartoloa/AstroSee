/**
 * ============================================================================
 * AstroSee — Service Worker (sw.js)
 * Offline-First for App Shell + Network-First with Cache Fallback for 7Timer!
 * ============================================================================
 */

const STATIC_CACHE_NAME = 'astrosee-static-v1';
const DATA_CACHE_NAME = 'astrosee-data-v1';

const APP_SHELL_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icon.svg',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
];

// Install: Cache App Shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => {
            if (key !== STATIC_CACHE_NAME && key !== DATA_CACHE_NAME) {
              return caches.delete(key);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch: Network-First for 7Timer! & Nominatim API, Cache-First for Static Assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // 1. Handle 7Timer!, Local Proxy, Open-Meteo & Nominatim Geocoding (Network-First -> Cache Fallback)
  if (
    url.pathname === '/api/7timer' ||
    url.hostname.includes('7timer.info') ||
    url.hostname.includes('open-meteo.com') ||
    url.hostname.includes('nominatim.openstreetmap.org')
  ) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const cloned = networkResponse.clone();
            caches.open(DATA_CACHE_NAME).then((cache) => {
              cache.put(request, cloned);
              // Also store under a generic latest-forecast key for 7Timer! so any coordinate query can fallback offline
              if (url.hostname.includes('7timer.info')) {
                cache.put('https://www.7timer.info/latest-cached-astro', networkResponse.clone());
              }
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          const cache = await caches.open(DATA_CACHE_NAME);
          const exactMatch = await cache.match(request);
          if (exactMatch) return exactMatch;
          if (url.hostname.includes('7timer.info')) {
            const latestAstro = await cache.match('https://www.7timer.info/latest-cached-astro');
            if (latestAstro) return latestAstro;
          }
          return new Response(JSON.stringify({ error: 'offline' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }

  // 2. Handle OpenStreetMap Tiles (Stale-While-Revalidate)
  if (url.hostname.includes('tile.openstreetmap.org')) {
    event.respondWith(
      caches.open(DATA_CACHE_NAME).then(async (cache) => {
        const cachedTile = await cache.match(request);
        const networkFetch = fetch(request)
          .then((res) => {
            if (res && res.status === 200) {
              cache.put(request, res.clone());
            }
            return res;
          })
          .catch(() => cachedTile);
        return cachedTile || networkFetch;
      })
    );
    return;
  }

  // 3. Default App Shell Strategy (Cache-First with Network Fallback)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const cloned = networkResponse.clone();
          caches.open(STATIC_CACHE_NAME).then((cache) => cache.put(request, cloned));
        }
        return networkResponse;
      });
    })
  );
});
