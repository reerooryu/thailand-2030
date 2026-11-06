"""Build config/election_2026.json from the February 2026 (B.E. 2569) result.

Source: Election Commission of Thailand Form สส.6/1 announcements, OCR-extracted
and published as CSV by the election-69-OCR-result project
(github.com/killernay/election-69-OCR-result). Copies of its three CSVs are in
data/election-2569/.

Every candidate's vote and every district's party-list vote is grouped into the
game's six parties: the five named ones and Others (everyone else). The three
districts the source does not cover are imputed from the average of the other
districts in the same province, and listed in _meta.imputed.

Run from the repository root:  python3 scripts/build_election.py
"""
import csv, json, collections, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / 'data' / 'election-2569'
OUT = ROOT / 'config' / 'election_2026.json'

PARTIES = ['Bhumjaithai', "People's", 'Pheu Thai', 'Kla Tham', 'Democrat', 'Others']
# OCR spellings seen in the source, folded onto the five named parties.
NAMES = {
    'ภูมิใจไทย': 'Bhumjaithai',
    'ประชาชน': "People's",
    'เพื่อไทย': 'Pheu Thai',
    'กล้าธรรม': 'Kla Tham', 'กลาธรรม': 'Kla Tham', 'กล้าธรรรม': 'Kla Tham', 'กล้าทา': 'Kla Tham',
    'ประชาธิปัตย์': 'Democrat', 'ประชาธิปัติย์': 'Democrat', 'ประชาธิปปัตย์': 'Democrat',
}
def bucket(name): return NAMES.get(name.strip(), 'Others')

# ECT province codes in numeric order are the same 77 provinces, in the same
# order, as config/provinces.json. Checked by name below.
CHECK = {'10': 'bkk', '31': 'brm', '47': 'snk', '55': 'nan', '83': 'pkt', '96': 'nwt'}

# The three districts the source is missing. Winners from the certified result.
KNOWN_WINNER = {'bkk-15': "People's", 'pri-2': 'Bhumjaithai', 'nan-1': "People's"}

# Certified national party-list result (ECT, as tabulated in Wikipedia's
# "Results of the 2026 Thai general election"). Used for the list count, which
# is national, rather than the OCR sums of 397 districts. Bucket, party, votes.
LIST_2026 = [
    ("People's", "People's Party", 11043309), ('Bhumjaithai', 'Bhumjaithai Party', 6468073),
    ('Pheu Thai', 'Pheu Thai Party', 5575456), ('Democrat', 'Democrat Party', 3941928),
    ('Others', 'Economic Party', 1133055), ('Others', 'United Thai Nation Party', 766078),
    ('Others', 'Pheu Chart Thai Party', 680256), ('Kla Tham', 'Kla Tham Party', 648662),
    ('Others', 'Ruam Jai Thai Party', 435225), ('Others', 'Prachachat Party', 428848),
    ('Others', 'New Party', 314430), ('Others', 'Thai Sup Thawee Party', 305565),
    ('Others', 'New Democracy Party', 256221), ('Others', 'New Dimension Party', 247365),
    ('Others', 'Thai Pakdee Party', 246823), ('Others', 'Thai Sang Thai Party', 202626),
    ('Others', "United People's Power Party", 197510), ('Others', 'Thai Liberal Party', 185705),
    ('Others', 'New Alternative Party', 171061), ('Others', 'Thai Ruam Palang Party', 166723),
    ('Others', 'Palang Pracharath Party', 141082), ('Others', 'other parties (no seat)', 2582701),
]
# Certified list seats by bucket. The count at zero swing reproduces these.
LIST_SEATS_2026 = {'Bhumjaithai': 19, "People's": 32, 'Pheu Thai': 16, 'Kla Tham': 2, 'Democrat': 11, 'Others': 20}

def region(code):
    c = int(code)
    if c == 10: return 'bangkok'
    if c in (11, 12, 13): return 'vicinity'
    if c < 20 or 60 <= c < 70 or 70 <= c < 80: return 'central'
    if c < 30: return 'east'
    if c < 50: return 'northeast'
    if c < 60: return 'north'
    if c >= 94: return 'deepsouth'
    return 'south'

def read(name):
    with open(SRC / name, encoding='utf-8-sig') as f:
        return list(csv.DictReader(f))

