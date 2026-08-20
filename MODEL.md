# Model Estimation — First Pass

*What the data says when you actually regress it. Companion to `DESIGN.md` and `CALIBRATION.md`.*

**Panel:** `/config/panel_quarterly.json` — 134 quarters, 1993Q1–2026Q2, 34 series merged from NESDC, BIS, BOT, TPSO, BEA and the Dallas Fed.
**Builder:** `/scripts/build_panel.py` · **Estimation:** `/scripts/estimate.py`, `/scripts/probe.py` · **Raw output:** `/ESTIMATION_OUTPUT.txt`

Method: OLS with HAC (Newey–West, 4 lags) standard errors, dummies for the Asian Financial Crisis (1997Q3–1999Q4), COVID (2020Q2–2021Q2) and the 2011Q4 floods. Output gap from an HP filter (λ=1600) on log real GDP SA. Inflation is **TPSO CPI**, headline and core, year-on-year. (§2 was originally estimated on the GDP deflator and has been corrected — see §2.)

---

## 1. Headline: the naive regressions do not identify the model

This is the main result of the first pass, and it is a negative one with useful consequences.

| Equation | Key coefficient | Estimate | t | Verdict |
|---|---|---|---|---|
| IS curve | real rate (avg lags 1–4) | **+0.196** | 2.22 | **Wrong sign, significant** |
| IS curve | fiscal impulse | −0.063 | −1.60 | Wrong sign |
| Phillips (deflator — **superseded**, §2) | output gap (lag 1) | +0.059 | 0.61 | Artefact |
| Exports | REER gap | −0.303 | −1.48 | Right sign, not significant |
| Consumption | Δ household debt | −0.213 | −1.61 | Right sign, marginal |
| Private investment | real rate | −0.628 | −1.03 | Right sign, not significant |

**Higher real interest rates predict a *larger* output gap.** Fiscal expansion predicts a *smaller* one. Both are textbook simultaneity: the BOT raises rates when the economy is hot, and governments expand fiscally when it is weak. Single-equation OLS on policy variables recovers the **reaction function**, not the structural response.

This is not a data problem and it is not fixable by respecification. It means:

> **The engine cannot be calibrated by regressing the panel.** Structural parameters must come from the literature — BOT working papers, IMF Article IV, published Thai macro estimates — or from a properly identified approach (sign-restricted SVAR, external instruments, narrative shocks). The panel's role is **validation**, not estimation: the 1993–2026 backtest checks whether a judgementally calibrated model reproduces the history, which is a real and demanding test.

The build sequence in DESIGN §16 said "parameter research, done properly, before any code." The step-1 optimism that 134 quarters would let the real block be *estimated* rather than assumed was wrong, and §5.6 should be corrected to say so.

---

## 2. The Phillips curve — corrected

**An earlier version of this section reported that the Thai Phillips curve was *inverted* — a significantly negative output gap coefficient at lags 3 and 4. That result was an artefact of the inflation measure, and it is wrong.**

It was estimated on the **GDP deflator**, the only quarterly price series available before TPSO CPI arrived. For a large net energy importer the deflator is the wrong measure: imports enter it negatively, so an oil price rise *lowers* the deflator while *raising* consumer prices. Since oil shocks also depress output, that manufactures a spurious negative correlation between the gap and measured "inflation". With 487 months of actual CPI (§4A) the artefact disappears.

### 2.1 The correct estimates

Core CPI (TPSO code 93000), y/y, HAC(4), 1993–2026:

| Specification | Persistence | Output gap | FX (Δ REER, 4q) | Energy | R² |
|---|---|---|---|---|---|
| Core ~ gap(−1) | 0.942*** | +0.052 (1.63) | — | — | 0.909 |
| Core ~ gap(−2) | 0.934*** | **+0.067 (1.98)**​** | — | — | 0.913 |
| **Core ~ gap + FX + energy** | **0.859*** | **+0.042 (2.98)**​*** | **−0.032 (−5.66)**​*** | **+0.055 (6.71)**​*** | **0.957** |
| Core ~ gap(−4) + FX + energy | 0.843*** | +0.034 (2.49)** | −0.027 (−4.65)*** | +0.059 (6.61)*** | 0.956 |
| Headline ~ gap + FX + energy | 0.481*** | +0.017 (0.48) | −0.030 (−2.34)** | **+0.240 (9.46)**​*** | 0.942 |

