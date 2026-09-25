/**
 * What kind of government was this, actually?
 *
 * Not a score and not a judgement — a CLASSIFICATION. Parties campaign on
 * labels; cabinets reveal an ideology through four years of budget composition,
 * and the two are frequently unrelated. This reads the revealed one off the
 * stance the player actually accumulated: what they collected, what they spent
 * it on, whether they borrowed for it, and how much of it was rules rather than
 * money.
 *
 * The archetypes are deliberately named after real traditions rather than
 * invented ones, because the point is to hand the player a vocabulary for what
 * they just did — and occasionally to inform them that the thing they thought
 * was pragmatism has a name and a history.
 */

export interface IdeologyInput {
  capitalSpend: number;     // accumulated stance, % of GDP
  transfers: number;
  taxRate: number;          // revenue raised, % of GDP
  govConsumption: number;
  reformStock: number;      // 0-100ish
  fdiSignal: number;
  debtStart: number;        // 64.7
  debtEnd: number;
  primaryBalance: number;
  invRate: number;
  /** A ratified constitution with two or more Singapore-lite positions. */
  singaporeLite?: boolean;
}

export interface Ideology {
  name: string;
  tag: string;              // one-line positioning
  body: string;
  tradition: string;        // the closest recognisable school
}

export function classify(i: IdeologyInput): Ideology {
  const build = i.capitalSpend;                 // ~0 to 1.6
  const give = i.transfers;                     // ~0 to 2.5
  const collect = i.taxRate;                    // ~0 to 2.3
  const reform = i.reformStock;                 // ~5 to 75
  const debtRise = i.debtEnd - i.debtStart;     // negative = deleveraged
  const state = i.govConsumption;

  const BUILDS = build > 0.7, SPENDS = give > 0.9, COLLECTS = collect > 0.8;
  const REFORMS = reform > 55, DELEVERAGED = debtRise < 6, BORROWED = debtRise > 12;

  // --- the pure types, checked most specific first
  // A strong state built on top of a clean one: the constitution says so,
  // and the reform record and the capital budget back it up.
  if (i.singaporeLite && REFORMS && BUILDS) return {
    name: 'Guided Developmentalism',
    tradition: "Singapore's PAP state and Korea under Park: a strong executive, a clean bureaucracy, and a plan",
    tag: 'cleaned the state, then gave it more power',
    body: 'The civil service cut and policed first, then a constitution that lets the executive plan and deliver with fewer checks. Industrial strategy, managed labour, means-tested welfare. It works while the bureaucracy stays clean, and nothing in the new rules guarantees that it will.',
  };

  if (BUILDS && REFORMS && COLLECTS && DELEVERAGED) return {
    name: 'Developmental Statism',
    tradition: 'the East Asian developmental state: Park, Lee, Sarit with better arithmetic',
    tag: 'built it, reformed it, and paid for it from revenue',
    body: 'Public capital at scale, institutions rebuilt underneath, all funded from revenue rather than issuance. A maximally activist state that stays solvent, and a government willing to be disliked in year two for results in year eight.',
  };

  if (BUILDS && BORROWED && !REFORMS) return {
    name: 'Concrete Keynesianism',
    tradition: 'post-war infrastructure Keynesianism, and every Thai government since 2014',
    tag: 'borrowed against the future to pour it into the ground',
    body: 'Demand managed through the capital budget, financed by issuance, supply side untouched. Output responds and ribbons get cut, until disbursement stops. What remains is a compounding debt stock and an unchanged bureaucracy.',
  };

  if (SPENDS && !COLLECTS && BORROWED) return {
    name: 'Deficit Populism',
    tradition: 'Latin American structuralism, and the rice-pledging years',
    tag: 'transfers now, revenue never, arithmetic left to a successor',
    body: 'Household incomes supported directly with no matching revenue, so borrowing closes the gap. Redistributive and popular. But a permanent claim on the budget, funded by a temporary willingness to lend, ends in one place.',
  };

  if (SPENDS && COLLECTS) return {
    name: 'Social Democracy',
    tradition: 'the Nordic settlement: high transfers, high collection, no free lunch',
    tag: 'raised the floor and sent the bill',
    body: 'Transfers expanded and taxes raised to pay for them, in the same parliament. Thailand collects less of GDP than any peer it compares itself to, so this is a bigger departure here than almost anywhere.',
  };

  if (REFORMS && !BUILDS && !SPENDS) return {
    name: 'Institutional Liberalism',
    tradition: 'the Washington-consensus supply side, minus the austerity',
    tag: 'changed the rules rather than the spending',
    body: 'Deregulation, permitting, competition policy, digitisation and legal capacity: the state reorganised, not enlarged. The bet is that transaction costs, not capital, held Thai investment back. The investment rate is the test. Cheap, slow, hard to campaign on.',
  };

  if (COLLECTS && DELEVERAGED && !BUILDS && !SPENDS) return {
    name: 'Fiscal Orthodoxy',
    tradition: 'the German-Dutch school, and the IMF letter every government resents',
    tag: 'fixed the balance sheet and left the rest alone',
    body: 'Revenue raised, spending disciplined, the debt ratio defended. After thirty years of undercollection, a defensible and unglamorous priority. Orthodoxy\'s open question: what was the restored capacity for, and who waited while it was restored?',
  };

  if (BUILDS && REFORMS && BORROWED) return {
    name: 'Big-Push Developmentalism',
    tradition: 'Rosenstein-Rodan, and the Korea of the 1970s',
    tag: 'bet the balance sheet that everything had to happen at once',
    body: 'Infrastructure, institutions and industrial policy at once, financed by borrowing, on the theory that only a coordinated push escapes the trap. It ends in a transformed economy or a debt crisis. Someone else usually decides which.',
  };

  if (BUILDS && !REFORMS && !BORROWED) return {
    name: 'Technocratic Gradualism',
    tradition: 'the Japanese ministries: competent, incremental, unexciting',
    tag: 'delivered the programme it inherited, carefully',
    body: 'Capital spending within the fiscal envelope, with no structural agenda. Administration rather than government: nothing broken, nothing transformed. The successor inherits the same country, with better roads.',
  };

  if (state > 0.35 && !REFORMS) return {
    name: 'Managerial Statism',
    tradition: 'the mid-century administrative state',
    tag: 'grew the apparatus without changing what it does',
    body: 'Government consumption expanded, with more programmes, staff and delivery, and the institutions untouched. The state does more of what it already did. Worth it only if it was good at it. Nobody checked.',
  };

  if (reform < 30 && build < 0.4 && give < 0.5) return {
    name: 'Drift',
    tradition: 'the caretaker tradition, which is older than anyone admits',
    tag: 'held the office and changed very little',
    body: 'No programme is legible in the budget. Events handled, coalition held, term completed, which is a real outcome in Thailand. But 2030 looks like 2026, under the same constraints.',
  };

  return {
    name: 'Pragmatic Centrism',
    tradition: 'the mainstream of every finance ministry in the region',
    tag: 'a bit of everything, committed to nothing',
    body: 'Some capital, some transfers, some reform, nothing pushed far enough to define the term. Most governments behave this way; a six-party coalition produces compromises. The record will be read through the numbers.',
  };
}
