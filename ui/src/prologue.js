import { $, BrowserGame, COALITIONS, el, g, setGame } from './core.js';
import { render } from './dashboard.js';

/* ---------- prologue ---------- */
export function renderPrologue() {
  const wrap = $('#prologue');
  wrap.innerHTML = '';
  wrap.appendChild(el('h1', 'title', 'Thailand 2030'));
  wrap.appendChild(el('p', 'sub',
    'February 2026. Bhumjaithai holds <b>191 of 500 seats</b> — sixty short of a majority. ' +
    'Your government has promised nominal GDP per capita of <b>USD 15,000 by the end of 2030</b>. ' +
    'The IMF baseline is 9,092.<br><br>Before anything else: who governs with you?'));
  const grid = el('div', 'coalition-grid');
  for (const o of COALITIONS.options) {
    const card = el('div', 'coalition' + (o.available ? '' : ' unavailable'));
    card.appendChild(el('div', 'c-name', o.name));
    card.appendChild(el('div', 'c-seats', `${o.seats} seats <span class="muted">· +${o.seats - 251} over the line</span>`));
    card.appendChild(el('div', 'c-flavour', `“${o.flavour}”`));
    if (o.available) {
      card.appendChild(el('div', 'c-desc', o.describe));
      const deltas = Object.entries(o.opinion_delta).filter(([, v]) => v !== 0)
        .map(([k, v]) => `<span class="${v > 0 ? 'up' : 'down'}">${k} ${v > 0 ? '+' : ''}${v}</span>`).join(' ');
      card.appendChild(el('div', 'c-deltas', deltas));
      card.onclick = () => start(o.id);
    }
    grid.appendChild(card);
  }
  wrap.appendChild(grid);
}

export function start(id) {
  setGame(new BrowserGame(id));
  $('#prologue').hidden = true;
  $('#game').hidden = false;
  // The song opens here rather than on page load — see the music block at the
  // foot of this file. Called from inside the click handler deliberately: that
  // makes it a user gesture, which is what keeps every browser from blocking it.
  if (window.playAnthem) window.playAnthem();
  g.openTurn();
  render();
}
