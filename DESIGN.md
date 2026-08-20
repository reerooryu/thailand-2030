# Thailand 2030 — Design Document

*A quarterly-turn macroeconomic and political simulation. Working title.*

---

## 0. Reading notes

Macro figures in this document are now anchored to **IMF WEO data for Thailand, 1980–2031** (`/config/imf_weo_thailand.json`, 40 series). Figures drawn from that dataset are stated plainly. The real block is anchored to **NESDC quarterly national accounts, 1993Q1–2026Q2** (`/config/nesdc_quarterly.json`, 134 quarters, ~270 series). IMF WEO is retained for fiscal, debt, PPP, population and the scoring baseline — none of which NESDC publishes. Seat counts and coalition structure are supplied for the February 2026 post-election House (`/config/parties.json`). SET Index monthly history from January 2024 is in `/config/set_history.json`. Figures still needing a live source — the current policy rate, quarterly national accounts, household debt — remain marked **[VERIFY]**.

The WEO projection years 2026–2031 are treated as **the baseline the player is scored against** (§3). See `CALIBRATION.md` for what the data changed about this design.

Design stance, settled: the player is **head of government**; the document covers the **full vision** without a scoping pass; the model leans **heavily toward realism**, conceding to playability only where realism would produce a game with no decisions in it. §14 lists every place that concession is made, explicitly, so the honesty of the model can be audited.

---

## 1. Concept

You are the leader of Bhumjaithai in **February 2026**, holding 191 of 500 seats after the election and 60 short of a majority. Your first act is not a policy — it is assembling a government. Your government has declared a target: **nominal GDP per capita of USD 15,000 by the end of 2030.**

The target is not achievable. That is the design.

The arithmetic, from IMF WEO:

- Thailand's nominal GDP per capita was **USD 8,057 in 2025**.
- The IMF baseline for **2030 is USD 9,092** — a 2.45%/yr path.
- Hitting 15,000 by 2030 requires **13.24%/yr**, or **1.65× the baseline**.

That gap cannot be closed by growth. Baseline real growth is 2.2%/yr and inflation 1.2%/yr; even adding three percentage points to *both* — an extraordinary, arguably unprecedented policy success — reaches only about 12,200 at an unchanged exchange rate.

15,000 is reachable in the model, but only through a combination of strong real growth, sustained inflation, **and** a baht appreciating to roughly 24 THB/USD. That path is available, and it is a catastrophe. See §3.4.

The game is therefore about the gap: how far you close it, what you spent to get there, and whether what you did left the country better off or merely made the headline number bigger. Because the target is denominated in nominal USD, two of its three levers are cheap tricks — inflate domestically and appreciate the currency and the number rises without a single Thai being better off. The game tracks that separately and scores it (§3). Discovering this tension is the intended arc of a first playthrough.

The second constraint is political. You lead a coalition. The reforms that actually raise potential output are the ones your partners will not vote for, and losing your majority ends the run.

The third is time. Structural reform pays off in eight to twenty years. You have twenty quarters.

**Reference points.** *Social Democracy: An Alternate History* for the decision-queue-over-a-stat-layer shape. *Democracy 4* for policy-as-continuous-dial and the interconnection web. Paradox grand strategy for the political-arithmetic layer. This differs from all three in having a real macro simulator underneath rather than a scoring rubric — outcomes must be producible that no one authored.

---

## 2. Design pillars

1. **The model is real.** A semi-structural macro model with genuine lags, genuine uncertainty, and genuine identities. If the player does something incoherent, the model should produce the incoherent result, not a scripted rebuke.
2. **Lags are the drama.** The core dramatic device is that correct decisions frequently lose inside the window. The player must knowingly choose between winning and being right.
10. **You cannot see the present.** Data arrives late, noisy, and revised. Decisions are made in fog. This is the single largest source of difficulty and the one most games omit.
9. **Politics is arithmetic, not mood.** Passage requires votes. Votes come from parties with platforms. No single "political capital" bar.
5. **Legibility over concealment.** Players should be able to reverse-engineer the rules. Hidden multipliers are frustrating; visible mechanisms with uncertain magnitudes are interesting.
8. **No editorializing.** Parties respond mechanically to policy categories per their stated platforms. The game is a system, not a commentary.

---

## 3. Victory, defeat, and scoring

### 3.1 Run termination

A run ends at **Q4 2030** or earlier on any of:

- **Loss of confidence.** A no-confidence motion passes, or the coalition falls below a working majority and cannot be reconstituted within two turns.
- **Fiscal crisis.** Debt service exceeds a hard threshold with no market access — bond auction failure, forced consolidation, run ends in an IMF programme.
- **Election defeat.** If a general election falls inside the window (§9.7) and the player's coalition cannot form a government.

Termination before Q4 2030 is scored on whatever was achieved to that point, with a completion penalty. It is a loss, not a crash — the player sees a full post-mortem.

### 3.2 The four scores

The end screen reports four numbers. There is no single aggregate. This is deliberate: collapsing them hides the tradeoff the game exists to teach.

| Score | Measures | Notes |
|---|---|---|
| **Headline** | Nominal GDP per capita in USD, Q4 2030 | The stated target. Gameable via inflation and FX. |
| **Substance** | Real GDP per capita at PPP, plus median real household income, plus the change in estimated potential output growth | What actually happened to Thai living standards and future capacity. |
| **Stability** | Inflation deviation from target, output gap volatility, debt/GDP trajectory, external balance | Did you leave the economy fragile? |
| **Legacy** | Potential output growth rate *at the end of the run*, plus committed-but-undelivered project pipeline | What the next government inherits. Rewards the megaprojects that pay off after 2030. |

The **Legacy** score is the mechanism that makes long-horizon decisions rational to a player who cares about their end screen, without making them rational inside the Headline number. It should be presented with equal visual weight.

### 3.3 Score bands

Bands are set against the IMF baseline, not against an abstract notion of good play. The baseline **is** the no-action counterfactual, which is exactly what a score should be measured against.

| 2030 Headline (USD per capita) | Verdict |
|---|---|
| ≥ 12,500 | Exceptional — near the model's frontier |
| 11,000–12,500 | Strong |
| 10,000–11,000 | Solid — meaningfully above baseline |
| 9,000–10,000 | Roughly baseline; you governed, nothing changed |
| < 9,000 | Underperformance — you made things worse |

**IMF baseline 2030: 9,092.**

> **These bands are now known to be unreachable and must be rebuilt.** The engine's scenario test (`SUPPLY.md` §3) finds that the *entire spread* across eight fiscal and reform strategies is **93 USD — 1.1%** — and that a player doing everything right lands near 8,750, below the IMF baseline. No real policy moves a 2030 level much in nineteen quarters; that is correct economics, not a modelling failure.
>
> Two options, and this is a design decision rather than a calibration fix:
> **(a)** rebuild the bands around the achievable frontier, where a 1% headline gain is an excellent run; or
> **(b)** demote Headline and promote **Legacy** to the primary score, since that is where policy choice actually registers — reform pays **18.9× more** on Legacy than on Headline.
>
> Option (b) is more honest to what the game is about, and it also resolves the awkwardness of a headline target the player cannot meaningfully influence. It should be settled before the card deck is written, because it determines what the cards are *for*.

### 3.4 The outcome grid

This grid — produced from the WEO baseline of 314,600 THB nominal GDP per capita in 2030 — is the game's entire thesis in one table. Rows are policy success on the real and price side; columns are the 2030 exchange rate. The 2025 rate was 32.9; the IMF assumes drift to 34.6.

| | FX 24 | FX 28 | FX 30.9 | FX 32.9 | FX 34.6 |
|---|---|---|---|---|---|
| **Baseline** | 13,108 | 11,236 | 10,181 | 9,562 | **9,092** |
| **+1pp real** | 13,777 | 11,809 | 10,700 | 10,050 | 9,556 |
| **+2pp real** | 14,472 | 12,404 | 11,240 | 10,557 | 10,038 |
| **+2pp real, +2pp inflation** | **15,977** | 13,694 | 12,409 | 11,655 | 11,082 |
| **+3pp real, +3pp inflation** | 17,608 | 15,093 | 13,676 | 12,845 | 12,214 |

