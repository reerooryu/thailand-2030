"""Build config/constituencies.json: the 400 constituencies of February 2026,
in the same coordinates as config/provinces.json.

Source: the Wikimedia Commons map "2026 Thai general election, electoral map.svg"
(a QGIS export, 24 MB). It is not redistributed here. Put it at
data/map/cache/2026_electoral_map.svg (gitignored) and run from the repo root:

    pip install svgelements shapely numpy
    python3 scripts/map/build_constituencies.py

The SVG has no feature attributes, so each polygon is identified the way a
reader would identify it:
  * PROVINCE: the SVG's own province layer is registered to config/provinces.json
    by a second-order polynomial fitted on province centroids, and each
    district takes the province its interior point falls in.
  * NUMBER: the district number printed inside it. Bangkok, its three neighbours,
    Chonburi, Nakhon Pathom, Samut Sakhon and Phuket are numbered only in the
    map's zoomed insets; each inset's scale and offset are found by matching its
    polygons to the main map's, and its numbers carried across. A province left
    with exactly one unnumbered district and one unused number gets that number.
  * ISLANDS and slivers join the nearest numbered district in their province.
Every one of the 400 (province, number) pairs in config/election_2026.json must
be found exactly once, or the build stops.
"""
import json, re, sys, pathlib, collections
import xml.etree.ElementTree as ET
import numpy as np
from svgelements import Matrix, Path, Move, Close
from shapely.geometry import Polygon, Point, MultiPolygon
from shapely.validation import make_valid
from shapely.ops import unary_union
from shapely.strtree import STRtree

ROOT = pathlib.Path(__file__).resolve().parents[2]
SRC = ROOT / 'data' / 'map' / 'cache' / '2026_electoral_map.svg'
OUT = ROOT / 'config' / 'constituencies.json'
LABEL = '{http://www.inkscape.org/namespaces/inkscape}label'

# Simplification tolerance in source units (about 0.43 map units each).
SIMPLIFY = 1.8
MAIN, ADMIN, LABELS = 'Map 1: 2026_dismap_400', 'Map 1: tha_admbnda_adm1_rtsd_20220121', 'Map 1: 2026_dismap_400 (Labels)'
# Inset layers and the provinces whose numbers they carry. (The Hat Yai inset
# is skipped: it covers one unnumbered district, which the fill-in rule finds.)
INSETS = [('layer11', {'cbi'}), ('layer12', {'bkk', 'spk', 'nbi', 'pte'}), ('layer10', {'npt'}),
          ('layer9', {'skn'}), ('layer6', {'pkt'})]

def valid(P): return P if P.is_valid else make_valid(P)
def rings_of(path):
    rings, cur = [], []
    for seg in path:
        if isinstance(seg, Move):
            if len(cur) > 2: rings.append(cur)
            cur = [(seg.end.x, seg.end.y)]
        elif isinstance(seg, Close):
            if len(cur) > 2: rings.append(cur)
            cur = []
        else: cur.append((seg.end.x, seg.end.y))
    if len(cur) > 2: rings.append(cur)
    return rings
def to_poly(rings): return valid(Polygon(rings[0], rings[1:]) if len(rings) > 1 else Polygon(rings[0]))

class Svg:
    def __init__(self, f):
        self.root = ET.parse(f).getroot()
        self.parent = {c: p for p in self.root.iter() for c in p}
        self.byid = {e.get('id'): e for e in self.root.iter() if e.get('id')}
    def ancestors(self, el):
        M = Matrix(); ms = []
        while el in self.parent:
            el = self.parent[el]
            if el.get('transform'): ms.append(Matrix(el.get('transform')))
        for m in ms: M = M * m
        return M
    def collect(self, lid):
        g = self.byid[lid]; polys, texts = [], []
        def walk(el, M):
            M2 = Matrix(el.get('transform')) * M if el.get('transform') else M
            tag = el.tag.split('}')[1]
            if tag == 'path':
                p = Path(el.get('d')) * M2; p.reify()
                r = rings_of(p)
                if r: polys.append(to_poly(r))
            elif tag == 'text':
                x, y = float(el.get('x', 0)), float(el.get('y', 0))
                texts.append((''.join(el.itertext()).strip(), M2.a * x + M2.c * y + M2.e, M2.b * x + M2.d * y + M2.f))
            for ch in el: walk(ch, M2)
        walk(g, self.ancestors(g))
        return polys, texts

