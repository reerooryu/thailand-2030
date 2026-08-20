/**
 * Run a legislative agenda through each coalition and see what survives.
 * This is the join between POLITICS.md and the policy catalogue.
 */
import { formCoalition, band } from './politics.js';
import { attempt, aggregate, availableCards, applyFlags, initialFlags, type Enacted } from './policies.js';
import { loadCoalitions, loadPolicies } from './loaders.js';
import { runScenario, type Strategy } from './scenario.js';
import { paramsFor } from './prologue.js';

const cfg = loadCoalitions();
const cat = loadPolicies();

/** A reformist agenda. Land Bridge is scrapped, which unlocks the rail link;
 *  the Eastern HSR concession is terminated, which unlocks conventional rail. */
const AGENDA: Record<string, string> = {
  land_bridge: 'scrap',
  chumphon_ranong_rail: 'build',
  eastern_hsr: 'terminate',
  eastern_standard_rail: 'build',
  hsr_northeast_china: 'phase1_only',
  vat_reform: 'phased',
  super_licence: 'full',
  oecd_accession: 'accelerate',
  negative_income_tax: 'full',
  thai_chuay_thai: 'targeted',
  tisa: 'equalised',
  th_ai_passport: 'domestic',
};

/** A populist agenda: build everything, tax nothing. */
const POPULIST: Record<string, string> = {
  land_bridge: 'proceed',
  eastern_hsr: 'amend',
  hsr_northeast_china: 'accelerate',
  vat_reform: 'hold',
  super_licence: 'none',
  oecd_accession: 'stall',
  negative_income_tax: 'transfers_only',
  thai_chuay_thai: 'full',
  tisa: 'launch',
  th_ai_passport: 'proceed',
};

/** Straight down the middle: the published government plan on everything. */
const OFFICIAL: Record<string, string> = {
  land_bridge: 'proceed',
  eastern_hsr: 'amend',
  hsr_northeast_china: 'accelerate',
  vat_reform: 'phased',
  super_licence: 'licence_only',
  oecd_accession: 'steady',
  negative_income_tax: 'full',
  thai_chuay_thai: 'full',
  tisa: 'launch',
  th_ai_passport: 'proceed',
};

function runAgenda(coalitionId: string, agenda: Record<string, string>, label: string) {
  const ps = formCoalition(cfg, coalitionId);
  const enacted: Enacted[] = [];
  const failed: string[] = [];
  const lines: string[] = [];
  let flags = initialFlags(cat);
  const unlocked: string[] = [];

  // Iterate to a fixed point: enacting a card can unlock a successor, which can
  // itself be enacted in the same session.
  for (let pass = 0; pass < 4; pass++) {
    const before = flags.size;
    for (const card of availableCards(cat, flags, 99)) {
      if (enacted.some(e => e.card.id === card.id) || failed.includes(card.name)) continue;
      const choice = agenda[card.id];
      if (!choice) continue;
      const r = attempt(ps, card, choice);
      const opt = r.option;
      if (r.passed) {
        enacted.push({ card, option: opt });
        const wasGated = (card.requires ?? []).length > 0;
        if (wasGated) unlocked.push(card.name);
        flags = applyFlags(flags, opt);
        const how = r.executive ? 'executive' : `${r.result!.yes} yes, +${r.result!.margin}`;
        lines.push(`    PASS${wasGated ? '*' : ' '} ${card.name} — ${opt.label}  (${how})`);
      } else {
        failed.push(card.name);
        lines.push(`    FAIL  ${card.name} — ${opt.label}  (${r.result!.yes} yes, ${-r.result!.margin} short)`);
      }
    }
    if (flags.size === before) break;
  }

  const agg = aggregate(enacted);
  const strat: Strategy = {
    name: `${coalitionId}/${label}`, describe: label,
    policy: (q) => ({
      capitalSpend: 6.1 + agg.capitalSpend * Math.min(1, (q + 1) / 6),
      govConsumption: 16.7,
      transfers: agg.transfers * Math.min(1, (q + 1) / 4),
      taxRate: 21.1 + agg.taxRate * Math.min(1, (q + 1) / 6),
      reformIndex: agg.reformIndex * (ps.effects.reformCapacity ?? 0.6),
    }),
  };
  const params = paramsFor(ps);
  params.executionCapital += agg.executionBonus;
  const res = runScenario(strat, params);
  return { ps, lines, failed, agg, res, unlocked, flags };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('=== LEGISLATIVE AGENDA BY COALITION ===\n');
  console.log(`${cat.policies.length} policy cards, ${cat.policies.reduce((a, p) => a + p.options.length, 0)} options.\n`);

  for (const [label, agenda] of
       [['REFORMIST', AGENDA], ['OFFICIAL PLAN', OFFICIAL], ['POPULIST', POPULIST]] as const) {
    console.log(`\n############ ${label} AGENDA ############`);
    for (const o of cfg.options.filter(o => o.available)) {
      const { lines, failed, agg, res, unlocked } = runAgenda(o.id, agenda, label);
      console.log(`\n  ${o.name}`);
      lines.forEach(l => console.log(l));
      console.log(`    -> ${failed.length} blocked` +
                  `${failed.length ? ': ' + failed.join(', ') : ''}` +
                  `${unlocked.length ? ' | unlocked: ' + unlocked.join(', ') : ''}`);
      console.log(`    -> reform effort ${agg.reformIndex}, capital +${agg.capitalSpend.toFixed(2)}pp, ` +
                  `transfers +${agg.transfers.toFixed(2)}pp, revenue ${agg.taxRate >= 0 ? '+' : ''}${agg.taxRate.toFixed(2)}pp`);
      console.log(`    -> 2030: headline ${res.headline.toFixed(0)}, legacy ${res.legacy.toFixed(2)}%, ` +
                  `debt ${res.debtGdp2030.toFixed(1)}%${res.breachedCeiling ? ' BREACH' : ''}`);
    }
  }
}
