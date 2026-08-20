import type { State, StepInput, Params } from './types.js';

/** Year-on-year percent change given levels at t and t-4. */
const yoy = (now: number, back: number) => (now / back - 1) * 100;

/**
 * Advance the model one quarter.
 *
 * PURE: no I/O, no randomness, no mutation of inputs. Given identical inputs it
 * returns an identical State. This is what makes the engine testable, replayable
 * and backtestable (DESIGN §13).
 *
 * Note the sign conventions: `gap` is in percentage points of potential; all
 * inflation terms are y/y percent; `reer` up = real appreciation.
 */
export function step(input: StepInput): State {
  const { state: s, prev, lag4, exog, policy, params: p } = input;

  // ---- exchange rate: an OUTCOME, never a lever (DESIGN §3.4).
  // In backtest mode it is fed from data via policy.reer.
  const reer = policy.reer;
  const dReer4 = yoy(reer, lag4.reer);

  // ---- real interest rate, using headline inflation
  const realRate = policy.policyRate - s.cpiYoy;

  // ---- monetary transmission, impaired by household debt.
  // The bank lending channel is the dominant one (>50% of transmission, BIS),
  // and at 87.5% of GDP Thai household debt bottlenecks it: banks tighten
  // standards against bad loans, so cuts do not become credit growth.
  const impairment = debtImpairment(s.hhDebt, p);
  const effectiveRateResponse = p.isRealRate * impairment;

  // ---- fiscal impulse, decomposed by instrument.
  // A single multiplier cannot represent Thai fiscal policy: capital spending
  // is roughly three times as potent as transfers, and tax changes are stronger
  // still in the other direction (LITERATURE.md §1).
  // Impulses are YEAR-ON-YEAR changes in each instrument's GDP share. The
  // underlying NESDC fiscal series are 'original', not seasonally adjusted, so
  // a quarter-on-quarter difference is mostly seasonality, not policy.
  const fiscalImpulse =
    p.multCapital  * p.executionCapital * (policy.capitalSpend   - lag4.capitalSpend) +
    p.multGovCons  * p.executionOther    * (policy.govConsumption - lag4.govConsumption) +
    p.multTransfer * p.executionOther    * (policy.transfers      - lag4.transfers) +
    p.multTax      * (policy.taxRate        - lag4.taxRate);

  const gap =
    p.gapPersistence * s.gap +
    effectiveRateResponse * prev.realRate +
    fiscalImpulse +
    p.isWorldDemand * exog.worldDemandGrowth +
    p.isGlobalActivity * exog.globalActivity +
    exog.shock;

  // ---- SUPPLY SIDE. Y_pot = TFP · K^alpha · L^(1-alpha).
  //
  // This is where the game's long horizon lives. Investment made this quarter
  // becomes capital, capital becomes potential output, and potential output at
  // the END of the run is the Legacy score (DESIGN §3.2). Public infrastructure
  // is delayed further by a gestation pipeline, which is precisely why the
  // correct decision frequently loses inside twenty turns.

  // private investment converts to capital immediately; public capex queues
  const privInvest = (s.invRate / 100) * s.rgdp;
  const newPublic  = (policy.capitalSpend / 100) * s.rgdp;

  const pipeline = [...s.infraPipeline, newPublic];
  let delivered = 0;
  if (pipeline.length > p.infraGestation) delivered = pipeline.shift()!;

  const capital = (1 - p.depreciation) * s.capital + privInvest + delivered;

  // labour from demographics — exogenous and declining, and no five-year policy
  // can reverse it (DESIGN §5.5)
  const labour = s.labour * (1 + p.labourGrowth / 100);

  // TFP grows at trend, with a bonus from the infrastructure capital that has
  // actually landed rather than from what was merely budgeted
  // only infrastructure ABOVE the baseline programme earns a TFP bonus —
  // otherwise every strategy inherits the same free productivity boost
  const infraShare = Math.max(0,
    delivered / Math.max(s.rgdp, 1) * 100 - p.infraBaselineShare);
  const tfp = s.tfp * (1 +
    (p.tfpTrendGrowth + p.infraTfpBonus * infraShare + p.reformToTfp * s.reformStock
     + p.humanCapitalToTfp * (policy.humanCapital ?? 0)) / 100);

  const potential = tfp * Math.pow(capital, p.alpha) * Math.pow(labour, 1 - p.alpha);
  const potentialGrowthYoy = (potential / lag4.potential - 1) * 100;
  const rgdp = potential * (1 + gap / 100);

  // ---- Phillips. Core is the anchored process; headline adds energy.
  const coreYoy =
    p.coreConst +
    p.corePersistence * s.cpiCoreYoy +
    p.coreGap * s.gap +
    p.coreFx * dReer4 +
    p.coreEnergy * exog.energyInflation;

  const cpiYoy =
    p.headlineConst +
    p.headlinePersistence * s.cpiYoy +
    p.headlineGap * s.gap +
    p.headlineFx * dReer4 +
    p.headlineEnergy * exog.energyInflation;

  const cpi = lag4.cpi * (1 + cpiYoy / 100);
  const cpiCore = lag4.cpiCore * (1 + coreYoy / 100);

  // ---- trade. World demand dominates; the REER term is small and provisional.
  const expGrowth =
    p.expConst +
    p.expWorldDemand * exog.worldDemandGrowth +
    p.expGlobalActivity * exog.globalActivity +
    p.expReer * dReer4;
  const exportsR = lag4.exportsR * (1 + expGrowth / 100);

  const impGrowth =
    p.impConst +
    p.impWorldDemand * exog.worldDemandGrowth +
    p.impDomestic * s.gap;
  const importsR = lag4.importsR * (1 + impGrowth / 100);

  // ---- investment. The variable the whole game turns on (CALIBRATION §9.1).
  // Modelled as a RATE with partial adjustment toward a target set by the cycle,
  // the real rate and the exchange rate. Long-run attractor ~17.9% of GDP; the
  // 1996 level was 31.2%, and closing any of that gap is the game's real problem.
  // Government consumption crowds out private investment over the medium term
  // (BOT / Thammasat BVAR) — so a government that buys growth through the
  // consumption line is spending the game's central variable to do it.
  // reform stock: effort accumulates slowly and decays if abandoned
  const reformStock =
    (1 - p.reformDecay) * s.reformStock + p.reformAdoption * policy.reformIndex;

  // sovereign risk premium on last quarter's debt stock
  const riskPremium = riskPremiumOf(s.debtGdp, p);

  const invRate =
    p.invRateConst +
    p.riskToInvestment * -riskPremium +
    p.reformToInvestment * reformStock +
    p.invRatePersistence * s.invRate +
    p.invRateGap * s.gap +
    p.invRateRealRate * prev.realRate * impairment +
    p.invRateReer * dReer4 +
    p.invRateCrowding * (policy.govConsumption - lag4.govConsumption) +
    p.fdiToInvestment * (policy.fdiSignal ?? 0) +
    p.savingsToInvestment * (policy.savingsRate ?? 0) +
    (exog.investmentShock ?? 0);
  const invPrivR = s.invPrivR * (invRate / (s.invRate || invRate));
  const invPubR = s.invPubR * (1 + (policy.publicInvestmentGrowth ?? 0) / 100);

  // ---- consumption, with the household-debt deleveraging damper
  const dHhDebt4 = s.hhDebt - lag4.hhDebt;
  const consGrowth = p.consConst + p.consGap * s.gap + p.consHhDebt * dHhDebt4;
  const consR = lag4.consR * (1 + consGrowth / 100);

  // ---- debt. The binding constraint: Thailand starts at 64.7% against a 70%
  // ceiling, and the do-nothing baseline reaches 69.5% by 2030 unaided
  // (CALIBRATION.md §1.4). Every spending decision is drawn against ~5pp.
  // Formalisation is revenue you did not have to legislate a rate for: the
  // collection side of a tax package, and the reason a negative income tax that
  // brings households into the system is not purely a cost.
  const revenue = policy.taxRate + p.formalisationToRevenue * (policy.formalisation ?? 0);
  const primaryBalance =
    revenue - policy.capitalSpend - policy.govConsumption - policy.transfers;
  const nominalGrowthQ = (potentialGrowthYoy + cpiYoy) / 4;
  const debtGdp =
    s.debtGdp * (1 + ((p.effectiveInterestRate + riskPremium) / 4 - nominalGrowthQ) / 100)
    - primaryBalance / 4;

  return {
    period: nextPeriod(s.period),
    primaryBalance, riskPremium, 
    gap, rgdp, potential,
    capital, labour, tfp, potentialGrowthYoy, infraPipeline: pipeline, reformStock,
    exportsR, importsR, invPrivR, invPubR, consR, invRate,
    cpi, cpiCore, cpiYoy, cpiCoreYoy: coreYoy,
    policyRate: policy.policyRate,
    realRate,
    reer,
    hhDebt: s.hhDebt,
    debtGdp,
    capitalSpend: policy.capitalSpend,
    govConsumption: policy.govConsumption,
    transfers: policy.transfers,
    taxRate: policy.taxRate,
  };
}

/**
 * How much of nominal monetary transmission survives, given household debt.
 * Returns 1.0 when debt is at or below the threshold, falling linearly to a
 * floor. At Thailand's current 87.5% of GDP this returns ~0.65.
 */
export function debtImpairment(hhDebt: number, p: Params): number {
  const excess = Math.max(0, hhDebt - p.debtImpairThreshold);
  return Math.max(p.debtImpairFloor, 1 - p.debtImpairSlope * excess);
}

/**
 * Sovereign risk premium, in percentage points over the base borrowing rate.
 * Zero up to `riskFreeDebt`, then convex. At 75% of GDP this is roughly half a
 * point; at 85% roughly a point and a half — which compounds into the debt
 * stock AND raises the real rate private investment faces.
 */
export function riskPremiumOf(debtGdp: number, p: Params): number {
  const excess = Math.max(0, debtGdp - p.riskFreeDebt);
  return p.riskSlope * Math.pow(excess, p.riskExponent);
}

export function nextPeriod(period: string): string {
  const y = parseInt(period.slice(0, 4), 10);
  const q = parseInt(period.slice(5), 10);
  return q === 4 ? `${y + 1}Q1` : `${y}Q${q + 1}`;
}
