/**
 * Browser entry point. Re-implements the four fs-backed loaders against the
 * generated inline data, then re-exports the same Game class the headless
 * harnesses use — one engine, two hosts.
 */
import { DATA } from './gen/data.js';
import { step, nextPeriod, reformEffort } from './engine.js';
import { runElection } from './election.js';
import { evaluate as evaluateAchievements } from './achievements.js';
import { classify } from './ideology.js';
import { BASE } from './params.js';
import { formCoalition, band, type CoalitionCfg, type PoliticalState } from './politics.js';
import {
  availableCards, applyFlags, lapsedProposals, attempt, effectiveEffects, isUnlocked,
  type PolicyCatalogue, type PolicyCard, type PolicyEffects, type PolicyOption,
} from './policies.js';
import {
  scheduleFrom, due, resolve, makeRng,
  type GameEvent, type Scheduled,
} from './events.js';
import type { Params, State, Exog, Policy } from './types.js';

const cfg = DATA.coalitions as unknown as CoalitionCfg;
const cat = DATA.policies as unknown as PolicyCatalogue;
const events = DATA.events.events as unknown as GameEvent[];
const pl = DATA.playability as unknown as
  { gains: Record<string, number>; gestation: { infraQuarters: number } };

function gains(p: Params): Params {
  const g = pl.gains;
  return { ...p,
    multCapital: p.multCapital * g.fiscal, multGovCons: p.multGovCons * g.fiscal,
    multTransfer: p.multTransfer * g.fiscal, multTax: p.multTax * g.fiscal,
    isRealRate: p.isRealRate * g.monetary, invRateRealRate: p.invRateRealRate * g.monetary,
    reformToInvestment: p.reformToInvestment * g.reformToInvestment,
    reformToTfp: p.reformToTfp * g.reformToTfp,
    infraTfpBonus: p.infraTfpBonus * g.infraTfp,
    invRateCrowding: p.invRateCrowding * g.crowdingOut,
    infraGestation: pl.gestation.infraQuarters };
}

const BASELINE = { capitalSpend: 6.1, govConsumption: 16.7, transfers: 0, taxRate: 21.1 };
const n = (v: number | null | undefined, d = 0) => (v == null || Number.isNaN(v) ? d : v);

export interface Deferred { cardId: string; returnsAtQuarter: number; }
export interface LogEntry { quarter: number; kind: string; text: string; }

/** The IMF's 2030 projection is a forecast for a Thailand whose government does
 *  the ordinary things — which is exactly this model's passive path. Ours landed
 *  337 dollars below it, because the estimated trend growth here is slightly
 *  under the Fund's assumption. That made the comparison unwinnable by
 *  construction: a do-nothing term started 337 in the hole and no amount of good
 *  policy recovered it. This factor aligns the passive path with 9,092 so the
 *  baseline means what the end screen says it means. It scales every outcome
 *  equally and changes no ranking. */
const BASELINE_ALIGN = 1.0385;

export class BrowserGame {
  cfg = cfg; cat = cat; events = events;
  ps: PoliticalState;
  opinion: Record<string, number>;
  flags: Set<string>;
  quarter = 0;
  params: Params;
  stance: Record<string, number> = {
    capitalSpend: 0, govConsumption: 0, transfers: 0, taxRate: 0, reformIndex: 0,
    executionBonus: 0, fdiSignal: 0, humanCapital: 0, formalisation: 0,
    savingsRate: 0, setSupport: 0, approvalBoost: 0, institutionalSupport: 0,
  };
  approval = 48;
  /** Mutable — the ceiling event genuinely raises it. */
  debtCeiling = 70;
  set = 1621.62;
  /** Mean-reverting deviation of the SET from its nominal-GDP fundamental. */
  sentiment = 0;
  scheduled: Scheduled[] = [];
  deferred: Deferred[] = [];
  firedEvents = new Set<string>();
  playedCards = new Set<string>();
  /** Enacted cards split by whether the unhedged option was taken. Recorded at
   *  passage, not at selection: a maximal bill defeated on the floor is a
   *  government that tried, and the end screen does not count trying. */
  maximalPlays = new Set<string>();
  hedgedPlays = new Set<string>();
  /** Partner bills enacted at full scope, and the ones that reached the desk at
   *  all — the denominator has to be built as the term runs, because which
   *  partners bring bills depends on the coalition and on flags set along the
   *  way. */
  proposalsFull = new Set<string>();
  proposalsSeen = new Set<string>();
  /** Actions taken this quarter. A government cannot pass its whole programme
   *  in one sitting — cabinet time, drafting capacity and floor time are all
   *  finite. Three per quarter. */
  actionsThisTurn = 0;
  readonly actionCap = 3;
  pending: GameEvent[] = [];
  log: LogEntry[] = [];
  history: State[] = [];
  setHistory: number[] = [];
  private rng: () => number;

