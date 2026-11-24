/* =========================================================
   scanner.js – Barcode-Scanner (EAN-13, EAN-8, UPC-A)
   Nutzt die eingebaute BarcodeDetector-Schnittstelle, wenn vorhanden.
   Sonst (z. B. Safari auf dem iPhone) ein eigener Decoder,
   der mehrere Bildzeilen pro Kamerabild auswertet.
   ========================================================= */
'use strict';

const EAN = {
  // Breiten (Leer/Strich abwechselnd) der L-Codes für 0–9
  L: [[3, 2, 1, 1], [2, 2, 2, 1], [2, 1, 2, 2], [1, 4, 1, 1], [1, 1, 3, 2], [1, 2, 3, 1], [1, 1, 1, 4], [1, 3, 1, 2], [1, 2, 1, 3], [3, 1, 1, 2]],
  PARITY: ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'],

  matchDigit(runs, allowG) {
    const sum = runs[0] + runs[1] + runs[2] + runs[3];
    const sc = 7 / sum;
    let best = -1, bestErr = 9, bestG = false;
    for (let d = 0; d < 10; d++) {
      const p = EAN.L[d];
      let e = 0;
      for (let k = 0; k < 4; k++) e += Math.abs(runs[k] * sc - p[k]);
      if (e < bestErr) { bestErr = e; best = d; bestG = false; }
      if (allowG) {
        let g = 0;
        for (let k = 0; k < 4; k++) g += Math.abs(runs[k] * sc - p[3 - k]);
        if (g < bestErr) { bestErr = g; best = d; bestG = true; }
      }
    }
    if (bestErr > 1.25) return null;
    return { d: best, g: bestG, sum };
  },

  checksum(code) {
    const digits = code.split('').map(Number);
    const check = digits.pop();
    let s = 0;
    // von rechts: Gewicht 3,1,3,1 …
    for (let i = digits.length - 1, w = 3; i >= 0; i--, w = w === 3 ? 1 : 3) s += digits[i] * w;
    return (10 - (s % 10)) % 10 === check;
  },

  guardOk(runs, i, n, m) {
    for (let k = 0; k < n; k++) {
      const r = runs[i + k] / m;
      if (r < 0.45 || r > 1.8) return false;
    }
    return true;
  },

  // runs: Breiten, beginnend mit einem dunklen Balken bei Index 0 (gerade Indizes = dunkel)
  decodeRuns(runs) {
    for (let i = 0; i + 42 < runs.length; i += 2) {
      // Startmuster: Strich-Lücke-Strich
      const m = (runs[i] + runs[i + 1] + runs[i + 2]) / 3;
      if (m < 0.8) continue;
      if (!EAN.guardOk(runs, i, 3, m)) continue;
      const quiet = i === 0 ? 99 : runs[i - 1];
      if (quiet < m * 3) continue;
      const r13 = EAN.tryEAN13(runs, i + 3, m);
      if (r13) return r13;
      const r8 = EAN.tryEAN8(runs, i + 3, m);
      if (r8) return r8;
    }
    return null;
  },

  tryEAN13(runs, j, m) {
    if (j + 56 > runs.length) return null;
    let parity = '', left = '';
    for (let k = 0; k < 6; k++) {
      const r = EAN.matchDigit(runs.slice(j, j + 4), true);
      if (!r || r.sum < m * 4.5 || r.sum > m * 10) return null;
      left += r.d; parity += r.g ? 'G' : 'L';
      j += 4;
    }
    if (!EAN.guardOk(runs, j, 5, m)) return null;
    j += 5;
    let right = '';
    for (let k = 0; k < 6; k++) {
      const r = EAN.matchDigit(runs.slice(j, j + 4), false);
      if (!r || r.sum < m * 4.5 || r.sum > m * 10) return null;
      right += r.d;
      j += 4;
    }
    if (!EAN.guardOk(runs, j, 3, m)) return null;
    const first = EAN.PARITY.indexOf(parity);
    if (first < 0) return null;
    const code = first + left + right;
    return EAN.checksum(code) ? code : null;
  },

  tryEAN8(runs, j, m) {
    if (j + 40 > runs.length) return null;
    let left = '';
    for (let k = 0; k < 4; k++) {
      const r = EAN.matchDigit(runs.slice(j, j + 4), false);
      if (!r || r.sum < m * 4.5 || r.sum > m * 10) return null;
      left += r.d; j += 4;
    }
    if (!EAN.guardOk(runs, j, 5, m)) return null;
    j += 5;
    let right = '';
    for (let k = 0; k < 4; k++) {
      const r = EAN.matchDigit(runs.slice(j, j + 4), false);
      if (!r || r.sum < m * 4.5 || r.sum > m * 10) return null;
      right += r.d; j += 4;
    }
    if (!EAN.guardOk(runs, j, 3, m)) return null;
    const code = left + right;
    return EAN.checksum(code) ? code : null;
  },

  // Eine Bildzeile (Graustufen) → Barcode oder null
  decodeLine(gray, smooth) {
    const n = gray.length;
    // Optional glätten (hilft bei Bildrauschen, schadet bei sehr dünnen Strichen)
    let v = gray;
    if (smooth) {
      v = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const a = gray[Math.max(0, i - 1)], b = gray[i], c = gray[Math.min(n - 1, i + 1)];
        v[i] = (a + 2 * b + c) / 4;
      }
    }
    // Adaptive Schwelle: Mittelwert aus lokalem Min/Max
    const win = Math.max(16, Math.floor(n / 12));
    const thr = new Float32Array(n);
    let gmin = 255, gmax = 0;
    for (let i = 0; i < n; i++) { if (v[i] < gmin) gmin = v[i]; if (v[i] > gmax) gmax = v[i]; }
    if (gmax - gmin < 40) return null; // zu wenig Kontrast
    for (let i = 0; i < n; i += 4) {
      let lo = 255, hi = 0;
      const a = Math.max(0, i - win), b = Math.min(n - 1, i + win);
      for (let k = a; k <= b; k += 2) { if (v[k] < lo) lo = v[k]; if (v[k] > hi) hi = v[k]; }
      const t = hi - lo < 30 ? (gmin + gmax) / 2 : (lo + hi) / 2;
      for (let k = i; k < Math.min(n, i + 4); k++) thr[k] = t;
    }
    // Übergänge mit Subpixel-Genauigkeit finden
    const edges = [];
    let dark = v[0] < thr[0];
    const firstDark = dark;
    for (let i = 1; i < n; i++) {
      const d = v[i] < thr[i];
      if (d !== dark) {
        const t = thr[i];
        const den = v[i] - v[i - 1];
        const frac = den !== 0 ? U.clamp((t - v[i - 1]) / den, 0, 1) : 0.5;
        edges.push(i - 1 + frac);
        dark = d;
      }
    }
    if (edges.length < 40) return null;
    // Läufe ab dem ersten dunklen Abschnitt
    // Beginnt die Zeile dunkel, wird der angeschnittene Randlauf übersprungen
    const runs = [];
    const s0 = firstDark ? 1 : 0;
    for (let k = s0 + 1; k < edges.length; k++) runs.push(edges[k] - edges[k - 1]);
    let res = EAN.decodeRuns(runs);
    if (res) return res;
    // Rückwärts (Barcode steht auf dem Kopf)
    const rev = runs.slice().reverse();
    // rev beginnt evtl. mit hellem Lauf → so verschieben, dass Index 0 dunkel ist
    const revRuns = (runs.length % 2 === 0) ? rev.slice(1) : rev;
    res = EAN.decodeRuns(revRuns);
    return res;
  }
};

