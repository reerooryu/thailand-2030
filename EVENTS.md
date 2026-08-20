# Events

*Blocking news. The turn cannot advance until every event is resolved.*

**Config:** `/config/events.json` · **Code:** `/engine/src/events.ts`, `/engine/src/turnloop.ts`
**Run:** `cd engine && npx tsx src/turnloop.ts` · **Output:** `/TURNLOOP.txt`

**9 events, 25 options.** Three of them are *scripted* — they fire on a fixed quarter regardless of what the player does, because they were already happening.

## The distinction from cards

A policy card can be ignored. An event cannot — `blocking: true` means the turn does not advance until it is resolved. That single difference is what makes consequences feel **imposed** rather than shopped for: they arrive on someone else's timetable, usually because of something the player chose two quarters ago.

Four trigger types:

| Trigger | Fires when |
|---|---|
| `afterOption` | N quarters after a specific card option was enacted — **consequence chains** |
| `threshold` | A state variable crosses a value (debt above 68.5% of GDP) |
| `hazard` | Random, seeded, with a per-quarter probability (energy shock, 9%) |
| `flag` | A flag is set |

Randomness runs off a seeded PRNG, so a run replays exactly from `(seed, decisions)`.

## The Land Bridge chain, as specified

**Card:** Push ahead / Delay pending review / Cancel outright.

**Delay** grants +4 institutional support and +1 approval — it reads as prudence rather than retreat — and the card returns in two quarters. The file comes back and the player has to answer then.

**Push** schedules `land_bridge_opposition` for the following quarter. When it fires, the turn blocks:

> **Southern provinces erupt over Land Bridge land seizures**
> Expropriation notices in Ranong and Chumphon have brought thousands onto the streets. Fishing communities say the deep-sea port will end their livelihoods; the environmental review is still contested in court. The People's Party has tabled an urgent debate. Your Transport Minister wants to press on. The Interior Ministry is quietly asking whether the police can be relied upon to clear the sites.

| Option | Opinion | Effect |
|---|---|---|
| **Force it through** | Pheu Thai **+6**, People's −10, Democrat −7, Others −5, Kla Tham −2 | Commits +0.55% GDP/yr, approval −6, institutional −5. Sets `land_bridge_committed` — irreversible. |
| **Pull back — rail link instead** | Pheu Thai **−8**, Democrat +6, Others +4, People's +3 | Recovers most of the capital (+0.16% instead of 0.55%), approval +2, institutional +4. Clears `land_bridge_live`, sets `land_bridge_scrapped`. |

Traced live in `TURNLOOP.txt`: forcing it through takes the People's Party from 6 to **0 — Hostile**, and Democrats from Neutral to Cold. Pulling back costs Pheu Thai eight points but moves Democrats and the institutional bloc up.

### The emergent bit

**The climbdown is the only route to the rail link.**

Cancelling the Land Bridge by legislation fails in every coalition — 191 to 212 votes against 251 (`POLICIES.md`). The Chumphon–Ranong rail card requires `land_bridge_scrapped`, so through the parliamentary route it is unreachable.

But the *event* resolution sets that flag directly, because a climbdown under public pressure is not a bill — it is a decision the Prime Minister announces. So the rail link becomes available only to a player who pushed ahead, provoked the crisis, and then retreated.

Nobody designed that. It emerged from cancellation being politically impossible while capitulation is politically available, which is an uncomfortably accurate thing for the model to have discovered.

## The 2026 inheritance — scripted events

Three things were already in motion when the player takes office. They are not consequences of anything the player chose; they arrive on a fixed quarter and must be answered.

**Q1 — Strait of Hormuz closed.** Roughly half of Thailand's crude and a third of its LNG transit Hormuz. Panic buying took daily consumption from 67 to 84 million litres, and the Federation of Thai Industries warned production costs could rise 50% for heavy industry. Options: co-payment fuel credits (2,000–2,400 baht, as actually drafted), release strategic reserves and cap refinery margins, or let it pass through at −11 approval.

