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
    tile('SET Index', Math.round(g.set).toLocaleString(), '', 'the fastest number on this page',
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
  if (r.fallen) { showEnd(r.walked); return; }
  if (g.quarter >= 16) { showEnd(); return; }
  g.openTurn();
  render();
  if (g.pending.length) toast('News requires your attention', 'warning');
};

function showEnd(walked) {
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
       You leave office ${g.turnsLeft} quarter${g.turnsLeft === 1 ? '' : 's'} short of the term you were
       judged on, and someone else inherits the arithmetic.</p>`
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
      ${moved ? '<p class="el-note">Members changed party during the term, so the House fought this '
        + 'election is not the House elected in 2026. Changes are measured against 2026.</p>' : ''}
      <table class="el-table">
        <tr><th>Party</th><th>2026</th>${moved ? '<th>Dissolution</th>' : ''}<th>2030</th><th></th><th>After the count</th></tr>
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
        : `<b>No workable majority.</b> 251 needed and the doors that would reach it are closed.`}</div>
    </div>`;

  const row = (label, value, note, cls) =>
    `<tr><td class="s-label">${label}</td><td class="s-val ${cls || ''}">${value}</td>
     <td class="s-note">${note || ''}</td></tr>`;

  w.innerHTML = head + electionBlock + `
    <div class="endgrid">
      ${endTile('Headline', Math.round(h).toLocaleString() + ' USD', 'IMF baseline was 9,092',
                h >= 9092 ? 'good' : 'critical')}
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
          ${Object.entries(g.opinion).filter(([k]) => k !== 'Bhumjaithai').map(([k, v]) =>
            row(k, String(v), g.bandOf(k).label,
                v >= 61 ? 'good' : v >= 41 ? '' : v >= 21 ? 'warning' : 'critical')).join('')}
        </table>
      </div>
    </div>

    <div class="verdict">
      <div class="verdict-h">Assessment · Second Anutin Cabinet (2026–2030)</div>
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
  const gap = h - 9092;
  const n = x => Math.round(x).toLocaleString();
  const pb = fmt(Math.abs(s.primaryBalance), 2);
  const rs = fmt(s.reformStock, 0);

  // ---- headline: the level, against the only number here with an outside author
  const growth = pick([
    { min: 700, tag: 'historic', t:
      `${n(h)} dollars per head, ${n(gap)} clear of the IMF's own projection. This is the top of what sixteen ` +
      `quarters can produce and there is no interpretation under which it is not a real result — the Fund's ` +
      `Thailand baseline has behaved more like a ceiling than a forecast for a decade, and this cabinet went ` +
      `through it by a distance no post-crisis government has managed. The one caution is arithmetic rather ` +
      `than politics: a level this far above trend is partly a cycle, and cycles are borrowed from the term ` +
      `that follows.` },
    { min: 400, tag: 'well ahead', t:
      `The cabinet finished at ${n(h)} dollars per head, ${n(gap)} clear of the IMF's projection for the ` +
      `period. That is a substantial beat and it took genuine output rather than a favourable deflator. It is ` +
      `also, of course, well short of the 15,000 promised in February 2026 — a promise no serious observer ` +
      `costed at the time, and which the government spent four years being asked about anyway.` },
    { min: 150, tag: 'ahead of baseline', t:
      `${n(h)} dollars per head, ${n(gap)} above the IMF baseline. A clear beat, if not a dramatic one, and ` +
      `worth stating plainly because beating the Fund's Thailand number has not been a routine event. The ` +
      `distance from the 15,000 target is the distance between what a government can do in four years and what ` +
      `it has to say to be given them.` },
    { min: -80, tag: 'at baseline', t:
      `${n(h)} dollars per head against a baseline of 9,092: the cabinet delivered almost precisely what the ` +
      `IMF expected Thailand to deliver under any government at all. Read narrowly, that is four years of ` +
      `activity with nothing to show at the top line. Read fairly, the top line was never the point — a term is ` +
      `worth having or not on the strength of what sits underneath it.` },
    { min: -300, tag: 'behind', t:
      `At ${n(h)} dollars per head the cabinet came in ${n(-gap)} below the do-nothing projection. That is a ` +
      `narrow miss on a forecast rather than a catastrophe, but it is a miss, and the external environment ` +
      `will not carry the explanation: the same world prices were available to the counterfactual.` },
    { min: -700, tag: 'badly behind', t:
      `${n(h)} dollars per head is ${n(-gap)} below what the IMF projected for a Thailand with no particular ` +
      `government at all. Debt service, crowding out and a stimulus habit that bought a quarter of growth at a ` +
      `time each take a share of the blame. The 15,000 target was never reachable; underperforming the ` +
      `do-nothing counterfactual was entirely avoidable.` },
    { min: -99999, tag: 'a lost term', t:
      `At ${n(h)} dollars per head this term ends ${n(-gap)} below the passive path — the country would ` +
      `measurably have been better served by a caretaker administration that answered the post and did ` +
      `nothing else. Whatever was attempted here consumed fiscal space, political capital and four years, and ` +
      `returned less than the absence of it would have.` },
  ], gap);

  // A term can clear the baseline on the level and still have run the economy
  // into the ground on the way — playtesting produced a run at 9,228 with a
  // -3.97% output gap and 1.29% growth, which the assessment praised. Say it.
  if (realCagr < 1.9 || s.gap < -2)
    growth.t += ` One thing the level conceals: real growth annualised at ${fmt(realCagr, 2)}% and the output ` +
      `gap finished at ${(s.gap >= 0 ? '+' : '') + fmt(s.gap, 2)}%. This economy was running below capacity ` +
      `when the votes were counted, and an idle output gap is unemployment and foregone revenue whatever the ` +
      `per-head number says.`;

  // ---- legacy: potential growth, which is the only score that outlives the term
  const legacy = pick([
    { min: 3.2, tag: 'a different economy', t:
      `Potential growth of ${fmt(s.potentialGrowthYoy, 2)}% against 2.1% inherited is not an improvement, it ` +
      `is a different supply side. A reform stock of ${rs} compounds annually whoever is in office, and at ` +
      `this level the arithmetic of Thai convergence changes: the middle-income trap is a statement about ` +
      `trend growth, and this trend is no longer trapped. Nobody will be able to attribute the 2030s to this ` +
      `cabinet, which is exactly why so few governments do it.` },
    { min: 3.0, tag: 'transformed', t:
      `Potential growth of ${fmt(s.potentialGrowthYoy, 2)}%, from 2.1% at the start, is the outstanding ` +
      `achievement of this administration and will be recognised as such long after the personalities are ` +
      `forgotten. A reform stock of ${rs} is not a rhetorical number: it is deregulation, digitisation and ` +
      `human capital that compound annually. That almost none of it showed up in the cabinet's own figures is ` +
      `the strongest evidence that it was real.` },
    { min: 2.75, tag: 'improved', t:
      `Potential growth improved to ${fmt(s.potentialGrowthYoy, 2)}% from 2.1%, on a reform stock of ${rs}. ` +
      `This is the part of the record that holds up. Thailand's problem has never been the cycle, it has been ` +
      `a supply side that stopped improving around 2013, and this cabinet moved it. The successor will collect ` +
      `the credit, which is how structural reform has always worked and why so little of it gets done.` },
    { min: 2.5, tag: 'lifted', t:
      `Potential growth reached ${fmt(s.potentialGrowthYoy, 2)}%, a real gain on the 2.1% inherited and a ` +
      `modest one against what was available. The reform stock of ${rs} is the constraint: effort was made, ` +
      `and it was made late or thinly enough that only part of it had converted by the time the term ended. ` +
      `Reform compounds, and compounding needs the one thing an electoral cycle cannot supply.` },
    { min: 2.25, tag: 'concrete only', t:
      `Potential growth reached ${fmt(s.potentialGrowthYoy, 2)}%, but the composition is unflattering: a ` +
      `reform stock of ${rs} says most of this was bought with capital spending rather than earned through ` +
      `reform. Concrete raises the capital stock whether or not anything was fixed, and it stops raising it ` +
      `the moment the disbursement ends. The bureaucracy the cabinet inherited is substantially the ` +
      `bureaucracy it leaves.` },
    { min: 2.05, tag: 'unchanged', t:
      `Potential growth ends at ${fmt(s.potentialGrowthYoy, 2)}% against 2.1% at the start — the trend rate of ` +
      `this economy is exactly where it was found, on a reform stock of ${rs}. Everything that happened in ` +
      `these four years was cyclical. The structural questions that were open in February 2026 are open now, ` +
      `with four fewer years to answer them before the demographics close the window.` },
    { min: -99, tag: 'gone backwards', t:
      `Potential growth finished at ${fmt(s.potentialGrowthYoy, 2)}%, below the 2.1% this government ` +
      `inherited, on a reform stock of ${rs}. A term that lowers the trend rate of growth is a rare thing to ` +
      `achieve and it takes active effort: capital misallocated, reform reversed or never begun, and a risk ` +
      `premium doing the rest. The next cabinet starts from a worse position than this one did.` },
  ], s.potentialGrowthYoy);

  // ---- fiscal. Distinguish a ceiling honoured from a ceiling moved and then
  // honoured: raising the limit and finishing under it is a real choice, but it
  // is not the same choice as never touching it.
  const over = s.debtGdp - g.debtCeiling;
  const ceilingMoved = g.debtCeiling > 70;
  const ceilingPhrase = ceilingMoved
    ? `a ceiling this cabinet had already raised for itself to ${g.debtCeiling}%`
    : `the statutory ${g.debtCeiling}% ceiling, which it never once asked parliament to move`;
  const debt = pick([
    { min: 8, tag: 'blown', t:
      `Gross debt of ${fmt(s.debtGdp)}% stands ${fmt(over)} points above ${ceilingPhrase}. At this distance ` +
      `the limit has stopped being a constraint and become a comment, and the market has priced it: ` +
      `${fmt(s.riskPremium, 2)} points of premium on everything the state borrows, compounding into the stock ` +
      `and passed through to every firm borrowing alongside it. A primary deficit of ${pb}% of GDP at the end ` +
      `of an expansion is not stabilisation policy. The next fiscal shock arrives with no room at all.` },
    { min: 4, tag: 'breached', t:
      `Gross debt of ${fmt(s.debtGdp)}% of GDP stands ${fmt(over)} points above ${ceilingPhrase}. The market ` +
      `has drawn the obvious conclusion: ${fmt(s.riskPremium, 2)} points of risk premium on everything the ` +
      `state borrows, compounding, and the same premium passed to every firm that borrows alongside it. A ` +
      `primary deficit of ${pb}% at the end of an expansion is not stabilisation policy, it is a habit. This ` +
      `is the single largest constraint the next government inherits, and it was manufactured here.` },
    { min: 0, tag: 'at the limit', t:
      `Debt closed at ${fmt(s.debtGdp)}% against the ${g.debtCeiling}% ceiling — every point of fiscal space ` +
      `the cabinet had, including the space it legislated for itself, is now spent. Defensible if the money ` +
      `bought durable capacity, indefensible if it bought quarters of growth, and the reform stock of ${rs} is ` +
      `where that argument will be settled. Either way, the next shock finds Thailand with no room and no ` +
      `politically cheap way to make some.` },
    { min: -3, tag: 'used to the edge', t:
      `Debt of ${fmt(s.debtGdp)}% leaves ${fmt(-over)} points beneath the ${g.debtCeiling}% ceiling, with a ` +
      `premium of ${fmt(s.riskPremium, 2)} points. Spending to within a rounding error of a self-imposed limit ` +
      `and stopping is a harder discipline than it looks — the last point of headroom is always the one with ` +
      `a use for it — and the margin left is thin enough that a single bad year would consume it.` },
    { min: -6, tag: 'used well', t:
      `Debt finished at ${fmt(s.debtGdp)}% inside a ${g.debtCeiling}% ceiling, with the risk premium held to ` +
      `${fmt(s.riskPremium, 2)} points. This is close to the textbook use of fiscal space: spent rather than ` +
      `hoarded, stopped before the market repriced it, and handed over with a margin. In a region where three ` +
      `governments have blown through their own limits since 2020, restraint of this kind is worth more than ` +
      `it looks on the page.` },
    { min: -10, tag: 'cautious', t:
      `Debt of ${fmt(s.debtGdp)}% leaves ${fmt(-over)} points of the ceiling unused and the premium at ` +
      `${fmt(s.riskPremium, 2)}. A comfortable balance sheet, handed over intact, by a government that had ` +
      `access to cheap money and a mandate and chose to use part of both. Whether the caution was prudence or ` +
      `timidity depends entirely on what the unspent space was being saved for, and nobody said.` },
    { min: -999, tag: 'conserved', t:
      `Debt of ${fmt(s.debtGdp)}% leaves ${fmt(-over)} points of unused headroom beneath the ceiling. Fiscal ` +
      `conservatism is a real virtue and this cabinet practised it. The uncomfortable question is what the ` +
      `restraint purchased: an unused balance sheet is not a policy, and the capacity that was not built ` +
      `during four years of cheap money will cost considerably more to build later.` },
  ], over);

  // ---- investment. The single variable that decides whether Thailand grows,
  // and the one every administration since 1997 has failed to move. The
  // capital-stock comparison rides along here: ordering a port and having a
  // port are separated by a decade, and the ratio cannot see the difference.
  const capGrowth = s.capital / start.capital * 100 - 100;
  const pipeline = ` Public capital ran at ${fmt(s.capitalSpend, 2)}% of GDP against 6.10% inherited while the ` +
    `capital stock itself grew ${fmt(capGrowth, 1)}% — the distance between a commitment and a thing that ` +
    `exists. What was ordered in this parliament gets commissioned in the next one.`;
  const inv = pick([
    { min: 23, tag: 'a boom', t:
      `Private investment of ${fmt(s.invRate)}% of GDP is a level Thailand has not sustained since before the ` +
      `crisis, from 18.0% at the start. Firms do not commit capital on sentiment; they commit it when the ` +
      `permitting, the legal certainty and the demand outlook all clear at once, and all three did. This is ` +
      `the number that decides whether any of the rest compounds.` + pipeline },
    { min: 21, tag: 'reversed', t:
      `Private investment of ${fmt(s.invRate)}% of GDP is the result nobody forecast. This ratio has been ` +
      `falling since 1996 and no administration in the intervening quarter-century arrested it for a full ` +
      `term. Whatever else is disputed about this government, it moved the single variable that determines ` +
      `whether Thailand grows — and it did so while public capital was also rising, which rules out the usual ` +
      `explanation that the state simply crowded the number upward.` + pipeline },
    { min: 19.5, tag: 'recovering', t:
      `Private investment recovered to ${fmt(s.invRate)}% of GDP from 18.0%. Set against 31.2% in 1996 that ` +
      `remains a diminished economy, but it is the first sustained increase in a generation and it is what the ` +
      `improvement in potential growth is actually made of. Firms responded to something — most plausibly the ` +
      `permitting and compliance reforms rather than the megaprojects.` + pipeline },
    { min: 18.6, tag: 'edging up', t:
      `Private investment ended at ${fmt(s.invRate)}% of GDP, above the 18.0% inherited by a margin that is ` +
      `real but not yet a trend. Something in the policy mix registered with firms; not enough of it registered ` +
      `for long enough to change the investment decision of a company that has spent twenty years assuming ` +
      `Thai demand does not grow.` + pipeline },
    { min: 18.0, tag: 'flat', t:
      `Private investment of ${fmt(s.invRate)}% of GDP is where it started. Thai firms have sat on cash for a ` +
      `decade rather than commit it domestically, and four years of this administration did not change that ` +
      `calculation. Every other number in this assessment is downstream of this one, which is why the ` +
      `improvements elsewhere should be read with some caution.` + pipeline },
    { min: 17.0, tag: 'slipping', t:
      `Private investment fell to ${fmt(s.invRate)}% of GDP from 18.0%. A declining investment rate through an ` +
      `expansion is the least ambiguous signal in this assessment: firms had the demand, had the credit, and ` +
      `still concluded that the domestic return did not justify the commitment.` + pipeline },
    { min: -99, tag: 'displaced', t:
      `Private investment fell to ${fmt(s.invRate)}% of GDP. The state borrowed heavily into a market where ` +
      `private firms were competing for the same funds, and the risk premium did the rest. Crowding out is ` +
      `usually a theoretical objection to public borrowing; here it is the observed outcome, and it means the ` +
      `public capital in the table above came partly at the expense of the private capital in this one.` + pipeline },
  ], s.invRate);

  // ---- households. The largest constraint on Thai consumption. A stock over a
  // denominator: it falls when nominal GDP outruns credit, which is the only
  // mechanism this country has ever used, and four years barely moves it.
  const hhStart = 87.5, hhDelta = s.hhDebt - hhStart;
  const households = pick([
    { min: 6, tag: 'deeper in', t:
      `Household debt finished at ${fmt(s.hhDebt)}% of GDP, ${fmt(hhDelta)} points ABOVE where this government ` +
      `found it. That is the worst number in the assessment and the one with the longest tail: at this level ` +
      `roughly a third of monetary transmission is gone, so the next cabinet will cut rates into a banking ` +
      `system that cannot pass the cut on. Households borrowed to keep consuming through a term in which ` +
      `output grew — which is the definition of a recovery that did not reach anybody.` },
    { min: 2.5, tag: 'rising', t:
      `Household debt rose ${fmt(hhDelta)} points to ${fmt(s.hhDebt)}% of GDP. Credit outran nominal income ` +
      `for four consecutive years, in an expansion, which is when the ratio is supposed to fall. Every point ` +
      `added here is a point of monetary transmission the Bank of Thailand will not have in the next ` +
      `downturn, and the bill is presented in a quarter nobody can schedule.` },
    { min: 0.5, tag: 'unchanged', t:
      `Household debt sits at ${fmt(s.hhDebt)}% of GDP against ${hhStart}% at the start. Untouched, which ` +
      `after four years of growth is itself a finding: nominal GDP rose and credit rose with it, so the ratio ` +
      `that bottlenecks every rate cut this country makes is exactly where it was. Nobody campaigns on this ` +
      `and no bond desk prices it, which is precisely why it never moves.` },
    { min: -2, tag: 'flat', t:
      `Household debt eased marginally to ${fmt(s.hhDebt)}% of GDP. Directionally right and quantitatively ` +
      `nothing — at this pace the ratio returns to something a central bank can work with somewhere in the ` +
      `2040s. Transfers and formalisation both bear on it, and neither was pushed hard enough here to outrun ` +
      `credit growth by a meaningful margin.` },
    { min: -5, tag: 'easing', t:
      `Household debt came down ${fmt(-hhDelta)} points to ${fmt(s.hhDebt)}% of GDP. Real deleveraging, and ` +
      `almost certainly not the point of any single decision that produced it — income support reduces the ` +
      `need to borrow, formalisation moves informal debt onto terms people can service, and growth does the ` +
      `rest through the denominator.` },
    { min: -9, tag: 'deleveraging', t:
      `Household debt fell ${fmt(-hhDelta)} points to ${fmt(s.hhDebt)}% of GDP, a pace no Thai government has ` +
      `sustained across a full term in the era for which there are comparable figures. The reward is not the ` +
      `ratio, it is what the ratio unblocks: bank lending is the dominant channel of monetary transmission ` +
      `here, and most of a rate cut now reaches the real economy instead of dying in loan-loss provisions.` },
    { min: -999, tag: 'transformed', t:
      `Household debt fell ${fmt(-hhDelta)} points to ${fmt(s.hhDebt)}% of GDP. This is the quiet structural ` +
      `achievement of the term and it will never be described as one, because the beneficiary is a future ` +
      `central bank governor facing a crisis that has not happened yet. A household sector at this level of ` +
      `leverage can absorb a shock without a fiscal rescue, which is the difference between a recession and ` +
      `a lost decade.` },
  ], hhDelta);

  const politics = gov.fallen ? { tag: 'collapsed', t:
    `The coalition broke before the term ran out, and everything above is a partial record scored on what was ` +
    `finished first. The sequencing did the damage: the bills that cost the most political capital were taken ` +
    `early and the partners who paid for them were never compensated. Governments in Thailand rarely fall on ` +
    `policy. They fall on arithmetic, and the arithmetic was visible for quarters.` }
    : pick([
    { min: 70, tag: 'adored', t:
      `${g.approval}% approval at the close, with ${gov.seats} seats behind it. Numbers like this are ` +
      `ordinarily the property of governments that have just spent a great deal of money very quickly, and ` +
      `they are ordinarily followed by the bill. If this one was earned by delivery rather than disbursement ` +
      `it is the strongest political position any Thai cabinet has held since 2005 — and it was still, on the ` +
      `evidence of the later quarters, underspent.` },
    { min: 62, tag: 'commanding', t:
      `The cabinet leaves with ${g.approval}% approval and ${gov.seats} seats intact — a government more ` +
      `popular at the end than at the beginning, which in Thai politics is genuinely rare. The caveat is the ` +
      `standard one: approval is an asset only while it is being converted into legislation, and a government ` +
      `this popular could have spent more of it than it did.` },
    { min: 52, tag: 'comfortable', t:
      `${g.approval}% approval and ${gov.seats} seats. Comfortable rather than commanding: enough authority to ` +
      `pass what was already agreed, not obviously enough to force through anything a partner objected to. ` +
      `Most Thai governments would take this and most would also find, as this one did, that it does not ` +
      `stretch to the difficult bill in year three.` },
    { min: 44, tag: 'held', t:
      `${g.approval}% approval and ${gov.seats} seats at the close. The coalition held, which given a 500-seat ` +
      `house assembled from six parties and a mid-term revenue package is not a trivial achievement. But it ` +
      `held without ever building the majority for anything more ambitious than what was passed in the first ` +
      `eighteen months, and the later quarters read accordingly.` },
    { min: 36, tag: 'strained', t:
      `Approval of ${g.approval}% against ${gov.seats} seats describes a government with the votes and not the ` +
      `standing. Partners price a weakened prime minister accurately and immediately, so the cost of every ` +
      `remaining bill rose, and the record thins out exactly where the polling does.` },
    { min: 28, tag: 'exhausted', t:
      `Approval of ${g.approval}% left the government surviving on party discipline rather than public ` +
      `consent. A cabinet in this position cannot begin anything — every remaining bill is priced by partners ` +
      `who can read the same polling — which is why the final years of the record are so thin. The seats were ` +
      `there. The authority was not.` },
    { min: -99, tag: 'a caretaker', t:
      `At ${g.approval}% approval this administration finished as a caretaker in all but name, holding the ` +
      `office because the alternative was a dissolution nobody in the coalition wanted to face. Whatever was ` +
      `achieved was achieved early. The remainder was survival, and survival is not a programme.` },
  ], g.approval);

  // The chain that runs through the Zero Corruption Act ends in a decision the
  // record cannot show on its own, so the assessment says it outright.
  if (g.flags.has('patriot'))
    politics.t += ` One line does not appear in any of the numbers above. When the prosecution service ` +
      `reached this government's own provincial members, the files were allowed to proceed — and the ` +
      `organisation that converts Bhumjaithai votes into Bhumjaithai seats stopped converting them. The ` +
      `count is smaller than the record earned, deliberately, and everyone involved understood the trade ` +
      `before it was made.`;
  else if (g.flags.has('hollow_reform'))
    politics.t += ` And one thing the seat total conceals: the anti-corruption body this cabinet built was ` +
      `publicly instructed to withdraw the files when they reached its own side. The Act remains on the ` +
      `books, the machine went back to work, and the country now knows exactly what the enforcement is ` +
      `worth. Whatever else was reformed here, that was not.`;

  const markets = pick([
    { min: 60, tag: 'euphoric', t:
      `The SET closed at ${n(g.set)}, up ${fmt(setChg)}%, against real growth of ${fmt(realCagr, 2)}% ` +
      `annualised. Sentiment in this model is clamped, so an index here is not a bubble in the technical ` +
      `sense — it is the market leaning on the fundamental as hard as it is permitted to. Foreign ` +
      `institutional money came back. It is the fastest money in the building and it leaves the same way.` },
    { min: 35, tag: 'rewarded', t:
      `The SET closed at ${n(g.set)}, ${fmt(setChg)}% above where the term began, the loudest and least ` +
      `reliable verdict available. Equity markets are pricing the reform narrative and the FDI signal, both ` +
      `of which are revisable; real GDP growth annualised at ${fmt(realCagr, 2)}% over the same period, and ` +
      `the gap between those two numbers is where disappointment usually lives.` },
    { min: 18, tag: 'warm', t:
      `The SET finished at ${n(g.set)}, up ${fmt(setChg)}%, with real growth of ${fmt(realCagr, 2)}% behind ` +
      `it. A respectable re-rating rather than a story — the market has concluded that the risk of a Thai ` +
      `policy accident fell, which is a lower bar than concluding that Thai earnings will grow.` },
    { min: 5, tag: 'neutral', t:
      `The SET finished at ${n(g.set)}, up ${fmt(setChg)}% and roughly tracking nominal GDP, against real ` +
      `growth of ${fmt(realCagr, 2)}% annualised. Markets neither rewarded nor punished this administration. ` +
      `After a full term of policy activity, indifference is itself a judgement — foreign institutional money ` +
      `has still not been given a reason to come back.` },
    { min: -5, tag: 'indifferent', t:
      `The SET ended at ${n(g.set)}, ${fmt(setChg)}% on where this government started. Four years of ` +
      `announcements and the index is where it was. Whatever the cabinet believes it changed, the people who ` +
      `price Thai equities for a living did not find it material.` },
    { min: -20, tag: 'unconvinced', t:
      `The SET at ${n(g.set)} is ${fmt(setChg)}% on where this government started, with real growth of ` +
      `${fmt(realCagr, 2)}% annualised behind it. Thai equities have spent a decade as the cheapest way to ` +
      `express doubt about Thai growth, and nothing in these four years changed that trade.` },
    { min: -999, tag: 'repudiated', t:
      `The SET at ${n(g.set)} is ${fmt(setChg)}% below its level at the start of the term. An equity market ` +
      `does not fall this far through an administration on sentiment alone; it falls when the people holding ` +
      `Thai assets conclude that the policy risk attaching to them has risen. That is a verdict on the ` +
      `government rather than on the economy, and it is the one investors act on.` },
  ], setChg);

  return [
    { h: 'Headline', tag: growth.tag, t: growth.t },
    { h: 'Legacy', tag: legacy.tag, t: legacy.t },
    { h: 'Fiscal', tag: debt.tag, t: debt.t },
    { h: 'Investment', tag: inv.tag, t: inv.t },
    { h: 'Households', tag: households.tag, t: households.t },
    { h: 'Politics', tag: politics.tag, t: politics.t },
    { h: 'Markets', tag: markets.tag, t: markets.t },
  ];
}

