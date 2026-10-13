import { $, COALITIONS, g } from './core.js';

/* ---------- hemicycle: 500 seats, one dot each ---------- */
/* Standard parliament layout — concentric rows across a half-annulus, seats
   allocated to rows in proportion to row length so density stays even. */
export function seatPositions(total, rows, r0, r1) {
  const radii = [], counts = [];
  for (let i = 0; i < rows; i++) radii.push(r0 + (r1 - r0) * (rows === 1 ? 0 : i / (rows - 1)));
  const sum = radii.reduce((a, b) => a + b, 0);
  let assigned = 0;
  for (let i = 0; i < rows; i++) {
    const c = i === rows - 1 ? total - assigned : Math.round(total * radii[i] / sum);
    counts.push(c); assigned += c;
  }
  const pts = [];
  for (let i = 0; i < rows; i++) {
    const r = radii[i], c = counts[i];
    for (let j = 0; j < c; j++) {
      // sweep left (opposition) to right (government) across the half circle
      const t = c === 1 ? 0.5 : j / (c - 1);
      const ang = Math.PI - t * Math.PI;
      pts.push({ x: Math.cos(ang) * r, y: -Math.sin(ang) * r, ang, r });
    }
  }
  // order by angle so parties occupy contiguous wedges
  pts.sort((a, b) => b.ang - a.ang);
  return pts;
}

export function renderParliament() {
  const box = $('#parliament');
  if (!box) return;
  const cfg = COALITIONS;
  const order = ["People's", 'Kla Tham', 'Democrat', 'Others', 'Pheu Thai', 'Bhumjaithai'];
  const present = order.filter(p => cfg.parties[p]);
  const colours = cfg.seatColours || {};
  const total = 500;
  const pts = seatPositions(total, 12, 108, 232);
  // Live seats, not the config's February 2026 figures — members change party.
  const seatsOf = (p) => (g.ps.seats && g.ps.seats[p] != null) ? g.ps.seats[p] : cfg.parties[p].seats;
  const vacant = Math.max(0, total - present.reduce((a, p) => a + seatsOf(p), 0));

  let idx = 0;
  const seatEls = [];
  for (const party of present) {
    const n = seatsOf(party);
    for (let k = 0; k < n && idx < pts.length; k++, idx++) {
      const p = pts[idx];
      seatEls.push(`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4.1"
        fill="${colours[party] || 'var(--series-1)'}" data-party="${party}"
        class="seat${g.ps.coalition.includes(party) ? ' gov' : ''}"/>`);
    }
  }
  while (idx < pts.length) {   // the vacant seat
    const p = pts[idx++];
    seatEls.push(`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4.1"
      fill="${colours.Vacant || '#3a3a38'}" data-party="Vacant" class="seat vacant"/>`);
  }

  const seatsHeld = g.coalitionSeats();
  box.innerHTML = `
    <div class="parl-head">
      <div><span class="parl-seats">${seatsHeld}</span> <span class="muted">government seats · 251 needed</span></div>
      <div class="muted">House of Representatives · 500 seats · ${vacant} vacant</div>
    </div>
    <div class="parl-wrap">
      <svg viewBox="-250 -252 500 268" class="parl-svg" role="img"
           aria-label="Parliament: ${present.map(p => p + ' ' + seatsOf(p)).join(', ')}">
        ${seatEls.join('')}
      </svg>
      <div class="parl-tip" id="parl-tip" hidden></div>
      <div class="parl-idle" id="parl-idle">
        <div class="idle-big">${seatsHeld} <span class="muted">/ 251</span></div>
        <div class="muted">hover a bench</div>
      </div>
    </div>
    <div class="parl-legend">${present.map(p => {
      const b = g.bandOf(p);
      const inGov = g.ps.coalition.includes(p);
      return `<button class="lg" data-party="${p}">
        <span class="lg-dot" style="background:${colours[p]}"></span>
        <span class="lg-name">${p}</span>
        <span class="lg-seats">${seatsOf(p)}${seatsOf(p) !== g.seats2026[p]
          ? ` <span class="${seatsOf(p) > g.seats2026[p] ? 'up' : 'down'}">${
              seatsOf(p) > g.seats2026[p] ? '+' : ''}${seatsOf(p) - g.seats2026[p]}</span>` : ''}</span>
        ${p === 'Bhumjaithai' ? '<span class="lg-band">you</span>'
          : `<span class="lg-band">${g.opinion[p]} ${b.label}</span>`}
        ${inGov ? '<span class="gov-chip">gov</span>' : ''}
      </button>`;
    }).join('')}</div>`;

  const tip = $('#parl-tip');
  const show = (party) => {
    if (party === 'Vacant') {
      tip.innerHTML = `<div class="tip-name">Vacant</div><div class="tip-desc">One seat unfilled since the February election.</div>`;
    } else {
      const cp = cfg.parties[party];
      const inGov = g.ps.coalition.includes(party);
      const b = g.bandOf(party);
      tip.innerHTML = `<div class="tip-name">${party} <span class="tip-seats">${seatsOf(party)} seats</span></div>
        <div class="tip-meta">${cp.short || ''}${inGov ? ' · <b>in government</b>' : ' · opposition'}</div>
        ${party === 'Bhumjaithai' ? '' :
          `<div class="tip-meta">Relations <b>${g.opinion[party]}</b> — ${b.label}. ${b.note}</div>`}
        <div class="tip-desc">${cp.description || ''}</div>`;
    }
    tip.hidden = false;
  };
  box.querySelectorAll('.seat').forEach(c => {
    c.addEventListener('mouseenter', () => {
      const p = c.dataset.party;
      box.querySelectorAll('.seat').forEach(o =>
        o.classList.toggle('dim', o.dataset.party !== p));
      show(p);
    });
  });
  box.querySelectorAll('.lg').forEach(bn => {
    bn.addEventListener('mouseenter', () => {
      const p = bn.dataset.party;
      box.querySelectorAll('.seat').forEach(o => o.classList.toggle('dim', o.dataset.party !== p));
      show(p);
    });
  });
  const idle = $('#parl-idle');
  const showTip = () => { tip.hidden = false; if (idle) idle.hidden = true; };
  box.querySelectorAll('.seat,.lg').forEach(n2 => n2.addEventListener('mouseenter', showTip));
  box.addEventListener('mouseleave', () => {
    tip.hidden = true;
    if (idle) idle.hidden = false;
    box.querySelectorAll('.seat').forEach(o => o.classList.remove('dim'));
  });
}