Read the first row against the last. **Doing nothing at all with a baht at 24 (13,108) beats three points of extra real growth and three points of extra inflation at an unchanged rate (12,214).** The exchange rate is worth more to the Headline score than every real policy in the game combined.

That is not a modelling error; it is what a USD-denominated target actually means, and it is the trap the game is built around. But it creates a hard design requirement:

**Resolved — but not the way this section originally assumed.** The first draft expected the trade block to make appreciation self-limiting: appreciate, exports collapse, growth falls, the top-left corner retreats. **Estimation does not support that mechanism.** With world demand controlled, Thai exports have close to a unit elasticity to world demand (0.85, t=6.21) and **no significant response to the real exchange rate** at any lag (best case −0.24, t=−1.58). Thailand exports intermediate goods inside supply chains where volume is set by the chain, not by relative price. Exports would *not* collapse. See `MODEL.md` §4.

The actual bound is simpler and more robust:

> **The exchange rate is an outcome in this model, not a lever. The player has no instrument capable of moving it 27%.**

Appreciating the baht from 32.9 to 24 would require engineering massive capital inflows or a large positive rate differential. The policy rate is 1.00% with 50bp to the floor (§7). No Thai government has a mechanism to do this. The top-left corner of the grid is **unreachable**, not self-defeating — which is a cleaner resolution than relying on an elasticity the data will not deliver.

Two supporting bounds, in case FX drifts toward that region for exogenous reasons: a baht at 24 implies a REER of **137 against an all-time maximum of 111.83** (June 1997, weeks before the float) — a 22% overshoot beyond anything in 32 years; and appreciation compresses tradables margins and therefore private investment, the variable the whole game turns on (§5.3).

**Design consequence:** keep FX fully endogenous — UIP plus current account plus risk sentiment — and do not add an artificial penalty on appreciation. The grid's degenerate cell should be out of reach because nothing the player can do gets there.

## 4. Time and the turn loop

### 4.1 Granularity

**Prologue (February 2026): coalition formation.** Then **quarterly turns, Q2 2026 through Q4 2030 — nineteen turns.**

The game opens on the month of the election, before a government exists. The prologue is specified in §9.8 and is the single highest-leverage decision in the run: it fixes the parliamentary arithmetic, the portfolio allocation, and the ideological bounds of everything the player can subsequently pass. A player who takes Pheu Thai's 74 seats for a 14-seat majority is playing a materially different game from one who takes the People's Party's 120.

Quarterly is chosen because Thai national accounts are quarterly, policy transmission lags are naturally expressed in quarters, and twenty turns is a session length that supports replay. Monthly would give 60 turns, most of them empty. Monthly-frequency series (CPI, SET, FX, trade) are still *simulated and charted* monthly — the player sees monthly resolution but acts quarterly.

### 4.2 The quarterly loop

```
1. DATA RELEASE
   Previous quarters' data publishes, with lags and revisions (§8).
   Dashboard updates. Nowcast for the current quarter is an estimate, not a fact.

2. INBOX
   3–5 policy cards drawn (§10). Scripted spine, contingent, and shock cards.
   Player resolves each: choose an option, or defer where the card permits.

3. STANDING ADJUSTMENTS
   Continuous levers that can be changed any quarter without a card:
   tax rate tweaks within delegated authority, in-year budget reallocation
   (bounded), BOT jawboning, FX intervention authorisation.

4. PARLIAMENT
   Any card option flagged as requiring legislation goes to a vote (§9.4).
   Player may negotiate before the vote — concessions, portfolios, side payments.
   Passage is not guaranteed. Failed bills have political cost.

5. RESOLUTION
   Macro model steps one quarter (§5). Shocks realise.
   BOT sets policy per its own rule (§7).
   Markets reprice. SET moves. FX moves.

6. FEEDBACK
   Approval, coalition relationships, and press reaction update.
   Next quarter's contingent card pool is recomputed from state.
```

### 4.3 The annual budget

Once per year — resolved in **Q3**, taking effect the following fiscal year — the turn is replaced by a **full-screen budget allocation step**. This is not a card. Fiscal composition is too continuous and too central to the growth target to be expressed as three options.

The budget interface is specified in §6.4. It is the single most important screen in the game.

---

## 5. The macro model

### 5.1 Approach

A **semi-structural model**: New-Keynesian in spirit, small enough to reason about, with an explicit supply side. Not a DSGE — no microfoundations, no rational-expectations solution. Roughly the class of model a central bank uses for scenario work, which is the right ambition level.

Roughly 12–15 core equations and 25–30 state variables. Computationally trivial; the difficulty is entirely in calibration.

### 5.2 State variables

**Real block:** real GDP, potential output, output gap, **gross fixed capital formation split private/public** (the central state variable per §5.3), private consumption, private investment, public investment, public consumption, exports, imports, inventories, employment, labour force, **labour underutilisation** (see below), capital stock, TFP level, TFP growth trend.

> **The unemployment rate is unusable as a game variable.** IMF WEO reports Thai unemployment at exactly **1.0% for every year from 1980 to 2031** — outturn and projection alike. It is a flat line that no policy in the game could move, and putting it on the dashboard would be actively misleading.
>
> Replace it with a **labour underutilisation index** built from informality share, underemployment, agricultural employment share, and hours worked. This is the honest representation of Thai labour slack, it responds to policy, and it makes the informality reform agenda (§5.4) legible on the dashboard. It is a constructed indicator, so it must be labelled as one.

**Nominal block:** headline CPI, core CPI, inflation expectations (short and long anchored), GDP deflator, nominal wages, import price index, oil price.

**Financial block:** **BOT policy rate (1.00% at start, against a demonstrated floor of 0.50% — 50bp of headroom)**, short real rate, 10-year government bond yield, sovereign risk premium, bank credit growth, **household debt/GDP (87.5% at start; a slow-moving inherited constraint, not a player lever)**, corporate credit spread, SET index.

**External block:** THB/USD, real effective exchange rate, **world demand (US real imports; export elasticity 0.85, well identified)**, **global real activity index (IGREA)**, current account balance, tourist arrivals, tourism receipts, goods export volume, FDI inflow, foreign reserves, Chinese demand index, US policy rate, global risk appetite.

**Fiscal block:** revenue by source, expenditure by function, primary balance, overall balance, public debt/GDP, average debt maturity, effective interest cost, contingent liabilities.

**Structural block:** working-age population, dependency ratio, human capital index, infrastructure capital stock, business-environment index, informality share.

### 5.3 Core equations

Written informally; each becomes a config-parameterised function.

**Aggregate demand (IS).**
```
gap[t] = ρ·gap[t-1]
       − a1·(real_rate[t-1..t-4] − neutral_rate)      # lagged, distributed
       + a2·fiscal_impulse[t]
       + a3·Δ(external_demand)
       + a4·Δ(REER)^(−)                                # competitiveness
       + a5·confidence[t]
       + ε_demand[t]
```
The monetary term uses a **distributed lag over four to six quarters**, peaking around quarters 4–5. This is the single most important realism choice in the model: it is what makes rate decisions feel consequential yet slow, and it is what punishes players who expect to fine-tune.

**The player starts with no slack.** An HP filter on NESDC real GDP puts the output gap at **+1.0% in 2026Q1 and +0.2% in 2026Q2** — at or slightly above trend. Combined with the point below, this means the player's fiscal firepower is at its weakest exactly when they most want to use it, and early stimulus will leak into imports and prices rather than output. This is a hard, accurate opening position and it should not be softened.

**Fiscal multipliers are state-dependent.** `a2` is not a constant. It is a function of the output gap (larger when slack is large), of the composition of spending (capex > transfers to low-income > transfers to high-income > tax cuts to corporates, roughly), and of the monetary stance (smaller when the BOT is actively offsetting). Import content is netted out separately — a large share of Thai capex leaks to imported capital goods, which is a real and material drag on the multiplier.

**Inflation (Phillips) — estimated on 487 months of CPI.** The core equation is one of the two best-identified relationships in the project (`MODEL.md` §2, R²=0.957):

| Term | Coefficient | t |
|---|---|---|
| Core persistence | **0.859** | 35.2 |
| Output gap | **+0.042** | 2.98 |
| FX passthrough (Δ REER, 4q) | **−0.032** | −5.66 |
| Energy → core | **+0.055** | 6.71 |
| **Energy → headline** | **+0.240** | **9.46** |

