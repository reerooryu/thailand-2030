/* Entry point. The modules in ui/src/ are bundled by esbuild into ui/app.js. */
import './music.js';
import { $, g, toast } from './core.js';
import { render } from './dashboard.js';
import { showEnd } from './endscreen.js';
import { renderHome } from './home.js';

$('#end-turn').onclick = () => {
  const r = g.endTurn();
  if (!r.ok) { toast(r.msg, 'warning'); return; }
  (g.lastRatingActions || []).forEach(t => toast(t, /downgrade|negative/.test(t) ? 'warning' : 'info'));
  if (r.snap) { showEnd(null, true); return; }
  if (r.fallen) { showEnd(r.walked); return; }
  if (g.quarter >= 16) { showEnd(); return; }
  g.openTurn();
  render();
  if (g.pending.length) toast('News requires your attention', 'warning');
};

renderHome();

// Hooks for the scripted playthroughs (Playwright): the live game and a redraw.
window.__g = () => g;
window.__render = window.__r = () => render();
