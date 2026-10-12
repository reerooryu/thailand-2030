/**
 * Alignment between the United States and China.
 *
 * Two running tallies. Any card or news option that leans one way carries an
 * `align` field ({ us: n } or { cn: n }) and adds its points when chosen. The
 * tallies never decay and are never netted out, so a government can be deep
 * in both camps' books at once, as Thailand usually is.
 *
 * Effects live on the options themselves. The tally is a record, read by the
 * end screen and by the events that ask which side you are on.
 */

export interface AlignMove { quarter: number; side: 'us' | 'cn'; points: number; what: string }
export interface AlignState { us: number; cn: number; moves: AlignMove[] }
export type Align = { us?: number; cn?: number };

export function initialAlign(): AlignState { return { us: 0, cn: 0, moves: [] }; }

export function addAlign(s: AlignState, a: Align | undefined, quarter: number, what: string): AlignState {
  if (!a) return s;
  const out = { us: s.us, cn: s.cn, moves: [...s.moves] };
  for (const side of ['us', 'cn'] as const) {
    const p = a[side] ?? 0;
    if (!p) continue;
    out[side] += p;
    out.moves.push({ quarter, side, points: p, what });
  }
  return out;
}

/** One word for where the government ended up. */
export function alignLabel(s: AlignState): string {
  const d = s.us - s.cn, total = s.us + s.cn;
  if (total === 0) return 'Unaligned';
  if (Math.abs(d) <= 1) return total >= 6 ? 'Courted by both' : 'Hedging';
  if (d >= 4) return 'Aligned with the US';
  if (d <= -4) return 'Aligned with China';
  return d > 0 ? 'Leaning US' : 'Leaning China';
}
