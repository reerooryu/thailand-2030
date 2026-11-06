/**
 * Checks on the 2030 count. Run from the repo root after the data step:
 *   npx --prefix engine tsx scripts/election_check.ts
 *
 * 1. No swing reproduces the February 2026 House.
 * 2. A sweep of synthetic terms, from a collapse to a landslide, with and
 *    without the block vote and a 125-seat list, printed for eyeballing.
 */
import { runElection, PARTIES } from '../engine/src/election.js';

const seats = { Bhumjaithai: 191, "People's": 120, 'Pheu Thai': 74, 'Kla Tham': 58, Democrat: 21, Others: 35 };
const base = { seats, coalition: ['Bhumjaithai', 'Pheu Thai', 'Others'], baseline: 9399 };
const row = (e: ReturnType<typeof runElection>) => PARTIES.map(p => String(e.results.find(r => r.party === p)!.after).padStart(4)).join('');

const zero = runElection({ ...base, approval: 50, headline: 9399, realGrowth: 2.4,
  opinion: Object.fromEntries(PARTIES.map(p => [p, 50])) });
const want = [192, 120, 74, 58, 21, 35];
const got = PARTIES.map(p => zero.results.find(r => r.party === p)!.after);
const ok = got.every((v, i) => v === want[i]);
console.log(`no swing: ${got.join(' / ')} ${ok ? 'OK (2026 House, vacancy refilled)' : 'MISMATCH, want ' + want.join(' / ')}`);

console.log(`\n${'approval'.padEnd(10)}${'swing'.padStart(6)}  ${PARTIES.map(p => p.slice(0, 4).padStart(4)).join('')}   system`);
for (const appr of [25, 35, 45, 50, 55, 62, 70, 80, 90]) {
  for (const sys of [{}, { blockVote: true }, { listSeats: 125 }]) {
    const e = runElection({ ...base, ...sys, approval: appr, headline: 9399 + (appr - 50) * 25,
      realGrowth: 2.4 + (appr - 50) / 20, potentialGrowth: 2.4 + (appr - 50) / 50, setChange: (appr - 50) * 2,
      invRate: 18 + (appr - 50) / 10, reformStock: 40 + (appr - 50) / 2,
      opinion: { "People's": 25, 'Pheu Thai': 60, 'Kla Tham': 45, Democrat: 45, Others: 60 } });
    console.log(`${String(appr).padEnd(10)}${String(e.swing).padStart(6)}  ${row(e)}   ${e.system.constituencies}+${e.system.list}${e.system.blockVote ? ' block' : ''}  ${e.verdict}`);
  }
}
if (!ok) process.exit(1);
