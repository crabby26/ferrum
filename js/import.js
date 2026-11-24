/* =========================================================
   import.js – Workouts aus Hevy übernehmen (CSV-Export)
   Fügt hinzu statt zu ersetzen. Mehrfaches Importieren derselben
   Datei erzeugt keine Doppelten (feste IDs pro Workout).
   ========================================================= */
'use strict';

const HevyImport = {
  // Hevy-Übung → vorhandene Ferrum-Übung (gleiche Bewegung)
  MAP: {
    'bankdrücken (langhantel)': 'e:bankdruecken-langhantel',
    'bench press (barbell)': 'e:bankdruecken-langhantel',
    'bankdrücken (kurzhantel)': 'e:kurzhantel-bankdruecken',
    'bench press (dumbbell)': 'e:kurzhantel-bankdruecken',
    'schrägbankdrücken (kurzhantel)': 'e:schraegbankdruecken-kurzhantel',
    'incline bench press (dumbbell)': 'e:schraegbankdruecken-kurzhantel',
    'klimmzug': 'e:klimmzuege',
    'pull up': 'e:klimmzuege',
    'latzug (kabelzug)': 'e:latziehen',
    'lat pulldown (cable)': 'e:latziehen',
    'hammer curl (kurzhantel)': 'e:hammer-curls',
    'hammer curl (dumbbell)': 'e:hammer-curls',
    'bizepscurl (kurzhantel)': 'e:kurzhantel-curls',
    'bicep curl (dumbbell)': 'e:kurzhantel-curls',
    'bizepscurl (langhantel)': 'e:langhantel-curls',
    'bicep curl (barbell)': 'e:langhantel-curls',
    'seitheben (kurzhantel)': 'e:seitheben',
    'lateral raise (dumbbell)': 'e:seitheben',
    'schulterpresse (kurzhantel)': 'e:schulterdruecken-kurzhantel',
    'shoulder press (dumbbell)': 'e:schulterdruecken-kurzhantel',
    'trizeps-pushdown (kabelzug)': 'e:trizepsdruecken-am-kabel',
    'triceps pushdown': 'e:trizepsdruecken-am-kabel',
    'überkopf-trizepsstrecken (kabelzug)': 'e:overhead-trizeps-extension',
    'overhead triceps extension (cable)': 'e:overhead-trizeps-extension',
    'beinpresse sitzend': 'e:beinpresse',
    'beinpresse': 'e:beinpresse',
    'leg press (machine)': 'e:beinpresse',
    'beinstrecken (maschine)': 'e:beinstrecker',
    'leg extension (machine)': 'e:beinstrecker',
    'beinbeugen liegend (maschine)': 'e:beinbeuger-liegend',
    'lying leg curl (machine)': 'e:beinbeuger-liegend',
    'cable crossovers': 'e:kabelzug-crossover',
    'cable crossover': 'e:kabelzug-crossover',
    'reverse fliegende (kabelzug)': 'e:reverse-flys',
    'schulterheben (kurzhantel)': 'e:shrugs',
    'shrug (dumbbell)': 'e:shrugs',
    'kniebeuge (langhantel)': 'e:kniebeugen',
    'squat (barbell)': 'e:kniebeugen',
    'kreuzheben (langhantel)': 'e:kreuzheben',
    'deadlift (barbell)': 'e:kreuzheben',
    'rumänisches kreuzheben (langhantel)': 'e:rumaenisches-kreuzheben',
    'romanian deadlift (barbell)': 'e:rumaenisches-kreuzheben',
    'rudern vorgebeugt (langhantel)': 'e:langhantelrudern',
    'bent over row (barbell)': 'e:langhantelrudern',
    'dips': 'e:dips',
    'face pull': 'e:face-pulls',
    'hip thrust (langhantel)': 'e:hip-thrust',
    'hip thrust (barbell)': 'e:hip-thrust'
  },

  MONTHS: { jan: 0, feb: 1, mar: 2, mrz: 2, apr: 3, mai: 4, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, okt: 9, oct: 9, nov: 10, dez: 11, dec: 11 },

  parseCSV(t) {
    const rows = []; let row = [], f = '', q = false;
    for (let i = 0; i < t.length; i++) {
      const c = t[i];
      if (q) {
        if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c;
      } else if (c === '"') q = true;
      else if (c === ',') { row.push(f); f = ''; }
      else if (c === '\n') { row.push(f); rows.push(row); row = []; f = ''; }
      else if (c !== '\r') f += c;
    }
    if (f || row.length) { row.push(f); rows.push(row); }
    return rows;
  },

  // „23 Nov. 2026, 18:47“ (deutsch) oder „23 Nov 2026, 18:47“ (englisch)
  parseDate(s) {
    const m = String(s || '').trim().match(/^(\d{1,2})\s+([^\s\d.,]+)\.?\s+(\d{4}),?\s+(\d{1,2}):(\d{2})/);
    if (m) {
      const mon = HevyImport.MONTHS[U.norm(m[2]).slice(0, 3)];
      if (mon != null) return new Date(+m[3], mon, +m[1], +m[4], +m[5]).getTime();
    }
    const t = Date.parse(s);
    return isNaN(t) ? null : t;
  },

  muscle(name) {
    const n = U.norm(name);
    if (/handgelenk|wrist/.test(n)) return 'Sonstiges';
    if (/crunch|beinheben|flutter|bauch|plank|sit.?up|leg raise/.test(n)) return 'Bauch';
    if (/trizeps|triceps|dips/.test(n)) return 'Trizeps';
    if (/curl/.test(n) && !/bein|leg/.test(n)) return 'Bizeps';
    if (/seitheben|schulter|shoulder|reverse|face pull|lateral|delt/.test(n)) return 'Schultern';
    if (/bank|brust|crossover|fliegende|chest|bench|fly/.test(n)) return 'Brust';
    if (/bein|wade|huft|hip|squat|knie|lunge|ausfall|glute|calf|adduk|abduk/.test(n)) return 'Beine';
    if (/rudern|row|zug|klimm|pull|lat|ruck|hyperext|superman|shrug|kreuzheb|deadlift|hang/.test(n)) return 'Rücken';
    return 'Sonstiges';
  },

  hash(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(36);
  },

  convert(text) {
    const rows = HevyImport.parseCSV(String(text).replace(/^﻿/, ''));
    const head = (rows.shift() || []).map(h => h.trim());
    const need = ['title', 'start_time', 'exercise_title', 'set_type', 'weight_kg', 'reps'];
    if (!need.every(h => head.includes(h))) throw new Error('Das ist kein Workout-Export aus Hevy (Spalten fehlen).');
    const col = Object.fromEntries(head.map((h, i) => [h, i]));
    const get = (r, k) => (r[col[k]] == null ? '' : r[col[k]]);

    const byWorkout = new Map();
    const exNames = new Map(); // Name → Ferrum-ID
    const newExercises = [];
    const skip = { warmup: 0, other: 0 };

    rows.forEach(r => {
      if (r.length < 5) return;
      const start = HevyImport.parseDate(get(r, 'start_time'));
      if (!start) { skip.other++; return; }
      const type = get(r, 'set_type').toLowerCase();
      if (type === 'warmup') { skip.warmup++; return; }
      const reps = Math.round(parseFloat(get(r, 'reps')) || 0);
      if (!(reps > 0)) { skip.other++; return; } // Cardio, Zeit- oder Distanzsätze
      const w = parseFloat(String(get(r, 'weight_kg')).replace(',', '.')) || 0;
      const exName = get(r, 'exercise_title').trim() || 'Übung';

      let exId = exNames.get(exName);
      if (!exId) {
        const key = exName.toLowerCase();
        exId = HevyImport.MAP[key];
        if (!exId || !S.exercises.some(e => e.id === exId)) {
          const same = S.exercises.find(e => U.norm(e.name) === U.norm(exName));
          if (same) exId = same.id;
          else {
            exId = 'x:hevy-' + U.slug(exName);
            if (!newExercises.some(e => e.id === exId)) newExercises.push({ id: exId, name: exName, muscle: HevyImport.muscle(exName), custom: true });
          }
        }
        exNames.set(exName, exId);
      }

      const title = get(r, 'title').trim() || 'Workout';
      const wid = 'h:' + HevyImport.hash(title + '|' + get(r, 'start_time'));
      let wo = byWorkout.get(wid);
      if (!wo) {
        const end = HevyImport.parseDate(get(r, 'end_time')) || start + 3600000;
        wo = { id: wid, date: U.key(new Date(start)), start, end: Math.max(end, start), templateId: null, name: title, exercises: [], src: 'hevy' };
        byWorkout.set(wid, wo);
      }
      let ex = wo.exercises[wo.exercises.length - 1];
      if (!ex || ex.exId !== exId) {
        ex = wo.exercises.find(x => x.exId === exId && x._name === exName) || null;
        if (!ex) { ex = { exId, name: (S.exercises.find(e => e.id === exId) || {}).name || exName, sets: [], _name: exName }; wo.exercises.push(ex); }
      }
      ex.sets.push({ w, r: reps, pr: false });
    });

    const workouts = [...byWorkout.values()].filter(w => w.exercises.length);
    workouts.forEach(w => w.exercises.forEach(x => { delete x._name; }));
    workouts.sort((a, b) => a.start - b.start);
    return { workouts, newExercises, skip, sets: workouts.reduce((a, w) => a + Train.setCount(w), 0) };
  },

  // Rekorde chronologisch neu bestimmen (wie beim Live-Training: das erste Mal zählt nicht als Rekord)
  markPRs(importedIds) {
    const best = {};
    S.workouts.slice().sort((a, b) => a.start - b.start).forEach(w => {
      let changed = false;
      w.exercises.forEach(x => {
        const b = best[x.exId];
        const session = { e: 0, w: 0, r0: 0 };
        x.sets.forEach(s => {
          const e = Train.e1rm(s.w, s.r);
          let pr = false;
          if (b) {
            if (s.w > 0) pr = s.w > Math.max(b.w, session.w) || e > Math.max(b.e, session.e) + 0.01;
            else pr = b.w === 0 && s.r > Math.max(b.r0, session.r0);
          }
          if (importedIds.has(w.id) && !!s.pr !== pr) { s.pr = pr; changed = true; }
          session.e = Math.max(session.e, e); session.w = Math.max(session.w, +s.w || 0);
          if (!(+s.w)) session.r0 = Math.max(session.r0, +s.r || 0);
        });
        best[x.exId] = b
          ? { e: Math.max(b.e, session.e), w: Math.max(b.w, session.w), r0: Math.max(b.r0, session.r0) }
          : { e: session.e, w: session.w, r0: session.r0 };
      });
      if (changed) Store.put('workouts', w);
    });
  },

  async run(file) {
    let text;
    try {
      text = file.text ? await file.text() : await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsText(file); });
    } catch (e) { U.toast('Die Datei konnte nicht gelesen werden.', 'err'); return; }
    let res;
    try { res = HevyImport.convert(text); } catch (e) { U.toast(e.message, 'err'); return; }
    if (!res.workouts.length) { U.toast('In der Datei wurden keine Workouts gefunden.', 'err'); return; }

    const first = res.workouts[0], last = res.workouts[res.workouts.length - 1];
    const already = res.workouts.filter(w => S.workouts.some(x => x.id === w.id)).length;
    const skipped = res.skip.warmup + res.skip.other;
    const msg = `${res.workouts.length} Workouts mit ${res.sets} Sätzen vom ${U.fmtDate(first.date, true)} bis ${U.fmtDate(last.date, true)}.`
      + (res.newExercises.length ? ` ${res.newExercises.length} Übungen werden neu angelegt.` : '')
      + (skipped ? ` Nicht übernommen: ${res.skip.warmup} Aufwärmsätze und ${res.skip.other} Cardio- oder Zeitsätze.` : '')
      + (already ? ` ${already} davon sind schon importiert und werden nur aktualisiert.` : '')
      + ' Deine bisherigen Ferrum-Daten bleiben erhalten.';
    if (!(await U.confirm(msg, { title: 'Aus Hevy übernehmen?', ok: 'Übernehmen', danger: false }))) return;

    res.newExercises.forEach(e => { if (!S.exercises.some(x => x.id === e.id)) Store.put('exercises', e); });
    res.workouts.forEach(w => Store.put('workouts', w));
    HevyImport.markPRs(new Set(res.workouts.map(w => w.id)));
    U.haptic();
    U.toast(`${res.workouts.length} Workouts aus Hevy übernommen`, 'ok');
    App.refresh();
  }
};
