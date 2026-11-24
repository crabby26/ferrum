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
            <div class="num" style="font-size:30px;font-weight:800;line-height:1">${last ? U.n(last.kg, 1) : '–'}<small style="font-size:15px;color:var(--muted)"> kg</small></div>
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
        <div class="legend"><span><i style="background:var(--accent)"></i>Gewicht</span><span><i style="background:var(--prot)"></i>7-Tage-Schnitt</span></div>
      </div>
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
    const ws = Progress.weightsSorted();
    const pts = ws.filter(w => w.id >= from).map(w => ({ x: U.parseKey(w.id).getTime(), y: w.kg }));
    // 7-Tage-Schnitt
    const avg = [];
    if (pts.length >= 4) {
      pts.forEach(p => {
        const win = ws.filter(w => { const t = U.parseKey(w.id).getTime(); return t <= p.x && t > p.x - 7 * 86400000; });
        avg.push({ x: p.x, y: win.reduce((a, w) => a + w.kg, 0) / win.length });
      });
    }
    const series = [{ points: pts, color: 'var(--accent)' }];
    if (avg.length) series.push({ points: avg, color: 'var(--prot)', dots: false, width: 2 });
    Charts.line(el, series, { yFmt: v => U.n(v, 1), emptyText: 'Trag dein Gewicht ein, um den Verlauf zu sehen.', tipFmt: p => U.fmtShort(U.key(new Date(p.x))) + ': ' + U.n(p.y, 1) + ' kg' });
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
      'w-range': el => {
        Progress.range = el.dataset.r;
        $$('[data-act=w-range]').forEach(c => c.classList.toggle('on', c === el));
        Progress.drawWeight();
      }
    });
  }
};
