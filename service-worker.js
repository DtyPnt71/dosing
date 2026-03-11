// HDT Dosing – Service Worker
// Ziel:
// - Offline nutzbar (Core-Shell ist gecached)
// - Updates kontrolliert anbieten: neue Version wird erkannt, aber erst nach Bestätigung aktiviert

// Static cache name: normal releases are versioned through version.json.
// This way you only need to update version.json instead of editing multiple files.
const CACHE_NAME = 'dosing-cache-core-v2';

// Minimaler Offline-Shell (damit App immer startet)
const CORE_URLS = [
  './',
  './index.html',
  './app.js',
  './styles.css',
  './style.css',
  './version.json',
  './materials.json',
  './creator-names.json',
  './manifest.json',
  './install.js',
  './service-worker.js',
  './logo.png',
  './icon-192x192.png',
  './icon-512x512.png',
  './favicon.ico',
  './favicon.png'
];

// Optionales Prefetch (erst nach Nutzerbestätigung)
const FULL_URLS = [
  ...CORE_URLS,
  './html2pdf.bundle.js'
];

self.addEventListener('install', (event) => {
  // Kein skipWaiting() hier – die App soll Updates zuerst anbieten.
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_URLS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }
  if (data.type === 'PREFETCH_FULL') {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => cache.addAll(FULL_URLS)).catch(() => {})
    );
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Update-Check soll frisch sein (wenn online), aber offline weiter funktionieren.
  if (url.pathname.endsWith('/version.json')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Maintenance flag lives in manifest.json.
  // If this is served stale, the app will only enter maintenance after a restart.
  // Therefore: network-first (like version.json) with cache fallback.
  if (url.pathname.endsWith('/manifest.json')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Navigationsrequests: Netz zuerst, fallback Cache (offline)
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }


  // Kritische App-Skripte immer bevorzugt aus dem Netz laden, damit neue
  // HTML-Struktur und neues JS nicht gegeneinander laufen.
  // Genau dieser Mismatch konnte dazu führen, dass neue Felder sichtbar waren,
  // aber die zugehörige Logik/Event-Handler noch aus einer alten app.js kamen.
  const isCriticalAsset = [
    '/app.js',
    '/styles.css',
    '/style.css',
    '/html2pdf.bundle.js',
    '/creator-names.json',
    '/materials.json'
  ].some((suffix) => url.pathname.endsWith(suffix));

  if (isCriticalAsset) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (req.method === 'GET' && res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Für sonstige Assets: Stale-while-revalidate
  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req)
        .then((res) => {
          if (req.method === 'GET' && res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return res;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});
