

/** Capital stock, labour and TFP, calibrated in scripts/supply.py.
 *  Perpetual inventory on real GFCF, 5%/yr depreciation, capital share 0.45. */
export interface Supply {
  alpha: number; delta_quarterly: number; periods: string[];
  K: number[]; L: number[]; TFP: number[];
  potential_pf: number[]; gap_pf: number[];
}