**The Phillips curve exists and is extremely flat.** A full percentage point of output gap buys four hundredths of a point of core inflation. Closing the gap from −5% to +5% would buy 0.42pp. There is no demand-side route to meaningful inflation, which is what the design assumed — but the coefficient is small and *positive*, not negative.

**Energy passes into headline more than four times as strongly as into core** (0.240 vs 0.055), and headline persistence is correspondingly low (0.481). Headline inflation — the number voters react to (§9.5) — is mostly energy being done to Thailand from outside.

This makes the degenerate path in §3.4 fight itself, with the magnitude now known: a 27% real appreciation cuts core inflation by roughly **0.85pp** while the player is trying to add 2pp. **The two legs of the degenerate strategy oppose each other**, which was not designed — it fell out of the data.
```
π_core[t] = b1·π_exp[t] + (1−b1)·π_core[t-1]
          + b2·gap[t-1]
          + b3·Δ(import_prices in THB)                # FX passthrough
          + b4·Δ(wage_pressure)
          + ε_π[t]

π_head[t] = π_core[t] + food_energy_component[t]
```
`b2` — the slope of the Phillips curve — is **+0.042**, estimated. Thai CPI y/y ran **−0.66%, −0.88% and −0.08% in January, February and March 2026** — outright deflation through the first quarter of the game window — before an energy shock pushed it to +2.89% in April, easing to +1.95% by July. Over the full 1986–2026 sample CPI averaged 2.80% with a standard deviation of 2.52%, ranging from −4.36% (July 2009) to +10.48% (June 1998).

Calibration must reproduce this. A player should find it genuinely hard to generate inflation through demand at all, and should discover that FX passthrough and energy prices are the dominant channels. This also means the BOT is persistently *undershooting* its target band, which changes its reaction function (§7): the realistic constraint on easing is financial stability and household debt, not inflation.

**Inflation expectations.** Two components: a short-run adaptive term and a long-run anchor. The anchor moves only in response to *sustained* deviation and to visible BOT credibility events. Once unanchored, re-anchoring is slow and costly. This is the mechanism that makes monetary mistakes expensive without making them immediately visible.

**Potential output.** A production function:
```
Y_pot = TFP · K^α · (L · H)^(1−α)
```
- `K` accumulates from public and private investment, net of depreciation, with **construction and gestation lags** — infrastructure typically contributes nothing to capacity for 3–7 years.

  **This is the binding constraint on the whole game, and the NESDC data says so unambiguously.** Gross fixed capital formation was **41.7% of GDP in 1996** and is **22.7% today** — private investment fell from 31.2% to 16.5% and never recovered from the Asian Financial Crisis. Thailand's growth problem is, first and foremost, that it stopped investing.

  The player's direct lever is far too small to fix this: **public investment is only 6.1% of GDP**, against roughly 5pp of GDP in total debt headroom (§6.3). Doubling the public capital budget is fiscally impossible and would still leave the aggregate investment rate near 29%.

  The only route to the target therefore runs through **private** investment — business environment, FDI, credit conditions, regulatory burden, confidence. The design's weighting toward structural reform over spending is not a preference; it is forced by the arithmetic.
- `L` derives from the demographic module (§5.5) and is **declining** over the window regardless of player action. WEO has total population falling from **71.62m in 2025 to 71.22m in 2030** — and the working-age share falls considerably faster than the headline. This is exogenous and immovable within five years; migration policy is the only available lever and it is politically expensive.
- `H` is human capital, moves very slowly, and responds to education spending with a lag measured in decades. Education policy in this game is almost purely a **Legacy** play.
- `TFP` growth is the primary target of structural reform, responds to the business-environment index, FDI, openness, competition policy, and informality — with lags of 2–5 years and wide uncertainty bands.

**This is where the game lives.** The 15,000 target is a supply-side problem. Demand management cannot move trend growth. A player who spends five years running hot fiscal and easy money produces inflation, a weak baht, and a *lower* headline USD number.

**Exchange rate.** Fully endogenous — an outcome, never a player lever (§3.4). Modified UIP with a risk premium and a slow-moving fundamental anchor:
```
Δ(THB/USD) = c1·(i_TH − i_US − expected_depreciation)
           + c2·(current_account/GDP)
           + c3·Δ(global_risk_appetite)
           + c4·(REER_gap → mean reversion)
           + c5·(fiscal_credibility)
           + ε_fx[t]
```
FX matters enormously here because the win condition is USD-denominated, and modest appreciation genuinely does more for the Headline score than plausible real growth. But the player cannot summon it: they can influence the rate differential (50bp of room), the current account, and risk sentiment, and that is all. Moves of a few percent are achievable; 27% is not.

Note that the export feedback is **weak** — estimation finds no significant REER elasticity on goods exports (`MODEL.md` §4). Do not model appreciation as gutting exports; the data says it does not. Tourism receipts and tradables margins are the channels that do respond, and they should carry the real cost.

**Sovereign risk premium.** Thai government bond yields are **out of scope** — ThaiBMA is subscription-only and the curve is not worth a dependency. The premium is therefore modelled as a judgemental function rather than estimated:
```
risk_premium = f(debt/GDP, primary_balance_trajectory,
                 external_position, political_stability, rating)
```
Non-linear. Below a threshold, debt accumulation is nearly free. Above it, the premium rises convexly and the debt dynamic can become self-reinforcing. The player is not told where the threshold is.

This costs realism in one equation and is listed as such in §14. It is an acceptable loss: the premium's main jobs were feeding the SET discount rate and providing market feedback, and the SET index itself already supplies fast, data-grounded market feedback.

**SET index.**
```
SET = earnings_proxy / (discount_rate − growth_expectation) · sentiment
```
where `earnings_proxy` tracks nominal GDP with a beta above one and a sector-weighted tilt (banks to rates, energy to oil, tourism to arrivals, retail to consumption), `discount_rate` tracks the 10-year yield plus an equity risk premium, and `sentiment` is a mean-reverting noise process with jumps on political events.

The SET is deliberately the **fastest-moving thing on the dashboard.** It reprices within the turn while inflation and unemployment take years. The resulting tension — the market punishes you immediately for a policy that pays off in eight quarters — is the primary source of moment-to-moment feedback and is the emotional core of the dashboard.

### 5.4 Thailand-specific structure

Generic macro models miss the things that make Thailand behave like Thailand. These get dedicated treatment:

- **Tourism.** A large, volatile, employment-intensive share of GDP — and the data sizes it precisely. Services exports ran **14.9% of GDP in 2019, collapsed to 4.9% in 2021, and recovered to 13.2% in 2025**. A ten-point swing in GDP from one channel in two years. Tourism shock cards should be capable of moving GDP by several percentage points, not fractions of one. Modelled as its own block: arrivals by source market (China, ASEAN, Europe, other), spend per head, capacity constraints, and high sensitivity to exogenous shocks. Also the channel most responsive to short-horizon policy — which makes it tempting and makes tourism-led strategies a trap for the Substance score, since tourism does little for TFP.
- **Household debt.** **87.5% of GDP (2025Q4, BIS), against 64.8% at the peak of the Asian Financial Crisis.** Thailand is materially more household-indebted now than it was going into its worst postwar crisis, and the 2021 peak was 96.6%. This is a *state-dependent damper on the consumption response to stimulus*: transfers to indebted households are substantially absorbed by deleveraging rather than spent. It also makes rate rises disproportionately contractionary. A distinctive and underused mechanic, and the data supports making the damper strong.

