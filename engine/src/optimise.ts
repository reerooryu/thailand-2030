/**
 * Optimiser: search the policy space for the best obtainable term.
 *
 * The engine is deterministic given (coalition, seed, card script, event
 * choices), so a candidate line can be evaluated by replaying the whole game
 * from 2026Q2. That is what makes search possible at all — there is no state
 * to clone, only a script to re-run.
 *
 * Method: greedy with rollout. At each decision point every legal choice is
 * tried, the game is played out to December 2030 taking no further discretionary
 * action, and the choice with the best terminal score is kept. Two refinement
 * passes then re-open each committed decision against the finished line, which
 * is what catches ordering effects — VAT before the Negative Income Tax, the
 * semiconductor board before the initiative.
 *
 * This is a local search. It finds a strong line, not a proven optimum: greedy
 * rollout is blind to a move that is bad now and good only in combination with
 * a move three years out. Where that matters, the refinement passes are the
 * partial fix and the residual gap is honest.
 *
 * Usage:  npx tsx src/optimise.ts [objective] [coalition]
 *   objective: legacy | headline | balanced   (default balanced)
 */
import { Game } from './game.js';
import type { Exog } from './types.js';
import { loadCoalitions } from './loaders.js';

const EXOG: Exog = { worldDemandGrowth: 3.0, globalActivity: 10.0, energyInflation: 1.5, shock: 0 };
const QUARTERS = 16;   // 2026Q2 .. 2030Q1 — the House expires four years after February 2026
const SEED = 20260201;

interface Move { q: number; card: string; option: string; }
type EventChoices = Record<string, string>;

interface Decision {
  q: number; kind: 'card' | 'news'; id: string; option: string;
  label: string; optionLabel: string;
  defaulted?: boolean; blocking?: boolean; enacted?: boolean; discounted?: boolean;
}

interface Outcome {
  headline: number; legacy: number; debtGdp: number; invRate: number;
  approval: number; lostConfidence: boolean; ceiling: number; score: number;
  moves: Move[]; events: EventChoices; trace: Decision[];
}

type Objective = 'legacy' | 'headline' | 'balanced' | 'numberone' | 'grandslam' | 'megaslam';

/** What "best" means. Debt above the ceiling you actually legislated is a real
 *  failure, not a rounding cost, so it is priced steeply rather than banned —
 *  a line that breaches by a little to buy a lot of potential growth should
 *  still be findable. */
