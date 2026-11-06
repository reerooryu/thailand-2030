/**
 * The 2030 general election.
 *
 * The House elected in February 2026 expires four years later, so the term ends
 * in 2030Q1 and the game ends at the count — not in December 2030. The promise
 * the government made was dated December 2030, which means it can only ever be
 * judged on that promise by winning again. That tension is the point.
 *
 * The count is run seat by seat on the real February 2026 result: 400
 * constituencies, every candidate (config/election_2026.json, built from the
 * ECT's Form สส.6/1 announcements by scripts/build_election.py), and the
 * certified national party-list vote.
 *
 *   1. The term becomes a SWING INDEX, in seat units, from the same three things
 *      as before: approval (convex, and asymmetric — +95 at most, -125 with no
 *      floor), the economy voters felt (GDP per head against the IMF baseline,
 *      growth against trend), and the record (potential growth, the SET,
 *      investment, reform stock), which counts only above 60% approval.
 *   2. The index becomes a shift in each party's vote. Bhumjaithai moves with
 *      it in full; partners move with a fraction of it, plus or minus how they
 *      were treated; when the government loses, the hostile opposition gains
 *      most. Shifts are proportional (log-share): a party that barely stood in
 *      a seat cannot gain or lose much there.
 *   3. A few things the government did land in particular regions: the
 *      Northeast railway and the Korat Expo in Isan, the Bangkok lines, a won
 *      war on the border, peace or force in the Deep South. They are small, and
 *      the national swing does most of the work.
 *   4. Every constituency goes to whoever leads after the shift. The list seats
 *      follow the national list vote by largest remainder, counted as a change
 *      on the certified 2026 allocation so that no swing reproduces 2026.
 *   5. A ratified constitution changes the map before the count: fewer
 *      constituencies when list seats rise, multi-member districts of up to
 *      three seats under block voting, where the party ahead takes the slate.
 *      Annexed provinces get seats, taken from the most over-represented
 *      provinces so the House stays at 500.
 *
 * Bhumjaithai's machine shows up on its own: it took 173 constituencies on 31%
 * of the constituency vote and 18% of the list. Many of those seats are narrow,
 * so they compound with the mood and collapse without it. People's is the
 * mirror image: a big list vote that no bad campaign takes away, and urban
 * seats piled up with large majorities.
 */

import { DATA } from './gen/data.js';

export interface ElectionInput {
  seats: Record<string, number>;      // the House AT DISSOLUTION, after any defections
  /** The February 2026 result. Distinct from `seats` as soon as members change
   *  party mid-term: the count is fought from the House you actually hold, but
   *  every comparison a reader makes is against the election before it. */
  seatsAt2026?: Record<string, number>;
  coalition: string[];                // parties in government at dissolution
  opinion: Record<string, number>;    // relations at dissolution
  approval: number;
  headline: number;                   // USD per capita at dissolution
  baseline: number;                   // the IMF projection (IMF_BASELINE_2030 at the count)
  realGrowth: number;                 // annualised over the term, %
  /** The record, for the rare term that is not merely popular but visibly
   *  transformative. Deliberately gated — see the record term below. */
  potentialGrowth?: number;
  setChange?: number;                 // % change in the SET over the term
  invRate?: number;                   // private investment, % of GDP, at the end
  reformStock?: number;
  debtGdp?: number;
  ceiling?: number;
  /** The provincial organisation stopped working for you. Set by refusing the
   *  networks after the prosecution service reached your own members. */
  machineBroken?: boolean;
  /** Party finance enforced: dues and branches decide the subsidy, branches are
   *  audited, constituency spending is capped. */
  partySystemReformed?: boolean;
  /** Party-list seats under the constitution in force: 100, or 110/125 after reform. */
  listSeats?: number;
  /** Multi-member, winner-takes-all constituencies: machines win slates. */
  blockVote?: boolean;
  /** Flags set during the term, for the regional effects. */
  flags?: string[];
  /** Annexed 1941 provinces voting in this election, with occupation dissent (%). */
  annexed?: Record<string, number>;
}