Note the timescale: household debt fell 30 points over the decade after 1997 and rose 45 points between 2008 and 2021. Deleveraging takes a decade. **Within twenty turns this is a fixed constraint the player inherits, not a problem they can solve** — which is exactly why it should shape every consumption-side decision without ever being fixable.
- **Extreme trade openness.** Exports were 39% of GDP in 1996 and are **71% today**; imports 67%. This is among the most trade-exposed economies of its size, and it is the reason the FX feedback in §3.4 can plausibly be strong enough to be self-limiting — an economy this open cannot appreciate 25% without severe real consequences. Sizing that feedback correctly is the highest-priority calibration task.
- **Export dependence on China.** Chinese demand is a major exogenous driver with its own shock process. The player has no control and must manage the consequences.
- **A consumption economy now.** Private consumption rose from 51.7% of GDP in 1996 to **58.5%** while investment fell nineteen points. Household stimulus therefore hits a much larger share of GDP than it used to — which is exactly why transfers are politically irresistible and economically hollow (§6.2).
- **Middle-income trap structure.** The model should reproduce the actual bind: cost-competitiveness eroding against Vietnam and Indonesia from below, technological capability insufficient to compete from above. Expressed as a competitiveness index that decays absent policy action.
- **Energy price passthrough.** The dominant inflation channel, and the data is unambiguous. In April 2026 — the second month of the game window — transport and communication rose 10.13% and the raw food and energy group 8.37%, pushing headline CPI up 2.75% while housing moved exactly 0.00%. It unwound over the next three months. Energy shocks should be a frequent, high-salience card family: they move the number voters actually notice (§9.5), they are outside the player's control, and fuel subsidy responses are politically irresistible and fiscally corrosive (§6.2).
- **Agricultural sector and support policy.** Large in employment, small in output, politically decisive. Rice pledging-style interventions are a recurring card family with strong political returns and negative productivity effects.
- **Informality.** A large informal sector limits tax base, weakens transmission of both fiscal and monetary policy, and caps measured productivity. Formalisation is a slow, high-value, politically painful reform.
- **Demographics.** Ageing and shrinking working-age population. Exogenous, visible on the dashboard from turn one as a permanent headwind.
- **Regional inequality.** Bangkok versus the rest. Feeds the political model — parties have geographic bases, and policies with concentrated regional benefit buy concentrated votes.

### 5.5 Demographics

Runs as a simple cohort projection, fully deterministic across the window (five years is too short for fertility policy to matter). Working-age population declines steadily. The only levers are labour-force participation (female participation, retirement age) and **migration**, which is fast-acting and among the most politically costly options in the game.

This gives the player an unpleasant, accurate discovery: the arithmetically most effective lever on per-capita GDP within five years is a smaller denominator or a larger labour force, and both are politically radioactive.

Note that population decline is already *helping* the baseline slightly — a falling denominator adds roughly 0.1pp/yr to per-capita growth for free. The player inherits that and cannot claim credit for it.

### 5.6 Calibration

Calibration is the bulk of the modelling work and determines whether the game is credible.

**Important correction from first-pass estimation.** An earlier draft assumed 134 quarters would let the real block be *estimated* rather than assumed. It does not. Regressing the panel recovers policy **reaction functions**, not structural responses — real interest rates enter the IS curve with a significantly positive coefficient, fiscal impulse with a negative one, because the BOT tightens into strength and governments expand into weakness. See `MODEL.md` §1.

Structural parameters must therefore come from the literature or from a properly identified approach. **The panel's role is validation, not estimation** — which makes the 1993–2026 backtest a stronger gate, not a weaker one, because the parameters will not have been fitted to it.

Cleanly identified and directly usable: inflation persistence (0.64–0.68), output gap persistence (0.485), the 2011 flood shock (−7.53pp on the gap, t=−25.4).

**Anchor data in hand — NESDC quarterly.** `/config/nesdc_quarterly.json` — **134 quarters, 1993Q1 to 2026Q2**, ~270 series across 15 tables: expenditure and sector GDP at current and chain-volume prices, original and seasonally adjusted; growth contributions; GFCF by type and by private/public; consumption composition; government consumption; trade. Built by `/scripts/build_nesdc.py`, re-runnable on each new NESDC release.

This matches the engine's quarterly step exactly and runs through the game's own start date, so the model's initial state is observed rather than interpolated.

**Anchor data in hand — IMF WEO.** `/config/imf_weo_thailand.json` — 40 series, 1980–2031, annual. This covers national accounts, prices, fiscal, external, and PPP. It fixes initial state, provides the 45-year history for the backtest, and supplies the projection baseline for scoring. WEO remains necessary for fiscal balance, gross debt, PPP, population, and — critically — the **2026–2031 projection baseline the entire victory condition is scored against**, which exists nowhere else. What neither source contains: the nominal exchange rate (derivable as NGDP/NGDPD — 32.88 in 2025, drifting to 34.6 by 2028), interest rates, the SET index, tourist arrivals, household debt, credit aggregates, and any labour detail beyond the flat 1% unemployment line.

**Method.** Take published elasticities from BOT working papers, IMF Article IV staff reports, World Bank Thailand Economic Monitors, and academic literature on Thai macro. Where estimates conflict, take a central value and set the uncertainty band from the spread of estimates. Where no estimate exists, use a regional comparator and flag the parameter as low-confidence.

**Validation.** With NESDC quarterly from 1993Q1, the backtest runs at the engine's own frequency over **134 quarters, 1993–2026** — and includes the pre-crisis boom, which matters because 1996 is the only period in the sample showing Thailand at a high investment rate. The window covers the Asian Financial Crisis, the 2008–09 shock, the 2011 floods, and the 2020 pandemic. A model that handles 1997 and 2020 is a model worth trusting. The 1997 episode is also the strongest available test of the FX block, which §3.4 identifies as the make-or-break subsystem.

The model must reproduce, in backtest, Thai data over that window given actual policy and actual shocks as inputs. Not precisely — semi-structural models don't — but with the right signs, plausible magnitudes, and correct qualitative response to the 2020 shock and its recovery. **A model that cannot retrodict the past has no business forecasting the future, and this backtest is the gate before any UI work is worth doing.**

**Uncertainty as a first-class object.** Every behavioural coefficient carries a distribution, not a point. At the start of each run, the engine **draws a parameter set** from those distributions and holds it fixed for the whole game. Consequences:

- The player never knows the true multipliers. They can infer them from observed responses, but noisily and slowly.
- Two runs of identical decisions produce different outcomes, so the game cannot be solved.
- Optimal play becomes robust portfolio construction under parameter uncertainty rather than exploitation of a known coefficient.
- It is honest. Nobody knows Thailand's true fiscal multiplier either.

This is the design decision that most strongly differentiates this from a scripted game, and it should not be compromised for legibility.

---

## 6. Fiscal policy

### 6.1 Revenue

Modelled by source, each with its own base and elasticity: VAT, personal income tax, corporate income tax, excise (fuel, alcohol, tobacco, vehicles), customs, state enterprise remittances, other non-tax.

General government revenue is **21.1% of GDP** (2025, WEO) and projected flat at 21.0–21.1% through 2031. Expenditure is **23.0%**, giving a deficit of **1.9% of GDP** and a primary deficit of 0.75%. The base is narrow — a large informal sector and a high personal-income-tax exemption threshold mean relatively few people pay income tax. **Base broadening is the highest-value fiscal reform available and among the most politically costly.** It should be a prominent, repeatedly-offered, repeatedly-declined card family.

Rates within delegated authority can be adjusted as standing adjustments. Structural changes — new taxes, threshold changes, VAT rate changes — require legislation and therefore votes.

### 6.2 Expenditure

By function, each with a distinct economic signature:

| Category | Demand multiplier | Capacity effect | Lag | Political |
|---|---|---|---|---|
| Infrastructure capex | Moderate (high import content) | High | 3–7 yr | Strong, regionally concentrated |
| Education | Low | Very high | 15–25 yr | Diffuse, weak |
| Health | Low–moderate | Moderate (via participation) | 5–15 yr | Strong, broad |
| Targeted transfers | High | Low | Immediate | Very strong |
| Universal handouts | Moderate (leakage, debt repayment) | None | Immediate | Very strong, short-lived |
| Energy/fuel subsidy | Moderate | Negative | Immediate | Very strong, addictive |
| Agricultural support | Moderate | Negative | Immediate | Decisive in rural seats |
| Public wage bill | Low | None | Immediate | Strong with a specific bloc |
| R&D / innovation | Very low | High, uncertain | 7–15 yr | Negligible |
| Defence | Low | None | Immediate | Institutionally significant |
| Debt service | None | None | — | Non-discretionary |

The table *is* the game's central tension in compressed form: everything with a high capacity effect has a long lag and no political constituency; everything with immediate political return has zero or negative capacity effect.

### 6.3 Debt

Standard accumulation with the r−g dynamic explicit and visible. Track average maturity, currency composition (largely domestic, which is a genuine strength worth representing), and the share held domestically. Contingent liabilities from state enterprises and guarantee schemes sit off the headline number and can crystallise via cards.

