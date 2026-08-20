/**
 * A full 16-turn playthrough — the House elected in February 2026 expires in 2030Q1. Verifies the three fixes end to end:
 *   1. event effects reach the engine's fiscal stance
 *   2. deferred cards genuinely return
 *   3. reform dependencies discount unmet options
 */
import { Game } from './game.js';
import type { Exog } from './types.js';

const EXOG: Exog = { worldDemandGrowth: 3.0, globalActivity: 10.0, energyInflation: 1.5, shock: 0 };

interface Move { q: number; card: string; option: string; }

function run(name: string, coalition: string, moves: Move[], eventPolicy: Record<string, string>, seed = 20260201) {
  const g = new Game(coalition, seed);
  console.log(`\n${'='.repeat(66)}\n${name}\n  ${g.ps.coalition.join(' + ')}\n${'='.repeat(66)}`);

  for (let q = 0; q < 16; q++) {
    const pending = g.openTurn();

    for (const e of pending.slice()) {
      const pick = eventPolicy[e.id] ?? e.options[0].id;
      console.log(`  ${g.label}  ▓ ${e.headline}`);
      console.log(`          BLOCKED → ${e.options.find(o => o.id === pick)!.label}`);
      g.resolveEvent(e.id, pick);
    }

    for (const m of moves.filter(m => m.q === q)) {
      const before = g.log.length;
      g.playCard(m.card, m.option);
      for (const l of g.log.slice(before)) console.log(`  ${g.label}  ${l.text}`);
    }
    const notes = g.log.filter(l => l.quarter === q && l.kind === 'note');
    for (const nn of notes) console.log(`  ${g.label}  ↩ ${nn.text}`);

    g.endTurn(EXOG);
  }

  const s = g.score();
  console.log(`\n  RESULT  headline ${s.headline.toFixed(0)}  legacy ${s.legacy.toFixed(2)}%  ` +
              `debt ${s.debtGdp.toFixed(1)}%  invRate ${s.invRate.toFixed(1)}%  approval ${s.approval}`);
  console.log(`  opinion  ${Object.entries(s.opinion).filter(([k]) => k !== 'Bhumjaithai')
    .map(([k, v]) => `${k} ${v}${g.bandOf(k).label[0]}`).join('  ')}`);
  console.log(`  coalition seats ${g.coalitionSeats()}${s.lostConfidence ? '  *** CONFIDENCE LOST ***' : ''}`);
  console.log(`  final stance  capital +${g.stance.capitalSpend.toFixed(2)}  transfers +${g.stance.transfers.toFixed(2)}  ` +
              `tax +${g.stance.taxRate.toFixed(2)}  reform ${g.stance.reformIndex.toFixed(0)}  exec +${g.stance.executionBonus.toFixed(3)}`);
  return g;
}

// --- A: digitise first, so the dependent reforms land at full strength
run('A — SEQUENCED: digital government before the reforms that need it', 'pheuthai',
  [{ q: 0, card: 'digital_government', option: 'accelerate' },
   { q: 2, card: 'super_licence', option: 'full' },
   { q: 4, card: 'civil_service_reform', option: 'full' },
   { q: 6, card: 'oecd_accession', option: 'accelerate' },
   { q: 8, card: 'vat_reform', option: 'phased' }],
  { civil_service_backlash: 'hold_firm', energy_shock: 'targeted', debt_ceiling_warning: 'consolidate' });

// --- B: same reforms, wrong order — dependencies unmet, effects discounted
run('B — UNSEQUENCED: same cards, digitisation last', 'pheuthai',
  [{ q: 0, card: 'super_licence', option: 'full' },
   { q: 2, card: 'civil_service_reform', option: 'full' },
   { q: 6, card: 'oecd_accession', option: 'accelerate' },
   { q: 8, card: 'vat_reform', option: 'phased' },
   { q: 12, card: 'digital_government', option: 'accelerate' }],
  { civil_service_backlash: 'hold_firm', energy_shock: 'targeted', debt_ceiling_warning: 'consolidate' });

// --- C: the Land Bridge delay, to prove the card genuinely returns
run('C — DEFERRAL: delay the Land Bridge, then answer for it', 'pheuthai',
  [{ q: 0, card: 'land_bridge', option: 'postpone' },
   { q: 2, card: 'land_bridge', option: 'proceed' },
   { q: 6, card: 'digital_government', option: 'accelerate' }],
  { land_bridge_opposition: 'pull_back', energy_shock: 'subsidise', debt_ceiling_warning: 'raise_ceiling' });
