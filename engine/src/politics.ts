/**
 * Political layer: coalition formation and parliamentary support.
 *
 * Opinion is 0-100 per party, banded. Support for a bill is opinion plus
 * ideological fit, and passage needs 251 of 500. The 17 minor parties are merged
 * into "Others", whose opinion doubles as institutional support.
 */


export interface Band { min: number; max: number; label: string; note: string; }
export interface PartyCfg { seats: number; opinion: number; cohesion?: number;
  description?: string; short?: string;
  player?: boolean; institutional?: boolean; note?: string; }
export interface CrossbenchCfg {
  opinionFloor: number; opinionSaturation: number; baseRate: number;
  abstainMultiplier: number; redLineMultiplier: number; softOpposeMultiplier: number;
  cap?: number;
}
export interface CoalitionEffects {
  agricultureSupport?: number;
  reformCapacity?: number;      // multiplier on how much reform actually passes
  educationPush?: number;
  megaprojectCap?: number;      // max public capex, % of GDP
  stimulusCap?: number;         // max transfers, % of GDP
  executionBonus?: number;      // added to executionCapital
}
export interface CoalitionOption {
  id: string; name: string; seats: number; available: boolean;
  flavour: string; describe: string;
  opinion_delta: Record<string, number>;
  effects: CoalitionEffects;
}
export interface CoalitionCfg {
  bands: Band[];
  parties: Record<string, PartyCfg>;
  options: CoalitionOption[];
  crossbench?: CrossbenchCfg;
  seatColours?: Record<string, string>;
  _meta: { majority: number; house: number };
}


export function band(bands: Band[], opinion: number): Band {
  return bands.find(b => opinion >= b.min && opinion <= b.max) ?? bands[0];
}

export interface PoliticalState {
  opinion: Record<string, number>;
  coalition: string[];          // party names in government
  coalitionId: string;
  effects: CoalitionEffects;
  seats: Record<string, number>;
  cohesion: Record<string, number>;
  crossbench?: CrossbenchCfg;
}

/** Apply a coalition choice: seat it, and move everyone's opinion. */
export function formCoalition(cfg: CoalitionCfg, optionId: string): PoliticalState {
  const opt = cfg.options.find(o => o.id === optionId);
  if (!opt) throw new Error(`unknown coalition: ${optionId}`);
  if (!opt.available) throw new Error(`coalition not available: ${opt.name} - "${opt.flavour}"`);

  const opinion: Record<string, number> = {};
  const seats: Record<string, number> = {};
  for (const [k, v] of Object.entries(cfg.parties)) {
    opinion[k] = clamp(v.opinion + (opt.opinion_delta[k] ?? 0));
    seats[k] = v.seats;
  }
  // members of the government get a standing loyalty bonus
  const members = opt.name.split(' + ').map(s => s.trim())
    .map(s => s === 'Bhumjaithai' ? 'Bhumjaithai' : s);
  for (const m of members) if (opinion[m] != null && m !== 'Bhumjaithai') opinion[m] = clamp(opinion[m] + 8);

  const cohesion: Record<string, number> = {};
  for (const [k, v] of Object.entries(cfg.parties)) cohesion[k] = v.cohesion ?? 0.6;
  return { opinion, coalition: members, coalitionId: opt.id, effects: opt.effects,
           seats, cohesion, crossbench: cfg.crossbench };
}

const clamp = (x: number) => Math.max(0, Math.min(100, x));

/** How a party votes on a bill. `fit` is -1..+1 ideological alignment.
 *
 *  Fit is weighted heavily — 50 points across the range — because a party will
 *  not vote for something it exists to oppose merely because it likes you. This
 *  is what makes the coalition choice bind: a conservative government can be
 *  warm, comfortable and unable to pass structural reform. */
export function partySupport(opinion: number, fit: number, inGov: boolean): number {
  return clamp(opinion + fit * 50 + (inGov ? 6 : 0));
}

export interface VoteResult {
  yes: number; no: number; abstain: number;
  passed: boolean; margin: number;
  breakdown: Record<string, 'yes' | 'no' | 'abstain'>;
  /** Individual opposition members crossing the floor, by party. */
  defectors: Record<string, number>;
  defectorTotal: number;
  /** Whip count: per party, how they vote and what it would take to flip them.
   *  `needed` is the opinion at which the party would back it as a bloc, or null
   *  where an ideological red line makes opinion irrelevant. A defeat should say
   *  why it is a defeat — that is what a chief whip would know. */
  whip: { party: string; seats: number; stance: 'yes' | 'no' | 'abstain';
          opinion: number; needed: number | null; redLine: boolean }[];
}

