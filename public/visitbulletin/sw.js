// Ward Bulletin - Dedicated Route Service Worker
// Scoped strictly to /visitbulletin/

const CACHE_NAME = 'ward-bulletin-shell-v1';
const PRECACHE_ASSETS = [
  '/visitbulletin',
  '/visitbulletin/manifest.json',
  '/visitbulletin/icons/icon-192.png',
  '/visitbulletin/icons/icon-512.png',
];

// Install: Cache essential shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[WardBulletin-SW] Precache skipped for some assets:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate: Clean up old bulletin caches and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key.startsWith('ward-bulletin-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Never intercept or cache live bulletin API calls
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // 1. Completely bypass caching for all API / backend / script execution calls
  // This guarantees live bulletins are NEVER stale
  if (
    request.method !== 'GET' ||
    url.pathname.includes('/api/') ||
    url.hostname.includes('script.google.com') ||
    url.hostname.includes('googleapis.com') ||
    url.searchParams.has('forceRefresh') ||
    url.searchParams.has('t')
  ) {
    return; // Pass through directly to network
  }

  // 2. For navigation requests inside /visitbulletin, use Network-First with cache fallback
  if (request.mode === 'navigate' && url.pathname.startsWith('/visitbulletin')) {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match('/visitbulletin').then((cached) => {
          return cached || caches.match(request);
        });
      })
    );
    return;
  }

  // 3. For bulletin static assets (icons, manifest, local static assets)
  if (url.pathname.startsWith('/visitbulletin/')) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // Pass through any other requests
});
