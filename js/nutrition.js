/* =========================================================
   nutrition.js – Ernährungstagebuch, Lebensmittelsuche,
   Open Food Facts, eigene Lebensmittel, Rezepte, Wasser
   ========================================================= */
'use strict';

const MEALS = [
  { id: 'breakfast', name: 'Frühstück' },
  { id: 'lunch', name: 'Mittagessen' },
  { id: 'dinner', name: 'Abendessen' },
  { id: 'snacks', name: 'Snacks' }
];
const mealName = id => (MEALS.find(m => m.id === id) || {}).name || id;

const OFF_FIELDS = 'code,product_name,product_name_de,generic_name,brands,nutriments,serving_quantity,serving_size';

const Nutri = {
  day: U.today(),
  offCache: new Map(),

  /* ---------- Rechnen ---------- */
  calc(food, grams) {
    const k = (grams || 0) / 100;
    return { kcal: (food.kcal || 0) * k, p: (food.p || 0) * k, c: (food.c || 0) * k, f: (food.f || 0) * k };
  },
  dayEntries(day) { return S.entries.filter(e => e.date === day).sort((a, b) => (a.t || 0) - (b.t || 0)); },
  sum(entries) {
    const t = { kcal: 0, p: 0, c: 0, f: 0 };
    entries.forEach(e => { const v = Nutri.calc(e.food, e.grams); t.kcal += v.kcal; t.p += v.p; t.c += v.c; t.f += v.f; });
    return t;
  },
  totals(day) { return Nutri.sum(Nutri.dayEntries(day)); },
  g(x) { return U.n(x, x < 10 ? 1 : 0); },
  macroInline(v) {
    return `<span class="macros-inline"><span><i class="dot p"></i>${Nutri.g(v.p)} g</span><span><i class="dot c"></i>${Nutri.g(v.c)} g</span><span><i class="dot f"></i>${Nutri.g(v.f)} g</span></span>`;
  },
  amountLabel(e) {
    if (e.food && e.food.src === 'quick') return 'Schnell-Eintrag';
    if (e.unit) return `${U.n(e.qty, 2)} × ${U.esc(e.unit.n)} (${U.n(e.grams)} g)`;
    return `${U.n(e.grams)} g`;
  },
  snapshot(f) {
    const o = { id: f.id, name: f.name, brand: f.brand || '', kcal: +f.kcal || 0, p: +f.p || 0, c: +f.c || 0, f: +f.f || 0, units: (f.units || []).map(u => ({ n: u.n, g: +u.g })), src: f.src || 'custom' };
    if (f.barcode) o.barcode = f.barcode;
    return o;
  },

  /* ---------- Streak: Tage in Folge mit Einträgen ---------- */
  streak() {
    const days = new Set(S.entries.map(e => e.date));
    let d = U.today();
    if (!days.has(d)) d = U.addDays(d, -1); // heute zählt erst, wenn etwas eingetragen ist
    let n = 0;
    while (days.has(d)) { n++; d = U.addDays(d, -1); }
    return { n, today: days.has(U.today()) };
  },

  /* ---------- Wasser ---------- */
  water(day) { const w = S.water.find(x => x.id === day); return w ? w.ml : 0; },
  addWater(day, delta) {
    const ml = Math.max(0, Nutri.water(day) + delta);
    Store.put('water', { id: day, ml });
  },
  waterCard(day) {
    const ml = Nutri.water(day);
    const goal = S.settings.waterGoal || 3000;
    const glass = S.settings.glass || 250;
    const pct = U.clamp(ml / goal * 100, 0, 100);
    return `<div class="card">
      <div class="water">
        <div style="flex:1;min-width:0">
          <div class="card-sub">Wasser</div>
          <div class="water-num">${U.n(ml / 1000, 2)} <small>/ ${U.n(goal / 1000, 1)} l</small></div>
        </div>
        <button class="icon-btn" data-act="water" data-day="${day}" data-d="-1" aria-label="${glass} ml entfernen">${U.icon.minus}</button>
        <button class="icon-btn water-plus" data-act="water" data-day="${day}" data-d="1" aria-label="${glass} ml hinzufügen">${U.icon.plus}</button>
      </div>
      <div class="bar" style="margin-top:14px"><i style="width:${pct}%;background:var(--water)"></i></div>
    </div>`;
  },

  /* ---------- Favoriten & zuletzt verwendet ---------- */
  isFav(id) { return S.meta.favs.some(f => f.id === id); },
  toggleFav(food) {
    if (Nutri.isFav(food.id)) S.meta.favs = S.meta.favs.filter(f => f.id !== food.id);
    else S.meta.favs.unshift(Nutri.snapshot(food));
    Store.saveKV('meta');
  },
  pushRecent(food, qty, unitName) {
    const s = Nutri.snapshot(food);
    s.lastQty = qty; s.lastUnit = unitName || null;
    S.meta.recents = [s].concat(S.meta.recents.filter(f => f.id !== food.id)).slice(0, 40);
    Store.saveKV('meta');
  },

  /* ---------- Ansicht ---------- */
  render() {
    const el = $('#view-food');
    const day = Nutri.day;
    const st = S.settings;
    const tot = Nutri.totals(day);
    const rest = st.kcal - tot.kcal;
    const bar = (v, goal, color) => `<div class="bar"><i style="width:${U.clamp(goal ? v / goal * 100 : 0, 0, 100)}%;background:${color}"></i></div>`;

    let meals = '';
    MEALS.forEach(m => {
      const list = Nutri.dayEntries(day).filter(e => e.meal === m.id);
      const t = Nutri.sum(list);
      meals += `<div class="meal">
        <div class="meal-head">
          <div class="t"><b>${m.name}</b><div>${U.n(t.kcal)} kcal</div></div>
          <button class="icon-btn plain" data-act="copy-meal" data-meal="${m.id}" aria-label="Von gestern kopieren">${U.icon.copy}</button>
          <button class="icon-btn accent" data-act="add-food" data-meal="${m.id}" aria-label="Hinzufügen">${U.icon.plus}</button>
        </div>
        ${list.map(e => {
          const v = Nutri.calc(e.food, e.grams);
          return `<button class="list-item" data-act="edit-entry" data-id="${e.id}">
            <div class="li-main"><div class="li-title">${U.esc(e.food.name)}</div>
            <div class="li-sub">${Nutri.amountLabel(e)}</div></div>
            <div class="li-end"><div class="big">${U.n(v.kcal)}</div><div class="small">kcal</div></div>
          </button>`;
        }).join('')}
      </div>`;
    });

    el.innerHTML = `
      <div class="page-head"><h1 class="page-title">Ernährung</h1></div>
      <div class="day-nav">
        <button class="icon-btn" data-act="day" data-d="-1" aria-label="Vorheriger Tag">${U.icon.left}</button>
        <label class="day-label">${U.fmtDay(day)}
          <input type="date" id="food-date" value="${day}" max="${U.today()}" aria-label="Datum wählen">
        </label>
        <button class="icon-btn" data-act="day" data-d="1" ${day >= U.today() ? 'disabled style="opacity:.3"' : ''} aria-label="Nächster Tag">${U.icon.right}</button>
      </div>
      <div class="sum-card">
        <div class="sum-top">
          <div class="sum-kcal">${U.n(tot.kcal)} <small>/ ${U.n(st.kcal)} kcal</small></div>
          <div class="sum-rest">${rest >= 0 ? 'übrig' : 'über Ziel'}<b style="color:${rest >= 0 ? 'var(--text)' : 'var(--over)'}">${U.n(Math.abs(rest))}</b></div>
        </div>
        ${bar(tot.kcal, st.kcal, tot.kcal > st.kcal * 1.05 ? 'var(--over)' : 'var(--accent)')}
        <div class="macro-bars">
          <div><div class="mb-label">Protein <b>${U.n(tot.p)}/${st.protein}</b></div>${bar(tot.p, st.protein, 'var(--prot)')}</div>
          <div><div class="mb-label">Kohlenh. <b>${U.n(tot.c)}/${st.carbs}</b></div>${bar(tot.c, st.carbs, 'var(--carb)')}</div>
          <div><div class="mb-label">Fett <b>${U.n(tot.f)}/${st.fat}</b></div>${bar(tot.f, st.fat, 'var(--fat)')}</div>
        </div>
      </div>
      ${meals}
      ${Nutri.waterCard(day)}
    `;
    const di = $('#food-date', el);
    di.addEventListener('change', () => {
      if (di.value) { Nutri.day = di.value > U.today() ? U.today() : di.value; Nutri.render(); }
    });
  },

  copyMeal(meal) {
    const day = Nutri.day;
    const prev = U.addDays(day, -1);
    const src = S.entries.filter(e => e.date === prev && e.meal === meal);
    if (!src.length) { U.toast(`Gestern gab es keine Einträge bei ${mealName(meal)}`); return; }
    const now = Date.now();
    src.forEach((e, i) => {
      Store.put('entries', Object.assign(JSON.parse(JSON.stringify(e)), { id: U.uid(), date: day, t: now + i }));
    });
    U.toast(`${src.length} ${src.length === 1 ? 'Eintrag' : 'Einträge'} von gestern kopiert`, 'ok');
    App.refresh();
  },

  /* ---------- Lebensmittel-Auswahl ---------- */
  openPicker(ctx) {
    const title = ctx.mode === 'pick' ? 'Zutat wählen' : mealName(ctx.meal);
    const sh = U.sheet({
      title, full: true,
      body: `
        <div class="search-bar">
          <input class="input" id="pk-q" type="search" placeholder="Lebensmittel suchen" autocomplete="off" autocorrect="off" enterkeyhint="search">
          <button class="icon-btn accent" id="pk-scan" aria-label="Barcode scannen">${U.icon.barcode}</button>
        </div>
        <div id="pk-top"></div>
        <div id="pk-list"></div>`
    });
    const st = { tab: S.meta.recents.length ? 'recent' : 'basic', q: '', shown: [], online: null, oState: 'idle', token: 0 };
    const q = sh.$('#pk-q');

    const item = (f, i) => {
      const sub = [f.brand, `${U.n(f.kcal)} kcal / 100 g`].filter(Boolean).map(U.esc).join(', ');
      const badge = f.src === 'recipe' ? '<span class="src-badge">Rezept</span>' : f.src === 'custom' ? '<span class="src-badge">Eigenes</span>' : '';
      return `<button class="list-item" data-i="${i}">
        <div class="li-main"><div class="li-title">${U.esc(f.name)}${badge}</div><div class="li-sub">${sub}</div></div>
        ${Nutri.isFav(f.id) ? `<span style="color:var(--accent);width:18px">${U.icon.star.replace('<svg', '<svg style="width:18px;height:18px;fill:currentColor"')}</span>` : ''}
        ${U.icon.chevron}
      </button>`;
    };
    const listHTML = (arr, empty) => {
      if (!arr.length) return `<div class="empty">${empty}</div>`;
      return '<div class="list">' + arr.map(f => { st.shown.push(f); return item(f, st.shown.length - 1); }).join('') + '</div>';
    };

    const drawTop = () => {
      if (st.q) { sh.$('#pk-top').innerHTML = ''; return; }
      const tabs = [['recent', 'Zuletzt'], ['fav', 'Favoriten'], ['mine', 'Meine'], ['basic', 'Basics']];
      sh.$('#pk-top').innerHTML = `
        <div class="seg">${tabs.map(t => `<button data-tab="${t[0]}" class="${st.tab === t[0] ? 'on' : ''}">${t[1]}</button>`).join('')}</div>
        <div class="chips" style="margin-bottom:12px">
          ${ctx.mode === 'pick' ? '' : '<button class="chip" data-a="quick">Schnell eintragen</button>'}
          <button class="chip" data-a="manual">Barcode eintippen</button>
          <button class="chip" data-a="new-food">+ Eigenes Lebensmittel</button>
          ${ctx.mode === 'pick' ? '' : '<button class="chip" data-a="new-recipe">+ Rezept</button>'}
        </div>`;
    };

    const drawList = () => {
      st.shown = [];
      let html = '';
      if (!st.q) {
        if (st.tab === 'recent') html = listHTML(S.meta.recents, 'Noch nichts verwendet. Suche oben nach einem Lebensmittel oder scanne einen Barcode.');
        else if (st.tab === 'fav') html = listHTML(S.meta.favs, 'Noch keine Favoriten. Tippe beim Lebensmittel auf den Stern.');
        else if (st.tab === 'mine') {
          const mine = S.foods.filter(f => ctx.mode !== 'pick' || f.id !== ctx.excludeId).slice().sort((a, b) => a.name.localeCompare(b.name, 'de'));
          html = listHTML(mine, 'Lege eigene Lebensmittel oder Rezepte über die Knöpfe oben an.');
        } else {
          const cats = [];
          BASIC_FOODS.forEach(f => { if (!cats.includes(f.cat)) cats.push(f.cat); });
          cats.forEach(c => {
            html += `<div class="section-title" style="margin-top:16px;font-size:16px">${U.esc(c)}</div>` + listHTML(BASIC_FOODS.filter(f => f.cat === c), '');
          });
        }
      } else {
        const local = Nutri.localSearch(st.q, ctx.excludeId);
        html += listHTML(local.slice(0, 30), 'Keine Treffer in deinen Lebensmitteln.');
        html += '<div class="section-title" style="font-size:16px;margin-top:18px">Open Food Facts</div>';
        if (st.q.trim().length < 3) html += '<div class="empty">Mindestens 3 Zeichen für die Online-Suche.</div>';
        else if (st.oState === 'loading') html += '<div class="loading"><span class="spinner"></span>Suche online …</div>';
        else if (st.oState === 'error') html += `<div class="empty">${st.oErr || 'Online-Suche fehlgeschlagen.'}<br><button class="btn small" style="margin-top:10px" data-a="retry">Erneut versuchen</button></div>`;
        else if (st.oState === 'done') html += listHTML(st.online || [], 'Nichts gefunden. Lege das Lebensmittel selbst an.');
      }
      sh.$('#pk-list').innerHTML = html;
    };

    const runOnline = async () => {
      const term = st.q.trim();
      if (term.length < 3 || sh.closed) return;
      const token = ++st.token;
      if (Nutri.offCache.has(term.toLowerCase())) {
        st.online = Nutri.offCache.get(term.toLowerCase()); st.oState = 'done'; drawList(); return;
      }
      st.oState = 'loading'; drawList();
      try {
        const res = await Nutri.searchOFF(term);
        if (token !== st.token) return;
        Nutri.offCache.set(term.toLowerCase(), res);
        st.online = res; st.oState = 'done';
      } catch (e) {
        if (token !== st.token) return;
        st.oState = 'error';
        st.oErr = navigator.onLine === false ? 'Du bist offline. Die eingebaute Liste und deine eigenen Lebensmittel funktionieren trotzdem.' : 'Open Food Facts antwortet gerade nicht. Warte kurz und versuche es dann erneut.';
      }
      if (!sh.closed) drawList();
    };
    const runOnlineDebounced = U.debounce(runOnline, 850);

    q.addEventListener('input', () => {
      st.q = q.value;
      st.token++;
      st.oState = st.q.trim().length >= 3 ? 'loading' : 'idle';
      drawTop(); drawList();
      runOnlineDebounced();
    });
    q.addEventListener('keydown', e => { if (e.key === 'Enter') { q.blur(); runOnline(); } });

    const pickFood = f => Nutri.openFood(f, Object.assign({}, ctx, {
      picker: sh,
      after: () => { if (!sh.closed) drawList(); }
    }));

    sh.body.addEventListener('click', e => {
      const t = e.target.closest('[data-tab],[data-i],[data-a]');
      if (!t) return;
      if (t.dataset.tab) { st.tab = t.dataset.tab; drawTop(); drawList(); return; }
      if (t.dataset.i != null) { pickFood(st.shown[+t.dataset.i]); return; }
      const a = t.dataset.a;
      if (a === 'retry') runOnline();
      if (a === 'quick') Nutri.quickAdd(ctx);
      if (a === 'manual') Scanner.manual(code => Nutri.lookupBarcode(code, { ...ctx, picker: sh, after: () => { if (!sh.closed) drawList(); } }));
      if (a === 'new-food') Nutri.customFoodForm(null, { onSaved: f => { drawList(); pickFood(f); } });
      if (a === 'new-recipe') { Nutri.recipeEditor(null, { onSaved: () => { st.tab = 'mine'; drawTop(); drawList(); } }); }
    });
    sh.$('#pk-scan').onclick = () => {
      Scanner.open(code => Nutri.lookupBarcode(code, { ...ctx, picker: sh, after: () => { if (!sh.closed) drawList(); } }));
    };

    drawTop(); drawList();
    return sh;
  },

  localSearch(q, excludeId) {
    const terms = U.norm(q).split(/\s+/).filter(Boolean);
    if (!terms.length) return [];
    const seen = new Set();
    const pool = [].concat(S.foods, S.meta.favs, S.meta.recents, BASIC_FOODS);
    const out = [];
    pool.forEach(f => {
      if (!f || seen.has(f.id) || f.id === excludeId) return;
      seen.add(f.id);
      const hay = U.norm(f.name + ' ' + (f.brand || ''));
      if (!terms.every(t => hay.includes(t))) return;
      let score = 0;
      if (U.norm(f.name).startsWith(terms[0])) score += 3;
      if (f.src === 'custom' || f.src === 'recipe') score += 2;
      if (Nutri.isFav(f.id)) score += 2;
      if (S.meta.recents.some(r => r.id === f.id)) score += 1;
      out.push({ f, score });
    });
    return out.sort((a, b) => b.score - a.score || a.f.name.length - b.f.name.length).map(x => x.f);
  },

  /* ---------- Open Food Facts ---------- */
  async fetchJSON(url, ms = 15000) {
    const ctrl = window.AbortController ? new AbortController() : null;
    const timer = setTimeout(() => ctrl && ctrl.abort(), ms);
    try {
      const r = await fetch(url, ctrl ? { signal: ctrl.signal } : {});
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } finally { clearTimeout(timer); }
  },

  offToFood(p) {
    if (!p) return null;
    const n = p.nutriments || {};
    let kcal = n['energy-kcal_100g'];
    if ((kcal == null || kcal === '') && n['energy_100g'] != null) kcal = n['energy_100g'] / 4.184;
    if (kcal == null || kcal === '' || isNaN(+kcal)) return null;
    const name = (p.product_name_de || p.product_name || p.generic_name || '').trim();
    if (!name) return null;
    const units = [];
    const sq = parseFloat(p.serving_quantity);
    if (sq > 0 && sq < 2000) {
      units.push({ n: 'Portion', g: Math.round(sq * 10) / 10 });
    }
    return {
      id: 'off:' + p.code,
      name,
      brand: (p.brands || '').split(',')[0].trim(),
      kcal: Math.round(+kcal * 10) / 10,
      p: Math.round((+n.proteins_100g || 0) * 10) / 10,
      c: Math.round((+n.carbohydrates_100g || 0) * 10) / 10,
      f: Math.round((+n.fat_100g || 0) * 10) / 10,
      units,
      src: 'off',
      barcode: String(p.code || '')
    };
  },

  // Eine einzige Anfrage (Open Food Facts erlaubt nur ca. 10 Suchen pro Minute);
  // in Deutschland verkaufte Produkte werden danach nach oben sortiert.
  async searchOFF(term) {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(term)}&search_simple=1&action=process&json=1&page_size=40&sort_by=unique_scans_n&lc=de&fields=${OFF_FIELDS},countries_tags`;
    const j = await Nutri.fetchJSON(url);
    const seen = new Set();
    const de = [], other = [];
    (j.products || []).forEach(p => {
      const f = Nutri.offToFood(p);
      if (!f || seen.has(f.id)) return;
      seen.add(f.id);
      ((p.countries_tags || []).includes('en:germany') ? de : other).push(f);
    });
    return de.concat(other);
  },

  async lookupBarcode(code, ctx) {
    code = String(code).replace(/\D/g, '');
    const local = S.foods.find(f => f.barcode === code) ||
      S.meta.favs.find(f => f.barcode === code) || S.meta.recents.find(f => f.barcode === code);
    if (local) { Nutri.openFood(local, ctx); return; }
    U.toast('Suche Barcode ' + code + ' …');
    try {
      const j = await Nutri.fetchJSON(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=${OFF_FIELDS}`);
      const p = j && j.status === 1 ? j.product : null;
      if (p) p.code = p.code || code;
      const food = Nutri.offToFood(p);
      if (food) { Nutri.openFood(food, ctx); return; }
      Nutri.notFound(code, p ? (p.product_name_de || p.product_name || '') : '', ctx);
    } catch (e) {
      Nutri.notFound(code, '', ctx, navigator.onLine === false || e.name === 'AbortError' || e instanceof TypeError);
    }
  },

  notFound(code, name, ctx, offline) {
    const sh = U.sheet({
      title: offline ? 'Keine Verbindung' : 'Produkt nicht gefunden',
      body: `<p style="color:var(--muted);margin:4px 2px 18px">${offline
        ? 'Die Online-Datenbank ist gerade nicht erreichbar. Du kannst das Produkt selbst anlegen – der Barcode wird gespeichert.'
        : `Zum Barcode <b class="num" style="color:var(--text)">${U.esc(code)}</b> gibt es ${name ? 'keine vollständigen Nährwerte' : 'keinen Eintrag'}. Lege es selbst an – beim nächsten Scan wird es sofort erkannt.`}</p>
        <button class="btn primary block" data-a="create">Lebensmittel anlegen</button>`
    });
    sh.$('[data-a=create]').onclick = () => {
      sh.close();
      Nutri.customFoodForm({ name, barcode: code }, { onSaved: f => Nutri.openFood(f, ctx) });
    };
  },

  /* ---------- Lebensmittel-Detail (Menge wählen) ---------- */
  openFood(food, ctx) {
    const entry = ctx.entry || null;
    const units = food.units || [];
    let unitSel = 'g', qty = 100;
    if (entry) {
      const ui = entry.unit ? units.findIndex(u => u.n === entry.unit.n) : -1;
      if (entry.unit && ui >= 0) { unitSel = String(ui); qty = entry.qty; } else { unitSel = 'g'; qty = entry.grams; }
    } else {
      const rec = S.meta.recents.find(r => r.id === food.id);
      if (rec && rec.lastQty) {
        const ui = rec.lastUnit ? units.findIndex(u => u.n === rec.lastUnit) : -1;
        if (rec.lastUnit && ui >= 0) { unitSel = String(ui); qty = rec.lastQty; } else if (!rec.lastUnit) { unitSel = 'g'; qty = rec.lastQty; }
      } else {
        const ui = units.findIndex(u => !/^(EL|TL)$/.test(u.n));
        if (ui >= 0) { unitSel = String(ui); qty = 1; }
      }
    }
    let meal = entry ? entry.meal : (ctx.meal || 'snacks');
    const editable = S.foods.some(f => f.id === food.id);
    const mode = entry ? 'edit' : ctx.mode === 'pick' ? 'pick' : 'log';

    const starSvg = on => U.icon.star.replace('<svg', `<svg style="fill:${on ? 'currentColor' : 'none'}"`);
    const head = `${editable ? `<button class="icon-btn plain" data-a="editfood" aria-label="Bearbeiten">${U.icon.edit}</button>` : ''}
      <button class="icon-btn plain" data-a="fav" style="color:var(--accent)" aria-label="Favorit">${starSvg(Nutri.isFav(food.id))}</button>`;

    const per = `${U.n(food.kcal)} kcal, ${Nutri.g(food.p)} g Protein, ${Nutri.g(food.c)} g Kohlenhydrate, ${Nutri.g(food.f)} g Fett je 100 g`;
    const sh = U.sheet({
      title: U.esc(food.name),
      headRight: head,
      body: `
        ${food.brand ? `<div class="card-sub" style="margin:-6px 0 8px 2px">${U.esc(food.brand)}</div>` : ''}
        <div class="food-hero"><div class="kcal"><span id="fd-kcal">0</span> <small>kcal</small></div></div>
        <div class="food-macros">
          <div class="p"><b id="fd-p">0</b><span>Protein (g)</span></div>
          <div class="c"><b id="fd-c">0</b><span>Kohlenh. (g)</span></div>
          <div class="f"><b id="fd-f">0</b><span>Fett (g)</span></div>
        </div>
        <div class="amount-row">
          <input class="input" id="fd-qty" inputmode="decimal" autocomplete="off" value="${U.n(qty, 2).replace(/\./g, '')}">
          <select class="input" id="fd-unit">
            <option value="g">Gramm</option>
            ${units.map((u, i) => `<option value="${i}">${U.esc(u.n)} (${U.n(u.g, 1)} g)</option>`).join('')}
          </select>
        </div>
        <div class="chips" id="fd-quick" style="margin-top:10px"></div>
        ${mode !== 'pick' ? `<div class="section-title" style="font-size:15px;margin:18px 2px 8px;color:var(--muted)">Mahlzeit</div>
        <div class="chips wrap" id="fd-meal">${MEALS.map(m => `<button class="chip ${m.id === meal ? 'on' : ''}" data-meal="${m.id}">${m.name}</button>`).join('')}</div>` : ''}
        <p class="hint" style="margin-top:16px">${per}</p>`,
      foot: mode === 'edit'
        ? `<div class="btn-row"><button class="btn danger" data-a="del">Löschen</button><button class="btn primary" data-a="save" style="flex:2">Speichern</button></div>`
        : `<button class="btn primary block" data-a="save">${mode === 'pick' ? 'Als Zutat übernehmen' : 'Hinzufügen'}</button>`
    });
    const qIn = sh.$('#fd-qty'), uIn = sh.$('#fd-unit');
    uIn.value = unitSel;

    const grams = () => {
      const q = U.parseNum(qIn.value);
      if (isNaN(q) || q <= 0) return 0;
      return uIn.value === 'g' ? q : q * units[+uIn.value].g;
    };
    const upd = () => {
      const v = Nutri.calc(food, grams());
      sh.$('#fd-kcal').textContent = U.n(v.kcal);
      sh.$('#fd-p').textContent = Nutri.g(v.p);
      sh.$('#fd-c').textContent = Nutri.g(v.c);
      sh.$('#fd-f').textContent = Nutri.g(v.f);
    };
    const quick = () => {
      const opts = uIn.value === 'g' ? [50, 100, 150, 200, 250] : [0.5, 1, 1.5, 2, 3];
      sh.$('#fd-quick').innerHTML = opts.map(o => `<button class="chip" data-q="${o}">${U.n(o, 1)}${uIn.value === 'g' ? ' g' : ''}</button>`).join('');
    };
    qIn.addEventListener('input', upd);
    qIn.addEventListener('focus', () => qIn.select());
    uIn.addEventListener('change', () => {
      qIn.value = uIn.value === 'g' ? '100' : '1';
      quick(); upd();
    });
    quick(); upd();

    sh.el.addEventListener('click', e => {
      const t = e.target.closest('[data-q],[data-meal],[data-a]');
      if (!t) return;
      if (t.dataset.q) { qIn.value = U.n(+t.dataset.q, 2).replace(/\./g, ''); upd(); return; }
      if (t.dataset.meal) {
        meal = t.dataset.meal;
        sh.$$('#fd-meal .chip').forEach(c => c.classList.toggle('on', c.dataset.meal === meal));
        return;
      }
      const a = t.dataset.a;
      if (a === 'fav') {
        Nutri.toggleFav(food);
        t.innerHTML = starSvg(Nutri.isFav(food.id));
        t.classList.remove('bump'); void t.offsetWidth; t.classList.add('bump');
        U.toast(Nutri.isFav(food.id) ? 'Zu Favoriten hinzugefügt' : 'Aus Favoriten entfernt');
        if (ctx.after) ctx.after();
      }
      if (a === 'editfood') {
        const f = S.foods.find(x => x.id === food.id);
        sh.close();
        if (f.src === 'recipe') Nutri.recipeEditor(f);
        else Nutri.customFoodForm(f, { onSaved: nf => Nutri.openFood(nf, ctx) });
      }
      if (a === 'del') {
        Store.del('entries', entry.id);
        sh.close();
        U.toast('Eintrag gelöscht');
        App.refresh();
      }
      if (a === 'save') {
        const g = grams();
        if (!g) { U.toast('Bitte eine Menge eingeben', 'err'); qIn.focus(); return; }
        const q = U.parseNum(qIn.value);
        const unit = uIn.value === 'g' ? null : units[+uIn.value];
        if (mode === 'pick') {
          sh.close();
          if (ctx.picker) ctx.picker.close();
          ctx.onPick(Nutri.snapshot(food), g);
          return;
        }
        const e2 = entry ? Object.assign({}, entry) : { id: U.uid(), date: ctx.day || Nutri.day, t: Date.now(), food: Nutri.snapshot(food) };
        e2.meal = meal; e2.grams = Math.round(g * 10) / 10; e2.qty = unit ? q : e2.grams; e2.unit = unit ? { n: unit.n, g: unit.g } : null;
        Store.put('entries', e2);
        Nutri.pushRecent(food, unit ? q : e2.grams, unit ? unit.n : null);
        U.haptic();
        sh.close();
        U.toast(entry ? 'Gespeichert' : `${food.name} hinzugefügt`, 'ok');
        if (ctx.after) ctx.after();
        App.refresh();
      }
    });
    return sh;
  },

  editEntry(id) {
    const e = S.entries.find(x => x.id === id);
    if (!e) return;
    if (e.food.src === 'quick') { Nutri.quickAdd({ day: e.date, meal: e.meal }, e); return; }
    Nutri.openFood(e.food, { entry: e, day: e.date });
  },

  /* ---------- Schnell-Eintrag: nur Kalorien & Makros ---------- */
  quickAdd(ctx, entry) {
    const f = entry ? entry.food : {};
    let meal = entry ? entry.meal : (ctx.meal || 'snacks');
    const v = x => (x ? U.n(x, 1).replace(/\./g, '') : '');
    const sh = U.sheet({
      title: entry ? 'Schnell-Eintrag' : 'Schnell eintragen',
      body: `<p class="hint" style="margin:-4px 2px 14px">Für Restaurant, Mensa oder wenn es schnell gehen muss. Trag ein, was du ungefähr gegessen hast.</p>
        <label class="field"><span>Bezeichnung (optional)</span><input class="input" id="qa-name" value="${U.esc(entry ? f.name : '')}" placeholder="z. B. Döner" autocomplete="off"></label>
        <div class="grid2">
          <label class="field"><span>Kalorien (kcal)</span><input class="input num" id="qa-kcal" inputmode="decimal" value="${v(f.kcal)}"></label>
          <label class="field"><span>Protein (g)</span><input class="input num" id="qa-p" inputmode="decimal" value="${v(f.p)}"></label>
          <label class="field"><span>Kohlenhydrate (g)</span><input class="input num" id="qa-c" inputmode="decimal" value="${v(f.c)}"></label>
          <label class="field"><span>Fett (g)</span><input class="input num" id="qa-f" inputmode="decimal" value="${v(f.f)}"></label>
        </div>
        <p class="hint" id="qa-hint"></p>
        <div class="chips wrap" id="qa-meal" style="margin-top:12px">${MEALS.map(m => `<button class="chip ${m.id === meal ? 'on' : ''}" data-meal="${m.id}">${m.name}</button>`).join('')}</div>`,
      foot: entry
        ? '<div class="btn-row"><button class="btn danger" data-a="del">Löschen</button><button class="btn primary" data-a="save" style="flex:2">Speichern</button></div>'
        : '<button class="btn primary block" data-a="save">Eintragen</button>'
    });
    const num = id => { const x = U.parseNum(sh.$(id).value); return isNaN(x) ? 0 : x; };
    const hint = () => {
      const k = num('#qa-p') * 4 + num('#qa-c') * 4 + num('#qa-f') * 9;
      sh.$('#qa-hint').textContent = k ? `Aus den Makros berechnet: ${U.n(k)} kcal${num('#qa-kcal') ? '' : ' – wird übernommen, wenn du keine Kalorien einträgst'}` : '';
    };
    sh.body.addEventListener('input', hint);
    hint();
    if (!entry) setTimeout(() => sh.$('#qa-kcal').focus(), 380);
    sh.el.addEventListener('click', e => {
      const m = e.target.closest('[data-meal]');
      if (m) { meal = m.dataset.meal; sh.$$('#qa-meal .chip').forEach(c => c.classList.toggle('on', c === m)); return; }
      const b = e.target.closest('[data-a]');
      if (!b) return;
      if (b.dataset.a === 'del') {
        Store.del('entries', entry.id); sh.close(); U.toast('Eintrag gelöscht'); App.refresh(); return;
      }
      const p = num('#qa-p'), c = num('#qa-c'), fat = num('#qa-f');
      let kcal = num('#qa-kcal');
      if (!kcal) kcal = p * 4 + c * 4 + fat * 9;
      if (!kcal) { U.toast('Bitte Kalorien oder Makros eintragen', 'err'); return; }
      const food = { id: entry ? f.id : 'q:' + U.uid(), name: sh.$('#qa-name').value.trim() || 'Schnell-Eintrag', brand: '', kcal, p, c, f: fat, units: [], src: 'quick' };
      const e2 = entry ? Object.assign({}, entry) : { id: U.uid(), date: ctx.day || Nutri.day, t: Date.now() };
      Object.assign(e2, { meal, food, grams: 100, qty: 100, unit: null });
      Store.put('entries', e2);
      U.haptic();
      sh.close();
      U.toast(entry ? 'Gespeichert' : `${U.n(kcal)} kcal eingetragen`, 'ok');
      if (ctx.after) ctx.after();
      App.refresh();
    });
  },

  /* ---------- Eigenes Lebensmittel ---------- */
  customFoodForm(existing, opts = {}) {
    const f = existing || {};
    const isEdit = !!(f.id && S.foods.some(x => x.id === f.id));
    const unit = (f.units && f.units[0]) || null;
    const v = x => (x == null || x === '' ? '' : U.n(x, 2).replace(/\./g, ''));
    const sh = U.sheet({
      title: isEdit ? 'Lebensmittel bearbeiten' : 'Eigenes Lebensmittel',
      full: true,
      body: `
        <label class="field"><span>Name</span><input class="input" id="cf-name" value="${U.esc(f.name || '')}" placeholder="z. B. Protein-Müsli" autocomplete="off"></label>
        <label class="field"><span>Marke (optional)</span><input class="input" id="cf-brand" value="${U.esc(f.brand || '')}" autocomplete="off"></label>
        <div class="grid2" style="margin-bottom:12px">
          <label class="field"><span>Portion heißt</span><input class="input" id="cf-un" value="${U.esc(unit ? unit.n : '')}" placeholder="z. B. Scoop"></label>
          <label class="field"><span>Portion in g</span><input class="input num" id="cf-ug" inputmode="decimal" value="${unit ? v(unit.g) : ''}" placeholder="z. B. 30"></label>
        </div>
        <div class="field"><span>Nährwerte angegeben pro</span>
          <div class="seg" id="cf-basis"><button data-b="100" class="on">100 g</button><button data-b="portion">Portion</button></div>
        </div>
        <div class="grid2">
          <label class="field"><span>Kalorien (kcal)</span><input class="input num" id="cf-kcal" inputmode="decimal" value="${v(f.kcal)}"></label>
          <label class="field"><span>Protein (g)</span><input class="input num" id="cf-p" inputmode="decimal" value="${v(f.p)}"></label>
          <label class="field"><span>Kohlenhydrate (g)</span><input class="input num" id="cf-c" inputmode="decimal" value="${v(f.c)}"></label>
          <label class="field"><span>Fett (g)</span><input class="input num" id="cf-f" inputmode="decimal" value="${v(f.f)}"></label>
        </div>
        <label class="field" style="margin-top:12px"><span>Barcode (optional)</span><input class="input num" id="cf-bc" inputmode="numeric" value="${U.esc(f.barcode || '')}"></label>
        ${isEdit ? '<button class="btn danger block" data-a="del" style="margin-top:8px">Lebensmittel löschen</button>' : ''}`,
      foot: `<button class="btn primary block" data-a="save">Speichern</button>`
    });
    let basis = '100';
    sh.$('#cf-basis').addEventListener('click', e => {
      const b = e.target.closest('[data-b]');
      if (!b) return;
      basis = b.dataset.b;
      sh.$$('#cf-basis button').forEach(x => x.classList.toggle('on', x === b));
    });
    if (!f.name) setTimeout(() => sh.$('#cf-name').focus(), 400);

    sh.el.addEventListener('click', async e => {
      const t = e.target.closest('[data-a]');
      if (!t) return;
      if (t.dataset.a === 'del') {
        if (await U.confirm(`„${U.esc(f.name)}“ wird gelöscht. Bereits eingetragene Mahlzeiten bleiben erhalten.`)) {
          Store.del('foods', f.id);
          S.meta.favs = S.meta.favs.filter(x => x.id !== f.id);
          S.meta.recents = S.meta.recents.filter(x => x.id !== f.id);
          Store.saveKV('meta');
          sh.close(); U.toast('Gelöscht'); App.refresh();
        }
        return;
      }
      const name = sh.$('#cf-name').value.trim();
      if (!name) { U.toast('Bitte einen Namen eingeben', 'err'); return; }
      const num = id => { const x = U.parseNum(sh.$(id).value); return isNaN(x) ? 0 : x; };
      let kcal = num('#cf-kcal'), p = num('#cf-p'), c = num('#cf-c'), fat = num('#cf-f');
      const un = sh.$('#cf-un').value.trim(), ug = num('#cf-ug');
      if (basis === 'portion') {
        if (!ug) { U.toast('Für „pro Portion“ brauchst du die Portionsgröße in g', 'err'); return; }
        const k = 100 / ug;
        kcal *= k; p *= k; c *= k; fat *= k;
      }
      if (!kcal && (p || c || fat)) kcal = p * 4 + c * 4 + fat * 9;
      const r1 = x => Math.round(x * 10) / 10;
      const food = {
        id: isEdit ? f.id : 'c:' + U.uid(),
        name, brand: sh.$('#cf-brand').value.trim(),
        kcal: r1(kcal), p: r1(p), c: r1(c), f: r1(fat),
        units: ug > 0 ? [{ n: un || 'Portion', g: ug }] : [],
        src: 'custom',
        barcode: sh.$('#cf-bc').value.replace(/\D/g, '') || undefined
      };
      if (!food.barcode) delete food.barcode;
      Store.put('foods', food);
      // Kopien in Favoriten/Zuletzt aktualisieren
      ['favs', 'recents'].forEach(k => {
        S.meta[k] = S.meta[k].map(x => x.id === food.id ? Object.assign(Nutri.snapshot(food), { lastQty: x.lastQty, lastUnit: x.lastUnit }) : x);
      });
      Store.saveKV('meta');
      sh.close();
      U.toast('Gespeichert', 'ok');
      if (opts.onSaved) opts.onSaved(food);
      App.refresh();
    });
  },

  /* ---------- Rezepte ---------- */
  recipeEditor(existing, opts = {}) {
    const r = existing ? JSON.parse(JSON.stringify(existing)) : { id: 'r:' + U.uid(), name: '', portions: 1, items: [] };
    const isEdit = !!existing;
    const sh = U.sheet({
      title: isEdit ? 'Rezept bearbeiten' : 'Neues Rezept',
      full: true,
      body: `
        <label class="field"><span>Name</span><input class="input" id="rc-name" value="${U.esc(r.name)}" placeholder="z. B. Overnight Oats" autocomplete="off"></label>
        <label class="field"><span>Ergibt Portionen</span><input class="input num" id="rc-por" inputmode="decimal" value="${U.n(r.portions, 2)}"></label>
        <div class="section-title" style="font-size:17px">Zutaten</div>
        <div id="rc-items"></div>
        <button class="btn block" data-a="add" style="margin-bottom:16px">${U.icon.plus} Zutat hinzufügen</button>
        <div id="rc-sum"></div>
        ${isEdit ? '<button class="btn danger block" data-a="del" style="margin-top:12px">Rezept löschen</button>' : ''}`,
      foot: `<button class="btn primary block" data-a="save">Rezept speichern</button>`
    });

    const totals = () => {
      const t = { kcal: 0, p: 0, c: 0, f: 0, g: 0 };
      r.items.forEach(it => { const v = Nutri.calc(it.food, it.grams); t.kcal += v.kcal; t.p += v.p; t.c += v.c; t.f += v.f; t.g += it.grams; });
      return t;
    };
    const draw = () => {
      sh.$('#rc-items').innerHTML = r.items.length ? `<div class="list">${r.items.map((it, i) => `
        <div class="list-item">
          <div class="li-main"><div class="li-title">${U.esc(it.food.name)}</div><div class="li-sub">${U.n(Nutri.calc(it.food, it.grams).kcal)} kcal</div></div>
          <input class="input num" data-g="${i}" inputmode="decimal" value="${U.n(it.grams, 1).replace(/\./g, '')}" style="width:84px;min-height:42px;text-align:center">
          <span style="color:var(--muted);font-size:14px">g</span>
          <button class="icon-btn plain" data-rm="${i}" aria-label="Entfernen" style="width:36px;height:36px">${U.icon.close}</button>
        </div>`).join('')}</div>` : '<div class="empty">Noch keine Zutaten.</div>';
      drawSum();
    };
    const drawSum = () => {
      const t = totals();
      const por = U.parseNum(sh.$('#rc-por').value) || 1;
      sh.$('#rc-sum').innerHTML = t.g ? `<div class="card" style="margin:0">
        <div class="card-title">Pro Portion (${U.n(t.g / por)} g)</div>
        <div class="food-macros" style="margin:10px 0 6px">
          <div><b>${U.n(t.kcal / por)}</b><span>kcal</span></div>
          <div class="p"><b>${Nutri.g(t.p / por)}</b><span>Protein</span></div>
          <div class="c"><b>${Nutri.g(t.c / por)}</b><span>Kohlenh.</span></div>
        </div>
        <div class="hint">Fett ${Nutri.g(t.f / por)} g pro Portion. Gesamt: ${U.n(t.kcal)} kcal, ${U.n(t.g)} g</div>
      </div>` : '';
    };
    sh.body.addEventListener('input', e => {
      if (e.target.dataset.g != null) {
        const x = U.parseNum(e.target.value);
        r.items[+e.target.dataset.g].grams = isNaN(x) ? 0 : x;
        drawSum();
      }
      if (e.target.id === 'rc-por') drawSum();
    });
    sh.el.addEventListener('click', async e => {
      const t = e.target.closest('[data-a],[data-rm]');
      if (!t) return;
      if (t.dataset.rm != null) { r.items.splice(+t.dataset.rm, 1); draw(); return; }
      const a = t.dataset.a;
      if (a === 'add') {
        Nutri.openPicker({ mode: 'pick', excludeId: r.id, onPick: (food, grams) => { r.items.push({ food, grams: Math.round(grams * 10) / 10 }); draw(); } });
      }
      if (a === 'del') {
        if (await U.confirm(`Rezept „${U.esc(r.name)}“ löschen? Bereits eingetragene Mahlzeiten bleiben erhalten.`)) {
          Store.del('foods', r.id);
          S.meta.favs = S.meta.favs.filter(x => x.id !== r.id);
          S.meta.recents = S.meta.recents.filter(x => x.id !== r.id);
          Store.saveKV('meta');
          sh.close(); App.refresh();
        }
      }
      if (a === 'save') {
        r.name = sh.$('#rc-name').value.trim();
        r.portions = U.parseNum(sh.$('#rc-por').value);
        if (!r.name) { U.toast('Bitte gib dem Rezept einen Namen', 'err'); return; }
        if (!(r.portions > 0)) { U.toast('Portionen müssen größer als 0 sein', 'err'); return; }
        r.items = r.items.filter(it => it.grams > 0);
        if (!r.items.length) { U.toast('Füge mindestens eine Zutat hinzu', 'err'); return; }
        const tt = totals();
        const r1 = x => Math.round(x * 10) / 10;
        const food = {
          id: r.id, name: r.name, src: 'recipe', brand: '',
          portions: r.portions, items: r.items, totalGrams: r1(tt.g),
          kcal: r1(tt.kcal / tt.g * 100), p: r1(tt.p / tt.g * 100), c: r1(tt.c / tt.g * 100), f: r1(tt.f / tt.g * 100),
          units: [{ n: 'Portion', g: r1(tt.g / r.portions) }]
        };
        Store.put('foods', food);
        ['favs', 'recents'].forEach(k => {
          S.meta[k] = S.meta[k].map(x => x.id === food.id ? Object.assign(Nutri.snapshot(food), { lastQty: x.lastQty, lastUnit: x.lastUnit }) : x);
        });
        Store.saveKV('meta');
        sh.close();
        U.toast('Rezept gespeichert', 'ok');
        if (opts.onSaved) opts.onSaved(food);
        App.refresh();
      }
    });
    draw();
    if (!isEdit) setTimeout(() => sh.$('#rc-name').focus(), 400);
  }
};
