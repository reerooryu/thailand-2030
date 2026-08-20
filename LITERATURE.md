# Literature Parameters

*The coefficients the panel cannot identify (`MODEL.md` §1), sourced from published Thai estimates.*

These are the parameters every player decision runs through. `BACKTEST.md` showed that fitting them to the data reproduces policy endogeneity rather than structural response, so they must come from outside the panel.

## 1. Fiscal multipliers, by instrument

| Instrument | Published range | Used | Source |
|---|---|---|---|
| Government capital investment | 0.50 – 0.85 | **0.675** | BOT Discussion Papers / BOTMM |
| Government consumption | 0.18 – 0.75 | **0.465** | BOT / Thammasat BVAR (2025) |
| Direct transfers | 0.20 – 0.40 | **0.30** | BOT Monetary Policy Reports (2023–24) |
| Direct taxation | −0.70 – −1.55 | **−1.125** | Econ TU BVAR (2025) |
| *Aggregate, historical disbursement* | *0.25 – 0.49* | *see §1.2* | *budget outturn data* |

Midpoints of the published ranges. When the per-run parameter draw (DESIGN §5.6) is implemented, these ranges become the distributions — they are already the right shape for it.

### 1.1 A single multiplier cannot represent Thai fiscal policy

Capital spending is **roughly three times as potent as transfers**, and taxation is stronger still in the other direction. The engine previously carried one scalar `isFiscal`; it now decomposes by instrument.

This is what makes the annual budget screen (DESIGN §6.4) a real decision rather than a slider. Reallocating a fixed envelope from transfers to capital raises the growth contribution by a factor of two or more — with a political cost, since transfers are what buys votes (DESIGN §6.2). The tradeoff the design asserted is now numerically specified.

The tax multiplier being the **largest in absolute value** matters for revenue reform (DESIGN §6.1): broadening the base is not merely politically costly, it is contractionary while it happens, which is a second reason governments avoid it.

### 1.2 The execution wedge

The sources report two different multiplier concepts and the gap between them is itself a finding:

- **Instrument multipliers** (0.50–0.85 for capital) describe **disbursed** spending.
- **Aggregate historical multipliers** (0.25–0.49) describe **budgeted** spending.

The wedge is chronic under-disbursement — the sources name it explicitly for capital projects ("persistent budget execution leakage"), and Thailand's capital budget under-execution is well documented.

The engine models it as an explicit `executionCapital` = **0.50** and `executionOther` = **0.70**, giving effective multipliers of 0.34 and 0.33 — inside the reported aggregate band and reconciling the two numbers.

**This is also a game mechanic.** The player allocates a budget; only a fraction lands. Execution rate becomes something reform can improve — an unglamorous, cheap, high-value structural lever of exactly the kind the design wants to reward.

**Note on why these are not fitted.** An unconstrained fit drives both execution rates to their lower bounds, implying effective multipliers near 0.20 — below the published range. That is almost certainly the same endogeneity as `MODEL.md` §1: governments spend into weakness, biasing any fitted fiscal response toward zero. Fitting them would repeat exactly the mistake the sign bounds exist to prevent. They are set by judgement, and the backtest fit is worse for it. That is the correct trade.

## 2. Monetary transmission

Thailand operates flexible inflation targeting. Policy rate shocks propagate through four channels:

| Channel | Strength | Treatment |
|---|---|---|
| **Interest rate + bank lending** | **>50% of total transmission** (BIS) | The `isRealRate` term, scaled by impairment |
| Exchange rate | Moderate | UIP block; rate differential vs the Fed drives capital flows |
| Asset price / wealth | **Weak** — low retail participation in domestic markets | Not separately modelled |

### 2.1 Household debt bottlenecks the dominant channel

The central mechanic. With household debt above 80–90% of GDP, the bank lending channel is impaired: banks tighten standards against bad loans, so **cuts do not become credit growth**. The sources are explicit that recent easing failed to translate into organic credit expansion.

Implemented as a scaling factor on monetary transmission:

```
impairment = max(floor, 1 − slope × max(0, hhDebt − threshold))
   threshold 70% of GDP · slope 0.020 per pp · floor 0.45
```

At Thailand's current **87.5%**, impairment returns **0.65** — roughly a third of monetary transmission is gone. Unimpaired `isRealRate` is −0.22; effective is −0.143.

This does real work in the design. The BOT's reluctance to ease is financial stability, not inflation aversion (`CALIBRATION.md` §13.3) — and now the player also discovers that easing *wouldn't work well anyway*. Monetary policy is both nearly exhausted (50bp of room) and partly disconnected. Two independent reasons the demand side is closed off.

### 2.2 Crowding out

Government consumption prompts private consumption but **crowds out private investment over the medium term** (BOT / Thammasat BVAR). Implemented as `invRateCrowding` = −0.35 in the investment-rate equation.

Design consequence, and it is sharp: a government that buys growth through the consumption line is **spending the game's central variable to do it** (`CALIBRATION.md` §9.1). The easy fiscal lever directly damages the investment rate the 2030 target depends on.

## 3. The IMF's structural point

The 2025–26 Article IV reports argue that isolated monetary or fiscal action faces declining marginal utility in Thailand, and recommend a **policy mix**: targeted, parsimonious fiscal support alongside financial-sector policy, precisely because monetary transmission is impaired by deleveraging.

The engine reproduces this without it being scripted. Monetary transmission is scaled by household debt; fiscal multipliers are damped by execution leakage; and the highest-multiplier instrument is capital spending, which is fiscally constrained by the debt ceiling. **Every single-instrument strategy runs into a wall.**

A documented instance: the Thai government reallocated **THB 157 billion** from general Digital Wallet cash transfers toward direct public investment — moving from a 0.30 multiplier to 0.675. That is a ready-made scripted card (DESIGN §10.4) with real numbers and a real outcome.

## 4. Effect on the backtest

Imposing literature values **worsens** the output gap fit:

| Configuration | Gap RMSE | Gap correlation |
|---|---|---|
| No monetary, no fiscal terms | 2.038 | 0.685 |
| No fiscal terms | 2.074 | 0.667 |
| **Literature values, as shipped** | **2.340** | **0.549** |

Ablation shows the degradation is **entirely fiscal** — removing the monetary term barely moves the fit (0.549 → 0.564), while removing fiscal restores it to 0.667.

This is not a defect. It is the same result as `BACKTEST.md`: historical data prefers fiscal coefficients near zero because fiscal policy is countercyclical, and a model with correct multipliers will therefore fit history worse than one with endogeneity baked in. **A better gap fit here would mean a worse model.**

The blocks estimated cleanly still perform: core CPI correlation 0.965, investment rate 0.927.

## 5. Outstanding

Ranges, not point estimates, are what the design ultimately needs (DESIGN §5.6 draws parameters per run). §1's ranges are usable as-is. Missing:

- A range for monetary transmission — currently a single judgement value.
- Direct estimates of the impairment relationship rather than a calibrated slope.
- Execution rates from actual Thai budget outturn data, which would convert `executionCapital` from judgement to measurement.

Primary-source citations for §1 and §2 should be attached before anything is published; the parameters here came via summary rather than from the papers directly.
