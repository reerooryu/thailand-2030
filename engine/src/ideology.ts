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
  if (BUILDS && REFORMS && COLLECTS && DELEVERAGED) return {
    name: 'Developmental Statism',
    tradition: 'the East Asian developmental state — Park, Lee, Sarit with better arithmetic',
    tag: 'built it, reformed it, and made the country pay for it rather than the bond market',
    body: 'The rarest configuration in the catalogue and the one every finance ministry claims to want: ' +
          'public capital deployed at scale, institutions rebuilt underneath it, and the whole programme ' +
          'funded out of revenue rather than issuance. It is not a centrist position. It is a maximally ' +
          'activist state that happens to be solvent, and it requires a government willing to be disliked ' +
          'in year two for results that arrive in year eight.',
  };

  if (BUILDS && BORROWED && !REFORMS) return {
    name: 'Concrete Keynesianism',
    tradition: 'post-war infrastructure Keynesianism, and every Thai government since 2014',
    tag: 'borrowed against the future to pour it into the ground',
    body: 'Demand management through the capital budget, financed by issuance, with the supply side left ' +
          'largely as it was found. It works — measured output responds, ribbons get cut, the electorate ' +
          'notices — and it stops working the moment disbursement does. The bill is a debt stock that ' +
          'compounds and a bureaucracy no more capable than before.',
  };

  if (SPENDS && !COLLECTS && BORROWED) return {
    name: 'Deficit Populism',
    tradition: 'Latin American structuralism, and the rice-pledging years',
    tag: 'transfers now, revenue never, and the arithmetic left to a successor',
    body: 'Household income supported directly and continuously without a matching revenue base, so the ' +
          'gap is closed by borrowing. Genuinely redistributive and genuinely popular; the objection has ' +
          'never been that the transfers do not reach people, but that a permanent claim on the budget ' +
          'funded by a temporary willingness to lend ends in one place.',
  };

  if (SPENDS && COLLECTS) return {
    name: 'Social Democracy',
    tradition: 'the Nordic settlement — high transfers, high collection, no free lunch',
    tag: 'raised the floor and sent the bill',
    body: 'The honest version of redistribution: transfers expanded and taxes raised to pay for them, in ' +
          'the same parliament, by the same government. Thailand collects a smaller share of GDP than any ' +
          'peer it likes to be compared to, so this is a bigger departure here than it would be almost ' +
          'anywhere else — and it is the only redistributive model that survives contact with a bond desk.',
  };

  if (REFORMS && !BUILDS && !SPENDS) return {
    name: 'Institutional Liberalism',
    tradition: 'the Washington-consensus supply side, minus the austerity',
    tag: 'changed the rules rather than the spending',
    body: 'Deregulation, permitting, competition policy, digitisation and legal capacity — the state ' +
          'reorganised rather than enlarged. The theory is that Thai investment has been constrained by ' +
          'transaction costs and legal uncertainty rather than by capital, and the investment rate is the ' +
          'test of it. Cheap, slow, and almost impossible to campaign on.',
  };

  if (COLLECTS && DELEVERAGED && !BUILDS && !SPENDS) return {
    name: 'Fiscal Orthodoxy',
    tradition: 'the German-Dutch school, and the IMF letter every government resents',
    tag: 'fixed the balance sheet and left the rest alone',
    body: 'Revenue raised, spending disciplined, the debt ratio defended. In a country that has been ' +
          'undercollecting for thirty years this is a defensible priority and an unglamorous one. The ' +
          'open question is the one orthodoxy never answers well: what the restored capacity was ' +
          'restored for, and who was asked to wait while it was.',
  };

  if (BUILDS && REFORMS && BORROWED) return {
    name: 'Big-Push Developmentalism',
    tradition: 'Rosenstein-Rodan, and the Korea of the 1970s',
    tag: 'bet the balance sheet that everything had to happen at once',
    body: 'Infrastructure, institutions and industrial policy pursued simultaneously and financed by ' +
          'borrowing, on the theory that a developing economy escapes its trap only through a coordinated ' +
          'push too large to fund out of current revenue. Historically this either compounds into a ' +
          'transformed economy or into a debt crisis, and which one it becomes is usually decided by ' +
          'somebody else, later.',
  };

  if (BUILDS && !REFORMS && !BORROWED) return {
    name: 'Technocratic Gradualism',
    tradition: 'the Japanese ministries — competent, incremental, unexciting',
    tag: 'delivered the programme it inherited, carefully',
    body: 'Capital spending executed within the fiscal envelope, without a structural agenda attached. ' +
          'A government that administers rather than governs: nothing broken, nothing transformed, and a ' +
          'successor who inherits exactly the country this one did, with better roads.',
  };

  if (state > 0.35 && !REFORMS) return {
    name: 'Managerial Statism',
    tradition: 'the mid-century administrative state',
    tag: 'grew the apparatus without changing what it does',
    body: 'Government consumption expanded — more programmes, more staff, more delivery — with the ' +
          'underlying institutions untouched. The state does more of what it already did. Whether that ' +
          'is worth the money depends entirely on how good it was at doing it, which is a question this ' +
          'government did not ask.',
  };

  if (reform < 30 && build < 0.4 && give < 0.5) return {
    name: 'Drift',
    tradition: 'the caretaker tradition, which is longer than anyone admits',
    tag: 'held the office and changed very little',
    body: 'No consistent programme is legible in the budget composition. Events were handled, the ' +
          'coalition was maintained, the term was completed. That is not nothing — a Thai government ' +
          'finishing its term is a real outcome — but the country in 2030 is essentially the country of ' +
          '2026, and the constraints that bound it then bind it still.',
  };

  return {
    name: 'Pragmatic Centrism',
    tradition: 'the mainstream of every finance ministry in the region',
    tag: 'a bit of everything, committed to nothing',
    body: 'Some capital, some transfers, some reform, no single instrument pushed far enough to define ' +
          'the term. This is how most governments actually behave and it is not a criticism — a coalition ' +
          'of six parties is a machine for producing compromises. It does mean the record will be read ' +
          'through the numbers rather than through the intention, because there is no intention on the ' +
          'page to read it through.',
  };
}