**The fiscal space is nearly gone, and this is the hardest constraint in the game.**

WEO has gross general government debt at **64.7% of GDP in 2025**, rising on the baseline to **69.5% by 2030** — with *no* additional policy action. Thailand's statutory ceiling is 70% **[VERIFY current level and legal basis]**.

So the player begins with roughly **five percentage points of GDP** in cumulative fiscal headroom across twenty turns, and the do-nothing baseline consumes essentially all of it. Every spending card, every megaproject, every stimulus package is drawn against that. Raising the ceiling is available at a vote and at a cost in credibility and risk premium.

This is a gift to the design. It means fiscal policy is genuinely, arithmetically scarce from turn one, and the player must confront the revenue side (§6.1) rather than spending their way to the target. It also means the debt/GDP number belongs on the primary dashboard row, not the secondary panels.

### 6.4 The annual budget screen

Resolved each Q3 for the following fiscal year. The most important interface in the game.

**Layout.** Left: revenue envelope, with a projection band rather than a point (you are budgeting against a forecast, and the forecast is wrong). Centre: allocation across the categories in §6.2, as adjustable amounts with prior-year and multi-year trend visible. Right: live-updating projected consequences — deficit, debt path, estimated growth contribution, estimated potential-output contribution, and a political-viability read across coalition partners.

**Constraints.**
- Debt service and statutory obligations are non-discretionary and shown greyed.
- Multi-year project commitments appear as pre-committed lines. Megaprojects approved in earlier turns eat future budgets. **This is how past decisions constrain present freedom, and it should be viscerally obvious.**
- Year-on-year cuts to any category beyond a threshold trigger political consequences proportional to the affected constituency.
- The public wage bill is downward-rigid.

**Passage.** The budget is a bill. It must pass parliament. Coalition partners will demand allocations to their ministries as the price of support, and those demands surface as explicit negotiation before the vote. A failed budget is a confidence matter.

**Feedback discipline.** The right-hand projection panel must show *estimated* consequences with uncertainty bands, never certainties. The player is forecasting, not calculating.

---

## 7. Monetary policy and the Bank of Thailand

**The player inherits 50 basis points of monetary headroom.** The policy rate is **1.00%** at game start, cut seven times from 2.50% since late 2023, against a lower bound the BOT has demonstrated at **0.50%** and held there for two years (May 2020 – June 2022). Historic maximum is 5.00%, in 2006.

Combined with the other three constraints the data establishes — roughly 5pp of GDP to the debt ceiling (§6.3), no output slack (§5.3), and household debt at 87.5% (§5.4) — **every conventional demand-management lever is already spent when the player takes office.** This was not designed; it emerged from four independent datasets and it enforces the game's thesis without designer fiat. A player who reaches for stimulus finds there is nothing to reach for. The only remaining levers are supply-side.

The BOT is **semi-independent and not directly controlled.** It follows its own reaction function:

```
i[t] = ρ·i[t-1] + (1−ρ)·( r* + π_exp
                        + φ_π·(π[t] − π_target)
                        + φ_y·gap[t]
                        + φ_fx·(fx_pressure)
                        + φ_fs·(financial_stability_concern) )
```

The financial-stability term is **confirmed by the data as the primary axis of BOT–government friction**, and it should carry real weight in the reaction function. With inflation at −0.1% (§5.3) the BOT is undershooting its target badly, so its reluctance to ease cannot be modelled as inflation aversion. At 87.5% household debt it is obviously financial stability. This behaviour should visibly frustrate a player pursuing growth, and the player should be able to work out why.

**Player levers over the BOT:**

- **Appointments.** The governor's term and MPC appointments fall due; when they do, the player gets a card. Appointing a dove shifts `φ_π` down and `φ_y` up — and costs credibility, widening the risk premium and de-anchoring expectations.

  **The vote data gives this real teeth.** The MPC has seven members and, across 98 meetings with recorded balances, **40% were non-unanimous** — 5–2 and 6–1 splits are routine. An appointment therefore moves the median voter on a committee where the margin is frequently one or two votes, and a single appointment can flip outcomes. That makes the credibility cost a genuine trade rather than a formality, and it is one of the sharpest tradeoffs in the game.
- **Jawboning.** A standing adjustment with a small effect on the BOT's reaction and a cumulative cost to credibility if persistent. Cheap once; corrosive repeated.
- **The inflation target.** Set jointly by MoF and BOT under the current framework **[VERIFY]**. Raising it is available via card, has real effects on expectations, and is read by markets as a credibility event.
- **Institutional pressure.** Escalating options exist — legal changes to the BOT's mandate, public confrontation. High-risk, high-consequence, with sharp market responses.

**Credibility** is an explicit state variable. High credibility means anchored expectations, a low risk premium, and inflation shocks that fade quickly. It is slow to build and fast to destroy, and it is not directly visible — the player infers it from bond yields, the FX rate, and survey expectations.

**Macroprudential policy** sits with the BOT but is jointly influenced: LTV limits, debt-service-ratio caps, credit-card rules. These bite on household debt and the credit channel and offer a route to stimulate without pressuring rates.

Because the win condition is supply-side, monetary policy is properly a **stabilisation side-game**: get it wrong and you are punished; get it right and you receive nothing except the absence of punishment. That is an accurate representation of what monetary policy does, and the game should not inflate its importance to make it feel better.

---

## 8. Information, lags, and fog

The most distinctive system in the game, and the primary difficulty driver.

**Publication lags.** Quarterly GDP arrives with roughly a one-quarter lag. Monthly CPI is quick. Trade data is moderately quick. Labour data is slow and structurally understates underemployment in an economy with a large informal sector. Potential output and the output gap are **never observed at all** — only estimated, with wide bands, and re-estimated every quarter.

**Revisions.** The NESDC source files mark revised and preliminary quarters directly — 2026Q1 publishes as `Q1r` — and the builder preserves these as `revision_flags`. The revision mechanic can therefore reproduce observed NESDC practice rather than inventing a process. Collecting successive NESDC vintages would yield the actual revision distribution.

First-print GDP is revised, sometimes substantially. A player who reacted decisively to a bad first print may discover two quarters later that the quarter was fine. This is a real and underappreciated source of policy error and it should hurt.

**Nowcasting.** The current quarter is shown as a nowcast with an explicit confidence interval, built from the high-frequency indicators that *are* available — SET, FX, tourist arrivals, electricity consumption, PMI-analogue.

**Forecasts.** The player has a technocratic staff producing projections. Those projections are generated by the *engine's estimate* of the parameters, not the true drawn parameters, so staff forecasts are systematically imperfect in a way that varies by run. Forecast quality can be improved by investing in statistical capacity — a slow, cheap, unglamorous, genuinely valuable reform.

**Design consequence.** Because the player cannot see the present, the correct strategy shifts from optimisation toward robustness: policies that perform acceptably across a range of possible true states beat policies optimised for the estimated state. That is both the real lesson of macroeconomic policymaking and a genuinely interesting game problem.

---

## 9. The political system

### 9.1 Structure

The House has **500 seats, one vacant, majority 251.** Full roster in `/config/parties.json`. The player leads **Bhumjaithai on 191 seats — 60 short.**

The arithmetic reduces to three parties. Everything else is a make-weight:

| Party | Seats | Note |
|---|---|---|
| **Bhumjaithai** | **191** | Player |
| People's | 120 | Largest opposition; most reform-aligned, most ideologically distant |
| Pheu Thai | 74 | Populist fiscal expansion |
| Kla Tham | 58 | **BJT + Kla Tham = 249. Two short.** |
| Democrat | 21 | Most fiscally conservative bloc of size |
| 17 others | 35 | 8 of them hold a single seat each |

Two structural features fall straight out of this:

**The two-seat gap.** Bhumjaithai plus Kla Tham lands on 249 — exactly two seats short of a majority. The eight single-seat micro-parties therefore command a price per seat wildly out of proportion to their size, and any conservative-bloc government is permanently hostage to individual members. This is a real and recurring feature of Thai coalition politics and it emerges here from the arithmetic rather than being scripted.

