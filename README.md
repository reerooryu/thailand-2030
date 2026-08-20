# Thailand 2030

A quarterly turn-based simulation of governing Thailand from April 2026 to the
general election of March 2030.

You are the head of government. You lead Bhumjaithai, which holds 191 of 500
seats, so the first decision is who to govern with — and every decision after
that is priced by that choice. Sixteen quarters, three actions each, one
election at the end. The economy underneath is a semi-structural macro model
estimated on 134 quarters of Thai national accounts, not a scoring rubric with
a graph on top.

```bash
./build.sh          # then open ui/thailand-2030.html
```

That HTML file is the entire game: no server, no install, and no network for
anything that affects play. It runs from a local file, an internal share or
GitHub Pages equally well — and
`.github/workflows/pages.yml` builds and publishes it on every push to `main`,
so the live site is never a stale copy of a build somebody forgot to run.

---

## What you actually do

Each quarter opens with the news. Some of it is a courtesy; some of it is
**blocking**, and the turn will not end until you have answered it — the Strait
of Hormuz closing, the Constitutional Court ruling on ballot reform, the
southern provinces rising against the Land Bridge, a coalition partner
threatening to walk. Then you spend up to three actions from a deck of 35
policy cards, each with two to four options: the full programme, the pilot, the
phase-in, or nothing.

Almost every card that matters needs a vote. The whip count is shown before you
commit, including crossbench defectors, so a defeat is a decision rather than a
surprise. Executive actions route around parliament entirely, which is a real
and valuable category and one Thai governments use constantly.

Four scores run the whole way — **headline** GDP per capita against the IMF's
2030 baseline of USD 9,092, **legacy** potential growth, **investment**, and the
**debt ratio** against a ceiling you may legislate upward and then have to live
with. They are deliberately in tension. There is no line that maximises all
four, which is the point.

At the end: the March 2030 count, seat by seat, followed by a coalition
renegotiation with whoever survived it. Then an assessment written as an outside
analyst, the cabinet's revealed economic ideology read off four years of budget
composition, and twenty achievements naming the strategies that were
available to you — including the ones you did not take.

---

## Things worth knowing before your first term

- **The fiscal impulse is a year-on-year difference.** Capital spending scores
  on the *change* in its GDP share, so the same programme is worth substantially
  more late in the term than early. This is not a bug and it is not hidden; it
  is how fiscal impulse is measured everywhere, and it makes "when" a harder
  question than "whether".
- **Effort is not stock.** Reform effort accumulates into a reform stock at 6%
  a quarter and decays at 1.5%, scaled by your coalition's reform capacity. A
  reformist coalition converts effort at 0.75; a conservative one at 0.55. Four
  years is not long enough to fix everything, and the coalition screen decides
  how much of it you get to keep.
- **Sequencing is real.** Civil service reform without digital government first
  loses its entire execution gain. Super Licence half-works. Negative income tax
  is locked until VAT moves. The tech tree is not decoration.
- **Institutional support has teeth.** Burning the establishment to pass an
  anti-corruption act with real enforcement lowers your budget execution rate,
  which means the money you appropriated does not arrive. You can still do it.
  You should probably still do it. It costs what it costs.
- **The bond market is not a punishment.** The sovereign risk premium is the
  price at which people who have read your budget will still lend to you, and
  every point of it is charged to the next government and to every firm
  borrowing alongside them.

---

## Layout

| Path | What |
|---|---|
| `build.sh` | Build the game. Three steps, in order. |
| `engine/src/engine.ts` | The macro model — one pure `step()`, no I/O, no state. |
| `engine/src/browser.ts` | The game host: turns, cards, votes, flags, scoring. |
| `engine/src/politics.ts` | Coalition formation, whip counts, crossbench defection. |
| `engine/src/election.ts` | The March 2030 count and the coalition renegotiation. |
| `engine/src/achievements.ts` | Twenty end-of-term predicates. Nothing feeds back. |
| `engine/src/ideology.ts` | Reads a revealed economic position off the budget. |
| `engine/src/optimise.ts` | Hill-climbing search over the whole term. Spoils the game. |
| `config/policies.json` | 35 cards, 96 options. |
| `config/events.json` | 24 news events, 52 options. |
| `config/coalitions.json` | The four coalitions and what each does to your capacity. |
| `ui/` | Single-page front end. `app.js` is the whole client. |
| `scripts/` | Data builders (Python) and analysis tools (TypeScript). |
| `data/` | Raw source files, kept for provenance. |

### Documentation

