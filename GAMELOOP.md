# The Game Loop

*`engine/src/game.ts` — the turn state machine. Built because all three outstanding fixes were the same problem: nothing owned turn state.*

**Run:** `cd engine && npx tsx src/playthrough.ts` · **Output:** `/PLAYTHROUGH.txt`

A quarter is: **resolve blocking events → play cards → accumulate the fiscal stance → step the engine.** `endTurn()` throws if any blocking event is unresolved, so the rule is enforced by the type system rather than by convention.

## Fix 1 — event effects now reach the engine

Previously an event resolution moved opinion and flags, and its `effects` vector went nowhere. The `Game` class holds a cumulative `stance` that both cards and events write into, and `endTurn()` converts that into the `Policy` the engine consumes.

Visible in run A: the debt-ceiling warning resolved as **"cut spending to stay under"** leaves the final stance at **capital −0.31** — the event actually removed public investment, and the engine saw it. In run C, capping fuel prices and the rail-link climbdown show up as capital +0.80 and transfers +0.35.

Approval and institutional support are also updated from the same vector, so `approvalBoost` and `institutionalSupport` are no longer declared-but-inert.

## Fix 2 — deferred cards genuinely return

`returnsInQuarters` now schedules the card back into the deck instead of consuming it. Run C, verbatim:

```
2026Q2  ENACTED Land Bridge — Delay pending review (executive)  [returns 2q]
2026Q4  ENACTED Land Bridge — Push ahead with Phase 1 (300 yes, +49)
2026Q4  ↩ Land Bridge returns to the desk
2027Q1  ▓ Southern provinces erupt over Land Bridge land seizures
        BLOCKED → Pull back — build the rail link instead
```

Delay, the file comes back two quarters later, push, crisis, climbdown. The full arc you specified, running end to end.

## Fix 3 — reform dependencies bite

Options declare `dependsOn: { flag, withoutFactor }`. If the flag is unset the effects scale down, and the log says so explicitly.

| Card | Requires | Without it |
|---|---|---|
| Super Licence (full) | `digital_government_mandated` | **×0.55** |
| Super Licence (licence only) | same | ×0.60 |
| **Civil Service Reform (full)** | same | **×0.50** |
| Civil Service Reform (attrition) | same | ×0.65 |

The rationale is in the config: a unified licence is meaningless if ministries cannot see each other's records, and the state cannot shed a third of its staff unless something automates what they did.

### Sequencing now costs something

Runs A and B play **identical cards** — digital government, Super Licence, civil service reform, OECD, VAT. Only the order differs.

| | Reform effort | Execution bonus | Legacy | Headline |
|---|---|---|---|---|
| **A — digitise first** | **154** | **+0.110** | **3.31%** | **8,898** |
| B — digitise last | 119 | +0.063 | 3.24% | 8,876 |

Same cards, same coalition, same votes. Doing them in the right order is worth **22 USD of headline, 0.07pp of Legacy, and nearly double the execution gain** — because the two big reforms landed at half strength.

That is a modest margin, deliberately. Sequencing should reward attention without making a mis-ordered run unrecoverable.

## What the playthroughs exposed

**Approval and Legacy pull hard against each other.** Run A — the reform path, holding firm against the civil service slowdown — ends at **35% approval with the institutional bloc at 34 (Cold)**. Run C — delay, climb down, subsidise fuel, raise the ceiling — ends at **58% approval with Others at 70 (Warm)** and Legacy 3.05% against A's 3.31%.

The reformer finishes with better numbers and a hostile bureaucracy. The accommodator finishes popular, solvent-looking, and slower. Neither is scripted; both fall out of the opinion deltas.

**VAT reform failed by four votes in every run.** Even the 300-seat coalition cannot pass it, because Kla Tham's −0.5 fit is a red line and Pheu Thai's −0.3 is an abstention. The fiscal gap stays open in every path tested.

**Run A ends at 70.5% debt against a 70% ceiling** despite consolidating — the tightest any run has come to staying under, and still a breach.

## Known rough edges

- `stance.reformIndex` accumulates past 100 (154 in run A) and is clamped only at the point of use. Harmless, but the display is misleading.
- Coalition seats never fall below 251 in these runs because the confidence check only drops a party below opinion 25 — Others reached 34, close but not triggering. The threshold wants tuning against real playtests.
- `fdiSignal`, `humanCapital`, `formalisation`, `savingsRate`, `setSupport` accumulate correctly but still have no engine channel.
