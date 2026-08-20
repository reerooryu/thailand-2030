/** Play the game deliberately, logging what a thinking player would see. */
import { Game } from './game.js';
import { vote } from './politics.js';
import type { Exog } from './types.js';

const EXOG: Exog = { worldDemandGrowth: 3.0, globalActivity: 10.0, energyInflation: 1.5, shock: 0 };

type Plan = { q: number; card: string; opt: string }[];

function play(name: string, coalition: string, plan: Plan, ev: Record<string, string>, seed = 20260201) {
  const g = new Game(coalition, seed);
  console.log(`\n${'━'.repeat(72)}\n${name}   [${g.ps.coalition.join(' + ')}]\n${'━'.repeat(72)}`);
  const missed: string[] = [];

  for (let q = 0; q < 19; q++) {
    const pend = g.openTurn();
    const acts = plan.filter(p => p.q === q);
    if (pend.length || acts.length) console.log(`\n  ── ${g.label} ──`);

    for (const e of pend.slice()) {
      const pick = ev[e.id] ?? e.options[0].id;
      const o = e.options.find(x => x.id === pick)!;
      console.log(`   NEWS  ${e.headline}`);
      console.log(`         → ${o.label}`);
      g.resolveEvent(e.id, pick);
    }
    for (const a of acts) {
      const before = g.log.length;
      const ok = g.playCard(a.card, a.opt);
      const line = g.log.slice(before).map(l => l.text).join('; ');
      console.log(`   ${ok ? 'PASS' : 'FAIL'}  ${line || a.card + '/' + a.opt}`);
      if (!ok) missed.push(`${g.label} ${a.card}`);
    }
    if (acts.length > g.actionCap) console.log(`   (over the cap — ${acts.length} attempted)`);
    g.endTurn(EXOG);
  }

  const s = g.score();
  const unplayed = g.deck().map(c => c.name);
  console.log(`\n   RESULT  headline ${s.headline.toFixed(0)}  legacy ${s.legacy.toFixed(2)}%  ` +
              `debt ${s.debtGdp.toFixed(1)}%  inv ${s.invRate.toFixed(1)}%  approval ${s.approval}`);
  console.log(`   opinion ${Object.entries(s.opinion).filter(([k]) => k !== 'Bhumjaithai')
    .map(([k, v]) => `${k} ${v}`).join('  ')}`);
  if (missed.length) console.log(`   defeated: ${missed.join(', ')}`);
  if (unplayed.length) console.log(`   never reached: ${unplayed.join(', ')}`);
  return s;
}

// ── 1. What I'd actually try first: sequence the enablers, then reform.
play('RUN 1 — sequence the enablers', 'pheuthai', [
  { q: 0, card: 'digital_government', opt: 'accelerate' },
  { q: 0, card: 'vat_reform', opt: 'phased' },
  { q: 1, card: 'super_licence', opt: 'full' },
  { q: 2, card: 'civil_service_reform', opt: 'full' },
  { q: 3, card: 'oecd_accession', opt: 'accelerate' },
  { q: 4, card: 'negative_income_tax', opt: 'full' },
  { q: 5, card: 'land_bridge', opt: 'postpone' },
  { q: 6, card: 'eastern_hsr', opt: 'terminate' },
  { q: 8, card: 'hsr_northeast_china', opt: 'phase1_only' },
  { q: 10, card: 'tisa', opt: 'equalised' },
  { q: 12, card: 'th_ai_passport', opt: 'domestic' },
], { hormuz_energy_shock: 'strategic_reserve', constitutional_court_petition: 'reform_ballots',
     baht_tourism_pressure: 'decline', civil_service_backlash: 'narrow',
     debt_ceiling_warning: 'consolidate', energy_shock: 'targeted',
     eastern_hsr_arbitration: 'settle' });

