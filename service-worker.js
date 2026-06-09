// HDT Dosing – Service Worker
// Ziele:
// - Offline nutzbar bleiben
// - Neue Releases über version.json/Assets aktualisieren
// - Lokale Nutzerdaten (localStorage) niemals anfassen

const CACHE_PREFIX = 'hdt-dosing-';
const CACHE_NAME = 'hdt-dosing-runtime-v10';

const CORE_URLS = [
  './',
  './index.html',
  './app.js',
  './i18n.js',
  './pwa-update.js',
  './styles.css',
  './theme-2026.css',
  './version.json',
  './materials.json',
  './creator-names.json',
  './manifest.json',
  './install.js',
  './logo.png',
  './favicon.ico',
  './favicon.png'
];

const DEFAULT_RELEASE_ASSETS = [
  ...CORE_URLS,
  './icon-192x192.png',
  './icon-512x512.png',
  './html2pdf.bundle.js'
];

function reply(event, payload) {
  try {
    if (event.ports && event.ports[0]) event.ports[0].postMessage(payload);
  } catch (_) {}
}

function normalizeAssetUrl(asset) {
  try {
    return new URL(asset, self.location).toString();
  } catch (_) {
    return null;
  }
}

async function fetchJsonNoStore(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return await res.json();
}

async function getReleaseAssets(meta) {
  const assetsFromMeta = Array.isArray(meta?.assets)
    ? meta.assets
    : (meta?.cache && Array.isArray(meta.cache.assets) ? meta.cache.assets : null);

  if (assetsFromMeta && assetsFromMeta.length) return assetsFromMeta;

  try {
    const versionMeta = await fetchJsonNoStore('./version.json?sw=' + Date.now());
    if (Array.isArray(versionMeta?.assets) && versionMeta.assets.length) return versionMeta.assets;
    if (versionMeta?.cache && Array.isArray(versionMeta.cache.assets) && versionMeta.cache.assets.length) return versionMeta.cache.assets;
  } catch (_) {}

  return DEFAULT_RELEASE_ASSETS;
}

async function cacheUrls(urls) {
  const cache = await caches.open(CACHE_NAME);
  const uniqueUrls = [...new Set((urls || []).map(normalizeAssetUrl).filter(Boolean))];

  await Promise.allSettled(uniqueUrls.map(async (url) => {
    const req = new Request(url, { cache: 'reload' });
    const res = await fetch(req);
    if (res && res.ok) await cache.put(url, res.clone());
  }));

  return uniqueUrls.length;
}

async function warmRelease(meta) {
  const assets = await getReleaseAssets(meta);
  const count = await cacheUrls(assets);
  return { ok: true, cached: count };
}

async function deleteOldCaches() {
  const keys = await caches.keys();
  await Promise.all(keys
    .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
    .map((key) => caches.delete(key)));
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    await deleteOldCaches();
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  const data = event.data || {};

  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    reply(event, { ok: true });
    return;
  }

  if (data.type === 'CACHE_RELEASE' || data.type === 'PREFETCH_FULL') {
    event.waitUntil(
      warmRelease(data.meta)
        .then((result) => reply(event, result))
        .catch((error) => reply(event, { ok: false, error: error && error.message ? error.message : String(error) }))
    );
    return;
  }

  if (data.type === 'CLEAR_RELEASE_CACHES') {
    event.waitUntil(
      deleteOldCaches()
        .then(() => reply(event, { ok: true }))
        .catch((error) => reply(event, { ok: false, error: error && error.message ? error.message : String(error) }))
    );
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // version.json und manifest.json müssen frisch sein, damit Netlify-Releases zuverlässig erkannt werden.
  if (url.pathname.endsWith('/version.json') || url.pathname.endsWith('/manifest.json')) {
    event.respondWith(
      fetch(req, { cache: 'no-store' })
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // HTML-Navigation: online immer frisch, offline aus Cache.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req, { cache: 'no-store' })
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', clone));
          return res;
        })
        .catch(() => caches.match('./index.html').then((cached) => cached || caches.match('./')))
    );
    return;
  }

  const isCriticalAsset = [
    '/app.js',
    '/i18n.js',
    '/pwa-update.js',
    '/styles.css',
    '/theme-2026.css',
    '/install.js',
    '/materials.json',
    '/creator-names.json',
    '/html2pdf.bundle.js'
  ].some((suffix) => url.pathname.endsWith(suffix));

  if (isCriticalAsset) {
    event.respondWith(
      fetch(req, { cache: 'no-store' })
        .then((res) => {
          if (res && res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Sonstige Assets: Cache zuerst, parallel aktualisieren.
  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req)
        .then((res) => {
          if (res && res.ok) {
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