function scoreOf(s: any, ceiling: number, obj: Objective): number {
  if (s.lostConfidence) return -1e6;
  // 'numberone' asks a different question: not how good a term can be, but
  // whether four specific thresholds can be crossed AT THE SAME TIME. Scored as
  // the sum of remaining shortfalls, so the search climbs toward the corner of
  // the space where all four bind rather than maximising any one of them.
  // 'grandslam' asks whether the two legendary achievements can coexist:
  // Thailand Number One's four economic thresholds AND Said and Done's four
  // commitments. The commitments are expensive — the Land Bridge alone is worth
  // -0.57 growth on a good line — so the search needs the flags priced in
  // explicitly or it will simply drop them and take the easier prize.
  // 'megaslam' stacks To the Moon on top: SET above 2,600 as well. The index is
  // clamped at 1.45x its nominal-GDP fundamental, so this is not a matter of
  // buying sentiment — it needs a bigger economy AND the sentiment pinned near
  // the cap at the finish, while still carrying the Land Bridge.
  if (obj === 'megaslam') {
    const short = (v: number, t: number, w: number) => Math.min(0, v - t) * w;
    const f = s.flags as Set<string>;
    const need = ['land_bridge_committed', 'utapao_restored', 'smr_both_units', 'semiconductor_programme'];
    const got = need.filter(x => f?.has(x)).length;
    const metrics = short(s.realGrowth ?? 0, 3.0, 40) + short(s.legacy, 3.0, 40)
                  + short(s.invRate, 20.0, 12) + short((s.set ?? 0) / 100, 26.0, 10);
    const all = s.realGrowth > 3 && s.legacy > 3 && s.invRate > 20 && (s.set ?? 0) > 2600;
    return metrics + got * 60 + (all ? 400 : 0) + (all && got === 4 ? 1500 : 0);
  }
  if (obj === 'grandslam') {
    const short = (v: number, t: number, w: number) => Math.min(0, v - t) * w;
    const f = s.flags as Set<string>;
    const need = ['land_bridge_committed', 'utapao_restored', 'smr_both_units', 'semiconductor_programme'];
    const got = need.filter(x => f?.has(x)).length;
    const metrics = short(s.realGrowth ?? 0, 3.0, 30) + short(s.legacy, 3.0, 30)
                  + short(s.invRate, 20.0, 12) + short((s.set ?? 0) / 100, 25.0, 4);
    const allMetrics = s.realGrowth > 3 && s.legacy > 3 && s.invRate > 20 && (s.set ?? 0) > 2500;
    return metrics + got * 60 + (allMetrics ? 400 : 0) + (allMetrics && got === 4 ? 1000 : 0);
  }
  if (obj === 'numberone') {
    const short = (v: number, t: number, w: number) => Math.min(0, v - t) * w;
    return short(s.realGrowth ?? 0, 3.0, 30) + short(s.legacy, 3.0, 30)
         + short(s.invRate, 20.0, 12) + short((s.set ?? 0) / 100, 25.0, 4)
         + (s.realGrowth > 3 && s.legacy > 3 && s.invRate > 20 && (s.set ?? 0) > 2500 ? 500 : 0);
  }
  const breach = Math.max(0, s.debtGdp - ceiling);
  const penalty = breach * breach * 0.35;
  if (obj === 'headline') return s.headline / 1000 - penalty;
  if (obj === 'legacy') return s.legacy * 10 - penalty;
  return s.legacy * 6 + s.headline / 400 + s.invRate * 0.5 + s.approval * 0.04 - penalty;
}

/** Replay a full term from a script. Any illegal move is simply skipped, so a
 *  script that became invalid under a different line degrades instead of
 *  throwing.
 *
 *  The trace records EVERY decision the term actually contained, news included
 *  and in presentation order — an event resolved on its default option is still
 *  a decision that was made, and leaving it out of the report made lines look
 *  like they had skipped events they had in fact answered. */
function play(coalition: string, moves: Move[], events: EventChoices, obj: Objective): Outcome {
  const g = new Game(coalition, SEED);
  const trace: Decision[] = [];
  let sentiment = 0;
  for (let q = 0; q < QUARTERS; q++) {
    for (const e of g.openTurn().slice()) {
      const legal = e.options.filter((o: any) => !o.unavailable);
      const want = events[e.id];
      const chosen = legal.find((o: any) => o.id === want) ?? legal[0];
      trace.push({ q, kind: 'news', id: e.id, option: chosen.id,
                   label: e.headline, optionLabel: chosen.label,
                   defaulted: want == null, blocking: !!e.blocking });
      g.resolveEvent(e.id, chosen.id);
    }
    for (const m of moves.filter(m => m.q === q)) {
      const card: any = (g.deck() as any[]).find(c => c.id === m.card);
      const before = g.log.length;
      try { g.playCard(m.card, m.option); } catch { continue; /* not in the deck this line */ }
      const enacted = g.log.slice(before).some(l => l.text.startsWith('ENACTED'));
      if (!card) continue;
      const opt = card.options.find((o: any) => o.id === m.option);
      trace.push({ q, kind: 'card', id: m.card, option: m.option,
                   label: card.name, optionLabel: opt ? opt.label : m.option,
                   enacted, discounted: !!(opt && opt.dependsOn && !g.flags.has(opt.dependsOn.flag)) });
    }
    const gapBefore = g.state.gap;
    g.endTurn(EXOG);
    // mirror of the browser host's SET sentiment process, with the random term
    // set to its mean — this is what makes the 'numberone' search honest about
    // the index rather than guessing at its fundamental
    const shock = (g.state.gap - gapBefore) * 1.6
                + (g.stance.fdiSignal ?? 0) * 1.2
                + (g.stance.setSupport ?? 0) * 1.5
                + (g.approval - 48) * 0.05;
    sentiment = Math.max(-0.45, Math.min(0.45, sentiment * 0.72 + shock / 100));
  }
  const s: any = g.score();
  const st = g.history[3];
  s.realGrowth = (Math.pow(g.state.rgdp / st.rgdp, 1 / (QUARTERS / 4)) - 1) * 100;
  s.flags = g.flags;
  // The SET index lives in the browser host, not here. Its fundamental is a
  // nominal-GDP anchor with a beta above one, and the sentiment term decays at
  // 0.72 a quarter, so by 2030Q1 the fundamental is almost the whole number.
  // Good enough to search on; the winning line is then verified in the browser.
  s.set = 1621.62 * Math.pow((g.state.rgdp / st.rgdp) * (g.state.cpi / st.cpi), 1.15) * (1 + sentiment);
  return { ...s, ceiling: g.debtCeiling, score: scoreOf(s, g.debtCeiling, obj), moves, events, trace };
}

