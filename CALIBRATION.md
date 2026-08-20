# Calibration Notes

*What the data changed about the design. Companion to `DESIGN.md`.*

**Primary source for the real block: NESDC quarterly national accounts, 1993Q1–2026Q2 (§9).** IMF WEO is retained for fiscal, debt, PPP and the projection baseline, which NESDC does not publish (§9.6).

**Source:** IMF WEO release 9.0.0, Thailand, 40 series, annual 1980–2031.
**Raw:** `/data/dataset_2026-08-18T12_17_55...csv`
**Tidy:** `/config/imf_weo_thailand.json`
**Extracted:** 18 August 2026

Years 1980–2025 are outturn/estimate. **2026–2031 are IMF projection and are treated throughout as the game's scoring baseline** — the counterfactual of a competent but unremarkable government.

---

## 1. The five findings that changed the design

### 1.1 The target gap is larger than assumed, and the shape of it is different

| | Value |
|---|---|
| 2025 nominal GDP per capita | **USD 8,057** |
| 2030 IMF baseline | **USD 9,092** |
| Baseline CAGR 2025→2030 | 2.45%/yr |
| CAGR required for 15,000 | **13.24%/yr** |
| Target as multiple of baseline | **1.65×** |

The earlier draft guessed ~7,500 and assumed a doubling. The real number is higher and the required multiple lower — but the composition matters more than the size. Decomposing the baseline:

- Real GDP per capita growth: ~2.3%/yr
- GDP deflator: ~1.5%/yr
- Population: **−0.11%/yr** (helping, slightly)
- Nominal LCU per capita growth: **3.5%/yr**
- FX drift 32.88 → 34.6: **−1.0%/yr**
- **Net USD: 2.45%/yr**

A full percentage point of the gap between LCU growth and USD growth is pure exchange rate. Which leads directly to:

### 1.2 The exchange rate dominates every other lever — this is now the central design risk

2030 nominal GDP per capita in USD, across growth outcomes and exchange rates. Baseline LCU per capita 2030 = 314,600 THB.

| | FX 24 | FX 28 | FX 30.9 | FX 32.9 | FX 34.6 |
|---|---|---|---|---|---|
| Baseline | 13,108 | 11,236 | 10,181 | 9,562 | **9,092** |
| +1pp real | 13,777 | 11,809 | 10,700 | 10,050 | 9,556 |
| +2pp real | 14,472 | 12,404 | 11,240 | 10,557 | 10,038 |
| +2pp real, +2pp inflation | **15,977** | 13,694 | 12,409 | 11,655 | 11,082 |
| +3pp real, +3pp inflation | 17,608 | 15,093 | 13,676 | 12,845 | 12,214 |

Two readings:

**The trap works.** 15,000 is reachable at exactly one cell that doesn't require heroic assumptions — +2pp real, +2pp inflation, FX 24. Every component of that is available to the player and the combination is a disaster for the country. Exactly the design intent.

**The trap is too easy.** Doing *nothing* at FX 24 yields 13,108, which beats +3pp real and +3pp inflation at an unchanged rate (12,214). If the model lets the player appreciate the baht without consequence, there is no game — just one decision repeated twenty times.

**Requirement.** The FX→real feedback must be strong enough to be self-limiting: appreciation must crush tourism receipts, gut export volumes, flip the current account negative, and feed back into the IS block hard enough that the top-left corner recedes as the player approaches it. Pure-FX play should peak somewhere around 10,500 and then decline.

Pure-FX arithmetic for reference: reaching 15,000 on baseline LCU alone requires **20.97 THB/USD** — a 36% appreciation from 2025. Thailand's REER has never sustained anything close.

**This is the first thing to test in the calibration sweep, before any other work.**

### 1.3 The unemployment rate is unusable

WEO reports Thai unemployment as **exactly 1.0% for all 52 years, 1980–2031.** Outturn and projection, through the Asian Financial Crisis and the pandemic alike.

This is a placeholder, and it also reflects something real: with a very large informal sector and no meaningful unemployment insurance, Thai workers do not become unemployed — they become underemployed, or return to agriculture. Open unemployment is not where Thai labour slack lives.

