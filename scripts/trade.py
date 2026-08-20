#!/usr/bin/env python3
"""Trade block with world demand controlled. See MODEL.md section 4."""
import numpy as np, pandas as pd, statsmodels.api as sm
from build_panel import build, hp

d = build()
d['lreer'] = np.log(d.reer)
d['reer_gap'] = (d.lreer - hp(d.lreer.ffill().bfill().values)) * 100
d['dlreer_4'] = d.lreer.diff(4) * 100
d['gexp']  = np.log(d.exp_r).diff(4) * 100
d['gimp']  = np.log(d.imp_r).diff(4) * 100
d['gwd']   = np.log(d.us_imports_r).diff(4) * 100      # world demand growth
d['gap_l1']= d.gap.shift(1)
d['covid'] = ((d.index >= pd.Period('2020Q2')) & (d.index <= pd.Period('2021Q2'))).astype(float)
d['afc']   = ((d.index >= pd.Period('1997Q3')) & (d.index <= pd.Period('1999Q4'))).astype(float)
for L in (1, 2, 4):
    d[f'reerg_l{L}'] = d.reer_gap.shift(L)
    d[f'dlreer4_l{L}'] = d.dlreer_4.shift(L)

def ols(name, y, xs, sample=None):
    z = d if sample is None else d.loc[sample]
    X = sm.add_constant(z[xs]); m = pd.concat([z[y], X], axis=1).dropna()
    r = sm.OLS(m[y], m[X.columns]).fit(cov_type='HAC', cov_kwds={'maxlags': 4})
    print(f'\n=== {name} ===  n={int(r.nobs)}  R2={r.rsquared:.3f}')
    for k in r.params.index:
        st = '***' if r.pvalues[k]<.01 else '**' if r.pvalues[k]<.05 else '*' if r.pvalues[k]<.1 else ''
        print(f'   {k:14}{r.params[k]:9.4f}  (t={r.tvalues[k]:6.2f}) {st}')
    return r

print('#'*64)
print('# EXPORTS — with and without world demand')
print('#'*64)
ols('exports ~ REER only (no control)', 'gexp', ['reerg_l1','covid','afc'])
ols('exports ~ REER + world demand',    'gexp', ['reerg_l1','gwd','covid','afc'])
ols('exports ~ REER + world demand + IGREA', 'gexp', ['reerg_l1','gwd','igrea','covid','afc'])
ols('exports ~ REER(-2) + world demand', 'gexp', ['reerg_l2','gwd','igrea','covid','afc'])
ols('exports ~ REER(-4) + world demand', 'gexp', ['reerg_l4','gwd','igrea','covid','afc'])
ols('exports ~ dlogREER(-1) + world demand', 'gexp', ['dlreer4_l1','gwd','igrea','covid','afc'])

print('\n'+'#'*64)
print('# IMPORTS')
print('#'*64)
ols('imports ~ REER + domestic demand', 'gimp', ['reerg_l1','gap_l1','gwd','covid','afc'])

print('\n'+'#'*64)
print('# SERVICES EXPORTS (tourism proxy)')
print('#'*64)
d['gsvc'] = np.log(d.exp_svc_n / d.deflator).diff(4) * 100
ols('services exports ~ REER + world demand', 'gsvc', ['reerg_l1','gwd','igrea','covid','afc'])

print('\n'+'#'*64)
print('# IS CURVE — world demand added')
print('#'*64)
d['rr_lag'] = d.real_rate.shift(1).rolling(4).mean()
d['flood'] = (d.index == pd.Period('2011Q4')).astype(float)
post = d.index >= pd.Period('2000Q2')
ols('output gap ~ ... + world demand', 'gap',
    ['gap_l1','rr_lag','fiscal_impulse','gwd','igrea','covid','flood'], post)
