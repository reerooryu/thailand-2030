/**
 * The EU–Thailand Free Trade Agreement.
 *
 * Starts where the real talks stood after the ninth round (June 2026): 15 of
 * 24 chapters closed, about 63%. Progress runs at a base pace, and domestic
 * reforms that answer an open chapter speed it up. At 100% the talks
 * conclude; ratification follows; then it enters into force and phases in.
 *
 * Effects once in force, per the Commerce Ministry's cited study (+1.28% GDP,
 * +2.8% exports, a permanent LEVEL gain): potential output rises by about
 * 1.28% over a five-year phase-in (a capped TFP gain, amplified by the capital
 * that follows it), exports rise 2.8%, and exporters ramping up give a small,
 * temporary lift to demand while access phases in.
 */

export interface FtaState {
  progress: number;                       // 0-100
  stage: 'negotiating' | 'ratifying' | 'in_force';
  ratifyUntil?: number;                   // quarter
  inForceQuarter?: number;
  applied: string[];                      // boosts already counted
}

export const FTA_START = 63;
export const FTA_BASE_PACE = 3;
export const FTA_RATIFY_QUARTERS = 6;
export const FTA_PHASE_IN = 20;          // five years, like a real tariff schedule

/** Reforms that close open chapters (+) or harden EU objections (−). */
export const FTA_MOVES: { key: string; points: number; chapter: string;
  test: (flags: Set<string>, maximal: Set<string>) => boolean }[] = [
  { key: 'super_licence', points: 8, chapter: 'services and investment',
    test: (f, m) => m.has('super_licence') && f.has('super_licence_done') },
  { key: 'digital', points: 6, chapter: 'digital trade', test: f => f.has('digital_government_mandated') },
  { key: 'oecd', points: 6, chapter: 'intellectual property', test: f => f.has('oecd_accelerating') },
  { key: 'procurement', points: 4, chapter: 'government procurement', test: f => f.has('anticorruption_enforcement') },
  { key: 'pdp_renewables', points: 4, chapter: 'energy and raw materials', test: f => f.has('pdp_renewables') },
  { key: 'pdp_mix', points: 2, chapter: 'energy and raw materials', test: f => f.has('pdp_domestic_mix') },
  { key: 'labour', points: 3, chapter: 'trade and sustainable development', test: f => f.has('migrants_regularised') },
  { key: 'paternal', points: -8, chapter: 'human rights clause', test: f => f.has('constitution_paternal') },
  { key: 'crackdown', points: -4, chapter: 'labour standards', test: f => f.has('migrant_crackdown') },
  { key: 'land_bridge', points: -3, chapter: 'sustainability', test: f => f.has('land_bridge_forced') },
];

export function initialFta(): FtaState {
  return { progress: FTA_START, stage: 'negotiating', applied: [] };
}

/** One quarter. Returns the new state and any log lines. Sets 'eu_fta_in_force'
 *  on the quarter it enters into force (the host passes the flag set). */
export function stepFta(s0: FtaState, quarter: number, flags: Set<string>, maximal: Set<string>):
    { fta: FtaState; notes: string[] } {
  const s: FtaState = { ...s0, applied: [...s0.applied] };
  const notes: string[] = [];
  // Moves count whenever they happen, including during ratification (the
  // European Parliament's consent vote reads the human rights record).
  for (const m of FTA_MOVES) {
    if (s.applied.includes(m.key) || !m.test(flags, maximal)) continue;
    s.applied.push(m.key);
    if (s.stage === 'negotiating') {
      s.progress = Math.max(0, Math.min(100, s.progress + m.points));
      notes.push(m.points > 0
        ? `EU FTA: the ${m.chapter} chapter moves forward (+${m.points}%)`
        : `EU FTA: talks stall over the ${m.chapter} (${m.points}%)`);
    } else if (s.stage === 'ratifying' && m.points < 0) {
      s.ratifyUntil = (s.ratifyUntil ?? quarter) + 2;
      notes.push(`EU FTA: the European Parliament delays its consent vote over the ${m.chapter}`);
    }
  }
  if (s.stage === 'negotiating') {
    s.progress = Math.min(100, s.progress + FTA_BASE_PACE);
    if (s.progress >= 100) {
      s.stage = 'ratifying';
      s.ratifyUntil = quarter + FTA_RATIFY_QUARTERS + (flags.has('constitution_paternal') ? 2 : 0);
      notes.push('EU FTA: negotiations concluded. Ratification begins.');
    }
  } else if (s.stage === 'ratifying' && quarter >= (s.ratifyUntil ?? 0)) {
    s.stage = 'in_force';
    s.inForceQuarter = quarter;
  }
  return { fta: s, notes };
}

/** 0 before entry into force, rising to 1 over the phase-in. */
export function tradeAccess(s: FtaState, quarter: number): number {
  if (s.stage !== 'in_force' || s.inForceQuarter == null) return 0;
  return Math.max(0, Math.min(1, (quarter - s.inForceQuarter + 1) / FTA_PHASE_IN));
}
