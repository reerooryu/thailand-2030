# Playability Layer

*The one place realism is traded for a playable game — deliberately isolated, tunable, and reversible.*

**Config:** `/config/playability.json` · **Code:** `/engine/src/playability.ts` · **Results:** `/SCENARIOS.txt`

## The problem it solves

The estimated model says no fiscal or reform strategy moves 2030 GDP per capita by more than **1.1%** (`SUPPLY.md` §3.2). That is correct economics — a five-year government cannot shift a level much — and it makes for a game with no decisions in it.

## How it works

`applyGains()` multiplies the channels the player acts through. It does **not** touch the estimated parameters, which keep their measured values and provenance. Setting every gain to 1.0 returns the estimated model exactly, and the backtest and dynamic simulation run at 1.0 — so the realism checks remain valid and unaffected.

| Channel | Gain |
|---|---|
| Fiscal multipliers | 3.0 |
| Monetary transmission | 2.0 |
| Reform → investment | 4.5 |
| Reform → TFP | 3.6 |
| Infrastructure → TFP | 4.0 |
| Crowding out | 1.8 |
| Infrastructure gestation | 12 quarters (from 20) |

Gestation moved to the **low end** of the published 3–7 year range rather than the midpoint, so a first-term capital programme partly lands inside the window — while staying long enough that the lag tension survives.

**Verification:** with gains applied to scenarios, the backtest is byte-identical to before — core CPI correlation 0.965, investment rate 0.927, dynamic simulation still non-divergent with bias +0.019. The realistic model underneath is untouched.

## Two structural fixes, not gains

**Infrastructure TFP bonus now applies only to spending above the 6.1% baseline.** Previously every strategy inherited the same free productivity boost from the existing programme, which inflated the do-nothing case and compressed the spread.

**Debt accounting is now live.** Debt/GDP evolves with the primary balance and r−g, against the 70% statutory ceiling. This was the missing consequence — and it changes the game more than any gain did.

## Result

| Strategy | 2030 headline | Legacy | Inv rate | Debt/GDP |
|---|---|---|---|---|
| Do nothing | 8,807 | 2.84% | 18.1% | **70.2** ✗ |
| Transfers | 8,837 | 2.88% | 18.2% | **75.9** ✗ |
| Capital push | 8,888 | 3.17% | 18.3% | **78.8** ✗ |
| Capital, tax-funded | 8,729 | 2.97% | 17.5% | **73.7** ✗ |
| Consumption spree | 8,816 | 2.85% | 18.1% | **79.5** ✗ |
| **Reform, hard** | **8,970** | **3.57%** | **20.3%** | **69.1** ✓ |
| Reform + capital | 9,052 | 3.89% | 20.5% | **77.6** ✗ |
| Reform, late | 8,858 | 3.21% | 19.3% | **71.6** ✗ |

Headline spread is now **323 USD (3.7%)**, up from 93 (1.1%). Legacy spread 1.04pp, up from 0.25.

### What the table says as a game

**Only one strategy stays under the debt ceiling.** Structural reform is the sole path that raises growth without spending money — and it is the one the coalition will refuse to pass (DESIGN §9). That is the game: the affordable option is politically impossible, and every affordable-and-passable option breaches.

**Even doing nothing breaches**, at 70.2%. The player inherits a fiscal path already running into the wall, which matches the WEO baseline of 69.5% and means turn one already contains a problem.

**The lag tension survives at a playable size.** Maximum reform buys +1.85% headline and +25.5% Legacy — a 13.8× ratio, down from 18.9× but still stark. Reform-late reaches 12.9% Legacy against 25.5% for reforming immediately, so sequencing still prices correctly.

**Tax-funded capital is the trap.** It is the only strategy that goes *backwards* on headline (−0.88%) while improving Legacy (+4.6%) — the tax multiplier of −1.125 bites immediately, the capital pays off after the run ends. Fiscally responsible, electorally fatal.

## Jeopardy pass — after playtesting

Three playthroughs exposed a game with a good decision space and **no consequences**. A populist run ended at 86% debt with the People's Party at 0 and the Democrats at 3, and completed normally on 73% approval. Three fixes:

**A sovereign risk premium with teeth.** Zero below 68% of GDP, then convex — roughly +0.5pp at 75%, +1.6pp at 85%. It does two things at once: raises the interest cost in the debt dynamic so the stock compounds faster, and raises the real rate facing private investment so the crowding-out is real. The player is not told where it starts biting.

**Gestation back to 16 quarters** (briefly 12) and the infrastructure TFP gain cut 4.0 → 2.2. At 12 quarters a first-year megaproject landed inside the term, which made building things a Legacy shortcut and undercut the entire premise that correct long-horizon policy is invisible on the scoreboard.

**Two fail-state events.** `forced_consolidation` fires above 79% of GDP after an undersubscribed auction and takes spending out of the player's hands entirely. `confidence_crisis` fires below 31% approval; a partner demands portfolios, a policy retreat, or dares you to call the bluff — and calling it costs 21 points of goodwill, enough that a partner already cold will walk, drop the coalition below 251 and **end the run**.

### What it did to the three runs

