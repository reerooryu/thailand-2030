#!/usr/bin/env python3
"""
Merge every source into one quarterly panel for estimation.
Output: config/panel_quarterly.json  (and a pandas DataFrame if imported)
"""
import json, os, numpy as np, pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
C = lambda f: os.path.join(ROOT, 'config', f)

def hp(y, lam=1600):
    n = len(y); I = np.eye(n); D = np.zeros((n-2, n))
    for i in range(n-2): D[i, i], D[i, i+1], D[i, i+2] = 1, -2, 1
    return np.linalg.solve(I + lam*D.T@D, np.asarray(y))

def build():
    N = json.load(open(C('nesdc_quarterly.json')))
    F = json.load(open(C('financial.json')))
    P = json.load(open(C('policy_rate.json')))
    W = json.load(open(C('world_demand.json')))
    K = json.load(open(C('cpi.json')))
    per = N['periods']
    idx = pd.PeriodIndex([p.replace('Q','Q') for p in per], freq='Q')
    g = lambda t, c: pd.Series(N['tables'][t]['series'][c], index=idx, dtype=float)

    df = pd.DataFrame(index=idx)
    # --- real & nominal GDP, SA where available
    df['rgdp_sa']  = g('gdp_real_sa', '(3) Gross Domestic Product (CVM) (25)')
    df['ngdp']     = g('exp_nominal', '(9) Gross domestic product')
    df['rgdp']     = g('exp_real',    '(9) Gross domestic product (CVM)')
    # --- expenditure, nominal
    for k, c in [('cons','(1) Private final consumption expenditure'),
                 ('govc','(2) General government final consumption expenditure'),
                 ('gfcf','(3) Gross fixed capital formation'),
                 ('exp','(5) Plus : Exports of goods and services'),
                 ('exp_svc','(5.2) Exports of services'),
                 ('imp','(6) Less : Imports of goods and services')]:
        df[k+'_n'] = g('exp_nominal', c)
    # --- expenditure, real (chain volume)
    for k, c in [('cons','(1) Private final consumption expenditure'),
                 ('gfcf','(3) Gross fixed capital formation'),
                 ('exp','(5) Plus : Exports of goods and services'),
                 ('imp','(6) Less : Imports of goods and services')]:
        df[k+'_r'] = g('exp_real', c)
    # --- investment split
    df['gfcf_priv_n'] = g('gfcf_sector_nom', '(3.1) Private (Gross fixed capital formation)')
    df['gfcf_pub_n']  = g('gfcf_sector_nom', '(3.2) Public (Gross fixed capital formation)')
    df['gfcf_priv_r'] = g('gfcf_sector_real','(3.1) Private (Gross fixed capital formation)')
    df['gfcf_pub_r']  = g('gfcf_sector_real','(3.2) Public (Gross fixed capital formation)')

    # --- deflator & inflation
    df['deflator'] = df['ngdp'] / df['rgdp'] * 100
    df['infl_yoy'] = df['deflator'].pct_change(4) * 100

    # --- output gap (HP on log real GDP SA)
    lg = np.log(df['rgdp_sa'].astype(float))
    df['gap'] = (lg - hp(lg.values)) * 100

    # --- policy rate, quarter-end
    pr = pd.Series(P['quarter_end'], dtype=float)
    pr.index = pd.PeriodIndex(pr.index, freq='Q')
    df['policy_rate'] = pr.reindex(idx)
    df['real_rate'] = df['policy_rate'] - df['infl_yoy']

    # --- REER, quarterly average
    r = pd.Series(F['series']['reer_broad']['values'], dtype=float)
    r.index = pd.PeriodIndex(r.index, freq='M')
    df['reer'] = r.resample('Q').mean().reindex(idx)

    # --- household debt
    h = pd.Series(F['series']['household_debt_pct_gdp']['values'], dtype=float)
    h.index = pd.PeriodIndex(h.index, freq='Q')
    df['hh_debt'] = h.reindex(idx)

    # --- world demand
    ui = pd.Series(W['series']['us_real_imports']['values'], dtype=float)
    ui.index = pd.PeriodIndex(ui.index, freq='M').asfreq('Q')
    df['us_imports_r'] = ui.reindex(idx)
    ga = pd.Series(W['series']['global_real_activity']['values'], dtype=float)
    ga.index = pd.PeriodIndex(ga.index, freq='M')
    df['igrea'] = ga.resample('Q').mean().reindex(idx)

    # --- CPI (TPSO), headline and core, quarterly averages
    for name, code in [('cpi', '00000'), ('cpi_core', '93000'),
                       ('cpi_rawfood_energy', '90000'), ('cpi_transport', '50000')]:
        v = pd.Series(K['series'][code], dtype=float)
        v.index = pd.PeriodIndex(v.index, freq='M')
        df[name] = v.resample('Q').mean().reindex(idx)
    df['cpi_yoy'] = df['cpi'].pct_change(4) * 100
    df['cpi_core_yoy'] = df['cpi_core'].pct_change(4) * 100
    df['real_rate_cpi'] = df['policy_rate'] - df['cpi_yoy']

    # --- fiscal impulse proxy: change in (G + public investment) / GDP
    df['fiscal_ratio'] = (df['govc_n'] + df['gfcf_pub_n']) / df['ngdp'] * 100
    df['fiscal_impulse'] = df['fiscal_ratio'].diff()
    return df

if __name__ == '__main__':
    df = build()
    df.index = df.index.astype(str)
    json.dump({'periods': list(df.index),
               'series': {c: [None if pd.isna(v) else float(v) for v in df[c]]
                          for c in df.columns}},
              open(C('panel_quarterly.json'),'w'), separators=(',',':'))
    print(df.shape, list(df.columns))
    print(df.tail(3)[['rgdp_sa','gap','infl_yoy','policy_rate','reer','hh_debt']].round(2))
