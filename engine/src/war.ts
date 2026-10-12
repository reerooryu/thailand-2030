/**
 * The Cambodian war and occupation. Deterministic: no dice anywhere.
 *
 * Opens from the revanchist branch of the MOU 2544 event and runs beside the
 * deck. Each quarter the player sets two stances:
 *
 *   war:            ceasefire | hold | limited | full
 *   reconstruction: aid | martial | crackdown
 *
 * The three 1941 provinces each have an occupation level (0-100) and, once
 * entered, a dissent level (0-100). The war ends when all three reach 100.
 * Afterwards dissent falls or rises with the reconstruction stance, and the
 * annexation bill unlocks below 10% dissent.
 *
 * Pure functions only. The host applies the economic and political effects.
 */

export type WarStance = 'ceasefire' | 'hold' | 'limited' | 'full';
export type ReconStance = 'aid' | 'martial' | 'crackdown';
export const PROVINCES = ['phra_tabong', 'phibunsongkhram', 'nakhon_champassak'] as const;
export type ProvId = typeof PROVINCES[number];

export interface Front { occ: number; dissent: number; entered: boolean }
export interface WarState {
  stage: 'none' | 'war' | 'won';
  stance: WarStance;
  recon: ReconStance;
  fronts: Record<ProvId, Front>;
  startQuarter?: number;
  wonQuarter?: number;
  quartersAtWar: number;
  fullStreak: number;
  /** Built up by crackdowns; adds to dissent growth and fades slowly. */
  resentment: number;
  thaiCasualties: number;
  khmerCasualties: number;
  displaced: number;
  /** For Hearts and Minds: aid every quarter, dissent never at or above 40. */
  onlyAid: boolean;
  maxDissent: number;
}

/** How hard each front is. Phra Tabong is open rice plain beside Thai bases;
 *  Nakhon Champassak is the Dangrek escarpment, far from supply. */
const SPEED: Record<ProvId, number> = { phra_tabong: 1.0, phibunsongkhram: 0.75, nakhon_champassak: 0.55 };
const ADVANCE: Record<WarStance, number> = { ceasefire: 0, hold: 0, limited: 18, full: 40 };
/** Per quarter: Thai military casualties, Cambodian casualties, newly displaced. */
const LOSSES: Record<WarStance, [number, number, number]> = {
  ceasefire: [0, 0, 0], hold: [60, 80, 5000], limited: [280, 450, 25000], full: [650, 1100, 60000],
};
export const START_DISSENT = 30;

export function initialWar(): WarState {
  const f = (): Front => ({ occ: 0, dissent: 0, entered: false });
  return { stage: 'none', stance: 'hold', recon: 'martial', quartersAtWar: 0, fullStreak: 0,
    fronts: { phra_tabong: f(), phibunsongkhram: f(), nakhon_champassak: f() },
    resentment: 0, thaiCasualties: 0, khmerCasualties: 0, displaced: 0, onlyAid: true, maxDissent: 0 };
}

export function startWar(w: WarState, quarter: number): WarState {
  return { ...w, stage: 'war', stance: 'limited', recon: 'martial', startQuarter: quarter };
}

/** China's position, read from the alignment tallies. A US-leaning Thailand
 *  finds Beijing arming Phnom Penh. */
export function chinaArming(alignUs: number, alignCn: number) { return alignUs > alignCn; }

export function avgDissent(w: WarState): number {
  const e = PROVINCES.filter(p => w.fronts[p].entered);
  return e.length ? e.reduce((a, p) => a + w.fronts[p].dissent, 0) / e.length : 0;
}

/** One quarter. Returns the new state and log lines. */
export function stepWar(w0: WarState, quarter: number, arming: boolean): { war: WarState; notes: string[] } {
  if (w0.stage === 'none') return { war: w0, notes: [] };
  const w: WarState = { ...w0, fronts: { ...w0.fronts } };
  const notes: string[] = [];
  const atWar = w.stage === 'war';
  if (atWar) {
    w.quartersAtWar++;
    w.fullStreak = w.stance === 'full' ? w.fullStreak + 1 : 0;
    const china = arming ? 0.5 : 1;
    const insurgent = avgDissent(w) > 50 ? 1.25 : 1;
    const [th, kh, dp] = LOSSES[w.stance];
    w.thaiCasualties += Math.round(th * (arming ? 1.5 : 1) * insurgent);
    w.khmerCasualties += Math.round(kh * (arming ? 1.3 : 1));
    w.displaced += dp;
    for (const p of PROVINCES) {
      const f = { ...w.fronts[p] };
      const gain = ADVANCE[w.stance] * SPEED[p] * china * (f.dissent > 50 ? 0.6 : 1);
      if (gain > 0 && f.occ < 100) {
        if (!f.entered) { f.entered = true; f.dissent = START_DISSENT; }
        f.occ = Math.min(100, f.occ + gain);
      }
      w.fronts[p] = f;
    }
  }
  // Dissent. During the war it creeps up the longer the fighting goes on;
  // after it, the reconstruction stance decides whether it falls.
  const r = w.recon;
  if (r !== 'aid' && PROVINCES.some(p => w.fronts[p].entered)) w.onlyAid = false;
  const base = atWar ? { aid: 0.5, martial: 3, crackdown: 3 }[r] : { aid: -7, martial: -3, crackdown: -3 }[r];
  const pressure = atWar && w.stance !== 'ceasefire' ? 0.25 * Math.min(w.quartersAtWar, 6) : 0;
  const hit = r === 'crackdown' ? -10 : 0;
  for (const p of PROVINCES) {
    const f = { ...w.fronts[p] };
    if (!f.entered) continue;
    f.dissent = Math.max(0, Math.min(100, f.dissent + base + pressure + w.resentment + hit));
    w.maxDissent = Math.max(w.maxDissent, f.dissent);
    w.fronts[p] = f;
  }
  w.resentment = r === 'crackdown' ? w.resentment + 3 : Math.max(0, w.resentment - 0.3);
  if (atWar && PROVINCES.every(p => w.fronts[p].occ >= 100)) {
    w.stage = 'won'; w.wonQuarter = quarter;
    notes.push('The army reaches the 1941 line in all three provinces. The fighting stops.');
  }
  return { war: w, notes };
}

/** Recurring cost of the current posture, as levels the host holds in the
 *  stance vector (the host applies the difference each quarter). */
export function warLevels(w: WarState): Record<string, number> {
  if (w.stage === 'none') return {};
  const g = w.stage === 'won' ? 0.15 : { ceasefire: 0.15, hold: 0.3, limited: 0.5, full: 0.9 }[w.stance];
  const recon = PROVINCES.some(p => w.fronts[p].entered) ? { aid: 0.5, martial: 0.1, crackdown: 0.1 }[w.recon] : 0;
  const fdi = w.stage === 'won' ? 0 : { ceasefire: -0.03, hold: -0.06, limited: -0.12, full: -0.25 }[w.stance];
  const set = w.stage === 'won' ? 0 : { ceasefire: 0, hold: -0.1, limited: -0.3, full: -0.6 }[w.stance];
  return { govConsumption: g + recon, fdiSignal: fdi + (w.recon === 'crackdown' ? -0.05 : 0), setSupport: set };
}

/** Approval per quarter of fighting: the rally fades, faster on full offensive. */
export function warApproval(w: WarState): number {
  if (w.stage !== 'war' || w.stance === 'ceasefire') return 0;
  return w.stance === 'full' ? (w.quartersAtWar > 4 ? -2.5 : -1.5) : -1;
}