**Consequence:** unemployment comes off the dashboard entirely. Replace with a constructed **labour underutilisation index** (informality share, underemployment, agricultural employment share, hours). This responds to policy, makes the informality reform agenda visible, and is honest. It must be labelled as a constructed indicator.

This also removes a card trigger — "unemployment above threshold → emergency employment programme" has to key off the new index instead.

### 1.4 There is almost no fiscal space, and the baseline consumes what exists

| | 2025 | 2030 baseline |
|---|---|---|
| Gross debt, % GDP | 64.7 | **69.5** |
| Revenue, % GDP | 21.1 | 21.1 |
| Expenditure, % GDP | 23.0 | 23.3 |
| Overall balance, % GDP | −1.9 | −2.2 |
| Primary balance, % GDP | −0.75 | −0.78 |

Against a statutory ceiling of 70% **[VERIFY]**, the player starts with roughly **5 percentage points of GDP** of headroom for the entire twenty turns — and doing nothing at all uses nearly all of it.

This is much tighter than the original design assumed, and it is a genuine improvement. Fiscal policy becomes arithmetically scarce from turn one. The player cannot spend their way to the target, and is forced onto the revenue side — where the base is narrow, revenue has been flat at 21% of GDP for a decade, and broadening it is the most politically costly reform available.

**Consequence:** debt/GDP against the ceiling is promoted to the primary dashboard row. Raising the ceiling becomes a significant scripted card with real credibility costs.

### 1.5 Inflation is far lower than a standard model would assume

| Year | CPI, % |
|---|---|
| 2023 | 1.23 |
| 2024 | 0.40 |
| 2025 | **−0.13** |
| 2026–2030 avg | 1.20 |
| 2031 | 1.80 |

Thailand was in **outright deflation in 2025**, and the IMF does not project a return to 2% within the window.

The Phillips curve slope must be calibrated very flat, and the player should find demand-driven inflation nearly impossible to generate. The dominant inflation channels are FX passthrough and energy prices — both of which the player influences indirectly.

**Consequence for the BOT (§7):** the central bank is persistently undershooting. Its reluctance to ease therefore cannot be modelled as inflation aversion — it has to be the financial-stability and household-debt term. That term becomes the primary source of BOT–government friction, which is both more accurate and more interesting than a generic hawk/dove axis.

**Consequence for the trap:** +2pp of inflation, which the outcome grid needs for the 15,000 path, is itself a major policy achievement from a −0.1% base. The degenerate path is harder than it looks.

---

## 2. Initial state (2025 outturn → Q1 2026 start)

| Variable | Value | Series |
|---|---|---|
| Nominal GDP | 18,976 bn THB | NGDP |
| Nominal GDP, USD | 577.0 bn | NGDPD |
| Nominal GDP per capita, USD | 8,056.57 | NGDPDPC |
| Nominal GDP per capita, THB | 264,922 | NGDPPC |
| Real GDP growth | 2.41% | NGDP_RPCH |
| GDP per capita, PPP | 26,260 intl$ | PPPPC |
| Population | 71.62 m | LP |
| CPI inflation | −0.13% | PCPIPCH |
| Implied FX | 32.88 THB/USD | NGDP/NGDPD |
| PPP conversion | 10.09 THB/intl$ | PPPEX |
| Gross debt | 64.69% GDP | GGXWDG_NGDP |
| Revenue | 21.06% GDP | GGR_NGDP |
| Expenditure | 22.97% GDP | GGX_NGDP |
| Overall balance | −1.91% GDP | GGXCNL_NGDP |
| Primary balance | −0.75% GDP | GGXONLB_NGDP |
| Current account | +3.07% GDP | BCA_NGDPD |
| Gross capital formation | 22.07% GDP | NID_NGDP |
| Gross national savings | 25.14% GDP | NGSD_NGDP |

Note the savings–investment gap of ~3pp, matching the current account surplus. The identity closes, which is a good sign for building the external block on this data.

---

## 3. Baseline projection path (the score-against line)

