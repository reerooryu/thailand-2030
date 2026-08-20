/**
 * FULL DYNAMIC SIMULATION — the hard test.
 *
 * Unlike backtest.ts, the model is not re-anchored to history each quarter.
 * It is seeded with four quarters of actuals and then runs forward on its own
 * output for 125 quarters, fed only exogenous drivers (world demand, global
 * activity, energy prices, the policy rate, the REER, the fiscal stance).
 *
 * Every error compounds. A model that looks fine one-step-ahead can drift to
 * nonsense here, and that is exactly what needs to be known before the engine
 * is trusted to run a 19-turn game forward from 2026.
 */
import { loadPanel, col, type Panel } from './panel.js';
import { loadShocks, loadSupply } from './loaders.js';
import { step } from './engine.js';
import { BASE } from './params.js';
import type { Params, State, Exog, Policy } from './types.js';

const n = (v: number | null | undefined, d = 0) => (v == null || Number.isNaN(v) ? d : v);

const SUPPLY = loadSupply();
const supplyAt = (i: number, k: 'K' | 'L' | 'TFP') => SUPPLY[k][i] ?? 0;

/** Identified historical shocks. See config/shocks.json for provenance. */

export interface SimResult {
  periods: string[];
  sim: State[];
  act: State[];
  drift: Record<string, { rmse: number; finalError: number; maxAbsError: number; bias?: number; corr?: number }>;
  diverged: boolean;
  divergedAt?: string;
}

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
    exportsR: g('exp_r'), importsR: g('imp_r'),
    invPrivR: g('gfcf_priv_r'), invPubR: g('gfcf_pub_r'), consR: g('cons_r'),
    invRate: g('gfcf_priv_n') / g('ngdp') * 100,
    cpi: g('cpi'), cpiCore: g('cpi_core'),
    cpiYoy: g('cpi_yoy'), cpiCoreYoy: g('cpi_core_yoy'),
    policyRate: g('policy_rate'), realRate: g('real_rate_cpi'),
    reer: g('reer'), hhDebt: g('hh_debt', 85), debtGdp: 60, primaryBalance: 0, riskPremium: 0,
    capitalSpend: g('gfcf_pub_n') / g('ngdp') * 100,
    govConsumption: g('govc_n') / g('ngdp') * 100,
    transfers: 0, taxRate: 21,
  };
}

