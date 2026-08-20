# Policy Cards

*Twelve real Thai policies, researched to August 2026, expressed as channel vectors the engine already understands.*

**Config:** `/config/policies.json` · **Code:** `/engine/src/policies.ts`, `/engine/src/agenda.ts`
**Run:** `cd engine && npx tsx src/agenda.ts` · **Output:** `/AGENDA.txt`

**12 cards, 36 options.** Each option carries a fiscal cost, a reform contribution, a lag profile, an ideological fit per party, and flavour text.

## The cards

| Card | What it is | Fiscal | Reform | Lag |
|---|---|---|---|---|
| **Land Bridge** | Chumphon–Ranong, >1tn baht, Phase 1 targeted 2030 | +0.55% GDP/yr | 0 | 20q — lands outside the window |
| **Negative Income Tax** | 2027 target, ~60,000 baht threshold, VAT-funded | +0.9% transfers, +0.9% revenue | 25 | 16q on TFP |
| **Super Licence / Omnibus** | Unified licence, ~7,000 rules consolidated | ~0 | **45** | 6q investment, 12q TFP |
| **Thai Chuay Thai Plus** | 1,000฿/month × 4 months × 30m people | +0.63% GDP | 0 | immediate |
| **TISA** | Equity savings accounts, 800k฿ deduction, 11.4m earners | −0.15% revenue | 6 | 8q |
| **OECD Accession** | Initial Memorandum filed Dec 2025, technical review | ~0 | **55** | 8q investment, 20q TFP |
| **TH-AI Passport** | 1.6bn฿, 5m citizens, 12 AI models | +0.008% GDP | 6 | 24q |

Two things stand out immediately from that table, and both are the game working:

**The two highest-reform cards cost nothing.** Super Licence (45) and OECD accession (55) are the largest structural levers available and are fiscally free. They are also the two your coalition is most likely to block. Reform in this game is never limited by money.

**TH-AI Passport is fiscally trivial and politically loud.** At 0.008% of GDP it barely registers in the model, but it polls well and its productivity effect lands in 2032. It is the archetype of the cheap, popular, useless-inside-the-window card — and a good test of whether the player has understood the lag structure.

## The rail cards, and conditional unlocks

Three transport projects, plus two successor cards that only exist if something else dies first. This required a **flag system**: cards declare `requires`, options declare `sets` and `clears`, and the agenda resolver iterates to a fixed point so a cancellation and its successor can both resolve in one session.

| Card | Detail | Fiscal |
|---|---|---|
| **Northeast HSR Phase 2** | Nakhon Ratchasima–Nong Khai, 357 km, ~US$10.1bn, target 2030, connects to the China–Laos line. Phase 1 already slipped a year. | +0.62% GDP/yr |
| **Eastern HSR (3-airport)** | Eight years late, **21.8bn baht sunk** (9.8bn public, on expropriation and utility relocation), concession facing a termination review. U-Tapao forecasts cut, Makkasan drainage unresolved, financing unclosable. | +0.28% |
| **Chumphon–Ranong Rail** | *Unlocks only if the Land Bridge is scrapped.* Rail-only link, no deep-sea ports, doesn't require persuading shippers to abandon Malacca. | +0.16% |
| **EEC Conventional Rail** | *Unlocks only if the Eastern HSR concession is terminated.* Double-track electrified to U-Tapao. Lands inside the term. | +0.14% |

The Northeast HSR completion date is 2030 — precisely the end of the run. The ribbon, if there is one, belongs to whoever wins the next election.

## VAT — now its own card

**You were right that it was missing.** VAT was buried inside the Negative Income Tax option as an unnamed funding assumption. It is now a standalone card and NIT's funding option has been rewritten so the two don't double-count.

The real government path, not an invented one: **8.5% in 2028, 10% in 2030**, alongside a 1 baht/litre fuel excise rise from 2027, targeting revenue of 15.1% of GDP and a deficit under 3% by FY2029. Each percentage point is worth roughly 0.55% of GDP.

| Option | Revenue | Approval |
|---|---|---|
| Hold at 7% | 0 | — |
| **Phased (8.5% → 10%)** | +0.83% GDP | −5 |
| **Straight to 10%** | +1.65% GDP | **−14** |

With a tax multiplier of −1.125 — the largest in the toolkit — going straight to 10% costs **1.86pp of output on impact** while the spending it funds arrives years later. Note the phased option puts half the revenue after the next election, which is rather the point of phasing it.