/**
 * How many members of an opposing party cross the floor.
 *
 * Parties are not perfect blocs. A party on speaking terms with the government —
 * anything above Frigid — will lose a handful of members on any given bill, more
 * if it is loosely held together, fewer if the bill crosses a red line. The
 * numbers are deliberately small: a few seats, not a bloc. It exists so that a
 * four-vote defeat is winnable by a player who kept the opposition talking to
 * them, and unwinnable by one who did not.
 */
export function crossbenchDefectors(
  seats: number, opinion: number, fit: number, cohesion: number,
  stance: 'no' | 'abstain', cb?: CrossbenchCfg,
): number {
  if (!cb) return 0;
  if (opinion <= cb.opinionFloor) return 0;          // Frigid or Hostile: nobody moves
  const opinionFactor = Math.min(1,
    (opinion - cb.opinionFloor) / (cb.opinionSaturation - cb.opinionFloor));
  const fitFactor = fit <= -0.5 ? cb.redLineMultiplier
                  : fit <= -0.3 ? cb.softOpposeMultiplier : 1;
  const looseness = Math.max(0.15, Math.min(1, 1.3 - cohesion));
  const stanceMult = stance === 'abstain' ? cb.abstainMultiplier : 1;
  const rate = Math.min(cb.cap ?? 0.06,
    cb.baseRate * opinionFactor * fitFactor * looseness * stanceMult);
  return Math.round(seats * rate);
}

/** Run a bill through the House. Coalition members vote yes above 35 rather
 *  than 50 — being in government carries an obligation, up to a point. */
export function vote(
  ps: PoliticalState,
  fit: Record<string, number>,
  majority = 251,
): VoteResult {
  let yes = 0, no = 0, abstain = 0;
  const breakdown: Record<string, 'yes' | 'no' | 'abstain'> = {};
  const defectors: Record<string, number> = {};
  const cross = (seats: number, party: string, f: number, stance: 'no' | 'abstain') => {
    const d = crossbenchDefectors(seats, ps.opinion[party], f,
      ps.cohesion?.[party] ?? 0.6, stance, ps.crossbench);
    if (d > 0) defectors[party] = d;
    return d;
  };
  for (const [party, seats] of Object.entries(ps.seats)) {
    if (party === 'Bhumjaithai') { yes += seats; breakdown[party] = 'yes'; continue; }
    const inGov = ps.coalition.includes(party);
    const f = fit[party] ?? 0;

    // RED LINES. Below -0.5 a party opposes regardless of how warm it feels
    // toward you, and between -0.5 and -0.3 the most it will offer is an
    // abstention. Coalition membership does not buy a vote against a party's
    // reason for existing — which is what makes the coalition choice bind
    // rather than merely tint the numbers.
    if (f <= -0.5) {
      const d = cross(seats, party, f, 'no');
      yes += d; no += seats - d; breakdown[party] = 'no'; continue;
    }
    if (f <= -0.3) {
      const d = cross(seats, party, f, 'abstain');
      yes += d; abstain += seats - d; breakdown[party] = 'abstain'; continue;
    }

    const s = partySupport(ps.opinion[party], f, inGov);
    const threshold = inGov ? 50 : 60;
    if (s >= threshold) { yes += seats; breakdown[party] = 'yes'; }
    else if (s >= threshold - 15) {
      const d = cross(seats, party, f, 'abstain');
      yes += d; abstain += seats - d; breakdown[party] = 'abstain';
    } else {
      const d = cross(seats, party, f, 'no');
      yes += d; no += seats - d; breakdown[party] = 'no';
    }
  }
  const defectorTotal = Object.values(defectors).reduce((a, b) => a + b, 0);
  const whip = Object.entries(ps.seats)
    .filter(([p]) => p !== 'Bhumjaithai')
    .map(([party, seats]) => {
      const f = fit[party] ?? 0;
      const inGov = ps.coalition.includes(party);
      const redLine = f <= -0.3;
      const threshold = inGov ? 50 : 60;
      const needed = redLine ? null
        : Math.max(0, Math.ceil(threshold - f * 50 - (inGov ? 6 : 0)));
      return { party, seats, stance: breakdown[party], opinion: ps.opinion[party],
               needed, redLine };
    })
    .sort((a2, b2) => b2.seats - a2.seats);
  return { yes, no, abstain, passed: yes >= majority, margin: yes - majority,
           breakdown, defectors, defectorTotal, whip };
}
