/**
 * How two reference terms compare with the IMF baseline in config/.
 *
 *   passive   no cards; every news item answered with its do-nothing option
 *             (or its first legal one).
 *   imf       the same, except the government does what the IMF's October
 *             2026 forecast assumes: it issues the 400-billion-baht energy
 *             decree and spends both tranches as planned.
 *
 * Nothing is changed. The headline is fitted to the August 2026 WEO
 * (BASELINE_ALIGN in engine/src/browser.ts) and aligned only for the price
 * revision of the current vintage (PRICE_ALIGN in engine/src/weo.ts).
 *
 *   python3 scripts/build_weo.py && python3 scripts/build_ui_data.py
 *   npx --prefix engine tsx scripts/passive_check.ts
 */
import { BrowserGame, COALITIONS } from '../engine/src/browser.js';
import { IMF_BASELINE_2030, IMF_PATH, PRICE_ALIGN, WEO_SOURCE } from '../engine/src/weo.js';

const IMF_CHOICES: Record<string, string> = { energy_decree_400bn: 'issue', energy_decree_ruling: 'transition' };
const ids = (COALITIONS as any).options.filter((o: any) => o.available).map((o: any) => o.id);

function term(id: string, imf: boolean): number {
  const g: any = new BrowserGame(id);
  g.openTurn();
  for (let q = 0; q < 16; q++) {
    while (g.pending.length) {
      const e = g.pending[0];
      const want = imf ? IMF_CHOICES[e.id] : undefined;
      const o = (want && e.options.find((o: any) => o.id === want))
        ?? e.options.find((o: any) => o.passive && !o.unavailable) ?? e.options.find((o: any) => !o.unavailable);
      g.resolveEvent(e.id, o.id);
    }
    const r = g.endTurn();
    if (!r.ok || r.fallen || r.snap) { console.log(`${id}: term stopped early`, r); break; }
    if (g.quarter < 16) g.openTurn();
  }
  return g.headline();
}

const sign = (n: number) => (n >= 0 ? '+' : '') + n.toFixed(0);
console.log(`${WEO_SOURCE}: path ${IMF_PATH.map(v => v.toFixed(0)).join(' → ')}; price alignment ${PRICE_ALIGN.toFixed(4)}\n`);
for (const [label, imf] of [['passive', false], ['imf', true]] as const) {
  const heads = ids.map((id: string) => term(id, imf));
  const mean = heads.reduce((a: number, b: number) => a + b, 0) / heads.length;
  console.log(`${label.padEnd(8)} ${ids.map((id: string, i: number) => `${id} ${heads[i].toFixed(0)}`).join('  ')}  →  ${sign(mean - IMF_BASELINE_2030)} against ${IMF_BASELINE_2030}`);
}
