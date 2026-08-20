/**
 * Scenario runner: 2026Q2 -> 2030Q4, the actual game window.
 *
 * Runs the engine forward under alternative fiscal strategies and scores each on
 * the four end-screen measures (DESIGN §3.2). This is the first test of whether
 * the design's central thesis actually holds in the model: that the strategy
 * which maximises the 2030 headline number is NOT the strategy that leaves
 * Thailand better off.
 */
import { loadPanel, col } from './panel.js';
import { loadSupply } from './loaders.js';
import { step } from './engine.js';
import { BASE } from './params.js';
import { applyGains } from './playability.js';
import { loadPlayability } from './loaders.js';
import type { Params, State, Exog, Policy } from './types.js';

const n = (v: number | null | undefined, d = 0) => (v == null || Number.isNaN(v) ? d : v);

export interface Strategy {
  name: string;
  describe: string;
  /** Fiscal stance by instrument, % of GDP, per quarter index (0..18). */
  policy: (q: number, s: State) => Omit<Policy, 'policyRate' | 'reer'>;
}

/** Baseline exogenous path for 2026Q2-2030Q4: world demand and energy at their
 *  recent averages, no shocks. A real game draws these from the shock deck. */
const EXOG_BASE: Exog = {
  worldDemandGrowth: 3.0,
  globalActivity: 10.0,
  energyInflation: 1.5,
  shock: 0,
};

export interface ScenarioResult {
  name: string;
  headline: number;         // nominal GDP per capita, USD, 2030
  realGdpPc: number;        // real GDP per capita index vs 2026
  legacy: number;           // potential output growth y/y at end of run
  debtGdp2030: number;      // gross debt, % of GDP, at end of run
  breachedCeiling: boolean;
  invRateEnd: number;
  cpiAvg: number;
  path: State[];
}

const POP_2030 = 71.215;    // WEO
const FX = 34.6;            // WEO assumption, flat from 2028

export function runScenario(st: Strategy, params: Params = applyGains(BASE, loadPlayability())): ScenarioResult {
  const p = loadPanel();
  const sup = loadSupply();
  const i0 = p.periods.indexOf('2026Q2');
  const g = (c: string, i: number, d = 0) => n(col(p, c)[i], d);

  const mk = (i: number): State => ({
    period: p.periods[i],
    gap: g('gap', i), rgdp: g('rgdp_sa', i),
    potential: g('rgdp_sa', i) / (1 + g('gap', i) / 100),
    capital: sup.K[i], labour: sup.L[i], tfp: sup.TFP[i],
    potentialGrowthYoy: 0, infraPipeline: [], reformStock: 0,
    exportsR: g('exp_r', i), importsR: g('imp_r', i),
    invPrivR: g('gfcf_priv_r', i), invPubR: g('gfcf_pub_r', i), consR: g('cons_r', i),
    invRate: g('gfcf_priv_n', i) / g('ngdp', i) * 100,
    cpi: g('cpi', i), cpiCore: g('cpi_core', i),
    cpiYoy: g('cpi_yoy', i), cpiCoreYoy: g('cpi_core_yoy', i),
    policyRate: g('policy_rate', i), realRate: g('real_rate_cpi', i),
    reer: g('reer', i), hhDebt: g('hh_debt', i, 87.5), debtGdp: 64.7, primaryBalance: 0, riskPremium: 0,
    capitalSpend: g('gfcf_pub_n', i) / g('ngdp', i) * 100,
    govConsumption: g('govc_n', i) / g('ngdp', i) * 100,
    transfers: 0, taxRate: 21.1,
  });

  const hist: State[] = [mk(i0 - 3), mk(i0 - 2), mk(i0 - 1), mk(i0)];
  let breached = false;

  for (let q = 0; q < 19; q++) {
    const h = hist.length;
    const s = hist[h - 1];
    const lag4 = hist[h - 4];
    const simRr = hist.slice(-4).reduce((a, v) => a + (v.policyRate - v.cpiYoy), 0) / 4;
    const prev = { ...hist[h - 2], realRate: simRr } as State;

    const stance = st.policy(q, s);
    const policy: Policy = { policyRate: 1.0, reer: s.reer, ...stance };

    const nxt = step({ state: s, prev, lag4, exog: EXOG_BASE, policy, params });
    if (nxt.debtGdp > params.debtCeiling) breached = true;
    hist.push(nxt);
  }

  const path = hist.slice(4);
  const end = path[path.length - 1];
  const start = hist[3];

  // nominal GDP per capita in USD. Real growth compounds; the price level moves
  // with CPI; FX held at the WEO assumption.
  const realGrowth = end.rgdp / start.rgdp;
  const priceGrowth = end.cpi / start.cpi;
  const headline = 8056.57 * realGrowth * priceGrowth * (71.62 / POP_2030) * (32.88 / FX);

  return {
    name: st.name,
    headline,
    realGdpPc: realGrowth * (71.62 / POP_2030) * 100,
    legacy: end.potentialGrowthYoy,
    debtGdp2030: end.debtGdp,
    breachedCeiling: breached,
    invRateEnd: end.invRate,
    cpiAvg: path.reduce((a, v) => a + v.cpiYoy, 0) / path.length,
    path,
  };
}

// ---- strategies -----------------------------------------------------------
const b = { capitalSpend: 6.1, govConsumption: 16.7, transfers: 0, taxRate: 21.1, reformIndex: 0 };

