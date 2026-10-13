#!/usr/bin/env python3
"""Rebuild every map outline in config/provinces.json from source.

    python3 scripts/map/build_map.py          (from the repository root)

Steps, in order:
  1. Natural Earth 1:10m admin-1 and river centrelines, downloaded once into
     data/map/cache/ (gitignored). Thai and Cambodian provinces are extracted.
  2. The three 1941 provinces, cut from today's Cambodia by the hand-traced lines
     in data/map/trace_1941.json (see that file and register_reference.py), with
     the Mekong as the eastern edge. Only the Cambodian part of Nakhon Champassak.
  3. One layer of 77 Thai + 3 historic provinces, projected to Mercator and
     simplified to 15% with shared borders kept (mapshaper, via npx), then
     written as absolute SVG paths rounded to one decimal.
  4. War-map data: Voronoi cells per historic province with a fixed order of
     capture, the towns and the main roads.
  5. Merged into config/provinces.json. Names, descriptions and every _meta key
     not produced here are preserved.

Needs: python3 with shapely and numpy, node (npx mapshaper). Deterministic.
"""
import json, os, re, random, subprocess, sys, tempfile, urllib.request
import numpy as np
from shapely.geometry import shape, mapping, Polygon, Point, LineString, MultiPoint
from shapely.ops import unary_union, split, voronoi_diagram

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA = os.path.join(ROOT, 'data', 'map')
CACHE = os.path.join(DATA, 'cache')
PJ = os.path.join(ROOT, 'config', 'provinces.json')
NE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/'
HIST = ('phra_tabong', 'phibunsongkhram', 'nakhon_champassak')

def fetch(name):
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, name)
    if not os.path.exists(path):
        print('downloading', name); urllib.request.urlretrieve(NE + name, path)
    return json.load(open(path))

# ---- 1. sources -------------------------------------------------------------
adm = fetch('ne_10m_admin_1_states_provinces.geojson')['features']
TH = {f['properties']['name']: shape(f['geometry']).buffer(0) for f in adm if f['properties'].get('adm0_a3') == 'THA'}
KH = {f['properties']['name']: shape(f['geometry']).buffer(0) for f in adm if f['properties'].get('adm0_a3') == 'KHM'}
rivers = fetch('ne_10m_rivers_lake_centerlines.geojson')['features']
mekong = unary_union([shape(f['geometry']) for f in rivers if 'Mekong' in str(f['properties'].get('name'))])
ids = json.load(open(os.path.join(DATA, 'ne_ids.json')))
trace = json.load(open(os.path.join(DATA, 'trace_1941.json')))

# ---- 2. the 1941 provinces ----------------------------------------------------
coef = np.array(trace['coef'])
mer = lambda lat: np.degrees(np.log(np.tan(np.pi / 4 + np.radians(lat) / 2)))
imer = lambda Y: np.degrees(2 * np.arctan(np.exp(np.radians(Y))) - np.pi / 2)
feats = lambda X, Y: np.stack([np.ones_like(X), X, Y, X * X, X * Y, Y * Y], 1)
# Pixel -> lon/lat: invert the fitted polynomial with a cubic fitted on a dense grid.
lon, lat = np.meshgrid(np.linspace(101.5, 107.5, 120), np.linspace(10.5, 15.8, 120))
lon, lat = lon.ravel(), lat.ravel()
px = feats(lon, mer(lat)) @ coef
pf = lambda x, y: np.stack([x ** i * y ** j for i in range(4) for j in range(4 - i)], 1)
ic, *_ = np.linalg.lstsq(pf(px[:, 0] / 1000, px[:, 1] / 1000), np.stack([lon, mer(lat)], 1), rcond=None)
def inv(pts):
    p = np.array(pts, float); o = pf(p[:, 0] / 1000, p[:, 1] / 1000) @ ic
    return [(a, float(imer(b))) for a, b in o]