| | 2026 | 2027 | 2028 | 2029 | 2030 | 2031 |
|---|---|---|---|---|---|---|
| USD per capita | 8,105 | 8,170 | 8,392 | 8,730 | **9,092** | 9,498 |
| Real growth, % | 1.50 | 2.10 | 2.29 | 2.46 | 2.50 | 2.50 |
| CPI, % | 0.92 | 1.01 | 1.20 | 1.40 | 1.50 | 1.80 |
| Debt, % GDP | 66.8 | 67.8 | 68.6 | 69.1 | **69.5** | 69.7 |
| Balance, % GDP | −2.23 | −1.94 | −2.04 | −2.19 | −2.20 | −2.22 |
| Current a/c, % GDP | 0.71 | 1.41 | 1.91 | 2.32 | 2.48 | 2.67 |
| Population, m | 71.56 | 71.49 | 71.41 | 71.32 | 71.22 | 71.10 |
| Implied FX | 33.5 | 34.3 | 34.6 | 34.6 | 34.6 | 34.6 |

The IMF assumes a flat 34.6 exchange rate from 2028 — i.e. **no view**. That is convenient: it means every unit of FX movement in the game is attributable to the player and to modelled shocks, with no baseline drift to disentangle.

The 2026 real growth figure of 1.50% is notably weak and gives the player a difficult opening turn.

---

## 4. What the data does not provide

Sourced separately before engine work:

| Need | Why | Likely source |
|---|---|---|
| **Quarterly national accounts** | Turn granularity is quarterly | NESDC |
| Policy rate history | Monetary block, backtest | BOT |
| Bond yield curve | Risk premium, SET discount rate | ThaiBMA |
| **SET index history** | Primary dashboard element | SET |
| Nominal & real effective FX | FX block, backtest | BOT / BIS |
| Tourist arrivals & receipts | Dedicated tourism block (§5.4) | Ministry of Tourism |
| **Household debt / GDP** | State-dependent consumption damper | BOT |
| Credit aggregates, LTV/DSR rules | Macroprudential lever | BOT |
| Labour force survey detail | Building the underutilisation index | NSO |
| Informality share | Structural block | NSO / ILO |
| Working-age population by cohort | Production function labour input | UN WPP / NSO |
| Government finance by function | Budget screen categories | BoB / MoF |
| **Parliamentary seat counts, coalition** | Entire political model | Election Commission |
| Party platforms | Ideology vectors | Party manifestos |
| Election timing | Hard deadline inside window | **[VERIFY]** |

The bolded rows are blocking. Everything else can be approximated for a first engine.

---

## 6. Political data — February 2026 House

**Source:** user-supplied post-election seat counts. **Tidy:** `/config/parties.json`

House 500 (1 vacant), majority **251**. Player leads **Bhumjaithai, 191 seats — 60 short**.

### 6.1 The arithmetic reduces to three parties

| Party | Seats | Cumulative with BJT |
|---|---|---|
| Bhumjaithai | 191 | — |
| People's | 120 | 311 (+60) |
| Pheu Thai | 74 | 265 (+14) |
| Kla Tham | 58 | **249 (−2)** |
| Democrat | 21 | 212 |
| 17 others | 35 | — |

Two structural facts emerge without being designed in:

**The two-seat gap.** BJT + Kla Tham = 249. Exactly two short. The eight single-seat micro-parties become extortionately valuable, and any conservative coalition is permanently hostage to individual members. This is an accurate feature of Thai coalition politics that falls straight out of the numbers.

**The player has a credible outside option working against them.** Pheu Thai + People's + Kla Tham = **252**. Those three can govern without Bhumjaithai. Coalition formation is therefore negotiation under threat, and a mid-run collapse may not mean an election — it may mean a government forms without the player.

### 6.2 Consequence: the game now opens in February 2026

Start date moved from Q1 2026 generally to **February 2026 specifically**, the election month, with coalition formation as a **prologue before turn one** (DESIGN §9.8). Run length is 19 quarterly turns, Q2 2026 → Q4 2030.

This is a significant improvement. The coalition choice fixes the ideological bounds of everything the player can subsequently pass, and the three viable coalitions produce genuinely different games:

| Coalition | Seats | Character |
|---|---|---|
| + Pheu Thai | 265 | Thin majority, credible collapse threat, expensive in transfers — direct pressure on the 70% ceiling |
| + People's | 311 | Only mandate large enough for structural reform; hardest ideological fit |
| + Kla Tham + Democrat | 270 | Comfortable, cheap, hostile to the reforms that move TFP — the "comfortable decline" path |
| + Kla Tham + micro | 251 | Maximum freedom, permanent defection risk |

