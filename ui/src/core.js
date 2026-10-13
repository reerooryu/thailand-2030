export const { BrowserGame, COALITIONS, PROVINCES, isUnlocked } = ENGINE;

export let g = null;
export const $ = s => document.querySelector(s);
export const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
export const fmt = (v, d = 1) => v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

/* ---------- sparkline: single series, no legend needed ---------- */
export function spark(values, color, w = 132, h = 34) {
  if (values.length < 2) return '';
  const min = Math.min(...values), max = Math.max(...values);
  const span = (max - min) || 1;
  const pts = values.map((v, i) =>
    [6 + i * (w - 12) / (values.length - 1), h - 5 - ((v - min) / span) * (h - 12)]);
  const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  const last = pts[pts.length - 1];
  return `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true">
    <path d="${d}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="3.5" fill="${color}" stroke="var(--surface-1)" stroke-width="2"/>
  </svg>`;
}

/* ---------- meter against a threshold ---------- */
export function meter(value, ceiling, lo, hi) {
  const pct = Math.max(0, Math.min(100, ((value - lo) / (hi - lo)) * 100));
  const cPct = ((ceiling - lo) / (hi - lo)) * 100;
  const status = value >= ceiling ? 'critical' : value >= ceiling - 2 ? 'warning' : 'good';
  return `<div class="meter" role="img" aria-label="${fmt(value)} of GDP against a ${ceiling}% ceiling">
    <div class="meter-fill ${status}" style="width:${pct}%"></div>
    <div class="meter-ceiling" style="left:${cPct}%"></div>
  </div>`;
}

export function tile(label, value, unit, sub, series, color, extra = '') {
  return `<div class="tile">
    <div class="t-label">${label}</div>
    <div class="t-value">${value}<span class="t-unit">${unit || ''}</span></div>
    <div class="t-sub">${sub || ''}</div>
    ${extra}
    <div class="t-spark">${series ? spark(series, color) : ''}</div>
  </div>`;
}

/* ---------- year-on-year real growth -------------------------------------
   Two separate bugs lived here. The tile's SPARKLINE plotted `h.gap` — the
   output gap — under a label reading "Real GDP growth, year on year", so the
   number and the picture beneath it were different series entirely. And the
   value itself indexed `history.length - 5` behind a `Math.max(0, ...)` guard,
   which silently shortened the window to three quarters on the opening turn
   while still calling it year-on-year.

   Both are fixed by computing one series properly and reading the headline
   figure off its last point. Where fewer than four quarters of history exist —
   only ever the first turn — the change is annualised, so the label stays true. */
export function yoyAt(i) {
  const h = g.history[i];
  const back = Math.max(0, i - 4);
  const lag = i - back;
  if (lag < 1) return null;
  const ratio = h.rgdp / g.history[back].rgdp;
  return (Math.pow(ratio, 4 / lag) - 1) * 100;
}
export function yoyGrowth() { return yoyAt(g.history.length - 1) ?? 0; }
export function yoySeries() {
  return g.history.map((_, i) => yoyAt(i)).filter(v => v != null).slice(-10);
}

export function toast(msg, kind) {
  const box = $('#toasts');
  while (box.children.length >= 2) box.firstChild.remove();
  const t = el('div', 'toast ' + kind, msg);
  box.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

export function setGame(x) { g = x; }