## The prerequisite chain

Two mechanisms, deliberately different:

- **`dependsOn`** — a soft discount. The option is playable; its effects scale by `withoutFactor`.
- **`requiresFlags`** — a hard lock. The option cannot be played at all until every flag is set, and the UI shows it struck through with the reason.

The hard chain is three links:

| Locked option | Requires | Why |
|---|---|---|
| **Negative Income Tax** (funded) | VAT Reform | A transfer to twenty million new filers cannot be funded from a revenue base flat at 21% of GDP. |
| **OECD Accession** (accelerate) | Super Licence | Investment-openness chapters cannot be answered while approvals still run ministry by ministry. |
| **Civil Service Reform** (full) | Digital Government | The state cannot shed a third of its staff until something automates what they did. |

Soft discounts remain on Super Licence (×0.55 without digital government), civil service attrition (×0.65), and both megaprojects (×0.8 without a revenue measure — otherwise it is pure borrowing against a ceiling already within five points).

The effect is a small tech tree. **VAT is the root of the fiscal branch and Digital Government the root of the administrative one**, and a player who ignores both finds the second half of the deck greyed out. Since VAT fails in every coalition tested, the fiscal branch is frequently unreachable — which is the intended bind rather than a bug.

### VAT is no longer the only door

Playtesting found the fiscal branch had a single key that almost never turns. VAT fails by **one to two votes** in every coalition — passing it needs opposition relations near their reachable ceiling, which means spending nearly every event placating parties you are also fighting on everything else. A whole branch behind one near-unpassable card is a dead end, not a bind.

The fix is not making VAT easier. It is a second, duller door: the **Revenue Mobilisation Package** — the 1 baht/litre fuel excise from 2027, tighter sin and vehicle excise, a cap on personal income tax deductions, and the largest item, closing the gap between tax assessed and tax collected in a country where 10 million of 67 million file at all.

| | Yield | Passes | Depends on |
|---|---|---|---|
| **VAT phased** | +0.83% GDP | fails by 1–2 in every coalition | — |
| **Revenue package** | +0.52% GDP | +71 / +55 / +38 | Digital Government (×0.6 without) |
| Excise only | +0.24% GDP | comfortably | — |

Nobody red-lines it, because nobody campaigns against better collection. It is what a government does when it cannot get VAT through the House, which is most governments, most of the time. The dependency on Digital Government is the point: most of the yield is collection, and the Revenue Department cannot collect what it cannot see.

**And unlocking the branch turns out not to be obviously worth it.** Running the same reformist plan through the package instead of a failed VAT attempt:

| | Headline | Legacy | Debt | Approval |
|---|---|---|---|---|
| VAT fails, NIT stays locked | **8,864** | 3.18% | 72.4% | **42** |
| Package passes, NIT enacted | 8,830 | 3.18% | 72.8% | **36** |

Two actions and six points of approval to enable a transfer programme whose multiplier is 0.30 — the weakest instrument in the toolkit. The branch is now reachable, and reaching it is a real decision rather than a strictly better one.

## Three actions per quarter

A government cannot pass its whole programme in one sitting. Cabinet time, drafting capacity and floor time are all finite, so the player gets **three actions per quarter** — 57 across the run against 14 cards with 42 options.

This matters more than it sounds. It converts the deck from a shopping list into a scheduling problem: the prerequisites mean order is forced, the 19-quarter horizon means late reforms never mature, and three per quarter means the early turns are spent on enabling cards that do nothing visible by themselves.

## Red lines

The vote model needed one addition. Coalition members were passing almost anything, because loyalty plus warm opinion outweighed ideological opposition. Now:

- **fit ≤ −0.5** → the party votes no regardless of how warm it feels toward you
- **fit ≤ −0.3** → the most it will offer is an abstention

A party does not vote against its reason for existing because it likes the Prime Minister. This single rule is what makes the coalition choice bind rather than tint.

## Result: the same agenda under three coalitions

**Reformist agenda** — Super Licence full, OECD accelerate, NIT with VAT funding, Land Bridge postponed, transfers means-tested:

