/**
 * February 2026 — coalition formation, and what each choice does to the run.
 *
 * Wires the political layer into the engine: the coalition sets caps on
 * megaprojects and stimulus, a reform capacity multiplier, and a budget
 * execution bonus, then the same strategies are run under each.
 */
import { formCoalition, band, vote, type PoliticalState } from './politics.js';
import { loadCoalitions } from './loaders.js';
import { runScenario, type Strategy } from './scenario.js';
import { BASE } from './params.js';
import { applyGains } from './playability.js';
import { loadPlayability } from './loaders.js';
import type { Params } from './types.js';

const cfg = loadCoalitions();

/** Coalition effects fold into the engine parameters and the policy caps. */
export function paramsFor(ps: PoliticalState): Params {
  const p = applyGains(BASE, loadPlayability());
  const e = ps.effects;
  return {
    ...p,
    executionCapital: p.executionCapital + (e.executionBonus ?? 0),
    // agricultural support is politically potent and productivity-negative
    tfpTrendGrowth: p.tfpTrendGrowth - 0.04 * (e.agricultureSupport ?? 0),
    // education raises TFP, but on a horizon far beyond the run
    reformToTfp: p.reformToTfp * (1 + 0.15 * (e.educationPush ?? 0)),
  };
}

/** The strategy a competent government would actually run under this coalition,
 *  given its caps and its reform capacity. */
export function bestAvailableStrategy(ps: PoliticalState): Strategy {
  const e = ps.effects;
  const capCap = e.megaprojectCap ?? 8.0;
  const reformCap = (e.reformCapacity ?? 0.6) * 100;
  return {
    name: ps.coalitionId,
    describe: 'reform to capacity, capital to cap',
    policy: (q) => ({
      capitalSpend: 6.1 + Math.min(capCap - 6.1, q * 0.25),
      govConsumption: 16.7,
      transfers: 0,
      taxRate: 21.1,
      reformIndex: reformCap,
    }),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('=== FEBRUARY 2026 — COALITION FORMATION ===');
  console.log(`House 500, majority 251. Bhumjaithai holds 191 — 60 short.\n`);

  console.log('Opening opinion:');
  for (const [name, p] of Object.entries(cfg.parties)) {
    if (p.player) continue;
    const b = band(cfg.bands, p.opinion);
    console.log(`  ${name.padEnd(12)} ${String(p.seats).padStart(3)} seats   ` +
                `${String(p.opinion).padStart(3)}  ${b.label.padEnd(14)} ${b.note}`);
  }

  console.log('\n--- options ---');
  for (const o of cfg.options) {
    console.log(`\n[${o.available ? ' ' : 'X'}] ${o.name}  (${o.seats} seats, +${o.seats - 251})`);
    console.log(`    "${o.flavour}"`);
    if (!o.available) continue;
    console.log(`    ${o.describe}`);
    const deltas = Object.entries(o.opinion_delta)
      .filter(([, v]) => v !== 0)
      .map(([k, v]) => `${k} ${v > 0 ? '+' : ''}${v}`).join(', ');
    console.log(`    opinion: ${deltas}`);
  }

  console.log('\n\n=== OUTCOMES, 2026Q2 -> 2030Q4 ===');
  console.log('Each coalition running the best strategy its partners will tolerate.\n');
  console.log('coalition                        headline  legacy  inv rate  debt   reform');
  const results = cfg.options.filter(o => o.available).map(o => {
    const ps = formCoalition(cfg, o.id);
    const r = runScenario(bestAvailableStrategy(ps), paramsFor(ps));
    return { o, ps, r };
  });
  for (const { o, ps, r } of results) {
    console.log(`  ${o.name.padEnd(32)}${r.headline.toFixed(0).padStart(7)}` +
                `${r.legacy.toFixed(2).padStart(8)}%${r.invRateEnd.toFixed(1).padStart(9)}%` +
                `${r.debtGdp2030.toFixed(1).padStart(7)}${r.breachedCeiling ? '!' : ' '}` +
                `${((ps.effects.reformCapacity ?? 0) * 100).toFixed(0).padStart(7)}%`);
  }

  console.log('\n--- opinion after forming, and a reform bill put to the House ---');
  // structural reform: the People's Party likes it, Kla Tham and Others hate it
  const reformFit = { "People's": 0.7, 'Pheu Thai': -0.1, 'Kla Tham': -0.6,
                      Democrat: 0.5, Others: -0.4 };
  for (const { o, ps } of results) {
    const v = vote(ps, reformFit);
    const line = Object.entries(ps.opinion)
      .filter(([k]) => k !== 'Bhumjaithai')
      .map(([k, val]) => `${k} ${val}${band(cfg.bands, val).label[0]}`).join('  ');
    console.log(`\n  ${o.name}`);
    console.log(`    ${line}`);
    console.log(`    reform bill: ${v.yes} yes / ${v.no} no / ${v.abstain} abstain — ` +
                `${v.passed ? `PASSES by ${v.margin}` : `FAILS, ${-v.margin} short`}`);
  }
}
