# AstroSee — Architettura Tecnica

## Moduli JavaScript (ES6 Native Modules)
- `js/app.js`: Controller principale dell'interfaccia, mappa Leaflet, filtri temporali, rendering grafici/card e **AI Observing Advisor**.
- `js/api.js`: Livello di accesso alle API esterne con strategia resiliente anti-CORS a cascata:
  1. Proxy locale (`/api/7timer` tramite `server.js`)
  2. Chiamata diretta `7timer.info` (`product=astro`)
  3. Conversione live da telemetria Open-Meteo GFS/IFS alle classi 7Timer!
  4. Calcolo della **Scala Bortle (1–9)** tramite Open-Meteo Elevation + Nominatim Reverse Geocoding.
- `js/storage.js`: Persistenza client-side su `localStorage` per ultima posizione, ultima previsione valida offline e stato `Red Night-Vision Mode`.

## Service Worker (`sw.js`)
- **App Shell (HTML/CSS/JS):** Strategia *Network-First* con fallback offline su cache (`astrosee-static-v6`).
- **API & Map Tiles:** Strategia *Network-First* per dati meteorologici/geocoding e *Stale-While-Revalidate* per i tile OpenStreetMap.
