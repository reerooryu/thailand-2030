import { renderConstitution } from './constitution.js';
import { $, fmt, g, meter, tile, yoyGrowth, yoySeries } from './core.js';
import { renderDeck } from './deck.js';
import { renderMap } from './map.js';
import { renderNews } from './news.js';
import { renderParliament } from './parliament.js';
import { renderWar } from './war.js';

/* ---------- main render ---------- */

/* Sovereign ratings: three agencies, one small box. Outlook as an arrow. */
export function ratingLabel(a) {
  return (a.name === "Moody's" ? ['Baa3', 'Baa2', 'Baa1', 'A3'] : ['BBB-', 'BBB', 'BBB+', 'A-'])[a.notch];
}
export function ratingsBox() {
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

export function render() {
  const s = g.state;
  const hist = g.history.slice(-10);
  const headline = g.headline();
  const target = 15000, baseline = 9092;
  const pctToTarget = Math.max(0, Math.min(100, (headline / target) * 100));

  $('#turn-label').textContent = g.label;
  {
    const f = g.fta;
    const word = f.suspended ? 'suspended' : f.stage === 'in_force' ? 'in force' : f.stage === 'ratifying' ? 'ratifying' : `${Math.round(f.progress)}%`;
    const pct = f.stage === 'negotiating' ? f.progress : 100;
    g._ftaHtml = `<span class="fta-l" title="EU–Thailand free trade agreement. Negotiations started at 63% (15 of 24 chapters closed, June 2026). Reforms that answer open chapters speed it up.">EU FTA</span>
      <span class="fta-bar"><span class="fta-fill ${f.suspended ? 'suspended' : f.stage}" style="width:${pct}%"></span></span>
      <span class="fta-w">${word}</span>`;
  }
  {
    const a = g.align, tot = a.us + a.cn;
    const usPct = tot ? a.us / tot * 100 : 50;
    $('#align').innerHTML = `<span class="fta-l" title="Points toward the United States (blue) or China (red), from every card and news choice that leans one way.">US</span>
      <span class="al-bar${tot ? '' : ' none'}"><span class="al-us" style="width:${usPct}%"></span><span class="al-cn" style="width:${100 - usPct}%"></span></span>
      <span class="fta-l">China</span><span class="fta-w"><b class="al-usn">${a.us}</b> · <b class="al-cnn">${a.cn}</b></span>`;
  }
  {
    const d = g.demography();
    $('#demog').innerHTML = `<span class="dg"><span class="dg-l">Population</span><b>${d.total.toFixed(1)}m</b>${d.newPop ? `<span class="muted">incl. ${d.newPop.toFixed(1)}m in the 1941 provinces</span>` : d.heldNotAnnexed ? '<span class="muted">plus about 3m under Thai administration</span>' : ''}</span>
      <span class="dg"><span class="dg-l">Fertility rate</span><b class="${d.tfr < 1 ? 'down' : ''}">${d.tfr.toFixed(2)}</b><span class="muted">children per woman · replacement 2.1${d.newPop ? ` · ${d.thaiTfr.toFixed(2)} in pre-war Thailand` : ''}</span></span>
      ${d.kingdomPc ? `<span class="dg"><span class="dg-l">GDP per head, enlarged Kingdom</span><b>${Math.round(d.kingdomPc).toLocaleString()} USD</b><span class="muted">the headline stays on pre-war borders</span></span>` : ''}`;
  }
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
      <div id="fta" class="fta-under">${g._ftaHtml || ''}</div>
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
  renderWar();
  renderParliament();
  renderMap();
  $('#end-turn').disabled = g.pending.length > 0 || g.quarter >= 16;
  $('#end-turn').textContent = g.quarter >= 16 ? 'Term complete' :
    g.pending.length ? `Resolve ${g.pending.length} item${g.pending.length > 1 ? 's' : ''} first` : 'End quarter →';
}
