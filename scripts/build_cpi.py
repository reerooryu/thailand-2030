#!/usr/bin/env python3
"""
Build Thailand CPI from the TPSO 'CPI-G_Report' export.

Input:  data/CPI-G_Report.xlsx   (Trade Policy and Strategy Office export)
Output: config/cpi.json

The export is a wide sheet: four metadata rows, a header row, then one row per
(category code, year) with twelve month columns. Years are Buddhist Era.
Missing months are '-'. Category codes are hierarchical: 00000 is all items,
X0000 are the eight top-level groups, 90000 is the raw-food-and-energy group
(so core = all items excluding 90000's contribution).

Handles any number of years, so re-exporting a longer period needs no changes.
"""
import json, os, sys, re
import openpyxl

SRC = sys.argv[1] if len(sys.argv) > 1 else "data/CPI-G_Report.xlsx"
OUT = sys.argv[2] if len(sys.argv) > 2 else "config/cpi.json"

BE_OFFSET = 543
NAMES = {
    "00000": "All items (headline CPI)",
    "10000": "Food and non-alcoholic beverages",
    "20000": "Apparel and footwear",
    "30000": "Housing and furnishing",
    "40000": "Medical and personal care",
    "50000": "Transport and communication",
    "60000": "Recreation, reading, education and religion",
    "70000": "Tobacco and alcoholic beverages",
    "80000": "Other non-food and beverages",
    "90000": "Raw food and energy group",
}


def main():
    ws = openpyxl.load_workbook(SRC, data_only=True)["export"]
    rows = [list(r) for r in ws.iter_rows(values_only=True)]

    meta = [str(r[0]) for r in rows[:4] if r[0]]
    base = next((m for m in meta if "ปีฐาน" in m), "")
    base_be = re.search(r"(\d{4})", base)
    base_year = int(base_be.group(1)) - BE_OFFSET if base_be else None

    series, labels = {}, {}
    for r in rows[5:]:
        if not r[0]:
            continue
        code, label_th, year_be = str(r[0]).strip(), str(r[1]).strip(), str(r[2]).strip()
        if not year_be.isdigit():
            continue
        year = int(year_be) - BE_OFFSET
        labels[code] = label_th
        d = series.setdefault(code, {})
        for i in range(12):
            v = r[3 + i]
            if v is None:
                continue
            v = str(v).strip()
            if v in ("-", ""):
                continue
            try:
                d["%d-%02d" % (year, i + 1)] = float(v.replace(",", ""))
            except ValueError:
                pass

    for c in series:
        series[c] = dict(sorted(series[c].items()))

    months = sorted({m for d in series.values() for m in d})
    out = {
        "source": "Trade Policy and Strategy Office (TPSO), Ministry of Commerce — CPI-G_Report export",
        "base_year": base_year,
        "base_note": base,
        "span": [months[0], months[-1]] if months else None,
        "n_months": len(months),
        "n_categories": len(series),
        "category_names_en": NAMES,
        "category_labels_th": labels,
        "series": series,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(out, open(OUT, "w"), indent=1, ensure_ascii=False)

    print("categories: %d   months: %d   span: %s"
          % (len(series), len(months), out["span"]))
    print("base year:", base_year)
    head = series.get("00000", {})
    if head:
        print("\nheadline CPI (00000):")
        for k, v in head.items():
            print("  %s  %7.2f" % (k, v))
        vals = list(head.values())
        if len(vals) > 1:
            print("\n  Jan->latest: %+.2f%%" % ((vals[-1] / vals[0] - 1) * 100))


if __name__ == "__main__":
    main()
