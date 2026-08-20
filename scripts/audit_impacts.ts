/**
 * Impact audit. Measures what every card option and every news option ACTUALLY
 * does to the four scores, by simulating a full term with that single decision
 * changed and differencing against a passive baseline.
 *
 * This exists because the displayed effect numbers are inputs, not outcomes:
 * `reform effort +55` is a level that accumulates into the reform stock at ~6%
 * a quarter, `capitalSpend +0.35` is a share of GDP whose payoff is gated by a
 * 16-quarter gestation pipeline, and neither number tells the player what the
 * decision is worth. This does.
 *
 * Usage: npx tsx scripts/audit_impacts.ts [> AUDIT_IMPACTS.md]
 */
import { Game } from '../engine/src/game.js';
import { loadPolicies, loadEvents } from '../engine/src/loaders.js';

const EXOG: any = { worldDemandGrowth: 3, globalActivity: 10, energyInflation: 1.5, shock: 0 };
const SEED = 20260201;
const Q = 16;
const COALITION = 'pheuthai';

type Pick = { card?: string; option?: string; atQ?: number; event?: string; eventOption?: string };

function run(pick: Pick, unlock: string[] = []) {
  const g: any = new Game(COALITION, SEED);
  for (const f of unlock) g.flags.add(f);
  let played = false; let why = '';
  for (let q = 0; q < Q; q++) {
    for (const e of g.openTurn().slice()) {
      const legal = e.options.filter((o: any) => !o.unavailable);
      const want = pick.event === e.id ? legal.find((o: any) => o.id === pick.eventOption) : null;
      g.resolveEvent(e.id, (want ?? legal[0]).id);
    }
    if (pick.card && !played && q >= (pick.atQ ?? 0)) {
      // playCard REPORTS failure rather than throwing — an earlier version of
      // this audit treated "not in the deck" and "the bill was defeated" as
      // "this option does nothing", which is how a third of the catalogue came
      // to look inert.
      const before = g.log.length;
      const ok = g.playCard(pick.card, pick.option);
      if (ok) played = true;
      else why = g.log.slice(before).map((l: any) => l.text).join('; ') || 'unavailable';
    }
    g.endTurn(EXOG);
  }
  const s: any = g.score();
  return { fired: g.firedEvents, h: s.headline, leg: s.legacy, debt: s.debtGdp, inv: s.invRate,
           ap: g.approval, reform: g.state.reformStock, played, why };
}

const base = run({});
const d = (a: number, b: number, p = 1) => {
  const v = a - b; const t = v.toFixed(p);
  return (v > 0 ? '+' + t : t);
};
const cat = loadPolicies(); const events = loadEvents() as any[];

console.log(`# Impact audit\n`);
console.log(`Every option simulated over a full 2026Q2–2030Q1 term against a passive`);
console.log(`baseline, coalition Bhumjaithai + Pheu Thai + Others, seed ${SEED}.`);
console.log(`Prerequisite flags are granted so gated options can be measured on their`);
console.log(`own merits rather than showing as zero.\n`);
console.log(`**Passive baseline** — headline ${base.h.toFixed(0)}, legacy ${base.leg.toFixed(2)}%, ` +
            `debt ${base.debt.toFixed(1)}%, investment ${base.inv.toFixed(1)}%, ` +
            `approval ${base.ap.toFixed(1)}, reform stock ${base.reform.toFixed(1)}.\n`);

const UNLOCK = ['nesdp14_full','semiconductor_board_seen','sovereign_ai','vat_raised',
  'digital_government_mandated','pax_silica','domestic_ai_capacity','revenue_secured',
  'super_licence_done','anticorruption_enforcement','land_bridge_delayed'];

