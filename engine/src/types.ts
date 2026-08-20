/** Core state and I/O types. The engine is a pure function over these. */

/** Everything the model tracks. One object per quarter. */
export interface State {
  period: string;          // "2026Q2"

  // --- real block
  gap: number;             // output gap, % of potential
  rgdp: number;            // real GDP, mn baht, chain volume
  potential: number;       // potential output, mn baht

  // --- supply side (production function). This is what makes Legacy scoreable.
  capital: number;         // net capital stock, mn baht
  labour: number;          // working-age population, millions
  tfp: number;             // total factor productivity, index
  potentialGrowthYoy: number; // y/y % — THE Legacy score (DESIGN §3.2)
  reformStock: number;     // accumulated, depreciating reform effort
  infraPipeline: number[]; // public capex awaiting gestation, oldest first
  exportsR: number;        // real exports, mn baht
  importsR: number;        // real imports, mn baht
  invPrivR: number;        // real private GFCF, mn baht
  invRate: number;         // private GFCF, % of nominal GDP — the game's central variable
  invPubR: number;         // real public GFCF, mn baht
  consR: number;           // real private consumption, mn baht

  // --- nominal block
  cpi: number;             // headline CPI index, 2023=100
  cpiCore: number;         // core CPI index
  cpiYoy: number;          // headline y/y, %
  cpiCoreYoy: number;      // core y/y, %

  // --- financial
  policyRate: number;      // %
  realRate: number;        // policy rate less headline y/y
  reer: number;            // real broad effective exchange rate, 2020=100
  hhDebt: number;          // household credit, % of GDP

  // --- fiscal
  debtGdp: number;         // gross general govt debt, % of GDP
  primaryBalance: number;  // % of GDP, annualised
  riskPremium: number;     // pp over the base borrowing rate

  // --- fiscal stance by instrument, each % of GDP
  capitalSpend: number;
  govConsumption: number;
  transfers: number;
  taxRate: number;
}

/** Exogenous drivers. In a backtest these come from data; in a game they come
 *  from the world model and the shock deck. */
export interface Exog {
  worldDemandGrowth: number;   // US real imports, y/y %
  globalActivity: number;      // IGREA index level
  energyInflation: number;     // raw food & energy CPI, y/y %
  usPolicyRate?: number;
  shock: number;               // additive hit to the output gap, pp (disasters, crises)
  /** Additive hit to the private investment RATE, pp of GDP. Separate from the
   *  demand shock because financial crises collapse investment through balance
   *  sheets and credit, not through the output gap. The 1997-98 episode cannot
   *  be reproduced without this channel. */
  investmentShock?: number;
}

/** What the player (or, in a backtest, history) decides. */
export interface Policy {
  policyRate: number;          // set by BOT reaction function, or fed from data
  reer: number;                // FX is an outcome; fed from data in backtest mode

  /** Fiscal stance BY INSTRUMENT, each as % of GDP. The engine applies a
   *  different multiplier to each (see Params). This is what makes the annual
   *  budget screen (DESIGN §6.4) mean something. */
  capitalSpend: number;        // public investment
  govConsumption: number;
  transfers: number;
  taxRate: number;             // revenue, % of GDP

  /** Structural reform effort, index 0-100, 0 = the 2026 status quo.
   *  Business environment, competition policy, regulatory burden, informality,
   *  FDI openness. This is the ONLY lever with real leverage over the 2030
   *  target: fiscal spending moves the output gap, which is transient, while
   *  reform moves the private investment rate and TFP, which are levels. */
  reformIndex: number;

  /** Four channels that were previously accumulated by the policy layer and
   *  then thrown away — they reached the SET index in the browser build and
   *  nothing at all in the headless one. Wired here so that human capital,
   *  FDI, formalisation and saving actually do what every card that grants
   *  them claims they do. */
  fdiSignal?: number;        // foreign direct investment climate, index
  humanCapital?: number;     // skills and training stock, index
  formalisation?: number;    // share of activity pulled into the tax net
  savingsRate?: number;      // domestic saving available to fund investment

  publicInvestmentGrowth?: number;
}

/** Behavioural parameters. `source` records where each came from — this
 *  distinction matters, see MODEL.md section 1. */
export type ParamSource = 'estimated' | 'literature' | 'fitted' | 'identity' | 'prior';

export interface Params {
  // --- IS curve
  gapPersistence: number;      // estimated 0.485
  isWorldDemand: number;       // estimated 0.072
  isGlobalActivity: number;

  /** Monetary transmission. Literature, not estimable from the panel.
   *  Scaled down by the household-debt impairment factor below. */
  isRealRate: number;

  /** Household debt impairs the bank lending channel — the dominant channel,
   *  >50% of transmission (BIS). Above `debtImpairThreshold` the effective
   *  monetary response is scaled toward `debtImpairFloor`. */
  debtImpairThreshold: number;
  debtImpairSlope: number;
  debtImpairFloor: number;

  /** Fiscal multipliers by INSTRUMENT (Thai literature, see LITERATURE.md).
   *  A single scalar multiplier cannot represent Thai fiscal policy: capital
   *  spending is roughly three times as potent as transfers, and tax changes
   *  are stronger still in the other direction. */
  multCapital: number;         // 0.50-0.85
  multGovCons: number;         // 0.18-0.75
  multTransfer: number;        // 0.20-0.40
  multTax: number;             // -0.70 to -1.55