def main():
    prov = json.load(open(ROOT / 'config' / 'provinces.json'))['provinces']
    codes = sorted({r['รหัสจังหวัด'] for r in read('summary_winners.csv')}, key=int)
    assert len(codes) == len(prov) == 77, (len(codes), len(prov))
    pid = {c: p['id'] for c, p in zip(codes, prov)}
    for c, i in CHECK.items(): assert pid[c] == i, (c, pid[c], i)

    # Constituency: Others is the strongest single small-party candidate, not
    # the sum of them all. Four minor candidates on 3% each are not a 12% party.
    cons = collections.defaultdict(lambda: [0] * 6)
    lst = collections.defaultdict(lambda: [0] * 6)
    for r in read('constituency.csv'):
        i, v = PARTIES.index(bucket(r['พรรค'])), int(r['คะแนน'] or 0)
        k = (r['รหัสจังหวัด'], int(r['เขต']))
        cons[k][i] = max(cons[k][i], v) if i == 5 else cons[k][i] + v
    for r in read('party_list.csv'):
        b, v = bucket(r['พรรค']), int(r['คะแนน'] or 0)
        lst[(r['รหัสจังหวัด'], int(r['เขต']))][PARTIES.index(b)] += v

    elig = {(r['รหัสจังหวัด'], int(r['เขต'])): int(r['ผู้มีสิทธิ'] or 0) for r in read('summary_winners.csv')}

    # How many districts each province has: the highest number seen, or more
    # where a district is missing at the end of the range.
    seen = collections.defaultdict(set)
    for (c, n) in cons: seen[c].add(n)
    KNOWN_COUNT = {}  # none needed: every gap in the source is inside a range
    districts, imputed = [], []
    for c in codes:
        count = KNOWN_COUNT.get(c, max(seen[c]))
        have = [n for n in range(1, count + 1) if (c, n) in cons]
        for n in range(1, count + 1):
            if (c, n) in cons:
                cv, lv, e = cons[(c, n)], lst.get((c, n)), elig.get((c, n), 0)
                if not lv or sum(lv) == 0:   # list sheet missing: use the province's list shares
                    lv = avg_shares([lst[(c, k)] for k in have if (c, k) in lst], sum(cv))
                if not e: e = round(sum(elig.get((c, k), 0) for k in have) / len(have))
                districts.append({'p': pid[c], 'r': region(c), 'n': n, 'e': e, 'c': cv, 'l': lv})
            else:
                tot = round(sum(sum(cons[(c, k)]) for k in have) / len(have))
                e = round(sum(elig.get((c, k), 0) for k in have) / len(have))
                districts.append({'p': pid[c], 'r': region(c), 'n': n, 'e': e,
                                  'c': avg_shares([cons[(c, k)] for k in have], tot),
                                  'l': avg_shares([lst[(c, k)] for k in have if (c, k) in lst], tot),
                                  'imputed': True})
                d = districts[-1]
                w = PARTIES.index(KNOWN_WINNER[f'{pid[c]}-{n}'])
                top = max(range(6), key=lambda i: d['c'][i])
                d['c'][w], d['c'][top] = d['c'][top], d['c'][w]
                imputed.append(f'{pid[c]}-{n}')
    assert len(districts) == 400, len(districts)

    out = {
        '_meta': {
            'listSource': 'Certified national party-list votes and seats, ECT, as tabulated in Wikipedia, Results of the 2026 Thai general election.',
            'source': 'Election Commission of Thailand, Form สส.6/1 announcements for the 8 February 2026 general election, '
                      'OCR-extracted by the election-69-OCR-result project (github.com/killernay/election-69-OCR-result). '
                      'Not an official ECT publication; OCR errors are possible.',
            'parties': PARTIES,
            'fields': 'p province id (config/provinces.json), r region, n district number, e eligible voters, '
                      'c constituency votes by party, l party-list votes cast in the district, by party',
            'imputed': imputed,
            'imputation': 'Average vote shares of the other districts in the same province, at the province average size, with the certified winner placed first.',
            'others': 'Constituency votes for Others are the best single small-party candidate in the district.',
        },
        'parties': PARTIES,
        # National list votes of the parties inside Others, so list seats are
        # shared among real parties and not handed to a 21% bloc that never stood.
        'list2026': LIST_2026,
        'listSeats2026': LIST_SEATS_2026,
        'districts': districts,
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')))
    # Report: seats at zero swing
    seats = [0] * 6
    for d in districts: seats[max(range(6), key=lambda i: d['c'][i])] += 1
    lv = [sum(d['l'][i] for d in districts) for i in range(6)]
    print('constituency', dict(zip(PARTIES, seats)), 'imputed', imputed)
    print('list share', {p: round(v / sum(lv) * 100, 2) for p, v in zip(PARTIES, lv)})
    print(f'wrote {OUT.relative_to(ROOT)} ({OUT.stat().st_size // 1024} KB)')

def avg_shares(rows, total):
    rows = [r for r in rows if sum(r)]
    sh = [sum(r[i] / sum(r) for r in rows) / len(rows) for i in range(6)]
    return [round(s * total) for s in sh]

if __name__ == '__main__':
    main()