**This is the event that explains the data.** The April 2026 CPI spike already in `config/cpi.json` — transport +10.13%, raw food and energy +8.37%, headline +2.75%, housing exactly 0.00% — is this. The player's first turn contains a real, dated shock whose fingerprint is in the price index they can see on the dashboard.

**Q2 — Constitutional Court accepts a petition against the February election.** A 6–3 vote to hear a challenge arguing that barcodes and QR codes on ballots could trace voter identity, violating ballot secrecy. A ruling against the Election Commission could annul the result. Defend the EC (+institutional, −People's), concede and legislate ballot reform (+9 People's, +7 Democrat, −institutional), or say nothing and watch every investment decision go provisional.

**Q4 — Tourism industry demands the BOT weaken the baht.** ATTA projects 39 million arrivals on a Chinese recovery and says it will not happen at this rate: a Chinese visitor gets about **4.4 baht to the yuan against 5.4 before**, a fifth of their purchasing power gone. Arrivals were down 18% in January. The association wants the rate managed to 40, or at minimum back to 2019's 35.

This one is the design's FX thesis arriving as a political demand rather than an abstract lever. Pressing the BOT publicly costs **−7 institutional and −0.25 on the FDI signal** — central bank independence is one of the few things foreign investors still price into Thai assets — while declining costs approval and annoys two coalition partners. The player cannot set the exchange rate, but they can spend credibility asking.

## The other five

**Civil service backlash** — fires two quarters after the full early-retirement programme. Coordinated slowdown, disbursement stalled in eleven ministries. Concede (buy them back, +0.20% GDP), hold firm (execution −0.08, institutional −6), or exempt frontline services (two thirds of the saving, a third of the fight).

**VAT street protest** — fires one quarter after going straight to 10%. Hold, add a low-income rebate, or phase it after all — which keeps half the revenue after spending all the capital.

**Eastern HSR arbitration** — two quarters after termination. Asia Era One seeking well above the 12bn baht it claims to have spent, foreign chambers writing jointly, three unrelated concession enquiries gone quiet. Settle (FDI signal recovers, costs money) or contest (popular at home, every infrastructure investor in Asia reads the filing).

**Energy shock** — 9%/quarter hazard. Cap fuel prices (approval +7, permanent expectation), targeted transport subsidy, or let it pass through (approval −8, and correct). Grounded in the April 2026 shock already in the data.

**Debt ceiling warning** — fires above 68.5% of GDP, which every run reaches. Raise the ceiling, consolidate, or note it and proceed.

## Two new policy cards

**Civil Service Reform.** 1.8 million core civil servants, 3.0 million including teachers, medical staff, police and military. Personnel and pensions consume roughly **1.4 trillion baht — close to a third of total budget expenditure**, with the Parliamentary Budget Office wanting it capped at 35% by 2032. The plan cuts the core workforce by about a third to 1.35 million through voluntary early retirement aimed at officials around 40 — some 414,000 people, 30% of the workforce — with no compulsion, financial incentives and reskilling, targeted for fiscal 2027.

The severance is paid now and the savings arrive over a decade. Institutional support takes **−12**, the largest single hit any card inflicts, because the player is asking the bureaucracy to vote for its own reduction — and they are the people who implement everything else that passes. It is also the only card that moves the public wage bill, which DESIGN §6.4 flags as downward-rigid.

**Digital Government.** DGA consolidation onto shared cloud — e-Sarabun with digital signatures and ThaiID, e-Meeting, the Government Data Cloud — with agencies onboarded one at a time and digital readiness varying enormously across the state. Cheap, unglamorous, and it raises **budget execution by more than any other card** (+0.09), meaning the money already allocated starts actually arriving.

It is also the precondition for two other cards working: a unified Super Licence is meaningless if ministries cannot see each other's records, and the civil service cannot shrink without automating what the leavers used to do. That dependency is currently implied by the briefing text rather than enforced in code — worth making mechanical.

## Outstanding

1. More hazard events — Chinese demand, flooding — using the shock magnitudes already calibrated in `config/shocks.json`.
2. Events currently fire at most once per run. Repeatable events (energy shocks recur) need a cooldown rather than a fired-set.