export interface PartyResult {
  /** `origin` is February 2026, `before` is the House at dissolution, and they
   *  differ by however many members walked. `change` is measured against 2026,
   *  because that is the election this one is compared to. */
  party: string; origin: number; before: number; after: number; change: number;
  inGov: boolean; willJoin: boolean; reason: string;
  /** Constituency and list seats in 2030. */
  cons?: number; list?: number;
}

/** One province on the election map. */
export interface ProvinceResult {
  seats: Record<string, number>;      // constituency seats, 2030
  seats2026: Record<string, number>;  // constituency seats, 2026 (empty for annexed provinces)
  share: Record<string, number>;      // constituency vote, % (Others = best small-party candidates)
  share2026: Record<string, number>;
  districts: number;                  // districts after any redistricting
  annexed?: boolean;
}

export interface ElectionResult {
  results: PartyResult[];
  swing: number;                      // the swing index, in seat units
  playerSeats: number;
  bestCoalition: string[] | null;     // largest workable government, or null
  bestSeats: number;
  majority: number;
  verdict: 'landslide' | 'returned' | 'hung' | 'defeated';
  headline: string;
  detail: string;
  /** National vote, %: list and constituency, 2026 and 2030. */
  vote: { list: Record<string, number>; list2026: Record<string, number>;
          cons: Record<string, number>; cons2026: Record<string, number> };
  /** The map: every province, and any annexed one. */
  provinces: Record<string, ProvinceResult>;
  system: { constituencies: number; list: number; blockVote: boolean };
  /** Every 2026 constituency, keyed 'province-number': who took the seat it
   *  became in 2030 and who held it in 2026, the 2030 and 2026 vote (% by
   *  party, in PARTIES order), and the other 2026 districts it was merged with. */
  districts: Record<string, { w: number; w26: number; v: number[]; v26: number[]; with?: string[] }>;
  /** List seats by party, 2030 and 2026. */
  listSeats: { y2030: Record<string, number>; y2026: Record<string, number> };
}

const MAJORITY = 251;
const PLAYER = 'Bhumjaithai';
export const PARTIES = ['Bhumjaithai', "People's", 'Pheu Thai', 'Kla Tham', 'Democrat', 'Others'];
const B = 0, OTH = 5;

interface District { p: string; r: string; n: number; e: number; c: number[]; l: number[]; }
const EL: { districts: District[]; list2026: [string, string, number][];
            listSeats2026: Record<string, number> } = (DATA as any).election;

/* ---- tuning. Calibrated so typical terms land where the old national model
   put them; checked by scripts/election_check.ts. */
/** Log-share shift for Bhumjaithai per seat of swing index. */
export const K_SWING = 0.0066;
/** Partners ride a fraction of the government's swing. */
const PARTNER_RIDE = 0.35;
/** The list vote is the party brand and moves less than the constituency vote. */
const LIST_DAMP = 0.7;
/** When the government loses, the opposition that attacked it gains most. */
const OPP_GAIN = 0.3;
/** Losing moves the vote less per seat of swing than winning: the machine's
 *  heartland holds even when the country turns. (The seats still fall fast,
 *  because so many of them were narrow.) */
const DOWN = 0.55;
/** A realignment: past this much swing the leader starts taking its partners'
 *  provincial candidates and their voters, as Thai Rak Thai did in 2005. */
const REALIGN_FROM = 60, REALIGN = 0.5;
/** People's list vote is ideological. A popular government takes some of it,
 *  not most: this fraction of what a proportional swing would take is kept. */
const PEOPLES_CORE = 0.6;
/** How far each region moves with the national swing. Bangkok and its
 *  suburbs vote on ideas and a machine cannot recruit candidates there; the
 *  Deep South votes on identity and on peace. The provinces move in full. */
const ELASTIC: Record<string, number> = { bangkok: 0.45, vicinity: 0.6, deepsouth: 0.6 };

