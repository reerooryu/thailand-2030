import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const CONFIG = join(HERE, '..', '..', 'config');

export interface Panel {
  periods: string[];
  series: Record<string, (number | null)[]>;
}

export function loadPanel(): Panel {
  return JSON.parse(readFileSync(join(CONFIG, 'panel_quarterly.json'), 'utf8'));
}

/** Column accessor that throws loudly on a typo rather than returning undefined. */
export function col(p: Panel, name: string): (number | null)[] {
  const c = p.series[name];
  if (!c) throw new Error(`panel column not found: ${name}`);
  return c;
}

/** Index of a period label, e.g. "2000Q1". */
export function idx(p: Panel, period: string): number {
  const i = p.periods.indexOf(period);
  if (i < 0) throw new Error(`period not in panel: ${period}`);
  return i;
}