S, A, B = inv(trace['south']), inv(trace['pt_pb']), inv(trace['pb_nc'])
KHM = unary_union(list(KH.values())).buffer(0.002).buffer(-0.002)
north = Polygon(S + [(108, S[-1][1]), (108, 17), (99, 17), (99, S[0][1])]).buffer(0)
terr = KHM.intersection(north)
terr = unary_union([p for p in split(terr, mekong).geoms if p.representative_point().x < 106.0])
south_a = Polygon([(99, A[0][1])] + A + [(A[-1][0] + 0.4, A[-1][1]), (A[-1][0] + 0.4, 9), (99, 9)]).buffer(0)
east_b = Polygon(B + [(B[-1][0], 9), (108, 9), (108, 17), (B[0][0], 17)]).buffer(0)
clean = lambda g: unary_union([p for p in (g.geoms if hasattr(g, 'geoms') else [g]) if p.geom_type == 'Polygon' and p.area > 1e-4])
PT = clean(terr.intersection(south_a))
NC = clean(terr.intersection(east_b).difference(PT))
PB = clean(terr.difference(PT).difference(NC))

# ---- 3. one layer, simplified with shared borders -----------------------------
layer = [{'type': 'Feature', 'properties': {'id': ids[n]}, 'geometry': mapping(g)} for n, g in TH.items() if n in ids]
assert len(layer) == 77, f'{len(layer)} Thai provinces matched, expected 77'
for k, g in zip(HIST, (PT, PB, NC)):
    layer.append({'type': 'Feature', 'properties': {'id': k}, 'geometry': mapping(g)})
pts = [{'type': 'Feature', 'properties': {'id': t['id']}, 'geometry': {'type': 'Point', 'coordinates': t['lonlat']}} for t in trace['towns']]
with tempfile.TemporaryDirectory() as tmp:
    li, lo = os.path.join(tmp, 'layer.geojson'), os.path.join(tmp, 'simp.geojson')
    ti, to = os.path.join(tmp, 'towns.geojson'), os.path.join(tmp, 'towns_m.geojson')
    json.dump({'type': 'FeatureCollection', 'features': layer}, open(li, 'w'))
    json.dump({'type': 'FeatureCollection', 'features': pts}, open(ti, 'w'))
    ms = ['npx', '--yes', 'mapshaper@0.7.83']
    subprocess.run(ms + ['-i', li, 'snap', '-clean', '-proj', '+proj=merc', '-simplify', '15%', 'keep-shapes', 'planar', '-clean', '-o', 'format=geojson', lo], check=True, capture_output=True)
    subprocess.run(ms + ['-i', ti, '-proj', '+proj=merc', '-o', 'format=geojson', to], check=True, capture_output=True)
    G = {f['properties']['id']: shape(f['geometry']) for f in json.load(open(lo))['features']}
    TW = {f['properties']['id']: f['geometry']['coordinates'] for f in json.load(open(to))['features']}
thai_g = [g for k, g in G.items() if k not in HIST]
minx = min(g.bounds[0] for g in G.values()); maxy = max(g.bounds[3] for g in G.values())
sc = 540 / (max(g.bounds[2] for g in thai_g) - min(g.bounds[0] for g in thai_g))
W = round((max(g.bounds[2] for g in G.values()) - minx) * sc + 20)
H = round((maxy - min(g.bounds[1] for g in G.values())) * sc + 20)
X = lambda x, y: ((x - minx) * sc + 10, (maxy - y) * sc + 10)
ring = lambda c: 'M' + 'L'.join('%.1f,%.1f' % X(x, y) for x, y in c[:-1]) + 'Z'
def path(g):
    ps = g.geoms if g.geom_type == 'MultiPolygon' else [g]
    return ''.join(ring(list(p.exterior.coords)) + ''.join(ring(list(i.coords)) for i in p.interiors) for p in ps)
PATHS = {k: path(g) for k, g in G.items()}
TOWNS = {k: [round(v, 1) for v in X(*c)] for k, c in TW.items()}

# ---- 4. war-map cells ---------------------------------------------------------
def svgpoly(d):
    rings = [[tuple(map(float, p.split(','))) for p in r.split('L')] for r in re.findall(r'M([^Z]*)Z', d)]
    return unary_union([Polygon(r).buffer(0) for r in rings if len(r) > 2])
