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
// Öffentlicher Schlüssel für Web-Push (der private liegt nur als Secret bei GitHub)
const PUSH_PUBLIC_KEY = 'BLJcR8jlFdX-LbsExB6DtqSAlCuRnJ9dDUEnqIOH8HYxCq-8k8hgq7nZOFdiJuSfQYRrag2jkktWhPpGPiM21mA';

// Was die App zeigt
const MODES = [
  ['both', 'Beides', 'Ernährung und Training – alle Funktionen.'],
  ['food', 'Ernährung', 'Nur Ernährung: Training wird ausgeblendet, deine Trainingsdaten bleiben gespeichert.'],
  ['train', 'Training', 'Nur Training: Ernährung wird ausgeblendet, deine Ernährungsdaten bleiben gespeichert.']
];

// Apple-Systemfarben. Pink, Grün, Gelb und Cyan sind für Protein, Kohlenhydrate, Fett und Wasser reserviert.
const ACCENTS = [
  ['blue', 'Blau', '#0A84FF'],
  ['indigo', 'Indigo', '#5E5CE6'],
  ['purple', 'Lila', '#BF5AF2'],
  ['mint', 'Mint', '#63E6E2'],
  ['graphite', 'Graphit', '#E5E5EA'],
  // Verläufe
  ['aurora', 'Aurora (Türkis zu Violett)', 'linear-gradient(135deg, #2EE6C9, #7B61FF)'],
  ['ocean', 'Ozean (Tiefblau zu Hellblau)', 'linear-gradient(135deg, #1E5BFF, #5AC8FA)'],
  ['nebula', 'Nebula (Violett zu Magenta)', 'linear-gradient(135deg, #7B61FF, #E040FB)'],
  ['titan', 'Titan (Silber-Metallic)', 'linear-gradient(135deg, #F5F5F7, #8E8E93)']
];

