/* =========================================================
   Ferrum – Service Worker, macht die App offline-fähig.

   WICHTIG BEI JEDEM UPDATE:
   Erhöhe die Versionsnummer unten (z. B. 2.0.0 → 2.0.1).
   Nur dann merkt das iPhone, dass es neue Dateien gibt.
   Deine Daten (IndexedDB) sind davon NICHT betroffen.
   ========================================================= */
const VERSION = '6.1.0';
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
  './js/foodpro.js',
  './js/training.js',
  './js/import.js',
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
  if (event.data && event.data.type === 'TEST_PUSH') event.waitUntil(showMessage(event.data.kind || 'day'));
});

/* =========================================================
   Mitteilungen
   GitHub schickt nur ein Signal mit der Art der Mitteilung:
     weigh   – 7 Uhr: Erinnerung zum Wiegen
     day     – 8 Uhr: heutiger Trainingstag + Tagesziele
     checkin – Sonntag 18 Uhr: Wochen-Check-in
   Der Inhalt wird hier direkt auf dem iPhone aus den eigenen Daten
   berechnet – nichts davon verlässt das Gerät.
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
function addDays(key, n) {
  const [y, m, d] = key.split('-').map(Number);
  return localKey(new Date(y, m - 1, d + n, 12));
}
function weekday(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12).getDay();
}
const fmt = (x, dec = 0) => Number(x).toLocaleString('de-DE', { maximumFractionDigits: dec });
const WD = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

function settingsOf(data) {
  const kv = (data.kv || []).find(x => x.id === 'settings');
  return (kv && kv.value) || {};
}

// Gleiche Logik wie in der App: Wochenplan, sonst Rotation
function planFor(data, key) {
  const st = settingsOf(data);
  const tpls = (data.templates || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
  if (!tpls.length) return { none: true };
  const sch = st.schedule;
  if (sch && sch.on) {
    const id = sch.days && sch.days[weekday(key)];
    const t = id && id !== 'rest' && tpls.find(x => x.id === id);
    if (t) return { tpl: t };
    for (let i = 1; i <= 7; i++) {
      const k = addDays(key, i);
      const nid = sch.days && sch.days[weekday(k)];
      const nt = nid && nid !== 'rest' && tpls.find(x => x.id === nid);
      if (nt) return { rest: true, next: nt, inDays: i, nextKey: k };
    }
    return { rest: true };
  }
  const ws = (data.workouts || []).slice().sort((a, b) => b.start - a.start);
  const last = ws.find(w => w.templateId && tpls.some(t => t.id === w.templateId));
  return { tpl: last ? tpls[(tpls.findIndex(t => t.id === last.templateId) + 1) % tpls.length] : tpls[0] };
}

async function buildMessage(type) {
  const data = await readStores(['kv', 'templates', 'workouts', 'exercises', 'entries', 'weights']);
  const today = localKey(new Date());
  if (!data) return { title: 'Ferrum', body: 'Öffne Ferrum, um deinen Tag zu planen.', go: 'today' };
  const st = settingsOf(data);
  // App-Modus: Ernährung, Training oder beides
  const mode = st.mode === 'food' || st.mode === 'train' ? st.mode : 'both';

  if (type === 'weigh') {
    const ws = (data.weights || []).slice().sort((a, b) => (a.id < b.id ? -1 : 1));
    if (ws.some(w => w.id === today)) return { title: 'Gewicht schon eingetragen ✅', body: 'Stark, dass du dranbleibst.', go: 'today' };
    const last = ws[ws.length - 1];
    return {
      title: 'Guten Morgen ⚖️',
      body: 'Zeit zum Wiegen: nach dem Aufstehen, vor dem Frühstück.' + (last ? ` Zuletzt ${fmt(last.kg, 1)} kg.` : ''),
      go: 'weigh'
    };
  }

  if (type === 'checkin') {
    const start = addDays(today, -6);
    const wos = (data.workouts || []).filter(w => w.date >= start && w.date <= today).length;
    const days = {};
    (data.entries || []).filter(e => e.date >= start && e.date <= today).forEach(e => {
      days[e.date] = (days[e.date] || 0) + (e.food.kcal || 0) * (e.grams || 0) / 100;
    });
    const n = Object.keys(days).length;
    const avg = n ? Object.values(days).reduce((a, b) => a + b, 0) / n : 0;
    // geglätteter Gewichtstrend (wie in der App)
    const ws = (data.weights || []).slice().sort((a, b) => (a.id < b.id ? -1 : 1));
    let t = null, prev = null, tThen = null;
    ws.forEach(w => {
      if (t == null) t = w.kg;
      else { const gap = Math.max(1, Math.round((new Date(w.id) - new Date(prev)) / 864e5)); t += (1 - Math.pow(0.9, gap)) * (w.kg - t); }
      prev = w.id;
      if (w.id <= addDays(today, -7)) tThen = t;
    });
    const parts = [];
    if (mode !== 'food') parts.push(`${wos} ${wos === 1 ? 'Workout' : 'Workouts'}`);
    if (n && mode !== 'train') parts.push(`Ø ${fmt(avg)} kcal`);
    if (t != null && tThen != null) { const d = t - tThen; parts.push(`Gewicht ${d > 0 ? '+' : ''}${fmt(d, 1)} kg`); }
    return { title: 'Dein Wochen-Check-in 📊', body: (parts.length ? parts.join(', ') + '. ' : '') + 'Tippe für die Auswertung.', go: 'checkin' };
  }

  // type === 'day'
  const p = planFor(data, today);
  const trained = (data.workouts || []).some(w => w.date === today);
  // Tagesziel: an Trainingstagen mehr, an Ruhetagen weniger (wie in der App)
  let kcal = +st.kcal || 0;
  const planned = !!(st.schedule && st.schedule.on && p.tpl);
  if (st.cycle && st.cycle.on && mode === 'both') kcal += (trained || planned) ? (+st.cycle.train || 0) : -(+st.cycle.rest || 0);
  // Nur Ernährung: nur die Tagesziele
  if (mode === 'food') {
    return { title: 'Guten Morgen ☀️', body: `Dein Ziel heute: ${fmt(kcal)} kcal, ${fmt(st.protein || 0)} g Protein, ${fmt(st.carbs || 0)} g Kohlenhydrate, ${fmt(st.fat || 0)} g Fett.`, go: 'today' };
  }
  const goal = mode === 'train' ? '' : `Ziel: ${fmt(kcal)} kcal, ${fmt(st.protein || 0)} g Protein.`;
  const join = (...a) => a.filter(Boolean).join(' ');
  if (trained) return { title: 'Heute schon trainiert ✅', body: goal || 'Stark! Gönn dir die Erholung.', go: 'today' };
  if (p.none) return { title: 'Guten Morgen 💪', body: goal || 'Öffne Ferrum, um dein Training zu planen.', go: 'today' };
  if (p.rest) {
    const nxt = p.next ? (p.inDays === 1 ? `Morgen: ${p.next.name}.` : `${WD[weekday(p.nextKey)]}: ${p.next.name}.`) : '';
    return { title: 'Heute Ruhetag 😌', body: join(goal, nxt) || 'Erholung gehört zum Muskelaufbau.', go: 'today' };
  }
  const names = (p.tpl.exercises || []).map(x => {
    const e = (data.exercises || []).find(ex => ex.id === x.exId);
    return e ? e.name : null;
  }).filter(Boolean);
  const ex = names.length ? names.slice(0, 3).join(', ') + (names.length > 3 ? ` und ${names.length - 3} weitere.` : '.') : '';
  return { title: `Heute: ${p.tpl.name} 💪`, body: join(goal, ex) || 'Tippe, um das Workout zu starten.', go: 'today' };
}

async function showMessage(type) {
  const m = await buildMessage(type);
  return self.registration.showNotification(m.title, {
    body: m.body,
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    tag: 'ferrum-' + type,
    data: { go: m.go }
  });
}

self.addEventListener('push', event => {
  let type = 'day';
  try {
    const d = event.data ? event.data.json() : {};
    if (d.type === 'weigh' || d.type === 'checkin' || d.type === 'day') type = d.type;
  } catch (e) { /* ältere Signale ohne Inhalt → Tages-Mitteilung */ }
  // iOS verlangt, dass jedes Signal eine sichtbare Mitteilung erzeugt
  event.waitUntil(showMessage(type));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const go = (event.notification.data && event.notification.data.go) || 'today';
  event.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of list) {
      if ('focus' in c) { await c.focus(); c.postMessage({ type: 'GO', go }); return; }
    }
    return self.clients.openWindow('./?go=' + go);
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
