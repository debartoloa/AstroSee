# Changelog

Tutte le modifiche rilevanti a **AstroSee** sono documentate in questo file secondo lo standard [Keep a Changelog](https://keepachangelog.com/it/1.0.0/) e il [Semantic Versioning](https://semver.org/lang/it/).

---

## [1.0.0] - 2026-11-14

### Added
- **PWA Mobile-First & Offline-Ready:** Struttura completa con `manifest.json`, icona vettoriale SVG (`assets/icons/icon.svg`) e Service Worker (`sw.js`) con strategia *Network-First* per l'App Shell e fallback su cache/LocalStorage per l'ultima previsione scaricata.
- **Design System Deep Space Glassmorphism:** Interfaccia dark-mode nativa con pannelli in vetro smerigliato (`backdrop-filter`), gradienti cosmici e **Modalità Visione Notturna Rossa** (`Red Night-Vision Mode`) per preservare l'adattamento scotopico della pupilla sul campo.
- **Triplo Sistema di Input Posizione:**
  - Acquisizione coordinate tramite **GPS nativo** (`navigator.geolocation`).
  - **Mappa interattiva Leaflet.js** in tema scuro con selezione tramite click/pin trascinabile e *reverse-geocoding* automatico.
  - **Ricerca Geocoding (Nominatim / OpenStreetMap)** con menu autocomplete e preset rapidi (*Asiago*, *Gran Sasso*, *Monte Etna*, *La Palma*).
- **Classificazione Scala Bortle (1–9) & SQM:** Calcolo automatico della qualità del buio del cielo e dell'altitudine (via Open-Meteo Elevation + Nominatim) con badge colorato e stima in `mag/arcsec²`.
- **Motore Previsionale 7Timer! (`product=astro`) & Fallback Live GFS:**
  - Decodifica completa di `seeing` (classi 1–8 in secondi d'arco), `transparency` (classi 1–8 in mag/airmass), `cloudcover` (1–9), `wind10m` e `lifted_index`.
  - Architettura resiliente a 4 livelli (Proxy locale Node `server.js` -> Chiamata diretta 7Timer! -> Telemetria Live GFS/IFS CORS-friendly -> Cache Offline).
- **Finestra Temporale Flessibile:** Filtri rapidi (*Stasera / Notte*, *24h*, *48h*, *72h*), slider orizzonte da `+6h` a `+72h` e toggle *Solo fasce notturne*.
- **AI Observing Advisor:** Analisi automatica della finestra osservativa migliore, indice composito 0–100 con semafori, target astronomici consigliati (in base a Seeing, Trasparenza e Bortle) e avvisi su vento, nubi, instabilità atmosferica e rischio condensa (>80% UR).
- **Grafico Interattivo & Card 3-Ore:** Curva di qualità osservativa con barre cliccabili per navigare rapidamente agli slot orari dettagliati.
- **Documentazione & Versioning:** Aggiunti `README.md`, `CHANGELOG.md` e `.gitignore` conformi agli standard di repository.
