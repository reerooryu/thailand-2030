/**
 * Sovereign credit ratings: S&P, Moody's and Fitch.
 *
 * Thailand starts at BBB+ / Baa1 / BBB+ and the game bounds every agency to
 * four notches: A- (one up) to BBB- (two down, the last investment grade).
 *
 * Deterministic, no RNG. Each quarter a single target notch is computed from
 * the fiscal record. An agency whose rating differs from the target first moves
 * its outlook, and only acts if the gap persists for its review lag. Agencies
 * are slow to upgrade and slower still at Moody's, so the three drift apart for
 * a few quarters, which is what happens in practice.
 *
 * The cost is a premium added to the sovereign risk premium, and so to the
 * interest bill on the debt stock and the rate private investment faces.
 */

export const SP_SCALE = ['BBB-', 'BBB', 'BBB+', 'A-'];
export const MOODYS_SCALE = ['Baa3', 'Baa2', 'Baa1', 'A3'];
export const START_NOTCH = 2;      // BBB+ / Baa1
const MIN = 0, MAX = 3;

export type Outlook = -1 | 0 | 1;

export interface Agency {
  name: "S&P" | "Moody's" | 'Fitch';
  notch: number;
  outlook: Outlook;
  /** Consecutive quarters the target has sat below (negative) or above
   *  (positive) the current rating. */
  pressure: number;
  /** Downgrade after lag+1 quarters of sustained pressure; upgrade after lag+3. */
  lag: number;
}

export function initialAgencies(): Agency[] {
  return [
    { name: 'S&P', notch: START_NOTCH, outlook: 0, pressure: 0, lag: 2 },
    { name: 'Fitch', notch: START_NOTCH, outlook: 0, pressure: 0, lag: 3 },
    { name: "Moody's", notch: START_NOTCH, outlook: 0, pressure: 0, lag: 4 },
  ];
}

export function label(a: Agency): string {
  return (a.name === "Moody's" ? MOODYS_SCALE : SP_SCALE)[a.notch];
}

export interface RatingInputs {
  debtGdp: number;
  ceiling: number;          // the ceiling in force
  primaryBalance: number;   // % of GDP
  realGrowthYoy: number;    // %
  reformStock: number;
  approval: number;
}

/** What the fiscal record currently justifies, in notches (0 = BBB-, 3 = A-). */
export function targetNotch(x: RatingInputs): number {
  let s = START_NOTCH;
  if (x.debtGdp > x.ceiling) s -= 1;                 // breaking your own rule
  s -= Math.max(0, x.ceiling - 70) / 8 * 0.5;        // moving it: -0.5 per 8 points
  if (x.debtGdp > 75) s -= 0.5;
  if (x.debtGdp > 82) s -= 1;
  if (x.debtGdp < 60) s += 0.5;
  if (x.primaryBalance < -6) s -= 1;
  else if (x.primaryBalance < -4) s -= 0.5;
  else if (x.primaryBalance > -1.5) s += 0.5;
  if (x.realGrowthYoy > 3.5) s += 0.5;
  else if (x.realGrowthYoy < 1) s -= 0.5;
  if (x.reformStock > 50) s += 0.5;
  if (x.approval < 35) s -= 0.5;
  return Math.max(MIN, Math.min(MAX, Math.round(s)));
}

/** One quarterly review. Returns the new agencies and any actions to report. */
export function review(agencies: Agency[], target: number): { agencies: Agency[]; actions: string[] } {
  const actions: string[] = [];
  const next = agencies.map(a0 => {
    const a = { ...a0 };
    const dir = Math.sign(target - a.notch);
    if (dir === 0) {
      if (a.outlook !== 0) actions.push(`${a.name} returns Thailand's outlook to stable at ${label(a)}.`);
      a.pressure = 0; a.outlook = 0;
      return a;
    }
    a.pressure = Math.sign(a.pressure) === dir ? a.pressure + dir : dir;
    // One quarter out of line is noise. The outlook moves on the second.
    if (a.outlook !== dir && Math.abs(a.pressure) >= 2) {
      a.outlook = dir as Outlook;
      actions.push(`${a.name} revises Thailand's outlook to ${dir < 0 ? 'negative' : 'positive'} at ${label(a)}.`);
    }
    const need = dir < 0 ? a.lag + 1 : a.lag + 3;
    if (Math.abs(a.pressure) >= need) {
      a.notch += dir;
      a.pressure = 0;
      a.outlook = Math.sign(target - a.notch) as Outlook;
      actions.push(dir < 0
        ? `${a.name} downgrades Thailand to ${label(a)}${a.notch === MIN ? ', one notch above junk' : ''}.`
        : `${a.name} upgrades Thailand to ${label(a)}.`);
    }
    return a;
  });
  return { agencies: next, actions };
}

/** Premium added to the sovereign risk premium, pp. Averaged across agencies:
 *  BBB+ costs nothing, BBB +0.25, BBB- +0.60, A- saves 0.15. */
export function ratingPremium(agencies: Agency[]): number {
  const per = (n: number) => n >= 3 ? -0.15 : n === 2 ? 0 : n === 1 ? 0.25 : 0.6;
  return agencies.reduce((a, x) => a + per(x.notch), 0) / agencies.length;
}
