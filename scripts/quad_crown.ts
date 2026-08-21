/**
 * Brute-force search for the quad crown: Said and Done!, Thailand Number One!
 * and Horse before the Cart in a single term.
 *
 * The greedy optimiser cannot find this. Its three objectives conflict head-on:
 *
 *   Said and Done      demands the Land Bridge, U-Tapao at full spec, both
 *                      reactors and the semiconductor package — roughly a point
 *                      of GDP in additional capital spending.
 *   Thailand No. 1     demands real growth above 3%, which taxes suppress.
 *   Horse before Cart  demands a risk premium under 0.25pp, which on this
 *                      calibration means GROSS DEBT BELOW 73.96% — while paying
 *                      for all of the above — plus a primary deficit no worse
 *                      than 4% of GDP.
 *
 * So the search is: build everything, tax enough to afford it, and still grow
 * at 3%. This is hill-climbing with random restarts over the joint space of
 * (option per card, quarter per card, option per event), scored on the sum of
 * normalised constraint violations. A term simulates in about a millisecond, so
 * a few hundred thousand evaluations is cheap.
 *
 * Usage: npx tsx scripts/triple_crown.ts [coalition] [restarts]
 */
import { Game } from '../engine/src/game.js';
import { loadPolicies, loadEvents } from '../engine/src/loaders.js';
import { runElection } from '../engine/src/election.js';
import { evaluate as evalAch } from '../engine/src/achievements.js';

const EXOG: any = { worldDemandGrowth: 3, globalActivity: 10, energyInflation: 1.5, shock: 0 };
const SEED = 20260201;
const Q = 16;

const cat: any = loadPolicies();
const events: any[] = loadEvents() as any[];

/** Options that MUST be taken for the two flag-based achievements. */
const FORCED: Record<string, string> = {
  land_bridge: 'proceed',
  smr_programme: 'full',
  digital_government: 'accelerate',      // prerequisite for civil service full
  civil_service_reform: 'full',
  zero_corruption: 'teeth_no_rope',      // the only route to the enforcement flag
  justice_reform: 'full',
  hsr_northeast_china: 'accelerate',     // Said and Done now wants the whole programme
  eastern_hsr: 'amend',
};
const FORCED_EVENTS: Record<string, string> = {
  land_bridge_opposition: 'force',
  utapao_phase1: 'restore',
};
const SEMI = ['full', 'champion'];       // either sets semiconductor_programme

type Gene = { option: string | null; q: number };
type Genome = { cards: Record<string, Gene>; events: Record<string, string> };

const cardIds: string[] = cat.policies.map((c: any) => c.id);
const optionsOf = (id: string) =>
  cat.policies.find((c: any) => c.id === id).options.filter((o: any) => !o.unavailable).map((o: any) => o.id);
const earliest = (id: string) => cat.policies.find((c: any) => c.id === id).scriptedQuarter ?? 0;
const eventOptions: Record<string, string[]> = {};
for (const e of events) eventOptions[e.id] = e.options.filter((o: any) => !o.unavailable).map((o: any) => o.id);

function randomGenome(rnd: () => number): Genome {
  const cards: Record<string, Gene> = {};
  for (const id of cardIds) {
    const opts = optionsOf(id);
    const forced = FORCED[id];
    const option = forced ?? (id === 'semiconductor_initiative'
      ? SEMI[Math.floor(rnd() * SEMI.length)]
      : (rnd() < 0.25 ? null : opts[Math.floor(rnd() * opts.length)]));
    const lo = earliest(id);
    cards[id] = { option, q: lo + Math.floor(rnd() * (Q - lo)) };
  }
  const evs: Record<string, string> = {};
  for (const e of events) {
    const opts = eventOptions[e.id];
    evs[e.id] = FORCED_EVENTS[e.id] ?? opts[Math.floor(rnd() * opts.length)];
  }
  return { cards, events: evs };
}