/** Every (card, option) legally playable at quarter q under a given line. */
function optionsAt(coalition: string, moves: Move[], events: EventChoices, q: number) {
  const g = new Game(coalition, SEED);
  for (let i = 0; i < q; i++) {
    for (const e of g.openTurn().slice()) {
      const legal = e.options.filter((o: any) => !o.unavailable);
      const pick = legal.find((o: any) => o.id === events[e.id]) ?? legal[0];
      g.resolveEvent(e.id, pick.id);
    }
    for (const m of moves.filter(m => m.q === i)) { try { g.playCard(m.card, m.option); } catch {} }
    g.endTurn(EXOG);
  }
  const pending = g.openTurn();
  const out: { card: string; option: string }[] = [];
  for (const c of g.deck() as any[]) {
    for (const o of c.options) {
      if (o.unavailable) continue;
      if ((o.requiresFlags ?? []).some((f: string) => !g.flags.has(f))) continue;
      out.push({ card: c.id, option: o.id });
    }
  }
  return { options: out, pending, cap: g.actionCap };
}

/** Every event decision this line will actually face, with its legal options. */
function eventMenu(coalition: string, moves: Move[], events: EventChoices) {
  const g = new Game(coalition, SEED);
  const menu: { id: string; options: string[] }[] = [];
  for (let q = 0; q < QUARTERS; q++) {
    for (const e of g.openTurn().slice()) {
      const legal = e.options.filter((o: any) => !o.unavailable);
      menu.push({ id: e.id, options: legal.map((o: any) => o.id) });
      const pick = legal.find((o: any) => o.id === events[e.id]) ?? legal[0];
      g.resolveEvent(e.id, pick.id);
    }
    for (const m of moves.filter(m => m.q === q)) { try { g.playCard(m.card, m.option); } catch {} }
    g.endTurn(EXOG);
  }
  return menu;
}

function optimise(coalition: string, obj: Objective) {
  let moves: Move[] = [];
  let events: EventChoices = {};
  let best = play(coalition, moves, events, obj);
  let evals = 1;

  // pass 1 — fill the calendar greedily, quarter by quarter
  for (let q = 0; q < QUARTERS; q++) {
    const { cap } = optionsAt(coalition, moves, events, q);
    for (let slot = 0; slot < cap; slot++) {
      const { options } = optionsAt(coalition, moves, events, q);
      const used = new Set(moves.map(m => m.card));
      let bestMove: Move | null = null;
      for (const o of options) {
        if (used.has(o.card)) continue;
        const trial = [...moves, { q, card: o.card, option: o.option }];
        const r = play(coalition, trial, events, obj); evals++;
        if (r.score > best.score + 1e-9) { best = r; bestMove = { q, card: o.card, option: o.option }; }
      }
      if (!bestMove) break;
      moves = [...moves, bestMove];
    }
  }

  // pass 2 — the event decisions, against the finished card line
  for (let round = 0; round < 2; round++) {
    for (const e of eventMenu(coalition, moves, events)) {
      for (const oid of e.options) {
        if (events[e.id] === oid) continue;
        const trial = { ...events, [e.id]: oid };
        const r = play(coalition, moves, trial, obj); evals++;
        if (r.score > best.score + 1e-9) { best = r; events = trial; }
      }
    }
    // pass 3 — re-open every committed card decision now that events are set
    for (const m of [...moves]) {
      const others = moves.filter(x => x !== m);
      for (const qq of [m.q, Math.max(0, m.q - 1), m.q + 1]) {
        const { options } = optionsAt(coalition, others, events, qq);
        for (const o of options.filter(o => o.card === m.card)) {
          if (o.option === m.option && qq === m.q) continue;
          const trial = [...others, { q: qq, card: o.card, option: o.option }];
          const r = play(coalition, trial, events, obj); evals++;
          if (r.score > best.score + 1e-9) { best = r; moves = trial; }
        }
      }
      // and try dropping it entirely — an action not taken is an action available
      const r = play(coalition, others, events, obj); evals++;
      if (r.score > best.score + 1e-9) { best = r; moves = others; }
    }
  }
  return { best, moves, events, evals };
}

