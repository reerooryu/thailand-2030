/**
 * Turn loop demonstration: the Land Bridge consequence chain.
 *
 * Shows the intended flow — a card is played, an event fires as a consequence
 * two quarters later, the turn blocks until it is resolved, and the resolution
 * moves opinion and flags in ways that gate what comes next.
 */
import { formCoalition, band } from './politics.js';
import { availableCards, applyFlags, initialFlags, attempt } from './policies.js';
import { scheduleFrom, due, resolve, makeRng, type Scheduled } from './events.js';
import { loadCoalitions, loadPolicies, loadEvents } from './loaders.js';

const cfg = loadCoalitions();
const cat = loadPolicies();
const events = loadEvents();

interface Choice { quarter: number; card: string; option: string; }

function play(coalitionId: string, script: Choice[], eventChoices: Record<string, string>, seed = 7) {
  const ps = formCoalition(cfg, coalitionId);
  let opinion = { ...ps.opinion };
  let flags = initialFlags(cat);
  let scheduled: Scheduled[] = [];
  const firedIds = new Set<string>();
  const rng = makeRng(seed);
  const state: Record<string, number> = { debtGdp: 64.7 };

  console.log(`\nCoalition: ${ps.coalition.join(' + ')}`);
  console.log(`Opening opinion: ${fmt(opinion)}\n`);

  for (let q = 0; q < 8; q++) {
    const label = quarterLabel(q);
    const acted = script.filter(c => c.quarter === q);
    const { fired, remaining } = due(events, scheduled, q, state, flags, rng, firedIds);
    scheduled = remaining;

    if (!acted.length && !fired.length) continue;
    console.log(`── ${label} ${'─'.repeat(46 - label.length)}`);

    for (const c of acted) {
      const card = availableCards(cat, flags).find(x => x.id === c.card);
      if (!card) { console.log(`   (${c.card} not in the deck this quarter)`); continue; }
      const r = attempt(ps, card, c.option);
      if (!r.passed) { console.log(`   BILL FAILS  ${card.name} — ${r.option.label}`); continue; }
      flags = applyFlags(flags, r.option);
      scheduled = scheduleFrom(scheduled, events, c.card, c.option, q);
      console.log(`   ENACTED     ${card.name} — ${r.option.label}`);
      if (r.option.flavour) console.log(`               "${r.option.flavour}"`);
      const sched = scheduled.filter(s => s.because === `${c.card}/${c.option}`);
      for (const s of sched) console.log(`               ⚡ schedules "${s.eventId}" for ${quarterLabel(s.dueQuarter)}`);
    }

    for (const e of fired) {
      firedIds.add(e.id);
      console.log(`\n   ▓ NEWS — ${e.headline}`);
      console.log(`   ${wrap(e.body, 68, '   ')}`);
      console.log(`   ${e.blocking ? '*** TURN BLOCKED until resolved ***' : ''}`);
      for (const o of e.options) console.log(`     [ ] ${o.label}`);
      const pick = eventChoices[e.id] ?? e.options[0].id;
      const opt = e.options.find(o => o.id === pick)!;
      console.log(`\n     >> ${opt.label}`);
      if (opt.flavour) console.log(`        "${opt.flavour}"`);
      const before = { ...opinion };
      const res = resolve(opinion, flags, opt);
      opinion = res.opinion; flags = res.flags;
      const moves = Object.entries(opt.opinion ?? {})
        .map(([k, d]) => `${k} ${before[k]}→${opinion[k]} (${d > 0 ? '+' : ''}${d})`).join(', ');
      if (moves) console.log(`        opinion: ${moves}`);
      if (opt.sets?.length) console.log(`        sets: ${opt.sets.join(', ')}`);
      if (opt.clears?.length) console.log(`        clears: ${opt.clears.join(', ')}`);
      console.log();
    }
  }

  console.log(`Final opinion: ${fmt(opinion)}`);
  const newlyAvailable = availableCards(cat, flags).map(c => c.id);
  console.log(`Deck now contains: ${newlyAvailable.join(', ')}`);
  return { opinion, flags };
}

const fmt = (o: Record<string, number>) =>
  Object.entries(o).filter(([k]) => k !== 'Bhumjaithai')
    .map(([k, v]) => `${k} ${v}${band(cfg.bands, v).label[0]}`).join('  ');
const quarterLabel = (q: number) => {
  const y = 2026 + Math.floor((q + 1) / 4);
  return `${y}Q${((q + 1) % 4) + 1}`;
};
function wrap(s: string, w: number, pad: string) {
  const out: string[] = []; let line = '';
  for (const word of s.split(' ')) {
    if ((line + word).length > w) { out.push(line); line = ''; }
    line += word + ' ';
  }
  out.push(line);
  return out.join('\n' + pad);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('=== TURN LOOP — THE LAND BRIDGE CHAIN ===');
  console.log('\n########## PATH A: delay first, then push, then force it through');
  play('pheuthai',
    [{ quarter: 0, card: 'land_bridge', option: 'postpone' },
     { quarter: 2, card: 'land_bridge', option: 'proceed' }],
    { land_bridge_opposition: 'force' });

  console.log('\n\n########## PATH B: push immediately, then climb down to the rail link');
  play('pheuthai',
    [{ quarter: 0, card: 'land_bridge', option: 'proceed' },
     { quarter: 3, card: 'chumphon_ranong_rail', option: 'build' }],
    { land_bridge_opposition: 'pull_back' });
}
