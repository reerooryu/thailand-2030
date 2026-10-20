import { renderConstitutionFinal } from './constitution.js';
import { $, COALITIONS, el, fmt, g, tile } from './core.js';
import { ratingLabel } from './dashboard.js';
import { renderMapInto } from './map.js';
import { ENDING_THEMES } from './music.js';
import { seatPositions } from './parliament.js';
import { renderHome } from './home.js';

export function showEnd(walked, snap = false) {
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
  const endIdeology = g.ideology();
  if (window.playEnding) window.playEnding(ENDING_THEMES[endIdeology.name]);
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
          ${row('Alignment', g.alignLabel(), `US ${g.align.us} · China ${g.align.cn}`)}
          ${g.war.stage !== 'none' ? row('Cambodian war', g.flags.has('territory_annexed') ? 'Annexed' : g.war.stage === 'won' ? 'Occupied' : 'Unfinished',
                `${Math.round(g.war.thaiCasualties).toLocaleString()} Thai and ${Math.round(g.war.khmerCasualties).toLocaleString()} Cambodian killed and wounded`) : ''}
          ${g.flags.has('lao_ties') ? row('Laos', g.flags.has('lao_scaled_back') ? 'Scaled back' : g.flags.has('lao_baht_zone') ? 'Baht zone' : g.flags.has('lao_trilateral') ? 'Three-way framework' : 'Partnership',
                g.flags.has('lao_scaled_back') ? 'after Beijing pushed back' : g.flags.has('lao_held') ? 'held against Beijing' : g.flags.has('lao_trilateral') ? 'with China at the table' : 'grid, rail and border trade') : ''}
          ${row('EU FTA', g.fta.suspended ? 'Suspended' : g.fta.stage === 'in_force' ? 'In force' : g.fta.stage === 'ratifying' ? 'Ratifying' : Math.round(g.fta.progress) + '%',
                g.fta.stage === 'negotiating' ? 'negotiated, from 63%' : g.fta.stage === 'ratifying' ? 'talks concluded' : 'since ' + g.labelAt(g.fta.inForceQuarter),
                g.fta.stage === 'in_force' ? 'good' : '')}
          ${(() => { const d = g.demography(); return row('Population', d.total.toFixed(1) + 'm', d.newPop ? `incl. ${d.newPop.toFixed(1)}m in the 1941 provinces` : 'from 71.6m in 2026')
            + row('Fertility rate', d.tfr.toFixed(2), d.newPop ? `children per woman · ${d.thaiTfr.toFixed(2)} in pre-war Thailand, from 0.90` : 'children per woman, from 0.90', d.tfr < 1 ? 'critical' : 'warning')
            + (d.kingdomPc ? row('GDP per head, enlarged Kingdom', Math.round(d.kingdomPc).toLocaleString() + ' USD', 'the headline is scored on pre-war borders') : ''); })()}
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
            return row('Constitution', word, cv.stage === 'ratified'
                ? `reform score ${cv.score}${cv.sg ? ` · Singapore-lite ${cv.sg}/3` : ''}` : '',
                       cv.stage === 'ratified' ? 'good' : cv.stage === 'failed' ? 'critical' : ''); })()}
          ${Object.entries(g.opinion).filter(([k]) => k !== 'Bhumjaithai').map(([k, v]) =>
            row(k, String(v), g.bandOf(k).label,
                v >= 61 ? 'good' : v >= 41 ? '' : v >= 21 ? 'warning' : 'critical')).join('')}
        </table>
      </div>
    </div>

    <div class="verdict">
      <div class="verdict-h">Assessment · Second Anutin Cabinet (2026–${g.label.slice(0, 4)})</div>
      ${renderIdeology(endIdeology)}
      ${verdictSections(g, s, realCagr, setChg, gov).map(v => `
        <div class="vsec">
          <div class="vsec-h">${v.h}${v.tag ? ` <span class="vtag">${v.tag}</span>` : ''}</div>
          <p>${typeof v.t === 'string' ? v.t : v.t.text}</p>
        </div>`).join('')}
      <div class="vclose">${verdictClose(g, s, gov, elec)}</div>
    </div>
    ${renderConstitutionFinal()}
    <div class="end-map">
      <div class="end-map-h"><span>The Kingdom in ${g.label.slice(0, 4)}</span>
        <span class="end-map-tg"><button data-m="provinces" class="on">Provinces</button><button data-m="flag">Flag</button></span></div>
      <div id="end-map"></div>
    </div>
    ${renderAchievements(g.achievements(elec))}
    ${fell ? '<p class="sub">Scored on what you managed before it ended.</p>' : ''}
    <div class="logbox">${g.log.map(l => `<div class="logline"><span class="muted">Q${l.quarter + 1}</span> ${l.text}</div>`).join('')}</div>
    <button id="again" class="primary">Play again</button>`;
  $('#again').onclick = () => renderHome();
  renderMapInto($('#end-map'), 'provinces');
  w.querySelectorAll('.end-map-tg button').forEach(b => b.onclick = () => {
    w.querySelectorAll('.end-map-tg button').forEach(x => x.classList.toggle('on', x === b));
    renderMapInto($('#end-map'), b.dataset.m);
  });
}


/* ---- end-of-term assessment ---------------------------------------------
   Written as an outside analyst filing after the term ends, not as a score.
   Seven dimensions, each banded seven ways, each expected to praise what
   worked and say plainly what did not — a cabinet that fixed potential growth
   and wrecked the balance sheet gets both paragraphs, in its own words. The
   headline band splits on the IMF baseline of 9,092, the only number in this
   game with an outside author. */
export function verdictSections(g, s, realCagr, setChg, gov) {
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
      `${g.approval}% approval at the close, ${gov.seats} seats behind it. ` +
      (g.flags.has('revenue_package_done') || g.flags.has('vat_raised')
        ? `Earned while raising taxes, which almost never happens. The strongest position of any Thai cabinet since 2005.`
        : `Numbers like this usually follow a spending spree, and the bill follows them. If earned by delivery, it is the strongest position of any Thai cabinet since 2005.`) },
    { min: 62, tag: 'commanding', t:
      `${g.approval}% approval and ${gov.seats} seats intact: more popular at the end than the start, rare in ` +
      `Thai politics. You could have spent more of it on legislation.` },
    { min: 52, tag: 'comfortable', t:
      `${g.approval}% approval and ${gov.seats} seats. Enough to pass what was agreed, not enough to force ` +
      `anything a partner opposed. ` + (() => {
        const hard = [g.con.stage === 'ratified' && 'a new constitution', g.flags.has('vat_raised') && 'a VAT rise',
          g.flags.has('civil_service_shrinking') && 'the civil service cut'].filter(Boolean);
        return hard.length ? `It still carried ${hard.length > 1 ? hard.slice(0, -1).join(', ') + ' and ' + hard[hard.length - 1] : hard[0]}.`
                           : 'It did not stretch to the hard bill in year three.';
      })() },
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
export function verdictClose(g, s, gov, elec) {
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
export function electionParliament(elec) {
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
export function renderIdeology(i) {
  return `<div class="ideo">
    <div class="ideo-k">Revealed economic position</div>
    <div class="ideo-name">${i.name}</div>
    <div class="ideo-tag">${i.tag}</div>
    <p class="ideo-body">${i.body}</p>
    <div class="ideo-trad">Closest tradition · ${i.tradition}</div>
  </div>`;
}

export function renderAchievements(list) {
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

export function endTile(l, v, s, status) {
  return `<div class="tile"><div class="t-label">${l}</div><div class="t-value ${status}">${v}</div><div class="t-sub">${s}</div></div>`;
}
