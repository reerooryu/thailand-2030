#!/usr/bin/env python3
"""Register a scanned reference map of 1941-46 Siam against Natural Earth.

    python3 scripts/map/register_reference.py REF.png [--write] [--overlay out.png]

This step fitted the 'coef' block in data/map/trace_1941.json. The traced lines
in that file are pixel coordinates on the reference image, and build_map.py
uses 'coef' to turn them into longitude/latitude. The reference scan itself
(a 1945 map of Siam, cropped to 1000x840 px around Battambang) is not in the
repository. You only need this script to re-trace from a different scan.

Method:
  1. Find the water edges (blue pixels) and the grey international border on
     the image.
  2. Fit a linear lon/Mercator-lat -> pixel map by Nelder-Mead. The fit starts
     from two tie points (default: Koh Kong river mouth, Kratie; override with
     --tie) and matches the Natural Earth coastline and Tonle Sap to the water
     edges.
  3. Refine to a quadratic map by ICP. It matches the coastline and lake to
     the water edges, and the Thai-Cambodian border (weighted x3) to the grey
     border pixels.
  4. Print the residuals and optionally draw the fitted features and the Mekong
     (as a check) over the image.

Needs: python3 with numpy, scipy, shapely, pillow. It reuses the Natural Earth
cache in data/map/cache/ and downloads anything missing.
"""
import argparse, json, os, urllib.request
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage, optimize
from scipy.spatial import cKDTree
from shapely.geometry import shape, box
from shapely.ops import unary_union

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA = os.path.join(ROOT, 'data', 'map')
CACHE = os.path.join(DATA, 'cache')
NE = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/'
BBOX = box(101.5, 10.0, 107.5, 15.8)

ap = argparse.ArgumentParser()
ap.add_argument('ref', help='reference map image (PNG/JPG)')
ap.add_argument('--tie', nargs=8, type=float, metavar=('X1', 'Y1', 'LON1', 'LAT1', 'X2', 'Y2', 'LON2', 'LAT2'),
                default=[308, 700, 102.91, 11.66, 785, 405, 105.97, 13.52],
                help='two pixel <-> lon/lat tie points for the initial guess')
ap.add_argument('--write', action='store_true', help="store the fit as 'coef' in trace_1941.json")
ap.add_argument('--overlay', help='write a PNG with the fitted features drawn over the image')
args = ap.parse_args()

def fetch(name):
    os.makedirs(CACHE, exist_ok=True)
    path = os.path.join(CACHE, name)
    if not os.path.exists(path):
        print('downloading', name); urllib.request.urlretrieve(NE + name, path)
    return json.load(open(path))

mer = lambda lat: np.degrees(np.log(np.tan(np.pi / 4 + np.radians(lat) / 2)))

def sample(g, step=0.01):
    """Points every ~step degrees along a geometry's lines or polygon exteriors."""
    if g.is_empty: return []
    t = g.geom_type
    if t in ('GeometryCollection', 'MultiLineString', 'MultiPolygon'):
        return [p for h in g.geoms for p in sample(h, step)]
    L = g.exterior if t == 'Polygon' else g
    n = max(2, int(L.length / step))
    return [(q.x, q.y) for q in (L.interpolate(s, normalized=True) for s in np.linspace(0, 1, n))]

# ---- Natural Earth features --------------------------------------------------
coast = []
for f in fetch('ne_10m_coastline.geojson')['features'] + fetch('ne_10m_lakes.geojson')['features']:
    g = shape(f['geometry'])
    if g.intersects(BBOX): coast += sample(g.intersection(BBOX) if g.geom_type != 'Polygon' else g)
adm = fetch('ne_10m_admin_1_states_provinces.geojson')['features']
union = lambda a3: unary_union([shape(f['geometry']).buffer(0) for f in adm if f['properties'].get('adm0_a3') == a3])
THA, KHM = union('THA'), union('KHM')
bord = sample(THA.buffer(0.01).intersection(KHM.boundary))
rivers = fetch('ne_10m_rivers_lake_centerlines.geojson')['features']
mekong = unary_union([shape(f['geometry']) for f in rivers if 'Mekong' in str(f['properties'].get('name'))])
C, Bd = np.array(coast), np.array(bord)

