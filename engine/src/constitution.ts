/**
 * The new constitution. A four-step track that runs beside the deck:
 *
 *   1. idle        → table the Section 256 amendment (joint sitting)
 *   2. principles  → set a position on each part; each changed clause is voted
 *                    on, then the package goes to the second referendum
 *   3. drafting    → the drafting assembly works for a few quarters
 *   4. final       → call the final referendum; if it passes, it is ratified
 *
 * Steps 1, 2 and 4 each cost one action. Pure functions only: the host keeps
 * the state and applies the consequences.
 *
 * Support is counted clause by clause from party stances. Being in the
 * coalition helps only a little: People's backs a reformist clause from
 * opposition, and Kla Tham resists one from inside government.
 */

export interface Position {
  id: string; score: number; label: string; text: string;
  effects?: Record<string, number>;
  opinion?: Record<string, number>;
  sets?: string[];
  listSeats?: number;
  /** Singapore-lite: strengthens the state rather than opening it. */
  sgLite?: boolean;
  /** Multi-member, winner-takes-all slates at the next election. */
  blockVote?: boolean;
  /** Flags that must all be set for `effects` to apply in full. */
  competentIf?: string[];
  /** Applied instead of `effects` when `competentIf` is not met. */
  withoutEffects?: Record<string, number>;
}
export interface Part {
  id: string; name: string; bjtWeight: number;
  positions: Position[];
  keepIndex?: number;
  stances: Record<string, number[]>;
  proposal?: { party: string; position: string };
}
export interface ConstitutionCfg {
  parts: Part[];
  s256: { stances: Record<string, number> };
  backbench: { warning: number; revolt: number };
  draftingQuarters: number;
  electoralDeadlineQuarter: number;
}

export type Stage = 'idle' | 'principles' | 'drafting' | 'final' | 'ratified' | 'failed';

export interface ConstitutionState {
  stage: Stage;
  /** Selected position index per part, while the principles are being set. */
  draft: Record<string, number>;
  /** What survived the joint sitting and went to the country. */
  adopted?: Record<string, number>;
  draftingUntil?: number;
  ratifiedQuarter?: number;
  principlesYes?: number;
  finalYes?: number;
  /** Clauses that failed in the joint sitting, for the record. */
  struck?: string[];
  /** Only one constitutional step per quarter. */
  lastActQuarter?: number;
}

export const keepIndex = (p: Part) => p.keepIndex ?? 0;

export function initialConstitution(cfg: ConstitutionCfg): ConstitutionState {
  const draft: Record<string, number> = {};
  for (const p of cfg.parts) draft[p.id] = keepIndex(p);
  return { stage: 'idle', draft };
}

const PARTIES = ["People's", 'Pheu Thai', 'Kla Tham', 'Democrat', 'Others'];
const JOINT_MAJORITY = 351, SENATE_THIRD = 67;

export interface Whip {
  seats: Record<string, number>;
  coalition: string[];
  /** 'Others' opinion stands in for the establishment, and so for the Senate. */
  othersOpinion: number;
}

/** Share of a party voting yes, from its stance. Coalition partners add +0.5. */
function yesShare(stance: number, inGov: boolean): number {
  const eff = stance + (inGov ? 0.5 : 0);
  return Math.max(0.03, Math.min(1, 0.55 + 0.25 * eff));
}

/** Senators voting yes. The 2024 Senate leans toward Bhumjaithai (base 110, not 100). */
function senateYes(stance: number, othersOpinion: number): number {
  return Math.round(Math.max(0, Math.min(200, 110 + 40 * stance + (othersOpinion - 50) * 0.8)));
}

export interface Tally {
  house: number; senate: number; passes: boolean;
  /** Parties with a majority of their members voting yes. */
  backers: string[];
}

export function tally(stances: Record<string, number>, w: Whip): Tally {
  let house = w.seats['Bhumjaithai'] ?? 0;
  const backers = ['Bhumjaithai'];
  for (const p of PARTIES) {
    const share = yesShare(stances[p] ?? 0, w.coalition.includes(p));
    house += Math.round((w.seats[p] ?? 0) * share);
    if (share >= 0.5) backers.push(p);
  }
  const senate = senateYes(stances['Senate'] ?? 0, w.othersOpinion);
  if (senate >= 100) backers.push('Senate');
  return { house, senate, backers, passes: house + senate >= JOINT_MAJORITY && senate >= SENATE_THIRD };
}

export function clauseStances(part: Part, pos: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(part.stances)) out[k] = v[pos];
  return out;
}

export function tallyClause(part: Part, pos: number, w: Whip): Tally {
  return tally(clauseStances(part, pos), w);
}

/** Reform score of a package, -1 to 10. */
export function reformScore(cfg: ConstitutionCfg, pkg: Record<string, number>): number {
  return cfg.parts.reduce((a, p) => a + p.positions[pkg[p.id]].score, 0);
}

/** How much Bhumjaithai's own members can stomach. Senate and Court count double. */
export function backbenchPressure(cfg: ConstitutionCfg, pkg: Record<string, number>): number {
  return cfg.parts.reduce((a, p) => a + p.positions[pkg[p.id]].score * p.bjtWeight, 0);
}

/** Projected yes share in a referendum. Starts from the February result;
 *  a package too timid to be worth the trouble loses reformist voters. */
export function referendumYes(cfg: ConstitutionCfg, pkg: Record<string, number>, approval: number): number {
  const s = reformScore(cfg, pkg);
  const sg = sgCount(cfg, pkg);
  let yes = 52 + (approval - 50) * 0.3 + Math.min(Math.max(s, 0), 6) * 1.5;
  // Too timid to be worth the trouble. A Singapore-lite package is not timid,
  // just pointed the other way, and pays its own price below.
  if (s < 2 && sg === 0) yes -= 5;
  yes -= 2 * sg;
  return Math.round(Math.max(20, Math.min(80, yes)) * 10) / 10;
}

/** Party-list seats the package sets, 100 if unchanged. */
export function listSeats(cfg: ConstitutionCfg, pkg: Record<string, number>): number {
  const p = cfg.parts.find(x => x.id === 'electoral');
  return (p && p.positions[pkg[p.id]].listSeats) || 100;
}

/** How many Singapore-lite positions the package takes. */
export function sgCount(cfg: ConstitutionCfg, pkg: Record<string, number>): number {
  return cfg.parts.filter(p => p.positions[pkg[p.id]].sgLite).length;
}

/** True if the package moves to multi-member, winner-takes-all constituencies. */
export function blockVote(cfg: ConstitutionCfg, pkg: Record<string, number>): boolean {
  return cfg.parts.some(p => p.positions[pkg[p.id]].blockVote);
}
