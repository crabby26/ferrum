// Ferrum – sendet das Morgen-Signal per Web-Push.
// Läuft nur bei GitHub Actions, nicht in der App.
import webpush from 'web-push';

const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, PUSH_SUBSCRIPTION, FORCE } = process.env;

// Nur der Lauf, der in Deutschland 7 Uhr trifft, sendet (Sommer- und Winterzeit)
const hour = Number(new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', hour: '2-digit', hourCycle: 'h23' }).format(new Date()));
if (FORCE !== 'true' && hour !== 7) {
  console.log(`In Deutschland ist es gerade ${hour} Uhr – gesendet wird nur um 7 Uhr.`);
  process.exit(0);
}

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
    await webpush.sendNotification(sub, JSON.stringify({ type: 'morning' }), { TTL: 3 * 3600, urgency: 'normal' });
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
