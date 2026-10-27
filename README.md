# Thailand 2030

A turn-based sim of governing Thailand, one quarter at a time, from April 2026 to the March 2030 election.

You lead Bhumjaithai: 191 of 500 seats. First you pick who to govern with. Everything after that depends on it. Sixteen quarters, three actions each, one election. Underneath is a semi-structural macro model estimated on 134 quarters of Thai national accounts.

```bash
./build.sh          # then open ui/thailand-2030.html
```

That one HTML file is the whole game. It needs no server and no install, and gameplay never touches the network. `.github/workflows/pages.yml` builds and publishes it to GitHub Pages on every push to `main`.

---

## How it plays

Each quarter opens with the news. **Blocking** items, like Hormuz closing or a partner threatening to walk, must be answered before the turn ends. Then you spend up to three actions from 41 policy cards, some of which only reach the desk later in the term or after an earlier decision. Each card has two to four options: full programme, pilot, phase-in or nothing.

Most cards need a vote. You see the whip count, crossbench defectors included, before you commit. Executive actions skip parliament.

Four scores, all in tension:
- **Headline**: GDP per capita against the IMF's 2030 baseline of USD 9,092
- **Legacy**: potential growth
- **Investment**
- **Debt ratio**: measured against a ceiling you can raise by law and then have to live with

Then the count, coalition talks, an analyst's verdict, your revealed ideology and 33 achievements.

### Before your first term

- **Fiscal impulse is year-on-year.** Capital spending scores on the *change* in its GDP share, so timing matters as much as the programme.
- **Effort is not stock.** Reform effort builds stock at 6% a quarter and decays at 1.5%. A reformist coalition converts at 0.75, a conservative one at 0.55.
- **Order matters.** Civil service reform without digital government first loses its execution gain. Super Licence half-works. Negative income tax is locked until VAT moves.
- **The establishment bites back.** Anger it, and budget execution falls. Money you appropriated doesn't arrive.
- **The bond market charges.** The risk premium hits the next government and every firm borrowing alongside it.
- **Megaprojects open in stages.** 35% of public capital spending above the baseline programme reaches the capital stock after two years; the rest takes the full four. Build early and some of it counts before 2030.
- **OECD accession locks reform in.** While accession is accelerating, each matching domestic law (Super Licence, Digital Government, civil service reform, anti-corruption enforcement, justice reform, the Revenue package) closes a chapter. Each closed chapter raises reform capacity by 0.02 and adds to the FDI signal.
- **The EU trade deal is a race.** Talks start at 63% (15 of 24 chapters, June 2026) and move 3 points a quarter. Reforms that answer open chapters speed it up; the paternalist rights chapter, migrant raids and forcing the Land Bridge slow it. After ratification it phases in over two years: more export demand and a small permanent lift to productivity growth.
- **The agencies are watching.** S&P, Fitch and Moody's start at BBB+ / BBB+ / Baa1 and can move between A- and BBB-. Breaking or raising the debt ceiling, deep deficits and weak growth push them down; a downgrade adds to the risk premium.
- **You can dissolve the House.** If your own members start leaving and approval is at 55% or more, you can call a snap election instead of waiting for the government to fall. The term ends at that count.

---

## Layout