# ---- image features ----------------------------------------------------------
im = np.array(Image.open(args.ref).convert('RGB')).astype(int); H, W = im.shape[:2]
r, g, b = im[..., 0], im[..., 1], im[..., 2]
water = ndimage.binary_opening((b > g) & (b > r + 15) & (r < 190), iterations=1)
edge = water ^ ndimage.binary_erosion(water)
wedge = np.argwhere(edge)[:, ::-1].astype(float)
gpts = np.argwhere((abs(r - g) < 22) & (abs(g - b) < 28) & (r < 175) & (r > 60))[:, ::-1].astype(float)

# ---- 1. linear fit -------------------------------------------------------------
x1, y1, l1, p1, x2, y2, l2, p2 = args.tie
a = (x2 - x1) / (l2 - l1); bb = (y1 - y2) / (mer(p2) - mer(p1))
p0 = np.array([a, bb, x1 - a * l1, y1 + bb * mer(p1)])
dist = ndimage.distance_transform_edt(~edge)
X, Y = C[:, 0], mer(C[:, 1])
def cost(p):
    px, py = p[0] * X + p[2], -p[1] * Y + p[3]
    m = (px >= 0) & (px < W - 1) & (py >= 0) & (py < H - 1)
    if m.sum() < 50: return 1e9
    return np.mean(np.minimum(ndimage.map_coordinates(dist, [py[m], px[m]], order=1), 25)) + (1 - m.mean()) * 5
best = p0
for s in (1, 0.5, 0.25):
    simplex = [best] + [best + np.eye(4)[i] * np.array([5, 5, 300, 300])[i] * s for i in range(4)]
    best = optimize.minimize(cost, best, method='Nelder-Mead',
                             options={'maxiter': 4000, 'xatol': 1e-3, 'fatol': 1e-4, 'initial_simplex': simplex}).x
print('linear fit, mean edge distance %.2f px' % cost(best))

# ---- 2. quadratic ICP ----------------------------------------------------------
feats = lambda P: np.stack([np.ones(len(P)), P[:, 0], mer(P[:, 1]), P[:, 0] ** 2, P[:, 0] * mer(P[:, 1]), mer(P[:, 1]) ** 2], 1)
src = np.vstack([C, Bd]); kind = np.r_[np.zeros(len(C)), np.ones(len(Bd))]
Phi = feats(src)
cur = np.stack([best[0] * src[:, 0] + best[2], -best[1] * mer(src[:, 1]) + best[3]], 1)
tw, tg = cKDTree(wedge), cKDTree(gpts)
for it in range(25):
    tgt = np.zeros_like(cur); ok = np.zeros(len(cur), bool)
    dw, iw = tw.query(cur[kind == 0]); tgt[kind == 0] = wedge[iw]; ok[kind == 0] = dw < 12
    dg, ig = tg.query(cur[kind == 1]); tgt[kind == 1] = gpts[ig]; ok[kind == 1] = dg < (30 if it < 8 else 12)
    ok &= (cur[:, 0] > 0) & (cur[:, 0] < W) & (cur[:, 1] > 0) & (cur[:, 1] < H)
    w = np.where(kind == 1, 3.0, 1.0)[ok][:, None]
    coef, *_ = np.linalg.lstsq(Phi[ok] * w, tgt[ok] * w, rcond=None)
    cur = Phi @ coef
    if it % 6 == 0 or it == 24:
        print('ICP %2d: %d matched, mean residual %.2f px' % (it, ok.sum(), np.mean(np.linalg.norm(cur[ok] - tgt[ok], axis=1))))

if args.overlay:
    o = Image.open(args.ref).convert('RGB'); d = ImageDraw.Draw(o)
    for x, y in feats(np.vstack([C, Bd])) @ coef: d.point((x, y), fill=(255, 0, 255))
    for L in getattr(mekong, 'geoms', [mekong]):
        d.line([tuple(p) for p in feats(np.array(L.coords)) @ coef], fill=(0, 90, 255), width=1)
    o.save(args.overlay); print('overlay ->', args.overlay, '(magenta: fitted coast/border; blue: Mekong check)')

if args.write:
    tp = os.path.join(DATA, 'trace_1941.json'); t = json.load(open(tp))
    t['coef'] = [[round(float(v), 6) for v in row] for row in coef]
    json.dump(t, open(tp, 'w'), indent=1, ensure_ascii=False); print('wrote coef ->', tp)
else:
    print('coef (not written; pass --write):'); print(np.round(coef, 6).tolist())