// ── 1b. The same plan, but funded through the revenue package instead of VAT.
play('RUN 1b — fiscal branch via the revenue package', 'pheuthai', [
  { q: 0, card: 'digital_government', opt: 'accelerate' },
  { q: 1, card: 'revenue_mobilisation', opt: 'full' },
  { q: 1, card: 'super_licence', opt: 'full' },
  { q: 2, card: 'civil_service_reform', opt: 'full' },
  { q: 3, card: 'oecd_accession', opt: 'accelerate' },
  { q: 4, card: 'negative_income_tax', opt: 'full' },
  { q: 5, card: 'land_bridge', opt: 'postpone' },
  { q: 8, card: 'hsr_northeast_china', opt: 'phase1_only' },
  { q: 10, card: 'tisa', opt: 'equalised' },
], { hormuz_energy_shock: 'strategic_reserve', constitutional_court_petition: 'reform_ballots',
     baht_tourism_pressure: 'decline', civil_service_backlash: 'narrow',
     debt_ceiling_warning: 'consolidate', energy_shock: 'targeted',
     forced_consolidation: 'capital' });

// ── 1c. Both: package first, VAT later when relations allow.
play('RUN 1c — package first, VAT attempted late', 'pheuthai', [
  { q: 0, card: 'digital_government', opt: 'accelerate' },
  { q: 1, card: 'revenue_mobilisation', opt: 'full' },
  { q: 1, card: 'super_licence', opt: 'full' },
  { q: 2, card: 'civil_service_reform', opt: 'full' },
  { q: 3, card: 'oecd_accession', opt: 'accelerate' },
  { q: 4, card: 'negative_income_tax', opt: 'full' },
  { q: 9, card: 'vat_reform', opt: 'phased' },
  { q: 12, card: 'tisa', opt: 'equalised' },
], { hormuz_energy_shock: 'strategic_reserve', constitutional_court_petition: 'reform_ballots',
     baht_tourism_pressure: 'decline', civil_service_backlash: 'narrow',
     debt_ceiling_warning: 'consolidate', energy_shock: 'targeted',
     forced_consolidation: 'capital' });

// ── 2. Conservative coalition, same intent — how much can it even do?
play('RUN 2 — same plan, conservative coalition', 'conservative', [
  { q: 0, card: 'digital_government', opt: 'accelerate' },
  { q: 0, card: 'vat_reform', opt: 'phased' },
  { q: 1, card: 'super_licence', opt: 'full' },
  { q: 2, card: 'civil_service_reform', opt: 'full' },
  { q: 3, card: 'oecd_accession', opt: 'accelerate' },
  { q: 4, card: 'negative_income_tax', opt: 'full' },
  { q: 5, card: 'land_bridge', opt: 'postpone' },
], { hormuz_energy_shock: 'strategic_reserve', constitutional_court_petition: 'reform_ballots',
     baht_tourism_pressure: 'decline', civil_service_backlash: 'narrow',
     debt_ceiling_warning: 'consolidate', energy_shock: 'targeted' });

// ── 3. Play for approval and see what it costs.
play('RUN 3 — govern for the polls', 'pheuthai', [
  { q: 0, card: 'thai_chuay_thai', opt: 'full' },
  { q: 0, card: 'land_bridge', opt: 'proceed' },
  { q: 1, card: 'hsr_northeast_china', opt: 'accelerate' },
  { q: 2, card: 'tisa', opt: 'launch' },
  { q: 3, card: 'th_ai_passport', opt: 'proceed' },
  { q: 4, card: 'eastern_hsr', opt: 'amend' },
  { q: 6, card: 'negative_income_tax', opt: 'transfers_only' },
  { q: 8, card: 'vat_reform', opt: 'hold' },
], { hormuz_energy_shock: 'copayment', constitutional_court_petition: 'say_nothing',
     baht_tourism_pressure: 'pressure_bot', land_bridge_opposition: 'force',
     debt_ceiling_warning: 'raise_ceiling', energy_shock: 'subsidise' });