/** Regional effects of things the government did, as log-share shifts. */
const REGIONAL: { flags: string[]; any?: boolean; regions?: string[]; provinces?: string[];
                  party?: number; d: number }[] = [
  // The railway to Nong Khai, and the expo four weeks before the vote.
  { flags: ['hsr_ne_phase2_committed'], regions: ['northeast'], d: 0.06 },
  { flags: ['korat_expo_open'], provinces: ['nma'], d: 0.08 },
  { flags: ['village_nurse'], regions: ['northeast', 'north'], d: 0.03 },
  // Ribbons in Bangkok: worth something, in a city that votes on other things.
  { flags: ['orange_line_west_open', 'purple_line_south_open'], any: true, regions: ['bangkok', 'vicinity'], d: 0.04 },
  // The border provinces: a war won, or a counterattack that reached them.
  { flags: ['war_won'], provinces: ['skw', 'brm', 'srn', 'ssk', 'ubn', 'cti', 'trt'], d: 0.10 },
  { flags: ['war_counterattack'], provinces: ['skw', 'brm', 'srn', 'ssk', 'ubn', 'cti', 'trt'], d: -0.08 },
  // The Deep South votes on peace. Force sends it to the Malay-Muslim parties.
  { flags: ['deep_south_peace'], regions: ['deepsouth'], d: 0.10 },
  { flags: ['deep_south_dialogue'], regions: ['deepsouth'], d: 0.05 },
  { flags: ['deep_south_security'], regions: ['deepsouth'], d: -0.08 },
  { flags: ['deep_south_security'], regions: ['deepsouth'], party: OTH, d: 0.10 },
  // The Land Bridge's two provinces, either way.
  { flags: ['land_bridge_live'], provinces: ['cpn', 'rng'], d: 0.04 },
];

/** The 1941 provinces, if annexed: population and a starting vote. Residents
 *  vote once they take citizenship; uptake falls with dissent. */
const ANNEXED: Record<string, { pop: number; vote: number[] }> = {
  //                        BJT   PPL   PT    KT    DEM   OTH (local lists)
  phra_tabong:       { pop: 1.10e6, vote: [0.40, 0.06, 0.13, 0.09, 0.04, 0.28] },
  phibunsongkhram:   { pop: 1.40e6, vote: [0.40, 0.05, 0.13, 0.10, 0.04, 0.28] },
  nakhon_champassak: { pop: 0.30e6, vote: [0.42, 0.04, 0.12, 0.10, 0.04, 0.28] },
};

