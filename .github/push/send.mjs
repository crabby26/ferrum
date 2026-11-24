// Ferrum – sendet Mitteilungs-Signale per Web-Push.
// Läuft nur bei GitHub Actions, nicht in der App.
//   weigh   – 7 Uhr      Erinnerung zum Wiegen
//   day     – 8 Uhr      heutiger Trainingstag + Tagesziele
//   checkin – So 18 Uhr  Wochen-Check-in
import webpush from 'web-push';

const env = k => (process.env[k] || '').trim();
const VAPID_PUBLIC_KEY = env('VAPID_PUBLIC_KEY');
const VAPID_PRIVATE_KEY = env('VAPID_PRIVATE_KEY');
const PUSH_SUBSCRIPTION = env('PUSH_SUBSCRIPTION');
const SCHEDULE = env('SCHEDULE');       // z. B. "0 6 * * *" bei geplanten Läufen
const MANUAL_TYPE = env('MANUAL_TYPE'); // bei „Run workflow“

// Abstand Berlin ↔ UTC heute (1 Std. Winter, 2 Std. Sommer)
function berlinOffset(d = new Date()) {
  const h = Number(new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', hourCycle: 'h23' }).format(d));
  return ((h - d.getUTCHours()) + 24) % 24;
}
const berlinWeekday = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Berlin', weekday: 'short' }).format(new Date());

let type = null;
if (MANUAL_TYPE) {
  type = MANUAL_TYPE;
} else if (SCHEDULE) {
  // Gemeint ist die Uhrzeit, für die der Lauf geplant war (auch wenn GitHub verspätet startet)
  const utcHour = Number(SCHEDULE.split(/\s+/)[1]);
  const hour = (utcHour + berlinOffset()) % 24;
  if (hour === 7) type = 'weigh';
  else if (hour === 8) type = 'day';
  else if (hour === 18 && berlinWeekday === 'Sun') type = 'checkin';
  if (!type) {
    console.log(`Dieser Lauf entspricht ${hour} Uhr in Deutschland – dafür gibt es keine Mitteilung.`);
    process.exit(0);
  }
} else {
  type = 'day';
}
console.log(`Mitteilung: ${type}`);

if (!VAPID_PRIVATE_KEY) {
  console.log('::notice::Secret VAPID_PRIVATE_KEY fehlt noch – nichts gesendet.');
  process.exit(0);
}
if (!PUSH_SUBSCRIPTION) {
  console.log('::notice::Secret PUSH_SUBSCRIPTION fehlt noch. Aktiviere Mitteilungen in Ferrum und trag den Code ein.');
  process.exit(0);
}

let subs;
try {
  const parsed = JSON.parse(PUSH_SUBSCRIPTION);
  subs = Array.isArray(parsed) ? parsed : [parsed];
} catch (e) {
  console.log('::error::PUSH_SUBSCRIPTION ist kein gültiger Code aus Ferrum.');
  process.exit(1);
}

webpush.setVapidDetails('https://crabby26.github.io/ferrum/', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

let ok = 0;
for (const sub of subs) {
  try {
    await webpush.sendNotification(sub, JSON.stringify({ type }), { TTL: 3 * 3600, urgency: 'normal' });
    ok++;
  } catch (e) {
    if (e.statusCode === 404 || e.statusCode === 410) {
      console.log('::warning::Dieses iPhone ist nicht mehr angemeldet. Aktiviere Mitteilungen in Ferrum neu und trag den neuen Code ein.');
    } else {
      console.log(`::warning::Senden fehlgeschlagen (${e.statusCode || ''}): ${e.body || e.message}`);
    }
  }
}
console.log(`Gesendet an ${ok} von ${subs.length} Gerät(en).`);