`DESIGN.md` is the full design document and the place to start. `MODEL.md` and
`CALIBRATION.md` cover estimation and what each dataset changed;
`BACKTEST.md` reports the one-step-ahead gate honestly, including which blocks
fail it. `LITERATURE.md` collects the fiscal multipliers by instrument.
`GAMELOOP.md`, `EVENTS.md`, `POLICIES.md` and `POLITICS.md` document the game
layer. `PLAYABILITY.md` states the realism/playability trade explicitly and
where it is reversible. `AUDIT_IMPACTS.md` is generated: every option simulated
over a full term against a passive baseline.

---

## The model

A semi-structural quarterly macro model, deliberately small enough to read:

- **IS curve** on the output gap, with the real rate entering at lags 1–4
- **Phillips curve** for headline and core CPI, with an energy pass-through
- **Trade block** driven by US real imports and the Dallas Fed global activity index
- **Investment** with partial adjustment, responding to the gap, the risk premium
  and an FDI signal
- **Supply side** — `Y_pot = TFP · K^0.45 · L^0.55`, with TFP responding to the
  reform stock, infrastructure share and human capital
- **Sovereign risk premium** — `0.011 · max(0, debt − 68)^1.75`, which is what
  makes the debt ratio bite rather than merely display
- **Execution wedge** — appropriated budget is not delivered budget, and the gap
  is a policy variable

Estimated on NESDC quarterly national accounts 1993Q1–2026Q2, TPSO CPI
(487 months), BIS household debt, BOT MPC decisions (190 meetings) and IMF WEO.
The panel *validates*; it does not calibrate. `MODEL.md §1` explains why that
distinction is load-bearing, and `BACKTEST.md` is candid that fitting cannot
rescue the policy parameters.

---

## What this is not

It is a model of a government's *choices*, not of Thailand. Turning politics
into sixteen turns of three actions is an enormous simplification, and the most
important thing it leaves out is the answer to the obvious question — if these
policies are available and this good, why has no real cabinet enacted them? The
honest answer is not that nobody thought of it. It is that a real government
optimises for surviving the next coalition meeting, and this game hands you a
four-year horizon and a whip count you can read in advance. That is the fantasy
being sold. It is worth naming.

Party positions, coalition arithmetic and the February 2026 result are real.
The events are real, dated, and mostly still unresolved. The counterfactuals
are not predictions of anything.

---

## Building and hacking

```bash
./build.sh                              # the game
npx --prefix engine tsx engine/src/optimise.ts balanced pheuthai
npx --prefix engine tsx scripts/audit_impacts.ts > AUDIT_IMPACTS.md
python3 scripts/build_panel.py                       # rebuilds the estimation panel
```

Requires Node 20+ and Python 3.10+. The engine has one dev dependency.

Cards and events live in `config/*.json` and are hot data — adding a policy is a
JSON object with a channel vector, not a code change. Nothing enters the deck
unless its effect can be stated as a vector over channels the engine already
understands; that rule is the reason the model stays legible.

### A note on the soundtrack

The recording is not ours to redistribute, so the player tries three sources in
order and degrades quietly:

1. **`ui/assets/anthem.mp3`**, inlined at build time if the file is present.
   It is excluded by `.gitignore`, so a clean checkout does not have it.
2. **The YouTube embed**, streamed from the rights holder's own upload. This is
   what a build from a clean checkout uses, and the only part of the game that
   touches the network. It needs `http(s)` — an embed cannot load from a
   `file://` page — so a local no-mp3 build is silent by design.
3. **Nothing.** If the embed is blocked, offline or disabled for the video, the
   transport removes itself rather than leaving a button that does nothing.

Nothing about the simulation changes in any of the three cases.

---

## Licence, and the data

The code, the game content and the documentation are **MIT** — see `LICENSE`.

The statistics are not. NESDC quarterly national accounts · TPSO consumer price
index · Bank of Thailand MPC minutes and policy rate history · BIS credit
statistics · IMF World Economic Outlook · Federal Reserve Bank of Dallas global
activity index · Stock Exchange of Thailand index history · Election Commission
of Thailand, February 2026. Each remains the property of the agency that
published it and is redistributed here under that agency's own terms, which
generally require citing the source and forbid implying endorsement.
**`data/README.md` lists every source, what it feeds, and what its terms
require** — keep it with the data if you fork this.

None of those institutions has reviewed or endorsed this project, and the
counterfactuals the game produces are emphatically not theirs. Raw files are in
`data/`; the builders that turn them into `config/` are in `scripts/`.
