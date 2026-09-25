const { BrowserGame, COALITIONS, isUnlocked } = ENGINE;

let g = null;
const $ = s => document.querySelector(s);
const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
const fmt = (v, d = 1) => v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

/* ---------- prologue ---------- */
function renderPrologue() {
  const wrap = $('#prologue');
  wrap.innerHTML = '';
  wrap.appendChild(el('h1', 'title', 'Thailand 2030'));
  wrap.appendChild(el('p', 'sub',
    'February 2026. Bhumjaithai holds <b>191 of 500 seats</b> — sixty short of a majority. ' +
    'Your government has promised nominal GDP per capita of <b>USD 15,000 by the end of 2030</b>. ' +
    'The IMF baseline is 9,092.<br><br>Before anything else: who governs with you?'));
  const grid = el('div', 'coalition-grid');
  for (const o of COALITIONS.options) {
    const card = el('div', 'coalition' + (o.available ? '' : ' unavailable'));
    card.appendChild(el('div', 'c-name', o.name));
    card.appendChild(el('div', 'c-seats', `${o.seats} seats <span class="muted">· +${o.seats - 251} over the line</span>`));
    card.appendChild(el('div', 'c-flavour', `“${o.flavour}”`));
    if (o.available) {
      card.appendChild(el('div', 'c-desc', o.describe));
      const deltas = Object.entries(o.opinion_delta).filter(([, v]) => v !== 0)
        .map(([k, v]) => `<span class="${v > 0 ? 'up' : 'down'}">${k} ${v > 0 ? '+' : ''}${v}</span>`).join(' ');
      card.appendChild(el('div', 'c-deltas', deltas));
      card.onclick = () => start(o.id);
    }
    grid.appendChild(card);
  }
  wrap.appendChild(grid);
}

function start(id) {
  g = new BrowserGame(id);
  $('#prologue').hidden = true;
  $('#game').hidden = false;
  // The song opens here rather than on page load — see the music block at the
  // foot of this file. Called from inside the click handler deliberately: that
  // makes it a user gesture, which is what keeps every browser from blocking it.
  if (window.playAnthem) window.playAnthem();
  g.openTurn();
  render();
}

