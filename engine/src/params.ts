import type { Params, ParamSource } from './types.js';

/** Provenance for every parameter. See MODEL.md.
 *  'estimated' — measured on the panel, identified.
 *  'fitted'    — NOT identifiable from data (policy endogeneity, MODEL.md §1);
 *                chosen to minimise backtest error. PROVISIONAL. Replace with
 *                literature values (BOT working papers, IMF Article IV).
 *  'prior'     — set from standard priors, not fitted, not estimated.
 */
export const PROVENANCE: Record<keyof Params, ParamSource> = {
  gapPersistence: 'estimated',
  isWorldDemand: 'estimated',
  isGlobalActivity: 'estimated',
  isRealRate: 'literature',
  debtImpairThreshold: 'literature',
  debtImpairSlope: 'literature',
  debtImpairFloor: 'literature',
  multCapital: 'literature',
  multGovCons: 'literature',
  multTransfer: 'literature',
  multTax: 'literature',
  crowdingOut: 'literature',
  executionCapital: 'fitted',
  executionOther: 'fitted',

  corePersistence: 'estimated',
  coreGap: 'estimated',
  coreFx: 'estimated',
  coreEnergy: 'estimated',
  headlinePersistence: 'estimated',
  headlineGap: 'estimated',
  headlineFx: 'estimated',
  headlineEnergy: 'estimated',

  coreConst: 'estimated',
  headlineConst: 'estimated',
  expConst: 'estimated',
  expWorldDemand: 'estimated',
  expGlobalActivity: 'estimated',
  expReer: 'fitted',
  impConst: 'estimated',
  impWorldDemand: 'estimated',
  impDomestic: 'fitted',

  invRateConst: 'estimated',
  invRatePersistence: 'estimated',
  invRateGap: 'estimated',
  invRateRealRate: 'estimated',
  invRateReer: 'fitted',
  invRateCrowding: 'literature',

  consConst: 'fitted',
  consGap: 'fitted',
  consHhDebt: 'estimated',

  alpha: 'estimated',
  depreciation: 'prior',
  tfpTrendGrowth: 'estimated',
  labourGrowth: 'estimated',
  infraGestation: 'literature',
  infraTfpBonus: 'prior',
  infraBaselineShare: 'estimated',
  debtCeiling: 'literature',
  effectiveInterestRate: 'estimated',
  riskFreeDebt: 'prior',
  riskSlope: 'prior',
  riskExponent: 'prior',
  riskToInvestment: 'prior',
  reformAdoption: 'prior',
  reformDecay: 'prior',
  reformToInvestment: 'prior',
  fdiToInvestment: 'prior',
  savingsToInvestment: 'prior',
  humanCapitalToTfp: 'prior',
  formalisationToRevenue: 'prior',
  reformToTfp: 'prior',
  potentialGrowth: 'prior',
};

/** The free parameters — those the backtest is allowed to fit. */
/** NOTE: executionCapital/executionOther were removed from FREE deliberately.
 *  An unconstrained fit drives both to their lower bounds, implying effective
 *  multipliers around 0.20 — below the published aggregate range. That is very
 *  likely the SAME endogeneity as MODEL.md §1: governments spend into weakness,
 *  which biases any fitted fiscal response toward zero. Fitting them would repeat
 *  the mistake the sign bounds exist to prevent, so they are set by judgement:
 *  Thailand's chronic capital-budget under-disbursement is well documented, and
 *  0.50/0.70 puts effective multipliers at 0.34/0.33, inside the reported band.
 *  The backtest fit is worse for it. That is the correct trade. */
export const FREE: (keyof Params)[] = [
  'expReer', 'impDomestic', 'invRateReer', 'consGap',
  'expConst', 'impConst', 'consConst',
];

