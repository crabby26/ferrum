/* =========================================================
   charts.js – selbst gezeichnete SVG-Diagramme (keine Bibliothek)
   ========================================================= */
'use strict';

const Charts = {
  nice(min, max, count = 4) {
    if (min === max) { min -= 1; max += 1; }
    const span = max - min;
    const raw = span / count;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const norm = raw / mag;
    const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
    const lo = Math.floor(min / step) * step;
    const hi = Math.ceil(max / step) * step;
    const ticks = [];
    for (let v = lo; v <= hi + step / 2; v += step) ticks.push(+v.toFixed(6));
    return { lo, hi, step, ticks };
  },

  empty(el, text) {
    el.innerHTML = `<div class="chart-empty">${text}</div>`;
  },

  /* Liniendiagramm: series = [{ points:[{x(ms), y}], color, label }] */
  line(el, series, opts = {}) {
    const pts0 = series[0] ? series[0].points : [];
    if (!pts0.length) { Charts.empty(el, opts.emptyText || 'Noch keine Daten'); return; }
    const W = Math.max(260, el.clientWidth || 320);
    const H = opts.height || 190;
    const pad = { l: 38, r: 12, t: 14, b: 24 };
    const pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;

    let xs = [], ys = [];
    series.forEach(s => s.points.forEach(p => { xs.push(p.x); ys.push(p.y); }));
    if (opts.goal != null) ys.push(opts.goal);
    let xMin = Math.min(...xs), xMax = Math.max(...xs);
    if (xMin === xMax) { xMin -= 86400000 * 3; xMax += 86400000 * 3; }
    let yMin = Math.min(...ys), yMax = Math.max(...ys);
    const yPad = (yMax - yMin) * 0.12 || Math.max(1, Math.abs(yMax) * 0.05);
    const t = Charts.nice(yMin - yPad, yMax + yPad, 4);
    if (opts.zero && t.lo < 0) t.lo = 0;

    const X = x => pad.l + (x - xMin) / (xMax - xMin) * pw;
    const Y = y => pad.t + (1 - (y - t.lo) / (t.hi - t.lo)) * ph;
    const yFmt = opts.yFmt || (v => U.n(v, 1));
    const gid = 'g' + U.uid();

    let svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
      <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${series[0].color}" stop-opacity=".28"/>
        <stop offset="1" stop-color="${series[0].color}" stop-opacity="0"/>
      </linearGradient></defs>`;
    t.ticks.forEach(v => {
      const y = Y(v);
      svg += `<line class="grid" x1="${pad.l}" x2="${W - pad.r}" y1="${y}" y2="${y}"/>
        <text x="${pad.l - 6}" y="${y + 4}" text-anchor="end">${yFmt(v)}</text>`;
    });
    // X-Beschriftung
    const nLab = Math.min(4, Math.max(2, Math.floor(pw / 80)));
    for (let i = 0; i < nLab; i++) {
      const x = xMin + (xMax - xMin) * i / (nLab - 1);
      const anchor = i === 0 ? 'start' : i === nLab - 1 ? 'end' : 'middle';
      svg += `<text x="${X(x)}" y="${H - 6}" text-anchor="${anchor}">${U.fmtShort(U.key(new Date(x)))}</text>`;
    }
    if (opts.goal != null) {
      svg += `<line class="goal" x1="${pad.l}" x2="${W - pad.r}" y1="${Y(opts.goal)}" y2="${Y(opts.goal)}"/>`;
    }
    series.forEach((s, si) => {
      const pts = s.points.slice().sort((a, b) => a.x - b.x);
      if (!pts.length) return;
      const d = pts.map((p, i) => (i ? 'L' : 'M') + X(p.x).toFixed(1) + ' ' + Y(p.y).toFixed(1)).join(' ');
      if (si === 0 && pts.length > 1) {
        svg += `<path d="${d} L${X(pts[pts.length - 1].x).toFixed(1)} ${pad.t + ph} L${X(pts[0].x).toFixed(1)} ${pad.t + ph} Z" fill="url(#${gid})"/>`;
      }
      svg += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="${s.width || 2.5}" stroke-linejoin="round" stroke-linecap="round" ${s.dash ? 'stroke-dasharray="5 4"' : ''}/>`;
      if (s.dots !== false && pts.length <= 60) {
        pts.forEach(p => { svg += `<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="3" fill="${s.color}"/>`; });
      }
      if (si === 0) {
        const lp = pts[pts.length - 1];
        svg += `<circle cx="${X(lp.x)}" cy="${Y(lp.y)}" r="5.5" fill="var(--bg2)" stroke="${s.color}" stroke-width="2.5"/>`;
      }
    });
    svg += `<line class="hover-line" x1="0" x2="0" y1="${pad.t}" y2="${pad.t + ph}" stroke="var(--muted)" stroke-width="1" opacity="0"/>
      <circle class="hover-dot" r="6" fill="${series[0].color}" stroke="var(--text)" stroke-width="2" opacity="0"/>
      <rect x="${pad.l}" y="0" width="${pw}" height="${H}" fill="transparent" class="hit"/></svg>`;
    el.innerHTML = `<div class="chart">${svg}<div class="chart-tip" hidden></div></div>`;

    // Antippen zeigt den Wert
    const sorted = pts0.slice().sort((a, b) => a.x - b.x);
    const root = el.firstChild, hit = $('.hit', root), tip = $('.chart-tip', root);
    const line = $('.hover-line', root), dot = $('.hover-dot', root);
    const tipFmt = opts.tipFmt || (p => U.fmtShort(U.key(new Date(p.x))) + ': ' + yFmt(p.y));
    const show = clientX => {
      const r = root.getBoundingClientRect();
      const px = clientX - r.left;
      let best = sorted[0], bd = Infinity;
      sorted.forEach(p => { const dd = Math.abs(X(p.x) - px); if (dd < bd) { bd = dd; best = p; } });
      const cx = X(best.x), cy = Y(best.y);
      line.setAttribute('x1', cx); line.setAttribute('x2', cx); line.setAttribute('opacity', '.5');
      dot.setAttribute('cx', cx); dot.setAttribute('cy', cy); dot.setAttribute('opacity', '1');
      tip.hidden = false;
      tip.textContent = tipFmt(best);
      tip.style.left = U.clamp(cx, 60, W - 60) + 'px';
      tip.style.top = Math.max(-8, cy - 36) + 'px';
    };
    const hide = () => { tip.hidden = true; line.setAttribute('opacity', '0'); dot.setAttribute('opacity', '0'); };
    hit.addEventListener('pointerdown', e => show(e.clientX));
    hit.addEventListener('pointermove', e => { if (e.buttons || e.pointerType === 'mouse') show(e.clientX); });
    hit.addEventListener('pointerleave', hide);
    hit.addEventListener('pointerup', () => setTimeout(hide, 1800));
  },

  /* Balkendiagramm: data = [{ label, value }] */
  bars(el, data, opts = {}) {
    if (!data.length || data.every(d => !d.value)) { Charts.empty(el, opts.emptyText || 'Noch keine Daten'); return; }
    const W = Math.max(260, el.clientWidth || 320);
    const H = opts.height || 190;
    const pad = { l: 38, r: 8, t: 18, b: 24 };
    const pw = W - pad.l - pad.r, ph = H - pad.t - pad.b;
    const vals = data.map(d => d.value || 0);
    let max = Math.max(...vals, opts.goal || 0);
    const t = Charts.nice(0, max * 1.08, 4);
    const Y = v => pad.t + (1 - v / t.hi) * ph;
    const yFmt = opts.yFmt || (v => U.n(v));
    const slot = pw / data.length;
    const bw = Math.min(34, slot * 0.62);

    let svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
    t.ticks.forEach(v => {
      const y = Y(v);
      svg += `<line class="grid" x1="${pad.l}" x2="${W - pad.r}" y1="${y}" y2="${y}"/>
        <text x="${pad.l - 6}" y="${y + 4}" text-anchor="end">${yFmt(v)}</text>`;
    });
    data.forEach((d, i) => {
      const cx = pad.l + slot * i + slot / 2;
      const v = d.value || 0;
      const y = Y(v), h = pad.t + ph - y;
      if (v > 0) {
        const r = Math.min(6, bw / 2, h);
        svg += `<path d="M${cx - bw / 2} ${pad.t + ph} V${y + r} Q${cx - bw / 2} ${y} ${cx - bw / 2 + r} ${y} H${cx + bw / 2 - r} Q${cx + bw / 2} ${y} ${cx + bw / 2} ${y + r} V${pad.t + ph} Z"
          fill="${d.color || opts.color || 'var(--accent)'}" opacity="${d.dim ? .45 : 1}"/>`;
        if (data.length <= 10) svg += `<text x="${cx}" y="${y - 5}" text-anchor="middle" style="fill:var(--text);font-weight:700;font-size:10.5px">${yFmt(v)}</text>`;
      }
      svg += `<text x="${cx}" y="${H - 6}" text-anchor="middle">${U.esc(d.label)}</text>`;
    });
    if (opts.goal) {
      svg += `<line class="goal" x1="${pad.l}" x2="${W - pad.r}" y1="${Y(opts.goal)}" y2="${Y(opts.goal)}"/>`;
    }
    svg += '</svg>';
    el.innerHTML = `<div class="chart">${svg}</div>`;
  }
};