export function simulate(
  params: Params = BASE,
  start = '1995Q1',
  end = '2026Q2',
  useShocks = true,
): SimResult {
  const shocks = useShocks ? loadShocks() : { gap: {}, inv: {} };
  const p = loadPanel();
  const i0 = p.periods.indexOf(start);
  const i1 = p.periods.indexOf(end);

  const energy = col(p, 'cpi_rawfood_energy');
  const usImp = col(p, 'us_imports_r');
  const igrea = col(p, 'igrea');
  const rr = col(p, 'real_rate_cpi');
  const rrSmooth = p.periods.map((_, i) => {
    if (i < 4) return 0;
    let s = 0, k = 0;
    for (let j = i - 4; j < i; j++) { const v = rr[j]; if (v != null) { s += v; k++; } }
    return k ? s / k : 0;
  });
  const pctYoy = (c: (number | null)[], i: number) => {
    const a = c[i], b = c[i - 4];
    return a != null && b != null && b !== 0 ? (a / b - 1) * 100 : 0;
  };

  // seed: four quarters of actuals so the y/y bases exist
  const sim: State[] = [];
  for (let k = 4; k >= 1; k--) {
    const st = stateAt(p, i0 - k);
    for (const [key, v] of Object.entries(st)) {
      if (typeof v === 'number' && !Number.isFinite(v)) {
        throw new Error(`seed ${st.period}: ${key} not finite - start the simulation later`);
      }
    }
    sim.push(st);
  }

  const periods: string[] = [];
  const act: State[] = [];
  let diverged = false, divergedAt: string | undefined;

  for (let i = i0; i < i1; i++) {
    const h = sim.length;
    const s = sim[h - 1];
    const lag4 = sim[h - 4];
    // the real rate the model faces uses SIMULATED inflation, not actual
    const simRr = sim.slice(-4).reduce((a, v) => a + (v.policyRate - v.cpiYoy), 0) / 4;
    const prev = { ...sim[h - 2], realRate: simRr } as State;

    const exog: Exog = {
      worldDemandGrowth: pctYoy(usImp, i),
      globalActivity: n(igrea[i]),
      energyInflation: pctYoy(energy, i),
      shock: shocks.gap[p.periods[i + 1]] ?? 0,
      investmentShock: shocks.inv[p.periods[i + 1]] ?? 0,
    };
    const a = stateAt(p, i + 1);
    const policy: Policy = {
      policyRate: n(col(p, 'policy_rate')[i + 1], s.policyRate),
      reer: n(col(p, 'reer')[i + 1], s.reer),
      capitalSpend: a.capitalSpend,
      govConsumption: a.govConsumption,
      transfers: 0, taxRate: 21, reformIndex: 0,
    };

    const next = step({ state: s, prev, lag4, exog, policy, params });
    sim.push(next);
    periods.push(next.period);
    act.push(a);

    if (!diverged && (!Number.isFinite(next.gap) || Math.abs(next.gap) > 50 ||
                      !Number.isFinite(next.cpiYoy) || Math.abs(next.cpiYoy) > 50)) {
      diverged = true; divergedAt = next.period;
    }
  }

  const simOut = sim.slice(4);
  const keys: (keyof State)[] = ['gap', 'cpiYoy', 'cpiCoreYoy', 'invRate'];
  const corrOf = (k: keyof State) => {
    const a = act.map(v => v[k] as number), b = simOut.map(v => v[k] as number);
    const m = (x: number[]) => x.reduce((s2, v) => s2 + v, 0) / x.length;
    const ma = m(a), mb = m(b);
    let num = 0, da = 0, db = 0;
    for (let j = 0; j < a.length; j++) {
      num += (a[j] - ma) * (b[j] - mb); da += (a[j] - ma) ** 2; db += (b[j] - mb) ** 2;
    }
    return num / Math.sqrt(da * db);
  };
  const drift: SimResult['drift'] = {};
  for (const k of keys) {
    const errs = simOut.map((v, j) => (v[k] as number) - (act[j][k] as number))
                       .filter(Number.isFinite);
    drift[k as string] = errs.length ? {
      rmse: Math.sqrt(errs.reduce((a, e) => a + e * e, 0) / errs.length),
      finalError: errs.at(-1)!,
      maxAbsError: Math.max(...errs.map(Math.abs)),
    } : { rmse: NaN, finalError: NaN, maxAbsError: NaN };
    (drift[k as string] as any).bias = errs.reduce((a2, e) => a2 + e, 0) / errs.length;
    (drift[k as string] as any).corr = corrOf(k);
  }
  return { periods, sim: simOut, act, drift, diverged, divergedAt };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = simulate();
  console.log('=== FULL DYNAMIC SIMULATION ===');
  console.log(`${r.periods.length} quarters, ${r.periods[0]} -> ${r.periods.at(-1)}`);
  console.log(`diverged: ${r.diverged ? `YES at ${r.divergedAt}` : 'no'}\n`);
  console.log('variable        drift RMSE      bias       corr   max |err|');
  for (const [k, v] of Object.entries(r.drift)) {
    console.log(`  ${k.padEnd(14)}${v.rmse.toFixed(3).padStart(10)}` +
                `${(v.bias ?? NaN).toFixed(3).padStart(10)}` +
                `${(v.corr ?? NaN).toFixed(3).padStart(11)}` +
                `${v.maxAbsError.toFixed(3).padStart(12)}`);
  }
  console.log('\nselected quarters (sim vs actual):');
  console.log('period    gap sim/act        CPI sim/act       invRate sim/act');
  const marks = ['1997Q3','1998Q4','2001Q1','2009Q1','2011Q4','2015Q1','2020Q2','2021Q4','2024Q1','2026Q2'];
  for (const m of marks) {
    const j = r.periods.indexOf(m);
    if (j < 0) continue;
    const s = r.sim[j], a = r.act[j];
    console.log(`${m}  ${s.gap.toFixed(1).padStart(6)}/${a.gap.toFixed(1).padStart(6)}` +
                `   ${s.cpiYoy.toFixed(1).padStart(7)}/${a.cpiYoy.toFixed(1).padStart(6)}` +
                `   ${s.invRate.toFixed(1).padStart(7)}/${a.invRate.toFixed(1).padStart(6)}`);
  }
}