const Scanner = {
  stream: null,
  running: false,
  overlay: null,
  detector: null,
  last: null, lastCount: 0,

  async open(onCode) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      U.toast('Kamera nicht verfügbar – bitte Barcode eintippen', 'err');
      Scanner.manual(onCode);
      return;
    }
    const ov = document.createElement('div');
    ov.className = 'scanner';
    ov.innerHTML = `
      <video playsinline muted autoplay></video>
      <div class="scan-frame"><div class="scan-line"></div></div>
      <div class="scan-top">
        <span style="font-weight:800;font-size:18px;color:#fff">Barcode scannen</span>
        <button class="icon-btn" data-x style="background:rgba(255,255,255,.18);color:#fff">${U.icon.close}</button>
      </div>
      <div class="scan-msg">Barcode waagerecht in den Rahmen halten (ca. 15 cm Abstand)</div>
      <div class="scan-bottom">
        <button class="btn" data-manual>Barcode eintippen</button>
      </div>`;
    document.body.appendChild(ov);
    Scanner.overlay = ov;
    const video = $('video', ov);
    const close = () => Scanner.close();
    $('[data-x]', ov).onclick = close;
    $('[data-manual]', ov).onclick = () => { Scanner.close(); Scanner.manual(onCode); };

    try {
      Scanner.stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
    } catch (e) {
      Scanner.close();
      U.toast('Kein Kamerazugriff. Erlaube die Kamera in den iPhone-Einstellungen oder tippe den Barcode ein.', 'err');
      Scanner.manual(onCode);
      return;
    }
    if (!Scanner.overlay) { Scanner.stopStream(); return; }
    video.srcObject = Scanner.stream;
    try { await video.play(); } catch (e) { /* iOS startet trotzdem */ }

    // Etwas Zoom hilft neueren iPhones mit großem Mindest-Fokusabstand
    try {
      const track = Scanner.stream.getVideoTracks()[0];
      const caps = track.getCapabilities ? track.getCapabilities() : {};
      if (caps.zoom && caps.zoom.max >= 1.5) {
        await track.applyConstraints({ advanced: [{ zoom: Math.min(2, caps.zoom.max) }] });
      }
    } catch (e) { /* egal */ }

    Scanner.detector = null;
    if ('BarcodeDetector' in window) {
      try {
        const f = await window.BarcodeDetector.getSupportedFormats();
        if (f.includes('ean_13')) Scanner.detector = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
      } catch (e) { Scanner.detector = null; }
    }

    Scanner.running = true;
    Scanner.last = null; Scanner.lastCount = 0;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const found = code => {
      Scanner.running = false;
      $('.scan-frame', ov).classList.add('hit');
      if (navigator.vibrate) navigator.vibrate(60);
      setTimeout(() => { Scanner.close(); onCode(code); }, 180);
    };

    const tick = async () => {
      if (!Scanner.running) return;
      if (video.readyState >= 2 && video.videoWidth) {
        let code = null;
        if (Scanner.detector) {
          try {
            const res = await Scanner.detector.detect(video);
            if (res && res.length) code = res[0].rawValue;
          } catch (e) { Scanner.detector = null; }
          if (code) { found(code); return; }
        } else {
          code = Scanner.scanFrame(video, canvas, ctx);
          if (code) {
            if (code === Scanner.last) Scanner.lastCount++;
            else { Scanner.last = code; Scanner.lastCount = 1; }
            if (Scanner.lastCount >= 2) { found(code); return; }
          }
        }
      }
      setTimeout(tick, 60);
    };
    tick();
  },

  scanFrame(video, canvas, ctx) {
    const vw = video.videoWidth, vh = video.videoHeight;
    // Bereich in der Mitte (entspricht etwa dem Rahmen)
    const cw = Math.round(vw * 0.9), ch = Math.round(vh * 0.32);
    const sx = Math.round((vw - cw) / 2), sy = Math.round((vh - ch) / 2);
    const W = Math.min(cw, 1280);
    const H = Math.max(24, Math.round(ch * W / cw));
    if (canvas.width !== W) canvas.width = W;
    if (canvas.height !== H) canvas.height = H;
    ctx.drawImage(video, sx, sy, cw, ch, 0, 0, W, H);
    const rows = 14;
    for (let r = 0; r < rows; r++) {
      // Zeilen von der Mitte nach außen
      const off = (r % 2 ? -1 : 1) * Math.ceil(r / 2);
      const y = U.clamp(Math.round(H / 2 + off * (H / (rows + 2))), 1, H - 2);
      const img = ctx.getImageData(0, y - 1, W, 3).data;
      const gray = new Float32Array(W);
      for (let x = 0; x < W; x++) {
        let s = 0;
        for (let k = 0; k < 3; k++) {
          const i = (k * W + x) * 4;
          s += img[i] * 0.299 + img[i + 1] * 0.587 + img[i + 2] * 0.114;
        }
        gray[x] = s / 3;
      }
      const code = EAN.decodeLine(gray, false) || EAN.decodeLine(gray, true);
      if (code) return code;
    }
    return null;
  },

  stopStream() {
    if (Scanner.stream) {
      Scanner.stream.getTracks().forEach(t => t.stop());
      Scanner.stream = null;
    }
  },

  close() {
    Scanner.running = false;
    Scanner.stopStream();
    if (Scanner.overlay) { Scanner.overlay.remove(); Scanner.overlay = null; }
  },

  manual(onCode) {
    const sh = U.sheet({
      title: 'Barcode eintippen',
      body: `<label class="field"><span>Zahlen unter dem Strichcode (8 oder 13 Stellen)</span>
        <input class="input num" id="bc-in" inputmode="numeric" pattern="[0-9]*" autocomplete="off" placeholder="z. B. 4012345678901"></label>
        <button class="btn primary block" id="bc-go">Suchen</button>`
    });
    const inp = sh.$('#bc-in');
    setTimeout(() => inp.focus(), 350);
    const go = () => {
      const code = inp.value.replace(/\D/g, '');
      if (code.length < 6) { U.toast('Bitte einen gültigen Barcode eingeben', 'err'); return; }
      sh.close();
      onCode(code);
    };
    sh.$('#bc-go').onclick = go;
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  }
};