const Settings = {
  /* ---------- Übersicht wie in den iOS-Einstellungen ----------
     Die Hauptseite zeigt nur eine kurze Liste. Jeder Bereich öffnet
     sich als eigenes Fenster (Sheet). */
  openKey: null,
  openSheet: null,

  ICONS: {
    mode: '<svg viewBox="0 0 24 24"><path d="M12 3l8 4.5-8 4.5-8-4.5z"/><path d="M4 12l8 4.5 8-4.5M4 16.5L12 21l8-4.5"/></svg>',
    look: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><circle cx="8.5" cy="10" r="1.3"/><circle cx="12" cy="7.5" r="1.3"/><circle cx="15.5" cy="10" r="1.3"/><path d="M12 20.5c-1.5 0-2-1.2-1.6-2.3.5-1.3-.4-2.2-1.7-2.2H6"/></svg>',
    goals: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/></svg>',
    food: '<svg viewBox="0 0 24 24"><path d="M7 3v8M4.5 3v5a2.5 2.5 0 0 0 5 0V3M7 11v10"/><path d="M17 21V3c-2.2 1.2-3.5 4-3.5 7.5 0 2 1.2 3 3.5 3"/></svg>',
    calc: '<svg viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="3"/><path d="M8.5 7h7M8.5 11h1M12 11h1M15.5 11h0M8.5 14.5h1M12 14.5h1M8.5 18h1M12 18h1M15.5 14.5V18"/></svg>',
    train: '<svg viewBox="0 0 24 24"><path d="M6.5 7v10M3.5 9.5v5M17.5 7v10M20.5 9.5v5M6.5 12h11"/></svg>',
    push: '<svg viewBox="0 0 24 24"><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/></svg>',
    data: '<svg viewBox="0 0 24 24"><ellipse cx="12" cy="6" rx="7" ry="2.8"/><path d="M5 6v6c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8V6M5 12v6c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8v-6"/></svg>',
    about: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.6v.4"/></svg>'
  },

  sections() {
    const st = S.settings;
    const food = App.hasFood(), training = App.hasTrain();
    const lb = S.meta.lastBackup;
    const accent = ACCENTS.find(a => a[0] === (document.documentElement.dataset.accent || 'blue')) || ACCENTS[0];
    const foodSub = [st.fast && st.fast.on ? `Fasten ${st.fast.hours || 16}:${24 - (st.fast.hours || 16)}` : '', training && st.cycle && st.cycle.on ? `Trainingstage +${st.cycle.train} kcal` : ''].filter(Boolean).join(', ') || 'Fasten, Trainingstage';
    return [
      { key: 'mode', title: 'Was du trackst', color: '#5E5CE6', sub: (MODES.find(m => m[0] === App.mode()) || MODES[0])[1], show: true, group: 1 },
      { key: 'look', title: 'Darstellung', color: accent[2], sub: accent[1].split(' (')[0] + (st.haptics !== false ? ', Haptik an' : ''), show: true, group: 1 },
      { key: 'goals', title: 'Tagesziele', color: '#FF375F', sub: `${U.n(st.kcal)} kcal, ${st.protein} g Protein`, show: food, group: 2 },
      { key: 'food', title: 'Ernährung', color: '#30D158', sub: foodSub, show: food, group: 2 },
      { key: 'calc', title: 'Ziel-Rechner', color: '#FF9F0A', sub: `${st.height} cm, ${U.n(st.weight, 1)} kg, ${(GOALS.find(g => g[0] === st.goal) || GOALS[0])[1]}`, show: food, group: 2 },
      { key: 'train', title: 'Training', color: '#0A84FF', sub: `Pause ${U.fmtDur((st.rest || 120) * 1000)} min${st.overload !== false ? ', Vorschläge an' : ''}`, show: training, group: 3 },
      { key: 'push', title: 'Mitteilungen', color: '#FF453A', sub: '7:00, 8:00 und sonntags 18:00', show: true, group: 3 },
      { key: 'data', title: 'Daten & Backup', color: '#64D2FF', sub: lb ? 'Letztes Backup ' + U.fmtDay(U.key(new Date(lb))) : 'Noch kein Backup', show: true, group: 4, warn: App.needsBackup() },
      { key: 'about', title: 'Über Ferrum', color: '#8E8E93', sub: 'Version, Updates', show: true, group: 4 }
    ].filter(s => s.show);
  },

  render() {
    Settings.renderMain();
    Settings.refreshOpen();
  },
  // Nur die Übersicht neu zeichnen (ein geöffneter Bereich bleibt unberührt)
  renderMain() {
    const el = $('#view-settings');
    const secs = Settings.sections();
    const groups = [...new Set(secs.map(s => s.group))];
    const days = new Set(S.entries.map(e => e.date)).size;
    el.innerHTML = `
      <div class="page-head"><h1 class="page-title">Einstellungen</h1></div>
      <div class="card profile-card">
        <img src="icons/icon-180.png" alt="">
        <div style="flex:1;min-width:0">
          <div class="profile-name">Ferrum</div>
          <div class="card-sub">${App.hasFood() ? `${days} ${days === 1 ? 'Tag' : 'Tage'} getrackt` : ''}${App.hasFood() && App.hasTrain() ? ', ' : ''}${App.hasTrain() ? `${S.workouts.length} Workouts` : ''}</div>
          <div class="hint" style="margin:2px 0 0">Alle Daten bleiben auf diesem iPhone.</div>
        </div>
      </div>
      ${App.needsBackup() ? `<div class="inline-banner"><div class="txt"><b>Zeit für ein Backup</b>${S.meta.lastBackup ? 'Dein letztes Backup ist älter als 7 Tage.' : 'Du hast noch nie ein Backup gemacht.'}</div><button class="btn small primary" data-act="backup">Sichern</button></div>` : ''}
      ${groups.map(g => `<div class="list settings-list">${secs.filter(s => s.group === g).map(s => `
        <button class="list-item" data-act="set-open" data-k="${s.key}">
          <span class="set-icon" style="background:${s.color}">${Settings.ICONS[s.key]}</span>
          <div class="li-main"><div class="li-title">${s.title}</div><div class="li-sub">${U.esc(s.sub)}</div></div>
          ${s.warn ? '<i class="tab-dot" style="position:static"></i>' : ''}${U.icon.chevron}
        </button>`).join('')}</div>`).join('')}
      <p class="hint" style="text-align:center;margin:18px 0 0">Ohne Konto, ohne Werbung, ohne Tracking.<br>Lebensmitteldaten online: Open Food Facts (ODbL)</p>
    `;
  },

  open(key) {
    const sec = Settings.sections().find(s => s.key === key) || { title: 'Einstellungen' };
    const sh = U.sheet({
      title: sec.title,
      full: key !== 'mode' && key !== 'look',
      body: Settings.sectionHTML(key),
      onClose: () => { if (Settings.openSheet === sh) { Settings.openSheet = null; Settings.openKey = null; } }
    });
    Settings.openKey = key;
    Settings.openSheet = sh;
    sh.body.addEventListener('change', Settings.onChange);
    Settings.after(key);
  },
  refreshOpen() {
    const sh = Settings.openSheet;
    if (!sh || sh.closed || !Settings.openKey) return;
    const top = sh.body.scrollTop;
    sh.body.innerHTML = Settings.sectionHTML(Settings.openKey);
    sh.body.scrollTop = top;
    Settings.after(Settings.openKey);
  },
  after(key) {
    if (key === 'calc') Settings.drawCalc();
    if (key === 'push') Settings.drawPush();
    if (key === 'about') Settings.appInfo();
  },

  sectionHTML(key) {
    const st = S.settings;
    const lb = S.meta.lastBackup;
    const training = App.hasTrain();
    const macroKcal = st.protein * 4 + st.carbs * 4 + st.fat * 9;
    const num = (id, val, label, unit, dec = 0) => `<label class="field"><span>${label}${unit ? ' (' + unit + ')' : ''}</span>
      <input class="input num" data-set="${id}" inputmode="${dec ? 'decimal' : 'numeric'}" value="${U.n(val, dec).replace(/\./g, '')}"></label>`;
    const toggle = (id, on, title, hint) => `<div class="set-row">
      <div style="flex:1"><b>${title}</b>${hint ? `<div class="hint" style="margin:2px 0 0">${hint}</div>` : ''}</div>
      <label class="switch"><input type="checkbox" data-set="${id}" ${on ? 'checked' : ''}><i></i></label></div>`;

    if (key === 'mode') return `
      <div class="seg" style="margin:0">${MODES.map(m => `<button data-act="set-mode" data-v="${m[0]}" class="${App.mode() === m[0] ? 'on' : ''}">${m[1]}</button>`).join('')}</div>
      <p class="hint" style="margin:12px 2px 0">${(MODES.find(m => m[0] === App.mode()) || MODES[0])[2]}</p>`;

    if (key === 'look') return `
      <div class="card">
        <div class="card-title" style="margin-bottom:12px">Akzentfarbe</div>
        <div class="accent-dots">
          ${ACCENTS.map(a => `<button class="accent-dot ${(document.documentElement.dataset.accent || 'blue') === a[0] ? 'on' : ''}" data-act="set-accent" data-v="${a[0]}" style="background:${a[2]}" aria-label="${a[1]}"></button>`).join('')}
        </div>
        <p class="hint" id="accent-name" style="margin-top:12px">${(ACCENTS.find(a => a[0] === (document.documentElement.dataset.accent || 'blue')) || ACCENTS[0])[1]}</p>
      </div>
      <div class="card">${toggle('haptics', st.haptics !== false, 'Haptisches Feedback', 'Kurzes Klopfen beim Abhaken und Eintragen (ab iOS 18).')}</div>`;

    if (key === 'goals') return `
      <div class="card">
        <div class="grid2">
          ${num('kcal', st.kcal, 'Kalorien', 'kcal')}
          ${num('protein', st.protein, 'Protein', 'g')}
          ${num('carbs', st.carbs, 'Kohlenhydrate', 'g')}
          ${num('fat', st.fat, 'Fett', 'g')}
        </div>
        <p class="hint" id="macro-hint">Deine Makros ergeben ${U.n(macroKcal)} kcal${Math.abs(macroKcal - st.kcal) > 50 ? ' – das weicht von deinem Kalorienziel ab.' : '.'}</p>
      </div>
      <div class="card">
        <div class="grid2">
          ${num('waterGoal', st.waterGoal, 'Wasserziel', 'ml')}
          ${num('glass', st.glass, 'Glasgröße', 'ml')}
        </div>
      </div>
      <p class="hint" style="margin:0 2px">Einen Vorschlag berechnet der Ziel-Rechner.</p>`;

    if (key === 'food') return `
      ${training ? `<div class="card">
        ${toggle('cycle-on', st.cycle && st.cycle.on, 'Trainingstage: mehr Kalorien', 'An Trainingstagen mehr, an Ruhetagen weniger essen (über die Kohlenhydrate). Trainingstage kommen aus deinem Wochenplan oder einem gespeicherten Workout.')}
        ${st.cycle && st.cycle.on ? `<div class="grid2" style="margin-top:12px">
          ${num('cycle-train', st.cycle.train, 'Trainingstag +', 'kcal')}
          ${num('cycle-rest', st.cycle.rest, 'Ruhetag −', 'kcal')}
        </div>` : ''}
      </div>` : ''}
      <div class="card">
        ${toggle('fast-on', st.fast && st.fast.on, 'Intervallfasten', 'Fasten-Timer auf „Heute“ und unter Ernährung. Endet automatisch, sobald du etwas einträgst.')}
        ${st.fast && st.fast.on ? `<label class="field" style="margin:12px 0 0"><span>Fastenziel</span>
          <select class="input" data-set="fast-hours">${[12, 14, 16, 18, 20].map(h => `<option value="${h}" ${(+st.fast.hours || 16) === h ? 'selected' : ''}>${h}:${24 - h} (${h} Stunden fasten)</option>`).join('')}</select></label>` : ''}
      </div>`;

    if (key === 'calc') return `
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
        <div class="field" style="margin-bottom:0"><span>Ziel</span>
          <div class="seg" style="margin:0">${GOALS.map(g => `<button data-act="set-seg" data-k="goal" data-v="${g[0]}" class="${st.goal === g[0] ? 'on' : ''}">${g[1]}</button>`).join('')}</div>
        </div>
      </div>
      <div id="calc-out"></div>`;

    if (key === 'train') return `
      <div class="card">
        <label class="field" style="margin-bottom:0"><span>Standard-Pause zwischen Sätzen</span>
          <select class="input" data-set="rest">${[45, 60, 90, 120, 150, 180, 240, 300].map(s => `<option value="${s}" ${+st.rest === s ? 'selected' : ''}>${U.fmtDur(s * 1000)} min</option>`).join('')}</select>
        </label>
      </div>
      <div class="card">
        ${toggle('overload', st.overload !== false, 'Steigerungs-Vorschläge', 'Oberes Ende des Wiederholungsbereichs geschafft → mehr Gewicht, sonst 1 Wiederholung mehr.')}
        ${toggle('sound', st.sound !== false, 'Ton am Ende der Pause', 'Bei eingeschaltetem Stummschalter nicht hörbar.')}
      </div>
      <div class="card">
        <div class="card-title">Aus Hevy übernehmen</div>
        <p class="hint" style="margin:4px 0 12px">In Hevy: Profil → Einstellungen → Daten exportieren → Workouts exportieren. Die CSV-Datei hier auswählen. Deine Workouts werden hinzugefügt, nichts wird überschrieben.</p>
        <button class="btn block" data-act="hevy">Hevy-Datei auswählen</button>
        <input type="file" id="hevy-file" hidden>
      </div>`;

    if (key === 'push') return '<div class="card" id="push-card"><div class="hint">…</div></div>';

    if (key === 'data') return `
      <div class="card">
        <div class="card-sub" style="margin-bottom:12px">${lb ? 'Letztes Backup: ' + U.fmtDate(U.key(new Date(lb)), true) + '.' : 'Noch kein Backup erstellt.'}
          Alle Daten liegen nur auf diesem iPhone. Sichere sie regelmäßig in der Dateien-App oder iCloud Drive.</div>
        <button class="btn primary block" data-act="backup" style="margin-bottom:10px">${U.icon.share} Backup exportieren</button>
        <button class="btn block" data-act="restore" style="margin-bottom:10px">${U.icon.import} Backup importieren</button>
        <button class="btn block" data-act="csv">Als Tabelle exportieren (CSV)</button>
        <p class="hint">Tabellen öffnest du mit Numbers oder Excel. Zum Wiederherstellen brauchst du das Backup.</p>
        <input type="file" id="restore-file" hidden>
      </div>
      <div class="card">
        <div class="card-sub" style="margin-bottom:10px">${S.entries.length} Mahlzeiten-Einträge, ${S.workouts.length} Workouts, ${S.weights.length} Gewichtseinträge, ${S.foods.length} eigene Lebensmittel und Rezepte</div>
        <button class="btn danger block" data-act="wipe">Alle Daten löschen</button>
      </div>`;

    if (key === 'about') return `
      <div class="list">
        <div class="list-item"><div class="li-main"><div class="li-title">Version</div></div><div class="li-end" id="app-version" style="color:var(--muted)">…</div></div>
        <button class="list-item" data-act="check-update"><div class="li-main"><div class="li-title" style="color:var(--accent)">Nach Updates suchen</div></div></button>
      </div>
      <p class="hint" style="text-align:center;margin:14px 0 0">Ferrum – ohne Konto, ohne Werbung, ohne Tracking.<br>Lebensmitteldaten online: Open Food Facts (ODbL)</p>`;
    return '';
  },

  /* ---------- Morgen-Mitteilung (Web-Push) ---------- */
  pushSupported() {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  },
  async pushReg() {
    return App.reg || (await navigator.serviceWorker.getRegistration()) || null;
  },
  async drawPush() {
    const box = $('#push-card');
    if (!box) return;
    const title = '<div class="card-title">Erinnerungen</div><div class="push-times"><div><b>7:00</b><span>Wiegen</span></div><div><b>8:00</b><span>' + (App.mode() === 'food' ? 'Deine Tagesziele' : App.mode() === 'train' ? 'Heutiger Trainingstag' : 'Heutiger Trainingstag und Tagesziele') + '</span></div><div><b>So 18:00</b><span>Wochen-Check-in</span></div></div><p class="hint" style="margin:0 0 12px">Der Inhalt wird auf deinem iPhone berechnet, deine Daten verlassen es nicht.</p>';
    if (!Settings.pushSupported()) {
      box.innerHTML = title + '<p class="hint" style="margin:0">Funktioniert nur in der installierten App (Safari → Teilen → „Zum Home-Bildschirm“), ab iOS 16.4.</p>';
      return;
    }
    if (Notification.permission === 'denied') {
      box.innerHTML = title + '<p class="hint" style="margin:0">Mitteilungen sind blockiert. Erlaube sie in den iPhone-Einstellungen unter Mitteilungen → Ferrum.</p>';
      return;
    }
    let sub = null;
    try { const reg = await Settings.pushReg(); sub = reg ? await reg.pushManager.getSubscription() : null; } catch (e) { sub = null; }
    if (!sub) {
      box.innerHTML = title + '<button class="btn primary block" data-act="push-on">Mitteilungen aktivieren</button>';
      return;
    }
    const code = JSON.stringify(sub);
    const confirmed = S.meta.pushConfirmed === code;
    box.innerHTML = title + `
      <div class="push-state on" style="margin-bottom:12px"><i class="dot"></i><b style="font-weight:600">${confirmed ? 'Aktiv' : 'Fast fertig'}</b></div>
      ${confirmed ? '' : `<p class="hint" style="margin:0">Letzter Schritt: GitHub braucht diesen Code, um dein iPhone zu erreichen. Kopiere ihn und schick ihn an Claude, oder trag ihn selbst bei GitHub als Secret <b>PUSH_SUBSCRIPTION</b> ein (Repository → Settings → Secrets and variables → Actions).</p>
      <div class="code-box">${U.esc(code)}</div>
      <div class="btn-row" style="margin-bottom:10px"><button class="btn" data-act="push-copy">Code kopieren</button><button class="btn" data-act="push-done">Erledigt</button></div>`}
      <div class="hint" style="margin:0 0 6px">Test-Mitteilung senden:</div>
      <div class="chips wrap" style="margin-bottom:12px"><button class="chip" data-act="push-test" data-kind="weigh">Wiegen</button><button class="chip" data-act="push-test" data-kind="day">Trainingstag</button><button class="chip" data-act="push-test" data-kind="checkin">Check-in</button></div>
      <button class="btn danger block" data-act="push-off">Mitteilungen ausschalten</button>`;
    box.dataset.code = code;
  },
  b64ToBytes(s) {
    const pad = '='.repeat((4 - s.length % 4) % 4);
    const b = atob((s + pad).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(b, c => c.charCodeAt(0));
  },

  drawCalc() {
    const out = $('#calc-out'); if (!out) return;
    const g = calcGoals(S.settings);
    out.innerHTML = `<div style="background:rgba(255,255,255,.06);border:.5px solid rgba(255,255,255,.08);border-radius:18px;padding:14px;margin-top:4px">
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
    if (/^(cycle|fast)-/.test(k)) {
      // Kalorien je Trainings-/Ruhetag und Intervallfasten
      st.cycle = Object.assign({ on: false, train: 200, rest: 200 }, st.cycle || {});
      st.fast = Object.assign({ on: false, hours: 16 }, st.fast || {});
      if (k === 'cycle-on') st.cycle.on = el.checked;
      if (k === 'fast-on') st.fast.on = el.checked;
      if (k === 'fast-hours') st.fast.hours = +el.value;
      if (k === 'cycle-train' || k === 'cycle-rest') {
        const x = U.parseNum(el.value);
        if (isNaN(x) || x < 0 || x > 1500) { U.toast('Bitte einen Wert zwischen 0 und 1500 eingeben', 'err'); return; }
        st.cycle[k === 'cycle-train' ? 'train' : 'rest'] = Math.round(x);
      }
      Store.saveKV('settings');
      if (k === 'cycle-on' || k === 'fast-on') Settings.render(); else Settings.renderMain();
      App.updateBackupDot();
      return;
    }
    if (k === 'sound' || k === 'haptics' || k === 'overload') { st[k] = el.checked; if (k === 'haptics' && el.checked) U.haptic(); }
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
    Settings.renderMain(); // Zusammenfassungen in der Übersicht aktualisieren
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
    const train = [['Datum', 'Workout', 'Übung', 'Satz', 'Satztyp', 'Gewicht (kg)', 'Wiederholungen', 'Geschätztes 1RM (kg)', 'Rekord']];
    S.workouts.slice().sort((a, b) => a.start - b.start).forEach(w => w.exercises.forEach(x => x.sets.forEach((s, i) => {
      train.push([w.date, w.name, x.name, Train.setLabel(x.sets, i), Train.SET_TYPES[s.t || 'n'], +s.w || 0, +s.r || 0, s.t === 'w' ? '' : Train.e1rm(s.w, s.r), s.pr ? 'ja' : '']);
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

  // Änderungen in Eingabefeldern (Hauptseite und geöffnete Bereiche)
  onChange(e) {
    if (e.target.dataset.set) Settings.saveField(e.target);
    if (e.target.id === 'restore-file' && e.target.files[0]) {
      Settings.importFile(e.target.files[0]);
      e.target.value = '';
    }
    if (e.target.id === 'hevy-file' && e.target.files[0]) {
      HevyImport.run(e.target.files[0]);
      e.target.value = '';
    }
  },

  bind() {
    $('#view-settings').addEventListener('change', Settings.onChange);
    Object.assign(App.actions, {
      'set-open': el => Settings.open(el.dataset.k),
      'backup': () => Settings.exportBackup(),
      'restore': () => $('#restore-file').click(),
      'hevy': () => $('#hevy-file').click(),
      'csv': () => Settings.exportCSV(),
      'push-on': async () => {
        try {
          const perm = await Notification.requestPermission();
          if (perm !== 'granted') { Settings.drawPush(); return; }
          const reg = await navigator.serviceWorker.ready;
          await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: Settings.b64ToBytes(PUSH_PUBLIC_KEY) });
          U.haptic();
          U.toast('Mitteilungen aktiviert', 'ok');
        } catch (e) {
          U.toast('Aktivieren fehlgeschlagen: ' + (e.message || e), 'err');
        }
        Settings.drawPush();
      },
      'push-copy': async () => {
        const code = $('#push-card').dataset.code || '';
        try { await navigator.clipboard.writeText(code); U.toast('Code kopiert', 'ok'); }
        catch (e) {
          const r = document.createRange(); const b = $('#push-card .code-box');
          if (b) { r.selectNodeContents(b); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }
          U.toast('Code markiert – tippe auf „Kopieren“');
        }
      },
      'push-done': () => {
        S.meta.pushConfirmed = $('#push-card').dataset.code || '';
        Store.saveKV('meta');
        Settings.drawPush();
      },
      'push-test': async el => {
        const reg = await Settings.pushReg();
        const sw = reg && (reg.active || navigator.serviceWorker.controller);
        if (!sw) { U.toast('Service Worker noch nicht bereit – App neu öffnen', 'err'); return; }
        sw.postMessage({ type: 'TEST_PUSH', kind: el.dataset.kind || 'day' });
        U.toast('Test-Mitteilung gesendet');
      },
      'push-off': async () => {
        try {
          const reg = await Settings.pushReg();
          const sub = reg && await reg.pushManager.getSubscription();
          if (sub) await sub.unsubscribe();
        } catch (e) { /* egal */ }
        S.meta.pushConfirmed = null; Store.saveKV('meta');
        U.toast('Mitteilungen ausgeschaltet');
        Settings.drawPush();
      },
      'set-mode': btn => {
        S.settings.mode = btn.dataset.v;
        Store.saveKV('settings');
        App.applyMode();
        U.haptic();
        Settings.render();
        U.toast((MODES.find(m => m[0] === btn.dataset.v) || MODES[0])[1] === 'Beides' ? 'Ernährung und Training aktiv' : 'Nur ' + MODES.find(m => m[0] === btn.dataset.v)[1] + ' aktiv', 'ok');
      },
      'set-accent': btn => {
        S.settings.accent = btn.dataset.v;
        Store.saveKV('settings');
        App.applyAccent();
        U.haptic();
        $$('[data-act=set-accent]').forEach(b => b.classList.toggle('on', b === btn));
        const a = ACCENTS.find(x => x[0] === btn.dataset.v);
        const n = $('#accent-name'); if (n && a) n.textContent = a[1];
        Settings.renderMain();
      },
      'set-seg': btn => {
        S.settings[btn.dataset.k] = btn.dataset.v;
        Store.saveKV('settings');
        $$(`[data-act=set-seg][data-k=${btn.dataset.k}]`).forEach(b => b.classList.toggle('on', b === btn));
        Settings.drawCalc();
        Settings.renderMain();
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
