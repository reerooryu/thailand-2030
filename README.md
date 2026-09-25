# Thailand 2030

A turn-based sim of governing Thailand, one quarter at a time, from April 2026 to the March 2030 election.

You lead Bhumjaithai: 191 of 500 seats. First you pick who to govern with. Everything after that depends on it. Sixteen quarters, three actions each, one election. Underneath is a semi-structural macro model estimated on 134 quarters of Thai national accounts.

```bash
./build.sh          # then open ui/thailand-2030.html
```

That one HTML file is the whole game. It needs no server and no install, and gameplay never touches the network. `.github/workflows/pages.yml` builds and publishes it to GitHub Pages on every push to `main`.

---

## How it plays

Each quarter opens with the news. **Blocking** items, like Hormuz closing or a partner threatening to walk, must be answered before the turn ends. Then you spend up to three actions from 36 policy cards. Each card has two to four options: full programme, pilot, phase-in or nothing.

Most cards need a vote. You see the whip count, crossbench defectors included, before you commit. Executive actions skip parliament.

Four scores, all in tension:
- **Headline**: GDP per capita against the IMF's 2030 baseline of USD 9,092
- **Legacy**: potential growth
- **Investment**
- **Debt ratio**: measured against a ceiling you can raise by law and then have to live with

Then the count, coalition talks, an analyst's verdict, your revealed ideology and 23 achievements.

### Before your first term

- **Fiscal impulse is year-on-year.** Capital spending scores on the *change* in its GDP share, so timing matters as much as the programme.
- **Effort is not stock.** Reform effort builds stock at 6% a quarter and decays at 1.5%. A reformist coalition converts at 0.75, a conservative one at 0.55.
- **Order matters.** Civil service reform without digital government first loses its execution gain. Super Licence half-works. Negative income tax is locked until VAT moves.
- **The establishment bites back.** Anger it, and budget execution falls. Money you appropriated doesn't arrive.
- **The bond market charges.** The risk premium hits the next government and every firm borrowing alongside it.
- **The agencies are watching.** S&P, Fitch and Moody's start at BBB+ / BBB+ / Baa1 and can move between A- and BBB-. Breaking or raising the debt ceiling, deep deficits and weak growth push them down; a downgrade adds to the risk premium.
- **You can dissolve the House.** If your own members start leaving and approval is at 55% or more, you can call a snap election instead of waiting for the government to fall. The term ends at that count.

---

## Layout

| Path | What |
|---|---|
| `build.sh` | Builds the game in three steps: data, engine bundle, single HTML file. |
| `engine/src/engine.ts` | The macro model: one pure `step()`, no I/O, no state. |
| `engine/src/browser.ts` | Game host: turns, cards, votes, flags, scoring. |
| `engine/src/politics.ts` | Coalition formation, whip counts, crossbench defection. |
| `engine/src/election.ts` | The March 2030 count and coalition talks. |
| `engine/src/achievements.ts` | 23 end-of-term achievements. None feed back. |
| `engine/src/ratings.ts` | Sovereign credit ratings: S&P, Fitch, Moody's. |
| `engine/src/ideology.ts` | Reads your economic position off the budget. |
| `engine/src/optimise.ts` | Hill-climbing search over the whole term. Spoilers. |
| `config/policies.json` | 36 cards, 99 options. |
| `config/events.json` | 32 news events, 69 options. |
| `config/coalitions.json` | The four coalitions and their effects. |
| `ui/` | Front end. `app.js` is the whole client. |
| `scripts/` | Data builders (Python) and analysis tools (TypeScript). |
| `data/` | Raw source files, kept for provenance. |

Start with `DESIGN.md`. `MODEL.md`, `CALIBRATION.md` and `BACKTEST.md` cover estimation and testing; `GAMELOOP.md`, `EVENTS.md`, `POLICIES.md` and `POLITICS.md` cover the game. `AUDIT_IMPACTS.md` is generated.

---

## The model

A small semi-structural quarterly model:

- **IS curve** on the output gap, real rate at lags 1–4
- **Phillips curve** for headline and core CPI, with energy pass-through
- **Trade**, driven by US real imports and the Dallas Fed global activity index
- **Investment** with partial adjustment to the gap, risk premium and FDI
- **Supply**: `Y_pot = TFP · K^0.45 · L^0.55`, with TFP driven by reform stock, infrastructure and human capital
- **Sovereign risk premium**: `0.011 · max(0, debt − 68)^1.75`, plus a credit-rating premium (0 at BBB+, +0.25 at BBB, +0.60 at BBB-, −0.15 at A-)
- **Execution wedge**: appropriated budget is not delivered budget

Data: NESDC quarterly national accounts 1993Q1–2026Q2, TPSO CPI (487 months), BIS household debt, BOT MPC decisions (190 meetings), IMF WEO. The panel validates the model and does not calibrate it. `MODEL.md §1` explains why.

---

## What this is not

A model of a government's choices, not of Thailand. Real cabinets play for the next coalition meeting. You get a four-year horizon and a whip count in advance. Party positions, seat numbers, the February 2026 result and the events are real. The counterfactuals predict nothing.

---

## Building and hacking

```bash
./build.sh                              # the game
npx --prefix engine tsx engine/src/optimise.ts balanced pheuthai
npx --prefix engine tsx scripts/audit_impacts.ts > AUDIT_IMPACTS.md
python3 scripts/build_panel.py          # rebuild the estimation panel
```

Needs Node 20+ and Python 3.10+. The engine has one dev dependency.

Cards and events are JSON in `config/`. A new policy is a JSON object with a channel vector, not a code change.

### Soundtrack

The recording isn't ours to redistribute. The player tries, in order:

1. **`ui/assets/anthem.mp3`**, inlined at build time if present. It is in `.gitignore`, so a clean checkout lacks it.
2. **The YouTube embed** from the rights holder's upload. This is the only network use in the game, and it needs `http(s)`: a `file://` page without the mp3 stays silent.
3. **Nothing.** If the embed fails, the player controls disappear.

The simulation is the same in all three cases.

---

## Licence and data

Code, game content and docs are **MIT**. See `LICENSE`.

The statistics are not MIT: NESDC quarterly national accounts · TPSO consumer price index · Bank of Thailand MPC minutes and policy rate history · BIS credit statistics · IMF World Economic Outlook · Federal Reserve Bank of Dallas global activity index · Stock Exchange of Thailand index history · Election Commission of Thailand, February 2026. Each belongs to its publisher and is redistributed under that publisher's terms. These generally require citing the source and forbid implying endorsement. **`data/README.md` lists every source, what it feeds and what its terms require.** Keep it with the data if you fork.

None of these institutions has reviewed or endorsed this project, and the game's counterfactuals are not theirs. Raw files are in `data/`. The builders that turn them into `config/` are in `scripts/`.
