/* =========================================================
   app.js – Start, Tabs, Startseite „Heute“, Updates
   ========================================================= */
'use strict';

const App = {
  tab: 'today',
  actions: {},
  reg: null,
  lastToday: U.today(),

  go(tab) {
    if (App.tab === tab) {
      const v = $('#view-' + tab);
      if (v.scrollTop > 0) { v.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    }
    App.tab = tab;
    $$('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    $$('.view').forEach(v => v.classList.toggle('active', v.dataset.view === tab));
    App.renderTab(tab);
  },
  renderTab(tab) {
    try {
      if (tab === 'today') App.renderToday();
      if (tab === 'food') Nutri.render();
      if (tab === 'train') Train.render();
      if (tab === 'progress') Progress.render();
      if (tab === 'settings') Settings.render();
    } catch (e) {
      console.error(e);
      $('#view-' + tab).innerHTML = `<div class="empty">Fehler beim Anzeigen: ${U.esc(e.message)}</div>`;
    }
  },
  refresh() {
    App.renderTab(App.tab);
    App.updateBackupDot();
    Train.updatePill();
  },

  needsBackup() {
    const hasData = S.entries.length || S.workouts.length || S.weights.length || S.foods.length;
    if (!hasData) return false;
    const ref = S.meta.lastBackup || S.meta.installedAt || Date.now();
    return Date.now() - ref > 7 * 86400000;
  },
  applyAccent() {
    // Nicht mehr angebotene Farben (aus älteren Versionen) fallen auf iOS-Blau zurück
    const ok = ACCENTS.some(a => a[0] === S.settings.accent);
    document.documentElement.dataset.accent = ok ? S.settings.accent : 'blue';
  },
  updateBackupDot() { $('#settings-dot').hidden = !App.needsBackup(); },

  isIOS() { return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); },
  isStandalone() { return window.navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches); },

  mealByTime() {
    const h = new Date().getHours() + new Date().getMinutes() / 60;
    if (h < 10.5) return 'breakfast';
    if (h >= 11.5 && h < 15) return 'lunch';
    if (h >= 17.5 && h < 21.5) return 'dinner';
    return 'snacks';
  },

  /* ---------- Startseite ---------- */
  renderToday() {
    const el = $('#view-today');
    const day = U.today();
    const st = S.settings;
    const t = Nutri.totals(day);
    const streak = Nutri.streak();
    const rest = st.kcal - t.kcal;
    const over = t.kcal > st.kcal * 1.05;

    const big = U.ring(212, 20, t.kcal / st.kcal, over ? 'var(--over)' : 'var(--accent)', `
      <div class="v" data-count="${Math.round(Math.abs(rest))}">${U.n(Math.abs(rest))}</div>
      <div class="l">${rest >= 0 ? 'kcal übrig' : 'kcal über Ziel'}</div>
      <div class="s">${U.n(t.kcal)} von ${U.n(st.kcal)}</div>`);
    const mr = (v, goal, color, name) => `<div class="macro-ring">
      ${U.ring(92, 9, v / goal, color, `<div class="v" data-count="${Math.round(v)}">${U.n(v)}</div><div class="l">g</div>`)}
      <div class="name">${name}</div><div class="goal">Ziel ${goal} g</div></div>`;

    // Training heute
    const todays = S.workouts.filter(w => w.date === day);
    let train;
    if (S.active) {
      train = `<div class="card">
        <div style="display:flex;align-items:center;gap:12px">
          <div style="flex:1"><div class="card-sub">Training läuft</div><div class="card-title" style="font-size:20px">${U.esc(S.active.name)}</div></div>
          <button class="btn primary small" data-act="open-workout">Weiter</button>
        </div></div>`;
    } else if (todays.length) {
      train = todays.map(w => `<button class="card" data-act="wo-detail" data-id="${w.id}" style="display:block;width:100%;text-align:left">
        <div class="card-sub">Heute trainiert</div>
        <div class="card-title" style="font-size:20px">${U.esc(w.name)} ${Train.prCount(w) ? `<span class="pr-badge">${Train.prCount(w)} PR</span>` : ''}</div>
        <div class="stat-row" style="margin-bottom:0">
          <div class="stat"><b>${U.fmtMin(w.end - w.start)}</b><span>Dauer</span></div>
          <div class="stat"><b>${Train.setCount(w)}</b><span>Sätze</span></div>
          <div class="stat"><b>${U.n(Train.volume(w))}</b><span>kg Volumen</span></div>
        </div></button>`).join('');
    } else {
      const next = Train.nextTemplate();
      train = `<div class="card">
        <div style="display:flex;align-items:center;gap:12px">
          <div style="flex:1;min-width:0"><div class="card-sub">Heute dran</div>
            <div class="card-title" style="font-size:20px">${next ? U.esc(next.name) : 'Freies Workout'}</div>
            ${next ? `<div class="card-sub" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${next.exercises.length} Übungen</div>` : ''}</div>
          <button class="btn primary small" data-act="start" data-id="${next ? next.id : ''}">${U.icon.play} Starten</button>
        </div></div>`;
    }

    const showInstall = App.isIOS() && !App.isStandalone() && !S.meta.hideInstall;
    const now = new Date();

    el.innerHTML = `
      <div class="page-head">
        <div><h1 class="page-title">Heute</h1><div class="page-sub">${U.WD[now.getDay()].replace('.', '')}, ${now.getDate()}. ${U.MON[now.getMonth()]}</div></div>
        <div class="streak ${streak.n ? '' : 'cold'}" title="Tage in Folge getrackt">${U.icon.flame}${streak.n} ${streak.n === 1 ? 'Tag' : 'Tage'}</div>
      </div>
      ${showInstall ? `<div class="inline-banner"><div class="txt"><b>Als App installieren</b>Tippe unten in Safari auf „Teilen“ und dann auf „Zum Home-Bildschirm“.</div><button class="icon-btn plain" data-act="hide-install" aria-label="Ausblenden">${U.icon.close}</button></div>` : ''}
      ${App.needsBackup() ? `<div class="inline-banner"><div class="txt"><b>Backup fällig</b>${S.meta.lastBackup ? 'Dein letztes Backup ist älter als 7 Tage.' : 'Sichere deine Daten einmal pro Woche.'}</div><button class="btn small primary" data-act="backup">Sichern</button></div>` : ''}
      <div class="hero-rings">
        ${big}
        <div class="macro-rings">
          ${mr(t.p, st.protein, 'var(--prot)', 'Protein')}
          ${mr(t.c, st.carbs, 'var(--carb)', 'Kohlenhydrate')}
          ${mr(t.f, st.fat, 'var(--fat)', 'Fett')}
        </div>
      </div>
      <button class="btn primary block" data-act="quick-add" style="margin:18px 0 12px">${U.icon.plus} Essen eintragen</button>
      ${train}
      ${Nutri.waterCard(day)}
      ${streak.n && !streak.today ? `<p class="hint" style="text-align:center">Trag heute etwas ein, damit deine Serie von ${streak.n} ${streak.n === 1 ? 'Tag' : 'Tagen'} weiterläuft.</p>` : ''}
    `;
    U.animateRings(el);
    // Zahlen nur beim ersten Öffnen hochzählen lassen
    if (!App._counted) { App._counted = true; U.countUp(el); }
    else $$('[data-count]', el).forEach(x => x.removeAttribute('data-count'));
  },

  /* ---------- Service Worker & Updates ---------- */
  async registerSW() {
    if (!('serviceWorker' in navigator)) return;
    const hadController = !!navigator.serviceWorker.controller;
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if ((!hadController && !App.updating) || reloading) return;
      reloading = true;
      location.reload();
    });
    try {
      const reg = await navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' });
      App.reg = reg;
      // Update wartet schon beim Start → sofort aktivieren
      if (reg.waiting && hadController) { reg.waiting.postMessage({ type: 'SKIP_WAITING' }); return; }
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) App.showUpdate(nw);
        });
      });
      const check = () => reg.update().catch(() => {});
      document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
      setInterval(check, 30 * 60 * 1000);
    } catch (e) {
      console.warn('Service Worker nicht registriert', e);
    }
  },
  showUpdate(worker) {
    const area = $('#banner-area');
    area.innerHTML = `<div class="banner"><div class="txt"><b>Neue Version verfügbar</b>Deine Daten bleiben erhalten.</div>
      <button class="btn small primary" id="upd-btn">Aktualisieren</button></div>`;
    $('#upd-btn').onclick = () => {
      $('#upd-btn').textContent = 'Lädt …';
      App.updating = true;
      worker.postMessage({ type: 'SKIP_WAITING' });
      setTimeout(() => location.reload(), 3000);
    };
  },

  /* ---------- Start ---------- */
  bind() {
    $('#tabbar').addEventListener('click', e => {
      const b = e.target.closest('[data-tab]');
      if (b) App.go(b.dataset.tab);
    });
    document.addEventListener('click', e => {
      const el = e.target.closest('[data-act]');
      if (!el || el.disabled) return;
      const fn = App.actions[el.dataset.act];
      if (fn) fn(el, e);
    });
    Object.assign(App.actions, {
      'go': el => App.go(el.dataset.tab),
      'quick-add': () => Nutri.openPicker({ mode: 'log', meal: App.mealByTime(), day: U.today() }),
      'add-food': el => Nutri.openPicker({ mode: 'log', meal: el.dataset.meal, day: Nutri.day }),
      'copy-meal': el => Nutri.copyMeal(el.dataset.meal),
      'edit-entry': el => Nutri.editEntry(el.dataset.id),
      'water': el => {
        const d = +el.dataset.d * (S.settings.glass || 250);
        Nutri.addWater(el.dataset.day, d);
        App.refresh();
      },
      'day': el => {
        const nd = U.addDays(Nutri.day, +el.dataset.d);
        if (nd > U.today()) return;
        Nutri.day = nd;
        Nutri.render();
      },
      'hide-install': () => { S.meta.hideInstall = true; Store.saveKV('meta'); App.refresh(); }
    });
    Train.bind();
    Progress.bind();
    Settings.bind();

    // Tageswechsel, während die App offen bleibt
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) return;
      const t = U.today();
      if (t !== App.lastToday) {
        if (Nutri.day === App.lastToday) Nutri.day = t;
        App.lastToday = t;
        App.refresh();
      }
    });
  },

  async init() {
    try {
      await Store.load();
    } catch (e) {
      console.error(e);
      document.body.innerHTML = `<div style="padding:60px 24px;text-align:center;color:#F1EFEA;font-family:-apple-system,sans-serif">
        <h2>Daten konnten nicht geladen werden</h2><p style="color:#8E95A3">${U.esc(e.message || e)}</p>
        <p style="color:#8E95A3">Schließe die App komplett und öffne sie erneut.</p></div>`;
      return;
    }
    App.applyAccent();
    App.bind();
    App.go('today');
    Train.resume();
    App.updateBackupDot();
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    App.registerSW();
    const sp = $('#splash');
    if (sp) setTimeout(() => { sp.classList.add('out'); setTimeout(() => { sp.hidden = true; }, 600); }, 450);
  }
};

App.init();