### 6.3 The Senate

200 seats, non-partisan. **Not modelled as parties.** Collapsed to a single `establishment_alignment` scalar (0–100, starts at 55) gating constitutional and organic-law change and feeding institutional stability, the risk premium, and the FDI signal.

Right level of abstraction: modelling 200 non-partisan senators individually adds complexity for no gameplay; ignoring the chamber misrepresents what a Thai government can pass.

### 6.4 Caveat on ideology vectors

The vectors in `parties.json` are **placeholder assumptions** on a −2..+2 scale over seven dimensions, derived from broad public platform orientation. They are the most contestable content in the project and the most consequential for how the political model behaves. They must be reviewed against actual party manifestos before playtesting. They sit in config, commented, precisely so they can be argued with.

---

## 7. SET Index — monthly, January 2024 to August 2026

**Source:** user-supplied export. **Tidy:** `/config/set_history.json`, 32 observations.

| Statistic | Value |
|---|---|
| Mean monthly return | +0.55% |
| Monthly standard deviation | 5.15% |
| **Annualised volatility** | **17.8%** |
| Worst month | −8.43% (Feb 2025) |
| Best month | **+15.29% (Feb 2026)** |
| Trough | 1,089.56 (Jun 2025) |
| Latest | 1,621.62 (Aug 2026) |

### 7.1 The opening position is a gift

The index fell 26% from 1,466 (Oct 2024) to 1,090 (Jun 2025), then rallied **49% into the election** — including +15.29% in February 2026 itself, the largest month in the sample.

The player takes office into a market that has already priced substantial optimism about them. This teaches the single most important thing about the SET as a game mechanic, with no tutorial text required: **the index measures disappointment relative to expectation, not performance in absolute terms.** It can fall on good policy if the policy is less than what was priced. Turn one already contains that lesson.

### 7.2 Calibration

The sentiment process (DESIGN §5.3) should reproduce 17.8% annualised volatility with the observed fat-tailed, event-driven character — two months beyond ±14% in a 32-month sample is not Gaussian. Jump-diffusion on political and policy events, mean-reverting noise otherwise.

**Gap:** 32 monthly observations is enough to calibrate volatility, not enough to estimate the index's beta to nominal GDP, rates, or FX. Longer daily or monthly history back to at least 2010 is needed before the SET block can be estimated rather than assumed.

---

## 9. NESDC quarterly national accounts — the real block

**Source:** NESDC Quarterly GDP, Q2/2026 release, 40 tables.
**Raw:** `/data/nesdc-Q2-2026/`  **Builder:** `/scripts/build_nesdc.py`  **Tidy:** `/config/nesdc_quarterly.json`
**Coverage:** **134 quarters, 1993Q1 → 2026Q2.** 15 tables retained, ~270 series.

This is the dataset the engine should be built on. It resolves the largest blocking gap in §4: the model is quarterly and now the data is too, at full expenditure and sector detail, running through the game's own start date.

### 9.1 The investment collapse is the story

Gross fixed capital formation, % of nominal GDP:

| | 1996 | 2010 | 2019 | 2024 | 2025 |
|---|---|---|---|---|---|
| **Private** | **31.2** | — | 16.9 | 16.4 | 16.5 |
| **Public** | **10.5** | — | 5.7 | 5.7 | 6.1 |
| **Total** | **41.7** | 24.0 | 22.6 | 22.1 | **22.7** |

Thailand invested **41.7% of GDP in 1996**. It invests **22.7% today**. Private investment fell by nearly half and, thirty years after the Asian Financial Crisis, has never recovered. This is not a slow drift — it is a level break in 1997–98 that simply never mean-reverted.

That single table is the middle-income trap, and it reframes the game. The 15,000 target is not a demand problem or a productivity-policy problem in the abstract; it is an **investment rate problem**. Closing even a third of the gap back to the 1996 rate would transform the capital-accumulation term in the production function (DESIGN §5.3).

It also sets a hard scale on the player's direct lever: **public investment is only 6.1% of GDP.** Against roughly 5pp of GDP in total debt headroom (§1.4), the player cannot meaningfully move the aggregate investment rate through the public capital budget. They have to induce **private** investment — which means the business environment, FDI, credit conditions, and confidence, not the capex line. The design's emphasis on structural reform over spending is now forced by the data rather than asserted.

