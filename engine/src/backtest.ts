/**
 * Conditional backtest, 134 quarters.
 *
 * Exogenous variables (world demand, global activity, energy prices, the policy
 * rate, the REER, the fiscal ratio) are fed from history. The model must then
 * reproduce the ENDOGENOUS series: the output gap, core and headline inflation,
 * exports, imports and private investment.
 *
 * This is the standard test for a semi-structural model and it is the gate in
 * DESIGN §16 step 2. Note that per MODEL.md §1 several parameters cannot be
 * identified from the panel and are fitted here (see params.ts FREE), which
 * weakens the gate for those specific coefficients. Everything estimated is
 * locked at its measured value.
 */
import { loadPanel, col, type Panel } from './panel.js';
import { step } from './engine.js';
import { BASE, PROVENANCE, FREE } from './params.js';
import type { Params, State, Exog, Policy } from './types.js';

const n = (v: number | null | undefined, d = 0) => (v == null || Number.isNaN(v) ? d : v);

import { loadSupply } from './loaders.js';
const SUPPLY = loadSupply();
const supplyAt = (i: number, k: 'K' | 'L' | 'TFP') => SUPPLY[k][i] ?? 0;

export interface Series { name: string; actual: number[]; fitted: number[]; }
export interface Result {
  periods: string[];
  series: Series[];
  rmse: Record<string, number>;
  correlation: Record<string, number>;
  hitRateSign: Record<string, number>;
  loss: number;
}

/** Build a State from panel row i. Used to seed, and to anchor y/y bases. */
function stateAt(p: Panel, i: number): State {
  const g = (c: string, d = 0) => n(col(p, c)[i], d);
  return {
    period: p.periods[i],
    gap: g('gap'),
    rgdp: g('rgdp_sa'),
    potential: g('rgdp_sa') / (1 + g('gap') / 100),
    capital: supplyAt(i, 'K'),
    labour: supplyAt(i, 'L'),
    tfp: supplyAt(i, 'TFP'),
    potentialGrowthYoy: 0,
    infraPipeline: [], reformStock: 0,
    exportsR: g('exp_r'),
    importsR: g('imp_r'),
    invPrivR: g('gfcf_priv_r'),
    invRate: g('gfcf_priv_n') / g('ngdp') * 100,
    invPubR: g('gfcf_pub_r'),
    consR: g('cons_r'),
    cpi: g('cpi'),
    cpiCore: g('cpi_core'),
    cpiYoy: g('cpi_yoy'),
    cpiCoreYoy: g('cpi_core_yoy'),
    policyRate: g('policy_rate'),
    realRate: g('real_rate_cpi'),
    reer: g('reer'),
    hhDebt: g('hh_debt', 85),
    debtGdp: 60, primaryBalance: 0, riskPremium: 0,
    capitalSpend: g('gfcf_pub_n') / g('ngdp') * 100,
    govConsumption: g('govc_n') / g('ngdp') * 100,
    transfers: 0,
    taxRate: 21,
  };
}

