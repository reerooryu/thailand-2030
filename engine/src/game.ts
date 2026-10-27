/**
 * The headless host: the browser game, minus the browser.
 *
 * This used to be a separate 440-line copy of the turn loop, and it fell behind:
 * no constitution, no ratings detail, no war, no alignment, no Deep South. Every
 * analysis tool that ran on it (the optimiser, the playthroughs, the crown
 * searches) was searching a different game from the one people play. It is now
 * the browser host itself, with the two differences the scripts rely on:
 *
 *   - endTurn(exog) takes the world as an argument, and answers any news still
 *     open with its first available option (the browser would block instead).
 *     Search scripts resolve news at the top of the turn, but a card played
 *     afterwards can raise a follow-up; `defaulted` counts these.
 *   - score() returns the summary the optimiser ranks by
 *
 * Needs engine/src/gen/data.ts, which `./build.sh` (or `npm run gen` in engine/)
 * generates from config/.
 */
import { BrowserGame } from './browser.js';
import type { Exog } from './types.js';

export class Game extends BrowserGame {
  /** News answered by default in endTurn because nothing else answered it. */
  defaulted = 0;

  /** Advance one quarter in the given world, defaulting any news left open. */
  override endTurn(exog?: Exog) {
    for (let guard = 0; this.pending.length && guard < 20; guard++) {
      const e: any = this.pending[0];
      const opts = e.options.filter((o: any) => !o.unavailable);
      let ok = false;
      // resolveEvent ignores a locked option without throwing, so success is
      // measured by the event leaving the queue.
      for (const o of opts) { this.resolveEvent(e.id, o.id); if (!this.pending.includes(e)) { ok = true; break; } }
      if (!ok) throw new Error(`turn blocked: ${e.id} has no answerable option`);
      this.defaulted++;
    }
    return super.endTurn(exog);
  }

  /** What the optimiser ranks by. */
  score() {
    const end = this.state;
    return {
      headline: this.headline(), legacy: end.potentialGrowthYoy, debtGdp: end.debtGdp,
      invRate: end.invRate, approval: this.approval, opinion: this.opinion,
      lostConfidence: this.government().fallen,
    };
  }
}
