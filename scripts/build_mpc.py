#!/usr/bin/env python3
"""
Build the BOT policy rate history from the MPC decision workbook.

Input:  data/table-mpc-2026-3.xlsx   (BOT, "Table MPC Decision")
Output: config/policy_rate.json

The workbook is bilingual with a two-row header and trailing remarks rows.
Columns: meeting no. (th) | date (th) | date | body (th) | body | decision (th)
         | decision | policy rate % | votes: hold, +25, +50, -25, -50, absent

Produces both the per-meeting decision record and a quarter-end rate series
aligned to the NESDC quarterly index.
"""
import json, os, sys
import openpyxl

SRC = sys.argv[1] if len(sys.argv) > 1 else "data/table-mpc-2026-3.xlsx"
OUT = sys.argv[2] if len(sys.argv) > 2 else "config/policy_rate.json"

VOTE = ["hold", "raise_25", "raise_50", "cut_25", "cut_50", "absent"]


def main():
    ws = openpyxl.load_workbook(SRC, data_only=True)["Sheet1"]
    rows = list(ws.iter_rows(values_only=True))

    meetings, notes = [], []
    for r in rows[2:]:
        date = r[2]
        if not hasattr(date, "year"):
            if r[0] and str(r[0]).strip():
                notes.append(str(r[0]).strip())
            continue
        try:
            rate = float(r[7])
        except (TypeError, ValueError):
            rate = None
        votes = {}
        for k, v in zip(VOTE, r[8:14]):
            try:
                votes[k] = int(v)
            except (TypeError, ValueError):
                pass
        meetings.append({
            "date": date.strftime("%Y-%m-%d"),
            "body": (r[4] or "").strip(),          # MPB / MPC / By Governor
            "decision": (r[6] or "").strip(),
            "policy_rate": rate,
            "votes": votes or None,
        })

    meetings.sort(key=lambda m: m["date"])

    # Quarter-end level: last decision at or before the end of each quarter.
    qend, cur, rate = {}, None, None
    for m in meetings:
        y, mo = int(m["date"][:4]), int(m["date"][5:7])
        q = "%dQ%d" % (y, (mo - 1) // 3 + 1)
        if m["policy_rate"] is not None:
            rate = m["policy_rate"]
        qend[q] = rate
    # forward-fill quarters with no meeting
    ys = sorted(qend)
    filled, last = {}, None
    y0, y1 = int(ys[0][:4]), int(ys[-1][:4])
    for y in range(y0, y1 + 1):
        for q in range(1, 5):
            k = "%dQ%d" % (y, q)
            if k in qend and qend[k] is not None:
                last = qend[k]
            if last is not None and k >= ys[0] and k <= ys[-1]:
                filled[k] = last

    changes = [m for m in meetings
               if m["decision"] and not m["decision"].lower().startswith("hold")]

    out = {
        "source": "Bank of Thailand, MPC decision table (table-mpc-2026-3)",
        "instrument": "1-day bilateral repurchase rate (policy rate)",
        "units": "percent per annum",
        "span": [meetings[0]["date"], meetings[-1]["date"]],
        "n_meetings": len(meetings),
        "n_changes": len(changes),
        "meetings": meetings,
        "quarter_end": filled,
        "source_notes": notes,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(out, open(OUT, "w"), indent=1, ensure_ascii=False)
    print("%d meetings %s to %s, %d rate changes, %d quarters"
          % (len(meetings), out["span"][0], out["span"][1], len(changes), len(filled)))


if __name__ == "__main__":
    main()
