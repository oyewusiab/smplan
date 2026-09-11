// Ward Bulletin - Dedicated Route Service Worker
// Scoped strictly to /visitbulletin/

const CACHE_NAME = 'ward-bulletin-shell-v2';
const PRECACHE_ASSETS = [
  '/visitbulletin',
  '/visitbulletin/manifest.json',
  '/bulletin_icon.png',
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

// ─── Push & Notification Handlers ─────────────────────────────────────────────

// Push Event: Triggered by Web Push Notifications even when app is closed
self.addEventListener('push', (event) => {
  let data = {
    title: 'Ward Bulletin',
    body: 'New update from your ward',
    icon: '/visitbulletin/icons/icon-192.png',
    badge: '/visitbulletin/icons/icon-192.png',
    url: '/visitbulletin',
    tag: 'ward-bulletin-notification',
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = Object.assign(data, parsed);
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const notificationOptions = {
    body: data.body,
    icon: data.icon || '/visitbulletin/icons/icon-192.png',
    badge: data.badge || '/visitbulletin/icons/icon-192.png',
    data: {
      url: data.url || '/visitbulletin',
      dateOfArrival: Date.now(),
      category: data.category || 'general',
    },
    vibrate: [100, 50, 100, 50, 100],
    tag: data.tag || 'ward-bulletin-notification',
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, notificationOptions)
  );
});

// Notification Click Event: Focus existing window or open bulletin
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = (event.notification.data && event.notification.data.url) || '/visitbulletin';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a window is already open, focus it
      for (const client of windowClients) {
        if (client.url && client.url.includes('/visitbulletin') && 'focus' in client) {
          if ('navigate' in client && urlToOpen !== '/visitbulletin') {
            client.navigate(urlToOpen);
          }
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
