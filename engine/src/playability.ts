import type { Params } from './types.js';


export interface Playability {
  gains: {
    fiscal: number; monetary: number;
    reformToInvestment: number; reformToTfp: number;
    infraTfp: number; crowdingOut: number; gapToOutput: number;
  };
  gestation: { infraQuarters: number };
}


/**
 * Apply playability gains to an estimated parameter set.
 *
 * This is the ONLY place realism is traded for playability. The underlying
 * parameters keep their measured values and their provenance; this function
 * scales the channels the player acts through so decisions are visible inside
 * a term. Passing gains of 1.0 returns the estimated model unchanged, which is
 * what the backtest and simulation harnesses do.
 */
export function applyGains(p: Params, pl: Playability): Params {
  const g = pl.gains;
  return {
    ...p,
    multCapital: p.multCapital * g.fiscal,
    multGovCons: p.multGovCons * g.fiscal,
    multTransfer: p.multTransfer * g.fiscal,
    multTax: p.multTax * g.fiscal,
    isRealRate: p.isRealRate * g.monetary,
    invRateRealRate: p.invRateRealRate * g.monetary,
    reformToInvestment: p.reformToInvestment * g.reformToInvestment,
    reformToTfp: p.reformToTfp * g.reformToTfp,
    infraTfpBonus: p.infraTfpBonus * g.infraTfp,
    invRateCrowding: p.invRateCrowding * g.crowdingOut,
    infraGestation: pl.gestation.infraQuarters,
  };
}