### 9.2 Expenditure structure has inverted

% of nominal GDP:

| | 1996 | 2019 | 2025 |
|---|---|---|---|
| Private consumption | 51.7 | 49.8 | **58.5** |
| Government consumption | 11.6 | 16.2 | 16.7 |
| Investment | 41.7 | 22.6 | 22.7 |
| Exports | 39.0 | 59.5 | **71.2** |
| Imports | 45.3 | 50.2 | 67.3 |

Two consequences:

**Thailand became a consumption economy.** Consumption rose seven points while investment fell nineteen. Stimulus aimed at households now hits a much larger share of GDP — which makes transfers politically attractive and economically hollow, exactly the trap the expenditure table in DESIGN §6.2 describes.

**Openness nearly doubled.** Exports at 71% of GDP make this one of the most trade-exposed economies of its size. This is important for the FX-dominance problem (§1.2): the feedback channel from appreciation to real output is not a modelling nicety here, it is arithmetically enormous. An economy with 71% export share cannot appreciate 25% without severe real consequences. **The data supports the feedback being strong enough to be self-limiting** — which is the first genuine evidence that the central design risk is manageable.

### 9.3 Tourism is a 10-point swing

Services exports, % of GDP: **14.9 (2019) → 4.9 (2021) → 13.2 (2025).**

A ten-percentage-point swing in GDP from a single channel, realised over two years. This validates the dedicated tourism block in DESIGN §5.4 and sets the magnitude for tourism shock cards — they should be capable of moving GDP by several points, not fractions of one.

Accommodation and food services is 6.3% of GDP on the production side; adding transport (5.5%) and the retail share attributable to visitors puts the directly tourism-exposed economy near a tenth of output.

### 9.4 Volatility and trend, by regime

Real GDP, seasonally adjusted, chain volume, q/q:

| Sample | Mean q/q | SD | Implied annual trend |
|---|---|---|---|
| Full 1993–2026 | 0.80% | 2.08% | 3.24% |
| 2000+ | 0.80% | 1.92% | 3.24% |
| 2000+, ex-2020/21 | 0.88% | 1.56% | 3.57% |
| **2015+, ex-2020/21** | **0.66%** | — | **2.67%** |

Trend growth is decaying: 3.6% in the 2000s, **2.67% in the last decade excluding the pandemic.** The IMF's 2.5% projection is consistent with that trajectory, which is reassuring for using WEO as the baseline.

Extreme quarters, for shock calibration: −9.2% (2020Q2), −6.3% (2011Q4, the floods), −4.1% (1997Q1 and 1998Q2). The 2011 flood quarter is nearly as severe as the Asian Financial Crisis — worth remembering when writing natural-disaster shock cards.

### 9.5 There is no slack at the start of the game

HP filter (λ=1600) on log real GDP SA gives an output gap with SD 2.79%, ranging −8.9% (2020Q2) to +8.1% (1996Q2).

Current readings: **2025Q4 +1.02%, 2026Q1 +1.01%, 2026Q2 +0.24%.**

The economy is running **at or slightly above trend** when the player takes office. This matters enormously for the state-dependent fiscal multipliers in DESIGN §5.3: multipliers are largest when slack is large, and there is no slack. **The player's fiscal firepower is at its weakest precisely when they most want to use it**, and any stimulus in the early turns will leak into imports and prices rather than output.

That is a genuinely difficult and accurate opening position, and it should not be softened.

### 9.6 What NESDC does *not* provide — keep the IMF

NESDC is national accounts only. It has no fiscal balance, no public debt, no PPP conversion, no exchange rate, and no projections. The IMF WEO file therefore stays, with a clean division of labour:

| Block | Source |
|---|---|
| Real GDP, expenditure, sectors, investment, trade volumes | **NESDC quarterly** |
| Revenue, expenditure, deficit, gross debt | IMF WEO |
| PPP levels and conversion factor | IMF WEO |
| Population | IMF WEO |
| 2026–2031 baseline for scoring | **IMF WEO — irreplaceable** |
| Exchange rate | Derived NGDP/NGDPD; needs BOT for a proper series |

The scoring baseline in particular exists nowhere else. Dropping WEO would remove the line the entire victory condition is measured against.