thai_svg = unary_union([svgpoly(PATHS[k]) for k in PATHS if k not in HIST]).buffer(0.3)
xy = lambda k: tuple(TOWNS[k])
ROADS = [LineString([xy('x_poipet'), xy('poipet'), xy('sisophon'), xy('battambang')]),
         LineString([xy('x_pailin'), xy('pailin'), xy('battambang')]),
         LineString([xy('x_osmach'), xy('samraong'), xy('sisophon')]),
         LineString([xy('x_sangam'), xy('anlong_veng'), xy('samraong')]),
         LineString([xy('preah_vihear'), xy('tbeng'), xy('thala')])]
roads = unary_union(ROADS)
GATES = {'phra_tabong': ('battambang', 0.60, 9), 'nakhon_champassak': ('preah_vihear', 0.40, 12)}
TARGET = {'phra_tabong': 55, 'phibunsongkhram': 65, 'nakhon_champassak': 45}
cpath = lambda g: ''.join('M' + 'L'.join('%.1f,%.1f' % c for c in list(p.exterior.coords)[:-1]) + 'Z'
                          for p in (g.geoms if g.geom_type == 'MultiPolygon' else [g]) if p.area > 0.05)
CELLS, TOWN_RANK = {}, {}
for pid in HIST:
    P = svgpoly(PATHS[pid]); rnd = random.Random(1941 + len(pid))
    x0, y0, x1, y1 = P.bounds; step = (P.area / TARGET[pid]) ** 0.5
    seeds = []
    y = y0 + step / 2
    while y < y1:
        x = x0 + step / 2
        while x < x1:
            q = Point(x + rnd.uniform(-.38, .38) * step, y + rnd.uniform(-.38, .38) * step)
            if P.contains(q): seeds.append(q)
            x += step
        y += step
    border = P.boundary.intersection(thai_svg)
    cells = []
    for c in voronoi_diagram(MultiPoint(seeds), envelope=P.buffer(step * 2)).geoms:
        cc = c.intersection(P)
        if cc.is_empty or cc.area < 0.3: continue
        ce = cc.representative_point()
        cells.append({'g': cc, 'c': ce, 'score': ce.distance(border) + ce.distance(roads) * 0.45 + rnd.uniform(0, 2.0)})
    cells.sort(key=lambda c: c['score'])
    if pid in GATES:
        town, frac, rad = GATES[pid]; tp = Point(xy(town))
        city = [c for c in cells if c['c'].distance(tp) < rad or c['g'].buffer(1.5).contains(tp)]
        for c in city: c['gate'] = 1
        rest = [c for c in cells if c not in city]; k = int(round(frac * len(cells)))
        cells = rest[:k] + city + rest[k:]
    N = len(cells)
    CELLS[pid] = [{'d': cpath(c['g']), 'r': round((i + 1) / N, 4), **({'gate': 1} if c.get('gate') else {})} for i, c in enumerate(cells)]
    for t in trace['towns']:
        if t['id'].startswith('x_'): continue
        tp = Point(xy(t['id']))
        for i, c in enumerate(cells):
            if c['g'].buffer(0.5).contains(tp): TOWN_RANK[t['id']] = (pid, round((i + 1) / N, 4)); break
    print(pid, N, 'cells')

# ---- 5. merge -----------------------------------------------------------------
D = json.load(open(PJ))
D['viewBox'] = f'0 0 {W} {H}'
for p in D['provinces']: p['path'] = PATHS[p['id']]
for h in D['historic']: h['path'] = PATHS[h['id']]; h['cells'] = CELLS[h['id']]
D['_meta']['warTowns'] = {t['id']: {'name': t['name'], 'xy': TOWNS[t['id']], 'prov': TOWN_RANK[t['id']][0], 'r': TOWN_RANK[t['id']][1]}
                          for t in trace['towns'] if t['id'] in TOWN_RANK}
D['_meta']['warRoads'] = ['M' + 'L'.join('%.1f,%.1f' % c for c in r.coords) for r in ROADS]
D['_meta']['warMarkers'] = {k: TOWNS[k] for k in ('battambang', 'preah_vihear', 'poipet')}
json.dump(D, open(PJ, 'w'), ensure_ascii=False, separators=(',', ':'))
print('wrote', PJ, os.path.getsize(PJ), 'bytes')
