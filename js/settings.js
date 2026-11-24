/* =========================================================
   settings.js – Ziele, Rechner, Training, Backup, App-Info
   ========================================================= */
'use strict';

const ACTIVITY = [
  [1.2, 'Kaum aktiv (Bürojob, kein Sport)'],
  [1.375, 'Leicht aktiv (1–2× Training pro Woche)'],
  [1.55, 'Mäßig aktiv (3–5× Training pro Woche)'],
  [1.725, 'Sehr aktiv (6–7× Training pro Woche)'],
  [1.9, 'Extrem aktiv (körperliche Arbeit + Training)']
];
const GOALS = [['bulk', 'Muskelaufbau'], ['keep', 'Halten'], ['cut', 'Diät']];

const Settings = {
  render() {
    const el = $('#view-settings');
    const st = S.settings;
    const lb = S.meta.lastBackup;
    const macroKcal = st.protein * 4 + st.carbs * 4 + st.fat * 9;
    const num = (id, val, label, unit, dec = 0) => `<label class="field"><span>${label}${unit ? ' (' + unit + ')' : ''}</span>
      <input class="input num" data-set="${id}" inputmode="${dec ? 'decimal' : 'numeric'}" value="${U.n(val, dec).replace(/\./g, '')}"></label>`;

    el.innerHTML = `
      <div class="page-head"><h1 class="page-title">Einstellungen</h1></div>
      ${App.needsBackup() ? `<div class="inline-banner"><div class="txt"><b>Zeit für ein Backup</b>${lb ? 'Dein letztes Backup ist älter als 7 Tage.' : 'Du hast noch nie ein Backup gemacht.'}</div><button class="btn small primary" data-act="backup">Sichern</button></div>` : ''}

      <div class="section-title" style="margin-top:0">Tagesziele</div>
      <div class="card">
        <div class="grid2">
          ${num('kcal', st.kcal, 'Kalorien', 'kcal')}
          ${num('protein', st.protein, 'Protein', 'g')}
          ${num('carbs', st.carbs, 'Kohlenhydrate', 'g')}
          ${num('fat', st.fat, 'Fett', 'g')}
        </div>
        <p class="hint" id="macro-hint">Deine Makros ergeben ${U.n(macroKcal)} kcal${Math.abs(macroKcal - st.kcal) > 50 ? ' – das weicht von deinem Kalorienziel ab.' : '.'}</p>
        <div class="grid2" style="margin-top:12px">
          ${num('waterGoal', st.waterGoal, 'Wasserziel', 'ml')}
          ${num('glass', st.glass, 'Glasgröße', 'ml')}
        </div>
      </div>

      <div class="section-title">Ziel-Rechner</div>
      <div class="card">
        <div class="grid3">
          ${num('height', st.height, 'Größe', 'cm')}
          ${num('weight', st.weight, 'Gewicht', 'kg', 1)}
          ${num('age', st.age, 'Alter', 'Jahre')}
        </div>
        <div class="field" style="margin-top:12px"><span>Geschlecht</span>
          <div class="seg" style="margin:0">${[['m', 'Männlich'], ['f', 'Weiblich']].map(s => `<button data-act="set-seg" data-k="sex" data-v="${s[0]}" class="${st.sex === s[0] ? 'on' : ''}">${s[1]}</button>`).join('')}</div>
        </div>
        <label class="field"><span>Aktivität</span>
          <select class="input" data-set="activity">${ACTIVITY.map(a => `<option value="${a[0]}" ${+st.activity === a[0] ? 'selected' : ''}>${a[1]}</option>`).join('')}</select>
        </label>
        <div class="field"><span>Ziel</span>
          <div class="seg" style="margin:0">${GOALS.map(g => `<button data-act="set-seg" data-k="goal" data-v="${g[0]}" class="${st.goal === g[0] ? 'on' : ''}">${g[1]}</button>`).join('')}</div>
        </div>
        <div id="calc-out"></div>
      </div>

      <div class="section-title">Training</div>
      <div class="card">
        <label class="field"><span>Standard-Pause zwischen Sätzen</span>
          <select class="input" data-set="rest">${[45, 60, 90, 120, 150, 180, 240, 300].map(s => `<option value="${s}" ${+st.rest === s ? 'selected' : ''}>${U.fmtDur(s * 1000)} min</option>`).join('')}</select>
        </label>
        <div style="display:flex;align-items:center;gap:12px">
          <div style="flex:1"><b>Ton am Ende der Pause</b><div class="hint" style="margin:2px 0 0">Bei eingeschaltetem Stummschalter ist der Ton nicht zu hören.</div></div>
          <label class="switch"><input type="checkbox" data-set="sound" ${st.sound !== false ? 'checked' : ''}><i></i></label>
        </div>
        <div style="display:flex;align-items:center;gap:12px;margin-top:14px">
          <div style="flex:1"><b>Haptisches Feedback</b><div class="hint" style="margin:2px 0 0">Kurzes Klopfen beim Abhaken und Eintragen (ab iOS 18).</div></div>
          <label class="switch"><input type="checkbox" data-set="haptics" ${st.haptics !== false ? 'checked' : ''}><i></i></label>
        </div>
        <button class="btn block" data-act="test-sound" style="margin-top:12px">Ton testen</button>
      </div>

      <div class="section-title">Daten & Backup</div>
      <div class="card">
        <div class="card-sub" style="margin-bottom:12px">${lb ? 'Letztes Backup: ' + U.fmtDate(U.key(new Date(lb)), true) : 'Noch kein Backup erstellt.'}
          Alle Daten liegen nur auf diesem iPhone. Sichere sie regelmäßig in der Dateien-App oder iCloud Drive.</div>
        <button class="btn primary block" data-act="backup" style="margin-bottom:10px">${U.icon.share} Backup exportieren</button>
        <button class="btn block" data-act="restore" style="margin-bottom:10px">${U.icon.import} Backup importieren</button>
        <button class="btn block" data-act="csv">Als Tabelle exportieren (CSV)</button>
        <p class="hint">Die Tabellen öffnest du mit Numbers oder Excel. Zum Wiederherstellen brauchst du das Backup.</p>
        <input type="file" id="restore-file" hidden>
      </div>
      <div class="card">
        <div class="card-sub" style="margin-bottom:10px">${S.entries.length} Mahlzeiten-Einträge, ${S.workouts.length} Workouts, ${S.weights.length} Gewichtseinträge, ${S.foods.length} eigene Lebensmittel und Rezepte</div>
        <button class="btn danger block" data-act="wipe">Alle Daten löschen</button>
      </div>

      <div class="section-title">App</div>
      <div class="list">
        <div class="list-item"><div class="li-main"><div class="li-title">Version</div></div><div class="li-end" id="app-version" style="color:var(--muted)">…</div></div>
        <div class="list-item"><div class="li-main"><div class="li-title">Speicher geschützt</div><div class="li-sub">iOS löscht die Daten nicht automatisch</div></div><div class="li-end" id="app-persist" style="color:var(--muted)">…</div></div>
        <button class="list-item" data-act="check-update"><div class="li-main"><div class="li-title" style="color:var(--accent)">Nach Updates suchen</div></div></button>
      </div>
      <p class="hint" style="text-align:center;margin:22px 0 0"><span style="font-family:var(--font-display);font-weight:700;font-size:17px;letter-spacing:-.02em;color:var(--text)">Ferrum</span><br>Ohne Konto, ohne Werbung, ohne Tracking.<br>Lebensmitteldaten online: Open Food Facts (ODbL)</p>
    `;
    Settings.drawCalc();
    Settings.appInfo();
  },

  drawCalc() {
    const out = $('#calc-out'); if (!out) return;
    const g = calcGoals(S.settings);
    out.innerHTML = `<div style="background:var(--bg3);border-radius:16px;padding:14px;margin-top:4px">
      <div class="card-sub">Grundumsatz ${U.n(g.bmr)} kcal, Gesamtumsatz ${U.n(g.tdee)} kcal. Vorschlag:</div>
      <div class="food-macros" style="grid-template-columns:repeat(4,1fr);margin:10px 0 12px">
        <div><b>${U.n(g.kcal)}</b><span>kcal</span></div>
        <div class="p"><b>${g.protein}</b><span>Protein</span></div>
        <div class="c"><b>${g.carbs}</b><span>Kohlenh.</span></div>
        <div class="f"><b>${g.fat}</b><span>Fett</span></div>
      </div>
      <button class="btn primary block" data-act="calc-apply">Vorschlag als Tagesziel übernehmen</button>
    </div>`;
  },

  async appInfo() {
    const v = $('#app-version'), p = $('#app-persist');
    try {
      const keys = window.caches ? await caches.keys() : [];
      const k = keys.find(x => x.startsWith('ferrum-'));
      if (v) v.textContent = k ? k.replace('ferrum-', '') : 'ohne Offline-Cache';
    } catch (e) { if (v) v.textContent = '–'; }
    try {
      const ok = navigator.storage && navigator.storage.persisted ? await navigator.storage.persisted() : false;
      if (p) p.textContent = ok ? 'Ja' : 'Über Home-Bildschirm: ja';
    } catch (e) { if (p) p.textContent = '–'; }
  },

  saveField(el) {
    const k = el.dataset.set;
    const st = S.settings;
    if (k === 'sound' || k === 'haptics') { st[k] = el.checked; if (k === 'haptics' && el.checked) U.haptic(); }
    else if (k === 'activity' || k === 'rest') st[k] = +el.value;
    else {
      const x = U.parseNum(el.value);
      if (isNaN(x) || x < 0) { U.toast('Bitte eine gültige Zahl eingeben', 'err'); el.value = U.n(st[k], 1).replace(/\./g, ''); return; }
      st[k] = k === 'weight' ? Math.round(x * 10) / 10 : Math.round(x);
      if (k === 'glass' && st.glass < 50) st.glass = 50;
    }
    Store.saveKV('settings');
    if (['height', 'weight', 'age', 'activity'].includes(k)) Settings.drawCalc();
    if (['kcal', 'protein', 'carbs', 'fat'].includes(k)) {
      const mk = st.protein * 4 + st.carbs * 4 + st.fat * 9;
      const h = $('#macro-hint');
      if (h) h.textContent = `Deine Makros ergeben ${U.n(mk)} kcal${Math.abs(mk - st.kcal) > 50 ? ' – das weicht von deinem Kalorienziel ab.' : '.'}`;
    }
  },

  /* ---------- Backup ---------- */
  async exportBackup() {
    const json = JSON.stringify(Store.exportData());
    const name = `ferrum-backup-${U.today()}.json`;
    const done = () => {
      S.meta.lastBackup = Date.now();
      Store.saveKV('meta');
      U.toast('Backup erstellt', 'ok');
      App.updateBackupDot();
      if (App.tab === 'settings') Settings.render();
    };
    let files = [];
    try {
      files = [new File([json], name, { type: 'application/json' }), new File([json], name, { type: 'text/plain' })];
    } catch (e) { files = []; }
    const shareable = files.find(f => navigator.canShare && navigator.canShare({ files: [f] }));
    if (shareable && navigator.share) {
      try {
        await navigator.share({ files: [shareable], title: 'Ferrum Backup' });
        done();
        return;
      } catch (e) {
        if (e && e.name === 'AbortError') { U.toast('Backup abgebrochen'); return; }
      }
    }
    // Ersatzweg: Datei herunterladen
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    done();
  },

  /* ---------- CSV-Export (deutsches Excel: Semikolon, Dezimalkomma) ---------- */
  csvFiles() {
    const cell = v => {
      if (typeof v === 'number') return String(Math.round(v * 10) / 10).replace('.', ',');
      const s = String(v == null ? '' : v);
      return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const csv = rows => '﻿' + rows.map(r => r.map(cell).join(';')).join('\r\n');
    const food = [['Datum', 'Mahlzeit', 'Lebensmittel', 'Marke', 'Menge (g)', 'kcal', 'Protein (g)', 'Kohlenhydrate (g)', 'Fett (g)']];
    S.entries.slice().sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : (a.t || 0) - (b.t || 0)).forEach(e => {
      const v = Nutri.calc(e.food, e.grams);
      food.push([e.date, mealName(e.meal), e.food.name, e.food.brand || '', e.food.src === 'quick' ? '' : e.grams, v.kcal, v.p, v.c, v.f]);
    });
    const train = [['Datum', 'Workout', 'Übung', 'Satz', 'Gewicht (kg)', 'Wiederholungen', 'Geschätztes 1RM (kg)', 'Rekord']];
    S.workouts.slice().sort((a, b) => a.start - b.start).forEach(w => w.exercises.forEach(x => x.sets.forEach((s, i) => {
      train.push([w.date, w.name, x.name, i + 1, +s.w || 0, +s.r || 0, Train.e1rm(s.w, s.r), s.pr ? 'ja' : '']);
    })));
    const weight = [['Datum', 'Gewicht (kg)']].concat(Progress.weightsSorted().map(w => [w.id, w.kg]));
    const d = U.today();
    const mk = (rows, name) => new File([csv(rows)], name, { type: 'text/csv' });
    return [mk(food, `ferrum-ernaehrung-${d}.csv`), mk(train, `ferrum-training-${d}.csv`), mk(weight, `ferrum-gewicht-${d}.csv`)];
  },
  async exportCSV() {
    let files;
    try { files = Settings.csvFiles(); } catch (e) { U.toast('Export fehlgeschlagen: ' + e.message, 'err'); return; }
    if (navigator.share && navigator.canShare && navigator.canShare({ files })) {
      try { await navigator.share({ files, title: 'Ferrum Tabellen' }); U.toast('Tabellen exportiert', 'ok'); return; }
      catch (e) { if (e && e.name === 'AbortError') return; }
    }
    files.forEach((f, i) => setTimeout(() => {
      const url = URL.createObjectURL(f);
      const a = document.createElement('a');
      a.href = url; a.download = f.name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    }, i * 400));
    U.toast('Tabellen exportiert', 'ok');
  },

  async importFile(file) {
    let obj;
    try {
      const text = file.text ? await file.text() : await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsText(file); });
      obj = JSON.parse(text);
    } catch (e) {
      U.toast('Die Datei konnte nicht gelesen werden. Wähle eine Ferrum-Backup-Datei (.json).', 'err');
      return;
    }
    if (!Store.isBackup(obj)) { U.toast('Das ist keine Ferrum-Sicherung.', 'err'); return; }
    const d = obj.data || {};
    const info = `${(d.entries || []).length} Mahlzeiten-Einträge, ${(d.workouts || []).length} Workouts, ${(d.weights || []).length} Gewichtseinträge vom ${obj.exportedAt ? new Date(obj.exportedAt).toLocaleDateString('de-DE') : '?'}`;
    if (!(await U.confirm(`Die Sicherung enthält ${info}. Alle aktuellen Daten auf diesem iPhone werden dadurch ersetzt.`, { ok: 'Wiederherstellen', title: 'Backup wiederherstellen?' }))) return;
    try {
      await Store.importData(obj);
      U.toast('Backup wiederhergestellt', 'ok');
      setTimeout(() => location.reload(), 700);
    } catch (e) {
      U.toast('Wiederherstellen fehlgeschlagen: ' + e.message, 'err');
    }
  },

  bind() {
    const el = $('#view-settings');
    el.addEventListener('change', e => {
      if (e.target.dataset.set) Settings.saveField(e.target);
      if (e.target.id === 'restore-file' && e.target.files[0]) {
        Settings.importFile(e.target.files[0]);
        e.target.value = '';
      }
    });
    Object.assign(App.actions, {
      'backup': () => Settings.exportBackup(),
      'restore': () => $('#restore-file').click(),
      'csv': () => Settings.exportCSV(),
      'set-seg': btn => {
        S.settings[btn.dataset.k] = btn.dataset.v;
        Store.saveKV('settings');
        $$(`[data-act=set-seg][data-k=${btn.dataset.k}]`).forEach(b => b.classList.toggle('on', b === btn));
        Settings.drawCalc();
      },
      'calc-apply': () => {
        const g = calcGoals(S.settings);
        Object.assign(S.settings, { kcal: g.kcal, protein: g.protein, carbs: g.carbs, fat: g.fat });
        Store.saveKV('settings');
        U.toast('Neue Tagesziele gespeichert', 'ok');
        Settings.render();
      },
      'test-sound': () => { U.unlockAudio(); U.beep(3); },
      'wipe': async () => {
        if (!(await U.confirm('Alle Mahlzeiten, Workouts, Gewichte, eigenen Lebensmittel und Einstellungen werden von diesem iPhone gelöscht. Das kann nicht rückgängig gemacht werden. Mach vorher ein Backup!', { ok: 'Weiter', title: 'Alle Daten löschen?' }))) return;
        if (!(await U.confirm('Wirklich alles endgültig löschen?', { ok: 'Endgültig löschen', title: 'Letzte Bestätigung' }))) return;
        await Store.wipe();
        location.reload();
      },
      'check-update': async () => {
        if (!App.reg) { U.toast('Updates sind nur in der installierten App verfügbar'); return; }
        U.toast('Suche nach Updates …');
        try {
          await App.reg.update();
          setTimeout(() => {
            if (App.reg.waiting || App.reg.installing) U.toast('Update gefunden – wird installiert', 'ok');
            else U.toast('Du hast die neueste Version', 'ok');
          }, 1500);
        } catch (e) { U.toast('Keine Verbindung – später erneut versuchen', 'err'); }
      }
    });
  }
};
