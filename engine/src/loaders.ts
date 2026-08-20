/** Node-only config loaders. Kept out of the core modules so they bundle for
 *  the browser, which supplies the same data inline via src/gen/data.ts. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import type { CoalitionCfg } from './politics.js';
import type { PolicyCatalogue } from './policies.js';
import type { GameEvent } from './events.js';
import type { Supply } from './supply.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const C = (f: string) => join(HERE, '..', '..', 'config', f);
const read = (f: string) => JSON.parse(readFileSync(C(f), 'utf8'));

export const loadCoalitions = (): CoalitionCfg => read('coalitions.json');
export const loadPolicies = (): PolicyCatalogue => read('policies.json');
export const loadEvents = (): GameEvent[] => read('events.json').events;
export const loadSupply = (): Supply => read('supply.json');
export const loadShocks = () => {
  const f = read('shocks.json');
  return { gap: f.shocks, inv: f.investment_shocks ?? {} };
};
export const loadPlayability = () => read('playability.json');