  /** The February 2026 result, frozen. `ps.seats` is the LIVE House and moves
   *  when members defect, so the original has to be kept or every comparison on
   *  the end screen silently rebases itself. */
  seats2026: Record<string, number>;

  constructor(coalitionId: string, seed = 20260201) {
    this.ps = formCoalition(cfg, coalitionId);
    this.seats2026 = { ...this.ps.seats };
    this.opinion = { ...this.ps.opinion };
    this.flags = new Set((cat._meta as any).initial_flags ?? []);
    this.rng = makeRng(seed);
    this.params = gains(BASE);
    this.seed();
  }

  private seed() {
    const P = DATA.panel, S = DATA.supply;
    const g = (c: string, i: number, d = 0) => n((P.series as any)[c]?.[i], d);
    const mk = (i: number): State => ({
      period: P.periods[i], gap: g('gap', i), rgdp: g('rgdp_sa', i),
      potential: g('rgdp_sa', i) / (1 + g('gap', i) / 100),
      capital: S.K[i], labour: S.L[i], tfp: S.TFP[i],
      potentialGrowthYoy: 2.1, infraPipeline: [], reformStock: 0,
      exportsR: g('exp_r', i), importsR: g('imp_r', i),
      invPrivR: g('gfcf_priv_r', i), invPubR: g('gfcf_pub_r', i), consR: g('cons_r', i),
      invRate: g('gfcf_priv_n', i) / g('ngdp', i) * 100,
      cpi: g('cpi', i), cpiCore: g('cpi_core', i),
      cpiYoy: g('cpi_yoy', i), cpiCoreYoy: g('cpi_core_yoy', i),
      policyRate: g('policy_rate', i, 1), realRate: g('real_rate_cpi', i),
      reer: g('reer', i, 100), hhDebt: g('hh_debt', i, 87.5),
      debtGdp: 64.7, primaryBalance: 0, riskPremium: 0,
      capitalSpend: BASELINE.capitalSpend, govConsumption: BASELINE.govConsumption,
      transfers: 0, taxRate: BASELINE.taxRate,
    });
    const last = P.periods.length - 1;
    for (let k = 3; k >= 0; k--) this.history.push(mk(last - k));
    this.setHistory = [1493.69, 1568.37, 1591.24, 1621.62];
  }

  get state(): State { return this.history[this.history.length - 1]; }
  get label(): string {
    const y = 2026 + Math.floor((this.quarter + 1) / 4);
    return `${y} Q${((this.quarter + 1) % 4) + 1}`;
  }
  get turnsLeft(): number { return 16 - this.quarter; }
  bandOf(p: string) { return band(cfg.bands, this.opinion[p]); }


  /** The House votes on CURRENT relations, not the ones you formed the coalition
   *  with. Without this sync every opinion point earned through events was
   *  invisible to every division — which made courting the opposition pointless
   *  and VAT unwinnable by construction. */

  /** Enacting a policy moves relations. A party that likes what you just did
   *  warms to you; one that does not, cools. Without this the only way to shift
   *  the House was through events, and governing in a way the opposition
   *  respects counted for nothing. Deliberately small — roughly four points at
   *  full ideological alignment — so it is a five-year accumulation, not a
   *  transaction. */
  private shiftOpinionFromPolicy(fit: Record<string, number>, scale = 4) {
    for (const [party, f] of Object.entries(fit)) {
      if (this.opinion[party] == null || party === 'Bhumjaithai') continue;
      const d = Math.round(f * scale);
      if (d) this.opinion[party] =
        Math.max(0, Math.min(100, this.opinion[party] + d));
    }
  }

  private whipState() {
    this.ps.opinion = this.opinion;
    return this.ps;
  }

