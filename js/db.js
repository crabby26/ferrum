/* =========================================================
   db.js – Speicherung in IndexedDB + App-Zustand im Speicher
   Alles wird beim Start einmal geladen (S = State) und bei jeder
   Änderung sofort in IndexedDB geschrieben.
   ========================================================= */
'use strict';

const DB = {
  NAME: 'ferrum',
  OLD_NAME: 'gymfuel', // Name vor der Umbenennung – Daten werden einmalig übernommen
  VERSION: 1,
  STORES: ['kv', 'foods', 'entries', 'water', 'workouts', 'exercises', 'templates', 'weights'],
  db: null,
  fresh: false,

  open() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) { reject(new Error('IndexedDB wird nicht unterstützt')); return; }
      const req = indexedDB.open(DB.NAME, DB.VERSION);
      req.onupgradeneeded = e => {
        const db = req.result;
        if (e.oldVersion === 0) DB.fresh = true;
        DB.STORES.forEach(s => {
          if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: 'id' });
        });
      };
      req.onsuccess = () => {
        DB.db = req.result;
        DB.db.onversionchange = () => { DB.db.close(); location.reload(); };
        resolve();
      };
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('Datenbank ist blockiert – App neu starten'));
    });
  },

  _tx(store, mode, fn) {
    return new Promise((resolve, reject) => {
      const tx = DB.db.transaction(store, mode);
      const os = tx.objectStore(store);
      let result;
      const r = fn(os);
      if (r && 'onsuccess' in r) r.onsuccess = () => { result = r.result; };
      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('Abgebrochen'));
    });
  },
  all(store) { return DB._tx(store, 'readonly', os => os.getAll()); },
  put(store, obj) { return DB._tx(store, 'readwrite', os => os.put(obj)); },
  del(store, id) { return DB._tx(store, 'readwrite', os => os.delete(id)); },
  clear(store) { return DB._tx(store, 'readwrite', os => os.clear()); },
  putMany(store, arr) {
    return DB._tx(store, 'readwrite', os => { arr.forEach(o => os.put(o)); return null; });
  },

  // Alte Datenbank (vor der Umbenennung) in die neue kopieren. Die alte bleibt als Sicherheit erhalten.
  async migrateOld() {
    const old = await new Promise(resolve => {
      let created = false;
      let req;
      try { req = indexedDB.open(DB.OLD_NAME); } catch (e) { resolve(null); return; }
      req.onupgradeneeded = () => { created = true; };
      req.onsuccess = () => {
        const db = req.result;
        if (created) { db.close(); indexedDB.deleteDatabase(DB.OLD_NAME); resolve(null); } else resolve(db);
      };
      req.onerror = () => resolve(null);
    });
    if (!old) return 0;
    let n = 0;
    for (const s of DB.STORES) {
      if (!old.objectStoreNames.contains(s)) continue;
      const items = await new Promise(resolve => {
        const r = old.transaction(s, 'readonly').objectStore(s).getAll();
        r.onsuccess = () => resolve(r.result || []);
        r.onerror = () => resolve([]);
      });
      if (items.length) { await DB.putMany(s, items); n += items.length; }
    }
    old.close();
    return n;
  }
};

/* ---------- Ziele berechnen (Mifflin-St-Jeor) ---------- */
function calcGoals(p) {
  const weight = +p.weight || 70, height = +p.height || 175, age = +p.age || 25;
  const bmr = 10 * weight + 6.25 * height - 5 * age + (p.sex === 'f' ? -161 : 5);
  const tdee = p.tdeeOverride > 0 ? p.tdeeOverride : bmr * (+p.activity || 1.55);
  const adj = p.goal === 'bulk' ? 300 : p.goal === 'cut' ? -500 : 0;
  const kcal = Math.round((tdee + adj) / 10) * 10;
  const pPerKg = p.goal === 'cut' ? 2.2 : p.goal === 'bulk' ? 2.0 : 1.8;
  const protein = Math.round(weight * pPerKg);
  const fat = Math.round(Math.max(kcal * 0.25 / 9, weight * 0.8));
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { bmr: Math.round(bmr), tdee: Math.round(tdee), kcal, protein, carbs, fat };
}

