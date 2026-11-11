const CACHE_NAME = 'quran-cognitive-os-v2';
const PRECACHE_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/icons/icon-192x192.svg',
  '/icons/icon-512x512.svg',
  '/fonts/UthmanicHafs1_Ver09.woff2',
  '/fonts/UthmanTN1_Ver10.woff2',
  '/fonts/UthmanTN1B_Ver10.woff2',
  '/fonts/AmiriQuran-Regular.woff2',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  // Cache-first for fonts and static assets, Network-first / Stale-while-revalidate for navigation
  const url = new URL(request.url);

  if (
    url.origin === self.origin &&
    (url.pathname.startsWith('/_next/static/') ||
     url.pathname.startsWith('/fonts/') ||
     url.pathname.startsWith('/icons/') ||
     url.pathname.startsWith('/sherpa-wasm/') ||
     url.pathname.startsWith('/models/'))
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // Cache-first for Quran word-by-word pronunciation audio from audio.qurancdn.com
  if (url.hostname === 'audio.qurancdn.com') {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        }).catch(() => {
          return new Response(new Uint8Array(0), { status: 404, statusText: 'Offline audio not cached' });
        });
      })
    );
    return;
  }

  // Stale-while-revalidate for page navigation and API requests
  event.respondWith(
    caches.match(request).then((cached) => {
      const networked = fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const cacheCopy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, cacheCopy));
          }
          return response;
        })
        .catch(() => {
          // If offline and not in cache, fallback to root if navigation
          if (request.mode === 'navigate') {
            return caches.match('/');
          }
        });

      return cached || networked;
    })
  );
});