  /** Budget execution rate. Reconciles the two multiplier numbers in the Thai
   *  literature: instrument multipliers (capital 0.50-0.85) describe DISBURSED
   *  spending, while aggregate historical multipliers (0.25-0.49) describe
   *  BUDGETED spending. The wedge is chronic under-disbursement, which the
   *  sources name explicitly for capital projects. */
  executionCapital: number;
  executionOther: number;

  /** Government consumption crowds out private investment over the medium term
   *  (BOT / Thammasat BVAR). Enters the investment-rate equation. */
  crowdingOut: number;

  // --- Phillips (core), estimated on 487 months of CPI
  corePersistence: number;     // 0.859
  coreGap: number;             // 0.042
  coreFx: number;              // -0.032
  coreEnergy: number;          // 0.055
  // headline
  headlinePersistence: number; // 0.481
  headlineGap: number;         // 0.017
  headlineFx: number;          // -0.030
  headlineEnergy: number;      // 0.240

  coreConst: number;
  headlineConst: number;

  // --- trade, estimated with world demand controlled
  expConst: number;
  expWorldDemand: number;      // 0.854
  expGlobalActivity: number;   // 0.043
  expReer: number;             // -0.242, not significant
  impConst: number;
  impWorldDemand: number;      // 1.154
  impDomestic: number;

  // --- investment. Specified as a RATE with partial adjustment, not a growth
  // rate: private GFCF fell from 31.2% of GDP (1996) to 16.5% (2025) and never
  // recovered, and a growth specification cannot represent a level break.
  invRateConst: number;        // estimated 7.442
  invRatePersistence: number;  // estimated 0.584
  invRateGap: number;          // estimated 0.124
  invRateRealRate: number;     // estimated -0.138
  invRateReer: number;
  invRateCrowding: number;

  // --- consumption
  consConst: number;
  consGap: number;
  consHhDebt: number;          // -0.213 on 4q change in hh debt

  // --- household credit. The ratio is a STOCK over a denominator, so it falls
  // when nominal GDP outruns credit growth and rises when it does not. Both
  // halves matter: growing out of household debt is the only mechanism Thailand
  // has ever used, and it is why the impairment term is a policy variable
  // rather than a constant.
  hhCreditTrend: number;           // annual % credit growth at baseline
  hhCreditRealRate: number;        // pp of credit growth per pp of real rate
  transfersToHhCredit: number;     // transfers substituting for borrowing
  formalisationToHhCredit: number; // informal debt moving into cheaper formal credit

  // --- supply side
  /** Production function: Y_pot = TFP · K^alpha · L^(1-alpha) */
  alpha: number;               // capital share, 0.45
  depreciation: number;        // quarterly, 0.0127 = 5%/yr
  tfpTrendGrowth: number;      // quarterly %, baseline TFP growth
  labourGrowth: number;        // quarterly %, from demographics (negative)

  /** Public infrastructure does not become capacity on delivery. Spending enters
   *  a pipeline and is released into the capital stock over `infraGestation`
   *  quarters — DESIGN §5.3 puts this at 3-7 years, and it is the single most
   *  important lag in the game: it is why correct decisions lose inside the
   *  window (DESIGN §2, pillar 2). */
  infraGestation: number;      // quarters
  infraTfpBonus: number;       // extra TFP growth per pp of GDP of infra ABOVE baseline
  infraBaselineShare: number;  // the 2026 public capex share, 6.1% of GDP

  /** Debt accounting. Debt/GDP evolves with the primary balance and with r-g;
   *  crossing the ceiling is a run-ending failure state (DESIGN §3.1). */
  debtCeiling: number;         // 70% of GDP, statutory
  effectiveInterestRate: number; // %/yr on the stock, at zero risk premium

  /** Sovereign risk premium. Below `riskFreeDebt` the state borrows at the base
   *  rate. Above it the premium rises CONVEXLY, and it does two things at once:
   *  it raises the interest cost in the debt dynamic (so the stock compounds
   *  faster) and it raises the real rate facing private investment (so the
   *  crowding-out is real). Overshooting the ceiling is no longer free. */
  riskFreeDebt: number;
  riskSlope: number;
  riskExponent: number;
  riskToInvestment: number;

  /** Structural reform. Effort accumulates into a stock that decays if not
   *  maintained, and the stock raises both the private investment rate and TFP
   *  growth — with long lags. DESIGN §5.3 puts the TFP response at 2-5 years. */
  reformAdoption: number;      // fraction of effort entering the stock each quarter
  reformDecay: number;
  reformToInvestment: number;
  fdiToInvestment: number;
  savingsToInvestment: number;
  humanCapitalToTfp: number;
  formalisationToRevenue: number;  // pp of GDP on the investment rate, per stock unit
  reformToTfp: number;         // pp on quarterly TFP growth, per stock unit

  potentialGrowth: number;     // legacy trend fallback, unused once PF is on
}

export interface StepInput {
  state: State;
  prev: State;                 // t-1, for y/y and 4-quarter changes
  lag4: State;                 // t-4
  exog: Exog;
  policy: Policy;
  params: Params;
}