export const STRATEGIES: Strategy[] = [
  { name: 'Do nothing', describe: 'Hold the 2026 fiscal stance flat.',
    policy: () => ({ ...b }) },

  { name: 'Transfers', describe: 'Ramp direct transfers to 2% of GDP. Politically easy, multiplier 0.30.',
    policy: q => ({ ...b, transfers: Math.min(2.0, q * 0.15) }) },

  { name: 'Capital push', describe: 'Raise public investment from 6.1% to 9% of GDP. Multiplier 0.675, but gestation is five years.',
    policy: q => ({ ...b, capitalSpend: 6.1 + Math.min(2.9, q * 0.25) }) },

  { name: 'Capital, tax-funded', describe: 'Same capital push, financed by raising revenue 2pp. Tax multiplier -1.125.',
    policy: q => ({ ...b, capitalSpend: 6.1 + Math.min(2.9, q * 0.25),
                    taxRate: 21.1 + Math.min(2.0, q * 0.15) }) },

  { name: 'Consumption spree', describe: 'Push government consumption up 3pp. Crowds out private investment.',
    policy: q => ({ ...b, govConsumption: 16.7 + Math.min(3.0, q * 0.25) }) },

  { name: 'Reform, hard', describe: 'Maximum structural reform from turn one. No fiscal change. Politically brutal, and nothing shows up for years.',
    policy: () => ({ ...b, reformIndex: 100 }) },

  { name: 'Reform + capital', describe: 'Structural reform alongside a public investment push.',
    policy: q => ({ ...b, reformIndex: 100, capitalSpend: 6.1 + Math.min(2.9, q * 0.25) }) },

  { name: 'Reform, late', describe: 'Spend the first two years on transfers, then reform. Tests whether sequencing matters.',
    policy: q => ({ ...b, transfers: q < 8 ? Math.min(2.0, q * 0.25) : 0,
                    reformIndex: q < 8 ? 0 : 100 }) },
];

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('=== SCENARIOS, 2026Q2 -> 2030Q4 ===');
  console.log('IMF baseline for 2030 headline: USD 9,092\n');
  console.log('strategy               headline   legacy   inv rate   debt/GDP   avg CPI');
  const rs = STRATEGIES.map(s => runScenario(s));
  for (const r of rs) {
    console.log(
      `  ${r.name.padEnd(20)}${r.headline.toFixed(0).padStart(8)}` +
      `${r.legacy.toFixed(2).padStart(9)}%` +
      `${r.invRateEnd.toFixed(1).padStart(10)}%` +
      `${r.debtGdp2030.toFixed(1).padStart(10)}${r.breachedCeiling ? '!' : ' '}` +
      `${r.cpiAvg.toFixed(2).padStart(10)}%`);
  }
  const base = rs[0];
  console.log('\n--- gain over "do nothing", relative ---');
  console.log('strategy              headline    legacy    ratio');
  for (const r of rs.slice(1)) {
    const dh = (r.headline / base.headline - 1) * 100;
    const dl = (r.legacy / base.legacy - 1) * 100;
    console.log(`  ${r.name.padEnd(20)}${dh.toFixed(2).padStart(8)}%${dl.toFixed(2).padStart(9)}%` +
                `${(dl / (dh || 1e-9)).toFixed(1).padStart(9)}x`);
  }

  // The design thesis is NOT that reform loses. Reform is economically correct
  // and should win. The thesis is that reform pays almost nothing on the
  // measure the player is judged by, within the window they have.
  const reform = rs.find(r => r.name === 'Reform, hard')!;
  const dh = (reform.headline / base.headline - 1) * 100;
  const dl = (reform.legacy / base.legacy - 1) * 100;
  console.log(`\nFive years of maximum structural reform buys:`);
  console.log(`  +${dh.toFixed(2)}% on the 2030 headline number  (the stated target)`);
  console.log(`  +${dl.toFixed(2)}% on potential growth          (what the country actually gets)`);
  console.log(dl > 4 * dh
    ? '\n>>> Legacy pays several times more than Headline. The lag tension is LIVE:\n' +
      '    the correct policy is nearly invisible on the scoreboard inside 19 turns.'
    : '\n>>> Reform pays off too visibly inside the window. Lags are too short.');

  const cap = rs.find(r => r.name === 'Capital push')!;
  console.log(`\nPublic capital push: +${((cap.headline / base.headline - 1) * 100).toFixed(2)}% headline, ` +
              `+${((cap.legacy / base.legacy - 1) * 100).toFixed(2)}% legacy, ` +
              `debt ${cap.debtGdp2030.toFixed(1)}% vs ${base.debtGdp2030.toFixed(1)}%.`);
  console.log('  (5-year gestation means almost nothing lands inside the window.)');

  console.log(`\nSpread across all strategies: headline ${(Math.max(...rs.map(r=>r.headline))-Math.min(...rs.map(r=>r.headline))).toFixed(0)} USD ` +
              `(${((Math.max(...rs.map(r=>r.headline))/Math.min(...rs.map(r=>r.headline))-1)*100).toFixed(1)}%), ` +
              `legacy ${(Math.max(...rs.map(r=>r.legacy))-Math.min(...rs.map(r=>r.legacy))).toFixed(2)}pp.`);
  const breaches = rs.filter(r => r.breachedCeiling).map(r => r.name);
  console.log(`\nBreached the 70% debt ceiling: ${breaches.length ? breaches.join(', ') : 'none'}`);
  console.log(`IMF baseline 9,092 vs model "do nothing" ${base.headline.toFixed(0)} — model is ${((base.headline/9092-1)*100).toFixed(1)}% below.`);
}