| Coalition | Blocked | Reform effort | 2030 headline | Legacy | Debt |
|---|---|---|---|---|---|
| **+ Kla Tham + Others** | **Super Licence, OECD** | **49** | 8,754 | **2.85%** | 72.9 ✗ |
| + Pheu Thai + Others | none | 100 | **8,914** | **3.43%** | 71.8 ✗ |
| + Pheu Thai + Democrat | none | 100 | 8,900 | 3.37% | 71.9 ✗ |

**Populist agenda** — Land Bridge funded, transfers without VAT, full co-payment, OECD allowed to drift:

| Coalition | Blocked | Reform effort | 2030 headline | Legacy | Debt |
|---|---|---|---|---|---|
| + Kla Tham + Others | none | 16 | 8,795 | 2.84% | **79.8** ✗ |
| + Pheu Thai + Others | none | 16 | 8,872 | 3.05% | 79.2 ✗ |
| + Pheu Thai + Democrat | none | 16 | 8,873 | 3.04% | 79.2 ✗ |

### Three things the flag system produced

**You cannot cancel the Land Bridge.** Scrapping it fails in *every* coalition — 191 to 212 votes against a 251 threshold. Too many parties are invested in the southern corridor. So the Chumphon–Ranong rail link, which only unlocks on cancellation, never appears at all under any agenda tested. Megaprojects turn out to be politically irreversible once live, which is both true to life and a genuinely frustrating discovery for a player who has read the cost-per-container arithmetic.

**Eastern HSR termination passes only under the conservative coalition** — 270 yes with Kla Tham indifferent to it, against 212 and failure under both Pheu Thai coalitions, where Pheu Thai and Others defend the concession. The one government least interested in reform is the only one that can kill the eight-year failure. That inversion was not designed.

**VAT reform fails everywhere.** Four votes short under the conservative coalition, thirty-nine short elsewhere. The fiscal gap cannot be closed, which is why every single run in the table below breaches the ceiling.

### What this says

**Under the conservative coalition, trying to reform produces the same outcome as not trying.** Reformist gives Legacy 2.85%; populist gives 2.84%. The two blocked cards are precisely the two carrying the reform weight, so a player who picks Kla Tham in February 2026 and then governs seriously for five years arrives exactly where a player who spent the money would have — except without the four months of gratitude. That is a genuinely bleak and genuinely interesting outcome, and nobody designed it.

**The populist agenda passes everywhere.** Nothing in it is contentious, which is what makes it dangerous. It reaches **79–80% debt** against a 70% ceiling — a run-ending breach — while delivering less Legacy than any reformist path.

**Everything breaches the ceiling.** Even the best run lands at 71.8%. The player is not choosing between solvent and insolvent; they are choosing how much to overshoot and what to get for it. That matches the arithmetic from `CALIBRATION.md` §1.4 and it makes the debt ceiling card an inevitability rather than a risk.

**The best available outcome is Pheu Thai + Others running the reformist agenda**: Legacy 3.43%, debt 71.8%. Note it beats the Democrat coalition despite the Democrats' anti-corruption execution bonus — the wider megaproject and stimulus caps outweigh cleaner disbursement over five years. That is a non-obvious result and exactly the kind of thing a player should be able to discover.

## Research note

Figures are drawn from reporting current to **August 2026** and should be re-verified before anything is published. Specific numbers used: Land Bridge >1tn baht with Phase 1 targeted 2030 and criticisms of ~US$252/container and 54h vs 48h transit; NIT targeted 2027 at a ~60,000 baht threshold against 10m of 67m Thais filing; Super Licence at 180 days with omnibus consolidation of up to 7,000 rules within a year; Thai Chuay Thai Plus at 1,000 baht monthly for four months to ~30m people; TISA approved December 2025 with an 800,000 baht deduction covering ~11.4m earners; OECD Initial Memorandum submitted December 2025; TH-AI Passport at 1.6bn baht for 5m citizens across 12 AI models.

Sources are listed in the delivery message for this file and should be captured into a bibliography.

## Outstanding

1. **Card state** — unlocks, cooldowns, "returns in N quarters" on postponement. The schema carries `returnsInQuarters`; nothing consumes it yet.
2. **Contingent and shock cards** (DESIGN §10.4). Only the scripted spine exists.
3. **Opinion movement from enacted policy** — passing a card should move every party's opinion, not just the coalition choice.
4. Channels declared but not yet wired: `fdiSignal`, `humanCapital`, `formalisation`, `savingsRate`, `setSupport`, `approvalBoost`, `institutionalSupport`.
