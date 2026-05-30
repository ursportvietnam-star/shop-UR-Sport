const CACHE_VERSION = 'ursport-v2'; // Bumped version for clean start
const APP_SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const MAX_RUNTIME_ITEMS = 100;

const APP_SHELL = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.webmanifest',
  '/robots.txt',
  '/llms.txt',
];

// Helper to limit cache size (FIFO)
async function trimCache(cacheName, maxItems) {
  try {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxItems) {
      // Delete the oldest entry (FIFO)
      await cache.delete(keys[0]);
      // Recursive call to clean up if needed
      await trimCache(cacheName, maxItems);
    }
  } catch (error) {
    console.error('Error trimming cache:', error);
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(APP_SHELL_CACHE)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key !== APP_SHELL_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const requestUrl = new URL(request.url);
  // Only cache origin assets
  if (requestUrl.origin !== self.location.origin) return;

  // Don't cache admin page APIs or pages
  if (requestUrl.pathname.startsWith('/api') || requestUrl.pathname.startsWith('/admin')) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(APP_SHELL_CACHE).then((cache) => cache.put('/index.html', copy));
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  if (request.destination === 'script' || request.destination === 'style' || request.destination === 'image' || request.destination === 'font') {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;

        return fetch(request).then((response) => {
          if (!response || response.status !== 200) return response;
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, copy);
            // Limit cache sizes
            trimCache(RUNTIME_CACHE, MAX_RUNTIME_ITEMS);
          });
          return response;
        });
      })
    );
  }
});
