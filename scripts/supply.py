"""Calibrate the production function: capital stock (PIM), TFP residual, labour."""
import numpy as np, pandas as pd, json
from build_panel import build, hp

d = build()
ALPHA = 0.45          # capital share, typical for a middle-income Asian economy
DELTA_A = 0.05        # 5%/yr depreciation
DELTA_Q = 1 - (1 - DELTA_A) ** 0.25

# real total investment = private + public GFCF (chain volume)
inv = (d.gfcf_priv_r + d.gfcf_pub_r).astype(float)
y = d.rgdp_sa.astype(float)

# --- perpetual inventory. Initial K from the steady-state relation
# K0 = I0 / (g + delta), using average investment and growth over the first 5y.
g0 = np.log(y.iloc[20] / y.iloc[0]) / 20          # per quarter
K0 = inv.iloc[:20].mean() / (g0 + DELTA_Q)
K = [K0]
for t in range(1, len(inv)):
    K.append((1 - DELTA_Q) * K[-1] + inv.iloc[t])
d['K'] = K
print('K/Y ratio: 1995 %.2f   2010 %.2f   2025 %.2f'
      % (d.K.iloc[8]/y.iloc[8]/4, d.K.iloc[68]/y.iloc[68]/4, d.K.iloc[128]/y.iloc[128]/4))

# --- labour input. WEO population, interpolated; working-age share proxied by a
# smooth logistic decline consistent with Thai ageing (needs UN WPP to firm up).
W = json.load(open('../config/imf_weo_thailand.json'))
pop = {int(k): v for k, v in W['series']['LP']['values'].items() if v is not None}
yrs = sorted(pop)
pq = pd.Series(
    np.interp([i.year + (i.quarter - 1) / 4 for i in d.index],
              yrs, [pop[y_] for y_ in yrs]),
    index=d.index)
# working-age share: 1993 ~66%, peaks ~72% around 2010, falls to ~65% by 2026
t = np.arange(len(d))
wa_share = 0.660 + 0.062 * np.exp(-((t - 68) / 46.0) ** 2)
d['L'] = pq * wa_share
print('labour force index: 1995 %.2f m  2010 %.2f m  2026 %.2f m'
      % (d.L.iloc[8], d.L.iloc[68], d.L.iloc[-1]))

# --- TFP as the Solow residual
d['TFP'] = y / (d.K ** ALPHA * d.L ** (1 - ALPHA))
d['tfp_g'] = np.log(d.TFP).diff(4) * 100
print('\nTFP growth y/y, period averages:')
for a, b, lab in [(1995,1997,'1995-97 boom'), (1998,2000,'AFC'), (2001,2007,'2001-07'),
                  (2008,2010,'GFC'), (2011,2019,'2011-19'), (2020,2021,'COVID'),
                  (2022,2026,'2022-26')]:
    m = d[(d.index.year >= a) & (d.index.year <= b)].tfp_g.mean()
    print('  %-14s %+.2f%%' % (lab, m))

# --- implied potential vs HP trend
logy = np.log(y.values)
hp_trend = hp(logy)
d['pot_hp'] = np.exp(hp_trend)
# production-function potential: trend TFP and trend K, actual L
d['tfp_tr'] = np.exp(hp(np.log(d.TFP.values), 6400))
d['K_tr']   = np.exp(hp(np.log(d.K.values), 6400))
d['pot_pf'] = d.tfp_tr * d.K_tr ** ALPHA * d.L ** (1 - ALPHA)
d['gap_pf'] = (np.log(y) - np.log(d.pot_pf)) * 100
d['gap_hp'] = (np.log(y) - np.log(d.pot_hp)) * 100
print('\ngap: PF vs HP   corr %.3f   sd(PF) %.2f  sd(HP) %.2f'
      % (d.gap_pf.corr(d.gap_hp), d.gap_pf.std(), d.gap_hp.std()))
print('potential growth y/y (PF): 2000s %.2f%%  2010s %.2f%%  2020s %.2f%%'
      % tuple((np.log(d.pot_pf).diff(4) * 100)[
          (d.index.year >= a) & (d.index.year <= b)].mean()
          for a, b in [(2000, 2009), (2010, 2019), (2020, 2026)]))

out = {'alpha': ALPHA, 'delta_quarterly': round(DELTA_Q, 6),
       'K0': float(K0), 'periods': [str(i) for i in d.index],
       'K': [float(v) for v in d.K], 'L': [float(v) for v in d.L],
       'TFP': [float(v) for v in d.TFP],
       'potential_pf': [float(v) for v in d.pot_pf],
       'gap_pf': [float(v) for v in d.gap_pf]}
json.dump(out, open('../config/supply.json', 'w'), separators=(',', ':'))
print('\nwrote config/supply.json')
