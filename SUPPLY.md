# Supply Side and the Legacy Mechanism

*Production function, capital accumulation, structural reform — and the first test of whether the design's central tension survives contact with the engine.*

**Calibration:** `/scripts/supply.py` → `/config/supply.json`
**Scenarios:** `cd engine && npx tsx src/scenario.ts` → `/SCENARIOS.txt`

## 1. The production function

```
Y_pot = TFP · K^0.45 · L^0.55
```

Capital stock by perpetual inventory on real GFCF, 5%/yr depreciation, initial stock from the steady-state relation. Labour is working-age population from WEO with an ageing profile. TFP is the Solow residual.

### 1.1 What it says about Thailand

| | 1995 | 2010 | 2025 |
|---|---|---|---|
| **K/Y ratio** | **6.12** | 3.92 | **3.58** |

The capital deepening of the boom was destroyed and never rebuilt — the capital-side counterpart to the investment collapse in `CALIBRATION.md` §9.1.

**Potential output growth, production-function measure:**

| Period | Growth |
|---|---|
| 2000s | 4.12% |
| 2010s | 2.76% |
| **2020s** | **1.51%** |

This is a substantive disagreement with the IMF, which projects 2.5% real growth through 2031. The production function says Thailand's *potential* growth is now around 1.5%, and the gap between those two numbers is worth understanding before the scoring baseline is finalised.

The PF output gap correlates **0.979** with the HP-filter gap used elsewhere, so the two measures agree on the cycle even where they disagree on trend.

## 2. Gestation and the reform channel

Two lags carry the design's second pillar — *lags are the drama*:

**Infrastructure gestation, 20 quarters.** Public capital spending enters a pipeline and only becomes productive capital five years later. In a 19-turn game **almost nothing a player builds ever lands inside their own term.**

**Reform stock.** Structural reform effort accumulates into a slowly-building, slowly-decaying stock that raises the private investment rate and TFP growth. All four reform parameters are **priors** — no Thai estimate exists for the reform-to-investment elasticity, and it is now the most consequential unmeasured relationship in the model. Scaled so sustained maximum reform lifts the investment rate ~4pp of GDP over five years: roughly a quarter of the way back to 1996.

## 3. Scenario test, 2026Q2 → 2030Q4

Eight fiscal and reform strategies over the actual game window.

| Strategy | 2030 headline | Legacy | Inv rate | Cum deficit |
|---|---|---|---|---|
| Do nothing | 8,691 | 2.08% | 18.0% | 8.1 |
| Transfers | 8,701 | 2.09% | 18.1% | 14.0 |
| Capital push | 8,709 | 2.10% | 18.1% | 17.3 |
| Capital, tax-funded | 8,658 | 2.03% | 17.9% | 11.4 |
| Consumption spree | 8,682 | 2.06% | 18.0% | 17.4 |
| **Reform, hard** | **8,733** | **2.26%** | 18.5% | 8.1 |
| **Reform + capital** | **8,751** | **2.29%** | 18.6% | 17.3 |
| Reform, late | 8,704 | 2.17% | 18.3% | 9.8 |

### 3.1 The lag tension is live, and now quantified

Gain over doing nothing, as a ratio of Legacy gain to Headline gain:

| Strategy | Headline | Legacy | Ratio |
|---|---|---|---|
| Transfers | +0.11% | +0.58% | 5.3× |
| Capital push | +0.21% | +1.02% | 5.0× |
| **Reform, hard** | **+0.48%** | **+9.08%** | **18.9×** |
| Reform, late | +0.15% | +4.43% | 29.6× |

**Five years of maximum structural reform buys +0.48% on the 2030 headline and +9.08% on potential growth.** The correct policy is nearly invisible on the scoreboard the player is judged by, and enormously valuable on the one measuring what the country actually gets.

That is precisely the tension DESIGN §3.2 introduced the Legacy score to capture, and it emerges from the engine rather than being imposed.

The capital push shows the gestation lag doing its work: **+0.21% on headline for 9.2pp of extra cumulative deficit**, because the five-year pipeline means almost nothing lands inside the window. A player who does the right thing pays for it now and never sees it.

Sequencing is visible too: "Reform, late" — two years of transfers, then reform — reaches only 4.43% of Legacy against 9.08% for reforming from turn one. Delay is expensive and the model prices it.

### 3.2 The finding that needs a design decision

**The total headline spread across all eight strategies is 93 USD — 1.1%.**

No fiscal or structural strategy available to the player moves the 2030 headline number by more than about one percent. That is not a modelling failure; it is correct economics. Fiscal policy moves the output gap, which is transient, and supply-side policy works through capital and TFP, which move slowly. Neither can shift a level much in nineteen quarters.

But it has two sharp consequences:

**It vindicates the outcome grid.** DESIGN §3.4 argued that the exchange rate is worth more to the Headline score than every real policy combined. The engine now confirms it with a number: real policy moves headline ~1%, while FX from 34.6 to 30.9 moves it ~12%. The trap the game is built around is real and reproduced.

**The score bands in DESIGN §3.3 are unreachable.** They call 11,000–12,500 "strong" against a 9,092 baseline. The engine says a player doing everything right lands near 8,750. Either the bands must be rebuilt around the achievable frontier — where a 1% headline gain is an excellent run — or Headline must be demoted and Legacy promoted to the primary score. **This is a design decision, not a calibration fix.**

### 3.3 The model runs 4.4% below the IMF baseline

Model "do nothing" reaches 8,691 for 2030 against the WEO baseline of 9,092. The gap comes from the supply side: production-function potential growth of ~2.1%/yr against the IMF's 2.5%, compounded over nineteen quarters.

Worth resolving before scoring is finalised. Either the IMF is optimistic about Thai potential — which the K/Y and TFP evidence in §1.1 supports — or the production function's labour and TFP paths are too pessimistic. The working-age population profile is currently an assumed ageing curve rather than UN WPP data, and that is the most likely place for the discrepancy to hide.

## 4. Outstanding

1. **UN WPP working-age population** — replace the assumed ageing profile. Cheapest way to test §3.3.
2. **Reform elasticities.** Four priors doing heavy lifting with no empirical basis. Cross-country evidence on business-environment reform and investment would help.
3. **Decide the scoring question in §3.2** before building the card deck — it determines what the cards are for.
4. Fiscal and debt accounting; FX and the BOT reaction function. Both still exogenous.