/* ---------- sparkline: single series, no legend needed ---------- */
function spark(values, color, w = 132, h = 34) {
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
function meter(value, ceiling, lo, hi) {
  const pct = Math.max(0, Math.min(100, ((value - lo) / (hi - lo)) * 100));
  const cPct = ((ceiling - lo) / (hi - lo)) * 100;
  const status = value >= ceiling ? 'critical' : value >= ceiling - 2 ? 'warning' : 'good';
  return `<div class="meter" role="img" aria-label="${fmt(value)} of GDP against a ${ceiling}% ceiling">
    <div class="meter-fill ${status}" style="width:${pct}%"></div>
    <div class="meter-ceiling" style="left:${cPct}%"></div>
  </div>`;
}

function tile(label, value, unit, sub, series, color, extra = '') {
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
function yoyAt(i) {
  const h = g.history[i];
  const back = Math.max(0, i - 4);
  const lag = i - back;
  if (lag < 1) return null;
  const ratio = h.rgdp / g.history[back].rgdp;
  return (Math.pow(ratio, 4 / lag) - 1) * 100;
}
function yoyGrowth() { return yoyAt(g.history.length - 1) ?? 0; }
function yoySeries() {
  return g.history.map((_, i) => yoyAt(i)).filter(v => v != null).slice(-10);
}

/* ---------- main render ---------- */

/* Sovereign ratings: three agencies, one small box. Outlook as an arrow. */
function ratingLabel(a) {
  return (a.name === "Moody's" ? ['Baa3', 'Baa2', 'Baa1', 'A3'] : ['BBB-', 'BBB', 'BBB+', 'A-'])[a.notch];
}
function ratingsBox() {
  const out = { '-1': ['▼', 'down', 'negative'], '0': ['', 'muted', 'stable'], '1': ['▲', 'up', 'positive'] };
  return `<div class="ratings" title="Sovereign credit ratings. Bounded A- to BBB-, the last investment grade.">
    ${g.agencies.map(a => {
      const [arrow, cls, word] = out[a.outlook];
      return `<span class="rt${a.notch <= 1 ? ' low' : a.notch >= 3 ? ' high' : ''}"
        title="${a.name}: ${ratingLabel(a)}, outlook ${word}">
        <span class="rt-a">${a.name}</span> <b>${ratingLabel(a)}</b>${arrow ? ` <span class="${cls}">${arrow}</span>` : ''}</span>`;
    }).join('')}
  </div>`;
}

function render() {
  const s = g.state;
  const hist = g.history.slice(-10);
  const headline = g.headline();
  const target = 15000, baseline = 9092;
  const pctToTarget = Math.max(0, Math.min(100, (headline / target) * 100));

  $('#turn-label').textContent = g.label;
  $('#turns-left').textContent = `${g.turnsLeft} quarter${g.turnsLeft === 1 ? '' : 's'} remaining`;
  const left = g.actionCap - g.actionsThisTurn;
  $('#actions').innerHTML = `<span class="act-label">Actions</span>` +
    Array.from({ length: g.actionCap }, (_, i) =>
      `<span class="pip${i < left ? ' on' : ''}"></span>`).join('') +
    `<span class="muted">${left} of ${g.actionCap} left</span>`;

  /* KPI row */
  const gdpExtra = `<div class="target-track" role="img" aria-label="${Math.round(headline)} of a 15,000 target">
      <div class="target-fill" style="width:${pctToTarget}%"></div>
      <div class="target-mark" style="left:${(baseline / target) * 100}%" title="IMF baseline 9,092"></div>
      <div class="target-mark hi" style="left:${(10000 / target) * 100}%" title="10,000 — the practical ceiling of one term"></div>
    </div>
    <div class="t-foot"><span class="muted">baseline 9,092</span><span class="muted">10k</span><span class="muted">promised 15,000</span></div>`;

  g.gdpTrack = g.gdpTrack || [];
  if (g.gdpTrack.length <= g.quarter) g.gdpTrack.push(headline);
  else g.gdpTrack[g.quarter] = headline;

  $('#kpis').innerHTML = [
    tile('GDP per capita', Math.round(headline).toLocaleString(), ' USD', 'level now · the target is for 2030',
         g.gdpTrack.slice(-10), 'var(--series-1)', gdpExtra),
    tile('Real GDP growth', fmt(yoyGrowth()), '%',
         'year on year', yoySeries(), 'var(--series-3)'),
    tile('Headline inflation', fmt(s.cpiYoy), '%', `core ${fmt(s.cpiCoreYoy)}%`,
         hist.map(h => h.cpiYoy), 'var(--series-2)'),
    tile('SET Index', Math.round(g.set).toLocaleString(), '', 'the fastest-moving number here',
         g.setHistory.slice(-10), 'var(--series-1)'),
  ].join('');

  /* secondary row */
  const ceil = g.debtCeiling;
  const debtStatus = s.debtGdp >= ceil ? 'critical' : s.debtGdp >= ceil - 2 ? 'warning' : 'good';
  const debtIcon = debtStatus === 'good' ? '●' : '▲';
  $('#secondary').innerHTML = `
    <div class="tile wide">
      <div class="t-label">Public debt <span class="status ${debtStatus}">${debtIcon} ${debtStatus === 'critical' ? `Above the ${ceil}% ceiling`
   : debtStatus === 'warning' ? `Approaching the ${ceil}% ceiling`
   : `Below the ${ceil}% ceiling`}</span></div>
      <div class="t-value">${fmt(s.debtGdp)}<span class="t-unit">% of GDP</span></div>
      ${meter(s.debtGdp, g.debtCeiling, 60, 90)}
      <div class="t-foot"><span class="muted">ceiling ${g.debtCeiling}%</span>
        <span class="${s.riskPremium > 0.05 ? 'down' : 'muted'}">${s.riskPremium > 0.05
          ? `risk premium +${fmt(s.riskPremium, 2)}pp` : 'no risk premium'}</span>
        <span class="muted">90</span></div>
      ${ratingsBox()}
    </div>
    ${tile('Private investment', fmt(s.invRate), '% of GDP', '31.2% in 1996 · never recovered',
           hist.map(h => h.invRate), 'var(--series-3)')}
    ${tile('Potential growth', fmt(s.potentialGrowthYoy, 2), '%', 'the Legacy score',
           hist.map(h => h.potentialGrowthYoy), 'var(--series-1)')}
    ${tile('Household debt', fmt(s.hhDebt), '% of GDP', '87.5% in 2026 · the drag on every rate cut',
           hist.map(h => h.hhDebt), 'var(--series-2)')}`;

  /* politics */
  const seats = g.coalitionSeats();
  $('#politics').innerHTML = `
    <div class="pol-head">
      <div><span class="pol-seats">${seats}</span> <span class="muted">of 500 · majority 251 ·
        Bhumjaithai ${g.ps.seats['Bhumjaithai']}${g.ps.seats['Bhumjaithai'] !== g.seats2026['Bhumjaithai']
          ? ` <span class="down">${g.ps.seats['Bhumjaithai'] - g.seats2026['Bhumjaithai']}</span>` : ''}</span></div>
      <div class="muted">${g.ps.coalition.join(' + ')}</div>
      <div><span class="muted">Approval</span> <b>${g.approval}%</b></div>
    </div>
    <div class="parties">${Object.entries(g.opinion).filter(([k]) => k !== 'Bhumjaithai')
      .map(([k, v]) => {
        const b = g.bandOf(k);
        const inGov = g.ps.coalition.includes(k);
        return `<div class="party${inGov ? ' in-gov' : ''}">
          <div class="p-name">${k}${inGov ? ' <span class="gov-chip">gov</span>' : ''}
            <span class="p-seats">${g.ps.seats[k]}${g.ps.seats[k] !== g.seats2026[k]
              ? ` <span class="${g.ps.seats[k] > g.seats2026[k] ? 'up' : 'down'}">${
                  g.ps.seats[k] > g.seats2026[k] ? '+' : ''}${g.ps.seats[k] - g.seats2026[k]}</span>` : ''}</span></div>
          <div class="p-bar"><div class="p-fill b${Math.floor(v / 12.5)}" style="width:${v}%"></div></div>
          <div class="p-val">${v} <span class="muted">${b.label}</span></div>
        </div>`;
      }).join('')}</div>`;

  renderNews();
  renderDeck();
  renderConstitution();
  renderParliament();
  $('#end-turn').disabled = g.pending.length > 0 || g.quarter >= 16;
  $('#end-turn').textContent = g.quarter >= 16 ? 'Term complete' :
    g.pending.length ? `Resolve ${g.pending.length} item${g.pending.length > 1 ? 's' : ''} first` : 'End quarter →';
}


/* ---------- hemicycle: 500 seats, one dot each ---------- */
/* Standard parliament layout — concentric rows across a half-annulus, seats
   allocated to rows in proportion to row length so density stays even. */
function seatPositions(total, rows, r0, r1) {
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

function renderParliament() {
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

function renderNews() {
  const box = $('#news');
  box.innerHTML = '';
  if (!g.pending.length) {
    box.innerHTML = `<div class="empty">No urgent business.<br><span class="muted">The desk is clear this quarter.</span></div>`;
    return;
  }
  for (const e of g.pending) {
    const c = el('div', 'newsitem');
    c.appendChild(el('div', 'n-tag', 'BLOCKING'));
    c.appendChild(el('div', 'n-head', e.headline));
    c.appendChild(el('div', 'n-body', e.body));
    const opts = el('div', 'n-opts');
    for (const o of e.options) {
      // Event options honour `requiresFlags` exactly as card options do. They did
      // not until now — the check simply was not written on this path — so a
      // gated event choice rendered as an ordinary clickable button and the gate
      // existed only in the data. Anything conditional on the tech tree was
      // therefore free.
      // Two different kinds of unselectable, and they must not render alike.
      // `unavailable` is a choice that is permanently off the table and exists
      // for the line underneath it — the flavour IS the point, so it stays. A
      // failed `requiresFlags` is a choice you have not earned yet, where the
      // flavour would be a spoiler and the note explains the gate instead.
      // Collapsing the two printed an empty "Requires:" over the joke.
      const gated = !isUnlocked(o, g.flags) && !o.unavailable;
      const locked = o.unavailable || gated;
      const b = el('button', 'opt' + (locked ? ' locked' : ''));
      b.innerHTML = `<div class="o-label">${o.label}</div>` +
        (gated
          ? `<div class="o-lock">${o.lockedNote ||
              'Requires: ' + (o.requiresFlags || []).join(', ')}</div>`
          : (o.flavour ? `<div class="o-flavour">${o.flavour}</div>` : '')) +
        (locked ? '' : renderDeltas(o.opinion));
      if (locked) b.disabled = true;
      else b.onclick = () => { g.resolveEvent(e.id, o.id); render(); };
      opts.appendChild(b);
    }
    c.appendChild(opts);
    box.appendChild(c);
  }
}

function renderDeltas(o) {
  if (!o) return '';
  const parts = Object.entries(o).filter(([, v]) => v !== 0)
    .map(([k, v]) => `<span class="${v > 0 ? 'up' : 'down'}">${k} ${v > 0 ? '+' : ''}${v}</span>`);
  return parts.length ? `<div class="o-deltas">${parts.join('')}</div>` : '';
}


/* ---------- the constitution ---------- */
const PARTY_SHORT = { Bhumjaithai: 'BJT', "People's": 'PP', 'Pheu Thai': 'PT', 'Kla Tham': 'KT',
                      Democrat: 'DEM', Others: 'OTH', Senate: 'SEN' };
function partyPill(p, extra = '') {
  const c = (COALITIONS.seatColours || {})[p] || '#6b6b66';
  return `<span class="ppill${extra}" style="--pc:${c}" title="${p}">${PARTY_SHORT[p] || p}</span>`;
}
const STAGES = [
  ['idle', 'Section 256'], ['principles', 'Principles'], ['drafting', 'Drafting'], ['final', 'Final referendum'],
];
function renderConstitution() {
  const box = $('#constitution');
  if (!box) return;
  const v = g.constitutionView();
  const at = STAGES.findIndex(x => x[0] === v.stage);
  const done = v.stage === 'ratified' ? 4 : at;
  const steps = STAGES.map(([id, name], i) =>
    `<div class="cs-step${i < done ? ' done' : ''}${i === at ? ' now' : ''}">${i + 1}. ${name}</div>`).join('');
  const noActions = g.actionsThisTurn >= g.actionCap;

  let status = '', action = '';
  if (v.stage === 'idle') {
    const t = v.s256;
    status = `The February referendum approved a rewrite, 60.16% yes. First, amend Section 256 to set up the drafting assembly.
      <span class="chip ${t.passes ? 'pass' : 'fail'}">${t.passes ? 'passes' : 'fails'} · ${t.house} MPs, ${t.senate} senators</span>`;
    action = 'Table the Section 256 amendment';
  } else if (v.stage === 'principles') {
    status = `Choose a position on each part. Changed clauses go to a joint sitting (351 of 700, and 67 senators). Clauses that fail keep the current text. Then the package goes to the second referendum.`;
    action = 'Put the principles to parliament and the country';
  } else if (v.stage === 'drafting') {
    status = `The drafting assembly is writing the text. It delivers in ${g.labelAt ? g.labelAt(v.draftingUntil) : 'Q' + (v.draftingUntil + 1)}. Principles approved with ${v.principlesYes}% yes.`;
  } else if (v.stage === 'final') {
    status = `The draft is ready. Call the final referendum.` +
      (g.quarter > v.electoralDeadline ? ' <span class="down">Too late for the electoral change to apply in 2030.</span>' : '');
    action = 'Call the final referendum';
  } else if (v.stage === 'ratified') {
    status = `Ratified with ${v.finalYes}% yes.`;
  } else {
    status = `The rewrite failed${v.finalYes != null ? ` at the final referendum, ${v.finalYes}% yes` : v.principlesYes != null ? ` at the second referendum, ${v.principlesYes}% yes` : ''}. It passes to the next parliament.`;
  }

  const rows = v.parts.map(p => {
    const opts = p.positions.map((pos, i) => {
      const sel = i === p.selected;
      const t = pos.tally;
      const backers = t ? t.backers.map(b => partyPill(b)).join('') : '<span class="muted">current text</span>';
      const isProp = p.proposal && p.proposal.index === i;
      const verdict = t ? `<span class="cs-v ${t.passes ? 'up' : 'down'}" title="${t.house} MPs + ${t.senate} senators. Needs 351, with at least 67 senators.">${t.passes ? '✓' : '✗'} ${t.house}+${t.senate}</span>` : '';
      return `<button class="cs-opt${sel ? ' sel' : ''}${pos.sgLite ? ' sg' : ''}" data-part="${p.id}" data-i="${i}"
          ${v.editing ? '' : 'disabled'} title="${pos.text}">
          <div class="cs-ol">${pos.label}${isProp ? ' ' + partyPill(p.proposal.party, ' prop') + '<span class="cs-prop">proposal</span>' : ''} ${verdict}</div>
          ${pos.sgLite ? `<div class="cs-sg">Singapore-lite${pos.halfStrength ? ' · <span class="down">half strength without civil service reform and anti-corruption enforcement</span>' : ''}</div>` : ''}
          <div class="cs-ot">${pos.text}</div>
          <div class="cs-pills">${backers}</div>
        </button>`;
    }).join('');
    return `<div class="cs-part${p.struck ? ' struck' : ''}"><div class="cs-pn">${p.name}${p.struck ? ' <span class="down">struck</span>' : ''}</div>
      <div class="cs-opts" style="--n:${p.positions.length}">${opts}</div></div>`;
  }).join('');

  const pr = v.pressure, bb = v.backbench;
  const prCls = pr >= bb.revolt ? 'critical' : pr >= bb.warning ? 'warning' : 'good';
  const meters = `<div class="cs-meters">
      <span>Reform score <b>${v.score}</b></span>
      ${v.sg ? `<span>Singapore-lite <b class="sg-t">${v.sg}</b><span class="muted"> / 3</span></span>` : ''}
      <span>Bhumjaithai tolerance <b class="${prCls === 'good' ? '' : 'down'}">${pr}</b><span class="muted"> / warning ${bb.warning}, revolt ${bb.revolt}</span></span>
      ${v.stage === 'ratified' || v.stage === 'failed' ? '' :
        `<span>Referendum projection <b class="${v.referendum >= 50 ? 'up' : 'down'}">${v.referendum}%</b></span>`}
    </div>`;

  box.innerHTML = `<div class="cs-steps">${steps}</div>
    <div class="cs-status">${status}</div>
    ${meters}
    <div class="cs-parts">${rows}</div>
    ${action ? `<button class="primary cs-act" ${noActions || g.con.lastActQuarter === g.quarter ? 'disabled' : ''}>${action} <span class="cs-cost">· 1 action</span></button>` : ''}`;

  box.querySelectorAll('.cs-opt').forEach(b => b.onclick = () => {
    g.setDraft(b.dataset.part, +b.dataset.i); renderConstitution();
  });
  const act = box.querySelector('.cs-act');
  if (act) act.onclick = () => {
    const r = g.constitutionAct();
    toast(r.msg, r.ok ? 'good' : 'critical');
    render();
  };
}

function renderDeck() {
  const box = $('#deck');
  box.innerHTML = '';
  const cards = g.deck();
  if (!cards.length) { box.innerHTML = '<div class="empty">No cards available.</div>'; return; }
  for (const card of cards) {
    const c = el('div', 'card');
    const head = el('div', 'card-head');
    const prop = card.proposal;
    const tag = prop
      ? `<span class="prop-tag" style="--pc:${prop.colour}">${prop.party}</span>` : '';
    head.innerHTML = `<div class="cd-ministry">${card.ministry}${tag}</div>` +
                     `<div class="cd-name">${card.name}</div>` +
                     (prop ? `<div class="cd-prop">${prop.note}</div>` : '');
    head.onclick = () => c.classList.toggle('open');
    c.appendChild(head);
    const body = el('div', 'card-body');
    body.appendChild(el('div', 'cd-brief', card.briefing));
    const noActions = g.actionsThisTurn >= g.actionCap;
    for (const o of card.options) {
      const locked = o.unavailable || !isUnlocked(o, g.flags);
      const b = el('button', 'opt' + (locked ? ' locked' : ''));
      if (locked) {
        const why = o.unavailable
          ? `<div class="o-flavour">${o.flavour || ''}</div>`
          : `<div class="o-lock">${o.lockedNote || 'Requires: ' + (o.requiresFlags || []).join(', ')}</div>`;
        b.innerHTML = `<div class="o-label">${o.unavailable ? '' : '🔒 '}${o.label}</div>` + why;
        b.disabled = true;
        body.appendChild(b);
        continue;
      }
      b.disabled = noActions;
      const v = g.previewVote(card, o);
      const cross = v && v.defectorTotal
        ? `<span class="chip cross">+${v.defectorTotal} crossbench</span>` : '';
      const badge = !o.requiresLegislation
        ? '<span class="chip exec">executive</span>'
        : (v && v.passed ? `<span class="chip pass">passes +${v.margin}</span>`
                         : `<span class="chip fail">fails by ${v ? -v.margin : '?'}</span>`) + cross;
      const dep = o.dependsOn && !g.flags.has(o.dependsOn.flag)
        ? `<div class="o-dep">⚠ ×${o.dependsOn.withoutFactor} — ${o.dependsOn.note || o.dependsOn.flag}</div>` : '';
      b.innerHTML = `<div class="o-label">${o.label} ${badge}</div>` +
        (o.flavour ? `<div class="o-flavour">${o.flavour}</div>` : '') + dep +
        renderEffects(o.effects) + renderWhip(v);
      b.onclick = () => {
        const r = g.playCard(card.id, o.id);
        toast(`${card.name}: ${r.msg}`, r.ok ? 'good' : 'critical');
        render();
      };
      body.appendChild(b);
    }
    c.appendChild(body);
    box.appendChild(c);
  }
}

/* The whip count. A bill that fails should say WHY it fails and what would
   change it — that is information any chief whip would have, and without it a
   defeat reads as an arbitrary wall rather than a puzzle. */
function renderWhip(v) {
  if (!v) return '';
  const rows = v.whip.map(p => {
    const cls = p.stance === 'yes' ? 'w-yes' : p.stance === 'abstain' ? 'w-abs' : 'w-no';
    const note = p.stance === 'yes' ? 'backs it'
      : p.redLine ? 'red line — opinion will not move them'
      : p.needed != null && p.needed <= 100 ? `needs ${p.needed} (now ${p.opinion})`
      : 'unreachable';
    const gain = v.defectors[p.party] ? ` <span class="w-cross">+${v.defectors[p.party]}</span>` : '';
    return `<tr><td class="${cls}">${p.party}</td><td class="w-seats">${p.seats}${gain}</td>
            <td class="w-note">${note}</td></tr>`;
  }).join('');
  return `<details class="whip"><summary>whip count — ${v.yes} of 251</summary>
    <table>${rows}</table></details>`;
}

/** Every effect a card can carry needs a label here, or it is applied by the
 *  engine and shown to nobody. `formalisation`, `savingsRate` and `setSupport`
 *  were missing, which made the land-titling and cooperative-debt cards look
 *  half-empty when they are among the strongest bills in the game.
 *
 *  'reform effort' is deliberately not 'reform': the number on a card is a
 *  level of EFFORT, which accumulates into the reform STOCK at about 6% a
 *  quarter against 1.5% decay, and is scaled by the coalition's reform capacity
 *  first. +55 effort under a 0.7-capacity coalition contributes roughly 33
 *  points of stock across a full term, not 55. */
const EFFECT_LABEL = {
  capitalSpend: 'capital', transfers: 'transfers', taxRate: 'revenue', govConsumption: 'gov consumption',
  reformIndex: 'reform effort', executionBonus: 'execution', fdiSignal: 'FDI signal',
  approvalBoost: 'approval', institutionalSupport: 'institutional', humanCapital: 'human capital',
  formalisation: 'formalisation', savingsRate: 'saving', setSupport: 'market sentiment',
};
function renderEffects(e) {
  if (!e) return '';
  const parts = Object.entries(e).filter(([k, v]) => v && EFFECT_LABEL[k])
    .map(([k, v]) => `<span class="${v > 0 ? 'up' : 'down'}">${EFFECT_LABEL[k]} ${v > 0 ? '+' : ''}${v}</span>`);
  return parts.length ? `<div class="o-deltas">${parts.join('')}</div>` : '';
}

function toast(msg, kind) {
  const box = $('#toasts');
  while (box.children.length >= 2) box.firstChild.remove();
  const t = el('div', 'toast ' + kind, msg);
  box.appendChild(t);
  setTimeout(() => t.remove(), 2600);
}

$('#end-turn').onclick = () => {
  const r = g.endTurn();
  if (!r.ok) { toast(r.msg, 'warning'); return; }
  (g.lastRatingActions || []).forEach(t => toast(t, /downgrade|negative/.test(t) ? 'warning' : 'info'));
  if (r.snap) { showEnd(null, true); return; }
  if (r.fallen) { showEnd(r.walked); return; }
  if (g.quarter >= 16) { showEnd(); return; }
  g.openTurn();
  render();
  if (g.pending.length) toast('News requires your attention', 'warning');
};

function showEnd(walked, snap = false) {
  $('#toasts').innerHTML = '';
  const s = g.state;
  const start = g.history[3];
  const h = g.headline();
  $('#game').hidden = true;
  const w = $('#prologue');
  w.hidden = false;
  const fell = !!walked;
  const yrs = (g.quarter) / 4;
  const realCagr = (Math.pow(s.rgdp / start.rgdp, 1 / Math.max(yrs, 0.5)) - 1) * 100;
  const cpiCagr  = (Math.pow(s.cpi / start.cpi, 1 / Math.max(yrs, 0.5)) - 1) * 100;
  const setChg   = (g.set / 1621.62 - 1) * 100;
  const gov      = g.government();

  const head = fell
    ? `<h1 class="title fallen">The government has fallen</h1>
       <p class="sub"><b>${walked.join(' and ')}</b> withdrew in ${g.label}, taking the coalition below 251.
       You leave office ${g.turnsLeft} quarter${g.turnsLeft === 1 ? '' : 's'} early. Someone else inherits the arithmetic.</p>`
    : snap
    ? `<h1 class="title">Snap election · ${g.label}</h1>
       <p class="sub">You dissolved the House ${g.turnsLeft} quarter${g.turnsLeft === 1 ? '' : 's'} early. The country votes on what you have done so far.</p>`
    : `<h1 class="title">March 2030</h1>
       <p class="sub">The House elected in February 2026 has expired. The country votes.</p>`;

  /* the count — rendered before the record, because the record is now read
     through it: a government returned to office gets to answer for its own
     December 2030 promise, and one that is not, does not. */
  const elec = fell ? null : g.election();
  // Did anyone change party mid-term? Decides whether the seat table needs a
  // dissolution column. Must come AFTER `elec` exists.
  const moved = !!elec && elec.results.some(r => r.before !== r.origin);
  const electionBlock = !elec ? '' : `
    <div class="election ${elec.verdict}">
      <div class="el-head">
        <div class="el-verdict">${elec.headline}</div>
        <div class="el-seats">${elec.playerSeats}<span class="el-seats-u"> seats</span>
          <span class="${elec.playerSeats >= 191 ? 'up' : 'down'}">${elec.playerSeats >= 191 ? '+' : ''}${elec.playerSeats - 191}</span></div>
      </div>
      <p class="el-detail">${elec.detail}</p>
      ${moved ? '<p class="el-note">Members changed party during the term. '
        + 'Changes are measured against 2026.</p>' : ''}
      <table class="el-table">
        <tr><th>Party</th><th>2026</th>${moved ? '<th>Dissolution</th>' : ''}<th>${snap ? g.label.slice(0, 4) : '2030'}</th><th></th><th>After the count</th></tr>
        ${elec.results.map(r => `<tr class="${r.inGov ? 'was-gov' : ''}">
          <td class="el-p">${r.party}${r.inGov ? ' <span class="gov-chip">gov</span>' : ''}</td>
          <td class="el-n muted">${r.origin}</td>
          ${moved ? `<td class="el-n ${r.before !== r.origin ? (r.before > r.origin ? 'up' : 'down') : 'muted'}">${r.before}</td>` : ''}
          <td class="el-n"><b>${r.after}</b></td>
          <td class="el-n ${r.change > 0 ? 'up' : r.change < 0 ? 'down' : 'muted'}">${r.change > 0 ? '+' : ''}${r.change}</td>
          <td class="el-r ${r.willJoin ? '' : 'muted'}">${r.party === 'Bhumjaithai' ? '' : r.reason}</td>
        </tr>`).join('')}
      </table>
      ${electionParliament(elec)}
      <div class="el-foot">${elec.bestCoalition
        ? `<b>${elec.bestSeats}</b> seats · ${elec.bestCoalition.join(' + ')} · 251 needed`
        : `<b>No workable majority.</b> 251 needed and every door to it is closed.`}</div>
    </div>`;

  const row = (label, value, note, cls) =>
    `<tr><td class="s-label">${label}</td><td class="s-val ${cls || ''}">${value}</td>
     <td class="s-note">${note || ''}</td></tr>`;

  w.innerHTML = head + electionBlock + `
    <div class="endgrid">
      ${endTile('Headline', Math.round(h).toLocaleString() + ' USD',
                `IMF baseline ${g.quarter < 16 ? 'for ' + g.label : 'was'} ${g.baseline().toLocaleString()}`,
                h >= g.baseline() ? 'good' : 'critical')}
      ${endTile('Legacy', fmt(s.potentialGrowthYoy, 2) + '%', 'potential growth you leave behind',
                s.potentialGrowthYoy >= 2.4 ? 'good' : 'warning')}
      ${endTile('Debt', fmt(s.debtGdp) + '% of GDP',
                `ceiling ${g.debtCeiling}%${s.riskPremium > 0.05 ? ` · risk premium +${fmt(s.riskPremium, 2)}pp` : ''}`,
                s.debtGdp >= g.debtCeiling ? 'critical' : 'good')}
      ${endTile('Investment', fmt(s.invRate) + '% of GDP', '31.2% in 1996',
                s.invRate >= 19 ? 'good' : 'warning')}
    </div>

    <div class="statgrid">
      <div class="statcol">
        <div class="statcol-h">Economy</div>
        <table class="stats">
          ${row('Real GDP growth', fmt(realCagr, 2) + '%', 'annualised over the term')}
          ${row('Inflation', fmt(cpiCagr, 2) + '%', 'CPI, annualised')}
          ${row('Output gap', (s.gap >= 0 ? '+' : '') + fmt(s.gap, 2) + '%', 'at the end')}
          ${row('Potential growth', fmt(s.potentialGrowthYoy, 2) + '%', 'from 2.1% in 2026')}
          ${row('Private investment', fmt(s.invRate) + '%', 'of GDP, from 18.0%')}
          ${row('SET Index', Math.round(g.set).toLocaleString(),
                `${setChg >= 0 ? '+' : ''}${fmt(setChg)}% from 1,622`, setChg >= 0 ? 'good' : 'critical')}
          ${row('Capital stock', fmt(s.capital / start.capital * 100 - 100, 1) + '%', 'growth over the term')}
          ${row('Reform stock', fmt(s.reformStock, 1), 'accumulated structural effort')}
          ${row('Household debt', fmt(s.hhDebt) + '%', 'of GDP, from 87.5%',
                s.hhDebt <= 82 ? 'good' : s.hhDebt >= 90 ? 'warning' : '')}
        </table>
      </div>
      <div class="statcol">
        <div class="statcol-h">Fiscal</div>
        <table class="stats">
          ${row('Gross debt', fmt(s.debtGdp) + '%', `of GDP · ceiling ${g.debtCeiling}%`,
                s.debtGdp >= g.debtCeiling ? 'critical' : '')}
          ${row('Credit ratings', g.agencies.map(ratingLabel).join(' / '), 'S&P / Fitch / Moody\'s',
                g.agencies.some(a => a.notch === 0) ? 'critical' : g.agencies.some(a => a.notch < 2) ? 'warning'
                : g.agencies.some(a => a.notch > 2) ? 'good' : '')}
          ${row('Risk premium', '+' + fmt(s.riskPremium, 2) + 'pp', 'over the base borrowing rate',
                s.riskPremium > 0.4 ? 'critical' : s.riskPremium > 0.05 ? 'warning' : '')}
          ${row('Primary balance', (s.primaryBalance >= 0 ? '+' : '') + fmt(s.primaryBalance, 2) + '%',
                'of GDP', s.primaryBalance < 0 ? 'warning' : 'good')}
          ${row('Public capital', fmt(s.capitalSpend, 2) + '%', 'of GDP, from 6.10%')}
          ${row('Transfers', fmt(s.transfers, 2) + '%', 'of GDP')}
          ${row('Revenue', fmt(s.taxRate, 2) + '%', 'of GDP, from 21.10%')}
          ${row('Execution rate', fmt((g.params.executionCapital + g.stance.executionBonus) * 100) + '%',
                'of capital budget disbursed')}
        </table>
      </div>
      <div class="statcol">
        <div class="statcol-h">Politics</div>
        <table class="stats">
          ${row('Approval', g.approval + '%', '', g.approval >= 45 ? 'good' : g.approval >= 30 ? 'warning' : 'critical')}
          ${row('Coalition', gov.seats + ' seats', '251 needed', gov.fallen ? 'critical' : 'good')}
          ${(() => { const cv = g.constitutionView();
            const word = { idle: 'Not started', principles: 'Principles stage', drafting: 'In drafting', final: 'Awaiting referendum', ratified: 'Ratified', failed: 'Failed' }[cv.stage];
            return row('Constitution', word, cv.stage === 'ratified' ? `reform score ${cv.score}` : '',
                       cv.stage === 'ratified' ? 'good' : cv.stage === 'failed' ? 'critical' : ''); })()}
          ${Object.entries(g.opinion).filter(([k]) => k !== 'Bhumjaithai').map(([k, v]) =>
            row(k, String(v), g.bandOf(k).label,
                v >= 61 ? 'good' : v >= 41 ? '' : v >= 21 ? 'warning' : 'critical')).join('')}
        </table>
      </div>
    </div>

    <div class="verdict">
      <div class="verdict-h">Assessment · Second Anutin Cabinet (2026–${g.label.slice(0, 4)})</div>
      ${renderIdeology(g.ideology())}
      ${verdictSections(g, s, realCagr, setChg, gov).map(v => `
        <div class="vsec">
          <div class="vsec-h">${v.h}${v.tag ? ` <span class="vtag">${v.tag}</span>` : ''}</div>
          <p>${typeof v.t === 'string' ? v.t : v.t.text}</p>
        </div>`).join('')}
      <div class="vclose">${verdictClose(g, s, gov, elec)}</div>
    </div>
    ${renderAchievements(g.achievements(elec))}
    ${fell ? '<p class="sub">Scored on what you managed before it ended.</p>' : ''}
    <div class="logbox">${g.log.map(l => `<div class="logline"><span class="muted">Q${l.quarter + 1}</span> ${l.text}</div>`).join('')}</div>
    <button id="again" class="primary">Play again</button>`;
  $('#again').onclick = () => renderPrologue();
}


/* ---- end-of-term assessment ---------------------------------------------
   Written as an outside analyst filing after the term ends, not as a score.
   Seven dimensions, each banded seven ways, each expected to praise what
   worked and say plainly what did not — a cabinet that fixed potential growth
   and wrecked the balance sheet gets both paragraphs, in its own words. The
   headline band splits on the IMF baseline of 9,092, the only number in this
   game with an outside author. */
function verdictSections(g, s, realCagr, setChg, gov) {
  const start = g.history[3];
  const pick = (bands, v) => (bands.find(b => v >= b.min) || bands[bands.length - 1]);
  const h = g.headline();
  const base = g.baseline();
  const gap = h - base;
  const n = x => Math.round(x).toLocaleString();
  const pb = fmt(Math.abs(s.primaryBalance), 2);
  const rs = fmt(s.reformStock, 0);

  // ---- headline: the level, against the only number here with an outside author
  const growth = pick([
    { min: 700, tag: 'historic', t:
      `${n(h)} dollars per head, ${n(gap)} clear of the IMF's projection. That is the top of what sixteen ` +
      `quarters can produce, and no post-crisis government has beaten the Fund's baseline by this much. One ` +
      `caution: a level this far above trend is partly cycle, borrowed from the next term.` },
    { min: 400, tag: 'well ahead', t:
      `${n(h)} dollars per head, ${n(gap)} clear of the IMF's projection. A substantial beat, built on real ` +
      `output rather than a kind deflator. Still well short of the 15,000 promised in February 2026, and you ` +
      `were asked about that for four years.` },
    { min: 150, tag: 'ahead of baseline', t:
      `${n(h)} dollars per head, ${n(gap)} above the IMF baseline. A clear beat, if not a dramatic one, and ` +
      `beating the Fund's Thailand number is not routine. The 15,000 target was always a campaign number.` },
    { min: -80, tag: 'at baseline', t:
      `${n(h)} dollars per head against a baseline of ${n(base)}: almost exactly what the IMF expected from any ` +
      `government at all. Nothing to show at the top line. Judge the term on what sits underneath it.` },
    { min: -300, tag: 'behind', t:
      `${n(h)} dollars per head, ${n(-gap)} below the do-nothing projection. A narrow miss, not a catastrophe. ` +
      `The world economy is no excuse: the counterfactual faced the same prices.` },
    { min: -700, tag: 'badly behind', t:
      `${n(h)} dollars per head, ${n(-gap)} below what the IMF projected for Thailand with no particular ` +
      `government. Debt service, crowding out and stimulus bought one quarter at a time share the blame. ` +
      `15,000 was out of reach; losing to the do-nothing path was not.` },
    { min: -99999, tag: 'a lost term', t:
      `${n(h)} dollars per head, ${n(-gap)} below the passive path. A caretaker who answered the post and ` +
      `did nothing else would have done better. Four years, the fiscal space and the political capital ` +
      `returned less than nothing.` },
  ], gap);

  // A term can clear the baseline on the level and still have run the economy
  // into the ground on the way — playtesting produced a run at 9,228 with a
  // -3.97% output gap and 1.29% growth, which the assessment praised. Say it.
  if (realCagr < 1.9 || s.gap < -2)
    growth.t += ` But real growth annualised at ${fmt(realCagr, 2)}% and the output gap finished at ` +
      `${(s.gap >= 0 ? '+' : '') + fmt(s.gap, 2)}%. The economy was running below capacity at the count: ` +
      `unemployment and lost revenue.`;

  // ---- legacy: potential growth, which is the only score that outlives the term
  const legacy = pick([
    { min: 3.2, tag: 'a different economy', t:
      `Potential growth of ${fmt(s.potentialGrowthYoy, 2)}% against 2.1% inherited: a different supply side. ` +
      `A reform stock of ${rs} compounds whoever is in office. At this trend Thailand is out of the ` +
      `middle-income trap, and nobody will credit you for the 2030s.` },
    { min: 3.0, tag: 'transformed', t:
      `Potential growth of ${fmt(s.potentialGrowthYoy, 2)}%, up from 2.1%. This is the achievement of the ` +
      `term. A reform stock of ${rs} means deregulation, digitisation and human capital compounding every ` +
      `year, though little of it showed in your own figures.` },
    { min: 2.75, tag: 'improved', t:
      `Potential growth up to ${fmt(s.potentialGrowthYoy, 2)}% from 2.1%, on a reform stock of ${rs}. The ` +
      `supply side stopped improving around 2013; you moved it. Your successor collects the credit.` },
    { min: 2.5, tag: 'lifted', t:
      `Potential growth reached ${fmt(s.potentialGrowthYoy, 2)}%, a real but modest gain on 2.1%. ` +
      (s.reformStock >= 50
        ? `A reform stock of ${rs} is real effort; most of it had not reached capacity by the count.`
        : `A reform stock of ${rs} says the effort came late or thin, and only part of it paid off before the term ended.`) },
    { min: 2.25, tag: 'concrete only', t:
      `Potential growth reached ${fmt(s.potentialGrowthYoy, 2)}%, but a reform stock of ${rs} says capital ` +
      `spending bought most of it. Concrete stops lifting growth when the money stops. The bureaucracy you ` +
      `inherited is the one you leave.` },
    { min: 2.05, tag: 'unchanged', t:
      `Potential growth ends at ${fmt(s.potentialGrowthYoy, 2)}% against 2.1% at the start, on a reform stock ` +
      `of ${rs}. Everything that happened was cyclical. The questions open in February 2026 are still open, ` +
      `with four fewer years before demographics close the window.` },
    { min: -99, tag: 'gone backwards', t:
      `Potential growth finished at ${fmt(s.potentialGrowthYoy, 2)}%, below the 2.1% inherited, on a reform ` +
      `stock of ${rs}. Lowering the trend takes effort: misallocated capital, reform reversed or never begun, ` +
      `a risk premium. The next cabinet starts worse off.` },
  ], s.potentialGrowthYoy);

  // ---- fiscal. Distinguish a ceiling honoured from a ceiling moved and then
  // honoured: raising the limit and finishing under it is a real choice, but it
  // is not the same choice as never touching it.
  const over = s.debtGdp - g.debtCeiling;
  const ceilingMoved = g.debtCeiling > 70;
  const ceilingPhrase = ceilingMoved
    ? `a ceiling you had already raised to ${g.debtCeiling}%`
    : `the statutory ${g.debtCeiling}% ceiling, which you never asked parliament to move`;
  const debt = pick([
    { min: 8, tag: 'blown', t:
      `Gross debt of ${fmt(s.debtGdp)}%, ${fmt(over)} points above ${ceilingPhrase}. The market charges ` +
      `${fmt(s.riskPremium, 2)} points of premium on everything the state and its firms borrow. A primary ` +
      `deficit of ${pb}% of GDP, still running after the expansion ended. The next shock arrives with no room at all.` },
    { min: 4, tag: 'breached', t:
      `Gross debt of ${fmt(s.debtGdp)}% of GDP, ${fmt(over)} points above ${ceilingPhrase}. Risk premium: ` +
      `${fmt(s.riskPremium, 2)} points, compounding. A primary deficit of ${pb}% after an expansion is a ` +
      `habit. This is the biggest constraint the next government inherits, and you made it.` },
    { min: 0, tag: 'at the limit', t:
      `Debt closed at ${fmt(s.debtGdp)}% against the ${g.debtCeiling}% ceiling. Every point of fiscal space ` +
      `is spent. Defensible if it bought capacity; the reform stock of ${rs} will settle that. The next shock ` +
      `finds no room.` },
    { min: -3, tag: 'used to the edge', t:
      `Debt of ${fmt(s.debtGdp)}%, ${fmt(-over)} points under the ${g.debtCeiling}% ceiling, premium ` +
      `${fmt(s.riskPremium, 2)} points. Stopping just short of the limit takes discipline. One bad year ` +
      `would eat what is left.` },
    { min: -6, tag: 'used well', t:
      `Debt finished at ${fmt(s.debtGdp)}% inside a ${g.debtCeiling}% ceiling, risk premium held to ` +
      `${fmt(s.riskPremium, 2)} points. Textbook: spent, stopped before the market repriced, handed over with ` +
      `a margin. Three governments in the region have blown their limits since 2020.` },
    { min: -10, tag: 'cautious', t:
      `Debt of ${fmt(s.debtGdp)}% leaves ${fmt(-over)} points of the ceiling unused, premium ` +
      `${fmt(s.riskPremium, 2)}. A clean balance sheet from a government with cheap money and a mandate. ` +
      `Prudence or timidity? Nobody said what the space was for.` },
    { min: -999, tag: 'conserved', t:
      `Debt of ${fmt(s.debtGdp)}% leaves ${fmt(-over)} points of unused headroom. Real fiscal conservatism. ` +
      `But an unused balance sheet is not a policy, and capacity not built with cheap money will cost more ` +
      `later.` },
  ], over);

  // ---- investment. The single variable that decides whether Thailand grows,
  // and the one every administration since 1997 has failed to move. The
  // capital-stock comparison rides along here: ordering a port and having a
  // port are separated by a decade, and the ratio cannot see the difference.
  const capGrowth = s.capital / start.capital * 100 - 100;
  const pipeline = ` Public capital ran at ${fmt(s.capitalSpend, 2)}% of GDP against 6.10% inherited; the ` +
    `capital stock grew ${fmt(capGrowth, 1)}%. What this parliament ordered, the next one opens.`;
  const inv = pick([
    { min: 23, tag: 'a boom', t:
      `Private investment of ${fmt(s.invRate)}% of GDP, from 18.0%, a level not sustained since before the ` +
      `crisis. Permitting, legal certainty and demand all cleared at once. This decides whether the rest ` +
      `compounds.` + pipeline },
    { min: 21, tag: 'reversed', t:
      `Private investment of ${fmt(s.invRate)}% of GDP. This ratio has fallen since 1996 and no government ` +
      `stopped it for a full term. You did, with public capital rising too, so the state did not just crowd ` +
      `it up.` + pipeline },
    { min: 19.5, tag: 'recovering', t:
      `Private investment recovered to ${fmt(s.invRate)}% of GDP from 18.0%. Still far below 31.2% in 1996, ` +
      `but the first sustained rise in a generation. Firms likely answered the permitting reforms, not the ` +
      `megaprojects.` + pipeline },
    { min: 18.6, tag: 'edging up', t:
      `Private investment ended at ${fmt(s.invRate)}% of GDP, above the 18.0% inherited but not yet a trend. ` +
      `Firms that have assumed flat Thai demand for twenty years noticed, but did not change their minds.` + pipeline },
    { min: 18.0, tag: 'flat', t:
      `Private investment of ${fmt(s.invRate)}% of GDP, where it started. Thai firms kept sitting on cash. ` +
      `Everything else here is downstream of this, so read the good numbers with caution.` + pipeline },
    { min: 17.0, tag: 'slipping', t:
      `Private investment fell to ${fmt(s.invRate)}% of GDP from 18.0%, during an expansion. Firms had demand ` +
      `and credit and still would not commit at home.` + pipeline },
    { min: -99, tag: 'displaced', t:
      `Private investment fell to ${fmt(s.invRate)}% of GDP. The state borrowed heavily against private ` +
      `firms for the same funds, and the risk premium did the rest. Crowding out, observed.` + pipeline },
  ], s.invRate);

  // ---- households. The largest constraint on Thai consumption. A stock over a
  // denominator: it falls when nominal GDP outruns credit, which is the only
  // mechanism this country has ever used, and four years barely moves it.
  const hhStart = 87.5, hhDelta = s.hhDebt - hhStart;
  const households = pick([
    { min: 6, tag: 'deeper in', t:
      `Household debt finished at ${fmt(s.hhDebt)}% of GDP, ${fmt(hhDelta)} points ABOVE where you found it. ` +
      `The worst number here: about a third of monetary transmission is gone. Households borrowed to keep ` +
      `consuming while output grew. The recovery reached nobody.` },
    { min: 2.5, tag: 'rising', t:
      `Household debt rose ${fmt(hhDelta)} points to ${fmt(s.hhDebt)}% of GDP, in an expansion, when it should ` +
      `fall. Each point is transmission the Bank of Thailand will lack in the next downturn.` },
    { min: 0.5, tag: 'unchanged', t:
      `Household debt sits at ${fmt(s.hhDebt)}% of GDP against ${hhStart}% at the start. Four years of growth ` +
      `and credit kept pace. The ratio that blocks every rate cut has not moved.` },
    { min: -2, tag: 'flat', t:
      `Household debt eased marginally to ${fmt(s.hhDebt)}% of GDP. Right direction, no size: at this pace it ` +
      `is workable in the 2040s. Transfers and formalisation were not pushed hard enough to outrun credit.` },
    { min: -5, tag: 'easing', t:
      `Household debt came down ${fmt(-hhDelta)} points to ${fmt(s.hhDebt)}% of GDP. Real deleveraging: income ` +
      `support cut borrowing, formalisation made debt serviceable, growth did the rest.` },
    { min: -9, tag: 'deleveraging', t:
      `Household debt fell ${fmt(-hhDelta)} points to ${fmt(s.hhDebt)}% of GDP, faster than any Thai government ` +
      `has managed across a term. Most of a rate cut now reaches the real economy instead of loan-loss ` +
      `provisions.` },
    { min: -999, tag: 'transformed', t:
      `Household debt fell ${fmt(-hhDelta)} points to ${fmt(s.hhDebt)}% of GDP. Households can now absorb a ` +
      `shock without a fiscal rescue: the difference between a recession and a lost decade. Nobody will ` +
      `thank you for it.` },
  ], hhDelta);

  const politics = gov.fallen ? { tag: 'collapsed', t:
    `The coalition broke early; everything above is scored on what was finished. The costliest bills came ` +
    `first and the partners who paid for them were never compensated. Thai governments fall on arithmetic, ` +
    `and this arithmetic was visible for quarters.` }
    : pick([
    { min: 70, tag: 'adored', t:
      `${g.approval}% approval at the close, ${gov.seats} seats behind it. Numbers like this usually follow ` +
      `a spending spree, and the bill follows them. If earned by delivery, it is the strongest position of ` +
      `any Thai cabinet since 2005, and you left some unspent.` },
    { min: 62, tag: 'commanding', t:
      `${g.approval}% approval and ${gov.seats} seats intact: more popular at the end than the start, rare in ` +
      `Thai politics. You could have spent more of it on legislation.` },
    { min: 52, tag: 'comfortable', t:
      `${g.approval}% approval and ${gov.seats} seats. Enough to pass what was agreed, not enough to force ` +
      `anything a partner opposed. It did not stretch to the hard bill in year three.` },
    { min: 44, tag: 'held', t:
      `${g.approval}% approval and ${gov.seats} seats. Six parties and a mid-term revenue package, and the ` +
      `coalition held.` + (g.con.stage === 'ratified' ? ' It carried a new constitution through two referendums on the way.'
        : ' But nothing more ambitious than the first eighteen months ever passed.') },
    { min: 36, tag: 'strained', t:
      `${g.approval}% approval against ${gov.seats} seats: the votes, not the standing. Partners priced a ` +
      `weak prime minister at once, and the record thins out with the polling.` },
    { min: 28, tag: 'exhausted', t:
      `${g.approval}% approval: survival on party discipline, not consent. Partners read the polls and priced ` +
      `every bill accordingly. The seats were there. The authority was not.` },
    { min: -99, tag: 'a caretaker', t:
      `At ${g.approval}% approval this was a caretaker government, kept in office because nobody in the ` +
      `coalition wanted a dissolution. Whatever was achieved was achieved early. The rest was survival.` },
  ], g.approval);

  // The chain that runs through the Zero Corruption Act ends in a decision the
  // record cannot show on its own, so the assessment says it outright.
  if (g.flags.has('patriot'))
    politics.t += ` One thing the numbers do not show. When the prosecution service reached this ` +
      `government's own provincial members, the files were allowed to proceed, and the machine that turns ` +
      `Bhumjaithai votes into Bhumjaithai seats stopped working. The count is smaller than the record ` +
      `earned. You chose that.`;
  else if (g.flags.has('hollow_reform'))
    politics.t += ` And the seat total hides this: your anti-corruption body was publicly told to drop the ` +
      `files when they reached your own side. The Act is still on the books, the machine went back to work, ` +
      `and the country knows what enforcement is worth.`;

  const markets = pick([
    { min: 60, tag: 'euphoric', t:
      `The SET closed at ${n(g.set)}, up ${fmt(setChg)}%, on real growth of ${fmt(realCagr, 2)}% annualised. ` +
      `Sentiment here is capped, so this is the market pushing the fundamentals as far as allowed. Foreign ` +
      `money came back. It leaves just as fast.` },
    { min: 35, tag: 'rewarded', t:
      `The SET closed at ${n(g.set)}, up ${fmt(setChg)}%, pricing the reform story and the FDI signal. Real ` +
      `growth annualised at ${fmt(realCagr, 2)}%. Disappointment lives in the gap between the two.` },
    { min: 18, tag: 'warm', t:
      `The SET finished at ${n(g.set)}, up ${fmt(setChg)}%, on real growth of ${fmt(realCagr, 2)}%. A modest ` +
      `re-rating: the market thinks a policy accident is less likely, not that earnings will grow.` },
    { min: 5, tag: 'neutral', t:
      `The SET finished at ${n(g.set)}, up ${fmt(setChg)}%, roughly tracking nominal GDP, on real growth of ` +
      `${fmt(realCagr, 2)}%. Neither reward nor punishment. Foreign money still has no reason to return.` },
    { min: -5, tag: 'indifferent', t:
      `The SET ended at ${n(g.set)}, ${fmt(setChg)}% on the start. Four years of announcements and the index ` +
      `has not moved. The people who price Thai equities saw nothing material.` },
    { min: -20, tag: 'unconvinced', t:
      `The SET at ${n(g.set)} is ${fmt(setChg)}% on the start, with real growth of ${fmt(realCagr, 2)}% ` +
      `annualised. Thai equities are still the cheapest way to bet against Thai growth.` },
    { min: -999, tag: 'repudiated', t:
      `The SET at ${n(g.set)} is ${fmt(setChg)}% below where the term began. Holders of Thai assets decided ` +
      `policy risk had risen. That is a verdict on the government, and investors act on it.` },
  ], setChg);

  // ---- the constitution
  const cv = g.constitutionView();
  const conDone = cv.parts.filter(p => p.selected !== p.keep).map(p => `${p.name.toLowerCase()} (${p.positions[p.selected].label.toLowerCase()})`);
  const constitution =
    cv.stage === 'ratified'
      ? (g.flags.has('constitution_reformist')
        ? { tag: 'rewritten', t: `A new constitution, ratified with ${cv.finalYes}% yes and a reform score of ${cv.score}: ${conDone.join(', ')}. Moderate by any outside standard, and the largest change to Thailand's rules since 1997.` }
        : g.flags.has('constitution_cosmetic')
        ? { tag: 'cosmetic', t: `A new constitution, ratified with ${cv.finalYes}% yes. Reform score ${cv.score}${conDone.length ? `: ${conDone.join(', ')}` : ''}. The country voted for a rewrite and got an edit.` }
        : { tag: 'amended', t: `A new constitution, ratified with ${cv.finalYes}% yes and a reform score of ${cv.score}: ${conDone.join(', ')}. Real changes, carefully limited to what the party would carry.` })
    : cv.stage === 'failed'
      ? { tag: 'failed', t: `The rewrite failed at the ${cv.finalYes != null ? 'final' : 'second'} referendum, ${cv.finalYes ?? cv.principlesYes}% yes. The 2017 text stays in force, and the next parliament starts again.` }
    : cv.stage === 'idle'
      ? { tag: 'untouched', t: `Sixty per cent voted for a new constitution in February 2026. This cabinet never tabled the amendment to start it.` }
      : { tag: 'unfinished', t: `The rewrite was still ${cv.stage === 'drafting' ? 'in drafting' : cv.stage === 'final' ? 'waiting for its final referendum' : 'at the principles stage'} when the term ended. It passes to the next parliament.` };

  if (cv.stage === 'ratified' && g.flags.has('constitution_sg'))
    constitution.t += g.flags.has('constitution_sg_competent')
      ? ' Its Singapore-lite provisions sit on a civil service that was cut and an anti-corruption agency with teeth, so the stronger state has something to deliver with.'
      : ' Its Singapore-lite provisions sit on the old civil service and the old networks. The state got the control. The competence did not come with it.';
  if (cv.stage === 'ratified' && g.flags.has('constitution_sg')) constitution.tag = 'singapore-lite';
  else if (cv.stage === 'ratified' && g.flags.has('constitution_paternal'))
    constitution.t += ' It also traded rights for order: the new chapter gives the state more room over assembly and speech than the one it replaced.';

  return [
    { h: 'Headline', tag: growth.tag, t: growth.t },
    { h: 'Legacy', tag: legacy.tag, t: legacy.t },
    { h: 'Fiscal', tag: debt.tag, t: debt.t },
    { h: 'Investment', tag: inv.tag, t: inv.t },
    { h: 'Households', tag: households.tag, t: households.t },
    { h: 'Politics', tag: politics.tag, t: politics.t },
    { h: 'Markets', tag: markets.tag, t: markets.t },
    { h: 'Constitution', tag: constitution.tag, t: constitution.t },
  ];
}

/** The last line, written after the count — so it reports the verdict of the
 *  electorate rather than speculating about it. The economics and the result
 *  are allowed to disagree, because they frequently do. */
function verdictClose(g, s, gov, elec) {
  if (gov.fallen) return 'The cabinet did not reach the election. Whether the party does, its partners ' +
    'will decide first.';
  // Not a single threshold. A record is the whole picture: capacity, the
  // investment rate, the reform stock, and whether the level beat the Fund.
  const marks = [s.potentialGrowthYoy >= 2.65, s.invRate >= 19.5,
                 s.reformStock >= 55, g.headline() >= g.baseline()].filter(Boolean).length;
  const reformed = marks >= 3;
  const solvent = s.debtGdp < g.debtCeiling;
  const v = elec ? elec.verdict : null;
  const solo = elec && elec.playerSeats >= 251;

  if (v === 'landslide' && elec.playerSeats >= 300)
    return reformed && solvent
      ? 'A realigning majority, won on a record that will still be compounding at the next count. Thai ' +
        'governments are rarely returned for what they built. This one was.'
      : 'A realigning majority, won on mood, not the balance sheet. The mandate is real and so is the debt. ' +
        'The second term will show which binds first.';
  if (v === 'landslide' || solo)
    return reformed && solvent
      ? 'Returned with room to spare and a record to match. The December 2030 promise now falls due on ' +
        'your watch.'
      : 'Returned comfortably, on numbers that will not survive four more years of the same. The mandate ' +
        'buys time to fix the finances. The campaign showed no appetite for it.';
  if (v === 'returned')
    return marks === 4
      ? 'Returned on a record that holds up in every column: capacity, investment, reform and the level. ' +
        'The majority is narrower than the term deserved. Reform pays out after the count.'
      : reformed
      ? 'Back in office, narrowly. The structural work is half-collected, and whoever stands there in 2034 ' +
        'gets the credit.'
      : 'Back in office without a clear reason. A second term on this arithmetic is a negotiation, not a ' +
        'mandate.';
  if (v === 'hung')
    return 'The largest party in the House and unable to govern it, beaten at the negotiating table by ' +
           'partners taken for granted for four years.';
  if (v === 'defeated')
    return reformed
      ? 'Turned out of office having done the work. The costs landed in your term; the benefits land in ' +
        'somebody else\'s.'
      : 'Turned out of office with the debt, the polling and the unfinished reforms all pointing the same ' +
        'way. Nobody in Bangkok is surprised.';
  return 'The term is over. What it was worth depends on numbers still moving.';
}


/** The House the election produced. A static diagram — no hover, no relations,
 *  because relations with the outgoing parliament are no longer the point. */
function electionParliament(elec) {
  const cfg = COALITIONS;
  const colours = cfg.seatColours || {};
  const order = ["People's", 'Kla Tham', 'Democrat', 'Others', 'Pheu Thai', 'Bhumjaithai'];
  const byParty = Object.fromEntries(elec.results.map(r => [r.party, r.after]));
  const present = order.filter(p => byParty[p]);
  const pts = seatPositions(500, 12, 108, 232);
  const inNewGov = new Set(elec.bestCoalition || []);
  let idx = 0; const seatEls = [];
  for (const party of present) {
    for (let k = 0; k < byParty[party] && idx < pts.length; k++, idx++) {
      const q = pts[idx];
      seatEls.push(`<circle cx="${q.x.toFixed(1)}" cy="${q.y.toFixed(1)}" r="4.1"
        fill="${colours[party] || 'var(--series-1)'}"
        class="seat${inNewGov.has(party) ? ' gov' : ''}"/>`);
    }
  }
  while (idx < pts.length) {
    const q = pts[idx++];
    seatEls.push(`<circle cx="${q.x.toFixed(1)}" cy="${q.y.toFixed(1)}" r="4.1"
      fill="${colours.Vacant || '#3a3a38'}" class="seat vacant"/>`);
  }
  return `<div class="el-parl">
    <div class="el-parl-h">The House of Representatives, 2030</div>
    <svg viewBox="-250 -252 500 268" class="parl-svg" role="img"
         aria-label="${present.map(p => p + ' ' + byParty[p]).join(', ')}">${seatEls.join('')}</svg>
    <div class="parl-legend">${present.map(p => `<span class="lg static">
      <span class="lg-dot" style="background:${colours[p]}"></span>
      <span class="lg-name">${p}</span>
      <span class="lg-seats">${byParty[p]}</span>
      ${inNewGov.has(p) ? '<span class="gov-chip">gov</span>' : ''}</span>`).join('')}</div>
  </div>`;
}


/** Achievements. Earned ones show their flavour; locked ones show only what
 *  they would have required — a locked row should read as a run you have not
 *  played yet, not as a scold. */
/* ---- revealed ideology ---------------------------------------------------
   Parties campaign on labels; cabinets reveal a position through four years of
   budget composition. This reads the second one off the stance actually
   accumulated and hands the player the name for it. */
function renderIdeology(i) {
  return `<div class="ideo">
    <div class="ideo-k">Revealed economic position</div>
    <div class="ideo-name">${i.name}</div>
    <div class="ideo-tag">${i.tag}</div>
    <p class="ideo-body">${i.body}</p>
    <div class="ideo-trad">Closest tradition · ${i.tradition}</div>
  </div>`;
}

function renderAchievements(list) {
  const earned = list.filter(a => a.earned);
  const locked = list.filter(a => !a.earned);
  const row = a => `<div class="ach ${a.earned ? 'got' : 'locked'} r-${a.rarity}">
      <div class="ach-h">
        <span class="ach-name">${a.earned ? a.name : '???'}</span>
        <span class="ach-rarity">${a.rarity}</span>
      </div>
      <div class="ach-req">${a.requirement}</div>
      ${a.earned ? `<div class="ach-flavour">${a.flavour}</div>` : ''}
    </div>`;
  return `<div class="achievements">
    <div class="verdict-h">Achievements · ${earned.length} of ${list.length}</div>
    ${earned.length ? `<div class="ach-grid">${earned.map(row).join('')}</div>`
      : '<p class="ach-none">None this term. All are reachable from the 2026 coalition screen.</p>'}
    ${locked.length ? `<details class="ach-more"><summary>${locked.length} not earned</summary>
      <div class="ach-grid">${locked.map(row).join('')}</div></details>` : ''}
  </div>`;
}

function endTile(l, v, s, status) {
  return `<div class="tile"><div class="t-label">${l}</div><div class="t-value ${status}">${v}</div><div class="t-sub">${s}</div></div>`;
}

renderPrologue();

/* ---- campaign song -------------------------------------------------------
   Three sources, tried in order, because the recording is not ours to ship:

     1. the local mp3, inlined at build time if it is present on disk
     2. the YouTube embed, streamed from the rights holder's own upload
     3. nothing at all — the transport hides and the game is silent

   WHEN IT STARTS. Not on load: on the coalition choice, three seconds into the
   track, so the song opens as the government forms rather than over an empty
   title screen. That timing is also what makes the audio simple — playback
   begun inside a click handler is a user gesture, so no browser blocks it and
   none of the muted-autoplay machinery this used to need survives. The
   transport is a genuine play/pause from then on; once it has been paused
   deliberately, nothing starts it again behind the player's back. */
const ANTHEM_IN = 3;   // seconds to skip — the intro is instrumental
(function music() {
  const btn = document.getElementById('mus-toggle');
  const box = document.getElementById('player');
  if (!btn || !box) return;
  const hide = () => { box.style.display = 'none'; };

  let userPaused = false, playing = false, started = false;
  const paint = () => {
    btn.textContent = playing ? '❙❙' : '▶';
    box.classList.toggle('paused', !playing);
  };

  const local = el => {
    el.volume = 0.45;
    const sync = () => { playing = !el.paused; paint(); };
    const play = () => el.play().then(sync).catch(() => {});
    // currentTime cannot be set before the browser knows how long the track is.
    const seekIn = () => { try { el.currentTime = ANTHEM_IN; } catch { /* not seekable yet */ } };
    window.playAnthem = () => {
      if (started || userPaused) return;
      started = true;
      if (el.readyState >= 1) { seekIn(); play(); }
      else el.addEventListener('loadedmetadata', () => { seekIn(); play(); }, { once: true });
    };
    btn.onclick = () => {
      if (el.paused) { userPaused = false; started = true; play(); }
      else { userPaused = true; el.pause(); sync(); }
    };
    el.onplay = sync; el.onpause = sync;
    paint();
  };

  const youtube = id => {
    const frame = document.getElementById('yt-frame');
    if (!frame || !window.location.protocol.startsWith('http')) return hide();
    let player = null, ready = false, wanted = false;
    // If the API never arrives — offline, blocked, or the embed is disabled for
    // this video — there is nothing to control, so remove the transport rather
    // than leaving a button that does nothing.
    const giveUp = setTimeout(() => { if (!ready) hide(); }, 8000);
    const go = () => { player.seekTo(ANTHEM_IN, true); player.playVideo(); };

    const boot = () => {
      player = new window.YT.Player('yt-frame', {
        videoId: id, host: 'https://www.youtube-nocookie.com',
        // `playlist` set to the same id is what makes loop work on a single video.
        playerVars: { autoplay: 0, loop: 1, playlist: id, controls: 0, disablekb: 1,
                      modestbranding: 1, playsinline: 1, rel: 0 },
        events: {
          onReady: e => {
            ready = true; clearTimeout(giveUp);
            e.target.setVolume(45);
            // The coalition may well have been chosen while the embed was still
            // loading; honour the request rather than dropping it.
            if (wanted && !userPaused) go();
            paint();
          },
          onStateChange: e => { playing = e.data === window.YT.PlayerState.PLAYING; paint(); },
          onError: () => { clearTimeout(giveUp); hide(); },
        },
      });
    };

    window.playAnthem = () => {
      if (started || userPaused) return;
      started = true; wanted = true;
      if (ready) go();
    };
    btn.onclick = () => {
      if (!player || !ready) return;
      started = true;
      if (playing) { userPaused = true; player.pauseVideo(); }
      else { userPaused = false; wanted = true; go(); }
    };

    if (window.YT && window.YT.Player) return boot();
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { if (prev) prev(); boot(); };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.onerror = () => { clearTimeout(giveUp); hide(); };
    document.head.appendChild(s);
    paint();
  };

  const el = document.getElementById('anthem');
  if (el) local(el);
  else if (window.ANTHEM_YT) youtube(window.ANTHEM_YT);
  else hide();
})();