The fully specified core equation is **the best-identified relationship in the project after world demand** — R² 0.957, every term significant, all signs correct.

### 2.2 What this means

**The Phillips curve exists, and it is extremely flat.** The output gap enters core inflation at **+0.042** (t=2.98). A full percentage point of output gap raises core inflation by four *hundredths* of a point. The design's substantive claim survives intact — the player cannot generate meaningful inflation through demand — but it now rests on a correctly signed, properly estimated, very small coefficient rather than on a wrong-signed one.

**FX passthrough is firmly established: −0.032 on core (t=−5.66), −0.030 on headline (t=−2.34).** This is the coefficient the design most needed and could not previously identify. A 1% real appreciation cuts core inflation by about 0.03pp over four quarters.

**Energy dominates headline.** The energy coefficient is **0.240 into headline** against 0.055 into core — passthrough to the number voters actually notice is more than four times the passthrough to underlying inflation. Headline persistence is correspondingly low (0.481 vs 0.859 for core), because headline is mostly being shoved around by energy.

### 2.3 The degenerate path still fights itself, and now the magnitude is known

DESIGN §3.4's 15,000 cell requires +2pp of inflation *and* a baht at 24. With passthrough at −0.032, a 27% real appreciation cuts core inflation by roughly **0.85pp** — while the player is trying to add 2pp. The two legs genuinely oppose each other, and the trade-off is now quantified rather than asserted.

Combined with a demand channel of +0.042, the arithmetic is stark: closing the entire output gap from −5% to +5% would buy 0.42pp of core inflation. There is no demand-side route to +2pp.

### 2.4 Inflation at the start of the game

Headline CPI y/y: **−0.66% (Jan 2026), −0.88% (Feb), −0.08% (Mar), then +2.89% (Apr)**, easing to +1.95% by July.

Thailand was in **outright deflation for the first quarter of the game window**, and a single energy shock flipped it to nearly 3% in one month. The player's opening position includes both — a deflationary starting point and an immediate imported inflation spike they did not cause and cannot undo.

## 3. What the data does support

**Core inflation persistence: 0.859** (t=35.2) in the fully specified equation; headline 0.481. Well-determined. Directly usable. *(Supersedes the 0.64–0.68 range estimated on the deflator.)*

**Phillips slope: +0.042** (t=2.98), **FX passthrough: −0.032** (t=−5.66), **energy into core: +0.055** (t=6.71), **energy into headline: +0.240** (t=9.46). See §2.

**Output gap persistence: 0.485** (t=3.03). The IS curve's autoregressive term is clean because it does not involve a policy variable. Directly usable.

