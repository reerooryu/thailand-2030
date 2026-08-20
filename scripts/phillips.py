#!/usr/bin/env python3
"""Phillips curve on actual CPI. Re-test of MODEL.md section 2."""
import numpy as np, pandas as pd, statsmodels.api as sm
from build_panel import build

d = build()
d['covid'] = ((d.index >= pd.Period('2020Q2')) & (d.index <= pd.Period('2021Q2'))).astype(float)
d['afc']   = ((d.index >= pd.Period('1997Q3')) & (d.index <= pd.Period('1999Q4'))).astype(float)
d['dlreer_4'] = np.log(d.reer).diff(4) * 100
d['d_energy'] = d.cpi_rawfood_energy.pct_change(4) * 100
for L in (1,2,3,4):
    d[f'gap_l{L}'] = d.gap.shift(L)
d['cpi_l1'] = d.cpi_yoy.shift(1)
d['core_l1'] = d.cpi_core_yoy.shift(1)

def ols(name, y, xs, sample=None):
    z = d if sample is None else d.loc[sample]
    X = sm.add_constant(z[xs]); m = pd.concat([z[y], X], axis=1).dropna()
    if len(m) < 20: print(f'\n{name}: n={len(m)}, skipped'); return
    r = sm.OLS(m[y], m[X.columns]).fit(cov_type='HAC', cov_kwds={'maxlags':4})
    print(f'\n=== {name} ===  n={int(r.nobs)}  R2={r.rsquared:.3f}')
    for k in r.params.index:
        st='***' if r.pvalues[k]<.01 else '**' if r.pvalues[k]<.05 else '*' if r.pvalues[k]<.1 else ''
        print(f'   {k:16}{r.params[k]:9.4f}  (t={r.tvalues[k]:6.2f}) {st}')

print('#'*60); print('# HEADLINE CPI'); print('#'*60)
for L in (1,2,3,4):
    ols(f'CPI y/y ~ gap(-{L})', 'cpi_yoy', ['cpi_l1', f'gap_l{L}', 'covid'])

print('\n'+'#'*60); print('# CORE CPI — the right test'); print('#'*60)
for L in (1,2,3,4):
    ols(f'core y/y ~ gap(-{L})', 'cpi_core_yoy', ['core_l1', f'gap_l{L}', 'covid'])

print('\n'+'#'*60); print('# CORE with FX passthrough and energy'); print('#'*60)
ols('core ~ gap + REER + energy', 'cpi_core_yoy',
    ['core_l1','gap_l1','dlreer_4','d_energy','covid'])
ols('core ~ gap(-4) + REER + energy', 'cpi_core_yoy',
    ['core_l1','gap_l4','dlreer_4','d_energy','covid'])
ols('headline ~ gap + REER + energy', 'cpi_yoy',
    ['cpi_l1','gap_l1','dlreer_4','d_energy','covid'])
