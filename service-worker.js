
self.addEventListener("install", event => {
  self.skipWaiting(); // Neue Version sofort aktiv
});

self.addEventListener("activate", event => {
  event.waitUntil(clients.claim()); // Kontrolle übernehmen
});

self.addEventListener("fetch", event => {
  event.respondWith(
    fetch(event.request)
      .then(response => response)
      .catch(() => caches.match(event.request))
  );
});
