/** Which term degrades the output gap fit? Ablation over the IS block. */
import { runBacktest } from './backtest.js';
import { BASE } from './params.js';
import type { Params } from './types.js';

const variants: [string, Partial<Params>][] = [
  ['literature (as shipped)', {}],
  ['no monetary term', { isRealRate: 0 }],
  ['no fiscal terms', { multCapital: 0, multGovCons: 0, multTransfer: 0, multTax: 0 }],
  ['no monetary, no fiscal', { isRealRate: 0, multCapital: 0, multGovCons: 0, multTransfer: 0, multTax: 0 }],
  ['monetary at old fitted -0.05', { isRealRate: -0.05 / 0.65 }],
  ['fiscal at aggregate low end 0.25', { multCapital: 0.25, multGovCons: 0.25, multTransfer: 0.25, multTax: -0.25 }],
  ['fiscal midpoints, no impairment', { debtImpairSlope: 0, debtImpairFloor: 1 }],
  ['capital only (others 0)', { multGovCons: 0, multTransfer: 0, multTax: 0 }],
  ['govcons only (others 0)', { multCapital: 0, multTransfer: 0, multTax: 0 }],
];

console.log('variant                              gap RMSE   gap corr   loss');
for (const [name, over] of variants) {
  const r = runBacktest({ ...BASE, ...over });
  console.log(
    `  ${name.padEnd(34)}${r.rmse.gap.toFixed(3).padStart(8)}` +
    `${r.correlation.gap.toFixed(3).padStart(11)}` +
    `${r.loss.toFixed(3).padStart(9)}`);
}