| Path | What |
|---|---|
| `build.sh` | Builds the game in three steps: data, engine bundle, single HTML file. |
| `engine/src/engine.ts` | The macro model: one pure `step()`, no I/O, no state. |
| `engine/src/browser.ts` | Game host: turns, cards, votes, flags, scoring. |
| `engine/src/politics.ts` | Coalition formation, whip counts, crossbench defection. |
| `engine/src/election.ts` | The March 2030 count and coalition talks. |
| `engine/src/achievements.ts` | 33 end-of-term achievements. None feed back. |
| `engine/src/eufta.ts` | The EU–Thailand FTA: progress, ratification, entry into force. |
| `engine/src/war.ts` | The Cambodian war and occupation: fronts, casualties, dissent, reconstruction. |
| `engine/src/alignment.ts` | US and China alignment tallies, fed by the `align` field on card and news options. |
| `engine/src/oecd.ts` | OECD accession chapters and what closing them does. |
| `engine/src/ratings.ts` | Sovereign credit ratings: S&P, Fitch, Moody's. |
| `engine/src/constitution.ts` | The new constitution: four steps, clause votes, referendums. |
| `engine/src/ideology.ts` | Reads your economic position off the budget. |
| `engine/src/game.ts` | Headless host for scripts: the browser host with the world passed in and leftover news defaulted. |
| `engine/src/optimise.ts` | Hill-climbing search over the whole term. Spoilers. |
| `config/policies.json` | 41 cards, 113 options. |
| `config/provinces.json` | Province outlines and a one-line description of each of the 77 provinces, for the map. Outlines from Natural Earth (public domain). |
| `config/events.json` | 52 news events, 107 options. |
| `config/coalitions.json` | The four coalitions and their effects. |
| `config/constitution.json` | Five parts of the constitution, their positions and party stances. |
| `ui/` | Front end. The client is in `ui/src/` (ES modules, bundled into `ui/app.js` by the build); see `ui/README.md`. |
| `scripts/` | Data builders (Python) and analysis tools (TypeScript). |
| `scripts/map/` | The map pipeline: `build_map.py` rebuilds every outline and the war map; `register_reference.py` fits the 1941 reference scan. |
| `data/` | Raw source files, kept for provenance. |

Start with `DESIGN.md`. `MODEL.md`, `CALIBRATION.md` and `BACKTEST.md` cover estimation and testing; `GAMELOOP.md`, `EVENTS.md`, `POLICIES.md` and `POLITICS.md` cover the game. `CATALOGUE.md` (every card and event) and `AUDIT_IMPACTS.md` are generated.

---

## The model

A small semi-structural quarterly model:

- **IS curve** on the output gap, real rate at lags 1–4
- **Phillips curve** for headline and core CPI, with energy pass-through
- **Trade**, driven by US real imports and the Dallas Fed global activity index
- **Investment** with partial adjustment to the gap, risk premium and FDI
- **Supply**: `Y_pot = TFP · K^0.45 · L^0.55`, with TFP driven by reform stock, infrastructure and human capital
- **Sovereign risk premium**: `0.011 · max(0, debt − 68)^1.75`, plus a credit-rating premium (0 at BBB+, +0.25 at BBB, +0.60 at BBB-, −0.15 at A-)
- **Execution wedge**: appropriated budget is not delivered budget

Data: NESDC quarterly national accounts 1993Q1–2026Q2, TPSO CPI (487 months), BIS household debt, BOT MPC decisions (190 meetings), IMF WEO. The panel validates the model and does not calibrate it. `MODEL.md §1` explains why.

---

## What this is not

A model of a government's choices, not of Thailand. Real cabinets play for the next coalition meeting. You get a four-year horizon and a whip count in advance. Party positions, seat numbers, the February 2026 result and the events are real. The counterfactuals predict nothing.

---

## Building and hacking

```bash
./build.sh                              # the game
npx --prefix engine tsx engine/src/optimise.ts balanced pheuthai
npm --prefix engine run typecheck       # strict tsc, no output
npx --prefix engine tsx scripts/audit_impacts.ts > AUDIT_IMPACTS.md
python3 scripts/catalogue.py > CATALOGUE.md   # after editing config/policies.json or events.json
python3 scripts/build_panel.py          # rebuild the estimation panel
python3 scripts/map/build_map.py        # rebuild config/provinces.json outlines (needs shapely, numpy, npx)
```

Needs Node 20+ and Python 3.10+. The engine has four dev dependencies: esbuild, tsx, TypeScript and the Node type definitions.

