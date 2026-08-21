/**
 * The 2030 general election.
 *
 * The House elected in February 2026 expires four years later, so the term ends
 * in 2030Q1 and the game ends at the count — not in December 2030. The promise
 * the government made was dated December 2030, which means it can only ever be
 * judged on that promise by winning again. That tension is the point.
 *
 * The model is deliberately crude, because a polling simulator is not what this
 * game is. But it is calibrated to one hard fact about the February 2026 result:
 * Bhumjaithai took 192 seats on a 17.90% party-list vote and a 29.55%
 * constituency vote. The seats are machine seats, converted at a rate no other
 * party manages, and the swing that produced them was +121 in a single cycle.
 *
 * That makes the seat count VOLATILE IN BOTH DIRECTIONS. A machine that converts
 * at that rate compounds when the mood is with it — provincial candidates defect
 * toward the winner, local networks consolidate — and collapses when it is not,
 * because there is no 30% national list vote underneath to catch the fall. So
 * the swing here is convex rather than linear: doubling the approval margin more
 * than doubles the seats. People's is the mirror image — 30.56% of the list vote
 * is a floor no bad campaign can take away, and a ceiling the constituencies
 * refuse to let it exceed.
 *
 * Three inputs move seats:
 *
 *   1. Approval — the national swing, convex in the margin either side of 50%
 *      and deliberately ASYMMETRIC: +95 seats at most, -125 with no floor.
 *      Being liked is not the same as having delivered something, and a machine
 *      with no list vote underneath it falls further than it can ever climb.
 *   2. The economy voters felt — real GDP per head against the IMF baseline and
 *      growth against trend. Not potential growth: nobody votes on TFP.
 *   3. The record — potential growth, the index, the investment rate and the
 *      reform stock, worth up to 60 seats but ONLY above 60% approval. A term
 *      that visibly transformed the country converts; competence without a
 *      mandate converts into nothing at all.
 *   4. Relations — a coalition partner kept warm returns and re-signs; one held
 *      at arm's length for four years takes its seats and its options elsewhere.
 *
 * Seats lost by the government are redistributed to the opposition in proportion
 * to how well-disposed the electorate is to each — approximated by inverse
 * relations, since a party that spent four years attacking you collects the
 * votes of people who agree with the attacks.
 */

export interface ElectionInput {
  seats: Record<string, number>;      // the outgoing House
  coalition: string[];                // parties in government at dissolution
  opinion: Record<string, number>;    // relations at dissolution
  approval: number;
  headline: number;                   // USD per capita at dissolution
  baseline: number;                   // the IMF projection, 9,092
  realGrowth: number;                 // annualised over the term, %
  /** The record, for the rare term that is not merely popular but visibly
   *  transformative. Deliberately gated — see recordBonus below. */
  potentialGrowth?: number;
  setChange?: number;                 // % change in the SET over the term
  invRate?: number;                   // private investment, % of GDP, at the end
  reformStock?: number;
  debtGdp?: number;
  ceiling?: number;
  /** The provincial organisation stopped working for you — see the
   *  withdrawal block below. Set by refusing the networks after the
   *  prosecution service reached your own members. */
  machineBroken?: boolean;
}

export interface PartyResult {
  party: string; before: number; after: number; change: number;
  inGov: boolean; willJoin: boolean; reason: string;
}

export interface ElectionResult {
  results: PartyResult[];
  swing: number;                      // net government seat change
  playerSeats: number;
  bestCoalition: string[] | null;     // largest workable government, or null
  bestSeats: number;
  majority: number;
  verdict: 'landslide' | 'returned' | 'hung' | 'defeated';
  headline: string;
  detail: string;
}

const MAJORITY = 251;
const PLAYER = 'Bhumjaithai';

