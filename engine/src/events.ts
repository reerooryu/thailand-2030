/**
 * Blocking news events.
 *
 * The distinction from policy cards is the point: a card can be ignored, an
 * event cannot. `pending` must be empty before the turn advances. This is how
 * consequences arrive — imposed, on someone else's timetable, usually because
 * of something you chose two quarters ago.
 */
import type { PolicyEffects } from './policies.js';


export type Trigger =
  | { type: 'afterOption'; card: string; option: string; inQuarters: number }
  | { type: 'flag'; flag: string; inQuarters?: number }
  | { type: 'threshold'; variable: string; above?: number; below?: number }
  | { type: 'hazard'; probabilityPerQuarter: number };

export interface EventOption {
  id: string; label: string; body?: string;
  requiresLegislation?: boolean;
  /** Shown for colour, never selectable. Some choices are not choices. */
  unavailable?: boolean;
  opinion?: Record<string, number>;
  effects?: PolicyEffects;
  sets?: string[]; clears?: string[];
  flavour?: string;
}
export interface GameEvent {
  id: string; headline: string; body: string;
  trigger: Trigger; blocking: boolean;
  /** Fires on this quarter of the run regardless of player action — the things
   *  that were already happening in 2026 and are inherited, not chosen. */
  scriptedQuarter?: number;
  options: EventOption[];
}


/** Deterministic PRNG so runs replay exactly (DESIGN §13). */
export function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export interface Scheduled { eventId: string; dueQuarter: number; because: string; }

/** Register any events a just-enacted option schedules. */
export function scheduleFrom(
  scheduled: Scheduled[],
  events: GameEvent[],
  cardId: string,
  optionId: string,
  quarter: number,
): Scheduled[] {
  const out = [...scheduled];
  for (const e of events) {
    const t = e.trigger;
    if (t.type === 'afterOption' && t.card === cardId && t.option === optionId) {
      out.push({ eventId: e.id, dueQuarter: quarter + t.inQuarters,
                 because: `${cardId}/${optionId}` });
    }
  }
  return out;
}

/** Everything that fires this quarter: scheduled chains, thresholds, hazards. */
export function due(
  events: GameEvent[],
  scheduled: Scheduled[],
  quarter: number,
  state: Record<string, number>,
  flags: Set<string>,
  rng: () => number,
  alreadyFired: Set<string>,
): { fired: GameEvent[]; remaining: Scheduled[] } {
  const fired: GameEvent[] = [];
  const remaining: Scheduled[] = [];

  for (const s of scheduled) {
    if (s.dueQuarter <= quarter) {
      const e = events.find(x => x.id === s.eventId);
      if (e && !alreadyFired.has(e.id)) fired.push(e);
    } else remaining.push(s);
  }

  for (const e of events) {
    if (alreadyFired.has(e.id) || fired.includes(e)) continue;
    if (e.scriptedQuarter != null) { if (e.scriptedQuarter === quarter) fired.push(e); continue; }
    const t = e.trigger;
    if (t.type === 'threshold') {
      const v = state[t.variable];
      if (v == null) continue;
      if ((t.above != null && v > t.above) || (t.below != null && v < t.below)) fired.push(e);
    } else if (t.type === 'hazard') {
      if (rng() < t.probabilityPerQuarter) fired.push(e);
    } else if (t.type === 'flag') {
      if (flags.has(t.flag)) fired.push(e);
    }
  }
  return { fired, remaining };
}

/** Apply a resolution: opinion moves, flags, and the effects vector. */
export function resolve(
  opinion: Record<string, number>,
  flags: Set<string>,
  option: EventOption,
) {
  const nextOpinion = { ...opinion };
  for (const [party, d] of Object.entries(option.opinion ?? {})) {
    nextOpinion[party] = Math.round(Math.max(0, Math.min(100, (nextOpinion[party] ?? 50) + d)));
  }
  const nextFlags = new Set(flags);
  for (const f of option.clears ?? []) nextFlags.delete(f);
  for (const f of option.sets ?? []) nextFlags.add(f);
  return { opinion: nextOpinion, flags: nextFlags, effects: option.effects ?? {} };
}
