/**
 * The Cambodian war and occupation. Deterministic: no dice anywhere.
 *
 * Opens from the revanchist branch of the MOU 2544 event. Three layers of
 * control, all free to change during the turn:
 *
 *   strategy   mobilisation (brigade pool), air campaign, diplomacy, ceasefire
 *   fronts     brigades, posture (hold / advance / assault) and reconstruction
 *              (aid / martial law / crackdown), per 1941 province
 *   decisions  six news events triggered by the state of the war (battle for
 *              Battambang, Preah Vihear, Poipet, refugees, counterattack, talks)
 *
 * Each front has an occupation level, Cambodian strength and, once entered,
 * dissent. International attention builds with intensity and decides whether
 * Brussels suspends the EU agreement and whether Vietnam arms Cambodia.
 *
 * Pure functions only. The host applies the economic and political effects.
 */

export type Posture = 'hold' | 'advance' | 'assault';
export type ReconStance = 'aid' | 'martial' | 'crackdown';
export type Mobilisation = 'standing' | 'partial' | 'full';
export type AirCampaign = 'military' | 'interdiction' | 'strategic';
export type Diplomacy = 'none' | 'beijing' | 'hanoi' | 'asean';
/** Old single-dial posture, kept as a shortcut (setWarStance). */
export type WarStance = 'ceasefire' | 'hold' | 'limited' | 'full';

export const PROVINCES = ['phra_tabong', 'phibunsongkhram', 'nakhon_champassak'] as const;
export type ProvId = typeof PROVINCES[number];

export interface Front {
  occ: number; dissent: number; entered: boolean;
  brigades: number; posture: Posture; recon: ReconStance;
  /** Cambodian strength on this front, 0-100. */
  enemy: number;
  /** Quarters of aid since the province was entered (reconstruction counters). */
  aidQ: number;
}
export interface WarState {
  stage: 'none' | 'war' | 'won' | 'frozen';
  mobilisation: Mobilisation;
  air: AirCampaign;
  diplomacy: Diplomacy;
  ceasefire: boolean;
  fronts: Record<ProvId, Front>;
  startQuarter?: number;
  wonQuarter?: number;
  quartersAtWar: number;
  /** International attention, 0-100. */
  attention: number;
  /** Built up by crackdowns; adds to dissent growth and fades slowly. */
  resentment: number;
  thaiCasualties: number;
  khmerCasualties: number;
  displaced: number;
  /** Battambang city: Phra Tabong cannot pass 60% until it falls. */
  battambang: 'open' | 'siege' | 'taken';
  siegeUntil?: number;
  /** Preah Vihear: Nakhon Champassak cannot pass 40% until decided. */
  preahVihear: 'open' | 'taken' | 'bypassed';
  vietnamArming: boolean;
  /** For Pax Rattanakosin: aid everywhere, dissent never at or above 40. */
  onlyAid: boolean;
  maxDissent: number;
}

export const BRIGADES: Record<Mobilisation, number> = { standing: 6, partial: 9, full: 12 };
const TERRAIN: Record<ProvId, number> = { phra_tabong: 1.0, phibunsongkhram: 0.8, nakhon_champassak: 0.6 };
const ENEMY0: Record<ProvId, number> = { phra_tabong: 50, phibunsongkhram: 60, nakhon_champassak: 70 };
const POSTURE: Record<Posture, number> = { hold: 0, advance: 1, assault: 1.8 };
const AIR: Record<AirCampaign, number> = { military: 1, interdiction: 1.25, strategic: 1.45 };
/** Thai casualties per brigade per quarter. */
const LOSS: Record<Posture, number> = { hold: 8, advance: 25, assault: 55 };
export const START_DISSENT = 30;
export const NAMES: Record<ProvId, string> = { phra_tabong: 'Phra Tabong', phibunsongkhram: 'Phibunsongkhram', nakhon_champassak: 'Nakhon Champassak' };

export function initialWar(): WarState {
  const f = (p: ProvId): Front => ({ occ: 0, dissent: 0, entered: false, brigades: 0, posture: 'hold', recon: 'martial', enemy: ENEMY0[p], aidQ: 0 });
  return { stage: 'none', mobilisation: 'standing', air: 'military', diplomacy: 'none', ceasefire: false,
    fronts: { phra_tabong: f('phra_tabong'), phibunsongkhram: f('phibunsongkhram'), nakhon_champassak: f('nakhon_champassak') },
    quartersAtWar: 0, attention: 10, resentment: 0, thaiCasualties: 0, khmerCasualties: 0, displaced: 0,
    battambang: 'open', preahVihear: 'open', vietnamArming: false, onlyAid: true, maxDissent: 0 };
}