function evaluate(coalition: string, g0: Genome, energy?: number[]) {
  const g: any = new Game(coalition, SEED);
  let sentiment = 0;
  const plan: { q: number; card: string; option: string }[] = [];
  for (const [id, gene] of Object.entries(g0.cards))
    if (gene.option) plan.push({ q: gene.q, card: id, option: gene.option });

  for (let q = 0; q < Q; q++) {
    for (const e of g.openTurn().slice()) {
      const legal = e.options.filter((o: any) => !o.unavailable);
      const want = legal.find((o: any) => o.id === g0.events[e.id]);
      g.resolveEvent(e.id, (want ?? legal[0]).id);
    }
    for (const m of plan.filter(m => m.q === q)) g.playCard(m.card, m.option);
    const gapBefore = g.state.gap;
    // The BROWSER randomises energy inflation every quarter (1.5 +/- 1.5) while
    // this search runs the mean path. A line tuned to the mean can miss a
    // threshold by a hundredth on an unlucky fuel-price draw, which is exactly
    // what happens in play — so the ensemble mode below re-tests the winner
    // against real energy paths.
    g.endTurn(energy ? { ...EXOG, energyInflation: energy[q] } : EXOG);
    const shock = (g.state.gap - gapBefore) * 1.6 + (g.stance.fdiSignal ?? 0) * 1.2
                + (g.stance.setSupport ?? 0) * 1.5 + (g.approval - 48) * 0.05;
    sentiment = Math.max(-0.45, Math.min(0.45, sentiment * 0.72 + shock / 100));
  }
  const s: any = g.score();
  const st = g.history[3];
  const realGrowth = (Math.pow(g.state.rgdp / st.rgdp, 1 / (Q / 4)) - 1) * 100;
  const set = 1621.62 * Math.pow((g.state.rgdp / st.rgdp) * (g.state.cpi / st.cpi), 1.15) * (1 + sentiment);
  const f: Set<string> = g.flags;

  const need = ['land_bridge_forced', 'utapao_restored', 'smr_both_units', 'semiconductor_programme',
                'hsr_northeast_accelerated', 'eastern_hsr_proceeding',
                'civil_service_shrinking', 'zero_corruption_act', 'anticorruption_enforcement',
                'justice_reform_done'];
  const missing = need.filter(x => !f.has(x));

  const short = (v: number, t: number, w: number) => Math.min(0, v - t) * w;
  const violation =
      short(realGrowth, 3.05, 40)
    + short(s.legacy, 3.05, 40)      // margin, not precision: the browser's fuel
    + short(s.invRate, 20.2, 15)     // price noise moves these by a few hundredths
    + short(set / 100, 25.3, 6)
    + short(g.debtCeiling - s.debtGdp, 0.01, 8)                 // inside the ceiling
    + short(0.2499 - g.state.riskPremium, 0.0001, 200)          // premium under 0.25
    + short(g.state.primaryBalance, -3.90, 25)                 // deficit no worse than 4%
    + short(g.state.reformStock, 60.5, 4)
    // THE FOURTH CROWN. Weighted per hundred dollars so it is commensurate with
    // the others; 10,050 rather than 10,000 for the same margin-not-precision
    // reason as the growth targets.
    + short(s.headline / 100, 100.5, 6)
    - missing.length * 50
    - (g.government().fallen ? 500 : 0);

  return { score: violation, realGrowth, pot: s.legacy, inv: s.invRate, set,
           debt: s.debtGdp, ceiling: g.debtCeiling, risk: g.state.riskPremium,
           pb: g.state.primaryBalance, reform: g.state.reformStock, headline: s.headline,
           approval: g.approval, missing, fell: g.government().fallen, plan };
}

function mutate(g0: Genome, rnd: () => number): Genome {
  const g: Genome = { cards: { ...g0.cards }, events: { ...g0.events } };
  const n = 1 + Math.floor(rnd() * 3);
  for (let i = 0; i < n; i++) {
    if (rnd() < 0.72) {
      const id = cardIds[Math.floor(rnd() * cardIds.length)];
      const cur = g.cards[id];
      const lo = earliest(id);
      if (rnd() < 0.55) {                                       // move it in time
        g.cards[id] = { ...cur, q: lo + Math.floor(rnd() * (Q - lo)) };
      } else if (!FORCED[id]) {                                 // change what it does
        const opts = id === 'semiconductor_initiative' ? SEMI : optionsOf(id);
        g.cards[id] = { ...cur, option: rnd() < 0.15 ? null : opts[Math.floor(rnd() * opts.length)] };
      }
    } else {
      const e = events[Math.floor(rnd() * events.length)];
      if (!FORCED_EVENTS[e.id]) {
        const opts = eventOptions[e.id];
        g.events = { ...g.events, [e.id]: opts[Math.floor(rnd() * opts.length)] };
      }
    }
  }
  return g;
}