### 9.7 A free gift: revision flags

NESDC marks revised and preliminary quarters in the source files — 2026Q1 is published as `Q1r`. The builder now captures these as `revision_flags` rather than discarding them.

This is direct empirical grounding for the data-revision mechanic in DESIGN §8. Rather than inventing a revision process, the game can reproduce the observed one: which quarters get revised, how late, and by how much. Comparing successive NESDC vintages would give the actual revision distribution — worth collecting if past releases are available.

---

## 11. Financial and external block — BIS via FRED

**Tidy:** `/config/financial.json`. Sourced from public BIS series on FRED. Two items remain gated (§11.4).

### 11.1 Household debt — and the finding that resolves the central design risk

`QTHHAM770A`, BIS, quarterly, **1991Q4–2025Q4, 137 observations.** Aligns almost exactly with the NESDC span.

| | % of GDP |
|---|---|
| 1991Q4 (start) | 30.7 |
| **1997Q3 (AFC peak)** | **64.8** |
| 2001Q2 (post-crisis trough) | 47.2 |
| **2021Q1 (all-time peak)** | **96.6** |
| **2025Q4 (latest)** | **87.5** |

**Thailand is far more household-indebted today than it was at the Asian Financial Crisis** — 87.5% now against 64.8% then. That single comparison justifies two design choices that were previously assertions:

- The **state-dependent consumption damper** (DESIGN §5.4). At 87.5%, transfers to households are substantially absorbed by deleveraging rather than spent. The multiplier on handouts should be visibly poor, and the player should be able to discover this.
- The **BOT's financial-stability term** (DESIGN §7). With inflation at −0.1% (§1.5), the central bank's reluctance to ease cannot be inflation aversion. At 87.5% household debt it is obviously financial stability. This is now the confirmed primary axis of BOT–government friction.

Note also the shape: debt fell 30 points over the decade after 1997 and rose 45 points from 2008 to 2021. Deleveraging is slow and takes a decade, which is far longer than the player's twenty turns. **Household debt is effectively a fixed constraint within the game window, not a variable the player can fix.**

### 11.2 REER — the FX-dominance question is now settled

`RBTHBIS`, BIS real broad effective exchange rate, index 2020=100, monthly **1994-01 to 2026-06**.

| | Index |
|---|---|
| 1997-01 (pre-crisis peak) | **105.04** |
| 1998-01 (twelve months later) | **62.49** |
| 2020-01 | 103.45 |
| **2026-06 (latest)** | **99.99** |
| **1997-06 (true peak — complete monthly series)** | **111.83** |
| Sample maximum, 32 years | **111.83** |
| Sample minimum | 62.49 |

The 1997→98 move is a **−40.5% real depreciation in twelve months** — the single most violent adjustment in the dataset, and the reason the 1993–2026 backtest is such a demanding test of the FX block.

But the decisive number is this. The degenerate path in §1.2 requires the baht at roughly **24 THB/USD**, from 32.88 today. Holding relative prices constant, that implies a REER of about **137**.

**The 32-year maximum is 111.83**, set in June 1997 weeks before the float. A REER of 137 is a **22% overshoot** beyond anything Thailand has ever experienced.

*(Corrected: an earlier draft of this section cited 105.04 as the maximum, taken from January readings only. The complete monthly series — now in `financial.json`, 390 observations, `"complete": true` — puts the peak at 111.83. The overshoot falls from 30% to 22%; the conclusion is unchanged.)*

This resolves open question #1 — the highest-priority design risk — in the design's favour. The appreciation path is not merely costly, it is outside the historical envelope by a wide margin, and an economy with exports at 71% of GDP (§9.2) would not survive the attempt. The model does not need an artificial penalty to make the trap self-limiting; a correctly specified trade block calibrated on this data will do it. The calibration sweep should still confirm it, but the concern that the game collapses into "appreciate and ignore everything" is now substantially retired.

Latest REER of 99.99 also means the baht is currently at roughly its long-run average — no meaningful misvaluation to inherit at the start of the game.

### 11.3 Private non-financial credit

`QTHPAM770A`, BIS, % of GDP. **1997Q4 peak 250.1 → 2025Q4 156.0.** Household is 87.5 of that, implying corporate credit near 68% of GDP.