console.log(`## A note on units, because the card faces mislead\n`);
console.log(`\`reform effort +55\` on the OECD card is not 55 points of reform stock.`);
console.log(`Effort is a LEVEL. It is scaled by the coalition's reform capacity (0.55 to`);
console.log(`0.75), then accumulates into the stock at about 6% a quarter against 1.5%`);
console.log(`decay. Accelerating OECD accession at the start of a term with a 0.7-capacity`);
console.log(`coalition therefore contributes about **+35 to the reform stock by 2030**, not`);
console.log(`+55 — which is why a term that passed several large reforms finishes around`);
console.log(`60 to 75 rather than in the hundreds. The Δreform stock column below is the`);
console.log(`number that actually matters.\n`);
console.log(`## Policy cards\n`);
console.log(`| Card | Option | Δheadline | Δlegacy | Δdebt | Δinvestment | Δapproval | Δreform stock | note |`);
console.log(`|---|---|--:|--:|--:|--:|--:|--:|---|`);
const flat: any[] = [];
for (const c of cat.policies as any[]) {
  for (const o of c.options) {
    if (o.unavailable) { console.log(`| ${c.name} | ${o.label} | — | — | — | — | — | — | unselectable by design |`); continue; }
    let r = run({ card: c.id, option: o.id, atQ: c.scriptedQuarter ?? 0 }, UNLOCK);
    const note = !r.played ? (/not in the deck/.test(r.why) ? 'not in this coalition\'s deck'
                            : /locked/.test(r.why) ? 'locked by prerequisite'
                            : r.why.replace(/\|/g, '/') || 'unavailable')
      : (Math.abs(r.h - base.h) < 1 && Math.abs(r.leg - base.leg) < 0.005 &&
         Math.abs(r.ap - base.ap) < 0.5 && Math.abs(r.reform - base.reform) < 0.5)
        ? '**no measurable effect**' : '';
    console.log(`| ${c.name} | ${o.label} | ${d(r.h, base.h, 0)} | ${d(r.leg, base.leg, 2)} | ` +
      `${d(r.debt, base.debt, 1)} | ${d(r.inv, base.inv, 2)} | ${d(r.ap, base.ap, 1)} | ` +
      `${d(r.reform, base.reform, 1)} | ${note} |`);
    if (r.played) flat.push({ what: `${c.name} — ${o.label}`, ...r });
  }
}

console.log(`\n## News\n`);
console.log(`| Event | Option | Δheadline | Δlegacy | Δdebt | Δinvestment | Δapproval | note |`);
console.log(`|---|---|--:|--:|--:|--:|--:|---|`);
for (const e of events) {
  const legal = e.options.filter((o: any) => !o.unavailable);
  const ref = run({ event: e.id, eventOption: legal[0].id });
  for (const o of e.options) {
    if (o.unavailable) { console.log(`| ${e.headline} | ${o.label} | — | — | — | — | — | unselectable by design |`); continue; }
    const r = run({ event: e.id, eventOption: o.id });
    const same = o.id === legal[0].id;
    // A conditional event that never fires in a passive term measures as zero,
    // which is not the same as an option that does nothing. Say which.
    const note = !r.fired.has(e.id) ? 'conditional — does not fire in a passive term'
               : same ? 'default' : '';
    console.log(`| ${e.headline} | ${o.label} | ${d(r.h, base.h, 0)} | ${d(r.leg, base.leg, 2)} | ` +
      `${d(r.debt, base.debt, 1)} | ${d(r.inv, base.inv, 2)} | ${d(r.ap, base.ap, 1)} | ` +
      `${note} |`);
  }
}

console.log(`\n## Ranking — what actually moves the Legacy score\n`);
flat.sort((a, b) => (b.leg - a.leg));
console.log(`| Rank | Decision | Δlegacy | Δdebt |`);
console.log(`|---|---|--:|--:|`);
flat.slice(0, 12).forEach((f, i) =>
  console.log(`| ${i + 1} | ${f.what} | ${d(f.leg, base.leg, 2)} | ${d(f.debt, base.debt, 1)} |`));

console.log(`\n## Ranking — cost in debt per point of legacy\n`);
const eff = flat.filter(f => f.leg - base.leg > 0.02)
  .map(f => ({ ...f, ratio: (f.debt - base.debt) / (f.leg - base.leg) }))
  .sort((a, b) => a.ratio - b.ratio);
console.log(`| Decision | Δlegacy | Δdebt | debt per legacy point |`);
console.log(`|---|--:|--:|--:|`);
for (const f of eff.slice(0, 12))
  console.log(`| ${f.what} | ${d(f.leg, base.leg, 2)} | ${d(f.debt, base.debt, 1)} | ${f.ratio.toFixed(1)} |`);
