/**
 * Policy cards: catalogue, parliamentary passage, and translation into engine
 * inputs. Schema is DESIGN.md section 10.2-10.3.
 *
 * A card option is a vector over channels the engine already understands. The
 * player reads plain language; the engine reads numbers. Nothing enters the
 * deck unless its channel vector can be stated.
 */
import { vote, type PoliticalState } from './politics.js';


export interface PolicyEffects {
  capitalSpend?: number;      // % of GDP added to public investment
  govConsumption?: number;    // % of GDP
  transfers?: number;         // % of GDP
  taxRate?: number;           // % of GDP, negative = revenue forgone
  reformIndex?: number;       // 0-100 added to the reform effort
  executionBonus?: number;    // added to executionCapital
  fdiSignal?: number;
  humanCapital?: number;
  formalisation?: number;
  savingsRate?: number;
  setSupport?: number;
  approvalBoost?: number;
  institutionalSupport?: number;
}
export interface PolicyOption {
  id: string; label: string;
  requiresLegislation?: boolean;
  /** Flags this option sets or clears. Cancelling a megaproject prunes its
   *  branch and frequently opens another — DESIGN §10.3. */
  sets?: string[];
  clears?: string[];
  /** One reform gating another. If `flag` is unset, effects scale by
   *  `withoutFactor` — so Super Licence half-works without digital government,
   *  and civil service reform loses its execution gain entirely. */
  dependsOn?: { flag: string; withoutFactor: number; note?: string };
  /** HARD prerequisite — the option is locked until every flag is set. This is
   *  the tech tree: Digital Government → Civil Service Reform, Super Licence →
   *  OECD accession, VAT Reform → Negative Income Tax. */
  requiresFlags?: string[];
  lockedNote?: string;
  /** Shown for colour, never selectable. Some choices are not choices. */
  unavailable?: boolean;
  /** The unhedged version of this card — full funding, full scope, no pilot and
   *  no phase-in. Exactly one option per card carries it. It is never the safe
   *  choice: maximal options cost more, whip harder, and lose votes. Nothing in
   *  the engine reads this; it exists so the end screen can tell the difference
   *  between a government that chose and one that split the difference. */
  maximal?: boolean;
  returnsInQuarters?: number;
  effects: PolicyEffects;
  lag?: Record<string, number | boolean | string>;
  fit: Record<string, number>;
  flavour?: string;
}
/** A bill you did not choose to table. Coalition partners have manifestos of
 *  their own, and the price of their votes is that some of those manifestos
 *  reach the floor. A proposal that is enacted buys goodwill with the party
 *  that made it; one left to expire costs rather more, because being ignored
 *  in public is the thing junior partners cannot survive. */
export interface Proposal {
  party: string;          // who is asking — may be a party inside 'Others'
  bloc: string;           // whose opinion actually moves
  colour: string;
  note: string;           // shown under the card name
  expiresAfter: number;   // quarters on the desk before the offer lapses
  onPass: Record<string, number>;
  onIgnore: Record<string, number>;
}

export interface PolicyCard {
  id: string; name: string; ministry: string; type: string;
  proposal?: Proposal;
  /** Card appears on this quarter of the run and not before. */
  scriptedQuarter?: number;
  /** Flags that must all be set for this card to be in the deck at all. */
  requires?: string[];
  briefing: string; options: PolicyOption[];
}
export interface PolicyCatalogue {
  _meta: Record<string, unknown>;
  policies: PolicyCard[];
}

/** Cards whose `requires` are satisfied by the current flag set. */
export function availableCards(
  cat: PolicyCatalogue, flags: Set<string>, quarter = 99,
  coalition?: string[],
): PolicyCard[] {
  return cat.policies.filter(c =>
    (c.requires ?? []).every(f => flags.has(f)) &&
    (c.scriptedQuarter == null || quarter >= c.scriptedQuarter) &&
    // A partner's bill only reaches your desk if the partner is IN the
    // government. Pheu Thai does not hand its manifesto to a cabinet it is not
    // sitting in — its bills go to the opposition benches instead, where they
    // are a critique rather than a proposal. Omitting `coalition` (the agenda
    // tools, the flag audit) shows every card regardless.
    (!c.proposal || !coalition || coalition.includes(c.proposal.bloc)));
}

/** Apply an enacted option's flag changes. Order matters: clears then sets, so
 *  an option can retire its own precondition and open a successor in one move. */
export function applyFlags(flags: Set<string>, option: PolicyOption): Set<string> {
  const next = new Set(flags);
  for (const f of option.clears ?? []) next.delete(f);
  for (const f of option.sets ?? []) next.add(f);
  return next;
}

export function initialFlags(cat: PolicyCatalogue): Set<string> {
  return new Set((cat._meta.initial_flags as string[]) ?? []);
}


export interface Enacted { card: PolicyCard; option: PolicyOption; }

/** Put an option to the House if it needs legislation. Executive action passes
 *  automatically — routing around parliament is a real and valuable category
 *  (DESIGN §9.4). */
/** Is this option unlocked given the current flags? */
export function isUnlocked(option: PolicyOption, flags: Set<string>): boolean {
  if (option.unavailable) return false;
  return (option.requiresFlags ?? []).every(f => flags.has(f));
}

export function attempt(ps: PoliticalState, card: PolicyCard, optionId: string) {
  const option = card.options.find(o => o.id === optionId);
  if (!option) throw new Error(`${card.id}: no option ${optionId}`);
  if (!option.requiresLegislation) {
    return { option, passed: true, result: null, executive: true as const };
  }
  const v = vote(ps, option.fit);
  return { option, passed: v.passed, result: v, executive: false as const };
}

/** Effects after applying any unmet dependency discount. */
export function effectiveEffects(option: PolicyOption, flags: Set<string>): PolicyEffects {
  const d = option.dependsOn;
  if (!d || flags.has(d.flag)) return option.effects;
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(option.effects)) out[k] = (v as number) * d.withoutFactor;
  return out as PolicyEffects;
}

/** Fold everything enacted into a single fiscal and reform stance. */
export function aggregate(enacted: Enacted[]) {
  const t: Required<PolicyEffects> = {
    capitalSpend: 0, govConsumption: 0, transfers: 0, taxRate: 0, reformIndex: 0,
    executionBonus: 0, fdiSignal: 0, humanCapital: 0, formalisation: 0,
    savingsRate: 0, setSupport: 0, approvalBoost: 0, institutionalSupport: 0,
  };
  for (const { option } of enacted) {
    for (const [k, v] of Object.entries(option.effects)) {
      (t as Record<string, number>)[k] += v as number;
    }
  }
  // reform effort is capped: a government can only push so many fights at once
  t.reformIndex = Math.min(100, t.reformIndex);
  return t;
}


/** Proposals whose window closes on this quarter and which were never enacted.
 *  `enacted` is the flag each proposal sets when it passes. */
export function lapsedProposals(cat: PolicyCatalogue, quarter: number, flags: Set<string>,
                                coalition?: string[]) {
  return cat.policies.filter(c =>
    c.proposal && (!coalition || coalition.includes(c.proposal.bloc)) &&
    c.scriptedQuarter != null &&
    quarter === c.scriptedQuarter + c.proposal.expiresAfter &&
    !c.options.some(o => (o.sets ?? []).some(f => flags.has(f))));
}