Corporate deleveraging since 1997 has been enormous and is the credit-side counterpart to the investment collapse in §9.1: Thai firms stopped borrowing and stopped investing at the same time, and neither reversed. Useful for the credit channel, and a reminder that the investment problem is not a credit-supply problem.

### 11.4 Still gated

| Series | Where | Why not here |
|---|---|---|
| **Policy rate** (1-day bilateral repo, MPC history) | BOT "Policy Interest Rate" page — Excel download, "Table MPC Decision" | Not on FRED; behind a page-level download |
| **Government bond yields** (10-year benchmark minimum) | ThaiBMA API, or BOT table `FM_RT_001_S2` | ThaiBMA is subscription with a free trial; BOT portal is interactive |
| Nominal THB/USD | BOT API portal, free registration | Needs an API key. REER covers the competitiveness channel meanwhile; implied annual rate is in the WEO file |

These are two downloads, not a research problem. The BOT Excel and a ThaiBMA trial would close the block.

**REER is now complete** — 390 monthly observations, 1994-01 to 2026-06, flagged `"complete": true` in the config. The private credit series remains partial (annual snapshots plus recent quarters) and should be refetched before use.

Two gaps now block estimation rather than description, and they are the priority (see `MODEL.md` §4–5): **world demand** for the trade block, and **quarterly CPI** for the BOT reaction function.

---

## 13. Policy rate — BOT MPC decision history

**Source:** BOT "Table MPC Decision 3/2026". **Raw:** `/data/table-mpc-2026-3.xlsx`
**Builder:** `/scripts/build_mpc.py`  **Tidy:** `/config/policy_rate.json`
**Coverage:** **190 meetings, May 2000 – June 2026**, 65 rate changes, quarter-end series for 105 quarters.

Better than a plain rate series: the workbook carries the **decision and the vote split** for each meeting, which feeds both the reaction function and the appointment mechanic.

### 13.1 There is no monetary space left

| | Rate |
|---|---|
| Historic maximum | 5.00% (2006) |
| **Effective lower bound** | **0.50%** (May 2020 – June 2022, held for two years) |
| End-2023 | 2.50% |
| **Current, at game start** | **1.00%** |

The BOT has cut seven times in roughly two years, from 2.50% to 1.00%. Against a demonstrated floor of 0.50%, **the player inherits 50 basis points of conventional easing and nothing more.**

Year-end path, for the shape of it:

`2006: 5.00 · 2011: 3.25 · 2015: 1.50 · 2020: 0.50 · 2022: 1.25 · 2023: 2.50 · 2025: 1.25 · 2026: 1.00`

### 13.2 Every conventional lever is exhausted at kickoff

Assembling the four constraints now established from data:

| Lever | Headroom at February 2026 |
|---|---|
| **Fiscal** | ~5pp of GDP to the 70% debt ceiling — and the do-nothing baseline consumes it (§1.4) |
| **Monetary** | **50bp to the demonstrated floor** (§13.1) |
| **Demand slack** | None. Output gap +0.2% to +1.0% (§9.5) |
| **Household balance sheets** | 87.5% of GDP, above the AFC peak, and a decade from repair (§11.1) |

This is a remarkably coherent opening position and it was not designed — it fell out of four independent datasets. **The player takes office with no fiscal room, no monetary room, no slack, and an over-levered household sector.** Every conventional demand-management response is already spent.

Which means the game's thesis is now enforced by the initial conditions rather than by designer fiat: the only remaining levers are supply-side and structural. A player who reaches for stimulus will find there is nothing to reach for. That is the lesson the design wanted to teach, and the data teaches it in the first turn without a word of tutorial text.

### 13.3 The MPC genuinely splits — use it

Of 98 meetings with recorded vote balances, **39 (40%) were non-unanimous.** The committee is seven members and dissent is routine. Recent examples:

| Date | Decision | Vote |
|---|---|---|
| 2024-10-16 | Cut 25bp | 5–2 |
| 2025-02-26 | Cut 25bp | 6–1 |
| 2025-04-30 | Cut 25bp | 5–2 |
| 2025-10-08 | Hold | 5–2 |
| 2025-12-17 | Cut 25bp | 7–0 |

Two design consequences:

