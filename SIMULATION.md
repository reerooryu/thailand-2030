# Full Dynamic Simulation

*The hard test. DESIGN §16, beyond the one-step-ahead gate in `BACKTEST.md`.*

**Run:** `cd engine && npx tsx src/simulate.ts` · **Output:** `/SIMULATION.txt`
**Sample:** 125 quarters, 1995Q1 – 2026Q1

## What this tests

`backtest.ts` re-anchors the model to history every quarter and asks it to predict one step forward. That isolates equation error, but it flatters the model: errors never accumulate.

Here the engine is seeded with **four quarters of actuals and then runs on its own output for thirty-one years**, fed only exogenous drivers — world demand, global activity, energy prices, the policy rate, the REER, the fiscal stance. Every error compounds into the next quarter's state.

This is the test that matters for the game, because a 19-turn run from 2026 is exactly this: a model running forward on itself with no correction.

## Result

**No divergence.** 125 quarters of self-referential simulation and the model stays bounded and economically plausible throughout.

| Variable | Drift RMSE | Bias | Correlation | Max abs error |
|---|---|---|---|---|
| Headline CPI y/y | 1.576 | **+0.019** | **0.796** | 5.635 |
| Core CPI y/y | 1.174 | **+0.111** | **0.777** | 3.034 |
| Private investment rate | 3.263 | −0.210 | 0.672 | 12.685 |
| Output gap | 2.377 | +0.386 | 0.548 | 8.223 |

**Bias is near zero on all four.** After three decades of compounding the model neither runs hot nor cold — no systematic drift in level. That is the single most important property for a game engine, more important than correlation: a biased model would send every playthrough to the same wrong place regardless of what the player does.

Correlations of 0.55–0.80 after 125 quarters of accumulation are respectable for a semi-structural model of this size.

## Shocks are fed, not predicted

`config/shocks.json` supplies **identified historical shocks** — the Asian Financial Crisis, the GFC, the 2011 floods, COVID — as additive hits to the output gap and, separately, to the investment rate.

This is deliberate and it is not cheating. The model cannot forecast a financial crisis from within, and neither can anything else; in the game these become **shock cards** (DESIGN §10.4), drawn against hazard rates rather than predicted. Feeding them here tests the *propagation mechanism* — does a shock of the right size produce the right downstream path — separately from crisis prediction, which is not a thing the engine is asked to do.

Magnitudes for the 2011 floods (−7.75) and COVID (−2.56) come from the estimated dummies in `ESTIMATION_OUTPUT.txt`. The AFC and GFC profiles are judgemental, shaped to the observed contraction.

Without shocks the same simulation shows gap correlation 0.548 → and a visibly crisis-free path: 1998Q4 comes out at +3.8 against an actual −4.4. With shocks it lands at +1.9. The mechanism helps but does not fully carry the episode.

## The investment shock channel

The first run reproduced the 1997–98 investment collapse badly — simulated 19.7% of GDP against an actual **10.8%**. The demand shock alone cannot do it, because financial crises destroy investment through **balance sheets and credit**, not through the output gap.

Adding a separate `investmentShock` channel to `Exog` improved the investment rate from correlation 0.584 to **0.672** and RMSE 3.53 to 3.26. The 1998 miss narrowed from 19.7 to 16.3 against 10.8 — better, still substantially under-reacting.

The channel is right and the magnitudes are placeholders. For the game this matters less than it looks: a 2026–2030 window contains no Asian Financial Crisis unless a card deals one, and if it does, the card can specify the investment hit directly.

## Where it is weak

**Crisis under-reaction.** The model consistently under-predicts the depth of contractions — 1998Q4 (+1.9 vs −4.4), 2009Q1 (−2.4 vs −4.7). Non-linear crisis dynamics are absent: no credit crunch, no balance-sheet amplification, no confidence collapse. The model is a normal-times model with shocks bolted on.

For the design this is an acceptable and even defensible limitation. DESIGN §14 already lists "no fully specified financial sector" as a compromise, and crisis severity in the game is a property of the card, not an emergent outcome. It should be added to that list explicitly.

**Output gap is the weakest series** at 0.548 — unchanged from the one-step-ahead result, which at least means the dynamic run adds no additional degradation.

**2011Q4 investment** (17.2 vs 21.6) runs the wrong way. The flood shock hits demand hard but historically triggered a large *reconstruction* investment surge. Rebuild dynamics are not modelled, and a disaster card that ignores reconstruction spending would misrepresent the mechanic.

## What this clears

The engine can be trusted to run a game forward. It does not blow up, it does not drift, and it responds to shocks with the right sign and roughly the right persistence. That is what the gate was for.

## Next

1. **Production function and capital stock.** Potential output is still a trend line (`potentialGrowth` = 0.65%/quarter). Until investment accumulates into capital and capital feeds potential, the Legacy score (DESIGN §3.2) cannot be computed — and Legacy is what makes long-horizon decisions rational.
2. **Fiscal and debt accounting.** The debt/GDP path drives the ceiling constraint, the risk premium and a run-ending failure state. Currently a constant.
3. **Endogenous FX and the BOT reaction function.** Both are fed from data in every test so far. The game needs them to close.
4. Reconstruction dynamics after disaster shocks.
5. Imports still weak (`BACKTEST.md`).