export function runElection(e: ElectionInput): ElectionResult {
  const gov = new Set(e.coalition);

  // --- the swing, in seats, against the government as a whole. Convex in the
  //     approval margin: the 2026 cycle moved 121 seats, so a government that is
  //     genuinely popular should be able to approach 250 on its own, and one that
  //     is genuinely hated should lose the machine outright.
  const margin = e.approval - 50;
  // Asymmetric on purpose: popularity alone caps out around 95 seats, because
  // being liked is not the same as having delivered something. Collapse has no
  // such limit — a machine with no list vote underneath it falls all the way.
  const approvalSwing = clamp(Math.sign(margin) * Math.pow(Math.abs(margin), 1.34) * 1.9, -125, 95);
  const economySwing = clamp((e.headline - e.baseline) / 10, -30, 30)
                     + clamp((e.realGrowth - 2.4) * 9, -25, 25);

  // --- the record. Structural reform normally earns nothing at the ballot box:
  //     nobody votes on total factor productivity, and the whole tragedy of the
  //     Legacy score is that it matures after the count. But there is a case
  //     where it converts, and it is the case where the country can SEE it — a
  //     visible boom, investment turning, the index running, and a government
  //     popular enough to be given credit for all of it rather than blamed for
  //     the debt. That is not a normal Thai term. It is Thai Rak Thai in 2005,
  //     and it is worth a supermajority. Gated behind 60% approval, because
  //     competence without a mandate converts into nothing at all.
  const record =
    (e.approval < 60) ? 0 :
    clamp((( (e.potentialGrowth ?? 2.1) - 2.4) * 22)      // above-trend capacity
        + (clamp(e.setChange ?? 0, 0, 80) * 0.28)          // a market people watched
        + (((e.invRate ?? 18) - 18.0) * 7)                 // investment they can see
        + (((e.reformStock ?? 0) - 40) * 0.22)             // a legislative record
        , 0, 60) * Math.min(1, (e.approval - 55) / 20);

  const totalSwing = Math.round(approvalSwing + economySwing + record);

  // --- The seats have to come from somewhere. A landslide is bounded by what
  //     the opposition can actually surrender before hitting its own floors, so
  //     the pool is computed first and then shared out. A large positive swing
  //     is a REALIGNMENT: the leading party cannibalises its own partners as
  //     provincial candidates move toward the winner, which is exactly how
  //     Bhumjaithai took 121 seats in 2026 and how Thai Rak Thai took 2005.
  const govParties = Object.keys(e.seats).filter(p => gov.has(p));
  const oppParties = Object.keys(e.seats).filter(p => !gov.has(p));
  const govSeats = govParties.reduce((a, p) => a + e.seats[p], 0);

  const headroom = (p: string, up: boolean) => {
    const b = BOUNDS[p] ?? [5, 250];
    return up ? b[1] - e.seats[p] : e.seats[p] - b[0];
  };

  const results: PartyResult[] = [];
  const up = totalSwing >= 0;
  // what the other side can physically give up
  const donors = up ? oppParties : govParties;
  const pool = Math.min(Math.abs(totalSwing),
    donors.reduce((a, p) => a + headroom(p, false), 0)
    // in a realignment the leader's own partners are donors too
    + (up ? govParties.filter(p => p !== PLAYER).reduce((a, p) => a + headroom(p, false), 0) * 0.5 : 0));

  // how concentrated the result is on the leading party: proportional in a
  // normal cycle, overwhelmingly the leader in a landslide or a wipeout
  // A realignment has to be earned, not merely enjoyed. On the way up the
  // leader only starts absorbing everyone else once the swing passes about
  // sixty seats — which popularity alone cannot reach without the record term
  // behind it. On the way down there is no such threshold: collapse concentrates
  // immediately.
  const intensity = totalSwing >= 0
    ? clamp((totalSwing - 60) / 120, 0, 1)
    : Math.min(1, -totalSwing / 130);
  const leadBase = 0.55 + 0.45 * (e.seats[PLAYER] / govSeats);
  // Above about three-quarters intensity the leader's share exceeds one: it is
  // taking seats from its own coalition as well as from the opposition, which is
  // what a realignment actually looks like on the ground.
  const leadShare = leadBase + (1.32 - leadBase) * intensity;

  const winners = up ? govParties : oppParties;
  const losers = up ? oppParties : govParties;

  // winners: the player takes leadShare of the pool where the player is winning
  const wShares: Record<string, number> = {};
  if (winners.includes(PLAYER)) {
    wShares[PLAYER] = leadShare;
    const rest = winners.filter(p => p !== PLAYER);
    const restSeats = rest.reduce((a, p) => a + e.seats[p], 0) || 1;
    for (const p of rest) wShares[p] = (1 - leadShare) * (e.seats[p] / restSeats);
  } else {
    // the player is losing: the opposition splits the spoils weighted by how
    // hostile it was, since the party that made the case collects the votes
    const w = winners.map(p => [p, e.seats[p] * (1 + (60 - (e.opinion[p] ?? 50)) / 100)] as const);
    const wsum = w.reduce((a, x) => a + x[1], 0) || 1;
    for (const [p, v] of w) wShares[p] = v / wsum;
  }

  // losers give up in proportion to their room above the floor, so nobody is
  // asked for seats they do not have
  const lRoom = losers.map(p => [p, Math.max(0, headroom(p, false))] as const);
  const lsum = lRoom.reduce((a, x) => a + x[1], 0) || 1;

  for (const p of Object.keys(e.seats)) {
    const before = e.seats[p];
    let delta = winners.includes(p) ? pool * (wShares[p] ?? 0)
                                    : -pool * ((lRoom.find(x => x[0] === p)?.[1] ?? 0) / lsum);
    // a partner held in contempt for four years underperforms on its own account
    if (p !== PLAYER && gov.has(p)) delta += clamp((e.opinion[p] - 50) * 0.3, -14, 10);
    const after = bound(p, before + delta);
    results.push({ party: p, before, after, change: after - before,
                   inGov: gov.has(p), willJoin: false, reason: '' });
  }

  // --- who will actually sign. This is the renegotiation: four years of
  //     relations decide which doors are open, and a government can win the
  //     election and still fail to form.
  for (const r of results) {
    const op = r.party === PLAYER ? 100 : (e.opinion[r.party] ?? 0);
    if (r.party === PLAYER) { r.willJoin = true; r.reason = 'your party'; continue; }
    if (r.party === "People's") {
      r.willJoin = op >= 75;
      r.reason = op >= 75 ? 'would consider it — extraordinary, given where this started'
                          : 'will not sit with you under any arithmetic';
      continue;
    }
    if (op >= 55) { r.willJoin = true; r.reason = 'signs without conditions'; }
    else if (op >= 41) { r.willJoin = true; r.reason = 'signs, at a price in portfolios'; }
    else if (op >= 31) { r.willJoin = false; r.reason = 'talks, but will not commit'; }
    else { r.willJoin = false; r.reason = 'refuses outright'; }
  }

  // Bounding breaks the arithmetic. Restore it by distributing the residual in
  // proportion to each party's remaining headroom, which keeps the result
  // monotonic in the swing — a bigger win must never return fewer seats.
  {
    let residual = 500 - results.reduce((a, r) => a + r.after, 0);
    for (let pass = 0; pass < 6 && residual !== 0; pass++) {
      const room = results.map(r => {
        const b = BOUNDS[r.party] ?? [5, 250];
        return residual > 0 ? b[1] - r.after : r.after - b[0];
      });
      const roomSum = room.reduce((a, v) => a + v, 0);
      if (roomSum <= 0) break;
      let placed = 0;
      results.forEach((r, i) => {
        if (i === results.length - 1) { r.after += residual - placed; placed = residual; return; }
        const take = Math.trunc(residual * (room[i] / roomSum));
        r.after += take; placed += take;
      });
      results.forEach(r => {
        r.after = bound(r.party, r.after);
        r.change = r.after - r.before;
      });
      residual = 500 - results.reduce((a, r) => a + r.after, 0);
    }
    // final exactness: a House of 500 must seat 500, so walk the last few seats
    // onto (or off) whichever parties still have room, largest first.
    let guard = 0;
    while (residual !== 0 && guard++ < 600) {
      const order = [...results].sort((x, y) => y.after - x.after);
      let moved2 = false;
      for (const r of order) {
        const b2 = BOUNDS[r.party] ?? [5, 250];
        if (residual > 0 && r.after < b2[1]) { r.after++; residual--; moved2 = true; }
        else if (residual < 0 && r.after > b2[0]) { r.after--; residual++; moved2 = true; }
        if (residual === 0) break;
      }
      if (!moved2) break;
    }
    results.forEach(r => { r.change = r.after - r.before; });
  }

  // ---- the machine, withdrawn.
  // A government that let the prosecutions reach its own provincial members does
  // not lose its vote. It loses the CONVERSION — Bhumjaithai's constituency
  // yield has always run far above its list share, and the gap between the two
  // is precisely the organisation now declining to work. So the 2026 base
  // survives, most of the gain above it evaporates, and a bloc of members leaves
  // outright for whoever will still take their calls. Everything above this line
  // is scored on the record; this is scored on who was still willing to deliver.
  if (e.machineBroken) {
    const me = results.find(r => r.party === PLAYER)!;
    const base = e.seats[PLAYER] ?? 191;
    const bound = BOUNDS[PLAYER] ?? [55, 330];
    const kept = Math.max(bound[0], Math.round(base + Math.max(0, me.after - base) * 0.42) - 18);
    const lost = me.after - kept;
    if (lost > 0) {
      me.after = kept;
      // The seats do not vanish from the House — they go to the rivals best able
      // to absorb a defecting provincial network, in proportion to their size.
      const rivals = results.filter(r => r.party !== PLAYER);
      const weight = (r: typeof rivals[number]) =>
        r.after * (r.party === 'Kla Tham' || r.party === 'Others' ? 2.5 : 1);
      const totalW = rivals.reduce((a, r) => a + weight(r), 0) || 1;
      let handed = 0;
      for (const r of rivals) {
        const b = BOUNDS[r.party] ?? [5, 250];
        const take = Math.min(Math.round(lost * weight(r) / totalW), b[1] - r.after);
        r.after += take; handed += take;
      }
      // rounding remainder, wherever there is still room
      for (const r of rivals) {
        if (handed >= lost) break;
        const b = BOUNDS[r.party] ?? [5, 250];
        const take = Math.min(lost - handed, b[1] - r.after);
        r.after += take; handed += take;
      }
    }
    results.forEach(r => { r.change = r.after - r.before; });
  }

  results.sort((a, b) => b.after - a.after);
  const playerSeats = results.find(r => r.party === PLAYER)!.after;
  const willing = results.filter(r => r.willJoin && r.party !== PLAYER)
    .sort((a, b) => b.after - a.after);

  // greedy: take the largest willing partners until the line is crossed
  const bloc = [PLAYER];
  let total = playerSeats;
  for (const w of willing) {
    if (total >= MAJORITY) break;
    bloc.push(w.party); total += w.after;
  }
  const formed = total >= MAJORITY;

  const verdict: ElectionResult['verdict'] =
    !formed ? (playerSeats < (e.seats[PLAYER] ?? 191) - 30 ? 'defeated' : 'hung')
    : total >= 315 || playerSeats >= MAJORITY ? 'landslide' : 'returned';
  const historic = playerSeats >= 300;

  const swingSeats = playerSeats - (e.seats[PLAYER] ?? 191);
  const soloMajority = playerSeats >= MAJORITY;
  const headline =
    historic ? 'A supermajority, and a realignment'
    : soloMajority ? 'Returned with a single-party majority'
    : verdict === 'landslide' ? 'Returned with a working majority and room to spare'
    : verdict === 'returned' ? 'Returned to office'
    : verdict === 'hung' ? 'Largest party, no government'
    : 'Out';

  const detail =
    historic
      ? `Bhumjaithai takes ${playerSeats} seats, ${fmtSigned(swingSeats)} on 2026 and the largest mandate any ` +
        `Thai party has won since Thai Rak Thai in 2005. Potential growth above trend, an index that ran for ` +
        `four years, investment turning for the first time since the crisis, and a government popular enough ` +
        `that the borrowing was read as ambition rather than recklessness. Provincial networks do not usually ` +
        `produce results like this, because provincial networks do not usually govern like this.`
    : soloMajority
      ? `Bhumjaithai takes ${playerSeats} seats, ${fmtSigned(swingSeats)} on 2026 — the first single-party ` +
        `majority since Thai Rak Thai in 2005, and it belongs to the machine rather than to the list vote. ` +
        `The coalition is now a courtesy. The December 2030 promise falls inside the new term, which means ` +
        `it will be answered by the government that made it.`
    : verdict === 'landslide'
      ? `Bhumjaithai takes ${playerSeats} seats, ${fmtSigned(swingSeats)} on 2026, and the coalition ` +
        `commands ${total}. A second term begins with more authority than the first — and with the ` +
        `December 2030 promise now falling inside it.`
    : verdict === 'returned' && swingSeats < -10
      ? `Bhumjaithai loses ${-swingSeats} seats, down to ${playerSeats}, and returns to office only because ` +
        `${bloc.slice(1).join(' and ')} will still sign — ${total} between them. A government returned on its ` +
        `partners' seats rather than its own is a government that governs on their terms.`
    : verdict === 'returned'
      ? `Bhumjaithai returns with ${playerSeats} seats (${fmtSigned(swingSeats)}) and assembles ${total} ` +
        `with ${bloc.slice(1).join(' and ')}. Workable, and it means the government that made the 2030 ` +
        `promise is the government that has to answer for it.`
    : verdict === 'hung'
      ? `Bhumjaithai is still the largest party at ${playerSeats} seats, and cannot form a government: ` +
        `every party with the numbers to complete a majority spent this term being ignored, and says so ` +
        `now. Somebody else assembles the House.`
      : `Bhumjaithai falls to ${playerSeats} seats, ${fmtSigned(swingSeats)} on 2026. The term is over and ` +
        `the promise made in February 2026 will be answered by whoever inherits it.`;

  return { results, swing: totalSwing, playerSeats, bestCoalition: formed ? bloc : null,
           bestSeats: total, majority: MAJORITY, verdict, headline, detail };
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Floors and ceilings taken from the structure of the February 2026 vote, not
 *  from its seat totals. A party with a large party-list vote has a floor that
 *  survives a bad campaign — People's polled 30.56% on the list, the largest of
 *  any party, and cannot realistically fall below about ninety seats. A party
 *  whose seats are constituency conversions has almost no floor and a high
 *  ceiling: Bhumjaithai's 17.90% list vote guarantees it very little, and its
 *  machine can take it most of the way to a majority alone. */
const BOUNDS: Record<string, [number, number]> = {
  Bhumjaithai: [55, 330],   // 29.55% constituency, 17.90% list — volatile both ways.
                            // The ceiling is Thai Rak Thai's 377 in 2005, discounted:
                            // a machine having a historic night can go most of the way.
  "People's":  [70, 205],   // 30.56% list is a floor; constituencies are the ceiling
  'Pheu Thai': [22, 165],   // a machine in decline, but still a machine
  'Kla Tham':  [12, 130],
  Democrat:    [6, 70],
  Others:      [14, 90],
};
const bound = (party: string, seats: number) => {
  const b = BOUNDS[party] ?? [5, 250];
  return Math.max(b[0], Math.min(b[1], Math.round(seats)));
};
const fmtSigned = (v: number) => (v >= 0 ? `+${v}` : `${v}`);