**The 2011 floods: −7.53pp on the output gap** (t=−25.4). An extraordinarily precise estimate, and a ready-made calibration for natural-disaster shock cards. Worth noting it is comparable in magnitude to COVID (−2.48pp on the gap term, though COVID's effect runs through several channels).

**Household debt damper: −0.213** on consumption growth per point of annual debt increase (t=−1.61). Right sign, marginally significant, and stronger in changes than in levels — which is theoretically correct, since it is the flow of new borrowing and repayment that constrains spending. Usable as a prior, not as a fitted value.

**Private investment accelerator: +1.48** on the lagged output gap (t=1.62). Right sign, weak significance, but the magnitude is plausible and it is the mechanism DESIGN §5.3 needs for the investment-rate story.

---

## 4. The trade block, with world demand controlled

World demand is now in the panel (`/config/world_demand.json`) and it transforms the export equation — but not in the direction the design hoped.

**Sources added.** US real imports of goods and services (BEA via FRED `IMPGSC1`, chained 2017 USD, quarterly 1947–2026Q2) as a real volume measure of end-market demand, and the Dallas Fed's Index of Global Real Economic Activity (`IGREA`, the Kilian index, monthly 1968–2026) as a purpose-built world activity proxy built from dry bulk shipping rates. Both complete over the sample. OECD world import volumes were rejected — discontinued in 2014Q2 — as were OECD merchandise imports, which are nominal USD and therefore price- and FX-contaminated.

**Exports of goods and services, y/y, HAC(4):**

| Specification | REER gap (−1) | t | World demand | t | IGREA | t | R² |
|---|---|---|---|---|---|---|---|
| No control | −0.155 | −0.84 | — | | — | | 0.185 |
| + world demand | −0.182 | −0.88 | **0.926** | **7.51** | — | | 0.593 |
| **+ world demand + IGREA** | −0.242 | −1.58 | **0.854** | **6.21** | **0.043** | **4.24** | **0.662** |
| REER at lag 2 | −0.122 | −0.82 | 0.846 | 6.01 | 0.043 | 4.29 | 0.651 |
| REER at lag 4 | +0.057 | 0.40 | 0.859 | 5.91 | 0.040 | 4.60 | 0.646 |

### 4.1 World demand is identified. The exchange rate is not.

R² more than triples, from 0.185 to 0.662. **Thai exports have close to a unit elasticity to world demand** (0.85, t=6.21) with an additional independent effect from global activity (0.043, t=4.24). That is a clean, well-determined, directly usable block — the single best-identified relationship anywhere in this project.

The REER coefficient improves with the controls but **remains statistically insignificant** at every lag: −0.24 (t=−1.58) at best, decaying to zero by lag 4. Right sign, wrong significance, no persistence.

The honest reading: **Thai goods exports are driven overwhelmingly by world demand, and barely at all by the exchange rate.** This is a familiar result for electronics-heavy, supply-chain-integrated exporters — volumes are set by the position in the chain rather than by relative price, and the high import content of Thai exports means a REER move partly cancels within the export itself.

Imports tell the same story: world demand 1.154 (t=6.47), REER 0.099 (t=0.27), domestic demand insignificant. Services exports — the tourism proxy — show a larger REER coefficient (−0.312) than goods, consistent with tourism being the genuinely price-sensitive part of the external sector, but it too is insignificant (t=−1.08).

### 4.2 This breaks the assumed FX defence, and points at a better one

DESIGN §3.4 assumed the trade block would make appreciation self-limiting: appreciate, exports collapse, real growth falls, the top-left corner of the outcome grid recedes. **The data does not support that mechanism.** Exports would not collapse, because exports do not respond much to the real exchange rate.

Three candidate bounds remain, in ascending order of how convincing they are:

1. **The historical envelope.** A baht at 24 implies a REER of 137 against an all-time maximum of 111.83 (June 1997). A 22% overshoot beyond anything in 32 years. Strong, but it is a constraint to impose rather than a mechanism to model.
2. **Tourism and margins.** Services exports are more price-elastic than goods, and appreciation compresses tradables profitability and therefore private investment — the variable the whole game turns on (§9.1 of `CALIBRATION.md`). Plausible, currently unestimated.
3. **The player has no instrument.** *This is the real answer.* The exchange rate is an **outcome in the model, not a lever**. To appreciate the baht 27% the player would need to engineer massive capital inflows or a large positive rate differential — and the policy rate is 1.00% with 50bp of room to the floor (`CALIBRATION.md` §13.1). There is no mechanism by which a Thai government moves its currency that far. The degenerate path is not blocked by trade elasticities; it is blocked because **the player cannot reach the exchange rate the path requires.**

Point 3 dissolves the problem rather than solving it, and it is both more honest and more robust than relying on an elasticity the data will not deliver. The design should be corrected accordingly: keep FX endogenous, model it through UIP plus the current account plus risk sentiment, and let the outcome grid's top-left corner be unreachable rather than self-defeating.

### 4.3 The IS curve is unchanged

Adding world demand improves fit (R² 0.577 → 0.623) and world demand enters correctly (0.072, t=2.24). The real rate coefficient is **still +0.204 (t=2.50)** and fiscal impulse still negative. Endogeneity is robust to the control, which confirms §1: these are reaction functions, not structural responses.

The 2011 flood dummy tightens further to −7.75 (t=−30.8).

---

## 4A. CPI — complete

**Source:** Trade Policy and Strategy Office (TPSO), Ministry of Commerce.
**Raw:** `/data/CPI-G_Report.xlsx` · **Builder:** `/scripts/build_cpi.py` · **Tidy:** `/config/cpi.json`
**Coverage:** **487 months, January 1986 – July 2026. 189 category codes.** Base 2023 = 100.

Longer than any other series in the project, and it arrives **already chained** onto the 2023 base — the December-to-January transitions at every rebase year are clean:

| Rebase | Dec → Jan | Change |
|---|---|---|
| 2007 | 74.88 → 74.60 | −0.37% |
| 2011 | 82.64 → 83.10 | +0.56% |
| 2015 | 90.69 → 90.16 | −0.58% |
| 2019 | 91.95 → 91.93 | −0.02% |
| 2023 | 100.08 → 100.37 | +0.29% |

No splicing needed. No gaps in 487 months.

**Core CPI is included** as code `93000` (พื้นฐาน), which is what makes §2's identification possible. Also useful: `90000` raw food and energy, and the eight top-level groups.

### 4A.1 Descriptive

CPI y/y over the full sample: mean **2.80%**, sd **2.52%**, minimum **−4.36%** (July 2009), maximum **+10.48%** (June 1998, the post-float passthrough spike).

Largest monthly moves: −2.90% (Aug 2008), **+2.75% (Apr 2026)**, +2.61% (Aug 1997). The April 2026 energy shock is the **second largest single month in forty years.**

### 4A.2 The opening position

| | Jan 26 | Feb | Mar | **Apr** | May | Jun | Jul |
|---|---|---|---|---|---|---|---|
| Headline y/y | −0.66 | −0.88 | −0.08 | **+2.89** | +2.79 | +2.42 | +1.95 |

April 2026 by category, month on month: transport and communication **+10.13%**, raw food and energy **+8.37%**, food +1.13%, housing **exactly 0.00%**.

Thailand was in **outright deflation through the first quarter of the game window**, and one energy shock flipped it to nearly 3% inflation in a single month, unwinding over the following three. Everything except energy and transport was flat.

This is the cleanest possible illustration of §2: Thai headline inflation is energy (coefficient 0.240) far more than it is demand (0.042). The player inherits both a deflationary starting point and an immediate imported spike they neither caused nor can undo — and the political salience of fuel prices (DESIGN §9.5) means they will be blamed for it.

---

## 5. Revised approach to calibration

1. **Take structural parameters from the literature.** BOT working papers, IMF Article IV, academic Thai macro estimates. Central values plus dispersion for the per-run parameter draw (DESIGN §5.6).
2. **Use the panel to validate, not to fit.** The 1993–2026 backtest is the acceptance gate, and it is a strong one precisely because the parameters did not come from it.
3. **Estimate only what is cleanly identified.** Persistence terms, shock magnitudes, and accounting identities. Not policy responses.
4. ~~Add world demand~~ **Done** (§4). World demand is the best-identified block in the project and should be used directly: export elasticity 0.85, IGREA 0.043.
5. ~~Add CPI~~ **Done** (§4A). 487 months, 1986–2026, pre-chained, with core. It corrected §2.
6. **Do not rely on trade elasticities to bound appreciation** (§4.2). Model FX as an outcome and let the degenerate path be unreachable rather than self-defeating.

---

## 6. Reproducing this

```
python3 scripts/build_panel.py     # writes config/panel_quarterly.json
cd scripts && python3 estimate.py  # core equations
cd scripts && python3 probe.py     # alternative specifications
cd scripts && python3 trade.py     # trade block with world demand
cd scripts && python3 phillips.py  # Phillips curve on CPI
```

Raw output: `/ESTIMATION_OUTPUT.txt` and `/ESTIMATION_TRADE.txt`.

```
```

Every number in this document comes from those two scripts against the committed panel. Re-running after a new NESDC release will change them slightly; re-running after adding world demand should change §4 substantially.