**The player is not safe.** Pheu Thai + People's + Kla Tham = **252**. Those three can form a government without Bhumjaithai. Coalition formation is a negotiation conducted under a credible outside option, not a shopping trip, and the threat persists into the run — a coalition collapse does not automatically mean an election, it may mean a government forms without you.

Everything lives in **config, not code** (§12): seat counts, ideology vectors, coalition structure. This enables alternative scenarios — a different election result, a historical parliament, a hypothetical House — with no code change.

Each party carries:

- **Seats**
- **Status** — coalition, confidence-and-supply, opposition
- **Ideology vector** — positions on economic liberalisation, fiscal expansion, decentralisation, agricultural support, social spending, business/regulatory environment, institutional reform, and a small number of salient specific issues
- **Regional base** — which provinces and constituency types
- **Relationship** with the player's government, 0–100
- **Cohesion** — how reliably the party votes as a bloc; low-cohesion parties can be split
- **Priorities** — a weighting over the ideology dimensions, so a party may tolerate losses on issues it does not care about

The ideology vectors are the most contestable content in the game. They belong in config with the reasoning documented inline, so they can be tuned, disputed, and replaced without touching the engine.

### 9.2 Support model

For a bill `B` and party `P`:

```
support(P, B) = w1 · ideological_alignment(P.ideology, B.policy_vector, P.priorities)
              + w2 · relationship(P)
              + w3 · direct_benefit_to_P_base(B)
              + w4 · portfolio_stake(P, B.owning_ministry)
              − w5 · opposition_positioning_incentive(P)
              + ε
```

`ε` is a small noise term — coalition management is not fully deterministic.

Vote outcome: parties above a support threshold vote yes, below vote no, in the middle abstain or split according to cohesion.

**The important consequence:** support is bill-specific, so there is no single "political capital" resource to drain. A reform the opposition happens to like may pass over the objections of your closest partner. Cross-cutting coalitions become a real tactic, and the player must actually read the platforms.

### 9.3 Portfolios

The core currency of coalition management. Ministries are allocated to parties, and each allocation does two things simultaneously:

1. Generates **durable goodwill** with the recipient party, decaying slowly.
2. Transfers **agenda control** — the holding party influences which cards from that ministry reach the inbox, can water down options, and can obstruct.

You cannot both buy loyalty and retain control of the levers you need. Giving Transport to a partner buys a bloc of votes and costs you the megaproject agenda; giving Finance away costs you the budget. Reshuffles are possible, expensive, and destabilising.

This single mechanic carries more design weight than a polling model would, at a fraction of the complexity.

### 9.4 Legislation

Card options flagged `requires_legislation` go to a vote. Before the vote, the player may:

- **Amend** — weaken the policy to broaden support, trading economic effect for votes. Presented as a live slider showing both the shrinking effect and the growing vote count.
- **Concede** — offer an unrelated policy, a budget line, or a portfolio.
- **Pressure** — spend relationship for votes; effective once, corrosive repeated.
- **Withdraw** — no economic effect, modest credibility cost, card may return.
- **Proceed and risk it** — a failed bill is materially more costly than a withdrawn one.

Some measures do not require legislation — executive action, regulatory change, ministerial directive. These are faster and cheaper and should be a real and valued category, since routing around parliament is a genuine feature of how governments operate.

### 9.5 Public approval

Approval is tracked but is **not** the primary political constraint — the coalition is. Approval matters because it feeds partner behaviour (partners abandon unpopular leaders), because it determines election outcomes if one falls in the window, and because it gates certain crisis cards.

Approval responds to unemployment, inflation — especially food and fuel prices, which are salient far out of proportion to their weight — visible project delivery, scandal events, and a slow mean reversion. Notably it responds only weakly to GDP growth, which is invisible to most voters. A player pursuing the growth target through unpopular structural reform will watch approval fall while the model improves.

### 9.6 Extra-parliamentary factors

Thailand's political history includes actors outside parliament. Handling this needs care: it is essential to realism and it is the easiest place to accidentally editorialise.

**The Senate.** 200 seats, non-partisan, and deliberately **not modelled as parties.** It collapses into a single `establishment_alignment` scalar (0–100, starting at 55). It gates constitutional and organic-law change, feeds `institutional_stability`, and shifts the sovereign risk premium and the FDI signal.

This is the right level of abstraction: modelling 200 non-partisan senators as individual actors would add enormous complexity for no gameplay, while ignoring the chamber entirely would misrepresent what a Thai government can actually pass. As a scalar it does real work — certain reforms simply become unavailable below a threshold — without the game having to assert anything specific about the institution or its members.

**Extra-parliamentary factors** get an abstract **institutional stability** variable, affected by the scale and speed of reform, by the degree of confrontation with established interests, and by street-level mobilisation. Low stability raises the risk premium, deters FDI, hits the SET, and increases the probability of drawing crisis cards. It is a *risk parameter and a market input*, not a scripted narrative. This keeps the mechanic honest and avoids the game asserting anything about specific institutions or predicting specific events.

### 9.7 Elections

The run *begins* on an election (§9.8), so a scheduled general election no longer falls inside the window — the next ordinary election is due after 2030. What remains live is **dissolution**, and that changes the mechanic from a fixed deadline into a strategic option and a standing threat:

- **The player may dissolve.** Calling an early election converts good economic conditions into seats. The temptation is to stimulate, dissolve into the upswing, and return with a bigger majority and fewer coalition constraints. The model should reward this politically and punish it economically, exactly as reality does.
- **The player may be forced to dissolve.** A collapsed coalition that cannot be reconstituted forces the issue — and per §9.1, the alternative is worse: Pheu Thai, the People's Party and Kla Tham can reach 252 and form a government without you, ending the run without an election at all.
- **Re-election is a re-entry into §9.8**, with seats redistributed and a fresh coalition negotiation.

Design implications:

- Seat redistribution is a function of approval, economic conditions in the year prior, regional delivery, and party-specific effects.
- Failure to form a government after any election ends the run.
- Because dissolution timing is the player's choice, the political business cycle becomes something they *construct* rather than something imposed on them. That is a harder and more interesting decision than reacting to a fixed date.

### 9.8 Prologue — coalition formation, February 2026

The opening move, resolved before the first quarterly turn. It is the highest-leverage decision in the game and it should feel like it.

**Situation.** The election has returned Bhumjaithai as the largest party on 191 seats, 60 short of a majority. Pheu Thai, the People's Party and Kla Tham can together reach 252 and form a government without you. You have a limited number of negotiation rounds before the outside option becomes real.

**Mechanics.** The player approaches parties in sequence. Each negotiation involves:

- **Portfolio demands.** Larger parties demand proportionate ministry allocations, and demand *specific* ones. Whoever holds Finance shapes the budget; whoever holds Transport controls the megaproject agenda; Interior carries provincial patronage. You cannot buy 120 seats cheaply and keep the levers.
- **Policy commitments.** Parties extract binding manifesto commitments that persist as constraints for the whole run. A commitment to a universal transfer programme is a permanent line in every budget. A commitment not to touch fuel subsidies removes an entire reform branch. These are real, and they should be shown as such at the moment of signing.
- **Veto positions.** Some parties will refuse specific reforms outright as a condition of entry.

**The three coalitions, and why they are genuinely different games:**

| Coalition | Seats | Surplus | Character |
|---|---|---|---|
| **+ Pheu Thai** | 265 | 14 | Thin. Pheu Thai can credibly threaten collapse in any quarter, which makes every subsequent negotiation harder. Expensive in transfers and handouts — direct pressure on the 70% debt ceiling. |
| **+ People's Party** | 311 | 60 | The only mandate large enough to attempt real structural reform, and the hardest ideological fit. Wide gaps on decentralisation, institutional reform, and agricultural support. Likely costs establishment alignment in the Senate. |
| **+ Kla Tham + Democrat** | 270 | 19 | Conservative bloc. Cheap on social spending, comfortable for the establishment scalar, and hostile to exactly the institutional and decentralisation reforms that move TFP. Structurally the "comfortable, slow decline" option. |
| **+ Kla Tham + micro-parties** | 251 | 0 | Bare majority via the two-seat gap. Maximum policy freedom from large partners, permanent vulnerability to individual defection. |