**The appointment mechanic gets real teeth** (DESIGN §7). Appointing a dove is not an abstract shift in `φ_y` — it moves the median voter on a seven-member committee where the margin is frequently one or two votes. A single appointment can flip outcomes, which makes the credibility cost a genuine trade rather than a formality.

**Vote splits are free UI.** Showing the MPC vote on the dashboard gives the player a legible, real-world-grounded read on how close the committee is to moving, without exposing the reaction function directly. It is exactly the kind of "visible mechanism, uncertain magnitude" the design's legibility pillar asks for.

### 13.4 The yield curve is dropped

Government bond yields are cut from scope. The sovereign risk premium (DESIGN §5.3) will be modelled as a spread over the policy rate driven by debt/GDP, the primary balance trajectory, the external position and political stability — calibrated judgementally rather than estimated, and flagged as such in §14 of the design.

This is an acceptable loss. The yield curve mattered mainly as an input to the SET discount rate and as a market-feedback signal, and the SET index itself already provides fast market feedback. Modelling the premium as a function rather than fitting it to data costs realism in one equation and removes a subscription dependency from the project.

---

## 14. Revisions made to DESIGN.md

| § | Change |
|---|---|
| 0 | Reading notes now distinguish WEO-anchored figures from remaining `[VERIFY]` items |
| 1 | Target arithmetic replaced with real numbers; premise restated around the 1.65× gap |
| 3.3 | Score bands rebuilt against the 9,092 baseline; "exceptional" moved to ≥12,500 |
| 3.4 | **New** — the outcome grid, and the FX-dominance design requirement |
| 5.2 | Unemployment removed; labour underutilisation index specified |
| 5.3 | Phillips slope flagged very flat with data; deflation base noted |
| 5.4/5.5 | Population path from WEO; note that decline already flatters per-capita |
| 5.6 | Backtest window extended to **1997–2025**; data inventory added |
| 6.1 | Revenue/expenditure ratios from WEO |
| 6.3 | **Rewritten** — 5pp of fiscal headroom against a 70% ceiling, consumed by baseline |
| 7 | BOT friction reframed onto financial stability rather than inflation aversion |
| 11.1 | Dashboard: unemployment out, debt-vs-ceiling promoted to primary |
| 15 | FX-dominance test promoted to open question #1 |
| 16 | Backtest gate updated to 1997–2025 |
| 0 | Notes parties.json and set_history.json as supplied |
| 1 | Premise reframed: you are Bhumjaithai on 191 seats, 60 short |
| 4.1 | **Start moved to February 2026** with a coalition-formation prologue; 19 quarterly turns |
| 9.1 | **Rewritten** — real seat table, the two-seat gap, the 252-seat outside option |
| 9.6 | Senate specified as an `establishment_alignment` scalar |
| 9.7 | **Rewritten** — no scheduled election in window; dissolution becomes a player option and a threat |
| 9.8 | **New** — the February 2026 coalition-formation prologue |
| 11.1 | SET flagged as starting hot |
| 11.2 | **New** — opening market conditions and SET volatility anchors |
| 5.2 | Investment rate and private/public GFCF split added as tracked state |
| 5.3 | Production function reframed around the investment-rate gap; multiplier state-dependence anchored to a zero output gap at start |
| 5.4 | Tourism block sized at a 10pp-of-GDP shock range; openness at 71% of GDP |
| 5.6 | NESDC named as the primary real-block source; backtest window extended to **1993–2026** |
| 8 | Revision mechanic grounded in observed NESDC revision flags |
| 3.4 | FX-dominance risk substantially retired: baht at 24 implies REER 137 vs a 32-year max of 105 |
| 5.4 | Household debt damper anchored at 87.5% of GDP, above the AFC peak |
| 7 | BOT financial-stability term confirmed as the primary friction axis |
| 15 | Open question 1 downgraded from "central risk" to "confirm in sweep" |
| 5.2 | Policy rate initial state 1.00%; effective floor 0.50% recorded |
| 5.3 | Sovereign risk premium moved to a judgemental function; no yield data |
| 7 | **Rewritten** — 50bp of headroom, MPC vote splits, appointment mechanic sharpened |
| 11.1 | MPC vote split added to the dashboard |
| 14 | Yield curve omission added to the realism-compromise list |
