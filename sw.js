const SHELL_VER = 'swether-shell-v1';
const ASSETS_VER = 'swether-assets-v1';
const ALL_CACHES = [SHELL_VER, ASSETS_VER];

const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

// Pre-cache shell on install
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_VER)
      .then(cache => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});

// Clean up old caches on activate
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => !ALL_CACHES.includes(k))
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // GitHub CDN assets (images & sounds): cache-first, then network
  if (url.hostname === 'raw.githubusercontent.com') {
    event.respondWith(
      caches.open(ASSETS_VER).then(async cache => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const res = await fetch(request);
          if (res.ok) cache.put(request, res.clone());
          return res;
        } catch {
          return new Response('Network error', { status: 503 });
        }
      })
    );
    return;
  }

  // Shell files: stale-while-revalidate (instant load + background refresh)
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.open(SHELL_VER).then(async cache => {
        const cached = await cache.match(request);
        const fetchPromise = fetch(request)
          .then(res => {
            if (res.ok) cache.put(request, res.clone());
            return res;
          })
          .catch(() => null);
        return cached ?? await fetchPromise;
      })
    );
  }
});
