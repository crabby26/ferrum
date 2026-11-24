/* =========================================================
   Ferrum – Service Worker, macht die App offline-fähig.

   WICHTIG BEI JEDEM UPDATE:
   Erhöhe die Versionsnummer unten (z. B. 2.0.0 → 2.0.1).
   Nur dann merkt das iPhone, dass es neue Dateien gibt.
   Deine Daten (IndexedDB) sind davon NICHT betroffen.
   ========================================================= */
const VERSION = '2.0.0';
const CACHE = 'ferrum-' + VERSION;

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/utils.js',
  './js/db.js',
  './js/data.js',
  './js/charts.js',
  './js/scanner.js',
  './js/nutrition.js',
  './js/training.js',
  './js/progress.js',
  './js/settings.js',
  './js/app.js',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Antworten ohne Weiterleitungs-Markierung speichern (Safari verlangt das)
async function clean(res) {
  if (!res.redirected) return res;
  const body = await res.blob();
  return new Response(body, { status: res.status, statusText: res.statusText, headers: res.headers });
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(ASSETS.map(async url => {
      const res = await fetch(new Request(url, { cache: 'reload' }));
      if (!res.ok) throw new Error('Konnte nicht laden: ' + url);
      await cache.put(url, await clean(res));
    }));
    // Beim allerersten Start sofort aktiv werden
    const clientsList = await self.clients.matchAll();
    if (!clientsList.length) await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => (k.startsWith('ferrum-') || k.startsWith('gymfuel-')) && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Open Food Facts usw. direkt übers Netz

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    if (req.mode === 'navigate') {
      const shell = await cache.match('./index.html');
      if (shell) return shell;
    }
    try {
      return await fetch(req);
    } catch (e) {
      if (req.mode === 'navigate') {
        const shell = await cache.match('./');
        if (shell) return shell;
      }
      throw e;
    }
  })());
});
