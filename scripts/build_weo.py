#!/usr/bin/env python3
"""Build config/imf_weo_thailand.json from the IMF WEO download in data/.

The CSV is the IMF data portal's export for Thailand (dataset IMF.RES:WEO),
one row per series and one column per year. Projection years are the baseline
the game scores against, so after replacing the CSV with a newer vintage:

    python3 scripts/build_weo.py
    python3 scripts/build_weo.py --check     # print the scoring path only

then rebuild. The baseline path is read from the config (engine/src/weo.ts);
the headline formula is not refitted, so scripts/passive_check.ts shows how a
do-nothing term now compares with the new projection.
"""
import csv, glob, json, os, re, sys

ROOT = os.path.join(os.path.dirname(__file__), '..')
VINTAGE = 'October 2026'   # the WEO round the CSV comes from; update with the file
files = sorted(glob.glob(os.path.join(ROOT, 'data', 'dataset_*IMF.RES_WEO*.csv')))
if len(files) != 1:
    sys.exit(f'expected exactly one WEO CSV in data/, found {len(files)}: {files}')
src = files[0]
stamp = re.search(r'dataset_(\d{4}-\d{2}-\d{2})', os.path.basename(src)).group(1)

rows = list(csv.DictReader(open(src, encoding='utf-8-sig')))
years = [k for k in rows[0] if re.fullmatch(r'\d{4}', k)]
series = {}
for r in rows:
    code = r['SERIES_CODE'].split('.')[1]
    series[code] = {
        'name': r['INDICATOR'],
        'scale': r['SCALE'],
        'values': {y: (float(r[y]) if r[y].strip() else None) for y in years},
    }

out = {
    'source': f'IMF WEO (IMF.RES:WEO 9.0.0), {VINTAGE} vintage',
    'country': 'Thailand',
    'extracted': stamp,
    'note': '1980-2025 outturn/estimate, 2026-2031 IMF projection. Projection years are the BASELINE the game scores against.',
    'years': years,
    'series': series,
}

pc = series['NGDPDPC']['values']
path = [round(pc[str(y)], 2) for y in range(2026, 2031)]
cpi = series['PCPIPCH']['values']
print(f'{os.path.basename(src)}: {len(series)} series, {years[0]}-{years[-1]}')
print('GDP per head path 2026..2030 (the scoring baseline):', path)
print('2025 GDP per head (headline() anchor):', round(pc['2025'], 2))
print('CPI 2026..2030:', [round(cpi[str(y)], 2) for y in range(2026, 2031)])

if '--check' not in sys.argv:
    dst = os.path.join(ROOT, 'config', 'imf_weo_thailand.json')
    json.dump(out, open(dst, 'w'), indent=1, ensure_ascii=False)
    print('wrote', os.path.relpath(dst, ROOT))