def game_provinces():
    G = json.load(open(ROOT / 'config' / 'provinces.json'))
    out = {}
    for p in G['provinces']:
        if p.get('water'): continue
        out[p['id']] = unary_union([valid(Polygon(r)) for r in rings_of(Path(p['path']))])
    return G['viewBox'], out

def poly2(src, dst):
    src, dst = np.asarray(src), np.asarray(dst)
    F = lambda x, y: np.stack([np.ones_like(x), x, y, x * x, x * y, y * y], -1)
    cx = np.linalg.lstsq(F(src[:, 0], src[:, 1]), dst[:, 0], rcond=None)[0]
    cy = np.linalg.lstsq(F(src[:, 0], src[:, 1]), dst[:, 1], rcond=None)[0]
    return lambda x, y: (F(np.asarray(x), np.asarray(y)) @ cx, F(np.asarray(x), np.asarray(y)) @ cy)

def main():
    if not SRC.exists(): sys.exit(f'missing {SRC.relative_to(ROOT)}: see the docstring')
    svg = Svg(SRC)
    D, _ = svg.collect(MAIN)
    A, _ = svg.collect(ADMIN)
    _, L = svg.collect(LABELS)
    viewBox, GP = game_provinces()
    print(f'{len(D)} district polygons, {len(A)} province polygons, {len(L)} labels')

    # --- register the SVG to the game map, on province centroids
    allS = unary_union([a for a in A if a.area > 1]).bounds
    allG = unary_union(list(GP.values())).bounds
    T = lambda x, y: (allG[0] + (np.asarray(x) - allS[0]) / (allS[2] - allS[0]) * (allG[2] - allG[0]),
                      allG[1] + (np.asarray(y) - allS[1]) / (allS[3] - allS[1]) * (allG[3] - allG[1]))
    big = [a for a in A if a.area > 20]
    for _ in range(4):
        groups = collections.defaultdict(list)
        for a in big:
            x, y = T(*a.representative_point().coords[0]); pt = Point(float(x), float(y))
            k = next((k for k, g in GP.items() if g.contains(pt)), None) or min(GP, key=lambda k: GP[k].distance(pt))
            groups[k].append(a)
        SP = {k: unary_union(v) for k, v in groups.items()}
        T = poly2([SP[k].centroid.coords[0] for k in SP], [GP[k].centroid.coords[0] for k in SP])
    res = [np.hypot(*(np.array(T(*SP[k].centroid.coords[0])).ravel() - np.array(GP[k].centroid.coords[0]))) for k in SP]
    assert len(SP) == 77, len(SP)
    print(f'registered: 77 provinces, centroid residual mean {np.mean(res):.2f}, max {np.max(res):.2f} map units')

    # --- province and number of every polygon
    prov = []
    for p in D:
        rp = p.representative_point()
        prov.append(next((k for k, g in SP.items() if g.contains(rp)), None) or min(SP, key=lambda k: SP[k].distance(rp)))
    tree = STRtree(D)
    def containing(pt):
        return next((int(j) for j in tree.query(pt) if D[j].contains(pt)), None)
    num = {}
    for txt, x, y in L:
        if not txt.isdigit(): continue
        j = containing(Point(x + 5, y - 6))
        if j is not None: num[j] = int(txt)
    for lid, provs in INSETS:
        I, texts = svg.collect(lid)
        biggest = max(q.area for q in I)
        I = [q for q in I if q.area < biggest * 0.5]
        M = [j for j, p in enumerate(prov) if p in provs and D[j].area > 2]
        best = (-1, None)
        for i in sorted(range(len(I)), key=lambda i: -I[i].area)[:12]:
            for j in M:
                s = (I[i].area / D[j].area) ** 0.5
                if not 1.2 < s < 40: continue
                ci, cj = I[i].centroid.coords[0], D[j].centroid.coords[0]
                score = 0
                for q in I:
                    if q.area < 5: continue
                    qx, qy = q.representative_point().coords[0]
                    m = containing(Point((qx - ci[0]) / s + cj[0], (qy - ci[1]) / s + cj[1]))
                    if m is not None and abs(q.area / s ** 2 / D[m].area - 1) < 0.2: score += 1
                if score > best[0]: best = (score, (s, ci, cj))
        s, ci, cj = best[1]
        placed = 0
        for txt, x, y in texts:
            if not txt.isdigit(): continue
            hits = [q for q in I if q.contains(Point(x + 5, y - 6))]
            if not hits: continue
            qx, qy = min(hits, key=lambda q: q.area).representative_point().coords[0]
            m = containing(Point((qx - ci[0]) / s + cj[0], (qy - ci[1]) / s + cj[1]))
            if m is not None and m not in num: num[m] = int(txt); placed += 1
        print(f'inset {lid}: scale {s:.2f}, matched {best[0]} polygons, placed {placed} numbers')

    E = json.load(open(ROOT / 'config' / 'election_2026.json'))
    want = collections.Counter(d['p'] for d in E['districts'])
    # fill-in: one number missing, one sizeable unnumbered polygon
    for p, n in want.items():
        have = {num[j] for j in num if prov[j] == p}
        missing = sorted(set(range(1, n + 1)) - have)
        if len(missing) == 1:
            cands = [j for j in range(len(D)) if prov[j] == p and j not in num and D[j].area > 20]
            # the one that borders the most numbered districts of the province is the mainland one
            touch = lambda j: sum(1 for k in num if prov[k] == p and D[j].distance(D[k]) < 0.5)
            if cands:
                j = max(cands, key=touch); num[j] = missing[0]
                print(f'{p}: district {missing[0]} by elimination')

    # --- dissolve: islands and slivers join the nearest numbered district
    parts = collections.defaultdict(list)
    for j, p in enumerate(D):
        if j in num: parts[(prov[j], num[j])].append(p); continue
        same = [k for k in num if prov[k] == prov[j]]
        if not same: continue
        k = min(same, key=lambda k: D[k].distance(p))
        parts[(prov[k], num[k])].append(p)
    keys = set(parts); need = {(d['p'], d['n']) for d in E['districts']}
    if keys != need:
        sys.exit(f'mismatch: missing {sorted(need - keys)[:20]}, extra {sorted(keys - need)[:20]}')

    def ring_path(coords):
        # relative coordinates at 0.1 map units: a third smaller than absolute
        xs, ys = T([c[0] for c in coords], [c[1] for c in coords])
        q = [(round(float(x) * 10), round(float(y) * 10)) for x, y in zip(np.ravel(xs), np.ravel(ys))]
        q = [a for a, b in zip(q, q[1:] + [None]) if a != b]
        if len(q) < 3: return ''
        def f(v):
            t = f'{v / 10:.1f}'.rstrip('0').rstrip('.')
            return t[1:] if t.startswith('0.') else '-' + t[2:] if t.startswith('-0.') else t or '0'
        out = [f'M{f(q[0][0])} {f(q[0][1])}l']
        for (x0, y0), (x1, y1) in zip(q, q[1:]):
            dx, dy = f(x1 - x0), f(y1 - y0)
            out.append(f'{dx}{"" if dy.startswith("-") else " "}{dy} ')
        return ''.join(out).rstrip() + 'z'
    districts = {}
    for (p, n), ps in sorted(parts.items(), key=lambda kv: (kv[0][0], kv[0][1])):
        u = unary_union([q.buffer(0.4, join_style=2) for q in ps]).buffer(-0.4, join_style=2)
        # small urban districts keep more detail: they are drawn in the Bangkok inset
        u = u.simplify(min(SIMPLIFY, 0.08 * u.area ** 0.5), preserve_topology=True)
        polys = list(u.geoms) if hasattr(u, 'geoms') else [u]
        d = ''.join(ring_path(q.exterior.coords) for q in polys if q.area > 0.5)
        districts[f'{p}-{n}'] = d
    OUT.write_text(json.dumps({
        '_meta': {
            'source': 'Wikimedia Commons, "2026 Thai general election, electoral map.svg" (QGIS export; creator in the file '
                      'metadata: Anuchit Chanthakaeo). Redrawn: districts identified from the printed numbers, registered '
                      'to config/provinces.json, dissolved and simplified by scripts/map/build_constituencies.py.',
            'licence': 'Derived from a Wikimedia Commons file; see its file page for the licence and attribution it requires.',
            'viewBox': viewBox,
        },
        'viewBox': viewBox,
        'districts': districts,
    }, separators=(',', ':')))
    print(f'wrote {OUT.relative_to(ROOT)}: {len(districts)} districts, {OUT.stat().st_size // 1024} KB')

if __name__ == '__main__':
    main()