function rng(seed: number) { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }

const coalition = process.argv[2] || 'pheuthai';
const RESTARTS = Number(process.argv[3] || 60);
const STEPS = 4000;

// A line tuned to the mean fuel-price path is a coin flip in play: the browser
// rolls energy inflation at 1.5 +/- 1.5 every quarter, and a threshold cleared by
// 0.004 on the mean will fail about half the time. So the search scores each
// candidate on the WORST of a fixed ensemble of paths — it must clear every
// constraint under bad luck as well as good, which forces it to find margin
// rather than precision.
const ENSEMBLE: number[][] = Array.from({ length: 9 }, (_, i) => {
  const r = rng(4242 + i * 977);
  return Array.from({ length: Q }, () => 1.5 + (r() - 0.5) * 3);
});
const SCOUT = process.env.SCOUT === '1';   // mean path only — 9x faster, not certifiable
const robustScore = (coal: string, gm: Genome) => {
  if (SCOUT) return evaluate(coal, gm);
  let worst = Infinity, rep: any = null;
  for (const path of ENSEMBLE) {
    const r = evaluate(coal, gm, path);
    if (r.score < worst) { worst = r.score; rep = r; }
  }
  return { ...rep, score: worst };
};

let best: any = null, bestG: Genome | null = null, evals = 0;
for (let r = 0; r < RESTARTS; r++) {
  const rnd = rng(1000 + r * 7919);
  let cur = randomGenome(rnd);
  let curR = robustScore(coalition, cur); evals += SCOUT ? 1 : ENSEMBLE.length;
  for (let step = 0; step < STEPS; step++) {
    const cand = mutate(cur, rnd);
    const r2 = robustScore(coalition, cand); evals += SCOUT ? 1 : ENSEMBLE.length;
    if (r2.score >= curR.score) { cur = cand; curR = r2; }
    if (curR.score >= 0) break;                                  // every constraint met
  }
  if (!best || curR.score > best.score) { best = curR; bestG = cur; }
  // Print after every restart. The first version of this script buffered
  // everything until the search finished, which on the four-constraint problem
  // meant fifty minutes of silence and no way to tell progress from a hang.
  console.log(
    `restart ${String(r + 1).padStart(3)}/${RESTARTS}  best ${best.score.toFixed(1).padStart(8)}  ` +
    `headline ${best.headline.toFixed(0)}  pot ${best.pot.toFixed(2)}  growth ${best.realGrowth.toFixed(2)}  ` +
    `debt ${best.debt.toFixed(1)}/${best.ceiling}  prem ${best.risk.toFixed(3)}  pb ${best.pb.toFixed(2)}  ` +
    `missing ${best.missing.length}`);
  if (best.score >= 0) break;
}

const ok = (b: boolean) => b ? 'PASS' : 'fail';
if (best) best = { ...evaluate(coalition, bestG!), score: best.score };   // mean-path figures
console.log(`\ncoalition ${coalition} — ${evals.toLocaleString()} terms simulated\n`);
console.log(`  real growth   ${best.realGrowth.toFixed(3)}%   ${ok(best.realGrowth > 3)}`);
console.log(`  potential     ${best.pot.toFixed(3)}%   ${ok(best.pot > 3)}`);
console.log(`  investment    ${best.inv.toFixed(2)}%   ${ok(best.inv > 20)}`);
console.log(`  SET           ${best.set.toFixed(0)}     ${ok(best.set > 2500)}`);
console.log(`  debt          ${best.debt.toFixed(2)} / ceiling ${best.ceiling}   ${ok(best.debt <= best.ceiling)}`);
console.log(`  risk premium  ${best.risk.toFixed(3)}pp   ${ok(best.risk < 0.25)}`);
console.log(`  primary bal   ${best.pb.toFixed(2)}%   ${ok(best.pb > -4)}`);
console.log(`  reform stock  ${best.reform.toFixed(1)}   ${ok(best.reform > 60)}`);
console.log(`  flags missing ${best.missing.length ? best.missing.join(', ') : 'none'}`);
console.log(`  headline ${best.headline.toFixed(0)}  approval ${best.approval.toFixed(1)}  score ${best.score.toFixed(2)}`);

