/* =========================================================
   foodpro.js – Profi-Funktionen der Ernährung:
   Tagesziele je Trainings-/Ruhetag, Tagesdetails, gespeicherte
   Mahlzeiten, „Häufig“, Tag kopieren, „Was fehlt noch?“,
   Intervallfasten, Ernährungskalender
   ========================================================= */
'use strict';

const FoodPro = {

  /* ---------- Tagesziele: an Trainingstagen mehr, an Ruhetagen weniger ---------- */
  isTrainingDay(day) {
    if (S.workouts.some(w => w.date === day)) return true;
    if (S.active && U.key(new Date(S.active.start)) === day) return true;
    const p = Train.plannedFor(day);
    return !!(p && p !== 'rest');
  },
  goalsFor(day) {
    const st = S.settings;
    const g = { kcal: +st.kcal || 0, protein: +st.protein || 0, carbs: +st.carbs || 0, fat: +st.fat || 0, type: null, delta: 0 };
    const cy = st.cycle;
    // Ohne Trainingsteil gibt es keine Trainingstage
    if (!cy || !cy.on || App.mode() === 'food') return g;
    const train = FoodPro.isTrainingDay(day);
    const d = train ? (+cy.train || 0) : -(+cy.rest || 0);
    g.kcal += d;
    g.carbs = Math.max(0, Math.round(g.carbs + d / 4)); // Unterschied über Kohlenhydrate
    g.type = train ? 'train' : 'rest';
    g.delta = d;
    return g;
  },
  goalLabel(g) {
    if (!g.type) return '';
    return g.type === 'train' ? `Trainingstag ${g.delta >= 0 ? '+' : ''}${U.n(g.delta)} kcal` : `Ruhetag ${U.n(g.delta)} kcal`;
  },

  /* ---------- Tagesdetails ---------- */
  dayDetails(day) {
    const list = Nutri.dayEntries(day);
    const t = Nutri.sum(list);
    const g = FoodPro.goalsFor(day);
    const kc = t.p * 4 + t.c * 4 + t.f * 9 || 1;
    const pct = x => Math.round(x / kc * 100);
    const bar = (v, goal, color, max) => `<div class="bar"><i style="width:${U.clamp(goal ? v / goal * 100 : 0, 0, 100)}%;background:${v > goal && max ? 'var(--over)' : color}"></i></div>`;
    const perMeal = MEALS.map(m => ({ m, k: Nutri.sum(list.filter(e => e.meal === m.id)).kcal }));
    const maxMeal = Math.max(1, ...perMeal.map(x => x.k));
    const top = list.map(e => ({ e, k: Nutri.calc(e.food, e.grams).kcal })).sort((a, b) => b.k - a.k).slice(0, 5);
    const microRows = MICROS.map(m => {
      const known = t.known[m.k];
      const val = t[m.k];
      return `<div class="det-row">
        <div class="det-top"><span>${m.name}</span><b>${known ? Nutri.g(val) + ' g' : '–'} <small>${m.kind === 'max' ? 'max.' : 'Ziel'} ${m.goal} g</small></b></div>
        ${known ? bar(val, m.goal, m.kind === 'min' ? 'var(--carb)' : 'var(--accent)', m.kind === 'max') : ''}
        ${known && known < t.n ? `<div class="hint" style="margin:4px 0 0">Bekannt für ${known} von ${t.n} Einträgen</div>` : ''}
      </div>`;
    }).join('');

    U.sheet({
      title: 'Tagesdetails',
      full: true,
      body: `<p class="hint" style="margin:-2px 2px 14px">${U.fmtDay(day)}${g.type ? ', ' + FoodPro.goalLabel(g) : ''}</p>
        <div class="card">
          <div class="card-title">Kalorien & Makros</div>
          <div class="det-row"><div class="det-top"><span>Kalorien</span><b>${U.n(t.kcal)} <small>von ${U.n(g.kcal)} kcal</small></b></div>${bar(t.kcal, g.kcal, 'var(--accent)')}</div>
          <div class="det-row"><div class="det-top"><span><i class="dot p"></i>Protein</span><b>${U.n(t.p)} g <small>von ${g.protein} g, ${pct(t.p * 4)} %</small></b></div>${bar(t.p, g.protein, 'var(--prot)')}</div>
          <div class="det-row"><div class="det-top"><span><i class="dot c"></i>Kohlenhydrate</span><b>${U.n(t.c)} g <small>von ${g.carbs} g, ${pct(t.c * 4)} %</small></b></div>${bar(t.c, g.carbs, 'var(--carb)')}</div>
          <div class="det-row"><div class="det-top"><span><i class="dot f"></i>Fett</span><b>${U.n(t.f)} g <small>von ${g.fat} g, ${pct(t.f * 9)} %</small></b></div>${bar(t.f, g.fat, 'var(--fat)')}</div>
          <div class="split-bar"><i style="width:${pct(t.p * 4)}%;background:var(--prot)"></i><i style="width:${pct(t.c * 4)}%;background:var(--carb)"></i><i style="width:${pct(t.f * 9)}%;background:var(--fat)"></i></div>
          <p class="hint" style="margin:6px 0 0">Verteilung der Kalorien auf Protein, Kohlenhydrate und Fett.</p>
        </div>
        <div class="card"><div class="card-title">Weitere Nährwerte</div>${microRows}</div>
        <div class="card"><div class="card-title">Nach Mahlzeit</div>
          ${perMeal.map(x => `<div class="det-row"><div class="det-top"><span>${x.m.name}</span><b>${U.n(x.k)} <small>kcal</small></b></div><div class="bar"><i style="width:${x.k / maxMeal * 100}%;background:var(--accent)"></i></div></div>`).join('')}
        </div>
        ${top.length ? `<div class="card"><div class="card-title">Größte Kalorienquellen</div>
          ${top.map(x => `<div class="det-top" style="padding:7px 0"><span>${U.esc(x.e.food.name)}</span><b>${U.n(x.k)} <small>kcal</small></b></div>`).join('')}</div>` : ''}`
    });
  },

  /* ---------- Gespeicherte Mahlzeiten ---------- */
  meals() { return S.meta.meals || (S.meta.meals = []); },
  mealKcal(m) { return m.items.reduce((a, it) => a + Nutri.calc(it.food, it.grams).kcal, 0); },
  mealMenu(meal, day) {
    const list = Nutri.dayEntries(day).filter(e => e.meal === meal);
    const yest = S.entries.some(e => e.date === U.addDays(day, -1) && e.meal === meal);
    const saved = FoodPro.meals();
    const sh = U.sheet({
      title: mealName(meal),
      body: `<div class="list">
        ${saved.length ? '<button class="list-item" data-m="log"><div class="li-main"><div class="li-title">Gespeicherte Mahlzeit eintragen</div></div></button>' : ''}
        ${list.length ? '<button class="list-item" data-m="save"><div class="li-main"><div class="li-title">Als Mahlzeit speichern</div><div class="li-sub">Später mit einem Tipp komplett eintragen</div></div></button>' : ''}
        ${yest ? '<button class="list-item" data-m="copy"><div class="li-main"><div class="li-title">Wie gestern</div><div class="li-sub">Einträge von gestern kopieren</div></div></button>' : ''}
        ${list.length ? '<button class="list-item" data-m="clear"><div class="li-main"><div class="li-title" style="color:var(--danger)">Alle Einträge löschen</div></div></button>' : ''}
      </div>${!saved.length && !list.length && !yest ? '<div class="empty">Noch nichts hier. Trag etwas ein, dann kannst du die Mahlzeit speichern.</div>' : ''}`
    });
    sh.body.addEventListener('click', async e => {
      const b = e.target.closest('[data-m]');
      if (!b) return;
      const m = b.dataset.m;
      sh.close();
      if (m === 'save') FoodPro.saveMeal(list, meal);
      if (m === 'copy') Nutri.copyMeal(meal);
      if (m === 'log') FoodPro.mealPicker(meal, day);
      if (m === 'clear' && await U.confirm(`${list.length} ${list.length === 1 ? 'Eintrag' : 'Einträge'} aus ${mealName(meal)} löschen?`)) {
        list.forEach(x => Store.del('entries', x.id));
        App.refresh();
      }
    });
  },
  saveMeal(list, meal) {
    const def = mealName(meal) === 'Snacks' ? 'Mein Snack' : 'Mein ' + mealName(meal);
    const sh = U.sheet({
      title: 'Mahlzeit speichern',
      body: `<label class="field"><span>Name</span><input class="input" id="ml-name" value="${U.esc(def)}" autocomplete="off"></label>
        <p class="hint" style="margin:0 2px 14px">${list.map(e => U.esc(e.food.name)).join(', ')}</p>
        <button class="btn primary block" id="ml-ok">Speichern</button>`
    });
    setTimeout(() => sh.$('#ml-name').select(), 350);
    sh.$('#ml-ok').onclick = () => {
      const name = sh.$('#ml-name').value.trim() || def;
      FoodPro.meals().push({ id: 'm:' + U.uid(), name, items: list.map(e => ({ food: Nutri.snapshot(e.food), grams: e.grams })) });
      Store.saveKV('meta');
      sh.close();
      U.haptic();
      U.toast(`„${name}“ gespeichert`, 'ok');
    };
  },
  logMeal(m, meal, day) {
    const now = Date.now();
    const ids = m.items.map((it, i) => {
      const e = { id: U.uid(), date: day, t: now + i, meal, food: Nutri.snapshot(it.food), grams: it.grams, qty: it.grams, unit: null };
      Store.put('entries', e);
      return e.id;
    });
    FoodPro.onFoodLogged(day);
    U.haptic();
    App.refresh();
    U.toast(`${m.name} eingetragen (${U.n(FoodPro.mealKcal(m))} kcal)`, 'ok', {
      label: 'Rückgängig', fn: () => { ids.forEach(id => Store.del('entries', id)); App.refresh(); }
    });
  },
  mealView(m, ctx) {
    const sh = U.sheet({
      title: U.esc(m.name),
      body: `<div class="list">${m.items.map(it => `<div class="list-item"><div class="li-main"><div class="li-title">${U.esc(it.food.name)}</div>
          <div class="li-sub">${U.n(it.grams)} ${Nutri.unitOf(it.food)}</div></div><div class="li-end"><div class="big">${U.n(Nutri.calc(it.food, it.grams).kcal)}</div><div class="small">kcal</div></div></div>`).join('')}</div>
        <p class="hint" style="margin:0 2px 14px">Gesamt ${U.n(FoodPro.mealKcal(m))} kcal, ${Nutri.g(m.items.reduce((a, it) => a + Nutri.calc(it.food, it.grams).p, 0))} g Protein</p>
        <button class="btn primary block" data-a="log">In ${mealName(ctx.meal)} eintragen</button>
        <button class="btn danger block" data-a="del" style="margin-top:10px">Gespeicherte Mahlzeit löschen</button>`
    });
    sh.body.addEventListener('click', async e => {
      const b = e.target.closest('[data-a]');
      if (!b) return;
      if (b.dataset.a === 'log') { sh.close(); if (ctx.picker) ctx.picker.close(); FoodPro.logMeal(m, ctx.meal, ctx.day || Nutri.day); }
      if (b.dataset.a === 'del' && await U.confirm(`„${U.esc(m.name)}“ löschen? Bereits eingetragene Einträge bleiben.`)) {
        S.meta.meals = FoodPro.meals().filter(x => x.id !== m.id);
        Store.saveKV('meta');
        sh.close();
        if (ctx.after) ctx.after();
      }
    });
  },
  mealPicker(meal, day) {
    const sh = U.sheet({
      title: 'Mahlzeit eintragen',
      body: `<div class="list">${FoodPro.meals().map(m => `<button class="list-item" data-id="${m.id}">
        <div class="li-main"><div class="li-title">${U.esc(m.name)}</div><div class="li-sub">${m.items.length} Lebensmittel, ${U.n(FoodPro.mealKcal(m))} kcal</div></div>${U.icon.chevron}</button>`).join('')}</div>`
    });
    sh.body.addEventListener('click', e => {
      const b = e.target.closest('[data-id]');
      if (!b) return;
      sh.close();
      FoodPro.logMeal(FoodPro.meals().find(m => m.id === b.dataset.id), meal, day);
    });
  },
  mealRowsHTML() {
    return FoodPro.meals().map(m => `<div class="list-item tap" data-mealview="${m.id}">
      <div class="li-main"><div class="li-title">${U.esc(m.name)}<span class="src-badge">Mahlzeit</span></div>
      <div class="li-sub">${m.items.length} Lebensmittel, ${U.n(FoodPro.mealKcal(m))} kcal</div></div>
      <button class="add-pill" data-addmeal="${m.id}" aria-label="${U.esc(m.name)} eintragen">${U.icon.plus}<span>Alles</span></button>
    </div>`).join('');
  },

  /* ---------- Häufig gegessen (letzte 60 Tage) ---------- */
  frequent() {
    const from = U.addDays(U.today(), -60);
    const map = new Map();
    S.entries.forEach(e => {
      if (e.date < from || !e.food || e.food.src === 'quick') return;
      const x = map.get(e.food.id) || { n: 0, food: e.food, t: 0 };
      x.n++;
      if ((e.t || 0) >= x.t) { x.food = e.food; x.t = e.t || 0; }
      map.set(e.food.id, x);
    });
    return [...map.values()].filter(x => x.n >= 2).sort((a, b) => b.n - a.n).slice(0, 30).map(x => x.food);
  },

  /* ---------- Ganzen Tag kopieren ---------- */
  copyDayDialog(day) {
    const sh = U.sheet({
      title: 'Tag kopieren',
      body: `<p class="hint" style="margin:-2px 2px 12px">Alle Einträge eines anderen Tages zu ${U.fmtDay(day)} hinzufügen.</p>
        <label class="field"><span>Von welchem Tag?</span><input class="input" type="date" id="cd-date" value="${U.addDays(day, -1)}" max="${U.today()}"></label>
        <p class="hint" id="cd-info" style="margin:0 2px 14px"></p>
        <button class="btn primary block" id="cd-ok">Kopieren</button>`
    });
    const info = () => {
      const k = sh.$('#cd-date').value;
      const n = S.entries.filter(e => e.date === k).length;
      sh.$('#cd-info').textContent = n ? `${n} Einträge, ${U.n(Nutri.totals(k).kcal)} kcal` : 'An diesem Tag gibt es keine Einträge.';
      sh.$('#cd-ok').disabled = !n || k === day;
    };
    sh.$('#cd-date').addEventListener('change', info);
    info();
    sh.$('#cd-ok').onclick = () => {
      const from = sh.$('#cd-date').value;
      const src = S.entries.filter(e => e.date === from);
      const now = Date.now();
      const ids = src.map((e, i) => {
        const c = Object.assign(JSON.parse(JSON.stringify(e)), { id: U.uid(), date: day, t: now + i });
        Store.put('entries', c);
        return c.id;
      });
      sh.close();
      U.haptic();
      App.refresh();
      U.toast(`${ids.length} Einträge kopiert`, 'ok', { label: 'Rückgängig', fn: () => { ids.forEach(id => Store.del('entries', id)); App.refresh(); } });
    };
  },

  /* ---------- „Was fehlt noch?“ – proteinreiche Vorschläge passend zum Rest ---------- */
  PROTEIN_BASICS: ['Magerquark', 'Skyr natur', 'Hähnchenbrust (roh)', 'Whey Protein (Pulver)', 'Thunfisch (Dose, in Wasser)',
    'Körniger Frischkäse', 'Putenbrust-Aufschnitt', 'Eiklar', 'Proteinpudding', 'Garnelen (gegart)'],
  suggestions(day) {
    const g = FoodPro.goalsFor(day);
    const t = Nutri.totals(day);
    const needP = g.protein - t.p, leftK = g.kcal - t.kcal;
    if (needP < 15 || leftK < 120) return null;
    const pool = [];
    const seen = new Set();
    const add = (f, own) => { if (f && !seen.has(f.id) && f.src !== 'quick') { seen.add(f.id); pool.push({ f, own }); } };
    S.meta.favs.forEach(f => add(f, true));
    FoodPro.frequent().forEach(f => add(f, true));
    S.meta.recents.forEach(f => add(f, true));
    FoodPro.PROTEIN_BASICS.forEach(n => add(BASIC_FOODS.find(b => b.name === n), false));
    const out = [];
    pool.forEach(({ f, own }) => {
      if (!(f.kcal > 0) || !(f.p > 0)) return;
      const density = f.p / f.kcal * 100; // g Protein pro 100 kcal
      if (density < 8) return;
      // Eine normale Portion: deine übliche Menge bzw. eine typische Packungsgröße
      const unit = (f.units || [])[0];
      let portion = Nutri.defaultGrams(f);
      if (portion < 80 && !(unit && /Scoop|Riegel/.test(unit.n))) portion = 100;
      let grams = Math.min(portion, needP / f.p * 100 * 1.1, leftK / f.kcal * 100);
      grams = unit && /Scoop|Riegel/.test(unit.n) ? Math.max(unit.g, Math.round(grams / unit.g) * unit.g) : Math.round(grams / 10) * 10;
      if (grams < 30) return;
      const p = f.p * grams / 100;
      if (p < 8) return;
      out.push({ f, grams, p, kcal: f.kcal * grams / 100, score: density + (own ? 15 : 0) });
    });
    out.sort((a, b) => b.score - a.score);
    return { needP, leftK, list: out.slice(0, 3) };
  },
  suggestCard(day) {
    const s = FoodPro.suggestions(day);
    if (!s || !s.list.length) return '';
    return `<div class="quick-row sug-row-compact">
      <div class="quick-title">Noch <b>${U.n(s.needP)} g Protein</b> offen. Passt dazu:</div>
      <div class="chips">${s.list.map(x => `<button class="quick-chip sug-chip" data-act="sug-add" data-id="${U.esc(x.f.id)}" data-g="${x.grams}" data-day="${day}" aria-label="${U.esc(x.f.name)}, ${U.n(x.grams)} ${Nutri.unitOf(x.f)} eintragen">
          <span class="qc-plus">${U.icon.plus}</span><span class="qc-name">${U.esc(x.f.name)}</span>
          <span class="qc-amt">${U.n(x.grams)} ${Nutri.unitOf(x.f)}, +${U.n(x.p)} g P</span>
        </button>`).join('')}</div>
    </div>`;
  },
  findFood(id) {
    return S.meta.favs.find(f => f.id === id) || S.meta.recents.find(f => f.id === id) ||
      S.foods.find(f => f.id === id) || BASIC_FOODS.find(f => f.id === id) ||
      (S.entries.find(e => e.food && e.food.id === id) || {}).food || null;
  },

  /* ---------- Intervallfasten ---------- */
  fastOn() { return !!(S.settings.fast && S.settings.fast.on); },
  fastGoal() { return (S.settings.fast && +S.settings.fast.hours) || 16; },
  fastCard() {
    if (!FoodPro.fastOn()) return '';
    const st = S.meta.fastStart;
    const goalMs = FoodPro.fastGoal() * 3600000;
    if (st) {
      const el = Date.now() - st;
      const pct = U.clamp(el / goalMs, 0, 1);
      const done = el >= goalMs;
      return `<div class="card fast-card">
        ${U.ring(64, 7, pct, done ? 'var(--ok)' : 'var(--accent)', `<div class="v" style="font-size:13px;font-weight:600">${Math.round(pct * 100)} %</div>`)}
        <div style="flex:1;min-width:0"><div class="card-sub">${done ? 'Fastenziel erreicht 🎉' : 'Du fastest'}</div>
          <div class="fast-time" id="fast-time">${U.fmtDur(el).replace(/:\d\d$/, '')} h</div>
          <div class="hint" style="margin:0">Ziel ${FoodPro.fastGoal()} h, seit ${new Date(st).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr</div></div>
        <button class="btn small" data-act="fast-stop">Beenden</button>
      </div>`;
    }
    const last = (S.meta.fastLog || []).slice(-1)[0];
    return `<div class="card fast-card">
      <div style="flex:1;min-width:0"><div class="card-sub">Intervallfasten ${FoodPro.fastGoal()}:${24 - FoodPro.fastGoal()}</div>
        <div class="card-title">Essensfenster offen</div>
        ${last ? `<div class="hint" style="margin:0">Letztes Fasten: ${U.fmtMin(last.end - last.start)}</div>` : ''}</div>
      <button class="btn small primary" data-act="fast-start">Fasten starten</button>
    </div>`;
  },
  startFast() {
    S.meta.fastStart = Date.now();
    Store.saveKV('meta');
    U.haptic();
    U.toast(`Fasten gestartet, Ziel ${FoodPro.fastGoal()} Stunden`, 'ok');
    App.refresh();
  },
  stopFast(silent) {
    const st = S.meta.fastStart;
    if (!st) return;
    const end = Date.now();
    S.meta.fastLog = (S.meta.fastLog || []).concat([{ start: st, end }]).slice(-60);
    S.meta.fastStart = null;
    Store.saveKV('meta');
    if (!silent) U.toast(`Fasten beendet nach ${U.fmtMin(end - st)}`, 'ok');
    App.refresh();
  },
  // Wird beim Eintragen von Essen aufgerufen: beendet ein laufendes Fasten automatisch
  onFoodLogged(day) {
    if (FoodPro.fastOn() && S.meta.fastStart && day === U.today()) {
      const dur = Date.now() - S.meta.fastStart;
      FoodPro.stopFast(true);
      U.toast(`Fasten beendet nach ${U.fmtMin(dur)}`, 'ok');
    }
  },
  tickFast() {
    const el = $('#fast-time');
    if (el && S.meta.fastStart) el.textContent = U.fmtDur(Date.now() - S.meta.fastStart).replace(/:\d\d$/, '') + ' h';
  },

  /* ---------- Ernährungskalender ---------- */
  dayStatus(day) {
    const list = Nutri.dayEntries(day);
    if (!list.length) return null;
    const g = FoodPro.goalsFor(day);
    const t = Nutri.sum(list);
    const kOk = g.kcal && Math.abs(t.kcal - g.kcal) <= g.kcal * 0.1;
    const pOk = g.protein && t.p >= g.protein * 0.9;
    return kOk && pOk ? 'good' : kOk || pOk ? 'ok' : 'off';
  },
  calendar(month) {
    const base = month || U.today().slice(0, 7);
    const sh = U.sheet({ title: 'Ernährungskalender', full: true, body: '<div id="cal-box"></div>' });
    let cur = base;
    const draw = () => {
      const [y, m] = cur.split('-').map(Number);
      const first = new Date(y, m - 1, 1, 12);
      const daysIn = new Date(y, m, 0).getDate();
      const lead = (first.getDay() + 6) % 7;
      let cells = '', logged = 0, good = 0;
      for (let i = 0; i < lead; i++) cells += '<div></div>';
      for (let d = 1; d <= daysIn; d++) {
        const key = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const st = key <= U.today() ? FoodPro.dayStatus(key) : null;
        if (st) logged++;
        if (st === 'good') good++;
        cells += `<button class="cal-day ${st ? 'st-' + st : ''} ${key === U.today() ? 'is-today' : ''}" data-day="${key}" ${key > U.today() ? 'disabled' : ''}>${d}</button>`;
      }
      const mName = first.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
      sh.$('#cal-box').innerHTML = `
        <div class="cal-nav">
          <button class="icon-btn" data-nav="-1" aria-label="Vorheriger Monat">${U.icon.left}</button>
          <b>${mName}</b>
          <button class="icon-btn" data-nav="1" ${cur >= U.today().slice(0, 7) ? 'disabled style="opacity:.3"' : ''} aria-label="Nächster Monat">${U.icon.right}</button>
        </div>
        <div class="cal-grid cal-head">${['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map(x => `<div>${x}</div>`).join('')}</div>
        <div class="cal-grid">${cells}</div>
        <div class="cal-legend"><span><i class="st-good"></i>Im Ziel</span><span><i class="st-ok"></i>Kalorien oder Protein</span><span><i class="st-off"></i>Daneben</span></div>
        <div class="kpi-row" style="margin-top:16px">
          <div class="kpi"><b>${logged}</b><span>Tage eingetragen</span></div>
          <div class="kpi"><b>${good}</b><span>Tage im Ziel</span></div>
        </div>
        <p class="hint">„Im Ziel“ heißt: Kalorien höchstens 10 % neben dem Ziel und mindestens 90 % vom Protein. Tippe auf einen Tag, um ihn zu öffnen.</p>`;
    };
    sh.body.addEventListener('click', e => {
      const nav = e.target.closest('[data-nav]');
      if (nav && !nav.disabled) {
        const [y, m] = cur.split('-').map(Number);
        const d = new Date(y, m - 1 + +nav.dataset.nav, 1, 12);
        cur = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        draw();
        return;
      }
      const day = e.target.closest('[data-day]');
      if (day && !day.disabled) {
        Nutri.day = day.dataset.day;
        sh.close();
        App.go('food');
        Nutri.render();
      }
    });
    draw();
  },

  bind() {
    Object.assign(App.actions, {
      'day-details': () => FoodPro.dayDetails(Nutri.day),
      'meal-menu': el => FoodPro.mealMenu(el.dataset.meal, Nutri.day),
      'copy-day': () => FoodPro.copyDayDialog(Nutri.day),
      'calendar': () => FoodPro.calendar(Nutri.day.slice(0, 7)),
      'sug-add': el => {
        const f = FoodPro.findFood(el.dataset.id);
        if (f) Nutri.instantAdd(f, el.dataset.day === U.today() ? App.mealByTime() : 'snacks', el.dataset.day, +el.dataset.g);
      },
      'fast-start': () => FoodPro.startFast(),
      'fast-stop': () => FoodPro.stopFast()
    });
    setInterval(FoodPro.tickFast, 30000);
  }
};