| | Headline | Legacy | Debt | Investment |
|---|---|---|---|---|
| **Reform, before** | 8,933 | 3.39% | 71.7% | 19.5% |
| **Reform, after** | 8,864 | **3.18%** | 72.4% | **19.5%** |
| **Populist, before** | 8,924 | 3.32% | 86.0% | 18.3% |
| **Populist, after** | **8,726** | **2.41%** | 87.2% | **14.8%** |

Before, the two paths were within 9 USD of headline and 0.07pp of Legacy — the reform path had no reward. Now reform beats populism by **138 USD, 0.77pp of Legacy and 4.7pp of investment**, and the populist path's own risk premium is what does most of the damage. The separation comes from the model rather than from a scoring penalty.

## Tuning

Raise the gains to make decisions louder, lower them for realism. The target used here: a good five-year run should move the headline number by 3–5% and clearly beat a bad one, while the debt ceiling stays a live constraint rather than a formality.

This file and `config/playability.json` are the whole surface — nothing else in the model needs touching to change how loud the game is.

## 7. The four dead channels (audit, August 2026)

An audit of every card option's marginal contribution turned up a structural
fault rather than a balance one. Four `PolicyEffects` fields — `fdiSignal`,
`humanCapital`, `formalisation`, `savingsRate` — were accumulated by the policy
layer, displayed nowhere, and read by nothing. `fdiSignal` reached the SET index
in the browser build only; the other three reached nothing at all in either host.

Every card granting them was therefore paying for an effect that did not exist:
the semiconductor package's 86,000 engineers (`humanCapital: 0.55`), the whole
Pax Silica / data-centre FDI thread, and the collection side of both revenue
cards. This is why the optimiser refused the Negative Income Tax and the Revenue
Mobilisation Package under every objective — priced as written they were pure
cost, because the compensating channel was not wired.

They are now inputs to `Policy` and used in `step()`:

| Channel | Enters | Coefficient | Rationale |
|---|---|---|---|
| `fdiSignal` | investment rate | 0.22 | FDI is ~a fifth of Thai GFCF. Persistence is 0.584, so the long-run effect is ~2.4x the coefficient. |
| `savingsRate` | investment rate | 0.15 | domestic saving funding the same equation |
| `humanCapital` | TFP growth | 0.015 | skills raise the growth rate, not the level, and slowly |
| `formalisation` | revenue | 0.60 | the collection dividend — revenue without a rate rise |

Calibrated against two fixed points: the do-nothing term (news answered, no
bills) must still land near 17.8% investment and ~8,800 headline, and a
machine-optimal term must not exceed ~21% investment, which is where Thailand
actually sat before 2014. The backtest is untouched — these terms are zero in
historical mode, so estimated loss stays at 20.12.

Both revenue cards are now taken by the optimiser under the balanced objective.

## 8. Institutional support, made real (August 2026)

`institutionalSupport` moved the Others opinion number and nothing else, which
meant the maximalist Zero Corruption Act could cost nine points of establishment
goodwill with no observable consequence — the player correctly noticed that
paying a price that never arrives is not a trade-off.

It now runs through **bureaucratic cooperation**, a multiplier on the capital
execution rate:

    cooperation = clamp(1 + (Others - 55) / 200, 0.78, 1.15)

Others is the establishment: the permanent secretaries, the provincial
governors, the officials who decide whether a voted budget line becomes a signed
contract this fiscal year or the next one. A government they are cold toward
disburses less of what it appropriates; one they are warm toward disburses more.
Neutral is 55 rather than 50, because the civil service is not owed enthusiasm,
only consent.

This is now the channel through which every `institutionalSupport` effect in the
game reaches the economy, and it means the establishment-antagonising reforms —
Zero Corruption at full strength, justice reform, civil service early retirement
— buy their structural gains at a real and compounding cost to delivery.

## 9. Two balance faults found by playtest (August 2026)

**Approval was a ratchet.** Every `approvalBoost` was additive and permanent;
nothing anywhere subtracted. Across 720 simulated terms the median finished at
93 and the modal value was 100. Approval is now a stock that decays 13% a
quarter toward a fundamental:

    target = 44 + 4.0*(growth felt - 2.4) - 2.5*max(0, cpi - 3)
                - 0.6*max(0, debt - ceiling) - 5.0*(quarter/16)

The incumbency term matters: Thai governments do not get more popular by
staying in office. The decay also creates a real timing decision, because a
giveaway in 2027 has washed out by the count and one in 2029 has not.

Post-fix medians across 240 terms per style: balanced 53, populist 61,
reform 56. Range 40 to 69. The 60% gate on the election's record bonus is now
something a populist term clears and a technocratic one does not.

**The headline was unwinnable by construction.** The passive path — no cards,
news answered minimally — landed at 8,755 against an IMF baseline of 9,092.
But a WEO projection IS the passive path, so the game was charging the player
337 dollars for the model's trend growth being slightly under the Fund's, and
0 of 720 terms beat the baseline. `BASELINE_ALIGN = 1.0385` aligns the passive
path to 9,092 exactly. It scales every outcome equally and changes no ranking.

Post-fix: median play 9,228, machine-optimal 9,651 balanced and 9,953 on the
headline objective. The do-nothing term is now exactly par, which is what
"baseline" is supposed to mean.