  /** Cumulative record of every partner bill that has reached the desk. Run at
   *  both ends of the turn because a card can be unlocked by a flag set inside
   *  the turn that opened it — and once a partner has asked, letting the bill
   *  lapse still counts against you at the end. */
  /** Flags that mirror CONTINUOUS state, refreshed every quarter.
   *  Option gating in the card schema is flag-based only, so a condition like
   *  "approval above 50%" has no way to be expressed — and some choices are
   *  genuinely unavailable to a weak government rather than merely expensive.
   *  Stamping the condition as a flag lets the existing `requiresFlags` machinery
   *  grey the option out on its own, and the flag clears again the moment the
   *  polling does. Nothing persistent should ever be keyed off these. */
  private syncStateFlags() {
    if (this.approval > 50) this.flags.add('approval_over_50');
    else this.flags.delete('approval_over_50');
  }

  private censusProposals() {
    for (const c of availableCards(cat, this.flags, this.quarter, this.ps.coalition))
      if (c.proposal) this.proposalsSeen.add(c.id);
  }

  deck(): PolicyCard[] {
    return availableCards(cat, this.flags, this.quarter, this.ps.coalition).filter(c =>
      !this.playedCards.has(c.id) &&
      !this.deferred.some(d => d.cardId === c.id && d.returnsAtQuarter > this.quarter));
  }

  previewVote(card: PolicyCard, opt: PolicyOption) {
    if (!opt.requiresLegislation) return null;
    return attempt(this.whipState(), card, opt.id).result;
  }

  openTurn(): GameEvent[] {
    const st = { debtGdp: this.state.debtGdp, gap: this.state.gap,
                 cpiYoy: this.state.cpiYoy, approval: this.approval,
                 debtHeadroom: this.debtCeiling - this.state.debtGdp,
                 debtOverCeiling: this.state.debtGdp - this.debtCeiling };
    const { fired, remaining } = due(events, this.scheduled, this.quarter, st,
                                     this.flags, this.rng, this.firedEvents);
    this.scheduled = remaining;
    for (const e of fired) { this.firedEvents.add(e.id); if (e.blocking) this.pending.push(e); }
    for (const d of this.deferred.filter(d => d.returnsAtQuarter === this.quarter)) {
      const c = cat.policies.find(x => x.id === d.cardId);
      if (c) this.log.push({ quarter: this.quarter, kind: 'note', text: `${c.name} returns to the desk` });
    }
    this.deferred = this.deferred.filter(d => d.returnsAtQuarter > this.quarter);

    this.censusProposals();
    this.syncStateFlags();

    // A partner's bill left to die on the desk. They notice, and they say so.
    for (const c of lapsedProposals(cat, this.quarter, this.flags, this.ps.coalition, this.playedCards)) {
      for (const [party, delta] of Object.entries(c.proposal!.onIgnore)) {
        if (this.opinion[party] == null) continue;
        this.opinion[party] = Math.max(0, Math.min(100, Math.round(this.opinion[party] + delta)));
      }
      this.log.push({ quarter: this.quarter, kind: 'note',
        text: `${c.proposal!.party} withdraws ${c.name} — it sat on the desk for ` +
              `${c.proposal!.expiresAfter} quarters` });
    }
    return this.pending;
  }

