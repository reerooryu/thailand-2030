import numpy as np, pandas as pd, statsmodels.api as sm
from build_panel import build, hp
d = build()
d['lreer']=np.log(d.reer); d['reer_gap']=(d.lreer-hp(d.lreer.ffill().bfill().values))*100
d['dlreer_4']=d.lreer.diff(4)*100
d['gexp']=np.log(d.exp_r).diff(4)*100
d['gcons']=np.log(d.cons_r).diff(4)*100
d['d_hhdebt']=d.hh_debt.diff(4)
d['gap_l1']=d.gap.shift(1); d['infl_l1']=d.infl_yoy.shift(1)
d['covid']=((d.index>=pd.Period('2020Q2'))&(d.index<=pd.Period('2021Q2'))).astype(float)
d['afc']=((d.index>=pd.Period('1997Q3'))&(d.index<=pd.Period('1999Q4'))).astype(float)
def ols(n,y,xs,s=None):
    z=d if s is None else d.loc[s]
    X=sm.add_constant(z[xs]); m=pd.concat([z[y],X],axis=1).dropna()
    if len(m)<20: print(n,'skip'); return
    r=sm.OLS(m[y],m[X.columns]).fit(cov_type='HAC',cov_kwds={'maxlags':4})
    print(f'\n{n}  n={int(r.nobs)} R2={r.rsquared:.3f}')
    for k in r.params.index:
        st='***' if r.pvalues[k]<.01 else '**' if r.pvalues[k]<.05 else '*' if r.pvalues[k]<.1 else ''
        print(f'   {k:14}{r.params[k]:9.4f} (t={r.tvalues[k]:6.2f}) {st}')
post=d.index>=pd.Period('2000Q2')
print('--- A. Exports: REER in LEVEL-deviation terms, lagged ---')
for L in [0,2,4]:
    d[f'rg{L}']=d.reer_gap.shift(L)
    ols(f'exports ~ reer_gap(-{L})','gexp',[f'rg{L}','covid','afc'])
print('\n--- B. Consumption: CHANGE in household debt, not level ---')
ols('cons ~ d_hhdebt','gcons',['gap_l1','d_hhdebt','covid'],post)
print('\n--- C. Phillips: gap at several lags, robustness of flatness ---')
for L in [1,2,3,4]:
    d[f'g{L}']=d.gap.shift(L)
    ols(f'infl ~ gap(-{L})','infl_yoy',['infl_l1',f'g{L}','covid'],post)
