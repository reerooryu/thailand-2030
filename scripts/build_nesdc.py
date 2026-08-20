#!/usr/bin/env python3
"""
Build a tidy quarterly dataset from the NESDC national accounts CSV release.

Input:  data/nesdc-Q2-2026/Table *.csv   (as downloaded from NESDC)
Output: config/nesdc_quarterly.json

The NESDC files carry two title rows, a units row, then a header row whose
first data column is labelled "(1) ...". Year is column 0, quarter column 1.
Numbers are comma-grouped strings. This script normalises all of that.

Re-run whenever a new NESDC quarterly release is dropped into data/.
"""
import csv, json, os, sys, glob

SRC = sys.argv[1] if len(sys.argv) > 1 else "data/nesdc-Q2-2026"
OUT = sys.argv[2] if len(sys.argv) > 2 else "config/nesdc_quarterly.json"

# table -> (short name, description). Only the tables the engine actually needs.
TABLES = {
    "Table 1":    ("exp_nominal",      "Expenditure on GDP, current prices, original"),
    "Table 2":    ("exp_real",         "Expenditure on GDP, chain volume 2002, original"),
    "Table 2.2":  ("exp_contrib",      "Contributions to real GDP growth, expenditure side"),
    "Table 3":    ("sector_nominal",   "GDP by sector, current prices, original"),
    "Table 4":    ("sector_real",      "GDP by sector, chain volume 2002, original"),
    "Table 5":    ("gdp_nominal_sa",   "GDP, current prices, seasonally adjusted"),
    "Table 6":    ("gdp_real_sa",      "GDP by sector, chain volume 2002, seasonally adjusted"),
    "Table 6.1":  ("gdp_real_sa_qoq",  "Real GDP q-o-q growth, seasonally adjusted"),
    "Table 7":    ("cons_nominal",     "Private consumption composition, current prices"),
    "Table 11":   ("gfcf_type_nom",    "GFCF by type of capital good, current prices"),
    "Table 13":   ("gfcf_sector_nom",  "GFCF private vs public, current prices"),
    "Table 14":   ("gfcf_sector_real", "GFCF private vs public, chain volume 2002"),
    "Table 17":   ("govcons_nominal",  "Government final consumption, current prices"),
    "Table 21":   ("trade_nominal_sa", "Exports and imports, current prices, SA"),
    "Table 22":   ("trade_real_sa",    "Exports and imports, chain volume 2002, SA"),
}


def load(path):
    rows = list(csv.reader(open(path, encoding="utf-8-sig")))
    hi = next(i for i, r in enumerate(rows)
              if any(c.strip().startswith("(1)") for c in r))
    hdr = [c.strip() for c in rows[hi]]
    periods, flags, series = [], {}, {h: [] for h in hdr[2:] if h}
    for r in rows[hi + 1:]:
        if not r or not r[0].strip().isdigit():
            continue
        # Quarter cells carry NESDC revision suffixes: "Q1r" = revised,
        # "Q1p" = preliminary. Keep them — they are the ground truth for the
        # data-revision mechanic in DESIGN section 8.
        qraw = r[1].strip()
        qnum = "".join(c for c in qraw if c.isdigit())
        suffix = "".join(c for c in qraw if c.isalpha() and c not in "Qq")
        period = "%sQ%s" % (r[0].strip(), qnum)
        if suffix:
            flags[period] = suffix
        periods.append(period)
        for j, h in enumerate(hdr):
            if j < 2 or not h:
                continue
            raw = r[j].strip().replace(",", "") if j < len(r) else ""
            try:
                series[h].append(float(raw))
            except ValueError:
                series[h].append(None)
    return periods, flags, series


def main():
    out = {
        "source": "NESDC Quarterly Gross Domestic Product, Q2/2026 release",
        "country": "Thailand",
        "frequency": "quarterly",
        "chain_volume_reference_year": 2002,
        "units": "million baht unless stated",
        "tables": {},
    }
    ref_periods = None
    for path in sorted(glob.glob(os.path.join(SRC, "Table *.csv"))):
        key = os.path.basename(path)[:-4].strip()
        if key not in TABLES:
            continue
        name, desc = TABLES[key]
        periods, flags, series = load(path)
        ref_periods = ref_periods or periods
        if periods != ref_periods:
            print("  ! %s has a different period index" % key)
        out["tables"][name] = {
            "nesdc_table": key,
            "description": desc,
            "series": series,
            "revision_flags": flags,
        }
        print("  %-18s %-3s  %d series x %d quarters" % (name, key, len(series), len(periods)))

    out["periods"] = ref_periods
    out["span"] = [ref_periods[0], ref_periods[-1]]
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(out, open(OUT, "w"), separators=(",", ":"))
    print("\n%s  (%d tables, %s to %s, %.1f MB)" % (
        OUT, len(out["tables"]), out["span"][0], out["span"][1],
        os.path.getsize(OUT) / 1e6))


if __name__ == "__main__":
    main()
