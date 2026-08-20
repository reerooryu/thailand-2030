#!/usr/bin/env python3
"""Estimate the core behavioural equations from the merged panel."""
import numpy as np, pandas as pd, statsmodels.api as sm
from build_panel import build

df = build()
d = df.copy()
d['dlreer']   = np.log(d.reer).diff()*100
d['dlreer_4'] = np.log(d.reer).diff(4)*100
d['rr_lag']   = d.real_rate.shift(1).rolling(4).mean()      # avg real rate, lags 1-4
d['gap_l1']   = d.gap.shift(1)
d['infl_l1']  = d.infl_yoy.shift(1)
d['gexp']     = np.log(d.exp_r).diff(4)*100
d['gimp']     = np.log(d.imp_r).diff(4)*100
d['gcons']    = np.log(d.cons_r).diff(4)*100
d['gipriv']   = np.log(d.gfcf_priv_r).diff(4)*100
d['covid']    = ((d.index >= pd.Period('2020Q2')) & (d.index <= pd.Period('2021Q2'))).astype(float)
d['afc']      = ((d.index >= pd.Period('1997Q3')) & (d.index <= pd.Period('1999Q4'))).astype(float)
d['flood']    = (d.index == pd.Period('2011Q4')).astype(float)

def ols(name, y, xs, sample=None, note=''):
    s = d if sample is None else d.loc[sample]
    X = sm.add_constant(s[xs]); Y = s[y]
    m = pd.concat([Y, X], axis=1).dropna()
    if len(m) < 20: print(f'\n{name}: too few obs ({len(m)})'); return None
    r = sm.OLS(m[y], m[X.columns]).fit(cov_type='HAC', cov_kwds={'maxlags':4})
    print(f'\n=== {name} ===   n={int(r.nobs)}  R2={r.rsquared:.3f}  {note}')
    for k in r.params.index:
        star = '***' if r.pvalues[k]<.01 else '**' if r.pvalues[k]<.05 else '*' if r.pvalues[k]<.1 else ''
        print(f'   {k:16} {r.params[k]:9.4f}  (t={r.tvalues[k]:6.2f}) {star}')
    return r

post = d.index >= pd.Period('2000Q2')

ols('IS curve — output gap', 'gap',
    ['gap_l1','rr_lag','fiscal_impulse','dlreer','covid','flood'], post,
    'rate term = mean real rate, lags 1-4')

ols('Phillips curve — GDP deflator inflation', 'infl_yoy',
    ['infl_l1','gap_l1','dlreer_4','covid'], post)

ols('Exports (real, y/y)', 'gexp',
    ['dlreer_4','gap_l1','covid','afc'], None, 'REER elasticity = competitiveness channel')

ols('Imports (real, y/y)', 'gimp',
    ['dlreer_4','gap_l1','covid','afc'])

ols('Private consumption (real, y/y)', 'gcons',
    ['gap_l1','rr_lag','hh_debt','covid','afc'], post,
    'hh_debt tests the deleveraging damper')

ols('Private investment (real, y/y)', 'gipriv',
    ['gap_l1','rr_lag','dlreer_4','covid','afc'], post)

print('\n\n=== Correlation: what actually moves the output gap ===')
print(d.loc[post, ['gap','rr_lag','fiscal_impulse','dlreer_4','hh_debt']].corr()['gap'].round(3).to_string())