**Why this belongs before the first turn rather than as a card.** It fixes the bounds of the entire run. The reforms that raise potential output (§6.2) are ideologically located, and the coalition determines which of them are reachable at all. A player who picks the comfortable conservative bloc has, in the first five minutes, quietly forfeited most of the paths to the Legacy score — and should not be told so.

**Design note.** The prologue must present the arithmetic honestly and the consequences opaquely. Seat counts, portfolio demands and explicit policy commitments are all shown. What is *not* shown is which coalition is better for the 2030 target, because that depends on drawn parameters (§5.6) and on shocks that have not happened yet.

---

## 10. The policy card system

### 10.1 Principle

The player never shops from a catalogue of eighty policies. A **curated queue of situations** arrives each quarter, each with two to four responses. This controls pacing, keeps the decision space legible, and matches how governments actually work: you respond to what lands on the desk.

Behind each option is a vector over the channels the model already understands. The player reads plain language and a plausible-range estimate; the engine reads numbers. This is also honest — nobody knows the true elasticity of hotel investment to a subsidy, so the game should not pretend to either.

**Authoring discipline: a card may not enter the deck until its channel vector can be stated. If the effect cannot be expressed in the existing channels, either the card does not belong or the model is missing a channel.**

### 10.2 Channel vector

Every option writes into some subset of:

| Channel | Meaning |
|---|---|
| `fiscal_cost` | Annual and total, by year |
| `demand_impulse` | Immediate AD effect, with import content |
| `capacity` | Effect on potential output, with build lag |
| `tfp` | Effect on trend productivity growth, with lag |
| `employment_intensity` | Jobs per unit of spend |
| `external` | Effects on trade, FDI, tourism, reserves |
| `credibility` | Fiscal or monetary credibility |
| `distribution` | Who benefits, by income decile and region |
| `political` | Delta to each party relationship, plus approval |
| `institutional` | Effect on the stability variable |
| `lag_profile` | Timing curve for each effect above |
| `uncertainty` | Band on each magnitude |
| `state_changes` | Flags set, cards unlocked or removed |

### 10.3 Worked example

```yaml
id: land_bridge_phase1
title: "Land Bridge — Phase 1 funding decision"
window: [2026-Q3, 2027-Q2]
ministry: transport
requires: { flag: land_bridge_live }
briefing: >
  The Southern Economic Corridor land bridge has completed feasibility
  review. Phase 1 requires a multi-year capital commitment. Proponents
  project transformational logistics gains; critics question the traffic
  forecasts and note the environmental review remains contested.

options:
  - id: proceed
    label: "Proceed with Phase 1 funding"
    requires_legislation: true
    effects:
      fiscal_cost: { annual: [VERIFY], years: 6 }
      demand_impulse: { size: moderate, import_content: high, profile: ramp_4q }
      capacity: { size: 0, note: "nothing lands before 2032" }
      tfp: { size: small_positive, lag: 8y, uncertainty: wide }
      external: { fdi_signal: positive }
      political:
        southern_base_parties: +2
        fiscal_conservative_parties: -1
        environmental_salience: +1
      institutional: { protest_risk: +1 }
      state_changes:
        set_flag: land_bridge_committed
        unlock: land_bridge_phase2 (2029)
        budget_precommitment: 6 years

  - id: postpone
    label: "Postpone pending further review"
    effects:
      fiscal_cost: 0
      political: { proponents: -1 }
      credibility: { fdi_signal: slight_negative }
      state_changes: { card_returns_in: 4q }

  - id: scrap
    label: "Cancel the project"
    effects:
      fiscal_cost: { recovery: partial }
      credibility: { fdi_signal: negative, policy_continuity: -1 }
      political: { proponents: -4, opponents: +3 }
      state_changes:
        clear_flag: land_bridge_live
        remove_cards: [land_bridge_*]
```

Three properties this illustrates, all of which should be general:

- **Postpone is never a null option.** It preserves optionality and political capital at a real cost. If postponing is always weakly dominated, the card has only two choices.
- **Cards carry state.** Proceeding creates a multi-year commitment that eats future budgets and unlocks downstream decisions. Scrapping prunes an entire branch. This is what makes twenty turns a *path* rather than twenty independent decisions.
- **The lag betrays the target.** The capacity benefit lands after the run ends. Proceeding costs Headline and buys Legacy. That is the game.

### 10.4 Deck composition

**Scripted spine (~15–20 cards).** Known live decisions that carry the narrative: annual budget, the major infrastructure programmes, minimum wage rounds, BOT appointments, the election, energy price policy reviews. These give every run a recognisable shape.

**Contingent (~30–40 cards).** Triggered by model state, not by the calendar:
- Debt/GDP crosses a threshold → rating agency review card
- Inflation above target two consecutive quarters → BOT credibility confrontation
- Coalition relationship below threshold → reshuffle demand or ultimatum
- Unemployment above threshold → emergency employment programme
- Current account deficit sustained → external financing pressure
- FDI below trend → investment promotion review
- Approval collapse → confidence motion

Contingent cards are where the model and the narrative meet. They should feel like consequences, because they are.

**Shocks (~20–30 cards).** Exogenous, cheap to write, enormous replay value: tourism disruption, Chinese demand swings, oil price moves, flooding and drought, Fed policy surprises, regional financial stress, trade policy shifts, commodity cycles, pandemic-class tail events at low probability.

Shock cards should sometimes have **no good option**. Crisis management is a distinct skill from optimisation and the game should test it.

**Reform opportunity (~20–30 cards).** The structural agenda: tax base broadening, energy subsidy reform, SOE governance, competition policy, labour market rules, education reform, land reform, migration policy, financial deepening, regulatory guillotine, informality formalisation.

These are the cards that actually move potential output. They are also the ones your coalition will not vote for. Most will be offered, declined, and offered again — and a player who declines them all will finish near trend growth and wonder why.

### 10.5 Draw logic

Each quarter: draw the spine cards due, evaluate contingent triggers, roll shocks against their hazard rates, then fill remaining inbox slots from the reform pool weighted by relevance to current state and by ministry agenda control (§9.3). Cap at five to avoid decision fatigue; floor at three so no turn is empty.

Recently-declined cards enter a cooldown before returning, and return with modified terms — usually worse, because the moment has passed.

---

## 11. Interface

### 11.1 Main dashboard

The dashboard is the game's face, and its job is to make a semi-structural macro model feel like a cockpit.

**Primary row — the four things you check first:**
- Real GDP growth, with nowcast band
- Headline and core inflation against the target band
- **Nominal GDP per capita in USD, with the trajectory to 15,000 drawn as a receding line** — the permanent reminder
- SET index, moving fastest, the emotional pulse — **and starting hot** (§11.2)

**Secondary panels:**
- Labour underutilisation index and participation (§5.2 — *not* the unemployment rate, which is a flat 1.0%)
- **Policy rate, with the MPC vote split** — dissent is frequent enough (40% of meetings) to be a legible, data-grounded read on how close the committee is to moving, without exposing the reaction function directly
- THB/USD and REER
- **Debt/GDP against the 70% ceiling**, with projection fan — promoted to primary weight per §6.3
- Current account and tourist arrivals
- Estimated potential output growth — the Legacy number, given deliberate prominence

**Political strip.** Always visible: seat arithmetic, coalition composition, relationship bars, approval. It should be impossible to plan a policy without seeing whether it can pass.

**Time controls.** Turn indicator, quarters remaining, the election date marked, and the pending-commitments queue showing what past decisions have already spent of the future.

### 11.2 Opening market conditions

The SET history (`/config/set_history.json`, monthly from January 2024) hands the design an unusually good starting position, and the dashboard should exploit it.

The index fell from 1,466 (October 2024) to a trough of **1,090 in June 2025** — a 26% drawdown — then rallied 49% into the election, including **+15.29% in February 2026 itself**, the largest single month in the sample. It has since consolidated in the 1,490–1,620 range.

The player therefore takes office into a market that has already priced a large amount of optimism about them. This is a gift: it establishes from turn one that expectations are a liability, that the SET can fall on good policy if the policy is less than what was priced, and that the fastest-moving number on the dashboard is measuring *disappointment relative to expectation* rather than performance in absolute terms. No tutorial text is needed to teach this — the chart does it.

