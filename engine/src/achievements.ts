/**
 * End-of-term achievements.
 *
 * These are not a scoring system — the four scores already exist and are
 * deliberately in tension. Achievements do a different job: they name a
 * STRATEGY, so a player who stumbled into one can see they were playing a
 * recognisable game, and a player who missed one by a hair can see exactly
 * which line would have got it. Every locked achievement is a hint at a run
 * you have not played yet.
 *
 * Each is a pure predicate over the finished term. Nothing here feeds back
 * into the model.
 */

export interface AchievementContext {
  headline: number;
  potentialGrowth: number;
  realGrowth: number;          // annualised over the term, %
  invRate: number;
  debtGdp: number;
  ceiling: number;
  approval: number;
  set: number;
  setChange: number;
  reformStock: number;
  riskPremium: number;
  gap: number;
  primaryBalance: number;
  hhDebt: number;             // household credit, % of GDP
  flags: Set<string>;
  opinion: Record<string, number>;
  fell: boolean;
  playerSeats: number;
  coalitionAfter: string[] | null;
  verdict: string;
  maximalPlays: number;      // cards enacted at full scope
  hedgedPlays: number;       // cards enacted on a pilot, a phase-in or a half
  proposalsFull: number;     // partner bills enacted at full scope
  proposalsSeen: number;     // partner bills that reached the desk at all
}

export interface Achievement {
  id: string;
  name: string;
  requirement: string;         // shown whether or not it was earned
  flavour: string;             // shown only once earned
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  test: (c: AchievementContext) => boolean;
}

const has = (c: AchievementContext, f: string) => c.flags.has(f);

/** Compare at the precision the END SCREEN PRINTS, not at full float precision.
 *  Potential growth of 2.9996 renders as "3.00" and then fails a `> 3` test,
 *  which reads to the player as the game lying to them — it happened in
 *  playtesting and it is indefensible. Every numeric threshold below is
 *  therefore evaluated against the rounded, displayed value, so what you see on
 *  the screen is what the achievement sees. */
