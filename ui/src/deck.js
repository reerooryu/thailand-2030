import { $, el, g, isUnlocked, toast } from './core.js';
import { render } from './dashboard.js';

export function renderDeck() {
  const box = $('#deck');
  box.innerHTML = '';
  const cards = g.deck();
  if (!cards.length) { box.innerHTML = '<div class="empty">No cards available.</div>'; return; }
  for (const card of cards) {
    const c = el('div', 'card');
    const head = el('div', 'card-head');
    const prop = card.proposal;
    const tag = prop
      ? `<span class="prop-tag" style="--pc:${prop.colour}">${prop.party}</span>` : '';
    head.innerHTML = `<div class="cd-ministry">${card.ministry}${tag}</div>` +
                     `<div class="cd-name">${card.name}</div>` +
                     (prop ? `<div class="cd-prop">${prop.note}</div>` : '');
    head.onclick = () => c.classList.toggle('open');
    c.appendChild(head);
    const body = el('div', 'card-body');
    body.appendChild(el('div', 'cd-brief', card.briefing));
    const noActions = g.actionsThisTurn >= g.actionCap;
    for (const o of card.options) {
      const locked = o.unavailable || !isUnlocked(o, g.flags);
      const b = el('button', 'opt' + (locked ? ' locked' : ''));
      if (locked) {
        const why = o.unavailable
          ? `<div class="o-flavour">${o.flavour || ''}</div>`
          : `<div class="o-lock">${o.lockedNote || 'Requires: ' + (o.requiresFlags || []).join(', ')}</div>`;
        b.innerHTML = `<div class="o-label">${o.unavailable ? '' : '🔒 '}${o.label}</div>` + why;
        b.disabled = true;
        body.appendChild(b);
        continue;
      }
      b.disabled = noActions;
      const v = g.previewVote(card, o);
      const cross = v && v.defectorTotal
        ? `<span class="chip cross">+${v.defectorTotal} crossbench</span>` : '';
      const badge = !o.requiresLegislation
        ? '<span class="chip exec">executive</span>'
        : (v && v.passed ? `<span class="chip pass">passes +${v.margin}</span>`
                         : `<span class="chip fail">fails by ${v ? -v.margin : '?'}</span>`) + cross;
      const dep = o.dependsOn && !g.flags.has(o.dependsOn.flag)
        ? `<div class="o-dep">⚠ ×${o.dependsOn.withoutFactor} — ${o.dependsOn.note || o.dependsOn.flag}</div>` : '';
      b.innerHTML = `<div class="o-label">${o.label} ${badge}</div>` +
        (o.flavour ? `<div class="o-flavour">${o.flavour}</div>` : '') + dep +
        renderEffects(o.effects) + renderWhip(v);
      b.onclick = () => {
        const r = g.playCard(card.id, o.id);
        toast(`${card.name}: ${r.msg}`, r.ok ? 'good' : 'critical');
        render();
      };
      body.appendChild(b);
    }
    c.appendChild(body);
    box.appendChild(c);
  }
}

/* The whip count. A bill that fails should say WHY it fails and what would
   change it — that is information any chief whip would have, and without it a
   defeat reads as an arbitrary wall rather than a puzzle. */
export function renderWhip(v) {
  if (!v) return '';
  const rows = v.whip.map(p => {
    const cls = p.stance === 'yes' ? 'w-yes' : p.stance === 'abstain' ? 'w-abs' : 'w-no';
    const note = p.stance === 'yes' ? 'backs it'
      : p.redLine ? 'red line — opinion will not move them'
      : p.needed != null && p.needed <= 100 ? `needs ${p.needed} (now ${p.opinion})`
      : 'unreachable';
    const gain = v.defectors[p.party] ? ` <span class="w-cross">+${v.defectors[p.party]}</span>` : '';
    return `<tr><td class="${cls}">${p.party}</td><td class="w-seats">${p.seats}${gain}</td>
            <td class="w-note">${note}</td></tr>`;
  }).join('');
  return `<details class="whip"><summary>whip count — ${v.yes} of 251</summary>
    <table>${rows}</table></details>`;
}

/** Every effect a card can carry needs a label here, or it is applied by the
 *  engine and shown to nobody. `formalisation`, `savingsRate` and `setSupport`
 *  were missing, which made the land-titling and cooperative-debt cards look
 *  half-empty when they are among the strongest bills in the game.
 *
 *  'reform effort' is deliberately not 'reform': the number on a card is a
 *  level of EFFORT, which accumulates into the reform STOCK at about 6% a
 *  quarter against 1.5% decay, and is scaled by the coalition's reform capacity
 *  first. +55 effort under a 0.7-capacity coalition contributes roughly 33
 *  points of stock across a full term, not 55. */
export const EFFECT_LABEL = {
  capitalSpend: 'capital', transfers: 'transfers', taxRate: 'revenue', govConsumption: 'gov consumption',
  reformIndex: 'reform effort', executionBonus: 'execution', fdiSignal: 'FDI signal',
  approvalBoost: 'approval', institutionalSupport: 'institutional', humanCapital: 'human capital',
  formalisation: 'formalisation', savingsRate: 'saving', setSupport: 'market sentiment',
};
export function renderEffects(e) {
  if (!e) return '';
  const parts = Object.entries(e).filter(([k, v]) => v && EFFECT_LABEL[k])
    .map(([k, v]) => `<span class="${v > 0 ? 'up' : 'down'}">${EFFECT_LABEL[k]} ${v > 0 ? '+' : ''}${v}</span>`);
  return parts.length ? `<div class="o-deltas">${parts.join('')}</div>` : '';
}