/** The last line, written after the count — so it reports the verdict of the
 *  electorate rather than speculating about it. The economics and the result
 *  are allowed to disagree, because they frequently do. */
function verdictClose(g, s, gov, elec) {
  if (gov.fallen) return 'The cabinet did not reach the election. Whether the party does is a different ' +
    'question, and one its partners will answer first.';
  // Not a single threshold. A record is the whole picture: capacity, the
  // investment rate, the reform stock, and whether the level beat the Fund.
  const marks = [s.potentialGrowthYoy >= 2.65, s.invRate >= 19.5,
                 s.reformStock >= 55, g.headline() >= 9092].filter(Boolean).length;
  const reformed = marks >= 3;
  const solvent = s.debtGdp < g.debtCeiling;
  const v = elec ? elec.verdict : null;
  const solo = elec && elec.playerSeats >= 251;

  if (v === 'landslide' && elec.playerSeats >= 300)
    return reformed && solvent
      ? 'A realigning majority won on a record that will still be compounding when the seats are counted ' +
        'again. Thai governments are not usually returned for what they built; this one was.'
      : 'A realigning majority, won on the mood rather than the balance sheet. The mandate is real and so ' +
        'is the debt, and the second term will be spent discovering which of the two binds first.';
  if (v === 'landslide' || solo)
    return reformed && solvent
      ? 'Returned with room to spare and a record to justify it. The December 2030 promise now falls inside ' +
        'the new term, which means the government that made it is the one that has to answer for it.'
      : 'Returned comfortably, on numbers that will not survive four more years of the same. The mandate ' +
        'buys time to fix the fiscal position; nothing about the campaign suggests an appetite for it.';
  if (v === 'returned')
    return marks === 4
      ? 'Returned on a record that stands up in every column — capacity, investment, reform and the level ' +
        'itself. The majority is narrower than the term deserved, which is the usual reward for spending ' +
        'four years on things that mature after the count.'
      : reformed
      ? 'Back in office, narrowly, with the structural work half-collected and the credit for it still ' +
        'accruing to whoever is standing there in 2034.'
      : 'Back in office without a clear reason to have been. A second term on this arithmetic is a ' +
        'negotiation, not a mandate.';
  if (v === 'hung')
    return 'The largest party in the House and unable to govern it — beaten not at the polls but at the ' +
           'negotiating table, by partners who spent four years being taken for granted.';
  if (v === 'defeated')
    return reformed
      ? 'Turned out of office having done the work, which is the oldest story in structural reform: the ' +
        'costs land inside your term and the benefits land inside somebody else\'s.'
      : 'Turned out of office with the debt, the polling and the unfinished reforms all pointing the same ' +
        'way. Few in Bangkok will be surprised.';
  return 'The term is over. What it was worth depends on numbers that have not finished moving.';
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
      : '<p class="ach-none">None this term. Every one of them is reachable from the 2026 coalition screen.</p>'}
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