export function startWar(w: WarState, quarter: number): WarState {
  const fronts = { ...w.fronts };
  for (const p of PROVINCES) fronts[p] = { ...fronts[p], brigades: 3, posture: 'advance' };
  return { ...w, stage: 'war', mobilisation: 'partial', startQuarter: quarter, fronts, attention: 20 };
}

export const brigadesUsed = (w: WarState) => PROVINCES.reduce((a, p) => a + w.fronts[p].brigades, 0);
export const brigadePool = (w: WarState) => BRIGADES[w.mobilisation];

/** Orders from the war panel. Brigades are clamped to the pool. */
export interface Orders {
  mobilisation?: Mobilisation; air?: AirCampaign; diplomacy?: Diplomacy; ceasefire?: boolean;
  fronts?: Partial<Record<ProvId, { brigades?: number; posture?: Posture; recon?: ReconStance }>>;
}
export function applyOrders(w0: WarState, o: Orders): WarState {
  if (w0.stage === 'none') return w0;
  const w: WarState = { ...w0, fronts: { ...w0.fronts } };
  if (w.stage === 'war') {
    if (o.mobilisation) w.mobilisation = o.mobilisation;
    if (o.air) w.air = o.air;
    if (o.ceasefire != null) w.ceasefire = o.ceasefire;
  }
  if (o.diplomacy) w.diplomacy = o.diplomacy;
  for (const p of PROVINCES) {
    const f = o.fronts?.[p];
    if (!f) continue;
    const cur = { ...w.fronts[p] };
    if (f.recon) cur.recon = f.recon;
    if (w.stage === 'war') {
      if (f.posture) cur.posture = f.posture;
      if (f.brigades != null) {
        const others = brigadesUsed(w) - cur.brigades;
        cur.brigades = Math.max(0, Math.min(f.brigades, brigadePool(w) - others));
      }
    }
    w.fronts[p] = cur;
  }
  // Demobilising trims brigades from the last front first.
  let over = brigadesUsed(w) - brigadePool(w);
  for (const p of [...PROVINCES].reverse()) {
    if (over <= 0) break;
    const cut = Math.min(over, w.fronts[p].brigades);
    w.fronts[p] = { ...w.fronts[p], brigades: w.fronts[p].brigades - cut }; over -= cut;
  }
  return w;
}

/** China arms Phnom Penh when your US points exceed your China points, unless
 *  a back channel to Beijing is open. */
export function chinaArming(alignUs: number, alignCn: number, w?: WarState) {
  return alignUs > alignCn && w?.diplomacy !== 'beijing';
}

export function avgDissent(w: WarState): number {
  const e = PROVINCES.filter(p => w.fronts[p].entered);
  return e.length ? e.reduce((a, p) => a + w.fronts[p].dissent, 0) / e.length : 0;
}

/** Occupation cap from the two set-piece decisions. */
function cap(w: WarState, p: ProvId): number {
  if (p === 'phra_tabong' && w.battambang !== 'taken') return 60;
  if (p === 'nakhon_champassak' && w.preahVihear === 'open') return 40;
  return 100;
}