  playCard(cardId: string, optionId: string) {
    if (this.actionsThisTurn >= this.actionCap) return { ok: false, msg: 'No actions left this quarter' };
    const card = this.deck().find(c => c.id === cardId);
    if (!card) return { ok: false, msg: 'not in the deck' };
    const chosen = card.options.find(o => o.id === optionId)!;
    if (!isUnlocked(chosen, this.flags)) return { ok: false, msg: chosen.lockedNote || 'Locked' };
    this.actionsThisTurn++;
    const r = attempt(this.whipState(), card, optionId);
    if (!r.passed) {
      this.log.push({ quarter: this.quarter, kind: 'fail',
        text: `${card.name} — ${r.option.label} FAILS (${r.result!.yes} yes, ${-r.result!.margin} short)` });
      return { ok: false, msg: `Defeated — ${r.result!.yes} yes, ${-r.result!.margin} short`, vote: r.result };
    }
    const opt = r.option;
    if (opt.returnsInQuarters) this.deferred.push({ cardId, returnsAtQuarter: this.quarter + opt.returnsInQuarters });
    else this.playedCards.add(cardId);
    if (opt.maximal) { this.maximalPlays.add(cardId); this.hedgedPlays.delete(cardId); }
    else { this.hedgedPlays.add(cardId); this.maximalPlays.delete(cardId); }
    if (card.proposal) { if (opt.maximal) this.proposalsFull.add(cardId); else this.proposalsFull.delete(cardId); }
    this.flags = applyFlags(this.flags, opt);
    this.scheduled = scheduleFrom(this.scheduled, events, cardId, optionId, this.quarter);
    const discounted = opt.dependsOn && !this.flags.has(opt.dependsOn.flag);
    this.apply(effectiveEffects(opt, this.flags));
    this.shiftOpinionFromPolicy(opt.fit);
    // enacting a partner's proposal is worth more to them than the policy itself
    if (card.proposal) {
      for (const [party, delta] of Object.entries(card.proposal.onPass)) {
        if (this.opinion[party] == null) continue;
        this.opinion[party] = Math.max(0, Math.min(100, Math.round(this.opinion[party] + delta)));
      }
    }
    this.log.push({ quarter: this.quarter, kind: 'card',
      text: `${card.name} — ${opt.label}` + (discounted ? ` [×${opt.dependsOn!.withoutFactor}]` : '') });
    return { ok: true, msg: r.executive ? 'Executive action' : `Passed by ${r.result!.margin}`,
             vote: r.result, discounted };
  }

  resolveEvent(eventId: string, optionId: string) {
    const i = this.pending.findIndex(e => e.id === eventId);
    if (i < 0) return;
    const e = this.pending[i];
    const opt = e.options.find(o => o.id === optionId)!;
    // Defensive: the UI greys locked options, but nothing stopped a caller
    // resolving one directly, and every headless harness does exactly that.
    if (opt.unavailable || !isUnlocked(opt as any, this.flags)) return;
    const res = resolve(this.opinion, this.flags, opt);
    this.opinion = res.opinion; this.flags = res.flags;
    this.apply(res.effects);
    this.syncCeiling();
    // Members leaving the party. Mutates the live seat table, so the whip count
    // for every later division reflects it — and a large enough exodus ends the
    // government the same way a partner walking out does.
    const shift = (opt as any).seatShift as Record<string, number> | undefined;
    if (shift) {
      for (const [party, d] of Object.entries(shift)) {
        if (this.ps.seats[party] == null) continue;
        this.ps.seats[party] = Math.max(0, this.ps.seats[party] + d);
      }
      const lost = Object.entries(shift).filter(([, d]) => d < 0)
        .map(([p, d]) => `${p} ${d}`).join(', ');
      if (lost) this.log.push({ quarter: this.quarter, kind: 'note', text: `Seats change hands — ${lost}` });
    }
    this.pending.splice(i, 1);
    // Events can schedule follow-ups exactly as cards do. They could not before:
    // scheduleFrom was only ever called from playCard, so an `afterOption`
    // trigger naming an EVENT never fired and consequence chains had to start
    // from a card.
    this.scheduled = scheduleFrom(this.scheduled, events, e.id, opt.id, this.quarter);
    this.log.push({ quarter: this.quarter, kind: 'event', text: `${e.headline} → ${opt.label}` });
  }

  /** The ceiling event sets a flag; this is what makes the flag mean something. */
  private syncCeiling() {
    this.debtCeiling = this.flags.has('debt_ceiling_raised_again') ? 85
      : this.flags.has('debt_ceiling_raised') ? 78 : 70;
    this.params = { ...this.params, debtCeiling: this.debtCeiling };
  }

  /** Bureaucratic cooperation, from the establishment's opinion of you. Neutral
   *  at 55 — the civil service is not owed enthusiasm, only consent. Runs from
   *  0.78 at open hostility to 1.15 where they are actively helping. */