function defaultSettings() {
  const base = { height: 181, weight: 72, age: 25, sex: 'm', activity: 1.55, goal: 'bulk' };
  const g = calcGoals(base);
  return Object.assign(base, {
    kcal: g.kcal, protein: g.protein, carbs: g.carbs, fat: g.fat,
    waterGoal: 3000, glass: 250,
    rest: 120, sound: true, haptics: true, bar: 20
  });
}

/* ---------- Zustand ---------- */
const S = {
  settings: null,
  meta: null,
  active: null,      // laufendes Workout
  foods: [],         // eigene Lebensmittel & Rezepte
  entries: [],       // Ernährungstagebuch
  water: [],         // { id: Datum, ml }
  workouts: [],      // abgeschlossene Workouts
  exercises: [],
  templates: [],
  weights: []        // { id: Datum, kg }
};

const LIST_STORES = ['foods', 'entries', 'water', 'workouts', 'exercises', 'templates', 'weights'];

const Store = {
  async load() {
    await DB.open();
    if (DB.fresh) {
      try { await DB.migrateOld(); } catch (e) { console.warn('Übernahme alter Daten fehlgeschlagen', e); }
    }
    for (const s of LIST_STORES) S[s] = (await DB.all(s)) || [];
    const kv = (await DB.all('kv')) || [];
    const get = id => { const x = kv.find(k => k.id === id); return x ? x.value : null; };
    S.settings = Object.assign(defaultSettings(), get('settings') || {});
    S.meta = Object.assign({ installedAt: Date.now(), lastBackup: null, favs: [], recents: [], seeded: false }, get('meta') || {});
    S.active = get('active');

    if (!get('settings')) Store.saveKV('settings');
    if (!S.meta.seeded) {
      // Erster Start: Standard-Übungen und Push/Pull/Legs anlegen
      if (!S.exercises.length) {
        S.exercises = DEFAULT_EXERCISES.map(e => Object.assign({}, e));
        await DB.putMany('exercises', S.exercises);
      }
      if (!S.templates.length) {
        S.templates = DEFAULT_TEMPLATES.map(t => JSON.parse(JSON.stringify(t)));
        await DB.putMany('templates', S.templates);
      }
      S.meta.seeded = true;
      Store.saveKV('meta');
    }
  },

  put(store, obj) {
    const arr = S[store];
    const i = arr.findIndex(x => x.id === obj.id);
    if (i >= 0) arr[i] = obj; else arr.push(obj);
    return DB.put(store, obj).catch(Store.fail);
  },
  del(store, id) {
    S[store] = S[store].filter(x => x.id !== id);
    return DB.del(store, id).catch(Store.fail);
  },
  saveKV(id) {
    const v = S[id];
    if (v == null) return DB.del('kv', id).catch(Store.fail);
    return DB.put('kv', { id, value: v }).catch(Store.fail);
  },
  fail(err) {
    console.error(err);
    U.toast('Speichern fehlgeschlagen: ' + (err && err.message ? err.message : err), 'err');
  },

  /* ---------- Backup ---------- */
  exportData() {
    const data = {};
    LIST_STORES.forEach(s => { data[s] = S[s]; });
    data.kv = [
      { id: 'settings', value: S.settings },
      { id: 'meta', value: Object.assign({}, S.meta) },
      { id: 'active', value: S.active }
    ];
    return { app: 'ferrum', format: 1, exportedAt: new Date().toISOString(), data };
  },
  isBackup(obj) {
    // Sicherungen aus der Zeit vor der Umbenennung („gymfuel“) bleiben gültig
    return !!(obj && (obj.app === 'ferrum' || obj.app === 'gymfuel') && obj.data);
  },
  async importData(obj) {
    if (!Store.isBackup(obj)) throw new Error('Das ist keine Ferrum-Sicherung.');
    const d = obj.data;
    for (const s of LIST_STORES) {
      if (d[s] && !Array.isArray(d[s])) throw new Error('Sicherung beschädigt (' + s + ').');
    }
    for (const s of DB.STORES) await DB.clear(s);
    for (const s of LIST_STORES) {
      const arr = (d[s] || []).filter(x => x && x.id != null);
      if (arr.length) await DB.putMany(s, arr);
    }
    const kv = (d.kv || []).filter(x => x && x.id && x.value != null);
    if (kv.length) await DB.putMany('kv', kv);
  },
  async wipe() {
    for (const s of DB.STORES) await DB.clear(s);
    try { indexedDB.deleteDatabase(DB.OLD_NAME); } catch (e) { /* egal */ }
  }
};
