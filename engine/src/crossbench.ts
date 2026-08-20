/** Tuning harness: how does opposition warmth change the VAT vote? */
import { formCoalition, vote, band } from './politics.js';
import { loadCoalitions } from './loaders.js';

const cfg = loadCoalitions();
// VAT phased: Democrat likes it, Kla Tham red-lines it, Pheu Thai soft-opposes.
const VAT = { Democrat: 0.6, "People's": 0.2, 'Pheu Thai': -0.3, Others: 0.1, 'Kla Tham': -0.5 };
const OECD = { "People's": 0.8, Democrat: 0.7, 'Pheu Thai': 0.0, 'Kla Tham': -0.7, Others: -0.8 };

function trial(name: string, coalitionId: string, fit: Record<string, number>,
               tweak: Record<string, number> = {}) {
  const ps = formCoalition(cfg, coalitionId);
  for (const [k, v] of Object.entries(tweak)) ps.opinion[k] = v;
  const v = vote(ps, fit);
  const opp = Object.entries(ps.opinion).filter(([k]) => !ps.coalition.includes(k) && k !== 'Bhumjaithai')
    .map(([k, o]) => `${k} ${o}${band(cfg.bands, o).label[0]}`).join(' ');
  const def = Object.entries(v.defectors).map(([k, n]) => `${k}+${n}`).join(' ') || 'none';
  console.log(`  ${name.padEnd(30)} ${String(v.yes).padStart(3)} yes  ` +
    `${v.passed ? 'PASS +' + v.margin : 'fail  ' + v.margin}  |  crossbench ${def.padEnd(28)} | ${opp}`);
}

console.log('=== VAT phased, Pheu Thai + Others coalition ===');
trial('as the run left it', 'pheuthai', VAT);
trial('opposition warmed +10', 'pheuthai', VAT, { 'Kla Tham': 45, Democrat: 51, "People's": 16 });
trial('opposition warmed +20', 'pheuthai', VAT, { 'Kla Tham': 55, Democrat: 61, "People's": 26 });
trial('Kla Tham neutral only', 'pheuthai', VAT, { 'Kla Tham': 50 });
trial('everyone hostile', 'pheuthai', VAT, { 'Kla Tham': 8, Democrat: 12, "People's": 3 });

console.log('\n=== VAT phased, conservative coalition (the 4-short case) ===');
trial('as the run left it', 'conservative', VAT);
trial('Pheu Thai kept neutral 48', 'conservative', VAT, { 'Pheu Thai': 48 });
trial('Pheu Thai warm 62', 'conservative', VAT, { 'Pheu Thai': 62 });

console.log('\n=== OECD accession, conservative coalition (39 short) ===');
trial('as the run left it', 'conservative', OECD);
trial('opposition warmed', 'conservative', OECD, { "People's": 40, Democrat: 60, 'Pheu Thai': 55 });