/** Baseline. Estimated values are locked; fitted values start at priors. */
export const BASE: Params = {
  // IS — persistence and world demand from estimate.py
  gapPersistence: 0.485,
  isWorldDemand: 0.072,
  isGlobalActivity: 0.0023,

  // --- monetary transmission (LITERATURE.md §2)
  // Interest rate + bank lending channels are >50% of transmission (BIS).
  // Unimpaired elasticity for a small open economy; the impairment factor below
  // cuts the effective value roughly in half at current household debt.
  isRealRate: -0.22,
  debtImpairThreshold: 70,   // % of GDP, below which transmission is unimpaired
  debtImpairSlope: 0.020,    // fraction of transmission lost per pp above it
  debtImpairFloor: 0.45,     // transmission never falls below 45% of nominal

  // --- fiscal multipliers by instrument (LITERATURE.md §1). Midpoints of the
  // published ranges. These replace the single `isFiscal` scalar, which could
  // not represent a system where capital spend is ~3x transfers.
  multCapital: 0.675,        // BOT / BOTMM, range 0.50-0.85
  multGovCons: 0.465,        // BOT / Thammasat BVAR 2025, range 0.18-0.75
  multTransfer: 0.30,        // BOT MPR 2023-24, range 0.20-0.40
  multTax: -1.125,           // Econ TU BVAR 2025, range -0.70 to -1.55
  crowdingOut: 0.35,         // govt consumption displaces private investment

  // Execution wedge. 0.675 capital multiplier x ~0.5 execution ~= 0.34 effective,
  // inside the 0.25-0.49 aggregate band the same sources report.
  executionCapital: 0.50,
  executionOther: 0.70,

  // Phillips — from phillips.py, core equation R2=0.957
  corePersistence: 0.859,
  coreGap: 0.042,
  coreFx: -0.032,
  coreEnergy: 0.055,
  headlinePersistence: 0.481,
  headlineGap: 0.017,
  headlineFx: -0.030,
  headlineEnergy: 0.240,
  coreConst: -0.043,
  headlineConst: 0.172,

  // trade — from trade.py
  expConst: 2.1249,
  expWorldDemand: 0.854,
  expGlobalActivity: 0.043,
  expReer: -0.0995,         // FITTED (not significant in data)
  impConst: 0.0389,
  impWorldDemand: 1.154,
  impDomestic: 0.5476,      // FITTED

  // investment
  // investment rate, partial adjustment. R2=0.427, signs correct unconstrained.
  // Long-run attractor = 7.442 / (1 - 0.584) = 17.9% of GDP.
  invRateConst: 7.442,
  invRatePersistence: 0.584,
  invRateGap: 0.124,
  invRateRealRate: -0.138,
  invRateReer: 0.05,        // FITTED, AT BOUND
  invRateCrowding: -0.35,   // crowding-out of private investment by govt consumption

  // consumption
  consConst: -2.6951,
  consGap: 0.7876,          // FITTED
  consHhDebt: -0.213,

  // --- supply side, calibrated in scripts/supply.py
  // K/Y fell from 6.12 (1995) to 3.58 (2025) — the capital deepening of the
  // boom was never rebuilt. Production-function potential growth decayed from
  // 4.12%/yr in the 2000s to 2.76% in the 2010s to 1.51% in the 2020s.
  alpha: 0.45,
  depreciation: 0.0127,     // 5%/yr
  tfpTrendGrowth: 0.52,     // ~2.1%/yr, the 2022-26 residual average
  labourGrowth: -0.09,      // ~-0.35%/yr, working-age population decline
  infraGestation: 20,       // 5 years, midpoint of the 3-7 year range
  infraTfpBonus: 0.010,
  infraBaselineShare: 6.1,
  debtCeiling: 70,
  effectiveInterestRate: 2.6,
  // Risk premium. Nothing below 68% of GDP; ~0.5pp at 75%, ~1.6pp at 85%.
  // Non-linear by design — the player is not told where it starts biting.
  riskFreeDebt: 68,
  riskSlope: 0.011,
  riskExponent: 1.75,
  riskToInvestment: 0.9,

  // Structural reform. All four are PRIORS — no Thai estimate exists for the
  // reform-to-investment elasticity, and this is the most consequential
  // unmeasured relationship in the model. Scaled so that sustained maximum
  // reform lifts the investment rate by ~4pp of GDP over five years, which is
  // roughly a quarter of the way back to the 1996 level.
  reformAdoption: 0.06,
  reformDecay: 0.015,
  reformToInvestment: 0.0022,
  // FDI is roughly a fifth of Thai gross fixed capital formation, so a
  // sustained improvement in the investment climate shows up in the rate
  // directly rather than only through the reform stock.
  // Persistence in the investment rate is 0.584, so any additive term here is
  // multiplied by ~2.4 in the long run. Calibrated so that a strong FDI term —
  // Pax Silica plus the data-centre guarantee plus OECD, about 0.6 of stance —
  // is worth roughly half a point of investment rate, not eight.
  fdiToInvestment: 0.22,
  savingsToInvestment: 0.15,
  // Skills raise TFP growth, not its level, and slowly: a full point of
  // human-capital stock buys about a tenth of a point of annual TFP growth.
  humanCapitalToTfp: 0.015,
  // Formalisation is revenue without a rate rise — the collection dividend.
  formalisationToRevenue: 0.6,
  reformToTfp: 0.00035,
  potentialGrowth: 0.38,
};

/** Economically admissible bounds for the fitted parameters.
 *
 *  WHY THIS EXISTS: an unconstrained fit to the backtest drives isRealRate to
 *  +0.11 and isFiscal to -0.02 — i.e. it reproduces exactly the reaction-function
 *  signs that MODEL.md §1 identified as endogeneity artefacts. Fitting to the
 *  same data cannot escape the same simultaneity. An engine with those signs
 *  would tell the player that raising rates stimulates output, which is not a
 *  calibration imperfection but an inverted economy.
 *
 *  So theory bounds the sign and rough magnitude; the backtest picks the value
 *  within that range. These are the standard signs, not Thai-specific estimates.
 */
export const BOUNDS: Partial<Record<keyof Params, [number, number]>> = {
  invRateReer: [-0.30,  0.05],   // appreciation does not boost tradables capex
  executionCapital: [0.30, 1.00],
  executionOther:   [0.50, 1.00],
  expReer:     [-0.60,  0.00],   // appreciation does not raise exports
  impDomestic: [ 0.10,  1.50],
  consGap:     [ 0.00,  1.00],
  expConst:    [-5, 10], impConst: [-5, 10],
  consConst: [-5, 10],
};

export function clampFree(x: number[]): number[] {
  return FREE.map((k, i) => {
    const b = BOUNDS[k];
    return b ? Math.min(b[1], Math.max(b[0], x[i])) : x[i];
  });
}

export function withFree(base: Params, free: number[]): Params {
  const p = { ...base };
  FREE.forEach((k, i) => { (p[k] as number) = free[i]; });
  return p;
}

export function freeOf(p: Params): number[] {
  return FREE.map(k => p[k] as number);
}
