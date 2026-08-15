const SHELL_VER = 'swether-shell-v3';
const ASSETS_VER = 'swether-assets-v4';
const ALL_CACHES = [SHELL_VER, ASSETS_VER];

const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

// 全部遊戲資源（背景預熱用，安裝後自動快取，確保離線也能玩）
const GAME_ASSETS = [
  './images/cover.jpg',
  './images/intro.jpg',
  './images/K1.jpg',
  './images/K2.jpg',
  './images/K3.jpg',
  './images/bg0.jpg',
  './images/bg1.jpg',
  './images/bg2.jpg',
  './images/bg3.jpg',
  './images/btn_leve1_locked.png',
  './images/btn_leve2_locked.png',
  './images/btn_leve3_locked.png',
  './images/btn_start_locked.png',
  './images/result1.jpg',
  './images/result2.jpg',
  './images/result3.jpg',
  './sounds/bgm.mp3',
  './sounds/click.mp3',
  './sounds/catch.mp3',
  './sounds/wrong.mp3',
  './sounds/bad.mp3',
  './sounds/good.mp3',
  './sounds/perfect.mp3',
  './sounds/normal.mp3',
  './sounds/ended.mp3',
  './sounds/cheer.mp3',
  './sounds/cheer_go.mp3',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_VER)
      .then(cache => cache.addAll(SHELL_FILES))
      .then(() => {
        // 背景預熱遊戲資源（不阻擋 SW 安裝）
        caches.open(ASSETS_VER).then(cache => {
          GAME_ASSETS.forEach(url => {
            fetch(url).then(res => {
              if (res.ok) cache.put(url, res);
            }).catch(() => {});
          });
        });
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => !ALL_CACHES.includes(k)).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET') return;

  // 同源的圖片和音效：cache-first
  if (url.origin === self.location.origin &&
      (url.pathname.startsWith('/images/') || url.pathname.startsWith('/sounds/'))) {
    event.respondWith(cacheFirst(ASSETS_VER, request));
    return;
  }

  // 舊版 GitHub CDN（相容）：cache-first
  if (url.hostname === 'raw.githubusercontent.com') {
    event.respondWith(cacheFirst(ASSETS_VER, request));
    return;
  }

  // 殼層（HTML、manifest、icons）：stale-while-revalidate
  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(SHELL_VER, request));
  }
});

async function cacheFirst(cacheName, request) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(request, res.clone());
    return res;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

async function staleWhileRevalidate(cacheName, request) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then(res => { if (res.ok) cache.put(request, res.clone()); return res; })
    .catch(() => null);
  return cached ?? await fetchPromise;
}