/** One quarter. Returns the new state and log lines. */
export function stepWar(w0: WarState, quarter: number, arming: boolean, regularised = false): { war: WarState; notes: string[] } {
  if (w0.stage === 'none') return { war: w0, notes: [] };
  const w: WarState = { ...w0, fronts: { ...w0.fronts } };
  const notes: string[] = [];
  const fighting = w.stage === 'war' && !w.ceasefire;
  if (w.battambang === 'siege' && quarter >= (w.siegeUntil ?? 0)) {
    w.battambang = 'taken'; notes.push('Battambang surrenders after the siege.');
  }
  if (fighting) {
    w.quartersAtWar++;
    w.vietnamArming = w.attention >= 60 && w.diplomacy !== 'hanoi';
    const regen = 4 + (arming ? 4 : 0) + (w.vietnamArming ? 4 : 0);
    let att = 0;
    for (const p of PROVINCES) {
      const f = { ...w.fronts[p] };
      if (f.occ >= 100) { w.fronts[p] = f; continue; }
      const power = f.brigades * POSTURE[f.posture] * AIR[w.air] * TERRAIN[p]
        * (f.dissent > 50 ? 0.7 : 1) * (p === 'nakhon_champassak' && w.preahVihear === 'bypassed' ? 0.8 : 1);
      if (power > 0) {
        if (!f.entered) { f.entered = true; f.dissent = START_DISSENT; }
        const gain = power * 6 * 50 / (f.enemy + 30);
        f.occ = Math.min(cap(w, p), f.occ + gain);
        f.enemy = Math.max(0, f.enemy - power * 2.5);
      }
      f.enemy = Math.min(100, f.enemy + regen);
      const th = f.brigades * LOSS[f.posture] * (arming ? 1.5 : 1) * (w.vietnamArming ? 1.2 : 1);
      w.thaiCasualties += Math.round(th);
      w.khmerCasualties += Math.round(th * 1.6 * (w.air === 'strategic' ? 1.3 : 1));
      w.displaced += Math.round(power * 1500);
      // Counterattack: a front entered but left thin, against a strong enemy.
      if (f.entered && f.occ < 100 && f.brigades <= 1 && f.enemy > 35) {
        f.occ = Math.max(0, f.occ - 12); w.thaiCasualties += 300;
        notes.push(`Cambodian counterattack retakes ground in ${NAMES[p]}.`);
      }
      att += f.posture === 'assault' ? 4 : f.posture === 'advance' ? 2 : 0;
      w.fronts[p] = f;
    }
    if (w.air === 'strategic') { att += 8; w.displaced += 20000; }
    else if (w.air === 'interdiction') att += 3;
    w.attention = Math.min(100, w.attention + att);
  } else {
    // Attention fades once the guns stop, much faster once the war is over.
    w.attention = Math.max(0, w.attention - (w.stage === 'war' ? 3 : 8));
  }
  if (w.diplomacy === 'asean') w.attention = Math.max(0, w.attention - 6);
  for (const p of PROVINCES) if (w.fronts[p].entered && w.fronts[p].recon === 'crackdown') w.attention = Math.min(100, w.attention + 3);

  // Dissent, province by province.
  let crack = false;
  for (const p of PROVINCES) {
    const f = { ...w.fronts[p] };
    if (!f.entered) continue;
    if (f.recon !== 'aid') w.onlyAid = false; else f.aidQ = (f.aidQ ?? 0) + 1;
    const base = fighting ? { aid: 0.5, martial: 3, crackdown: 3 }[f.recon] : { aid: -7, martial: -3, crackdown: -3 }[f.recon];
    const pressure = fighting ? 0.25 * Math.min(w.quartersAtWar, 6) + (w.air === 'strategic' ? 1.5 : 0) : 0;
    const hit = (f.recon === 'crackdown' ? -10 : 0) + (regularised ? (fighting ? -0.5 : -2) : 0);
    if (f.recon === 'crackdown') crack = true;
    f.dissent = Math.max(0, Math.min(100, f.dissent + base + pressure + w.resentment + hit));
    w.maxDissent = Math.max(w.maxDissent, f.dissent);
    w.fronts[p] = f;
  }
  w.resentment = crack ? w.resentment + 3 : Math.max(0, w.resentment - 0.3);
  if (w.stage === 'war' && PROVINCES.every(p => w.fronts[p].occ >= 100)) {
    w.stage = 'won'; w.wonQuarter = quarter; w.ceasefire = false;
    for (const p of PROVINCES) w.fronts[p] = { ...w.fronts[p], posture: 'hold' };
    notes.push('The army reaches the 1941 line in all three provinces. The fighting stops.');
  }
  return { war: w, notes };
}

/** Effects of the six war decisions. Returns the new war state and any
 *  one-off effects for the host to apply. */
