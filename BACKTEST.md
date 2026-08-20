# Backtest — Gate Result

*DESIGN §16 step 2. Engine: `/engine`, TypeScript, pure and deterministic.*

**Run:** `cd engine && npx tsx src/backtest.ts` · **Calibrate:** `npx tsx src/calibrate.ts`
**Sample:** 129 quarters, 1994Q2 – 2026Q2. **Raw output:** `/BACKTEST.txt`

## Method

A **conditional, one-step-ahead backtest.** Exogenous variables — world demand, global activity, energy prices, the policy rate, the REER, the fiscal ratio — are fed from history. The state at each quarter comes from history, and the engine predicts one quarter forward. The model must reproduce the **endogenous** series without help.

One-step-ahead isolates equation error from error accumulation; a full dynamic simulation is a separate and harder test, and is the next thing to build.

## Result

| Series | RMSE | Correlation | Sign agreement | Verdict |
|---|---|---|---|---|
| **Core CPI y/y** | 0.464 | **0.965** | **97%** | **Pass, strongly** |
| **Private investment rate** | 1.959 | **0.917** | **100%** | **Pass, strongly** |
| Headline CPI y/y | 1.285 | 0.875 | 89% | Pass |
| Output gap | 2.080 | 0.662 | 76% | Marginal |
| Exports, y/y | 8.300 | 0.595 | 74% | Marginal |
| Imports, y/y | 14.388 | 0.326 | 65% | **Weak** |

**Verdict: the nominal block passes convincingly, the investment block passes, the real block is marginal, and imports fail.**

The two blocks built from properly identified estimates — the core Phillips curve and the investment rate — are the two that perform. That is not a coincidence, and it is the most useful thing the exercise produced.

> **Superseded in part.** The fiscal and monetary coefficients described below as
> "fitted at arbitrary bounds" have since been replaced with published Thai
> estimates — see `LITERATURE.md`. The gap fit is *worse* as a result (correlation
> 0.662 → 0.549), for exactly the reason this section explains. The finding stands;
> the parameters have moved on.

## The decisive finding: fitting cannot rescue the policy parameters

`calibrate.ts` fits the parameters MODEL.md §1 showed the panel cannot identify. Run **unconstrained**, it produces:

| Parameter | Unconstrained fit | Economic sign |
|---|---|---|
| `isRealRate` | **+0.110** | must be negative |
| `isFiscal` | **−0.021** | must be positive |

The optimiser reproduces exactly the reaction-function signs the estimation warned about. It could hardly do otherwise: fitting to the same data recovers the same simultaneity. An engine with those coefficients would tell the player that **raising interest rates stimulates output** — not a calibration imperfection but an inverted economy.

So theory bounds the signs (`BOUNDS` in `params.ts`) and the backtest picks a value inside the admissible range. The result:

- `isRealRate` sits **at its least-negative bound**, −0.05
- `isFiscal` sits **at its smallest admissible value**, 0.10
- Total loss rises only from 27.10 to 27.50 — **1.5%**

That last number is the finding. **Imposing correct signs costs almost nothing in fit, which means the data is very nearly uninformative about these parameters.** They will sit at whatever bound theory imposes. The monetary and fiscal transmission coefficients — the two things the player's decisions actually operate through — cannot be obtained from Thai data by this method and must come from the literature. MODEL.md §1 argued this; the backtest now demonstrates it constructively.

**Consequence:** the fitted values in `params.ts` marked `AT BOUND` are placeholders carrying no empirical content beyond their sign. Sourcing BOT and IMF estimates for Thai fiscal multipliers and monetary transmission is now the highest-priority task in the project.

## Investment: respecified, and it fixed itself

The first specification modelled private investment as a **growth rate** driven by an accelerator on the output gap. It failed completely — correlation **−0.10**, worse than predicting nothing.

The diagnosis was structural. Private GFCF fell from **31.2% of GDP in 1996 to 16.5% in 2025** and never recovered (CALIBRATION §9.1). That is a level break, and no growth-rate equation with a positive constant can represent it — the model kept trying to grow investment back toward a level the economy abandoned thirty years ago.

Respecified as an **investment rate with partial adjustment**:

```
invRate = 7.442 + 0.584·invRate(-1) + 0.124·gap(-1) - 0.138·realRate + ...
```

R² = 0.427, persistence t = 7.31, and **every sign is correct without any constraint** — the only block where that is true. Backtest correlation went from −0.10 to **0.917**, sign agreement to **100%**.

Two things follow. First, the level break is now *in* the model rather than fought by it: the long-run attractor is 7.442 / (1 − 0.584) = **17.9% of GDP**, close to the observed 16.5%, and far below the 1996 level. Second — and this matters for the design — the investment rate is now an explicit state variable, which is correct, because it is the variable the entire game turns on.

## Imports are the remaining failure

Correlation 0.326, RMSE 14.4. The equation has world demand and a domestic-demand term and clearly needs more: import content of exports (Thai exports are import-intensive, so imports should load on *exports* directly), inventory cycles, and oil volumes. Worth fixing, but it is a second-order series for the game.

## What exists now

```
engine/
  src/types.ts       State, Exog, Policy, Params, provenance types
  src/params.ts      BASE parameters, PROVENANCE, BOUNDS, FREE
  src/engine.ts      step() — the pure quarterly transition
  src/panel.ts       panel loader
  src/backtest.ts    conditional backtest + metrics
  src/calibrate.ts   bounded Nelder-Mead, multi-start, deterministic
```

`step()` is pure: no I/O, no randomness, no input mutation. Identical inputs give identical output, which is what makes runs replayable and seeds reproducible (DESIGN §13). Typechecks clean under `strict`.

Parameter provenance is tracked explicitly — 18 `estimated`, 9 `fitted`, 2 `prior` — so it is always visible which numbers are measured and which are placeholders.

## Next

1. ~~Source fiscal multipliers and monetary transmission~~ **Done** — `LITERATURE.md`. Multipliers now decompose by instrument, and monetary transmission is scaled by household debt.
2. **Full dynamic simulation**, not one-step-ahead — let the model run 1994→2026 from initial conditions and see whether it stays on the rails. A much harder test.
3. Fix imports; add the import content of exports.
4. Potential output and the capital stock are still trend-only. The production function (DESIGN §5.3) needs building before the game can score Legacy.
5. Then: the FX block, the fiscal/debt accounting, and the political model.
