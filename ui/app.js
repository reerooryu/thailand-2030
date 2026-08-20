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
    </div>
    <div class="t-foot"><span class="muted">baseline 9,092</span><span class="muted">target 15,000</span></div>`;

  g.gdpTrack = g.gdpTrack || [];
  if (g.gdpTrack.length <= g.quarter) g.gdpTrack.push(headline);
  else g.gdpTrack[g.quarter] = headline;

  $('#kpis').innerHTML = [
    tile('GDP per capita', Math.round(headline).toLocaleString(), ' USD', '2030 projection at current stance',
         g.gdpTrack.slice(-10), 'var(--series-1)', gdpExtra),
    tile('Real GDP growth', fmt(((s.rgdp / g.history[Math.max(0, g.history.length - 5)].rgdp) - 1) * 100), '%',
         'year on year', hist.map(h => h.gap), 'var(--series-3)'),
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
    ${tile('Policy rate', fmt(s.policyRate, 2), '%', 'floor 0.50% · 50bp of room', null)}`;

  /* politics */
  const seats = g.coalitionSeats();
  $('#politics').innerHTML = `
    <div class="pol-head">
      <div><span class="pol-seats">${seats}</span> <span class="muted">of 500 · majority 251</span></div>
      <div class="muted">${g.ps.coalition.join(' + ')}</div>
      <div><span class="muted">Approval</span> <b>${g.approval}%</b></div>
    </div>
    <div class="parties">${Object.entries(g.opinion).filter(([k]) => k !== 'Bhumjaithai')
      .map(([k, v]) => {
        const b = g.bandOf(k);
        const inGov = g.ps.coalition.includes(k);
        return `<div class="party${inGov ? ' in-gov' : ''}">
          <div class="p-name">${k}${inGov ? ' <span class="gov-chip">gov</span>' : ''}</div>
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

  let idx = 0;
  const seatEls = [];
  for (const party of present) {
    const n = cfg.parties[party].seats;
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
      <div class="muted">House of Representatives · 500 seats · 1 vacant</div>
    </div>
    <div class="parl-wrap">
      <svg viewBox="-250 -252 500 268" class="parl-svg" role="img"
           aria-label="Parliament: ${present.map(p => p + ' ' + cfg.parties[p].seats).join(', ')}">
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
        <span class="lg-seats">${cfg.parties[p].seats}</span>
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
      tip.innerHTML = `<div class="tip-name">${party} <span class="tip-seats">${cp.seats} seats</span></div>
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
      const b = el('button', 'opt' + (o.unavailable ? ' locked' : ''));
      b.innerHTML = `<div class="o-label">${o.label}</div>` +
        (o.flavour ? `<div class="o-flavour">${o.flavour}</div>` : '') +
        (o.unavailable ? '' : renderDeltas(o.opinion));
      if (o.unavailable) b.disabled = true;
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
  const electionBlock = !elec ? '' : `
    <div class="election ${elec.verdict}">
      <div class="el-head">
        <div class="el-verdict">${elec.headline}</div>
        <div class="el-seats">${elec.playerSeats}<span class="el-seats-u"> seats</span>
          <span class="${elec.playerSeats >= 191 ? 'up' : 'down'}">${elec.playerSeats >= 191 ? '+' : ''}${elec.playerSeats - 191}</span></div>
      </div>
      <p class="el-detail">${elec.detail}</p>
      <table class="el-table">
        <tr><th>Party</th><th>2026</th><th>2030</th><th></th><th>After the count</th></tr>
        ${elec.results.map(r => `<tr class="${r.inGov ? 'was-gov' : ''}">
          <td class="el-p">${r.party}${r.inGov ? ' <span class="gov-chip">gov</span>' : ''}</td>
          <td class="el-n muted">${r.before}</td>
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
   Six dimensions, each banded independently, each expected to praise what
   worked and say plainly what did not — a cabinet that fixed potential growth
   and wrecked the balance sheet gets both paragraphs, in its own words. The
   headline band splits on the IMF baseline of 9,092, the only number in this
   game with an outside author. */
function verdictSections(g, s, realCagr, setChg, gov) {
  const pick = (bands, v) => (bands.find(b => v >= b.min) || bands[bands.length - 1]);
  const h = g.headline();
  const gap = h - 9092;
  const n = x => Math.round(x).toLocaleString();

  const growth = gap >= 200 ? { tag: 'ahead of baseline', t:
    `The cabinet finished at ${n(h)} dollars per head, ${n(gap)} clear of the IMF's own projection for the ` +
    `period. That deserves to be said plainly, because the Fund's Thailand baseline has behaved more like a ` +
    `ceiling than a forecast for a decade, and beating it took genuine output rather than a favourable deflator. ` +
    `It is also, of course, six thousand dollars short of what was promised in February 2026 — a promise no ` +
    `serious observer costed at the time, and which the government spent four years being asked about anyway.` }
    : gap >= -80 ? { tag: 'at baseline', t:
    `${n(h)} dollars per head against a baseline of 9,092: the cabinet delivered almost precisely what the IMF ` +
    `expected Thailand to deliver under any government at all. Read narrowly, that is four years of activity ` +
    `with nothing to show at the top line. Read fairly, the top line was never the point — a term is worth ` +
    `having or not on the strength of what sits underneath it, and this one has a good deal underneath it.` }
    : { tag: 'behind baseline', t:
    `At ${n(h)} dollars per head the cabinet came in ${n(-gap)} below what the IMF projected for a Thailand with ` +
    `no particular government at all, which is the harshest fact in this assessment and cannot be attributed to ` +
    `the external environment. Debt service, crowding out, and a stimulus habit that bought a quarter of growth ` +
    `at a time each take a share of the blame. The 15,000 target was never reachable; underperforming the ` +
    `do-nothing counterfactual was entirely avoidable.` };

  // A term can clear the baseline on the level and still have run the economy
  // into the ground on the way — playtesting produced a run at 9,228 with a
  // -3.97% output gap and 1.29% growth, which the assessment praised. Say it.
  if (realCagr < 1.9 || s.gap < -2)
    growth.t += ` One thing the level conceals: real growth annualised at ${fmt(realCagr, 2)}% and the output ` +
      `gap finished at ${(s.gap >= 0 ? '+' : '') + fmt(s.gap, 2)}%. This economy was running below capacity ` +
      `when the votes were counted, and an idle output gap is unemployment and foregone revenue whatever the ` +
      `per-head number says.`;

  const legacy = pick([
    { min: 3.0, tag: 'transformed', t:
      `Potential growth of ${fmt(s.potentialGrowthYoy, 2)}%, from 2.1% at the start, is the outstanding ` +
      `achievement of this administration and will be recognised as such long after the personalities are ` +
      `forgotten. A reform stock of ${fmt(s.reformStock, 0)} is not a rhetorical number: it is deregulation, ` +
      `digitisation and human capital that compound annually whoever is in office. That almost none of it ` +
      `showed up in the cabinet's own figures is the strongest evidence that it was real.` },
    { min: 2.6, tag: 'improved', t:
      `Potential growth improved to ${fmt(s.potentialGrowthYoy, 2)}% from 2.1%, on a reform stock of ` +
      `${fmt(s.reformStock, 0)}. This is the part of the record that holds up. Thailand's problem has never ` +
      `been the cycle, it has been a supply side that stopped improving around 2013, and this cabinet moved ` +
      `it. The successor will collect the credit, which is how structural reform has always worked and why ` +
      `so little of it gets done.` },
    { min: 2.2, tag: 'concrete only', t:
      `Potential growth reached ${fmt(s.potentialGrowthYoy, 2)}%, but the composition is unflattering: a reform ` +
      `stock of ${fmt(s.reformStock, 0)} says most of this was bought with capital spending rather than earned ` +
      `through reform. Concrete raises the capital stock whether or not anything was fixed, and it stops raising ` +
      `it the moment the disbursement ends. The bureaucracy the cabinet inherited is substantially the ` +
      `bureaucracy it leaves.` },
    { min: -99, tag: 'unchanged', t:
      `Potential growth of ${fmt(s.potentialGrowthYoy, 2)}% is the central failure of the term. The constraint ` +
      `this government was elected to address is exactly where it was found, and the country will be no more ` +
      `capable of growing in 2031 than it was in 2026 — only more indebted. Four years, a working majority, ` +
      `and a reform stock of ${fmt(s.reformStock, 0)} to show for it.` },
  ], s.potentialGrowthYoy);

  const over = s.debtGdp - g.debtCeiling;
  // The ceiling is only "raised for itself" if the cabinet actually legislated
  // it. A term that declined to raise it and breached anyway is a different and
  // slightly worse story, and the text used to conflate the two.
  const ceilingMoved = g.debtCeiling > 70;
  const ceilingPhrase = ceilingMoved
    ? `a ceiling this cabinet had already raised for itself to ${g.debtCeiling}%`
    : `the statutory ${g.debtCeiling}% ceiling, which it never once asked parliament to move`;
  const debt = over >= 4 ? { tag: 'breached', t:
    `Gross debt of ${fmt(s.debtGdp)}% of GDP stands ${fmt(over)} points above ${ceilingPhrase}. ` +
    `The market has drawn the obvious conclusion: ` +
    `${fmt(s.riskPremium, 2)} points of risk premium on everything the state borrows, compounding, and the same ` +
    `premium passed through to every firm that borrows alongside it. A primary deficit of ` +
    `${fmt(Math.abs(s.primaryBalance), 2)}% of GDP at the end of an expansion is not stabilisation policy, it is ` +
    `a habit. This is the single largest constraint the next government inherits, and it was manufactured here.` }
    : over >= 0 ? { tag: 'at the limit', t:
    `Debt closed at ${fmt(s.debtGdp)}% against the ${g.debtCeiling}% ceiling — every point of fiscal space the ` +
    `cabinet had, including the space it legislated for itself, is now spent. Defensible if the money bought ` +
    `durable capacity, indefensible if it bought quarters of growth, and the reform stock of ` +
    `${fmt(s.reformStock, 0)} is where that argument will be settled. Either way, the next fiscal shock finds ` +
    `Thailand with no room and no politically cheap way to make some.` }
    : over >= -5 ? { tag: 'used well', t:
    `Debt finished at ${fmt(s.debtGdp)}% inside a ${g.debtCeiling}% ceiling, with the risk premium held to ` +
    `${fmt(s.riskPremium, 2)} points. This is close to the textbook use of fiscal space: spent rather than ` +
    `hoarded, stopped before the market repriced it, and handed over with a margin. In a region where three ` +
    `governments have blown through their own limits since 2020, restraint of this kind is worth more than it ` +
    `looks on the page.` }
    : { tag: 'conserved', t:
    `Debt of ${fmt(s.debtGdp)}% leaves ${fmt(-over)} points of unused headroom beneath the ceiling. Fiscal ` +
    `conservatism is a real virtue and this cabinet practised it. The uncomfortable question is what the ` +
    `restraint purchased: an unused balance sheet is not a policy, and the capacity that was not built during ` +
    `four years of cheap money will cost considerably more to build later.` };

  const inv = pick([
    { min: 21, tag: 'reversed', t:
      `Private investment of ${fmt(s.invRate)}% of GDP is the result nobody forecast. This ratio has been ` +
      `falling since 1996 and no administration in the intervening quarter-century arrested it for a full term. ` +
      `Whatever else is disputed about this government, it moved the single variable that determines whether ` +
      `Thailand grows — and it did so while public capital was also rising, which rules out the usual ` +
      `explanation that the state simply crowded the number upward.` },
    { min: 19.5, tag: 'recovering', t:
      `Private investment recovered to ${fmt(s.invRate)}% of GDP from 18.0%. Set against 31.2% in 1996 that ` +
      `remains a diminished economy, but it is the first sustained increase in a generation and it is what the ` +
      `improvement in potential growth is actually made of. Firms responded to something — most plausibly the ` +
      `permitting and compliance reforms rather than the megaprojects.` },
    { min: 18.2, tag: 'flat', t:
      `Private investment ended at ${fmt(s.invRate)}% of GDP, essentially where it was found. This is the ` +
      `ordinary outcome and the hardest problem in Thai economics: reforms were legislated, and the firms did ` +
      `not move within the electoral cycle. The cabinet can fairly argue the response comes later. It cannot ` +
      `argue it came now.` },
    { min: -99, tag: 'displaced', t:
      `Private investment fell to ${fmt(s.invRate)}% of GDP. Public capital rose to ${fmt(s.capitalSpend, 2)}% ` +
      `over the same period, so the state now accounts for a larger share of Thai investment than at any time ` +
      `since the crisis. That is substitution, not recovery, and it is the mechanism by which a borrowing ` +
      `programme can raise measured demand while leaving the economy weaker than it found it.` },
  ], s.invRate);

  const politics = gov.fallen ? { tag: 'collapsed', t:
    `The coalition broke before the term ran out, and everything above is a partial record scored on what was ` +
    `finished first. The sequencing did the damage: the bills that cost the most political capital were taken ` +
    `early and the partners who paid for them were never compensated. Governments in Thailand rarely fall on ` +
    `policy. They fall on arithmetic, and the arithmetic was visible for quarters.` }
    : pick([
    { min: 62, tag: 'commanding', t:
      `The cabinet leaves with ${g.approval}% approval and ${gov.seats} seats intact — a government more popular ` +
      `at the end than at the beginning, which in Thai politics is genuinely rare. The caveat is the standard ` +
      `one: approval is an asset only while it is being converted into legislation, and a government this ` +
      `popular could have spent more of it than it did.` },
    { min: 44, tag: 'held', t:
      `${g.approval}% approval and ${gov.seats} seats at the close. The coalition held, which given a 500-seat ` +
      `house assembled from six parties and a mid-term revenue package is not a trivial achievement. But it ` +
      `held without ever building the majority for anything more ambitious than what was passed in the first ` +
      `eighteen months, and the later quarters read accordingly.` },
    { min: -99, tag: 'exhausted', t:
      `Approval of ${g.approval}% left the government surviving on party discipline rather than public consent. ` +
      `A cabinet in this position cannot begin anything — every remaining bill is priced by partners who can ` +
      `read the same polling — which is why the final years of the record are so thin. The seats were there. ` +
      `The authority was not.` },
  ], g.approval);

  const markets = pick([
    { min: 35, tag: 'rewarded', t:
      `The SET closed at ${n(g.set)}, ${fmt(setChg)}% above where the term began, the loudest and least reliable ` +
      `verdict available. Equity markets are pricing the reform narrative and the FDI signal, both of which are ` +
      `revisable; real GDP growth annualised at ${fmt(realCagr, 2)}% over the same period, and the gap between ` +
      `those two numbers is where disappointment usually lives.` },
    { min: 5, tag: 'neutral', t:
      `The SET finished at ${n(g.set)}, up ${fmt(setChg)}% and roughly tracking nominal GDP, against real growth ` +
      `of ${fmt(realCagr, 2)}% annualised. Markets neither rewarded nor punished this administration. After a ` +
      `full term of policy activity, indifference is itself a judgement — foreign institutional money has still ` +
      `not been given a reason to come back.` },
    { min: -999, tag: 'unconvinced', t:
      `The SET at ${n(g.set)} is ${fmt(setChg)}% on where this government started, with real growth of ` +
      `${fmt(realCagr, 2)}% annualised behind it. Thai equities have spent a decade as the cheapest way to ` +
      `express doubt about Thai growth, and nothing in these four years changed that trade.` },
  ], setChg);

  return [
    { h: 'Headline', tag: growth.tag, t: growth.t },
    { h: 'Legacy', tag: legacy.tag, t: legacy.t },
    { h: 'Fiscal', tag: debt.tag, t: debt.t },
    { h: 'Investment', tag: inv.tag, t: inv.t },
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
