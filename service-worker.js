
self.addEventListener("install", event => {
  self.skipWaiting();
});
self.addEventListener("activate", event => {
  event.waitUntil(clients.claim());
});
self.addEventListener("fetch", event => {
  event.respondWith(
    fetch(event.request).then(r => r).catch(() => caches.match(event.request))
  );
});