if (best.score >= 0) {
  console.log(`\n*** QUAD CROWN FOUND ***\n`);
  // Verify against the REAL achievement evaluator and the REAL election, not the
  // proxy the search optimises. Said and Done also requires winning, which the
  // violation score above does not test.
  {
    const g: any = new Game(coalition, SEED);
    const executed: any[] = [];
    const trace: any[] = [];
    let sentiment = 0;
    for (let q = 0; q < Q; q++) {
      for (const e of g.openTurn().slice()) {
        const legal = e.options.filter((o: any) => !o.unavailable);
        const want = legal.find((o: any) => o.id === bestG!.events[e.id]);
        const chosen = want ?? legal[0];
        trace.push({ q, kind: 'news', label: e.headline, optionLabel: chosen.label,
                     defaulted: chosen.id === legal[0].id });
        g.resolveEvent(e.id, chosen.id);
      }
      // Only the moves that ACTUALLYexecuted count — the search tolerates plans with
      // dead entries (card not in the deck, action cap reached), and printing
      // those would give a line nobody could reproduce by hand.
      for (const m of best.plan.filter((m: any) => m.q === q)) {
        if (!g.playCard(m.card, m.option)) continue;             // not in the deck / capped
        executed.push(m);
        const c = cat.policies.find((x: any) => x.id === m.card);
        const o = c.options.find((x: any) => x.id === m.option);
        trace.push({ q, kind: 'card', label: c.name, optionLabel: o.label,
                     discounted: !!(o.dependsOn && !g.flags.has(o.dependsOn.flag)) });
      }
      const gb = g.state.gap; g.endTurn(EXOG);
      const sh = (g.state.gap - gb) * 1.6 + (g.stance.fdiSignal ?? 0) * 1.2
               + (g.stance.setSupport ?? 0) * 1.5 + (g.approval - 48) * 0.05;
      sentiment = Math.max(-0.45, Math.min(0.45, sentiment * 0.72 + sh / 100));
    }
    const s2: any = g.score(); const st2 = g.history[3];
    const rg = (Math.pow(g.state.rgdp / st2.rgdp, 1 / 4) - 1) * 100;
    const setV = 1621.62 * Math.pow((g.state.rgdp / st2.rgdp) * (g.state.cpi / st2.cpi), 1.15) * (1 + sentiment);
    const gov = g.government();
    const elec = runElection({ seats: g.ps.seats,
      coalition: g.ps.coalition.filter((p: string) => !gov.walked.includes(p)),
      opinion: g.opinion, approval: g.approval, headline: s2.headline, baseline: 9092,
      realGrowth: rg, potentialGrowth: s2.legacy, setChange: (setV / 1621.62 - 1) * 100,
      invRate: s2.invRate, reformStock: g.state.reformStock });
    const got = evalAch({ headline: s2.headline, potentialGrowth: s2.legacy, realGrowth: rg,
      invRate: s2.invRate, debtGdp: s2.debtGdp, ceiling: g.debtCeiling, approval: g.approval,
      set: setV, setChange: (setV / 1621.62 - 1) * 100, reformStock: g.state.reformStock,
      riskPremium: g.state.riskPremium, gap: g.state.gap, primaryBalance: g.state.primaryBalance,
      flags: g.flags, opinion: g.opinion, fell: gov.fallen, playerSeats: elec.playerSeats,
      coalitionAfter: elec.bestCoalition, verdict: elec.verdict });
    console.log(`  ELECTION: ${elec.headline} — ${elec.playerSeats} seats, verdict ${elec.verdict}`);
    console.log(`  ACHIEVEMENTS EARNED: ${got.filter((a2: any) => a2.earned).map((a2: any) => a2.name).join(' | ')}`);
    // One chronological timeline, news and bills interleaved, exactly as the turn
    // loop presents them — so the line can be replayed by hand without needing to
    // know which option each event defaults to. Every news item is listed with
    // the answer it was given; [default kept] just means the search never found a
    // reason to change it.
    console.log(`\n  THE TERM, IN ORDER — replay this and you get the same result:\n`);
    const label2 = (q: number) => `${2026 + Math.floor((q + 1) / 4)}Q${((q + 1) % 4) + 1}`;
    let lastQ = -1;
    for (const t of trace) {
      const stamp = t.q === lastQ ? '        ' : label2(t.q).padEnd(8);
      lastQ = t.q;
      if (t.kind === 'news') {
        console.log(`    ${stamp} NEWS  ${t.label}`);
        console.log(`             -> ${t.optionLabel}${t.defaulted ? '   [default kept]' : ''}`);
      } else {
        console.log(`    ${stamp} BILL  ${t.label} — ${t.optionLabel}` +
                    (t.discounted ? '   [discounted: dependency unmet]' : ''));
      }
    }
    // --- robustness: how often does this line survive the browser's fuel-price noise?
    const need2 = ['land_bridge_forced','utapao_restored','smr_both_units','semiconductor_programme',
                   'hsr_northeast_accelerated','eastern_hsr_proceeding',
                   'civil_service_shrinking','zero_corruption_act','anticorruption_enforcement','justice_reform_done'];
    let all3 = 0, no1 = 0, hbc = 0, sad = 0;
    const TRIALS = 300;
    for (let t = 0; t < TRIALS; t++) {
      const r3 = rng(90001 + t * 131);
      const path = Array.from({ length: Q }, () => 1.5 + (r3() - 0.5) * 3);
      const rr = evaluate(coalition, bestG!, path);
      const okNo1 = rr.realGrowth > 3 && rr.pot > 3 && rr.inv > 20 && rr.set > 2500;
      const okHbc = rr.debt <= rr.ceiling && rr.risk < 0.25 && rr.pb > -4 && rr.reform > 60 && !rr.fell;
      const okSad = rr.missing.length === 0 && !rr.fell;
      if (okNo1) no1++; if (okHbc) hbc++; if (okSad) sad++;
      if (okNo1 && okHbc && okSad) all3++;
    }
    const pc = (n: number) => `${(100 * n / TRIALS).toFixed(0)}%`;
    console.log(`\n  ROBUSTNESS across ${TRIALS} random fuel-price paths (what the browser actually rolls):`);
    console.log(`    Thailand Number One   ${pc(no1)}`);
    console.log(`    Horse before the Cart ${pc(hbc)}`);
    console.log(`    Said and Done         ${pc(sad)}   (election not re-tested)`);
    console.log(`    ALL THREE             ${pc(all3)}`);

    // A card the line never touches does not appear in the timeline above, which
    // makes "deliberately declined" look identical to "not mentioned". A player
    // replaying this will fill the empty quarters — every reasonable player does —
    // and two extra megaprojects are worth about a point of primary balance, which
    // is enough to lose Horse before the Cart. So say it explicitly.
    const played = new Set(executed.map((m: any) => m.card));
    const untouched = cardIds.filter(id => !played.has(id));
    if (untouched.length) {
      console.log(`\n  LEFT ON THE DESK — do NOT play these, the line does not survive them:\n`);
      for (const id of untouched) {
        const c = cat.policies.find((x: any) => x.id === id);
        console.log(`    ${c.name}`);
      }
    }

    const news = trace.filter(t => t.kind === 'news');
    console.log(`\n  ${news.length} news items, ${news.filter(t => !t.defaulted).length} answered against ` +
                `the default; ${executed.length} bills taken, ${untouched.length} cards deliberately untouched.`);
    console.log();
  }
}
