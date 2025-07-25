// Name des Caches mit Versionsnummer, damit alte Caches entfernt werden können
const CACHE_NAME = 'dosing-cache-v1';

// Dateien, die beim Installieren vorab im Cache gespeichert werden
const urlsToCache = [
  '/',
  '/index.html',
  '/app.js',
  '/styles.css',
  '/style.css',
  '/manifest.json',
  '/install.js',
  '/service-worker.js',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/favicon.ico'
];

// Beim Installieren alle Ressourcen cachen
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    }).then(() => self.skipWaiting())
  );
});

// Alte Caches löschen und neuen aktivieren
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Netzwerk‑First, Fallback auf Cache
self.addEventListener('fetch', event => {
  // Bei Navigationsanfragen immer erst aus dem Netz laden
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }
  // Für andere Anfragen: Netz vor Cache
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const respClone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, respClone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});