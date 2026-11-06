/**
 * The IMF's projection for Thailand: the only number in the game with an
 * outside author. Read from config/imf_weo_thailand.json at build time
 * (scripts/build_ui_data.py), so a new WEO vintage changes it everywhere at
 * once: run scripts/build_weo.py. Only the price part of a revision is
 * aligned automatically (PRICE_ALIGN below); see BASELINE_ALIGN in browser.ts.
 */
import { DATA } from './gen/data.js';

const W = DATA.weo as unknown as {
  source: string; extracted: string;
  gdpPerHead: Record<string, number>; cpi: Record<string, number>;
  deflator: Record<string, number>;
};

export const WEO_SOURCE = W.source;
/** GDP per head, USD, 2026..2030: the path the headline is scored against. */
export const IMF_PATH = [2026, 2027, 2028, 2029, 2030].map(y => W.gdpPerHead[String(y)]);
/** 2025 GDP per head, the level the headline grows from. */
export const IMF_2025 = W.gdpPerHead['2025'];
/** The baseline at the March 2030 count. */
export const IMF_BASELINE_2030 = Math.round(IMF_PATH[4]);

/** The vintage the headline's trend alignment was fitted to: August 2026
 *  (IMF.RES:WEO 9.0.0, extracted 2026-08-18). Its GDP deflator rose from
 *  164.620 in 2025 to 174.612 in 2030. */
const FITTED_DEFLATOR_GROWTH = 174.612 / 164.620;

/** How much more (or less) the current vintage expects prices to rise
 *  2025-2030 than the fitted one did. A higher IMF price path raises its
 *  dollar GDP per head at a fixed baht; nothing the government does earns
 *  that, so the headline is scaled by it. The real side of a revision is not
 *  aligned: the October 2026 vintage's extra real growth includes the
 *  400-billion-baht decree, which the player has to actually issue. */
export const PRICE_ALIGN = (W.deflator['2030'] / W.deflator['2025']) / FITTED_DEFLATOR_GROWTH;
