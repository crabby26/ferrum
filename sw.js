/* =========================================================
   Ferrum – Service Worker, macht die App offline-fähig.

   WICHTIG BEI JEDEM UPDATE:
   Erhöhe die Versionsnummer unten (z. B. 2.0.0 → 2.0.1).
   Nur dann merkt das iPhone, dass es neue Dateien gibt.
   Deine Daten (IndexedDB) sind davon NICHT betroffen.
   ========================================================= */
const VERSION = '4.0.0';
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
  if (event.data && event.data.type === 'TEST_PUSH') event.waitUntil(showMorning());
});

/* =========================================================
   Morgen-Mitteilung
   GitHub schickt um 7 Uhr nur ein leeres Signal. Welcher Tag im
   Split dran ist, berechnet dieser Code direkt auf dem iPhone aus
   den eigenen Trainingsdaten – nichts davon verlässt das Gerät.
   ========================================================= */
function readStores(names) {
  return new Promise(resolve => {
    let req;
    try { req = indexedDB.open('ferrum'); } catch (e) { resolve(null); return; }
    // Gibt es die Datenbank noch nicht, nichts anlegen (sonst wäre sie für die App kaputt)
    req.onupgradeneeded = () => { req.transaction.abort(); };
    req.onerror = () => resolve(null);
    req.onsuccess = () => {
      const db = req.result;
      const out = {};
      const avail = names.filter(n => db.objectStoreNames.contains(n));
      if (!avail.length) { db.close(); resolve(out); return; }
      const tx = db.transaction(avail, 'readonly');
      avail.forEach(n => {
        const r = tx.objectStore(n).getAll();
        r.onsuccess = () => { out[n] = r.result || []; };
      });
      tx.oncomplete = () => { db.close(); resolve(out); };
      tx.onerror = () => { db.close(); resolve(out); };
    };
  });
}

function localKey(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

async function morningMessage() {
  const fallback = { title: 'Guten Morgen 💪', body: 'Öffne Ferrum, um deinen Tag zu planen.' };
  const data = await readStores(['templates', 'workouts', 'exercises']);
  if (!data) return fallback;
  const tpls = (data.templates || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
  const ws = (data.workouts || []).slice().sort((a, b) => b.start - a.start);
  if (!tpls.length) return fallback;
  if (ws.some(w => w.date === localKey(new Date()))) {
    return { title: 'Heute schon trainiert ✅', body: 'Stark! Denk an genug Protein und Wasser.' };
  }
  const last = ws.find(w => w.templateId && tpls.some(t => t.id === w.templateId));
  const next = last ? tpls[(tpls.findIndex(t => t.id === last.templateId) + 1) % tpls.length] : tpls[0];
  const names = (next.exercises || []).map(x => {
    const e = (data.exercises || []).find(ex => ex.id === x.exId);
    return e ? e.name : null;
  }).filter(Boolean);
  const body = names.length
    ? names.slice(0, 4).join(', ') + (names.length > 4 ? ` und ${names.length - 4} weitere` : '')
    : 'Tippe, um das Workout zu starten.';
  return { title: `Heute ist ${next.name}-Tag 💪`, body };
}

async function showMorning() {
  const m = await morningMessage();
  return self.registration.showNotification(m.title, {
    body: m.body,
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    tag: 'ferrum-morning',
    data: { url: './' }
  });
}

self.addEventListener('push', event => {
  // iOS verlangt, dass jedes Signal eine sichtbare Mitteilung erzeugt
  event.waitUntil(showMorning());
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of list) { if ('focus' in c) return c.focus(); }
    return self.clients.openWindow('./');
  })());
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