export function warDecision(w0: WarState, key: string, quarter: number): { war: WarState; effects?: Record<string, number> } {
  const w: WarState = { ...w0, fronts: { ...w0.fronts } };
  const bump = (p: ProvId, d: number) => { if (w.fronts[p].entered) w.fronts[p] = { ...w.fronts[p], dissent: Math.max(0, Math.min(100, w.fronts[p].dissent + d)) }; };
  const all = (d: number) => PROVINCES.forEach(p => bump(p, d));
  switch (key) {
    case 'storm':
      w.battambang = 'taken'; w.khmerCasualties += 1500; w.thaiCasualties += 600; w.displaced += 40000;
      bump('phra_tabong', 15); w.attention = Math.min(100, w.attention + 10); break;
    case 'besiege':
      w.battambang = 'siege'; w.siegeUntil = quarter + 2; break;
    case 'take_temple':
      w.preahVihear = 'taken'; bump('nakhon_champassak', 6); w.attention = Math.min(100, w.attention + 12); break;
    case 'bypass':
      w.preahVihear = 'bypassed'; break;
    case 'raid_poipet':
      bump('phibunsongkhram', -8); w.attention = Math.max(0, w.attention - 2); break;
    case 'camps':
      all(-3); return { war: w, effects: { transfers: 0.1 } };
    case 'push_back':
      all(5); w.attention = Math.min(100, w.attention + 8); break;
    case 'reinforce':
      for (const p of PROVINCES) if (w.fronts[p].entered && w.fronts[p].occ < 100) w.fronts[p] = { ...w.fronts[p], enemy: Math.max(0, w.fronts[p].enemy - 10) };
      break;
    case 'accept_talks':
      w.stage = 'frozen'; w.ceasefire = true; w.attention = Math.max(0, w.attention - 20);
      for (const p of PROVINCES) w.fronts[p] = { ...w.fronts[p], posture: 'hold' };
      break;
    case 'press_on':
      w.attention = Math.min(100, w.attention + 5); break;
  }
  return { war: w };
}

/** Recurring cost of the current posture, as levels the host holds in the
 *  stance vector (the host applies the difference each quarter). */
export function warLevels(w: WarState): Record<string, number> {
  if (w.stage === 'none') return {};
  const active = w.stage === 'war' && !w.ceasefire;
  const mob = w.stage === 'war' ? { standing: 0.2, partial: 0.5, full: 0.8 }[w.mobilisation] : 0.15;
  let recon = 0, fdi = 0, set = 0;
  for (const p of PROVINCES) {
    const f = w.fronts[p];
    if (f.entered) recon += { aid: 0.17, martial: 0.03, crackdown: 0.03 }[f.recon];
    if (active && f.occ < 100) {
      fdi -= f.posture === 'assault' ? 0.08 : f.posture === 'advance' ? 0.04 : 0;
      set -= f.posture === 'assault' ? 0.2 : f.posture === 'advance' ? 0.1 : 0;
    }
    if (f.entered && f.recon === 'crackdown') fdi -= 0.02;
  }
  if (active && w.air === 'strategic') { fdi -= 0.1; set -= 0.2; }
  return { govConsumption: mob + recon + (active && w.air === 'strategic' ? 0.1 : 0), fdiSignal: fdi, setSupport: set };
}

/** Reservists away from their jobs, % of labour input. Small, temporary. */
export function mobilisationDrag(w: WarState): number {
  return w.stage === 'war' ? { standing: 0, partial: 0.3, full: 0.6 }[w.mobilisation] : 0;
}

/** Approval per quarter of fighting: the rally fades, faster with assaults and
 *  a full call-up. */
export function warApproval(w: WarState): number {
  if (w.stage !== 'war' || w.ceasefire) return 0;
  let a = 0;
  for (const p of PROVINCES) if (w.fronts[p].occ < 100)
    a -= w.fronts[p].posture === 'assault' ? 0.8 : w.fronts[p].posture === 'advance' ? 0.4 : 0;
  if (w.quartersAtWar > 2) a -= { standing: 0, partial: 0.4, full: 1.0 }[w.mobilisation];
  return a;
}

/** Shortcut used by guides and the old single dial. */
export function stanceOrders(s: WarStance): Orders {
  const all = (brigades: number, posture: Posture) => Object.fromEntries(PROVINCES.map(p => [p, { brigades, posture }])) as Orders['fronts'];
  if (s === 'full') return { mobilisation: 'full', air: 'interdiction', ceasefire: false, fronts: all(4, 'assault') };
  if (s === 'limited') return { mobilisation: 'partial', air: 'military', ceasefire: false, fronts: all(3, 'advance') };
  if (s === 'hold') return { ceasefire: false, fronts: all(3, 'hold') };
  return { ceasefire: true };
}