**The province map.** Beside the House, every province in plain grey with a one-line description on hover. Colour marks status only: Bangkok in cyan as a special administrative area, joined by the elected-governor pilot provinces once a constitution with that clause is ratified (Chiang Mai, Phuket and Khon Kaen for *adjust*; Chonburi, Rayong, Chiang Mai, Phuket, Nakhon Ratchasima, Khon Kaen, Ayutthaya, Surat Thani, Songkhla and Ubon Ratchathani for *tilt*). The three Cambodian provinces of 1941–46 are in the map data but hidden; any card or news option can set `"territory": {"phra_tabong": "disputed" | "occupied" | "annexed"}`. Open the game with `#mapdemo` to preview all three states.

**The Cambodian war.** Deterministic, and only reachable on purpose. The MOU 2544 event has a revanchist option ("say what the 1941 line means"); a border clash and a rocket strike follow, and at each step the cabinet can stand down. Crossing opens a war panel with three layers, all free to change:
- **Strategy:** mobilisation (6, 9 or 12 brigades; call-ups withdraw 0.3% or 0.6% of labour input from the economy), air campaign (military targets, interdiction, strategic), diplomacy (a Beijing back channel keeps China from arming Cambodia, reassuring Hanoi keeps Vietnam out, engaging ASEAN lowers attention), and a temporary ceasefire.
- **Fronts:** brigades, posture (hold, advance, assault) and reconstruction (aid, martial law, crackdown) for each of the three provinces. Progress depends on brigades, posture, air power and terrain against Cambodian strength, which recovers each quarter, faster if China or Vietnam is arming it. A front left with one brigade or none against a strong enemy is pushed back.
- **International attention** builds with assaults, strategic bombing and crackdowns. Above 40 Brussels suspends the EU FTA (restored only by a benevolent annexation: aid throughout, dissent below 5%); above 60 Vietnam arms Cambodia unless reassured.
- **The war panel** shows a campaign map of the three provinces: each is cut into about 50 cells with a fixed order of capture (distance from the Thai border and from the main roads), so a front at x% holds the x% of cells nearest the border and the roads, with a hatched contested belt beyond the line that widens while Cambodian strength is high. Battambang and Preah Vihear sit at the 60% and 40% gates. The map also has the main roads, nine towns that turn red as they fall, posture arrows and brigade counters at each front's tip, the attention bar with its two thresholds, and the stance of China, Vietnam, ASEAN and the EU. After the war it becomes *The New Provinces*, with dissent against the 10% annexation line and counters for ID cards, schools and clinics. The EU FTA bar sits under the credit ratings.
- **Six decisions** arrive as news, marked as war decisions, each taking an action: the battle for Battambang (Phra Tabong stops at 60% until the city falls: besiege for two quarters or storm it), Preah Vihear (Nakhon Champassak stops at 40%: take the temple or bypass it), the Poipet compounds, refugees at Aranyaprathet, counterattacks, and Phnom Penh's offer of talks (accepting freezes the line for good).
- **Ending:** the war ends when all three provinces are fully held; the annexation bill unlocks below 10% dissent everywhere. At annexation Phibunsongkhram is renamed Sisophon. Held provinces add up to 0.8% to effective labour input, faster with hastened integration.
- **Demography.** A strip under the indicators shows population (the IMF path the headline uses, plus 3.0m once the 1941 provinces are annexed) and the fertility rate: 0.90 in 2026, falling about 0.03 a year, nudged up by hundredths by the maternal grant, free education, village nurses, the negative income tax, Thai Chuay Thai and high approval; annexation lifts the national rate (the provinces are near 2.3). After annexation it also shows GDP per head of the enlarged Kingdom (new provinces start near 2,300 USD and converge); the headline and achievements stay on pre-war borders. Annexation also brings an integration boom in investment, larger with hastened integration.
- **Integration** and **migrant labour** work as before: hastening integration doubles the labour gain; regularising migrant labour before the war ends slows dissent and pays a dividend. The end screen shows the map, with a toggle to lay the Thai flag over the Kingdom.
- Achievements: *1941 Avenged* (rare: annexation) and *Pax Rattanakosin* (legendary: annexation with aid throughout, dissent never at 40%, and talks opened in the Deep South). Any occupation at the end classifies the term as **Irredentist Nationalism**.

