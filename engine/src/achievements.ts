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
    flavour: 'Every dial pointing up at once, for the first time since the nineties. Thai policy has chased this for a quarter of a century.',
    rarity: 'legendary',
    test: c => atLeast(c.realGrowth, 3) && atLeast(c.potentialGrowth, 3) &&
               atLeast(c.invRate, 20, 1) && atLeast(c.set, 2500, 0),
  },
  {
    id: 'five_figures',
    name: 'Into Five Figures',
    requirement: 'Finish the term above USD 10,000 of GDP per capita.',
    flavour: 'Ten thousand dollars a head, years ahead of the trend since 2011. Check the output gap: some of it is borrowed from the next decade.',
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
    requirement: 'Complete the term without raising the debt ceiling, and finish inside it.',
    flavour: 'Seventy per cent was the line, and it held without a vote to move it. Moderation, or underspending? Depends what was built.',
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
    requirement: 'Force the Land Bridge through the southern protests, fund U-Tapao to specification, accelerate the Northeast high-speed line, keep the Three-Airport Link alive, order both reactors, launch the semiconductor programme, and win the 2030 election.',
    flavour: 'Announced, built, and defended at the ballot box. Thai governments rarely last until the ribbon is cut. This one did.',
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
    requirement: 'Complete civil service and justice reform in full, with anti-corruption enforcement; finish inside your debt ceiling with risk premium under 0.25pp, primary deficit no worse than 5% of GDP, reform stock above 60.',
    flavour: 'Institutions first, concrete second, paid for. Thailand never lacked money to build things. It lacked a state that could build them well.',
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
    requirement: 'Bring the People\'s Party into your coalition after the 2030 election.',
    flavour: 'Four years ago they would not take the call. Both sides can count.',
    rarity: 'legendary',
    test: c => !!c.coalitionAfter?.includes("People's"),
  },
  {
    id: 'vicious_cycle',
    name: 'Vicious Cycle',
    requirement: 'Call a coalition partner\'s bluff and lose the government.',
    flavour: 'They were not bluffing. Thai governments fall on arithmetic, and the arithmetic was visible for quarters.',
    rarity: 'uncommon',
    test: c => has(c, 'called_the_bluff') && c.fell,
  },
  {
    id: 'bhumjai_rak_thai',
    name: 'Bhumjai — Rak Thai',
    requirement: 'Win more than 300 seats in the 2030 election.',
    flavour: 'Thai Rak Thai did it in 2005, on a vote share Bhumjaithai never came near. This is a realignment.',
    rarity: 'rare',
    test: c => c.playerSeats > 300,
  },
  {
    id: 'th_ai_land',
    name: 'TH-AI-land',
    requirement: 'Chart a sovereign AI course, redirect the TH-AI Passport to domestic capacity, and fund the semiconductor programme.',
    flavour: 'Compute, talent and chips, built by a country that cannot buy the accelerators. Magnificent, until someone stops selling.',
    rarity: 'rare',
    test: c => has(c, 'sovereign_ai') && has(c, 'domestic_ai_capacity') && has(c, 'semiconductor_programme'),
  },

  // ---- a few more, to give the locked list something to argue with

  {
    id: 'to_the_moon',
    name: 'To the Moon',
    requirement: 'Finish with the SET above 2,700.',
    flavour: 'For a decade Thai equities were the cheapest bet against Thai growth. Foreign money is back. Whether it stays is the next government\'s problem.',
    rarity: 'rare',
    test: c => atLeast(c.set, 2700, 0),
  },
  {
    id: 'the_quiet_part',
    name: 'The Quiet Part',
    requirement: 'Finish with potential growth above 3% and approval below 45%.',
    flavour: 'You fixed the supply side and nobody thanked you. That is why so little of it gets done.',
    rarity: 'rare',
    test: c => atLeast(c.potentialGrowth, 3) && c.approval < 45 && !c.fell,
  },
  {
    id: 'revenue_state',
    name: 'A Revenue State at Last',
    requirement: 'Raise VAT and pass the full Revenue Mobilisation Package in the same term.',
    flavour: 'Thailand collects less of GDP than any peer it likes to be compared to. Two tax rises in one parliament. A feat of politics.',
    rarity: 'uncommon',
    test: c => has(c, 'vat_raised') && has(c, 'revenue_package_done'),
  },
  {
    id: 'grey_capital',
    name: 'Dissolving Grey Capital',
    requirement: 'Pass the Zero Corruption Act, justice system reform and land titling in one term.',
    flavour: 'Enforcement with teeth, investigation split from arrest, and twenty-two million rai turned from possession into property. The informal economy felt that.',
    rarity: 'rare',
    test: c => has(c, 'zero_corruption_act') && has(c, 'justice_reform_done') && has(c, 'land_titled'),
  },
  {
    id: 'concrete_and_nothing_else',
    name: 'Concrete and Nothing Else',
    requirement: 'Finish with a primary deficit worse than 3% of GDP and a reform stock below 40.',
    flavour: 'Four years, a lot of money, and a country no more able to grow than in 2026. Every ribbon cut. Nothing underneath changed.',
    rarity: 'common',
    test: c => atMost(c.primaryBalance, -3) && atMost(c.reformStock, 40, 1),
  },
  {
    id: 'people_pleaser',
    name: 'People Pleaser',
    requirement: 'Enact every bill your coalition partners bring to the desk at full scope, and let none lapse.',
    flavour: 'Junior partners usually get their bills costed, sent to committee and forgotten. This cabinet said yes to everything. Check the deficit.',
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
    requirement: 'Enact at least twelve bills, every one at its maximum: never a pilot, phase-in or partial option.',
    flavour: 'No study phase, no compromise, no targeted version. Total command of the House, or a whip running on borrowed goodwill.',
    rarity: 'legendary',
    test: c => c.maximalPlays >= 12 && c.hedgedPlays === 0 && !c.fell,
  },
  {
    id: 'task_failed_successfully',
    name: 'Task Failed Successfully',
    requirement: 'Finish above 80% approval with a sovereign risk premium above 1pp. That takes debt above 81% of GDP, whatever ceiling you legislated.',
    flavour: 'Adored, and insolvent. Every baht went where voters could see it, and the bond market billed the next government.',
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
    requirement: 'Finish ahead of the IMF\'s 9,092 baseline, and short of the 15,000 you promised.',
    flavour: 'Beating the IMF\'s projection is a real result. Fifteen thousand was never a forecast. It was a campaign.',
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
    flavour: 'At 87.5% of GDP, banks tighten against bad loans instead of passing rate cuts on. Below eighty, monetary policy works again. No votes in it.',
    rarity: 'uncommon',
    test: c => atMost(c.hhDebt, 80, 1) && !c.fell,
  },
  {
    id: 'patriot',
    name: 'Patriot',
    requirement: 'Pass the Zero Corruption Act with real enforcement, separate investigation from arrest ' +
                 'nationwide — and then refuse the networks when they come for the files, whatever it costs your party.',
    flavour: 'Stand up to them.',
    rarity: 'legendary',
    test: c => has(c, 'patriot') && !c.fell,
  },
  {
    id: 'ecological_revolution',
    name: 'Ecological Revolution',
    requirement: 'Take the renewables pathway in the Power Development Plan, fund the 14th Plan energy transition in full, and order both reactors with a regulator behind them.',
    flavour: 'Net zero without betting on carbon capture, a rebuilt grid, and reactors for baseload. Not a kilowatt before 2037. All decided now.',
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
    flavour: 'Super-aged by 2033: 18.4 million over sixty, more than every child in the country. Demographics hold no protests and call no by-elections.',
    rarity: 'common',
    // Only the first card is tested: the other two require it, so a term that
    // never opened the chain never had the option of finishing it.
    test: c => !has(c, 'senior_plus_1') && !c.fell,
  },
  {
    id: 'bond_vigilantes',
    name: 'The Bond Market Votes Too',
    requirement: 'Finish more than 5 points above your debt ceiling.',
    flavour: 'The risk premium is the price lenders charge after reading the budget. The next government pays it, and so does every firm borrowing alongside.',
    rarity: 'common',
    test: c => atLeast(c.debtGdp, c.ceiling + 5, 1),
  },
];

export function evaluate(c: AchievementContext) {
  return ACHIEVEMENTS.map(a => ({ ...a, earned: (() => { try { return a.test(c); } catch { return false; } })() }));
}