export function runElection(e: ElectionInput): ElectionResult {
  const gov = new Set(e.coalition);
  const flags = new Set(e.flags ?? []);

  // --- 1. the swing index, in seats, as the national model always had it.
  const margin = e.approval - 50;
  const approvalSwing = clamp(Math.sign(margin) * Math.pow(Math.abs(margin), 1.34) * 1.9, -125, 95);
  const economySwing = clamp((e.headline - e.baseline) / 10, -30, 30)
                     + clamp((e.realGrowth - 2.4) * 9, -25, 25);
  // The record converts only when the country can see it and the government
  // is popular enough to be credited with it rather than blamed for the debt.
  const record =
    (e.approval < 60) ? 0 :
    clamp((((e.potentialGrowth ?? 2.1) - 2.4) * 22)
        + (clamp(e.setChange ?? 0, 0, 80) * 0.28)
        + (((e.invRate ?? 18) - 18.0) * 7)
        + (((e.reformStock ?? 0) - 40) * 0.22)
        , 0, 60) * Math.min(1, (e.approval - 55) / 20);
  const S = approvalSwing + economySwing + record;

  // --- 2. the shift in each party's vote (log-share).
  const shift = PARTIES.map((p, i) => {
    if (i === B) return K_SWING * S * (S < 0 ? DOWN : 1);
    const op = e.opinion[p] ?? 50;
    if (gov.has(p)) return K_SWING * S * PARTNER_RIDE + clamp((op - 50) * 0.004, -0.2, 0.1)
      - K_SWING * Math.max(0, S - REALIGN_FROM) * REALIGN;
    if (S < 0) return -K_SWING * DOWN * S * OPP_GAIN * (1 + (60 - op) / 100);
    // Opposition machines lose candidates to the winner in a realignment too.
    // People's and the Democrats are parties of ideas and members, and do not.
    return (p === 'Kla Tham' || p === 'Others') ? -K_SWING * Math.max(0, S - REALIGN_FROM) * REALIGN : 0;
  });
  const consShift = [...shift];
  // The machine withdrawn: Bhumjaithai keeps its list vote but most of the
  // constituency gain above 2026 evaporates, and its provincial members take
  // their networks to the machine parties that can absorb them.
  if (e.machineBroken) {
    consShift[B] = (consShift[B] > 0 ? consShift[B] * 0.4 : consShift[B]) - 0.45;
    consShift[3] += 0.2; consShift[OTH] += 0.2;
  }
  // Party finance enforced: machines lose their edge in the constituencies,
  // parties with members and a national vote gain.
  if (e.partySystemReformed) {
    consShift[3] -= 0.15; consShift[OTH] -= 0.15;
    for (const i of [1, 2, 4]) consShift[i] += 0.04;
  }
  const regional = (d: { p: string; r: string }) => {
    const out = [0, 0, 0, 0, 0, 0];
    for (const R of REGIONAL) {
      const on = R.any ? R.flags.some(f => flags.has(f)) : R.flags.every(f => flags.has(f));
      if (!on) continue;
      if (R.regions && !R.regions.includes(d.r)) continue;
      if (R.provinces && !R.provinces.includes(d.p)) continue;
      out[R.party ?? B] += R.d;
    }
    return out;
  };
  const swung = (votes: number[], sh: number[], reg: number[], el = 1) => {
    const tot = votes.reduce((a, v) => a + v, 0) || 1;
    const w = votes.map((v, i) => v * Math.exp(sh[i] * el + reg[i]));
    const wt = w.reduce((a, v) => a + v, 0) || 1;
    return w.map(v => v / wt * tot);
  };

  // --- 3. the districts, swung. Annexed provinces join with synthetic votes.
  type D = { p: string; r: string; n: number; e: number; c: number[]; c26: number[]; annexed?: boolean };
  const ds: D[] = EL.districts.map(d => ({ p: d.p, r: d.r, n: d.n, e: d.e, c26: d.c,
    c: swung(d.c, consShift, regional(d), ELASTIC[d.r] ?? 1) }));
  const PER_SEAT = EL.districts.reduce((a, d) => a + d.e, 0) / EL.districts.length;
  const annexList = [0, 0, 0, 0, 0, 0];
  for (const [id, dissent] of Object.entries(e.annexed ?? {})) {
    const A = ANNEXED[id]; if (!A) continue;
    const uptake = clamp(0.55 + (flags.has('integration_hastened') ? 0.1 : 0)
                       + (flags.has('migrant_dividend') ? 0.05 : 0) - dissent / 100, 0.2, 0.8);
    const elig = A.pop * 0.62 * uptake;
    const seats = Math.max(1, Math.round(elig / PER_SEAT));
    const v = A.vote.map((x, i) => i === OTH ? x + dissent / 100 : x);
    const turnout = elig * 0.65;
    for (let n = 1; n <= seats; n++) {
      const base = v.map(x => x * turnout / seats);
      ds.push({ p: id, r: 'annexed', n, e: elig / seats, c26: [0, 0, 0, 0, 0, 0],
                c: swung(base, consShift, [0, 0, 0, 0, 0, 0]), annexed: true });
    }
    v.forEach((x, i) => { annexList[i] += x * turnout; });
  }

  // --- 4. the map the count is fought on. Constituencies: 500 minus the list.
  const L = e.listSeats ?? 100;
  const C = 500 - L;
  const byProv = new Map<string, D[]>();
  for (const d of ds) { if (!byProv.has(d.p)) byProv.set(d.p, []); byProv.get(d.p)!.push(d); }
  const elig = new Map([...byProv].map(([p, list]) => [p, list.reduce((a, d) => a + d.e, 0)]));
  const target = new Map([...byProv].map(([p, list]) => [p, list.length]));
  // Seats come off the most over-represented province, one at a time.
  let total = [...target.values()].reduce((a, v) => a + v, 0);
  while (total > C) {
    let best = '', bestV = Infinity;
    for (const [p, m] of target) {
      if (m < 2) continue;
      const v = elig.get(p)! / (m - 1);
      if (v < bestV) { bestV = v; best = p; }
    }
    if (!best) break;
    target.set(best, target.get(best)! - 1); total--;
  }
  const consSeats = [0, 0, 0, 0, 0, 0];
  const provinces: Record<string, ProvinceResult> = {};
  const districts: ElectionResult['districts'] = {};
  for (const [p, list] of byProv) {
    list.sort((a, b) => a.n - b.n);
    const m = target.get(p)!;
    // Block vote: districts of up to three seats. Otherwise single seats.
    const groups = e.blockVote ? Math.ceil(m / 3) : m;
    const seatsIn = (g: number) => Math.floor(m / groups) + (g < m % groups ? 1 : 0);
    const seats = [0, 0, 0, 0, 0, 0], seats26 = [0, 0, 0, 0, 0, 0];
    const sum = [0, 0, 0, 0, 0, 0], sum26 = [0, 0, 0, 0, 0, 0];
    for (const d of list) {
      d.c.forEach((v, i) => { sum[i] += v; });
      d.c26.forEach((v, i) => { sum26[i] += v; });
      if (!d.annexed) seats26[argmax(d.c26)]++;
    }
    const pctv = (a: number[]) => { const t = a.reduce((x, y) => x + y, 0) || 1; return a.map(x => Math.round(x / t * 1000) / 10); };
    const note = (d: D, w: number, members?: D[]) => {
      districts[`${d.p}-${d.n}`] = { w, w26: d.annexed ? -1 : argmax(d.c26), v: pctv(d.c), v26: pctv(d.c26),
        ...(members && members.length > 1 ? { with: members.filter(x => x !== d).map(x => `${x.p}-${x.n}`) } : {}) };
    };
    if (groups === list.length) {
      for (const d of list) { const w = argmax(d.c); seats[w]++; note(d, w); }
    } else {
      // consecutive districts, merged as evenly as the numbers allow
      let k = 0;
      for (let g = 0; g < groups; g++) {
        const take = Math.floor(list.length / groups) + (g < list.length % groups ? 1 : 0);
        const v = [0, 0, 0, 0, 0, 0];
        const members = list.slice(k, k + take);
        for (const d of members) d.c.forEach((x, i) => { v[i] += x; });
        k += take;
        seats[argmax(v)] += seatsIn(g);
        for (const d of members) note(d, argmax(v), members);
      }
    }
    seats.forEach((v, i) => { consSeats[i] += v; });
    const rec = (a: number[]) => Object.fromEntries(PARTIES.map((q, i) => [q, a[i]]));
    const pct = (a: number[]) => { const t = a.reduce((x, y) => x + y, 0) || 1;
      return Object.fromEntries(PARTIES.map((q, i) => [q, Math.round(a[i] / t * 1000) / 10])); };
    provinces[p] = { seats: rec(seats), seats2026: rec(seats26), share: pct(sum), share2026: pct(sum26),
                     districts: groups, ...(list[0].annexed ? { annexed: true } : {}) };
  }

  // --- 5. the list: national, largest remainder over the real parties.
  const listShift = shift.map(v => v * LIST_DAMP);
  const parties26 = EL.list2026.map(([b, , v]) => [PARTIES.indexOf(b), v] as const);
  // annexed voters' list votes, shared among the parties of each bucket
  const bucketTot = PARTIES.map((_, i) => parties26.filter(x => x[0] === i).reduce((a, x) => a + x[1], 0));
  let withAnnex = parties26.map(([i, v]) =>
    [i, (v + annexList[i] * v / (bucketTot[i] || 1)) * Math.exp(listShift[i])] as const);
  {
    // People's keeps PEOPLES_CORE of whatever share the swing took from it.
    const tot = (rows: readonly (readonly [number, number])[], f = (_: number) => true) =>
      rows.filter(r => f(r[0])).reduce((a, r) => a + r[1], 0);
    const T = tot(withAnnex), s26 = tot(parties26, i => i === 1) / tot(parties26), s30 = tot(withAnnex, i => i === 1) / T;
    if (s30 < s26) {
      const want = s26 - (s26 - s30) * (1 - PEOPLES_CORE);
      const kP = want / s30, kO = (1 - want) / (1 - s30);
      withAnnex = withAnnex.map(([i, v]) => [i, v * (i === 1 ? kP : kO)] as const);
    }
  }
  const lr = (rows: readonly (readonly [number, number])[], n: number) => {
    const tot = rows.reduce((a, r) => a + r[1], 0);
    const q = rows.map(r => r[1] / tot * n);
    const s = q.map(Math.floor);
    let left = n - s.reduce((a, v) => a + v, 0);
    const order = q.map((v, i) => [v - Math.floor(v), i] as const).sort((a, b) => b[0] - a[0]);
    for (const [, i] of order) { if (left-- <= 0) break; s[i]++; }
    const out = [0, 0, 0, 0, 0, 0];
    rows.forEach((r, i) => { out[r[0]] += s[i]; });
    return out;
  };
  const lr26 = lr(parties26, 100), lr30 = lr(withAnnex, L);
  const listSeats = PARTIES.map((p, i) => Math.max(0, (EL.listSeats2026[p] ?? 0) + lr30[i] - lr26[i]));
  // a party floored at zero hands its overflow back to the largest
  let over = listSeats.reduce((a, v) => a + v, 0) - L;
  while (over > 0) { const i = argmax(listSeats); listSeats[i]--; over--; }
  while (over < 0) { const i = argmax(lr30); listSeats[i]++; over++; }

  const pctOf = (a: number[]) => { const t = a.reduce((x, y) => x + y, 0) || 1;
    return Object.fromEntries(PARTIES.map((q, i) => [q, Math.round(a[i] / t * 1000) / 10])); };
  const sumBy = (rows: readonly (readonly [number, number])[]) => {
    const o = [0, 0, 0, 0, 0, 0]; rows.forEach(([i, v]) => { o[i] += v; }); return o; };
  const consVotes = [0, 0, 0, 0, 0, 0], consVotes26 = [0, 0, 0, 0, 0, 0];
  for (const d of ds) { d.c.forEach((v, i) => { consVotes[i] += v; }); d.c26.forEach((v, i) => { consVotes26[i] += v; }); }

  // --- 6. the House.
  const results: PartyResult[] = PARTIES.map((p, i) => {
    const before = e.seats[p] ?? 0;
    const origin = (e.seatsAt2026 ?? e.seats)[p] ?? before;
    const after = consSeats[i] + listSeats[i];
    return { party: p, origin, before, after, change: after - origin, inGov: gov.has(p),
             willJoin: false, reason: '', cons: consSeats[i], list: listSeats[i] };
  });

  // --- who will actually sign. Four years of relations decide which doors are
  //     open, and a government can win the election and still fail to form.
  for (const r of results) {
    const op = r.party === PLAYER ? 100 : (e.opinion[r.party] ?? 0);
    if (r.party === PLAYER) { r.willJoin = true; r.reason = 'your party'; continue; }
    if (r.party === "People's") {
      r.willJoin = op >= 75;
      r.reason = op >= 75 ? 'would consider it' : 'will never sit with you';
      continue;
    }
    if (op >= 55) { r.willJoin = true; r.reason = 'signs without conditions'; }
    else if (op >= 41) { r.willJoin = true; r.reason = 'signs, for ministries'; }
    else if (op >= 31) { r.willJoin = false; r.reason = 'talks, but will not commit'; }
    else { r.willJoin = false; r.reason = 'refuses outright'; }
  }
  const totalSwing = Math.round(S);
  const vote = { list: pctOf(sumBy(withAnnex)), list2026: pctOf(sumBy(parties26)),
                 cons: pctOf(consVotes), cons2026: pctOf(consVotes26) };
  const system = { constituencies: C, list: L, blockVote: !!e.blockVote };

  results.sort((a, b) => b.after - a.after);
  const playerSeats = results.find(r => r.party === PLAYER)!.after;
  const willing = results.filter(r => r.willJoin && r.party !== PLAYER)
    .sort((a, b) => b.after - a.after);

  // greedy: take the largest willing partners until the line is crossed
  const bloc = [PLAYER];
  let govTotal = playerSeats;
  for (const w of willing) {
    if (govTotal >= MAJORITY) break;
    bloc.push(w.party); govTotal += w.after;
  }
  const formed = govTotal >= MAJORITY;

  const verdict: ElectionResult['verdict'] =
    !formed ? (playerSeats < ((e.seatsAt2026 ?? e.seats)[PLAYER] ?? 191) - 30 ? 'defeated' : 'hung')
    : govTotal >= 315 || playerSeats >= MAJORITY ? 'landslide' : 'returned';
  const historic = playerSeats >= 300;

  const swingSeats = playerSeats - ((e.seatsAt2026 ?? e.seats)[PLAYER] ?? 191);
  const soloMajority = playerSeats >= MAJORITY;
  const headline =
    historic ? 'A supermajority, and a realignment'
    : soloMajority ? 'Returned with a single-party majority'
    : verdict === 'landslide' ? 'Returned with room to spare'
    : verdict === 'returned' ? 'Returned to office'
    : verdict === 'hung' ? 'Largest party, no government'
    : 'Out';

  const detail =
    historic
      ? `Bhumjaithai takes ${playerSeats} seats, ${fmtSigned(swingSeats)} on 2026 — the biggest mandate since ` +
        `Thai Rak Thai in 2005. Growth above trend, four years of market gains, investment up for the first ` +
        `time since the crisis. The borrowing read as ambition.`
    : soloMajority
      ? `Bhumjaithai takes ${playerSeats} seats, ${fmtSigned(swingSeats)} on 2026. The first single-party ` +
        `majority since Thai Rak Thai in 2005, won by the machine, not the list vote. The coalition is now ` +
        `optional. The December 2030 promise falls inside your new term.`
    : verdict === 'landslide'
      ? `Bhumjaithai takes ${playerSeats} seats, ${fmtSigned(swingSeats)} on 2026; the coalition ` +
        `holds ${govTotal}. A stronger second term, with the December 2030 promise now inside it.`
    : verdict === 'returned' && swingSeats < -10
      ? `Bhumjaithai loses ${-swingSeats} seats, down to ${playerSeats}. ` +
        `${bloc.slice(1).join(' and ')} still sign — ${govTotal} between them. You govern on their terms now.`
    : verdict === 'returned'
      ? `Bhumjaithai returns with ${playerSeats} seats (${fmtSigned(swingSeats)}) and builds ${govTotal} ` +
        `with ${bloc.slice(1).join(' and ')}. Workable. You answer for the 2030 promise yourself.`
    : verdict === 'hung'
      ? `Bhumjaithai is the largest party at ${playerSeats} seats and cannot form a government. ` +
        `Every party that could complete a majority was ignored this term. Somebody else forms the House.`
      : `Bhumjaithai falls to ${playerSeats} seats, ${fmtSigned(swingSeats)} on 2026. The term is over. ` +
        `Whoever comes next answers for the February 2026 promise.`;

  const listRec = { y2030: Object.fromEntries(PARTIES.map((p, i) => [p, listSeats[i]])),
                    y2026: { ...EL.listSeats2026 } };
  return { results, swing: totalSwing, playerSeats, bestCoalition: formed ? bloc : null,
           bestSeats: govTotal, majority: MAJORITY, verdict, headline, detail, vote, provinces, system,
           districts, listSeats: listRec };
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const argmax = (a: number[]) => a.reduce((b, v, i) => (v > a[b] ? i : b), 0);
const fmtSigned = (v: number) => (v >= 0 ? `+${v}` : `${v}`);
