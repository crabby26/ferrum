/* =========================================================
   progress.js – Körpergewicht, Wochenstatistik, Kraftentwicklung
   ========================================================= */
'use strict';

const Progress = {
  range: '3m',
  exId: null,
  showAll: false,

  weightsSorted() { return S.weights.slice().sort((a, b) => a.id < b.id ? -1 : 1); },
  latestWeight() { const w = Progress.weightsSorted(); return w.length ? w[w.length - 1].kg : null; },

  /* ---------- Gewichtstrend (exponentiell geglättet, 10 % pro Tag) ----------
     Glättet Wasser- und Verdauungsschwankungen weg, damit man die echte Richtung sieht. */
  trendSeries() {
    let t = null, prev = null;
    return Progress.weightsSorted().map(w => {
      if (t == null) t = w.kg;
      else {
        const gap = Math.max(1, U.daysBetween(prev, w.id));
        t += (1 - Math.pow(0.9, gap)) * (w.kg - t);
      }
      prev = w.id;
      return { id: w.id, kg: w.kg, trend: t };
    });
  },
  trendAt(series, day) {
    let v = series.length ? series[0].trend : null;
    series.forEach(p => { if (p.id <= day) v = p.trend; });
    return v;
  },

  /* ---------- Verbrauch aus Essen + Gewichtstrend schätzen ----------
     Verbrauch = Ø gegessen − (Trendänderung × 7700 kcal/kg) ÷ Tage */
  expenditure() {
    const tr = Progress.trendSeries();
    if (tr.length < 2) return { need: 'weight' };
    const end = U.today();
    const first = tr[0].id;
    const start = first > U.addDays(end, -28) ? first : U.addDays(end, -28);
    const span = U.daysBetween(start, end);
    if (span < 14) return { need: 'days', left: 14 - span };
    const byDay = {};
    S.entries.forEach(e => {
      if (e.date < start || e.date >= end) return;
      byDay[e.date] = (byDay[e.date] || 0) + Nutri.calc(e.food, e.grams).kcal;
    });
    const days = Object.keys(byDay);
    if (days.length < 10) return { need: 'log', left: 10 - days.length };
    const avg = days.reduce((a, d) => a + byDay[d], 0) / days.length;
    const dT = Progress.trendAt(tr, end) - Progress.trendAt(tr, start);
    const tdee = avg - dT * 7700 / span;
    return { tdee: Math.round(tdee / 10) * 10, avg, span, logged: days.length, weekly: dT / span * 7 };
  },

  render() {
    const el = $('#view-progress');
    const ws = Progress.weightsSorted();
    const last = ws[ws.length - 1];
    const monthAgo = U.addDays(U.today(), -30);
    const ref = ws.filter(w => w.id <= monthAgo).pop() || ws[0];
    const diff = last && ref && ref !== last ? last.kg - ref.kg : null;

    const exWithHist = S.exercises.filter(e => S.workouts.some(w => w.exercises.some(x => x.exId === e.id && x.sets.some(s => +s.w > 0))));
    if (!Progress.exId || !exWithHist.some(e => e.id === Progress.exId)) {
      let best = null, cnt = -1;
      exWithHist.forEach(e => { const c = Train.history(e.id).length; if (c > cnt) { cnt = c; best = e.id; } });
      Progress.exId = best;
    }
    const ranges = [['1m', '1 M'], ['3m', '3 M'], ['6m', '6 M'], ['1y', '1 J'], ['all', 'Alle']];
    const listW = ws.slice().reverse().slice(0, Progress.showAll ? 400 : 5);

    el.innerHTML = `
      <div class="page-head"><h1 class="page-title">Fortschritt</h1></div>

      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:12px">
          <div><div class="card-title">Körpergewicht</div>
            <div class="card-sub">${last ? 'Zuletzt ' + U.fmtDay(last.id) : 'Noch kein Eintrag'}</div></div>
          <div style="text-align:right">
            <div class="num" style="font-size:30px;font-weight:700;letter-spacing:-.02em;line-height:1">${last ? U.n(last.kg, 1) : '–'}<small style="font-size:15px;color:var(--muted)"> kg</small></div>
            ${diff != null ? `<div class="num" style="font-size:13px;color:var(--muted)">${diff > 0 ? '+' : ''}${U.n(diff, 1)} kg seit ${U.fmtShort(ref.id)}</div>` : ''}
          </div>
        </div>
        <div class="grid2" style="margin-bottom:10px">
          <input class="input num" id="pw-kg" inputmode="decimal" placeholder="${last ? U.n(last.kg, 1) : 'kg'}" aria-label="Gewicht in kg">
          <input class="input" id="pw-date" type="date" value="${U.today()}" max="${U.today()}" aria-label="Datum">
        </div>
        <button class="btn primary block" data-act="weight-save">Gewicht eintragen</button>
      </div>

      <div class="card">
        <div class="chips" style="margin-bottom:12px">${ranges.map(r => `<button class="chip ${Progress.range === r[0] ? 'on' : ''}" data-act="w-range" data-r="${r[0]}">${r[1]}</button>`).join('')}</div>
        <div id="ch-weight"></div>
        <div class="legend"><span><i style="background:var(--dim)"></i>Waage</span><span><i style="background:var(--accent)"></i>Trend (geglättet)</span></div>
      </div>
      ${Progress.trendCard()}
      ${listW.length ? `<div class="list">${listW.map(w => `<div class="list-item">
          <div class="li-main"><div class="li-title">${U.fmtDay(w.id)}</div></div>
          <div class="li-end"><div class="big">${U.n(w.kg, 1)} kg</div></div>
          <button class="icon-btn plain" data-act="weight-del" data-id="${w.id}" aria-label="Löschen" style="width:36px;height:36px">${U.icon.trash}</button>
        </div>`).join('')}</div>
        ${ws.length > 5 ? `<button class="btn ghost block" data-act="weight-all">${Progress.showAll ? 'Weniger anzeigen' : 'Alle Einträge anzeigen'}</button>` : ''}` : ''}

      <div class="section-title">Ernährung pro Woche</div>
      <div class="card">
        <div class="card-title">Kalorien</div><div class="card-sub" style="margin-bottom:10px">Durchschnitt pro getracktem Tag, gestrichelt dein Ziel</div>
        <div id="ch-kcal"></div>
      </div>
      <div class="card">
        <div class="card-title">Protein</div><div class="card-sub" style="margin-bottom:10px">Durchschnitt in g pro getracktem Tag</div>
        <div id="ch-prot"></div>
      </div>

      <div class="section-title">Kraftentwicklung</div>
      <div class="card">
        ${exWithHist.length ? `<select class="input" id="pr-ex" style="margin-bottom:12px">
          ${exWithHist.sort((a, b) => a.name.localeCompare(b.name, 'de')).map(e => `<option value="${e.id}" ${e.id === Progress.exId ? 'selected' : ''}>${U.esc(e.name)}</option>`).join('')}
        </select>
        <div id="pr-stats"></div>
        <div id="ch-str"></div>
        <p class="hint">Geschätztes 1RM (Epley-Formel) aus deinem besten Satz pro Training.</p>`
        : '<div class="chart-empty">Sobald du Workouts mit Gewicht gespeichert hast, siehst du hier deine Kraftentwicklung.</div>'}
      </div>
    `;
    const sel = $('#pr-ex', el);
    if (sel) sel.addEventListener('change', () => { Progress.exId = sel.value; Progress.drawStrength(); });
    requestAnimationFrame(() => { Progress.drawWeight(); Progress.drawWeekly(); Progress.drawStrength(); });
  },

  drawWeight() {
    const el = $('#ch-weight'); if (!el) return;
    const days = { '1m': 31, '3m': 92, '6m': 183, '1y': 366 }[Progress.range];
    const from = days ? U.addDays(U.today(), -days) : '0000';
    const tr = Progress.trendSeries().filter(w => w.id >= from);
    const trend = tr.map(w => ({ x: U.parseKey(w.id).getTime(), y: w.trend, kg: w.kg }));
    const scale = tr.map(w => ({ x: U.parseKey(w.id).getTime(), y: w.kg }));
    const series = [{ points: trend, color: 'var(--accent)', dots: false, width: 3 }];
    if (scale.length) series.push({ points: scale, color: 'var(--dim)', dots: true, width: 0 });
    Charts.line(el, series, {
      yFmt: v => U.n(v, 1), emptyText: 'Trag dein Gewicht ein, um den Verlauf zu sehen.',
      tipFmt: p => U.fmtShort(U.key(new Date(p.x))) + ': Trend ' + U.n(p.y, 1) + ' kg, Waage ' + U.n(p.kg, 1) + ' kg'
    });
  },

  trendCard() {
    const tr = Progress.trendSeries();
    if (tr.length < 2) return '';
    const last = tr[tr.length - 1];
    const ref = Progress.trendAt(tr, U.addDays(last.id, -14));
    const days = Math.min(14, U.daysBetween(tr[0].id, last.id)) || 1;
    const weekly = (last.trend - ref) / days * 7;
    const ex = Progress.expenditure();
    const st = S.settings;
    let exp;
    if (ex.tdee) {
      const g = calcGoals(Object.assign({}, st, { weight: Progress.latestWeight() || st.weight, tdeeOverride: ex.tdee }));
      exp = `<div class="kpi" style="grid-column:1/-1">
          <b>${U.n(ex.tdee)} kcal</b><span>Dein echter Tagesverbrauch, berechnet aus ${ex.logged} Tagen Essen und deinem Gewichtstrend (Formel sagt ${U.n(calcGoals(st).tdee)} kcal)</span>
        </div></div>
        ${Math.abs(g.kcal - st.kcal) >= 50 ? `<button class="btn primary block" data-act="tdee-apply" data-v="${ex.tdee}">Kalorienziel auf ${U.n(g.kcal)} kcal anpassen</button>` : '<p class="hint" style="margin:0">Dein Kalorienziel passt zu deinem echten Verbrauch.</p>'}`;
    } else {
      const msg = ex.need === 'days' ? `Noch ${ex.left} ${ex.left === 1 ? 'Tag' : 'Tage'} Gewichtsdaten` : ex.need === 'log' ? `Noch ${ex.left} Tage Essen eintragen` : 'Mehr Gewichtseinträge nötig';
      exp = `</div><p class="hint" style="margin:0">${msg}, dann berechnet Ferrum deinen echten Kalorienverbrauch. Am genauesten wird es, wenn du dich täglich morgens wiegst.</p>`;
    }
    const goalTxt = st.goal === 'bulk' ? 'Für sauberen Aufbau sind etwa +0,1 bis +0,3 kg pro Woche ideal.' : st.goal === 'cut' ? 'In der Diät sind etwa −0,3 bis −0,7 kg pro Woche ein gutes Tempo.' : '';
    return `<div class="card trend-card">
      <div class="card-title">Trend & Verbrauch</div>
      <div class="kpi-row">
        <div class="kpi"><b>${U.n(last.trend, 1)} kg</b><span>Trendgewicht</span></div>
        <div class="kpi"><b>${weekly > 0 ? '+' : ''}${U.n(weekly, 2)} kg</b><span>pro Woche</span></div>
        ${exp}
      ${goalTxt ? `<p class="hint" style="margin-top:10px">${goalTxt}</p>` : ''}
    </div>`;
  },

  /* ---------- Wochen-Check-in (sonntags) ---------- */
  weekStats() {
    const end = U.today(), start = U.addDays(end, -6);
    const ws = S.workouts.filter(w => w.date >= start && w.date <= end);
    let planned = null;
    if (Train.schedule()) {
      planned = 0;
      for (let i = 0; i < 7; i++) { const p = Train.plannedFor(U.addDays(start, i)); if (p && p !== 'rest') planned++; }
    }
    const byDay = {};
    S.entries.filter(e => e.date >= start && e.date <= end).forEach(e => {
      const v = Nutri.calc(e.food, e.grams);
      const d = byDay[e.date] || (byDay[e.date] = { kcal: 0, p: 0 });
      d.kcal += v.kcal; d.p += v.p;
    });
    const days = Object.values(byDay);
    const tr = Progress.trendSeries();
    const tNow = tr.length ? Progress.trendAt(tr, end) : null;
    const tThen = tr.length ? Progress.trendAt(tr, U.addDays(end, -7)) : null;
    return {
      workouts: ws.length, planned,
      sets: ws.reduce((a, w) => a + Train.setCount(w), 0),
      prs: ws.reduce((a, w) => a + Train.prCount(w), 0),
      logged: days.length,
      kcal: days.length ? days.reduce((a, d) => a + d.kcal, 0) / days.length : 0,
      prot: days.length ? days.reduce((a, d) => a + d.p, 0) / days.length : 0,
      weightNow: tNow, weightDiff: tNow != null && tThen != null && tr.length > 1 ? tNow - tThen : null
    };
  },
  checkin() {
    const st = S.settings;
    const w = Progress.weekStats();
    const ex = Progress.expenditure();
    const pct = (v, g) => g ? Math.round(v / g * 100) : 0;
    let advice = '';
    if (w.weightDiff != null) {
      const d = w.weightDiff;
      if (st.goal === 'bulk') advice = d < 0.05 ? 'Dein Gewicht steigt kaum. Für Muskelaufbau etwas mehr essen.' : d > 0.5 ? 'Du nimmst schnell zu. Etwas weniger essen hält den Aufbau sauber.' : 'Gutes Aufbau-Tempo, weiter so.';
      else if (st.goal === 'cut') advice = d > -0.2 ? 'Die Diät stockt. Ein paar Kalorien weniger oder mehr Bewegung.' : d < -1 ? 'Du nimmst sehr schnell ab. Etwas mehr essen schützt deine Kraft.' : 'Gutes Diät-Tempo, weiter so.';
      else advice = Math.abs(d) < 0.3 ? 'Dein Gewicht ist stabil.' : 'Dein Gewicht bewegt sich. Prüfe deine Kalorien.';
    }
    let goalBtn = '';
    if (ex.tdee) {
      const g = calcGoals(Object.assign({}, st, { weight: Progress.latestWeight() || st.weight, tdeeOverride: ex.tdee }));
      if (Math.abs(g.kcal - st.kcal) >= 50) goalBtn = `<button class="btn primary block" data-act="tdee-apply" data-v="${ex.tdee}" style="margin-top:12px">Kalorienziel auf ${U.n(g.kcal)} kcal anpassen</button>`;
    }
    const sh = U.sheet({
      title: 'Wochen-Check-in',
      full: true,
      body: `<p class="hint" style="margin:-2px 2px 14px">Die letzten 7 Tage, ${U.fmtShort(U.addDays(U.today(), -6))} bis ${U.fmtShort(U.today())}</p>
        <div class="card">
          <div class="card-title">Training</div>
          <div class="kpi-row">
            <div class="kpi"><b>${w.workouts}${w.planned != null ? ' / ' + w.planned : ''}</b><span>Workouts${w.planned != null ? ' (geplant)' : ''}</span></div>
            <div class="kpi"><b>${w.sets}</b><span>Arbeitssätze, ${w.prs} ${w.prs === 1 ? 'Rekord' : 'Rekorde'}</span></div>
          </div>
        </div>
        <div class="card">
          <div class="card-title">Ernährung</div>
          <div class="kpi-row">
            <div class="kpi"><b>${w.logged ? U.n(w.kcal) : '–'}</b><span>Ø kcal (${pct(w.kcal, st.kcal)} % vom Ziel)</span></div>
            <div class="kpi"><b>${w.logged ? U.n(w.prot) + ' g' : '–'}</b><span>Ø Protein (${pct(w.prot, st.protein)} %)</span></div>
          </div>
          <p class="hint" style="margin:0">${w.logged} von 7 Tagen eingetragen.</p>
        </div>
        <div class="card">
          <div class="card-title">Gewicht & Verbrauch</div>
          <div class="kpi-row">
            <div class="kpi"><b>${w.weightNow != null ? U.n(w.weightNow, 1) + ' kg' : '–'}</b><span>Trendgewicht</span></div>
            <div class="kpi"><b>${w.weightDiff != null ? (w.weightDiff > 0 ? '+' : '') + U.n(w.weightDiff, 2) + ' kg' : '–'}</b><span>diese Woche</span></div>
          </div>
          ${ex.tdee ? `<p class="hint" style="margin:0">Dein echter Verbrauch: ${U.n(ex.tdee)} kcal pro Tag.</p>` : '<p class="hint" style="margin:0">Für die Verbrauchsberechnung brauchst du 2 Wochen Gewichts- und Essensdaten.</p>'}
          ${advice ? `<p style="margin:10px 0 0;font-weight:500">${advice}</p>` : ''}
          ${goalBtn}
        </div>
        <button class="btn block" data-close2 style="margin-top:4px">Fertig</button>`
    });
    sh.$('[data-close2]').onclick = () => sh.close();
    sh.body.addEventListener('click', e => { if (e.target.closest('[data-act=tdee-apply]')) setTimeout(() => sh.close(), 50); });
    S.meta.lastCheckin = U.today();
    Store.saveKV('meta');
    App.refresh();
  },

  weekly(n = 8) {
    const out = [];
    const cur = U.weekStart(U.today());
    const byDay = {};
    S.entries.forEach(e => {
      const v = Nutri.calc(e.food, e.grams);
      const d = byDay[e.date] || (byDay[e.date] = { kcal: 0, p: 0 });
      d.kcal += v.kcal; d.p += v.p;
    });
    for (let i = n - 1; i >= 0; i--) {
      const ws = U.addDays(cur, -7 * i);
      let kcal = 0, p = 0, days = 0;
      for (let k = 0; k < 7; k++) {
        const d = byDay[U.addDays(ws, k)];
        if (d) { kcal += d.kcal; p += d.p; days++; }
      }
      out.push({ label: 'KW ' + U.isoWeek(ws), kcal: days ? kcal / days : 0, p: days ? p / days : 0, current: i === 0 });
    }
    return out;
  },

  drawWeekly() {
    const w = Progress.weekly(8);
    const k = $('#ch-kcal'), p = $('#ch-prot');
    if (k) Charts.bars(k, w.map(x => ({ label: x.label, value: Math.round(x.kcal), dim: x.current })), { goal: S.settings.kcal, color: 'var(--accent)', emptyText: 'Noch keine Mahlzeiten eingetragen.', yFmt: v => v >= 1000 ? U.n(v / 1000, 1) + 'k' : U.n(v) });
    if (p) Charts.bars(p, w.map(x => ({ label: x.label, value: Math.round(x.p), dim: x.current })), { goal: S.settings.protein, color: 'var(--prot)', emptyText: 'Noch keine Mahlzeiten eingetragen.' });
  },

  drawStrength() {
    const el = $('#ch-str'); if (!el || !Progress.exId) return;
    const h = Train.history(Progress.exId).slice().reverse();
    const pts = h.map(x => ({ x: x.w.start, y: Math.max(...x.sets.map(s => Train.e1rm(s.w, s.r))) })).filter(p => p.y > 0);
    const b = Train.best(Progress.exId);
    const first = pts[0], last = pts[pts.length - 1];
    const st = $('#pr-stats');
    if (st) st.innerHTML = `<div class="stat-row" style="margin-top:0">
      <div class="stat"><b>${U.n(b.e1rm, 1)}</b><span>Bestes 1RM</span></div>
      <div class="stat"><b>${last ? U.n(last.y, 1) : '–'}</b><span>Letztes 1RM</span></div>
      <div class="stat"><b>${first && last && pts.length > 1 ? (last.y >= first.y ? '+' : '') + U.n((last.y / first.y - 1) * 100) + ' %' : '–'}</b><span>Seit Beginn</span></div>
    </div>`;
    Charts.line(el, [{ points: pts, color: 'var(--accent)' }], { yFmt: v => U.n(v), tipFmt: p => U.fmtShort(U.key(new Date(p.x))) + ': ' + U.n(p.y, 1) + ' kg' });
  },

  bind() {
    Object.assign(App.actions, {
      'weight-save': () => {
        const kg = U.parseNum($('#pw-kg').value);
        const d = $('#pw-date').value || U.today();
        if (!(kg > 20 && kg < 400)) { U.toast('Bitte ein gültiges Gewicht eingeben', 'err'); return; }
        Store.put('weights', { id: d > U.today() ? U.today() : d, kg: Math.round(kg * 10) / 10 });
        if (d >= (Progress.weightsSorted().slice(-1)[0] || { id: '' }).id) { S.settings.weight = Math.round(kg * 10) / 10; Store.saveKV('settings'); }
        U.toast('Gewicht gespeichert', 'ok');
        Progress.render();
      },
      'weight-del': async el => {
        if (await U.confirm('Diesen Gewichtseintrag löschen?')) { Store.del('weights', el.dataset.id); Progress.render(); }
      },
      'weight-all': () => { Progress.showAll = !Progress.showAll; Progress.render(); },
      'tdee-apply': el => {
        const st = S.settings;
        const g = calcGoals(Object.assign({}, st, { weight: Progress.latestWeight() || st.weight, tdeeOverride: +el.dataset.v }));
        Object.assign(st, { kcal: g.kcal, protein: g.protein, carbs: g.carbs, fat: g.fat });
        Store.saveKV('settings');
        U.haptic();
        U.toast(`Neues Ziel: ${U.n(g.kcal)} kcal`, 'ok');
        Progress.render();
      },
      'w-range': el => {
        Progress.range = el.dataset.r;
        $$('[data-act=w-range]').forEach(c => c.classList.toggle('on', c === el));
        Progress.drawWeight();
      }
    });
  }
};
