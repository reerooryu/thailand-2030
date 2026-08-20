/**
 * Fit the parameters the panel cannot identify (MODEL.md §1) by minimising
 * backtest loss. Estimated parameters are LOCKED at their measured values.
 *
 * Nelder-Mead, deterministic, multi-start. Results are PROVISIONAL — these
 * coefficients are placeholders for literature values, and fitting them to the
 * backtest means the backtest is not an independent test of them.
 */
import { runBacktest } from './backtest.js';
import { BASE, FREE, BOUNDS, clampFree, withFree, freeOf } from './params.js';

function nelderMead(
  f: (x: number[]) => number,
  x0: number[],
  { step = 0.25, maxIter = 2000, tol = 1e-7 } = {},
): { x: number[]; fx: number } {
  const n = x0.length;
  let simplex = [x0.slice()];
  for (let i = 0; i < n; i++) {
    const p = x0.slice();
    p[i] += (Math.abs(p[i]) || 1) * step;
    simplex.push(p);
  }
  let fv = simplex.map(f);
  const order = () => {
    const ix = fv.map((v, i) => i).sort((a, b) => fv[a] - fv[b]);
    simplex = ix.map(i => simplex[i]);
    fv = ix.map(i => fv[i]);
  };
  order();
  for (let it = 0; it < maxIter; it++) {
    if (Math.abs(fv[n] - fv[0]) < tol) break;
    const centroid = new Array(n).fill(0);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) centroid[j] += simplex[i][j] / n;
    const worst = simplex[n];
    const refl = centroid.map((c, j) => c + 1.0 * (c - worst[j]));
    const fr = f(refl);
    if (fr < fv[0]) {
      const exp = centroid.map((c, j) => c + 2.0 * (c - worst[j]));
      const fe = f(exp);
      if (fe < fr) { simplex[n] = exp; fv[n] = fe; } else { simplex[n] = refl; fv[n] = fr; }
    } else if (fr < fv[n - 1]) {
      simplex[n] = refl; fv[n] = fr;
    } else {
      const con = centroid.map((c, j) => c + 0.5 * (worst[j] - c));
      const fc = f(con);
      if (fc < fv[n]) { simplex[n] = con; fv[n] = fc; }
      else {
        for (let i = 1; i <= n; i++) {
          simplex[i] = simplex[i].map((v, j) => simplex[0][j] + 0.5 * (v - simplex[0][j]));
          fv[i] = f(simplex[i]);
        }
      }
    }
    order();
  }
  return { x: simplex[0], fx: fv[0] };
}

/** Loss on the CLAMPED point, plus a penalty for how far outside the bounds the
 *  optimiser wandered. This keeps Nelder-Mead smooth while making the admissible
 *  region a hard constraint on the reported answer. */
const loss = (x: number[]) => {
  const c = clampFree(x);
  let penalty = 0;
  for (let i = 0; i < x.length; i++) penalty += Math.abs(x[i] - c[i]) * 10;
  const r = runBacktest(withFree(BASE, c));
  return Number.isFinite(r.loss) ? r.loss + penalty : 1e9;
};

const start = freeOf(BASE);
let best = { x: clampFree(start), fx: loss(clampFree(start)) };
console.log(`start loss ${best.fx.toFixed(4)}`);

// multi-start: jitter deterministically so runs are reproducible
let seed = 12345;
const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
for (let s = 0; s < 12; s++) {
  const x0 = s === 0 ? start : start.map(v => v + (rnd() - 0.5) * (Math.abs(v) || 1) * 2);
  const r = nelderMead(loss, x0, { step: 0.3, maxIter: 1500 });
  r.x = clampFree(r.x); r.fx = loss(r.x);
  if (r.fx < best.fx) best = r;
  process.stdout.write(`  start ${s}: ${r.fx.toFixed(4)}${r.fx === best.fx ? '  <- best' : ''}\n`);
}

console.log(`\nbest loss ${best.fx.toFixed(4)}\n`);
console.log('fitted parameters (PROVISIONAL — replace with literature values):');
FREE.forEach((k, i) => {
  const b = BOUNDS[k];
  const at = b && (Math.abs(best.x[i] - b[0]) < 1e-6 || Math.abs(best.x[i] - b[1]) < 1e-6) ? '  AT BOUND' : '';
  console.log(`  ${k.padEnd(16)} ${best.x[i].toFixed(4).padStart(9)}   (start ${start[i].toFixed(3)})${at}`);
});

best.x = clampFree(best.x);
const r = runBacktest(withFree(BASE, best.x));
console.log('\n=== BACKTEST, fitted ===');
console.log('series          RMSE     corr   sign-agree');
for (const s of r.series) {
  console.log(
    `  ${s.name.padEnd(14)}${r.rmse[s.name].toFixed(3).padStart(7)}` +
    `${r.correlation[s.name].toFixed(3).padStart(9)}` +
    `${(r.hitRateSign[s.name] * 100).toFixed(0).padStart(9)}%`);
}
console.log(`\nloss: ${r.loss.toFixed(4)}`);
console.log(`\nexport for params.ts:\n${JSON.stringify(Object.fromEntries(FREE.map((k, i) => [k, +best.x[i].toFixed(4)])), null, 2)}`);
