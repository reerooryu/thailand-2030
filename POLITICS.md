# The Political Layer

*February 2026 coalition formation, and parliamentary support thereafter.*

**Config:** `/config/coalitions.json` · **Code:** `/engine/src/politics.ts`, `/engine/src/prologue.ts`
**Run:** `cd engine && npx tsx src/prologue.ts` · **Output:** `/PROLOGUE.txt`

## Structure

House of 500, majority 251, Bhumjaithai on **191 — sixty short**. The seventeen minor parties are merged into a single **"Others"** bloc of 35 seats whose opinion doubles as **general institutional support**: the establishment, the bureaucracy, the provincial networks. It moves slowly and it gates the things a government needs quiet consent for.

Opinion runs 0–100 in eight bands, from Hostile through Neutral to Very friendly.

| Party | Seats | Opening opinion | |
|---|---|---|---|
| People's | 120 | **14** | Frigid — no cooperation available |
| Pheu Thai | 74 | 42 | Neutral |
| Kla Tham | 58 | 47 | Neutral |
| Democrat | 21 | 44 | Neutral |
| Others | 35 | 56 | Neutral |

## The four options

**Bhumjaithai + Kla Tham + Others — 284 seats**
*"The comfortable one. Provincial networks, conservative instincts, nobody asking difficult questions about the budget."*
Small agricultural boost, drag on everything else, reform capacity 55%. Costs you the People's Party and the Democrats.

**Bhumjaithai + Pheu Thai + Others — 300 seats**
*"The big-tent option. Money to spend and partners who want to spend it."*
Moderate boosts to education, megaprojects and stimulus. Reform capacity 75%. Widest fiscal latitude and the fastest route into the debt ceiling. Kla Tham drops 12.

**Bhumjaithai + Pheu Thai + Democrat — 286 seats**
*"The awkward one. Two parties who dislike each other, held together by you, with the Democrats auditing everything."*
Minor boosts to education, megaprojects and stimulus, plus a real **anti-corruption dividend** — budget execution rises from 0.50 to 0.64, which raises the return on every baht of capital spending disbursed. Kla Tham drops 14, Others drop 4.

**Bhumjaithai + People's Party — 311 seats**
*"Why would they ally with us again?"*
Greyed out. The arithmetic works and nothing else does.

## What each coalition actually produces

Running the best strategy each coalition's partners will tolerate, 2026Q2 → 2030Q4:

| Coalition | 2030 headline | Legacy | Inv rate | Debt/GDP | Reform capacity |
|---|---|---|---|---|---|
| + Kla Tham + Others | 8,883 | 3.34% | 19.3% | 76.6 ✗ | 55% |
| **+ Pheu Thai + Others** | **9,193** | **3.81%** | **20.3%** | 79.2 ✗ | 75% |
| + Pheu Thai + Democrat | 9,025 | 3.72% | 19.9% | 77.8 ✗ | 70% |

A **310 USD spread** on the headline from the coalition choice alone — comparable to the entire spread across every fiscal strategy. **Who you govern with matters as much as what you do.** That is the right shape for the game: the prologue is the highest-leverage decision in the run, as DESIGN §9.8 argued it should be.

## The vote that makes the choice bind

Support is `opinion + 50 × ideological fit`, plus six points of loyalty for coalition members. Fit is weighted heavily on purpose — a party will not vote for something it exists to oppose merely because it likes you.

Putting a full structural reform bill to the House (People's +0.7, Democrat +0.5, Pheu Thai −0.1, Others −0.4, Kla Tham −0.6):

| Coalition | Result |
|---|---|
| **+ Kla Tham + Others** | **247 yes / 194 no / 58 abstain — FAILS, four seats short** |
| + Pheu Thai + Others | 321 yes — passes by 70 |
| + Pheu Thai + Democrat | 286 yes — passes by 35 |

**The conservative coalition is warm, comfortable, holds a 33-seat majority, and cannot pass structural reform by four votes.** Kla Tham abstains rather than backing something it exists to oppose, and the government is left four short of its own agenda.

That is the game in one line. The comfortable option is not merely slower — it forecloses the only path that stays under the debt ceiling, and it does so with a majority in hand.

It also rhymes with the arithmetic finding from the raw seat data: Bhumjaithai plus Kla Tham is exactly two seats short of a bare majority. The conservative path in Thai politics keeps landing just short of what it needs.

## Cross-bench defection

Parties are not perfect blocs, and treating them as such made a four-vote defeat unwinnable no matter how the player had governed. A party **on speaking terms with the government — anything above Frigid (opinion > 20)** — now loses a handful of members to the government side on any given bill.

```
rate = baseRate × opinionFactor × fitFactor × (1.3 − cohesion) × stanceMultiplier
       capped at 6% of a party's seats
```

- **opinionFactor** rises from 0 at the Frigid boundary to 1 at 72. Below 20, nobody moves — a hostile party is genuinely a wall.
- **fitFactor** halves the rate where the bill crosses a red line, three-quarters where it is a soft objection.
- **cohesion** is per-party: People's 0.90, Pheu Thai 0.78, Kla Tham 0.68, Democrat 0.62, **Others 0.34** — the merged micro-parties are individually purchasable, which is exactly what they are.
- **stanceMultiplier** is 1.5 for a party that would otherwise abstain: abstention means it is already near the line.

### Tuned to the knife edge

The VAT bill under the Pheu Thai coalition, which failed by four before this existed:

| Opposition relations | Result | Crossbench |
|---|---|---|
| As a typical run leaves them | **fails by 1** | Pheu Thai +3 |
| Kla Tham warmed to Neutral | **passes by 0** | Pheu Thai +3, Kla Tham +1 |
| Opposition warmed +20 | passes by 0 | +4 total |
| Everyone hostile | fails by 22 | +3 |

And under the conservative coalition, the original 4-short case:

| | Result |
|---|---|
| As the run left it | fails by 2 |
| Pheu Thai kept Neutral | fails by 1 |
| **Pheu Thai kept Warm** | **passes by 0** |

The totals are **one to four seats**. That is the whole intervention. It does not make hard bills easy — a hostile House is still a wall, and OECD accession under the conservative coalition still fails by 36 — but it means the difference between losing by four and winning by nothing is whether the player bothered to keep the opposition on speaking terms for five years.

The vote preview in the UI shows the crossbench contribution as its own chip, so the player can see the mechanism rather than infer it.

## Outstanding

1. **Opinion dynamics between turns** — policies should move opinion each quarter, not just at formation. This matters more now that defection is opinion-driven: there is currently no way to *court* the opposition between votes.
2. **Portfolio allocation** (DESIGN §9.3), the mechanic that trades agenda control for loyalty.
3. **Confidence motions and coalition collapse** — the run-ending failure state.
4. Ideological fit vectors per policy type; currently supplied per bill by hand.