  /** Approval was a ratchet: every card added to it, nothing ever took any
   *  away, and a median term finished in the nineties. Real approval is a
   *  STOCK THAT DECAYS toward what the economy is actually delivering, and
   *  incumbency erodes it regardless — Thai governments do not get more popular
   *  by staying in office. A boost is now a temporary asset you spend, which is
   *  what every piece of flavour text in this game already claimed it was. */
  private approvalDrift() {
    const s = this.state;
    const lag4 = this.history[this.history.length - 5] ?? this.history[0];
    const growthFelt = (s.rgdp / lag4.rgdp - 1) * 100;
    const target =
      44
      + 4.0 * (growthFelt - 2.4)                              // growth people feel
      - 2.5 * Math.max(0, s.cpiYoy - 3)                       // the cost of living
      - 0.6 * Math.max(0, s.debtGdp - this.debtCeiling)       // visible fiscal trouble
      - 5.0 * (this.quarter / 16);                            // incumbency
    this.approval = Math.max(0, Math.min(100,
      Math.round((this.approval + 0.13 * (target - this.approval)) * 10) / 10));
  }

  cooperation(): number {
    const others = this.opinion.Others ?? 55;
    return Math.max(0.78, Math.min(1.15, 1 + (others - 55) / 200));
  }

  private apply(e: PolicyEffects) {
    for (const [k, v] of Object.entries(e)) this.stance[k] = (this.stance[k] ?? 0) + (v as number);
    if (e.approvalBoost) this.approval = Math.max(0, Math.min(100, this.approval + e.approvalBoost));
    if (e.institutionalSupport)
      this.opinion.Others = Math.round(
        Math.max(0, Math.min(100, this.opinion.Others + e.institutionalSupport)));
  }

  endTurn(): { ok: boolean; msg?: string; fallen?: boolean; walked?: string[] } {
    if (this.pending.length) return { ok: false, msg: 'Resolve the news first' };
    this.censusProposals();
    this.syncStateFlags();
    const h = this.history, s = h[h.length - 1], lag4 = h[h.length - 4];
    const simRr = h.slice(-4).reduce((a, v) => a + (v.policyRate - v.cpiYoy), 0) / 4;
    const prev = { ...h[h.length - 2], realRate: simRr } as State;
    const ramp = Math.min(1, (this.quarter + 1) / 6);
    const cap = this.ps.effects.megaprojectCap ?? 9.0;
    const stimCap = this.ps.effects.stimulusCap ?? 2.0;
    const policy: Policy = {
      policyRate: 1.0, reer: s.reer,
      capitalSpend: Math.min(cap, BASELINE.capitalSpend + this.stance.capitalSpend * ramp),
      govConsumption: BASELINE.govConsumption + this.stance.govConsumption * ramp,
      transfers: Math.min(stimCap, this.stance.transfers * ramp),
      taxRate: BASELINE.taxRate + this.stance.taxRate * ramp,
      reformIndex: reformEffort(this.stance.reformIndex) * (this.ps.effects.reformCapacity ?? 0.7),
      fdiSignal: (this.stance.fdiSignal ?? 0) * ramp,
      humanCapital: (this.stance.humanCapital ?? 0) * ramp,
      formalisation: (this.stance.formalisation ?? 0) * ramp,
      savingsRate: (this.stance.savingsRate ?? 0) * ramp,
    };
    const exog: Exog = { worldDemandGrowth: 3.0, globalActivity: 10.0,
                         energyInflation: 1.5 + (this.rng() - 0.5) * 3, shock: 0 };
    const params: Params = { ...this.params,
      // Disbursement is a RATE, not a multiplier: 1.0 means every baht of the
      // capital budget actually gets spent in the year it was voted. Reform can
      // approach that ceiling; it cannot manufacture spending above the budget.
      executionCapital: Math.min(1.0,
        this.params.executionCapital + this.stance.executionBonus) };
    const next = step({ state: s, prev, lag4, exog, policy, params });
    this.history.push(next);
    this.quarter++; this.approvalDrift(); this.quarter--;

    // SET: a fundamental anchored to nominal GDP (earnings track it with a beta
    // above one), plus a sentiment deviation that DECAYS. The previous version
    // was a random walk whose drift terms never decayed, which compounded to
    // absurd levels — 3,000 by 2030 on a 1,620 start.
    const base = this.history[3];
    const nominalIdx = (next.rgdp / base.rgdp) * (next.cpi / base.cpi);
    const fundamental = 1621.62 * Math.pow(nominalIdx, 1.15);
    const shock = (next.gap - s.gap) * 1.6
                + (this.stance.fdiSignal ?? 0) * 1.2
                + (this.stance.setSupport ?? 0) * 1.5
                + (this.approval - 48) * 0.05
                + (this.rng() - 0.5) * 5.5;
    this.sentiment = this.sentiment * 0.72 + shock / 100;
    this.sentiment = Math.max(-0.45, Math.min(0.45, this.sentiment));
    this.set = Math.max(400, fundamental * (1 + this.sentiment));
    this.setHistory.push(this.set);
    this.quarter++;
    this.actionsThisTurn = 0;
    const gov = this.government();
    if (gov.fallen) return { ok: true, fallen: true, walked: gov.walked };
    return { ok: true };
  }