Calibration anchors from the same data: mean monthly return +0.55%, monthly standard deviation 5.15%, **annualised volatility 17.8%**, worst month −8.43%, best +15.29%. The sentiment process in §5.3 should reproduce that volatility and that fat-tailed, event-driven character.

### 11.3 Chart discipline

Every chart shows history and, where relevant, a projection distinguished visually from realised data. Fan charts for anything uncertain — which is nearly everything. Player actions are annotated on the timeline, so the player can see what they did and when relative to what happened. Consistent colour semantics throughout, and everything legible in both light and dark.

The dashboard must not imply more precision than the model has. Uncertainty bands are not decoration; they are the message.

### 11.4 Other screens

- **Card / inbox view.** Briefing text, options, estimated effects with ranges, staff advice from ministries (which conflict — the Finance Ministry and the Transport Ministry want different things), and the parliamentary read.
- **Budget screen** (§6.4).
- **Parliament view.** Seat visualisation, party detail, relationship history, vote records, negotiation interface.
- **Model explorer.** An optional panel exposing the model's structure, current parameter estimates, and channel diagrams. Supports pillar 5 — players who want to reverse-engineer the system should be able to, and this is also where the game does its teaching.
- **Post-mortem.** The four scores, the full timeline with decisions annotated, counterfactual comparison against a no-action baseline, and a plain-language narrative of what happened and why.

---

## 12. Data and configuration architecture

**Everything factual and everything contestable lives in config files, not code.**

```
/config
  parties.json          # seats, ideology, bases, cohesion, relationships
  parliament.json       # coalition structure, portfolios, thresholds
  initial_state.json    # macro state at 2026-Q1
  parameters.json       # model coefficients, central values + distributions
  demographics.json     # cohort projection
  fiscal_baseline.json  # revenue structure, expenditure baseline, debt profile
  external.json         # global assumptions, shock hazard rates
/cards
  spine/  contingent/  shocks/  reform/
/scenarios
  base_2026.json        # the default scenario
  ...                   # alternative starts
```

Rationale:

- **Facts go stale.** Seat counts, policy rates, debt levels, and coalition arrangements change. Config means updating a file, not a refactor.
- **Assumptions should be auditable.** Ideology vectors and behavioural coefficients are the most disputable content in the game. They should be readable, commented with reasoning, and open to challenge.
- **Scenarios come free.** Alternative parliaments, historical starts, hypothetical governments — all config, no code.
- **Modding.** If the game is any good, someone will want to build the Vietnam version. Let them.

Every parameter file carries provenance: source, date, and confidence for each value.

---

## 13. Technical approach

**Client-side web application. No backend required.**

- **Engine.** Pure TypeScript. The core is a pure function: `(state, decisions, shocks) → state`. Pure means testable, deterministic given a seed, replayable, and backtestable — all of which §5.6 requires.
- **Determinism.** All randomness from a seeded PRNG. A run is fully reproducible from `(seed, decision sequence)`, which makes bug reports trivial and enables replay sharing.
- **UI.** React. A charting library capable of fan charts and dense multi-series time series.
- **Persistence.** Export and import a run as JSON. No server, no account.
- **Testing.** The engine gets a proper test suite: identity checks (the accounting must close), sign checks on every channel, and the historical backtest as an integration test.

The engine and the UI must not be entangled. It must be possible to run the engine headlessly over thousands of simulated runs to calibrate, to establish the achievable frontier for §3.3, and to detect dominant strategies.

---

## 14. Where realism is compromised

Per the design stance, every concession to playability is listed here rather than buried.

1. **Twenty turns of agency.** Real prime ministers do not make three to five discrete high-consequence decisions per quarter and nothing else. The card queue compresses a continuous stream of governing into a legible set of choices.
2. **Bounded action space.** Real policy space is unbounded; the card system is a curated subset. Mitigated by making the subset large and state-responsive, but it is a compression.
4. **Parties as unitary actors.** Real parties have factions, individual defectors, and internal leadership contests. The cohesion parameter approximates this crudely.
4. **A single stability variable** stands in for a genuinely complex institutional environment (§9.6). Deliberately abstract, both for tractability and to avoid asserting things about real institutions.
5. **An explicit playability layer.** Policy channels are amplified 2–4.5× over their estimated values, and infrastructure gestation shortened from 5 years to 3, because the estimated model produces a headline spread of 1.1% across every available strategy — true, and unplayable. The amplification is isolated in `config/playability.json`, leaves the estimated parameters untouched, and reverts exactly by setting all gains to 1.0. See `PLAYABILITY.md`. This is the single largest realism concession in the project and it is deliberately the easiest one to audit.
6. **Faster-than-real feedback on some channels.** A few effects — investor sentiment, tourism response — are tuned slightly quicker than reality so that a five-year run contains visible consequences. Documented per-parameter in config.
6. **Global environment is exogenous.** No feedback from Thai policy to world conditions. Defensible at Thailand's size.
7. **No fully-specified financial sector.** Banking is reduced to credit growth and spreads. A banking crisis is a shock card, not an emergent outcome.
8. **No crisis dynamics.** The engine is a normal-times model with shocks added exogenously. There is no credit crunch, no balance-sheet amplification, no confidence collapse, so it systematically under-predicts the depth of contractions (`SIMULATION.md`). Crisis severity in the game is therefore a property of the card that deals it, not an emergent outcome.
9. **No yield curve.** Thai government bond yields are out of scope (§5.3); the sovereign risk premium is a judgemental function rather than an estimated one. The SET index carries the market-feedback role instead.
10. **Simplified expectations.** Adaptive with an anchoring term rather than model-consistent. This is standard in semi-structural models and is arguably more realistic than rational expectations, but it is a modelling choice worth naming.

Everything else — lags, uncertainty, data fog, state-dependent multipliers, demographic decline, the immovability of trend growth over five years — is kept at full strength, including where it makes the game harder and slower.

---

## 15. Open questions

1. **Verify in the sweep that the degenerate cell is unreachable.** Per §3.4, the FX-dominance risk is resolved by the player having no instrument to move the currency 27%, not by trade elasticities. The sweep should confirm that no sequence of available actions produces a baht below roughly 28, and that runs approaching it are dominated on the Substance score. If a path to 24 exists in the engine, the FX block is wrong.
3. **Is the achievable frontier interesting?** The design assumes good play lands 11,000–12,500 against a 9,092 baseline, with meaningful variance. If the model produces a tight band regardless of decisions, the game has no decisions.
3. **Does uncertain-parameter drawing frustrate more than it engages?** It is the most defensible design choice and the most likely to annoy. Needs playtesting; a difficulty setting that narrows the distributions is the fallback.
3. **Is quarterly right?** Twenty turns may be too few for the political system to breathe. Monthly turns with quarterly data are the alternative.
4. **How much text?** The briefing quality on each card determines whether this feels like a spreadsheet or a game. This is a writing problem, not an engineering one, and it is probably the largest single cost.
5. **Does the coalition system need an AI negotiator**, or is a rules-based support model sufficient?
6. **How is calibration data actually sourced?** BOT, NESDC, IMF Article IV, World Bank monitors — assembling and reconciling this is a substantial research task in its own right and should be scoped before engine work begins.
7. **Tutorialisation.** The model is genuinely complex. A player who does not understand lags will conclude the game is broken. The tutorial has to teach the lag structure explicitly and early.

---

## 16. Build sequence

Not a scoping exercise — a dependency ordering.

1. Model specification and parameter research. The research task, done properly, before any code. **Parameters come from the literature, not from the panel** (`MODEL.md` §1) — naive regression recovers reaction functions. Add world demand and quarterly CPI to the panel while doing this.
2. Engine core, headless, with the **1993–2026 quarterly backtest** as the acceptance gate.
3. Calibration sweep — thousands of headless runs to establish the achievable frontier and detect dominant strategies. **The FX-dominance test (§15.1) comes first.**
4. Political model, headless, tested against the same standard.
5. Card schema and the first cards, validated against the engine.
6. Dashboard.
7. Card and budget interfaces.
8. Card authoring at volume — the long tail, and the largest time cost.
9. Playtesting and rebalancing.
10. Tutorial and post-mortem.

The gate at step 2 matters most. **If the engine cannot retrodict Thailand 1993–2026 with the right signs and plausible magnitudes, nothing built on top of it is worth building.** The data to run that test — 134 quarters of it — is already in `/config`.
