const APP_CACHE = 'police-ohio-app-v1';
const RUNTIME_CACHE = 'police-ohio-runtime-v1';
const OFFLINE_FALLBACK = ['/offline', '/favorites', '/recent'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(APP_CACHE).then((cache) => cache.addAll(OFFLINE_FALLBACK)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => ![APP_CACHE, RUNTIME_CACHE].includes(key)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          const clone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(async () => {
          if (event.request.mode === 'navigate') {
            return (await caches.match('/offline')) || Response.error();
          }
          return Response.error();
        });
    }),
  );
});

self.addEventListener('sync', (event) => {
  if (event.tag !== 'offline-sync') return;

  event.waitUntil(
    fetch('/api/offline/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ triggeredBy: 'service-worker-sync' }),
    }).catch(() => null),
  );
});