  headline(): number {
    const end = this.state, start = this.history[3];
    return 8056.57 * BASELINE_ALIGN * (end.rgdp / start.rgdp) * (end.cpi / start.cpi)
         * (71.62 / 71.215) * (32.88 / 34.6);
  }
  /** Not what they called themselves — what the budget composition says they were. */
  ideology() {
    const s: any = this.state;
    return classify({
      capitalSpend: this.stance.capitalSpend ?? 0,
      transfers: this.stance.transfers ?? 0,
      taxRate: this.stance.taxRate ?? 0,
      govConsumption: this.stance.govConsumption ?? 0,
      reformStock: s.reformStock,
      fdiSignal: this.stance.fdiSignal ?? 0,
      debtStart: 64.7,
      debtEnd: s.debtGdp,
      primaryBalance: s.primaryBalance,
      invRate: s.invRate,
    });
  }

  /** What the term will be remembered for, beyond the four scores. */
  achievements(elec: any) {
    const s: any = this.state;
    const start = this.history[3];
    const yrs = Math.max(this.quarter / 4, 0.5);
    return evaluateAchievements({
      headline: this.headline(),
      potentialGrowth: s.potentialGrowthYoy,
      realGrowth: (Math.pow(s.rgdp / start.rgdp, 1 / yrs) - 1) * 100,
      invRate: s.invRate, debtGdp: s.debtGdp, ceiling: this.debtCeiling,
      approval: this.approval, set: this.set, setChange: (this.set / 1621.62 - 1) * 100,
      reformStock: s.reformStock, riskPremium: s.riskPremium, gap: s.gap,
      primaryBalance: s.primaryBalance, hhDebt: s.hhDebt,
      flags: this.flags, opinion: this.opinion,
      fell: this.government().fallen,
      playerSeats: elec ? elec.playerSeats : 0,
      coalitionAfter: elec ? elec.bestCoalition : null,
      verdict: elec ? elec.verdict : 'none',
      maximalPlays: this.maximalPlays.size, hedgedPlays: this.hedgedPlays.size,
      proposalsFull: this.proposalsFull.size, proposalsSeen: this.proposalsSeen.size,
    });
  }

  /** The count. The House elected in February 2026 expires in 2030Q1, so the
   *  game ends here rather than in December — and the promise the government
   *  made for December can only be answered by winning. */
  election() {
    const gov = this.government();
    const start = this.history[3];
    const yrs = this.quarter / 4;
    const realGrowth = (Math.pow(this.state.rgdp / start.rgdp, 1 / Math.max(yrs, 0.5)) - 1) * 100;
    return runElection({
      seats: this.ps.seats,
      seatsAt2026: this.seats2026,
      coalition: this.ps.coalition.filter(p => !gov.walked.includes(p)),
      opinion: this.opinion,
      approval: this.approval,
      headline: this.headline(),
      baseline: 9092,
      realGrowth,
      potentialGrowth: this.state.potentialGrowthYoy,
      setChange: (this.set / 1621.62 - 1) * 100,
      invRate: this.state.invRate,
      reformStock: this.state.reformStock,
      debtGdp: this.state.debtGdp,
      ceiling: this.debtCeiling,
      machineBroken: this.flags.has('patriot'),
      partySystemReformed: this.flags.has('party_system_reformed'),
    });
  }

  government(): { seats: number; fallen: boolean; walked: string[] } {
    const walked = this.ps.coalition.filter(p =>
      p !== 'Bhumjaithai' && this.opinion[p] < 25 && this.approval < 35);
    const seats = this.ps.coalition.reduce((a, p) =>
      a + (walked.includes(p) ? 0 : this.ps.seats[p]), 0);
    return { seats, fallen: seats < 251, walked };
  }
  coalitionSeats() { return this.government().seats; }
}

export { band, effectiveEffects, isUnlocked, nextPeriod };
export const COALITIONS = cfg;