**The Deep South.** Bhumjaithai aims for incremental improvement, not a settlement. One card, three options, nothing structural: *small steps* (resume the BRN talks, lift the decree in a few calm districts, pilot bilingual Thai and Patani Malay schooling in Rumi, a Tak Bai compensation fund), *development only*, or *security first*. Small steps bring a Ramadan ceasefire four quarters later, which can be extended (*Step by Step*); security first brings coordinated bombings; development alone brings nothing. Dialogue, the ceasefire and hastened integration of the 1941 provinces all cost Others (the security establishment) opinion.

**Laos.** One card (PM's Office), aimed at Laos's debt crisis and Chinese leverage. The *phi-nong compact* offers a Thai credit line in exchange for the baht as legal tender, an open border with the right to work, and joined grids at fixed baht power prices (US +1, legislation). *Grid, rail and border trade* is the cautious version, and the third option leaves it to EGAT and the banks. Either active option brings Beijing's pushback two quarters later: *stand behind Vientiane* (US +1), *bring Beijing in* to a three-way framework (China +1), or *quietly scale it back* (China +1). A baht zone held against Beijing earns *Phi Nong* (uncommon). Unification is never on the table. There is no war with Laos and no claim on the Lao part of Nakhon Champassak.

**The economic corridors.** Two re-evaluations under Industry replace the creative-economy and heritage-tourism zoning of the regional corridors. The semiconductor card arrives in 2028 Q4. The *Northern Economic Corridor* card appears one quarter after its full programme passes (2029 Q1 at the earliest), and only then. Its full option turns Lamphun and Chiang Mai into a chip-packaging and precision-optics cluster shipping north on the R3A to Kunming (China +1). The *Central-Western Economic Corridor* card appears in 2028 Q2 with no prerequisites. Its full option brings EV components, industrial automation and smart electronics, with Kanchanaburi as a heavy-freight rail hub to Laem Chabang. Each card also has a half-measure and a keep-the-plan option.

**US–China alignment.** Any card or news option that leans one way carries `"align": {"us": n}` or `{"cn": n}`. The points add up in a blue–red bar in the top bar and an end-screen label (Hedging, Leaning US, Aligned with China, Courted by both). The tallies are a record; the effects sit on the options themselves. Two scripted events test it: US tariffs over transshipment (Q6) and a PLA Navy port call at Sattahip (Q10).

Cards and events are JSON in `config/`. A new policy is a JSON object with a channel vector, not a code change.

### Soundtrack

The recording isn't ours to redistribute. The player tries, in order:

1. **`ui/assets/anthem.mp3`**, inlined at build time if present. It is in `.gitignore`, so a clean checkout lacks it.
2. **The YouTube embed** from the rights holder's upload. This is the only network use in the game, and it needs `http(s)`: a `file://` page without the mp3 stays silent.
3. **Nothing.** If the embed fails, the player controls disappear.

The simulation is the same in all three cases.

**Ending themes.** Five revealed ideologies (Big Push, Developmental Statism, Chinese and Authoritarian Developmentalism, Social Democracy) have their own song on the end screen, streamed from YouTube from a set timestamp and looped. It needs `http(s)`. The mp3 build creates a silent YouTube player at the coalition choice so the ending can start inside the End-turn click; if the browser still blocks sound, the theme starts muted and the play button unmutes it.

---

## Licence and data

Code, game content and docs are **MIT**. See `LICENSE`.

The statistics are not MIT: NESDC quarterly national accounts · TPSO consumer price index · Bank of Thailand MPC minutes and policy rate history · BIS credit statistics · IMF World Economic Outlook · Federal Reserve Bank of Dallas global activity index · Stock Exchange of Thailand index history · Election Commission of Thailand, February 2026. Each belongs to its publisher and is redistributed under that publisher's terms. These generally require citing the source and forbid implying endorsement. **`data/README.md` lists every source, what it feeds and what its terms require.** Keep it with the data if you fork.

None of these institutions has reviewed or endorsed this project, and the game's counterfactuals are not theirs. Raw files are in `data/`. The builders that turn them into `config/` are in `scripts/`.
