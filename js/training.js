/* =========================================================
   training.js – Vorlagen, Rotation, laufendes Workout,
   Pausen-Timer, Bestleistungen (PRs), Verlauf
   ========================================================= */
'use strict';

const Train = {
  clock: null,
  restTimer: null,
  restNotified: false,
  saveSoon: null,

  /* ---------- Helfer ---------- */
  ex(id) { return S.exercises.find(e => e.id === id); },
  exName(id, fallback) { const e = Train.ex(id); return e ? e.name : (fallback || 'Übung'); },
  tpls() { return S.templates.slice().sort((a, b) => (a.order || 0) - (b.order || 0)); },
  e1rm(w, r) {
    w = +w || 0; r = +r || 0;
    if (w <= 0 || r <= 0) return 0;
    return r === 1 ? w : w * (1 + r / 30);
  },
  workoutsSorted() { return S.workouts.slice().sort((a, b) => b.start - a.start); },
  history(exId) {
    const out = [];
    Train.workoutsSorted().forEach(w => {
      w.exercises.forEach(x => { if (x.exId === exId && x.sets.length) out.push({ w, sets: x.sets }); });
    });
    return out;
  },
  lastSets(exId) {
    const h = Train.history(exId);
    return h.length ? h[0].sets : [];
  },
  best(exId) {
    const b = { e1rm: 0, maxW: 0, reps0: 0, count: 0, bestSet: null };
    Train.history(exId).forEach(h => {
      b.count++;
      h.sets.forEach(s => {
        const e = Train.e1rm(s.w, s.r);
        if (e > b.e1rm) { b.e1rm = e; b.bestSet = s; }
        if ((+s.w || 0) > b.maxW) b.maxW = +s.w;
        if (!(+s.w) && (+s.r || 0) > b.reps0) b.reps0 = +s.r;
      });
    });
    return b;
  },
  setStr(s) {
    if (!s) return '–';
    const w = +s.w || 0;
    return (w ? U.n(w, 2) : 'KG') + ' × ' + (s.r || 0);
  },
  volume(w) {
    let v = 0;
    w.exercises.forEach(x => x.sets.forEach(s => { v += (+s.w || 0) * (+s.r || 0); }));
    return v;
  },
  setCount(w) { return w.exercises.reduce((a, x) => a + x.sets.length, 0); },
  prCount(w) { return w.exercises.reduce((a, x) => a + x.sets.filter(s => s.pr).length, 0); },

  nextTemplate() {
    const t = Train.tpls();
    if (!t.length) return null;
    const last = Train.workoutsSorted().find(w => w.templateId && t.some(x => x.id === w.templateId));
    if (!last) return t[0];
    const i = t.findIndex(x => x.id === last.templateId);
    return t[(i + 1) % t.length];
  },

  /* ---------- Ansicht ---------- */
  render() {
    const el = $('#view-train');
    const next = Train.nextTemplate();
    const ws = Train.workoutsSorted();
    const weekStart = U.weekStart(U.today());
    const thisWeek = ws.filter(w => w.date >= weekStart).length;
    const tpls = Train.tpls();

    let hero;
    if (S.active) {
      hero = `<div class="next-card">
        <div class="eyebrow">Läuft gerade</div>
        <h2>${U.esc(S.active.name)}</h2>
        <div class="ex-list">Seit ${U.fmtMin(Date.now() - S.active.start)}, ${S.active.exercises.reduce((a, x) => a + x.sets.filter(s => s.done).length, 0)} Sätze erledigt</div>
        <button class="btn primary block" data-act="open-workout">Weiter trainieren</button>
      </div>`;
    } else if (next) {
      hero = `<div class="next-card">
        <div class="eyebrow">Als Nächstes in deiner Rotation</div>
        <h2>${U.esc(next.name)}</h2>
        <div class="ex-list">${next.exercises.map(x => U.esc(Train.exName(x.exId))).join(', ') || 'Noch keine Übungen'}</div>
        <button class="btn primary block" data-act="start" data-id="${next.id}">${U.icon.play} ${U.esc(next.name)} starten</button>
        <div class="chips" style="margin-top:12px">
          ${tpls.filter(t => t.id !== next.id).map(t => `<button class="chip" data-act="start" data-id="${t.id}">${U.esc(t.name)}</button>`).join('')}
          <button class="chip" data-act="start" data-id="">Freies Workout</button>
        </div>
      </div>`;
    } else {
      hero = `<div class="next-card"><h2>Los geht's</h2><div class="ex-list">Lege eine Vorlage an oder starte ein freies Workout.</div>
        <button class="btn primary block" data-act="start" data-id="">Freies Workout starten</button></div>`;
    }

    el.innerHTML = `
      <div class="page-head">
        <div><h1 class="page-title">Training</h1><div class="page-sub">${thisWeek === 1 ? '1 Workout' : thisWeek + ' Workouts'} diese Woche</div></div>
      </div>
      ${hero}
      <div class="section-title">Vorlagen <button class="link" data-act="tpl-new">Neue Vorlage</button></div>
      <div class="list">
        ${tpls.map(t => `<div class="list-item">
          <button class="li-main" style="text-align:left" data-act="tpl-edit" data-id="${t.id}">
            <div class="li-title">${U.esc(t.name)}</div>
            <div class="li-sub">${t.exercises.length} Übungen</div>
          </button>
          <button class="icon-btn" data-act="start" data-id="${t.id}" aria-label="${U.esc(t.name)} starten">${U.icon.play}</button>
        </div>`).join('') || '<div class="empty">Noch keine Vorlagen.</div>'}
      </div>
      <div class="section-title">Übungen <button class="link" data-act="ex-new">Neue Übung</button></div>
      <button class="list-item list" data-act="ex-browse" style="border-radius:var(--r-md)">
        <div class="li-main"><div class="li-title">Alle Übungen</div><div class="li-sub">${S.exercises.length} Übungen, Bestleistungen und Verlauf</div></div>${U.icon.chevron}
      </button>
      <div class="section-title">Verlauf</div>
      <div class="list" id="hist-list">
        ${ws.slice(0, Train.histLimit || 15).map(w => Train.histItem(w)).join('') || '<div class="empty">Noch keine Workouts. Dein erstes erscheint hier.</div>'}
      </div>
      ${ws.length > (Train.histLimit || 15) ? '<button class="btn block" data-act="hist-more">Mehr anzeigen</button>' : ''}
    `;
  },
  histItem(w) {
    const pr = Train.prCount(w);
    return `<button class="list-item" data-act="wo-detail" data-id="${w.id}">
      <div class="li-main"><div class="li-title">${U.esc(w.name)}${pr ? `<span class="pr-badge">${pr} PR</span>` : ''}</div>
      <div class="li-sub">${U.fmtDay(w.date)}, ${U.fmtMin((w.end || w.start) - w.start)}</div></div>
      <div class="li-end"><div class="big">${U.n(Train.volume(w))}</div><div class="small">kg Volumen</div></div>
    </button>`;
  },

  /* ---------- Workout starten ---------- */
  async start(tplId) {
    if (S.active) {
      if (!(await U.confirm('Es läuft bereits ein Workout. Möchtest du es verwerfen und ein neues starten?', { ok: 'Verwerfen', title: 'Workout läuft' }))) {
        Train.open(); return;
      }
    }
    const t = tplId ? S.templates.find(x => x.id === tplId) : null;
    S.active = {
      id: U.uid(),
      templateId: t ? t.id : null,
      name: t ? t.name : 'Freies Workout',
      start: Date.now(),
      restEnd: null, restTotal: 0,
      exercises: t ? t.exercises.filter(x => Train.ex(x.exId)).map(x => Train.newExercise(x.exId, x.sets, x.reps)) : []
    };
    Store.saveKV('active');
    U.unlockAudio();
    Train.open();
    App.refresh();
    if (!t) setTimeout(() => Train.addExercise(), 450);
  },
  newExercise(exId, sets, reps) {
    const last = Train.lastSets(exId);
    const n = Math.max(1, sets || last.length || 3);
    const arr = [];
    for (let i = 0; i < n; i++) arr.push({ w: null, r: null, done: false, pr: false });
    return { exId, name: Train.exName(exId), reps: reps || '', sets: arr };
  },

  /* ---------- Workout-Bildschirm ---------- */
  open() {
    if (!S.active) return;
    const scr = $('#workout-screen');
    scr.hidden = false;
    Train.renderWorkout();
    void scr.offsetWidth; // Layout erzwingen, damit die Einblend-Animation startet
    scr.classList.add('open');
    Train.startClock();
    Train.updatePill();
    Train.updateRestBar();
  },
  minimize() {
    const scr = $('#workout-screen');
    if (document.activeElement) document.activeElement.blur();
    scr.classList.remove('open');
    setTimeout(() => { if (!scr.classList.contains('open')) scr.hidden = true; }, 420);
    Train.updatePill();
    Train.updateRestBar();
    App.refresh();
  },
  isOpen() { return $('#workout-screen').classList.contains('open'); },

  placeholder(ex, si) {
    const last = Train.lastSets(ex.exId);
    if (last[si]) return { w: last[si].w, r: last[si].r };
    for (let k = si - 1; k >= 0; k--) {
      const prev = ex.sets[k];
      if (prev.w != null || prev.r != null) return { w: prev.w, r: prev.r };
    }
    if (last.length) return { w: last[last.length - 1].w, r: last[last.length - 1].r };
    return null;
  },

  exCard(ei) {
    const a = S.active, ex = a.exercises[ei];
    const last = Train.lastSets(ex.exId);
    const target = ex.reps ? `Ziel: ${ex.sets.length} × ${U.esc(ex.reps)} Wdh.` : `${ex.sets.length} Sätze`;
    const rows = ex.sets.map((s, si) => {
      const ph = Train.placeholder(ex, si) || {};
      const prev = last[si] ? Train.setStr(last[si]) : '–';
      return `<div class="set-grid set-row ${s.done ? 'done' : ''}" data-row="${ei}-${si}">
        <div class="set-no">${si + 1}${s.pr ? '<span class="pr-badge">PR</span>' : ''}</div>
        <div class="set-prev">${prev}</div>
        <input class="set-in" data-ei="${ei}" data-si="${si}" data-k="w" inputmode="decimal" autocomplete="off"
          value="${s.w != null ? U.n(s.w, 2).replace(/\./g, '') : ''}" placeholder="${ph.w != null ? U.n(ph.w, 2).replace(/\./g, '') : 'kg'}">
        <input class="set-in" data-ei="${ei}" data-si="${si}" data-k="r" inputmode="numeric" pattern="[0-9]*" autocomplete="off"
          value="${s.r != null ? s.r : ''}" placeholder="${ph.r != null ? ph.r : 'Wdh'}">
        <button class="set-check" data-act="set-done" data-ei="${ei}" data-si="${si}" aria-label="Satz erledigt">${U.icon.check}</button>
      </div>`;
    }).join('');
    return `<div class="ex-card" data-card="${ei}">
      <div class="ex-head">
        <div class="t"><b>${U.esc(ex.name)}</b><span>${target}${last.length ? '' : ', erstes Mal'}</span></div>
        <button class="icon-btn plain" data-act="ex-menu" data-ei="${ei}" aria-label="Optionen">${U.icon.more}</button>
      </div>
      <div class="set-grid head"><div>Satz</div><div>Letztes Mal</div><div>kg</div><div>Wdh.</div><div></div></div>
      ${rows}
      <div class="ex-actions">
        <button class="btn" data-act="set-add" data-ei="${ei}">${U.icon.plus} Satz</button>
        <button class="btn" data-act="set-rm" data-ei="${ei}" ${ex.sets.length <= 1 ? 'disabled' : ''}>${U.icon.minus} Satz</button>
      </div>
    </div>`;
  },

  renderWorkout() {
    const a = S.active;
    if (!a) return;
    const scr = $('#workout-screen');
    const top = scr.scrollTop;
    scr.innerHTML = `
      <div class="ws-head">
        <button class="icon-btn" data-act="ws-min" aria-label="Minimieren">${U.icon.down}</button>
        <div class="t"><b data-act="ws-rename">${U.esc(a.name)}</b><span id="ws-clock">${U.fmtDur(Date.now() - a.start)}</span></div>
        <button class="btn primary small" data-act="ws-finish">Beenden</button>
      </div>
      <div class="ws-body">
        ${a.exercises.map((x, i) => Train.exCard(i)).join('') || '<div class="empty">Füge deine erste Übung hinzu.</div>'}
        <button class="btn block" data-act="ws-add-ex" style="margin-bottom:12px">${U.icon.plus} Übung hinzufügen</button>
        <button class="btn danger block" data-act="ws-cancel">Workout verwerfen</button>
      </div>`;
    scr.scrollTop = top;
  },
  rerenderCard(ei) {
    const card = $(`#workout-screen [data-card="${ei}"]`);
    if (!card) { Train.renderWorkout(); return; }
    const tmp = document.createElement('div');
    tmp.innerHTML = Train.exCard(ei);
    card.replaceWith(tmp.firstElementChild);
  },

  saveActive() {
    clearTimeout(Train.saveSoon);
    Train.saveSoon = setTimeout(() => Store.saveKV('active'), 300);
  },

  onInput(inp) {
    const a = S.active; if (!a) return;
    const ex = a.exercises[+inp.dataset.ei]; if (!ex) return;
    const s = ex.sets[+inp.dataset.si]; if (!s) return;
    const v = U.parseNum(inp.value);
    if (inp.dataset.k === 'w') s.w = isNaN(v) ? null : v;
    else s.r = isNaN(v) ? null : Math.round(v);
    Train.saveActive();
  },

  toggleSet(ei, si) {
    const a = S.active;
    const ex = a.exercises[ei], s = ex.sets[si];
    U.unlockAudio();
    if (s.done) {
      s.done = false; s.pr = false;
      Store.saveKV('active');
      Train.rerenderCard(ei);
      return;
    }
    const ph = Train.placeholder(ex, si) || {};
    if (s.w == null && ph.w != null) s.w = ph.w;
    if (s.r == null && ph.r != null) s.r = ph.r;
    if (s.r == null || s.r <= 0) { U.toast('Bitte Wiederholungen eingeben', 'err'); return; }
    if (s.w == null) s.w = 0;
    s.done = true;

    // Bestleistung prüfen
    const b = Train.best(ex.exId);
    let pr = null;
    if (b.count) {
      const others = ex.sets.filter((x, i) => i !== si && x.done);
      const sessE = Math.max(0, ...others.map(x => Train.e1rm(x.w, x.r)));
      const sessW = Math.max(0, ...others.map(x => +x.w || 0));
      const sessR0 = Math.max(0, ...others.filter(x => !(+x.w)).map(x => +x.r || 0));
      const e = Train.e1rm(s.w, s.r);
      if (s.w > 0) {
        if (s.w > Math.max(b.maxW, sessW)) pr = 'weight';
        else if (e > Math.max(b.e1rm, sessE) + 0.01) pr = 'e1rm';
      } else if (s.r > Math.max(b.reps0, sessR0) && b.maxW === 0) pr = 'reps';
    }
    s.pr = !!pr;
    Store.saveKV('active');
    Train.rerenderCard(ei);
    if (pr) Train.celebrate(ex, s, pr);
    Train.startRest(S.settings.rest || 120);
  },

  celebrate(ex, s, type) {
    U.confetti();
    const pop = document.createElement('div');
    pop.className = 'pr-pop';
    const e = Train.e1rm(s.w, s.r);
    const sub = type === 'weight' ? 'Schwerstes Gewicht bisher' : type === 'reps' ? 'Meiste Wiederholungen bisher' : 'Bestes geschätztes 1RM';
    pop.innerHTML = `<div class="trophy">🏆</div><b>Neuer Rekord!</b><span>${U.esc(ex.name)}</span>
      <small>${Train.setStr(s)}${e ? ', 1RM ≈ ' + U.n(e, 1) + ' kg' : ''}</small><small>${sub}</small>`;
    document.body.appendChild(pop);
    setTimeout(() => pop.remove(), 2700);
  },

  /* ---------- Pausen-Timer ---------- */
  startRest(sec) {
    const a = S.active; if (!a) return;
    a.restTotal = sec;
    a.restEnd = Date.now() + sec * 1000;
    Train.restNotified = false;
    Store.saveKV('active');
    Train.updateRestBar();
  },
  adjustRest(d) {
    const a = S.active; if (!a || !a.restEnd) return;
    a.restEnd = Math.max(Date.now(), a.restEnd + d * 1000);
    a.restTotal = Math.max(5, (a.restTotal || 0) + d);
    if (a.restEnd > Date.now()) Train.restNotified = false;
    Store.saveKV('active');
    Train.tickRest();
  },
  skipRest() {
    const a = S.active; if (!a) return;
    a.restEnd = null;
    Store.saveKV('active');
    Train.updateRestBar();
  },
  restBarEl() {
    let bar = $('#rest-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'rest-bar';
      bar.className = 'rest-bar';
      bar.innerHTML = `<div class="rest-inner">
          <div><div class="rest-label" id="rest-label">Pause</div><div class="rest-time" id="rest-time">0:00</div></div>
          <div style="flex:1"></div>
          <button class="btn small" data-act="rest-adj" data-d="-15">−15</button>
          <button class="btn small" data-act="rest-adj" data-d="15">+15</button>
          <button class="btn small primary" data-act="rest-skip">Weiter</button>
        </div>
        <div class="rest-progress"><i id="rest-prog"></i></div>`;
      document.body.appendChild(bar);
    }
    return bar;
  },
  updateRestBar() {
    const a = S.active;
    const bar = Train.restBarEl();
    const show = !!(a && a.restEnd && Train.isOpen());
    bar.classList.toggle('show', show);
    clearInterval(Train.restTimer);
    if (a && a.restEnd) {
      Train.restTimer = setInterval(Train.tickRest, 250);
      Train.tickRest();
    }
  },
  tickRest() {
    const a = S.active;
    if (!a || !a.restEnd) { clearInterval(Train.restTimer); return; }
    const left = a.restEnd - Date.now();
    const t = $('#rest-time'), p = $('#rest-prog'), l = $('#rest-label');
    if (left > 0) {
      if (t) { t.textContent = U.fmtDur(left + 999); t.classList.remove('over'); }
      if (l) l.textContent = 'Pause';
      if (p) p.style.width = U.clamp(left / ((a.restTotal || 1) * 1000) * 100, 0, 100) + '%';
    } else {
      if (!Train.restNotified) {
        Train.restNotified = true;
        if (S.settings.sound !== false) U.beep(3);
        if (!document.hidden) U.toast('Pause vorbei – nächster Satz!', 'ok');
      }
      if (t) { t.textContent = '+' + U.fmtDur(-left); t.classList.add('over'); }
      if (l) l.textContent = 'Pause vorbei';
      if (p) p.style.width = '0%';
      if (-left > 5 * 60000) { Train.skipRest(); }
    }
    Train.updatePill();
  },

  /* ---------- Uhr & Mini-Leiste ---------- */
  startClock() {
    clearInterval(Train.clock);
    Train.clock = setInterval(() => {
      if (!S.active) { clearInterval(Train.clock); return; }
      const c = $('#ws-clock');
      if (c) c.textContent = U.fmtDur(Date.now() - S.active.start);
      Train.updatePill();
    }, 1000);
  },
  updatePill() {
    const pill = $('#workout-pill');
    const a = S.active;
    if (!a || Train.isOpen()) { pill.hidden = true; return; }
    pill.hidden = false;
    let txt = `<span class="live"></span>${U.esc(a.name)} ${U.fmtDur(Date.now() - a.start)}`;
    if (a.restEnd) {
      const left = a.restEnd - Date.now();
      txt += left > 0 ? `, Pause ${U.fmtDur(left + 999)}` : ', Pause vorbei';
    }
    pill.innerHTML = txt;
  },

  /* ---------- Übungen im Workout ---------- */
  addExercise() {
    Train.exercisePicker(exId => {
      if (!S.active) return;
      S.active.exercises.push(Train.newExercise(exId, 3, ''));
      Store.saveKV('active');
      Train.renderWorkout();
      setTimeout(() => {
        const cards = $$('#workout-screen .ex-card');
        const last = cards[cards.length - 1];
        if (last) last.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    });
  },
  exMenu(ei) {
    const a = S.active, ex = a.exercises[ei];
    const sh = U.sheet({
      title: U.esc(ex.name),
      body: `<div class="list">
        <button class="list-item" data-m="up" ${ei === 0 ? 'disabled style="opacity:.4"' : ''}><div class="li-main"><div class="li-title">Nach oben</div></div></button>
        <button class="list-item" data-m="down" ${ei === a.exercises.length - 1 ? 'disabled style="opacity:.4"' : ''}><div class="li-main"><div class="li-title">Nach unten</div></div></button>
        <button class="list-item" data-m="swap"><div class="li-main"><div class="li-title">Übung ersetzen</div></div></button>
        <button class="list-item" data-m="hist"><div class="li-main"><div class="li-title">Verlauf ansehen</div></div></button>
        <button class="list-item" data-m="rm"><div class="li-main"><div class="li-title" style="color:var(--danger)">Aus Workout entfernen</div></div></button>
      </div>`
    });
    sh.body.addEventListener('click', async e => {
      const b = e.target.closest('[data-m]');
      if (!b || b.disabled) return;
      const m = b.dataset.m;
      sh.close();
      if (m === 'up' || m === 'down') {
        const j = m === 'up' ? ei - 1 : ei + 1;
        [a.exercises[ei], a.exercises[j]] = [a.exercises[j], a.exercises[ei]];
      }
      if (m === 'rm') {
        if (ex.sets.some(s => s.done) && !(await U.confirm('Diese Übung hat schon erledigte Sätze. Trotzdem entfernen?', { ok: 'Entfernen' }))) return;
        a.exercises.splice(ei, 1);
      }
      if (m === 'swap') {
        Train.exercisePicker(exId => {
          a.exercises[ei] = Train.newExercise(exId, ex.sets.length, ex.reps);
          Store.saveKV('active'); Train.renderWorkout();
        });
        return;
      }
      if (m === 'hist') { Train.exerciseDetail(ex.exId); return; }
      Store.saveKV('active');
      Train.renderWorkout();
    });
  },

  /* ---------- Beenden / Verwerfen ---------- */
  async finish() {
    const a = S.active; if (!a) return;
    const done = a.exercises.map(x => ({ exId: x.exId, name: x.name, sets: x.sets.filter(s => s.done).map(s => ({ w: +s.w || 0, r: +s.r || 0, pr: !!s.pr })) }))
      .filter(x => x.sets.length);
    if (!done.length) {
      if (await U.confirm('Du hast noch keinen Satz abgehakt. Workout ohne Speichern verwerfen?', { ok: 'Verwerfen', title: 'Keine Sätze' })) Train.discard();
      return;
    }
    const open = a.exercises.reduce((n, x) => n + x.sets.filter(s => !s.done).length, 0);
    if (!(await U.confirm(open ? `${open} ${open === 1 ? 'Satz ist' : 'Sätze sind'} noch nicht abgehakt und ${open === 1 ? 'wird' : 'werden'} nicht gespeichert.` : 'Super Training! Jetzt speichern?', { ok: 'Speichern', danger: false, title: 'Workout beenden' }))) return;
    const w = { id: a.id, date: U.key(new Date(a.start)), start: a.start, end: Date.now(), templateId: a.templateId, name: a.name, exercises: done };
    Store.put('workouts', w);
    Train.discard(true);
    Train.summary(w);
  },
  discard(silent) {
    S.active = null;
    Store.saveKV('active');
    clearInterval(Train.clock);
    clearInterval(Train.restTimer);
    const scr = $('#workout-screen');
    scr.classList.remove('open');
    setTimeout(() => { if (!S.active) { scr.hidden = true; scr.innerHTML = ''; } }, 420);
    Train.restBarEl().classList.remove('show');
    Train.updatePill();
    if (!silent) U.toast('Workout verworfen');
    App.refresh();
  },
  summary(w) {
    const pr = Train.prCount(w);
    const sh = U.sheet({
      title: 'Workout gespeichert',
      body: `<div style="text-align:center;font-size:44px;margin:4px 0">${pr ? '🏆' : '💪'}</div>
        <div style="text-align:center;font-size:22px;font-weight:800">${U.esc(w.name)}</div>
        <div class="stat-row">
          <div class="stat"><b>${U.fmtMin(w.end - w.start)}</b><span>Dauer</span></div>
          <div class="stat"><b>${Train.setCount(w)}</b><span>Sätze</span></div>
          <div class="stat"><b>${U.n(Train.volume(w))}</b><span>kg Volumen</span></div>
        </div>
        ${pr ? `<p style="text-align:center;margin:0 0 14px;font-weight:700;color:var(--accent)">${pr} neue ${pr === 1 ? 'Bestleistung' : 'Bestleistungen'}!</p>` : ''}
        <button class="btn primary block" data-close2>Fertig</button>`
    });
    sh.$('[data-close2]').onclick = () => sh.close();
  },

  /* ---------- Übungsauswahl ---------- */
  exercisePicker(onPick, opts = {}) {
    const sh = U.sheet({
      title: opts.title || 'Übung wählen',
      full: true,
      body: `<div class="search-bar"><input class="input" id="ep-q" type="search" placeholder="Übung suchen" autocomplete="off"></div>
        <button class="btn block" data-new style="margin-bottom:12px">${U.icon.plus} Eigene Übung anlegen</button>
        <div id="ep-list"></div>`
    });
    const draw = () => {
      const q = U.norm(sh.$('#ep-q').value);
      const list = S.exercises.filter(e => !q || U.norm(e.name).includes(q)).sort((a, b) => a.name.localeCompare(b.name, 'de'));
      let html = '';
      MUSCLES.forEach(m => {
        const g = list.filter(e => (e.muscle || 'Sonstiges') === m);
        if (!g.length) return;
        html += `<div class="section-title" style="font-size:16px;margin-top:14px">${m}</div><div class="list">` +
          g.map(e => {
            const b = opts.browse ? Train.best(e.id) : null;
            return `<button class="list-item" data-id="${e.id}"><div class="li-main"><div class="li-title">${U.esc(e.name)}</div>
            ${b && b.count ? `<div class="li-sub">Bestes 1RM ≈ ${U.n(b.e1rm, 1)} kg, ${b.count}× trainiert</div>` : ''}</div>${U.icon.chevron}</button>`;
          }).join('') + '</div>';
      });
      const other = list.filter(e => !MUSCLES.includes(e.muscle || 'Sonstiges'));
      if (other.length) html += '<div class="list">' + other.map(e => `<button class="list-item" data-id="${e.id}"><div class="li-main"><div class="li-title">${U.esc(e.name)}</div></div></button>`).join('') + '</div>';
      sh.$('#ep-list').innerHTML = html || '<div class="empty">Keine Übung gefunden.</div>';
    };
    sh.$('#ep-q').addEventListener('input', draw);
    sh.body.addEventListener('click', e => {
      const b = e.target.closest('[data-id]');
      if (b) {
        if (opts.browse) { onPick(b.dataset.id); return; }
        sh.close(); onPick(b.dataset.id); return;
      }
      if (e.target.closest('[data-new]')) {
        Train.exerciseForm(null, ex => { draw(); if (!opts.browse) { sh.close(); onPick(ex.id); } });
      }
    });
    draw();
    return sh;
  },

  exerciseForm(existing, onSaved) {
    const ex = existing || {};
    const sh = U.sheet({
      title: existing ? 'Übung bearbeiten' : 'Neue Übung',
      body: `<label class="field"><span>Name</span><input class="input" id="ef-name" value="${U.esc(ex.name || '')}" placeholder="z. B. Cable Flys" autocomplete="off"></label>
        <label class="field"><span>Muskelgruppe</span><select class="input" id="ef-m">${MUSCLES.map(m => `<option ${m === (ex.muscle || 'Brust') ? 'selected' : ''}>${m}</option>`).join('')}</select></label>
        <button class="btn primary block" data-save>Speichern</button>
        ${existing && existing.custom ? '<button class="btn danger block" data-del style="margin-top:10px">Übung löschen</button>' : ''}`
    });
    if (!existing) setTimeout(() => sh.$('#ef-name').focus(), 400);
    sh.body.addEventListener('click', async e => {
      if (e.target.closest('[data-save]')) {
        const name = sh.$('#ef-name').value.trim();
        if (!name) { U.toast('Bitte einen Namen eingeben', 'err'); return; }
        const o = existing ? Object.assign({}, existing, { name, muscle: sh.$('#ef-m').value }) : { id: 'x:' + U.uid(), name, muscle: sh.$('#ef-m').value, custom: true };
        Store.put('exercises', o);
        sh.close();
        U.toast('Gespeichert', 'ok');
        if (onSaved) onSaved(o);
        App.refresh();
      }
      if (e.target.closest('[data-del]')) {
        if (await U.confirm(`„${U.esc(ex.name)}“ löschen? Dein Trainingsverlauf bleibt erhalten.`)) {
          Store.del('exercises', ex.id);
          S.templates.forEach(t => {
            const before = t.exercises.length;
            t.exercises = t.exercises.filter(x => x.exId !== ex.id);
            if (t.exercises.length !== before) Store.put('templates', t);
          });
          sh.close(); U.closeAllSheets(); App.refresh();
        }
      }
    });
  },

  exerciseDetail(exId) {
    const ex = Train.ex(exId);
    const h = Train.history(exId);
    const b = Train.best(exId);
    const sh = U.sheet({
      title: U.esc(ex ? ex.name : Train.exName(exId)),
      headRight: ex ? `<button class="icon-btn plain" data-edit aria-label="Bearbeiten">${U.icon.edit}</button>` : '',
      full: true,
      body: `<div class="stat-row">
          <div class="stat"><b>${b.e1rm ? U.n(b.e1rm, 1) : '–'}</b><span>Bestes 1RM (kg)</span></div>
          <div class="stat"><b>${b.maxW ? U.n(b.maxW, 2) : '–'}</b><span>Max. Gewicht</span></div>
          <div class="stat"><b>${b.count}</b><span>Einheiten</span></div>
        </div>
        <div class="card"><div class="card-title" style="margin-bottom:8px">Geschätztes 1RM</div><div id="ed-chart"></div></div>
        <div class="section-title" style="font-size:17px">Verlauf</div>
        <div class="list">${h.slice(0, 40).map(x => `<div class="list-item"><div class="li-main">
          <div class="li-title">${U.fmtDay(x.w.date)}</div>
          <div class="li-sub" style="white-space:normal">${x.sets.map(s => Train.setStr(s) + (s.pr ? ' 🏆' : '')).join(', ')}</div></div></div>`).join('') || '<div class="empty">Noch nicht trainiert.</div>'}</div>`
    });
    setTimeout(() => {
      const pts = h.map(x => ({ x: x.w.start, y: Math.max(...x.sets.map(s => Train.e1rm(s.w, s.r))) })).filter(p => p.y > 0);
      Charts.line(sh.$('#ed-chart'), [{ points: pts, color: 'var(--accent)' }], { yFmt: v => U.n(v), emptyText: 'Noch keine Daten mit Gewicht', tipFmt: p => U.fmtShort(U.key(new Date(p.x))) + ': ' + U.n(p.y, 1) + ' kg' });
    }, 60);
    const eb = sh.$('[data-edit]');
    if (eb) eb.onclick = () => Train.exerciseForm(ex, () => sh.close());
  },

  /* ---------- Vorlagen ---------- */
  templateEditor(tpl) {
    const isNew = !tpl;
    const t = tpl ? JSON.parse(JSON.stringify(tpl)) : { id: 't:' + U.uid(), name: '', order: Math.max(-1, ...S.templates.map(x => x.order || 0)) + 1, exercises: [] };
    const sh = U.sheet({
      title: isNew ? 'Neue Vorlage' : 'Vorlage bearbeiten',
      full: true,
      body: `<label class="field"><span>Name</span><input class="input" id="te-name" value="${U.esc(t.name)}" placeholder="z. B. Oberkörper" autocomplete="off"></label>
        <div class="section-title" style="font-size:17px">Übungen</div>
        <div class="card" style="padding:4px 12px" id="te-list"></div>
        <button class="btn block" data-a="add" style="margin-bottom:12px">${U.icon.plus} Übung hinzufügen</button>
        ${isNew ? '' : `<div class="btn-row" style="margin-bottom:12px">
          <button class="btn" data-a="earlier">Früher in Rotation</button>
          <button class="btn" data-a="later">Später in Rotation</button></div>
          <button class="btn danger block" data-a="del">Vorlage löschen</button>`}`,
      foot: '<button class="btn primary block" data-a="save">Speichern</button>'
    });
    const draw = () => {
      sh.$('#te-list').innerHTML = t.exercises.length ? `<div class="tpl-ex" style="font-size:12px;color:var(--muted);font-weight:700;padding-bottom:0"><div>Übung</div><div style="text-align:center">Sätze</div><div style="text-align:center">Wdh.</div><div style="width:106px"></div></div>` +
        t.exercises.map((x, i) => `<div class="tpl-ex">
          <div class="name">${U.esc(Train.exName(x.exId))}</div>
          <input class="input num" data-i="${i}" data-k="sets" inputmode="numeric" value="${x.sets}">
          <input class="input num" data-i="${i}" data-k="reps" value="${U.esc(x.reps || '')}" placeholder="8-12">
          <div class="ctrls">
            <button class="icon-btn" data-up="${i}" aria-label="Nach oben">${U.icon.up}</button>
            <button class="icon-btn" data-down="${i}" aria-label="Nach unten">${U.icon.down}</button>
            <button class="icon-btn" data-rm="${i}" aria-label="Entfernen">${U.icon.close}</button>
          </div></div>`).join('') : '<div class="empty">Noch keine Übungen.</div>';
    };
    sh.body.addEventListener('input', e => {
      const i = e.target.dataset.i;
      if (i == null) return;
      if (e.target.dataset.k === 'sets') { const n = parseInt(e.target.value, 10); t.exercises[+i].sets = n > 0 ? Math.min(n, 20) : 1; }
      else t.exercises[+i].reps = e.target.value.trim();
    });
    sh.el.addEventListener('click', async e => {
      const b = e.target.closest('[data-up],[data-down],[data-rm],[data-a]');
      if (!b) return;
      if (b.dataset.up != null) { const i = +b.dataset.up; if (i > 0) [t.exercises[i - 1], t.exercises[i]] = [t.exercises[i], t.exercises[i - 1]]; draw(); return; }
      if (b.dataset.down != null) { const i = +b.dataset.down; if (i < t.exercises.length - 1) [t.exercises[i + 1], t.exercises[i]] = [t.exercises[i], t.exercises[i + 1]]; draw(); return; }
      if (b.dataset.rm != null) { t.exercises.splice(+b.dataset.rm, 1); draw(); return; }
      const a = b.dataset.a;
      if (a === 'add') Train.exercisePicker(exId => { t.exercises.push({ exId, sets: 3, reps: '8-12' }); draw(); });
      if (a === 'earlier' || a === 'later') {
        const list = Train.tpls();
        const i = list.findIndex(x => x.id === t.id);
        const j = a === 'earlier' ? i - 1 : i + 1;
        if (i < 0 || j < 0 || j >= list.length) { U.toast(a === 'earlier' ? 'Ist schon an erster Stelle' : 'Ist schon an letzter Stelle'); return; }
        [list[i], list[j]] = [list[j], list[i]];
        list.forEach((x, k) => { x.order = k; Store.put('templates', x); });
        t.order = list.findIndex(x => x.id === t.id);
        U.toast('Reihenfolge: ' + list.map(x => x.name).join(', '));
        App.refresh();
      }
      if (a === 'del') {
        if (await U.confirm(`Vorlage „${U.esc(t.name)}“ löschen? Dein Trainingsverlauf bleibt erhalten.`)) {
          Store.del('templates', t.id); sh.close(); App.refresh();
        }
      }
      if (a === 'save') {
        t.name = sh.$('#te-name').value.trim();
        if (!t.name) { U.toast('Bitte einen Namen eingeben', 'err'); return; }
        const cur = S.templates.find(x => x.id === t.id);
        if (cur) t.order = cur.order;
        Store.put('templates', t);
        sh.close(); U.toast('Vorlage gespeichert', 'ok'); App.refresh();
      }
    });
    draw();
  },

  /* ---------- Verlauf ---------- */
  workoutDetail(id) {
    const w = S.workouts.find(x => x.id === id);
    if (!w) return;
    const sh = U.sheet({
      title: U.esc(w.name),
      full: true,
      body: `<div class="card-sub" style="margin:-4px 2px 4px">${U.fmtDate(w.date, true)}, ${new Date(w.start).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr</div>
        <div class="stat-row">
          <div class="stat"><b>${U.fmtMin((w.end || w.start) - w.start)}</b><span>Dauer</span></div>
          <div class="stat"><b>${Train.setCount(w)}</b><span>Sätze</span></div>
          <div class="stat"><b>${U.n(Train.volume(w))}</b><span>kg Volumen</span></div>
        </div>
        ${w.exercises.map(x => `<div class="card">
          <button class="card-title" data-ex="${x.exId}" style="text-align:left">${U.esc(x.name)}</button>
          ${x.sets.map((s, i) => `<div style="display:flex;justify-content:space-between;padding:6px 0;border-top:${i ? '1px solid var(--bg4)' : '0'}">
            <span style="color:var(--muted)">Satz ${i + 1}${s.pr ? ' <span class="pr-badge">PR</span>' : ''}</span>
            <span class="num" style="font-weight:700">${Train.setStr(s)}</span></div>`).join('')}
        </div>`).join('')}
        <button class="btn danger block" data-del>Workout löschen</button>`
    });
    sh.body.addEventListener('click', async e => {
      const ex = e.target.closest('[data-ex]');
      if (ex) { Train.exerciseDetail(ex.dataset.ex); return; }
      if (e.target.closest('[data-del]')) {
        if (await U.confirm('Dieses Workout wird dauerhaft gelöscht.')) {
          Store.del('workouts', w.id); sh.close(); U.toast('Workout gelöscht'); App.refresh();
        }
      }
    });
  },

  /* ---------- Aktionen ---------- */
  bind() {
    const scr = $('#workout-screen');
    scr.addEventListener('input', e => { if (e.target.classList.contains('set-in')) Train.onInput(e.target); });
    scr.addEventListener('focusin', e => { if (e.target.classList.contains('set-in')) setTimeout(() => e.target.select(), 0); });
    scr.addEventListener('keydown', e => {
      if (e.key === 'Enter' && e.target.classList.contains('set-in')) {
        const ins = $$('.set-in', scr);
        const i = ins.indexOf(e.target);
        if (ins[i + 1]) ins[i + 1].focus(); else e.target.blur();
      }
    });
    Object.assign(App.actions, {
      'start': el => Train.start(el.dataset.id || null),
      'open-workout': () => Train.open(),
      'ws-min': () => Train.minimize(),
      'ws-finish': () => Train.finish(),
      'ws-cancel': async () => { if (await U.confirm('Das laufende Workout wird nicht gespeichert.', { ok: 'Verwerfen', title: 'Workout verwerfen?' })) Train.discard(); },
      'ws-add-ex': () => Train.addExercise(),
      'ws-rename': () => {
        const sh = U.sheet({ title: 'Workout umbenennen', body: `<label class="field"><input class="input" id="rn" value="${U.esc(S.active.name)}"></label><button class="btn primary block" id="rn-ok">Speichern</button>` });
        sh.$('#rn-ok').onclick = () => { const v = sh.$('#rn').value.trim(); if (v) { S.active.name = v; Store.saveKV('active'); Train.renderWorkout(); } sh.close(); };
      },
      'set-done': el => Train.toggleSet(+el.dataset.ei, +el.dataset.si),
      'set-add': el => {
        const ex = S.active.exercises[+el.dataset.ei];
        ex.sets.push({ w: null, r: null, done: false, pr: false });
        Store.saveKV('active'); Train.rerenderCard(+el.dataset.ei);
      },
      'set-rm': el => {
        const ex = S.active.exercises[+el.dataset.ei];
        if (ex.sets.length <= 1) return;
        let i = -1;
        for (let k = ex.sets.length - 1; k >= 0; k--) if (!ex.sets[k].done) { i = k; break; }
        if (i < 0) i = ex.sets.length - 1;
        ex.sets.splice(i, 1);
        Store.saveKV('active'); Train.rerenderCard(+el.dataset.ei);
      },
      'ex-menu': el => Train.exMenu(+el.dataset.ei),
      'rest-adj': el => Train.adjustRest(+el.dataset.d),
      'rest-skip': () => Train.skipRest(),
      'tpl-new': () => Train.templateEditor(null),
      'tpl-edit': el => Train.templateEditor(S.templates.find(t => t.id === el.dataset.id)),
      'ex-new': () => Train.exerciseForm(null),
      'ex-browse': () => Train.exercisePicker(id => Train.exerciseDetail(id), { browse: true, title: 'Übungen' }),
      'wo-detail': el => Train.workoutDetail(el.dataset.id),
      'hist-more': () => { Train.histLimit = (Train.histLimit || 15) + 30; Train.render(); }
    });
    $('#workout-pill').addEventListener('click', () => Train.open());
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && S.active) { Train.tickRest(); Train.updatePill(); const c = $('#ws-clock'); if (c) c.textContent = U.fmtDur(Date.now() - S.active.start); }
    });
  },

  resume() {
    // Nach einem Neustart der App: laufendes Workout wiederherstellen
    if (!S.active) return;
    Train.restNotified = !!(S.active.restEnd && S.active.restEnd < Date.now());
    Train.startClock();
    Train.updatePill();
    Train.updateRestBar();
  }
};