function quarterLabel(q: number) {
  const abs = 1 + q;                      // the term opens in 2026Q2
  return `${2026 + Math.floor(abs / 4)}Q${(abs % 4) + 1}`;
}

const objective = (process.argv[2] as Objective) || 'balanced';
const only = process.argv[3];
const cfg: any = loadCoalitions();
const coalitions = (cfg.options as any[]).filter(o => o.available && (!only || o.id === only));

console.log(`\nOBJECTIVE: ${objective}\n`);
for (const c of coalitions) {
  const t0 = Date.now();
  const { best, moves, events, evals } = optimise(c.id, objective);
  const secs = ((Date.now() - t0) / 1000).toFixed(0);
  console.log(`${'='.repeat(70)}\n${c.name}   (${evals} full terms simulated, ${secs}s)\n${'='.repeat(70)}`);
  console.log(`  real growth ${(best as any).realGrowth?.toFixed(2)}%  SET ${(best as any).set?.toFixed(0)}`);
  {
    const f = (best as any).flags as Set<string>;
    const need = ['land_bridge_committed', 'utapao_restored', 'smr_both_units', 'semiconductor_programme'];
    console.log(`  Said and Done flags: ` + need.map(x => `${x}=${f?.has(x) ? 'YES' : 'no'}`).join('  '));
    const b2 = best as any;
    console.log(`  Thailand No.1 tests: growth>3 ${b2.realGrowth > 3}  potential>3 ${b2.legacy > 3}  ` +
                `inv>20 ${b2.invRate > 20}  SET>2500 ${b2.set > 2500}   |  To the Moon SET>2600 ${b2.set > 2600}`);
  }
  console.log(`  headline ${best.headline.toFixed(0)}  legacy ${best.legacy.toFixed(2)}%  ` +
              `debt ${best.debtGdp.toFixed(1)}% / ceiling ${best.ceiling}  ` +
              `inv ${best.invRate.toFixed(1)}%  approval ${best.approval}`);
  console.log('  the term, in order:');
  let lastQ = -1;
  for (const d of best.trace) {
    const stamp = d.q === lastQ ? '     ' : quarterLabel(d.q).padEnd(7);
    lastQ = d.q;
    if (d.kind === 'news') {
      console.log(`  ${stamp} NEWS  ${d.label}`);
      console.log(`  ${' '.repeat(7)}    -> ${d.optionLabel}${d.defaulted ? '   [default kept]' : ''}`);
    } else {
      console.log(`  ${stamp} ${d.enacted ? 'BILL ' : 'FAILS'} ${d.label} — ${d.optionLabel}` +
                  (d.discounted ? '  [discounted: dependency unmet]' : ''));
    }
  }
  const newsCount = best.trace.filter(d => d.kind === 'news').length;
  const changed = best.trace.filter(d => d.kind === 'news' && !d.defaulted).length;
  console.log(`  ${newsCount} news items faced, ${changed} answered against the default; ` +
              `${best.trace.filter(d => d.kind === 'card').length} bills taken.`);
}
