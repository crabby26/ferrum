/* =========================================================
   utils.js – kleine Helfer: Datum, Zahlen, Sheets, Toasts, Ton
   ========================================================= */
'use strict';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const U = {
  /* ---------- Text & IDs ---------- */
  esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  },
  uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  },
  slug(s) {
    return String(s).toLowerCase()
      .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  },
  norm(s) {
    return String(s || '').toLowerCase()
      .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss')
      .normalize('NFD').replace(/[̀-ͯ]/g, '');
  },

  /* ---------- Zahlen ---------- */
  n(x, d = 0) {
    if (x == null || isNaN(x)) return '–';
    return Number(x).toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: d });
  },
  parseNum(v) {
    if (typeof v === 'number') return v;
    const s = String(v == null ? '' : v).trim().replace(/\s/g, '').replace(',', '.');
    if (s === '') return NaN;
    const x = Number(s);
    return isFinite(x) ? x : NaN;
  },
  clamp(x, a, b) { return Math.max(a, Math.min(b, x)); },
  round(x, d = 0) { const f = Math.pow(10, d); return Math.round(x * f) / f; },

  /* ---------- Datum (immer lokale Zeit, Schlüssel JJJJ-MM-TT) ---------- */
  key(d = new Date()) {
    const y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate();
    return y + '-' + String(m).padStart(2, '0') + '-' + String(day).padStart(2, '0');
  },
  today() { return U.key(new Date()); },
  parseKey(k) {
    const [y, m, d] = k.split('-').map(Number);
    return new Date(y, m - 1, d, 12, 0, 0);
  },
  addDays(k, n) {
    const d = U.parseKey(k);
    d.setDate(d.getDate() + n);
    return U.key(d);
  },
  daysBetween(a, b) {
    return Math.round((U.parseKey(b) - U.parseKey(a)) / 86400000);
  },
  weekStart(k) {
    const d = U.parseKey(k);
    const wd = (d.getDay() + 6) % 7; // Montag = 0
    d.setDate(d.getDate() - wd);
    return U.key(d);
  },
  isoWeek(k) {
    const d = U.parseKey(k);
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - day);
    const yStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    return Math.ceil(((t - yStart) / 86400000 + 1) / 7);
  },
  WD: ['So.', 'Mo.', 'Di.', 'Mi.', 'Do.', 'Fr.', 'Sa.'],
  MON: ['Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sep.', 'Okt.', 'Nov.', 'Dez.'],
  fmtDay(k) {
    const t = U.today();
    if (k === t) return 'Heute';
    if (k === U.addDays(t, -1)) return 'Gestern';
    if (k === U.addDays(t, 1)) return 'Morgen';
    return U.fmtDate(k);
  },
  fmtDate(k, withYear) {
    const d = U.parseKey(k);
    let s = U.WD[d.getDay()] + ', ' + d.getDate() + '. ' + U.MON[d.getMonth()];
    if (withYear || d.getFullYear() !== new Date().getFullYear()) s += ' ' + d.getFullYear();
    return s;
  },
  fmtShort(k) {
    const d = U.parseKey(k);
    return d.getDate() + '.' + (d.getMonth() + 1) + '.';
  },
  fmtDur(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    if (h > 0) return h + ':' + String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0');
    return m + ':' + String(sec).padStart(2, '0');
  },
  fmtMin(ms) {
    const m = Math.round(ms / 60000);
    if (m < 60) return m + ' min';
    return Math.floor(m / 60) + ' h ' + (m % 60) + ' min';
  },

  debounce(fn, ms) {
    let t;
    return function (...a) { clearTimeout(t); t = setTimeout(() => fn.apply(this, a), ms); };
  },

  /* ---------- Icons (inline SVG) ---------- */
  icon: {
    plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    minus: '<svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg>',
    close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    left: '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
    right: '<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>',
    down: '<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>',
    up: '<svg viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg>',
    star: '<svg viewBox="0 0 24 24"><path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z"/></svg>',
    trash: '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
    edit: '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/></svg>',
    barcode: '<svg viewBox="0 0 24 24"><path d="M4 6v12M7 6v12M10.5 6v12M13 6v12M16.5 6v12M20 6v12"/></svg>',
    more: '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/></svg>',
    copy: '<svg viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>',
    flame: '<svg viewBox="0 0 24 24"><path d="M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2.5 1.5-4 2.5-5 .3 2 1.2 3 2.5 3.5C11 9 11 5.5 12 2z"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor" stroke="none"/></svg>',
    share: '<svg viewBox="0 0 24 24"><path d="M12 15V3M8 7l4-4 4 4M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7"/></svg>',
    import: '<svg viewBox="0 0 24 24"><path d="M12 3v12M8 11l4 4 4-4M5 15v4a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-4"/></svg>',
    chevron: '<svg class="chev" viewBox="0 0 8 14"><path d="M1 1l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  },

  /* ---------- Fortschrittsring ---------- */
  ring(size, stroke, pct, color, inner) {
    const r = (size - stroke) / 2;
    const c = 2 * Math.PI * r;
    const p = U.clamp(pct || 0, 0, 1);
    return `<div class="ring-wrap" style="width:${size}px;height:${size}px">
      <svg class="ring-svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="transform:rotate(-90deg)">
        <circle class="ring-track" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}" style="stroke:${color};opacity:.2"/>
        <circle class="ring-bar" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-width="${stroke}"
          style="stroke:${color}" stroke-dasharray="${c}" stroke-dashoffset="${c}" data-target="${c * (1 - p)}"/>
      </svg>
      <div class="ring-center">${inner || ''}</div>
    </div>`;
  },
  animateRings(root) {
    const bars = $$('.ring-bar[data-target]', root);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      bars.forEach(b => { b.style.strokeDashoffset = b.dataset.target; b.removeAttribute('data-target'); });
    }));
  },

  /* ---------- Bottom-Sheet ---------- */
  sheet(o) {
    const layer = document.createElement('div');
    layer.className = 'sheet-layer';
    layer.innerHTML = `
      <div class="backdrop"></div>
      <div class="sheet ${o.full ? 'full' : ''}" role="dialog" aria-modal="true">
        <div class="sheet-grip"></div>
        <div class="sheet-head">
          <div class="sheet-title">${o.title || ''}</div>
          ${o.headRight || ''}
          <button class="icon-btn" data-close aria-label="Schließen">${U.icon.close}</button>
        </div>
        <div class="sheet-body">${o.body || ''}</div>
        ${o.foot ? `<div class="sheet-foot">${o.foot}</div>` : ''}
      </div>`;
    $('#sheets').appendChild(layer);
    const api = {
      layer,
      el: $('.sheet', layer),
      body: $('.sheet-body', layer),
      foot: $('.sheet-foot', layer),
      closed: false,
      $: s => layer.querySelector(s),
      $$: s => Array.from(layer.querySelectorAll(s)),
      setTitle(t) { $('.sheet-title', layer).innerHTML = t; },
      close(silent) {
        if (api.closed) return;
        api.closed = true;
        if (document.activeElement && layer.contains(document.activeElement)) document.activeElement.blur();
        layer.classList.remove('open');
        setTimeout(() => layer.remove(), 400);
        if (!silent && o.onClose) o.onClose();
      }
    };
    $('.backdrop', layer).addEventListener('click', () => api.close());
    $('[data-close]', layer).addEventListener('click', () => api.close());

    // Nach unten wischen am Kopf schließt das Sheet
    const head = $('.sheet-head', layer), grip = $('.sheet-grip', layer), sh = api.el;
    let y0 = null, dy = 0;
    const start = e => { if (e.target.closest('button')) return; y0 = e.touches[0].clientY; dy = 0; sh.style.transition = 'none'; };
    const move = e => { if (y0 == null) return; dy = Math.max(0, e.touches[0].clientY - y0); sh.style.transform = `translateY(${dy}px)`; };
    const end = () => {
      if (y0 == null) return;
      y0 = null; sh.style.transition = ''; sh.style.transform = '';
      if (dy > 90) api.close();
    };
    [head, grip].forEach(h => {
      h.addEventListener('touchstart', start, { passive: true });
      h.addEventListener('touchmove', move, { passive: true });
      h.addEventListener('touchend', end);
    });

    void layer.offsetWidth; // Layout erzwingen, damit die Einblend-Animation startet
    layer.classList.add('open');
    return api;
  },
  closeAllSheets() {
    $$('#sheets .sheet-layer').forEach(l => l.remove());
  },

  confirm(text, opts = {}) {
    return new Promise(resolve => {
      let done = false;
      const sh = U.sheet({
        title: opts.title || 'Bist du sicher?',
        body: `<p style="margin:4px 2px 18px;color:var(--muted);font-size:16px">${text}</p>
          <div class="btn-row">
            <button class="btn" data-a="no">${opts.cancel || 'Abbrechen'}</button>
            <button class="btn ${opts.danger === false ? 'primary' : 'danger'}" data-a="yes">${opts.ok || 'Löschen'}</button>
          </div>`,
        onClose() { if (!done) { done = true; resolve(false); } }
      });
      sh.body.addEventListener('click', e => {
        const b = e.target.closest('[data-a]');
        if (!b) return;
        done = true;
        resolve(b.dataset.a === 'yes');
        sh.close(true);
      });
    });
  },

  /* ---------- Toasts ---------- */
  // action: { label, fn } zeigt einen Knopf im Toast, z. B. „Rückgängig“
  toast(msg, type, action) {
    const t = document.createElement('div');
    t.className = 'toast' + (type ? ' ' + type : '') + (action ? ' has-action' : '');
    const span = document.createElement('span');
    span.textContent = msg;
    t.appendChild(span);
    let used = false;
    if (action) {
      const b = document.createElement('button');
      b.className = 'toast-btn';
      b.textContent = action.label;
      b.onclick = () => { if (used) return; used = true; action.fn(); t.classList.add('out'); setTimeout(() => t.remove(), 320); };
      t.appendChild(b);
    }
    // höchstens 3 Meldungen gleichzeitig
    const box = $('#toasts');
    box.appendChild(t);
    while (box.children.length > 3) box.firstElementChild.remove();
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 320); }, type === 'err' ? 3800 : action ? 4500 : 2400);
  },

  /* ---------- Ton (Web Audio) ---------- */
  audioCtx: null,
  unlockAudio() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!U.audioCtx) U.audioCtx = new AC();
      if (U.audioCtx.state === 'suspended') U.audioCtx.resume();
      // stummer Mini-Ton, damit iOS den Audiokanal freigibt
      const b = U.audioCtx.createBuffer(1, 1, 22050);
      const s = U.audioCtx.createBufferSource();
      s.buffer = b; s.connect(U.audioCtx.destination); s.start(0);
    } catch (e) { /* ignorieren */ }
  },
  beep(times = 3) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!U.audioCtx) U.audioCtx = new AC();
      const ctx = U.audioCtx;
      if (ctx.state === 'suspended') ctx.resume();
      const t0 = ctx.currentTime + 0.05;
      for (let i = 0; i < times; i++) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = i === times - 1 ? 1320 : 880;
        const st = t0 + i * 0.28;
        g.gain.setValueAtTime(0.0001, st);
        g.gain.exponentialRampToValueAtTime(0.6, st + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, st + 0.22);
        o.connect(g); g.connect(ctx.destination);
        o.start(st); o.stop(st + 0.25);
      }
    } catch (e) { /* ignorieren */ }
  },

  /* ---------- Haptisches Feedback ----------
     Safari hat keine Vibrations-Schnittstelle. Ab iOS 18 löst aber das Umschalten
     eines Schalters (<input switch>) ein kurzes Klopfen aus – das nutzen wir. */
  haptic() {
    if (typeof S !== 'undefined' && S.settings && S.settings.haptics === false) return;
    try {
      if (navigator.vibrate && !/iPhone|iPad/.test(navigator.userAgent)) { navigator.vibrate(10); return; }
      if (!U._hx) {
        const l = document.createElement('label');
        l.setAttribute('aria-hidden', 'true');
        l.style.cssText = 'position:fixed;left:-200px;top:0;width:1px;height:1px;opacity:0;pointer-events:none';
        l.innerHTML = '<input type="checkbox" switch tabindex="-1">';
        document.body.appendChild(l);
        U._hx = l;
      }
      U._hx.click();
    } catch (e) { /* egal */ }
  },

  /* ---------- Zahlen hochzählen ---------- */
  countUp(root) {
    $$('[data-count]', root).forEach(el => {
      const to = +el.dataset.count || 0;
      const dec = +(el.dataset.dec || 0);
      el.removeAttribute('data-count');
      if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = U.n(to, dec); return; }
      const t0 = performance.now(), dur = 750;
      const step = t => {
        const p = Math.min(1, (t - t0) / dur);
        const e = 1 - Math.pow(1 - p, 3);
        el.textContent = U.n(to * e, dec);
        if (p < 1) requestAnimationFrame(step);
      };
      el.textContent = U.n(0, dec);
      requestAnimationFrame(step);
      setTimeout(() => { el.textContent = U.n(to, dec); }, dur + 200); // falls rAF pausiert
    });
  },

  /* ---------- Konfetti ---------- */
  confetti() {
    const box = document.createElement('div');
    box.className = 'confetti';
    const acc = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#0A84FF';
    const colors = [acc, acc, '#FFFFFF', '#FF375F', '#30D158', '#FFD60A', '#64D2FF'];
    let html = '';
    for (let i = 0; i < 70; i++) {
      const left = Math.random() * 100;
      const dur = 1.6 + Math.random() * 1.4;
      const delay = Math.random() * 0.35;
      const dx = (Math.random() * 160 - 80) + 'px';
      const rot = (Math.random() * 900 - 450) + 'deg';
      const c = colors[i % colors.length];
      const w = 6 + Math.random() * 6;
      html += `<i style="left:${left}%;background:${c};width:${w}px;animation-duration:${dur}s;animation-delay:${delay}s;--dx:${dx};--rot:${rot}"></i>`;
    }
    box.innerHTML = html;
    document.body.appendChild(box);
    setTimeout(() => box.remove(), 3400);
  }
};

/* ---------- Tastatur-sichere Sheets (iOS) ---------- */
(function () {
  const vv = window.visualViewport;
  const root = document.documentElement;
  function upd() {
    if (!vv) return;
    root.style.setProperty('--vvh', vv.height + 'px');
    root.style.setProperty('--vvtop', vv.offsetTop + 'px');
  }
  if (vv) {
    vv.addEventListener('resize', upd);
    vv.addEventListener('scroll', upd);
    upd();
  }
  // Nach dem Schließen der Tastatur die Seite wieder ganz nach oben schieben
  document.addEventListener('focusout', () => {
    setTimeout(() => {
      const a = document.activeElement;
      if (!a || !/INPUT|TEXTAREA|SELECT/.test(a.tagName)) window.scrollTo(0, 0);
    }, 80);
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      const layers = $$('#sheets .sheet-layer');
      const top = layers[layers.length - 1];
      if (top) $('[data-close]', top).click();
    }
  });
})();