export function runBacktest(
  params: Params = BASE,
  start = '1994Q1',
  end = '2026Q2',
): Result {
  const p = loadPanel();
  const i0 = p.periods.indexOf(start);
  const i1 = p.periods.indexOf(end);

  const energy = col(p, 'cpi_rawfood_energy');
  const usImp = col(p, 'us_imports_r');
  const igrea = col(p, 'igrea');
  const rr = col(p, 'real_rate_cpi');

  // pre-smoothed real rate: mean of lags 1..4, the distributed lag in DESIGN §5.3
  const rrSmooth = p.periods.map((_, i) => {
    if (i < 4) return 0;
    let s = 0, k = 0;
    for (let j = i - 4; j < i; j++) { const v = rr[j]; if (v != null) { s += v; k++; } }
    return k ? s / k : 0;
  });

  const actualByPeriod = (c: string) => col(p, c);
  const hist: State[] = p.periods.map((_, i) => stateAt(p, i));

  const periods: string[] = [];
  const out: Record<string, { a: number[]; f: number[] }> = {
    gap: { a: [], f: [] },
    cpiCoreYoy: { a: [], f: [] },
    cpiYoy: { a: [], f: [] },
    expGrowth: { a: [], f: [] },
    impGrowth: { a: [], f: [] },
    invRate: { a: [], f: [] },
  };

  for (let i = i0; i < i1; i++) {
    // One-step-ahead: state at t comes from HISTORY, prediction is for t+1.
    // This isolates equation error from error accumulation.
    const s = hist[i];
    const prev = { ...hist[i - 1], realRate: rrSmooth[i] } as State;
    const lag4 = hist[i - 4];

    const exog: Exog = {
      worldDemandGrowth: pctYoy(usImp, i),
      globalActivity: n(igrea[i]),
      energyInflation: pctYoy(energy, i),
      shock: 0,
    };
    const nx = hist[i + 1];
    const policy: Policy = {
      policyRate: n(col(p, 'policy_rate')[i + 1], s.policyRate),
      reer: n(col(p, 'reer')[i + 1], s.reer),
      capitalSpend: nx ? nx.capitalSpend : s.capitalSpend,
      govConsumption: nx ? nx.govConsumption : s.govConsumption,
      transfers: 0,
      taxRate: 21,
      reformIndex: 0,
    };

    const next = step({ state: s, prev, lag4, exog, policy, params });
    const a = hist[i + 1];
    if (!a) break;

    periods.push(a.period);
    push(out.gap, a.gap, next.gap);
    push(out.cpiCoreYoy, a.cpiCoreYoy, next.cpiCoreYoy);
    push(out.cpiYoy, a.cpiYoy, next.cpiYoy);
    push(out.expGrowth, pctYoyState(hist, i + 1, 'exportsR'), pct(next.exportsR, hist[i - 3].exportsR));
    push(out.impGrowth, pctYoyState(hist, i + 1, 'importsR'), pct(next.importsR, hist[i - 3].importsR));
    push(out.invRate, a.invRate, next.invRate);
  }

  const series: Series[] = Object.entries(out).map(([name, v]) => ({
    name, actual: v.a, fitted: v.f,
  }));
  const rmse: Record<string, number> = {};
  const correlation: Record<string, number> = {};
  const hitRateSign: Record<string, number> = {};
  for (const s of series) {
    rmse[s.name] = rootMse(s.actual, s.fitted);
    correlation[s.name] = corr(s.actual, s.fitted);
    hitRateSign[s.name] = signAgreement(s.actual, s.fitted);
  }
  // Loss weights the two series the design cares most about.
  const loss =
    2.0 * rmse.gap + 2.0 * rmse.cpiCoreYoy + 1.0 * rmse.cpiYoy +
    0.5 * rmse.expGrowth + 0.5 * rmse.impGrowth + 1.0 * rmse.invRate;

  return { periods, series, rmse, correlation, hitRateSign, loss };

  function push(o: { a: number[]; f: number[] }, a: number, f: number) {
    if (Number.isFinite(a) && Number.isFinite(f)) { o.a.push(a); o.f.push(f); }
  }
  function pctYoy(c: (number | null)[], i: number) {
    const a = c[i], b = c[i - 4];
    return a != null && b != null && b !== 0 ? (a / b - 1) * 100 : 0;
  }
  function pctYoyState(h: State[], i: number, k: keyof State) {
    const a = h[i][k] as number, b = h[i - 4][k] as number;
    return b ? (a / b - 1) * 100 : NaN;
  }
  function pct(a: number, b: number) { return b ? (a / b - 1) * 100 : NaN; }
}

function rootMse(a: number[], f: number[]) {
  let s = 0; for (let i = 0; i < a.length; i++) s += (a[i] - f[i]) ** 2;
  return Math.sqrt(s / a.length);
}
function corr(a: number[], f: number[]) {
  const m = (x: number[]) => x.reduce((s, v) => s + v, 0) / x.length;
  const ma = m(a), mf = m(f);
  let num = 0, da = 0, df = 0;
  for (let i = 0; i < a.length; i++) {
    num += (a[i] - ma) * (f[i] - mf); da += (a[i] - ma) ** 2; df += (f[i] - mf) ** 2;
  }
  return num / Math.sqrt(da * df);
}
function signAgreement(a: number[], f: number[]) {
  let ok = 0; for (let i = 0; i < a.length; i++) if (Math.sign(a[i]) === Math.sign(f[i])) ok++;
  return ok / a.length;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = runBacktest();
  console.log('=== BACKTEST (baseline parameters, unfitted) ===');
  console.log(`quarters: ${r.periods.length}   ${r.periods[0]} -> ${r.periods.at(-1)}\n`);
  console.log('series          RMSE     corr   sign-agree');
  for (const s of r.series) {
    console.log(
      `  ${s.name.padEnd(14)}${r.rmse[s.name].toFixed(3).padStart(7)}` +
      `${r.correlation[s.name].toFixed(3).padStart(9)}` +
      `${(r.hitRateSign[s.name] * 100).toFixed(0).padStart(9)}%`);
  }
  console.log(`\nloss: ${r.loss.toFixed(4)}`);
  console.log('\nparameter provenance:');
  const byS: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(PROVENANCE)) (byS[v] ||= []).push(k);
  for (const [k, v] of Object.entries(byS)) console.log(`  ${k.padEnd(10)} ${v.length}: ${v.join(', ')}`);
  console.log(`\nfree (fitted by calibrate.ts): ${FREE.join(', ')}`);
}