const atLeast = (v: number, t: number, dp = 2) => Number(v.toFixed(dp)) >= t;
const atMost  = (v: number, t: number, dp = 2) => Number(v.toFixed(dp)) <= t;

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'thailand_number_one',
    name: 'Thailand Number One!',
    requirement: 'Real growth above 3%, potential growth above 3%, private investment above 20% and the SET above 2,500.',
    flavour: 'Every dial pointing the right way at once, which has not happened to this economy since the ' +
             'nineties. The cycle and the supply side improving together is the combination Thai policy has ' +
             'been chasing, unsuccessfully, for a quarter of a century.',
    rarity: 'legendary',
    test: c => atLeast(c.realGrowth, 3) && atLeast(c.potentialGrowth, 3) &&
               atLeast(c.invRate, 20, 1) && atLeast(c.set, 2500, 0),
  },
  {
    id: 'five_figures',
    name: 'Into Five Figures',
    requirement: 'Finish the term above USD 10,000 of GDP per capita.',
    flavour: 'Ten thousand dollars a head. Thailand reached upper-middle income in 2011 and has climbed the ' +
             'same slope ever since; this pulls several years of it forward. It takes an economy run hot and a ' +
             'balance sheet spent to the limit, so read the output gap before celebrating — some of this is ' +
             'borrowed from a decade that has not arrived.',
    rarity: 'legendary',
    // Verified reachable, and only just: the optimiser's best lines are 10,034
    // (Pheu Thai) and 10,027 (Democrat), against 9,701 for the conservative
    // coalition, which cannot do it at all. It is a frontier rather than a
    // target, and it is deliberately in tension with Sufficiency Economy —
    // there is no route to five figures that leaves the ceiling where it was.
    test: c => atLeast(c.headline, 10000, 0),
  },
  {
    id: 'sufficiency_economy',
    name: 'Sufficiency Economy',
    requirement: 'Complete the term without raising the debt ceiling — and finish inside it.',
    flavour: 'Seventy per cent was the line, and the government finished under it without once asking ' +
             'parliament to move it. The philosophy it is named after is about moderation and resilience ' +
             'rather than restraint for its own sake — whether this term honoured that or simply underspent ' +
             'depends on what was built with the room.',
    rarity: 'uncommon',
    // Declining to raise the ceiling is not the same as respecting it. A term
    // that left the limit at 70 and finished at 79 did not practise restraint,
    // it just never legislated the number it was ignoring.
    test: c => !has(c, 'debt_ceiling_raised') && !has(c, 'debt_ceiling_raised_again') &&
               atMost(c.debtGdp, c.ceiling, 1) && !c.fell,
  },
  {
    id: 'said_and_done',
    name: 'Said and Done!',
    requirement: 'Face down the southern provinces and force the Land Bridge through, fund U-Tapao to ' +
                 'specification, accelerate the Northeast high-speed line, keep the Three-Airport Link ' +
                 'alive, order both reactors, launch the semiconductor programme — and win the 2030 ' +
                 'election.',
    flavour: 'Everything announced, everything built, everything defended at the ballot box. The rarest ' +
             'thing in Thai infrastructure is not the funding or the engineering, it is a government that ' +
             'is still there when the ribbon is cut.',
    rarity: 'legendary',
    // `land_bridge_forced` rather than merely `land_bridge_committed`: announcing
    // the project in the last quarter of the term sets the commitment flag but
    // outruns the protest, which is not forcing anything through. The land
    // seizures have to have happened, and been faced.
    test: c => has(c, 'land_bridge_forced') && has(c, 'utapao_restored') && has(c, 'smr_both_units') &&
               has(c, 'semiconductor_programme') &&
               has(c, 'hsr_northeast_accelerated') && has(c, 'eastern_hsr_proceeding') && !c.fell &&
               (c.verdict === 'returned' || c.verdict === 'landslide'),
  },
  {
    id: 'horse_before_cart',
    name: 'Horse before the Cart',
    requirement: 'Complete the full civil service programme and the full justice reform with real ' +
                 'anti-corruption enforcement, then finish inside your debt ceiling with a risk premium ' +
                 'under 0.25pp, a primary deficit no worse than 5% of GDP, and a reform stock above 60.',
    flavour: 'Institutions before concrete, and paid for rather than borrowed against. An early-retirement ' +
             'programme nobody photographs, a prosecution service that can act without a police referral, ' +
             'investigation separated from arrest, and a balance sheet handed over with the line still meaning ' +
             'what it says. Thailand has never lacked the money to build things. It has lacked a state capable ' +
             'of building them well.',
    rarity: 'legendary',
    // Deliberately does NOT forbid megaprojects. The point is sequencing, not
    // abstinence — build whatever you can afford once the machinery works. The
    // ceiling test uses whatever ceiling you legislated, so raising it to 78 and
    // finishing at 71 counts; scraping inside a raised ceiling at 84 does not,
    // because the risk premium will have priced it.
    test: c => has(c, 'civil_service_shrinking') &&
               has(c, 'zero_corruption_act') && has(c, 'anticorruption_enforcement') &&
               has(c, 'justice_reform_done') &&
               atMost(c.debtGdp, c.ceiling, 1) && atMost(c.riskPremium, 0.25) &&
               atLeast(c.primaryBalance, -5.0) && atLeast(c.reformStock, 60, 1) && !c.fell,
  },
  {
    id: 'unlikely_reconciliation',
    name: 'Unlikely Reconciliation',
    requirement: "Bring the People's Party into your coalition after the 2030 election.",
    flavour: 'Four years ago they would not have taken the phone call. A working arrangement with the party ' +
             'whose entire programme is that governments like this one should not exist is not a negotiation ' +
             'outcome. It is an admission, by both sides, that the arithmetic changed.',
    rarity: 'legendary',
    test: c => !!c.coalitionAfter?.includes("People's"),
  },
  {
    id: 'vicious_cycle',
    name: 'Vicious Cycle',
    requirement: 'Call a coalition partner\'s bluff and lose the government.',
    flavour: 'They were not bluffing. Thai governments almost never fall on policy and almost always fall on ' +
             'arithmetic, and the arithmetic had been visible for quarters.',
    rarity: 'uncommon',
    test: c => has(c, 'called_the_bluff') && c.fell,
  },
  {
    id: 'bhumjai_rak_thai',
    name: 'Bhumjai — Rak Thai',
    requirement: 'Win more than 300 seats in the 2030 election.',
    flavour: 'The last party to do this was Thai Rak Thai in 2005, and it did it on a national vote share ' +
             'Bhumjaithai has never come close to. A provincial machine converting at this rate is a ' +
             'realignment, and realignments are usually named after the party that ends them.',
    rarity: 'rare',
    test: c => c.playerSeats > 300,
  },
  {
    id: 'th_ai_land',
    name: 'TH-AI-land',
    requirement: 'Chart a sovereign AI course, redirect the TH-AI Passport to domestic capacity, ' +
                 'and fund the semiconductor programme.',
    flavour: 'A national compute programme, a domestic talent pipeline and a chip industry, assembled by ' +
             'a country that cannot buy the accelerators. Magnificent, coherent, and entirely dependent on ' +
             'somebody eventually selling you the one input you decided not to ask for.',
    rarity: 'rare',
    test: c => has(c, 'sovereign_ai') && has(c, 'domestic_ai_capacity') && has(c, 'semiconductor_programme'),
  },

  // ---- a few more, to give the locked list something to argue with

  {
    id: 'to_the_moon',
    name: 'To the Moon',
    requirement: 'Finish with the SET above 2,700.',
    flavour: 'Thai equities spent a decade as the cheapest way to express doubt about Thai growth. Foreign ' +
             'institutional money came back, and came back on a story about capacity rather than a quarter of ' +
             'earnings. Whether it stays is a question for a government that has not been elected yet.',
    rarity: 'rare',
    test: c => atLeast(c.set, 2700, 0),
  },
  {
    id: 'the_quiet_part',
    name: 'The Quiet Part',
    requirement: 'Finish with potential growth above 3% and approval below 45%.',
    flavour: 'You fixed the supply side and nobody thanked you for it. This is what structural reform ' +
             'actually looks like from the inside, and it is why so little of it gets done.',
    rarity: 'rare',
    test: c => atLeast(c.potentialGrowth, 3) && c.approval < 45 && !c.fell,
  },
  {
    id: 'revenue_state',
    name: 'A Revenue State at Last',
    requirement: 'Raise VAT and pass the full Revenue Mobilisation Package in the same term.',
    flavour: 'Thailand has collected a smaller share of GDP than every peer it likes to be compared to, for ' +
             'decades, and every government has known it. Two tax rises in one parliament is not a feat of ' +
             'policy. It is a feat of politics.',
    rarity: 'uncommon',
    test: c => has(c, 'vat_raised') && has(c, 'revenue_package_done'),
  },
  {
    id: 'grey_capital',
    name: 'Dissolving Grey Capital',
    requirement: 'Pass the Zero Corruption Act, justice system reform and land titling in one term.',
    flavour: 'Enforcement with teeth, investigation separated from arrest, and twenty-two million rai ' +
             'converted from possession into property. The three reforms that attack the informal economy ' +
             'at its root, passed by a government that needed the establishment to keep functioning.',
    rarity: 'rare',
    test: c => has(c, 'zero_corruption_act') && has(c, 'justice_reform_done') && has(c, 'land_titled'),
  },
  {
    id: 'concrete_and_nothing_else',
    name: 'Concrete and Nothing Else',
    requirement: 'Finish with a primary deficit worse than 3% of GDP and a reform stock below 40.',
    flavour: 'Four years, a great deal of money, and a country that is exactly as capable of growing as ' +
             'it was in 2026. Every ribbon was cut. Nothing underneath them changed.',
    rarity: 'common',
    test: c => atMost(c.primaryBalance, -3) && atMost(c.reformStock, 40, 1),
  },
  {
    id: 'people_pleaser',
    name: 'People Pleaser',
    requirement: 'Enact every bill your coalition partners bring to the desk, at full scope, and let none ' +
                 'of them lapse.',
    flavour: 'Not one partner manifesto declined, deferred, piloted or left to expire. Junior coalition ' +
             'parties in Thailand do not usually get their bills passed; they get them acknowledged, costed, ' +
             'sent to committee and forgotten, which is why being ignored costs a party more than being ' +
             'outvoted. This cabinet said yes to all of it, and the deficit shows where the yes came from.',
    rarity: 'rare',
    // Deliberately demands the FULL option, not merely passage. A partner bill
    // taken as a pilot is the classic Thai coalition compromise — the ally can
    // claim the win, the treasury pays a third of it, and nothing is settled.
    // The denominator is coalition-dependent — Others always brings three bills,
    // and each partner adds two or three more — so the test is "all of them",
    // floored at four, which is the smallest desk any coalition produces.
    test: c => c.proposalsSeen >= 4 && c.proposalsFull >= c.proposalsSeen,
  },
  {
    id: 'i_am_the_senate',
    name: 'I am the Senate',
    requirement: 'Enact at least twelve bills and never once take a pilot, a phase-in or a partial ' +
                 'option — every card played at its maximum.',
    flavour: 'Twelve bills and not a single hedge. No study phase, no attrition route, no excise-only ' +
             'compromise, no targeted version of a universal programme. The middle setting is where ' +
             'governments go to survive a coalition, and a term without one is either total command of the ' +
             'House or a whip operation running on borrowed goodwill. The two look identical until they do ' +
             'not.',
    rarity: 'legendary',
    test: c => c.maximalPlays >= 12 && c.hedgedPlays === 0 && !c.fell,
  },
  {
    id: 'task_failed_successfully',
    name: 'Task Failed Successfully',
    requirement: 'Finish above 80% approval with a sovereign risk premium above 1pp — which takes a debt ' +
                 'ratio north of 81% of GDP however high you legislated the ceiling.',
    flavour: 'Adored, and insolvent. Every baht went somewhere the electorate could see, and the bond market ' +
             'charged the next government for it. The uncomfortable part is that this is not a failure of ' +
             'politics — it is politics working exactly as designed, on a four-year horizon, against a balance ' +
             'sheet that runs on a thirty-year one.',
    rarity: 'rare',
    // Priced off the premium rather than off the ceiling, because the ceiling is
    // a number the player legislates and the premium is one the market charges.
    // A cabinet that raised the limit to 85 and then borrowed to 84 has not
    // stayed disciplined — it has moved the goalposts, and the spread knows.
    test: c => c.approval >= 80 && atLeast(c.riskPremium, 1.0),
  },
  {
    id: 'short_of_the_number',
    name: 'Nine Thousand and Change',
    requirement: "Finish ahead of the IMF's 9,092 baseline — and short of the 15,000 you promised.",
    flavour: 'Beating the Fund\'s projection for Thailand is a real result, and one most governments of the ' +
             'last decade did not manage. Reaching fifteen thousand was never possible, because fifteen ' +
             'thousand was not a forecast — it was a campaign. Nobody costed it. The gap between the two ' +
             'numbers is the distance between what a government can do in four years and what it has to say to ' +
             'be given them.',
    rarity: 'common',
    // The promise cannot be met — the ceiling on this model is somewhere under
    // 10,000 — so the earned condition is really the baseline. That is
    // deliberate: the first thing a new player should learn is which of the two
    // numbers on the prologue screen was ever real.
    test: c => atLeast(c.headline, 9092, 0) && c.headline < 15000,
  },
  {
    id: 'room_to_cut',
    name: 'Room to Cut',
    requirement: 'Finish with household debt below 80% of GDP.',
    flavour: 'Thai household debt is why a rate cut here does less than a rate cut anywhere else: bank lending ' +
             'is the dominant channel of transmission, and at 87.5% of GDP the banks tighten against bad loans ' +
             'instead of passing the cut on. Below eighty, most of it comes back — a central bank with working ' +
             'ammunition, for a crisis that has not happened yet, under a government that has not been ' +
             'elected. There is no constituency for it and no headline in it.',
    rarity: 'uncommon',
    test: c => atMost(c.hhDebt, 80, 1) && !c.fell,
  },
  {
    id: 'patriot',
    name: 'Patriot',
    requirement: 'Pass the Zero Corruption Act with real enforcement, separate investigation from arrest ' +
                 'nationwide — and then refuse the networks when they come for the files.',
    flavour: 'Stand up to them.',
    rarity: 'legendary',
    test: c => has(c, 'patriot') && !c.fell,
  },
  {
    id: 'ecological_revolution',
    name: 'Ecological Revolution',
    requirement: 'Take the renewables pathway in the Power Development Plan, fund the 14th Plan energy ' +
                 'transition in full, and order both reactors with a regulator behind them.',
    flavour: 'The only supply pathway that reaches net zero without betting on carbon capture, the grid ' +
             'rebuild that variable generation actually requires, and two reactors for the baseload wind and ' +
             'solar cannot carry. It is a coalition of people who do not like each other: the renewables lobby ' +
             'has spent twenty years arguing nuclear is unnecessary, and the nuclear engineers twenty years ' +
             'arguing renewables are unserious. None of it generates a kilowatt before 2037. All of it had to ' +
             'be decided now.',
    rarity: 'uncommon',
    // `energy_transition_funded` is strictly implied by ordering the reactors,
    // since the SMR card only enters the deck once the 14th Plan is funded in
    // full. It is tested anyway so the requirement line reads as the three
    // decisions the player actually made rather than two of them and an
    // invisible precondition.
    test: c => has(c, 'pdp_renewables') && has(c, 'energy_transition_funded') &&
               has(c, 'smr_both_units'),
  },
  {
    id: 'winter_is_coming',
    name: 'Winter Is Coming',
    requirement: 'Complete the term without touching the ageing agenda at all.',
    flavour: 'Thailand became an aged society in 2024 and is super-aged by 2033 — 18.4 million people over ' +
             'sixty, outnumbering every child in the country. That date does not move, does not negotiate and ' +
             'does not care which coalition is sitting. Nobody was ever going to force the issue: a ' +
             'demographic transition has no protest, no bond spread and no by-election.',
    rarity: 'common',
    // Only the first card is tested: the other two require it, so a term that
    // never opened the chain never had the option of finishing it.
    test: c => !has(c, 'senior_plus_1') && !c.fell,
  },
  {
    id: 'bond_vigilantes',
    name: 'The Bond Market Votes Too',
    requirement: 'Finish more than 5 points above your debt ceiling.',
    flavour: 'The risk premium is not a punishment. It is the price at which people who have read the budget ' +
             'will still lend, and every point of it is charged to the next government and to every firm ' +
             'borrowing alongside it.',
    rarity: 'common',
    test: c => atLeast(c.debtGdp, c.ceiling + 5, 1),
  },
];

export function evaluate(c: AchievementContext) {
  return ACHIEVEMENTS.map(a => ({ ...a, earned: (() => { try { return a.test(c); } catch { return false; } })() }));
}
