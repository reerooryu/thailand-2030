import { $, el, g, isUnlocked } from './core.js';
import { render } from './dashboard.js';

export function renderNews() {
  const box = $('#news');
  box.innerHTML = '';
  if (!g.pending.length) {
    box.innerHTML = `<div class="empty">No urgent business.<br><span class="muted">The desk is clear this quarter.</span></div>`;
    return;
  }
  for (const e of g.pending) {
    const c = el('div', 'newsitem' + (e.costsAction ? ' n-war' : ''));
    c.appendChild(el('div', 'n-tag', e.costsAction ? 'WAR DECISION · TAKES 1 ACTION' : 'BLOCKING'));
    c.appendChild(el('div', 'n-head', e.headline));
    c.appendChild(el('div', 'n-body', e.body));
    const opts = el('div', 'n-opts');
    for (const o of e.options) {
      // Event options honour `requiresFlags` exactly as card options do. They did
      // not until now — the check simply was not written on this path — so a
      // gated event choice rendered as an ordinary clickable button and the gate
      // existed only in the data. Anything conditional on the tech tree was
      // therefore free.
      // Two different kinds of unselectable, and they must not render alike.
      // `unavailable` is a choice that is permanently off the table and exists
      // for the line underneath it — the flavour IS the point, so it stays. A
      // failed `requiresFlags` is a choice you have not earned yet, where the
      // flavour would be a spoiler and the note explains the gate instead.
      // Collapsing the two printed an empty "Requires:" over the joke.
      const gated = !isUnlocked(o, g.flags) && !o.unavailable;
      const locked = o.unavailable || gated;
      const b = el('button', 'opt' + (locked ? ' locked' : ''));
      b.innerHTML = `<div class="o-label">${o.label}</div>` +
        (gated
          ? `<div class="o-lock">${o.lockedNote ||
              'Requires: ' + (o.requiresFlags || []).join(', ')}</div>`
          : (o.flavour ? `<div class="o-flavour">${o.flavour}</div>` : '')) +
        (locked ? '' : renderDeltas(o.opinion));
      if (locked) b.disabled = true;
      else b.onclick = () => { g.resolveEvent(e.id, o.id); render(); };
      opts.appendChild(b);
    }
    c.appendChild(opts);
    box.appendChild(c);
  }
}

export function renderDeltas(o) {
  if (!o) return '';
  const parts = Object.entries(o).filter(([, v]) => v !== 0)
    .map(([k, v]) => `<span class="${v > 0 ? 'up' : 'down'}">${k} ${v > 0 ? '+' : ''}${v}</span>`);
  return parts.length ? `<div class="o-deltas">${parts.join('')}</div>` : '';
}
