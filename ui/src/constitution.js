import { $, COALITIONS, g, toast } from './core.js';
import { render } from './dashboard.js';

/* ---------- the constitution ---------- */
export const PARTY_SHORT = { Bhumjaithai: 'BJT', "People's": 'PP', 'Pheu Thai': 'PT', 'Kla Tham': 'KT',
                      Democrat: 'DEM', Others: 'OTH', Senate: 'SEN' };
export function partyPill(p, extra = '') {
  const c = (COALITIONS.seatColours || {})[p] || '#6b6b66';
  return `<span class="ppill${extra}" style="--pc:${c}" title="${p}">${PARTY_SHORT[p] || p}</span>`;
}
export const STAGES = [
  ['idle', 'Section 256'], ['principles', 'Principles'], ['drafting', 'Drafting'], ['final', 'Final referendum'],
];
/* Direction of a position: current text, reform (adjust / tilt) or Singapore-lite. */
export function posClass(p, i) {
  const pos = p.positions[i];
  if (pos.sgLite) return 'pk-sg';
  if (i === p.keep) return 'pk-keep';
  return pos.score >= 2 ? 'pk-tilt' : 'pk-adjust';
}

/* The constitution in force at the end of the term. */
export function renderConstitutionFinal() {
  const v = g.constitutionView();
  const stageNote = {
    ratified: `Ratified with ${v.finalYes}% yes.`,
    failed: 'The rewrite failed. The 2017 constitution stays in force.',
    idle: 'Never started. The 2017 constitution stays in force.',
  }[v.stage] || 'Unfinished at the count. The 2017 constitution stays in force.';
  const inForce = v.stage === 'ratified';
  const rows = v.parts.map(p => {
    const i = inForce ? p.selected : p.keep;
    const pos = p.positions[i];
    return `<tr><td class="cf-part">${p.name}</td>
      <td><span class="cf-pos ${posClass(p, i)}">${pos.label}</span></td>
      <td class="cf-text">${pos.text}</td></tr>`;
  }).join('');
  return `<div class="verdict cf">
    <div class="verdict-h">The Constitution in 2030</div>
    <p class="cf-note">${stageNote}${inForce ? ` Reform score ${v.score}${v.sg ? `, Singapore-lite ${v.sg}/3` : ''}.` : ''}</p>
    <table class="cf-table">${rows}</table>
    <div class="cf-key"><span class="cf-pos pk-keep">Current text</span><span class="cf-pos pk-adjust">Adjust</span><span class="cf-pos pk-tilt">Tilt</span><span class="cf-pos pk-sg">Singapore-lite</span></div>
  </div>`;
}
export function renderConstitution() {
  const box = $('#constitution');
  if (!box) return;
  const v = g.constitutionView();
  const at = STAGES.findIndex(x => x[0] === v.stage);
  const done = v.stage === 'ratified' ? 4 : at;
  const steps = STAGES.map(([id, name], i) =>
    `<div class="cs-step${i < done ? ' done' : ''}${i === at ? ' now' : ''}">${i + 1}. ${name}</div>`).join('');
  const noActions = g.actionsThisTurn >= g.actionCap;

  let status = '', action = '';
  if (v.stage === 'idle') {
    const t = v.s256;
    status = `The February referendum approved a rewrite, 60.16% yes. First, amend Section 256 to set up the drafting assembly.
      <span class="chip ${t.passes ? 'pass' : 'fail'}">${t.passes ? 'passes' : 'fails'} · ${t.house} MPs, ${t.senate} senators</span>`;
    action = 'Table the Section 256 amendment';
  } else if (v.stage === 'principles') {
    status = `Choose a position on each part. Changed clauses go to a joint sitting (351 of 700, and 67 senators). Clauses that fail keep the current text. Then the package goes to the second referendum.`;
    action = 'Put the principles to parliament and the country';
  } else if (v.stage === 'drafting') {
    status = `The drafting assembly is writing the text. It delivers in ${g.labelAt ? g.labelAt(v.draftingUntil) : 'Q' + (v.draftingUntil + 1)}. Principles approved with ${v.principlesYes}% yes.`;
  } else if (v.stage === 'final') {
    status = `The draft is ready. Call the final referendum.` +
      (g.quarter > v.electoralDeadline ? ' <span class="down">Too late for the electoral change to apply in 2030.</span>' : '');
    action = 'Call the final referendum';
  } else if (v.stage === 'ratified') {
    status = `Ratified with ${v.finalYes}% yes.`;
  } else {
    status = `The rewrite failed${v.finalYes != null ? ` at the final referendum, ${v.finalYes}% yes` : v.principlesYes != null ? ` at the second referendum, ${v.principlesYes}% yes` : ''}. It passes to the next parliament.`;
  }

  const rows = v.parts.map(p => {
    const opts = p.positions.map((pos, i) => {
      const sel = i === p.selected;
      const t = pos.tally;
      const backers = t ? t.backers.map(b => partyPill(b)).join('') : '<span class="muted">current text</span>';
      const isProp = p.proposal && p.proposal.index === i;
      const verdict = t ? `<span class="cs-v ${t.passes ? 'up' : 'down'}" title="${t.house} MPs + ${t.senate} senators. Needs 351, with at least 67 senators.">${t.passes ? '✓' : '✗'} ${t.house}+${t.senate}</span>` : '';
      return `<button class="cs-opt ${posClass(p, i)}${sel ? ' sel' : ''}${pos.sgLite ? ' sg' : ''}" data-part="${p.id}" data-i="${i}"
          ${v.editing ? '' : 'disabled'} title="${pos.text}">
          <div class="cs-ol">${pos.label}${isProp ? ' ' + partyPill(p.proposal.party, ' prop') + '<span class="cs-prop">proposal</span>' : ''} ${verdict}</div>
          ${pos.sgLite ? `<div class="cs-sg">Singapore-lite${pos.halfStrength ? ' · <span class="down">half strength without civil service reform and anti-corruption enforcement</span>' : ''}</div>` : ''}
          <div class="cs-ot">${pos.text}</div>
          <div class="cs-pills">${backers}</div>
        </button>`;
    }).join('');
    return `<div class="cs-part${p.struck ? ' struck' : ''}"><div class="cs-pn">${p.name}${p.struck ? ' <span class="down">struck</span>' : ''}</div>
      <div class="cs-opts" style="--n:${p.positions.length}">${opts}</div></div>`;
  }).join('');

  const pr = v.pressure, bb = v.backbench;
  const prCls = pr >= bb.revolt ? 'critical' : pr >= bb.warning ? 'warning' : 'good';
  const meters = `<div class="cs-meters">
      <span>Reform score <b>${v.score}</b></span>
      ${v.sg ? `<span>Singapore-lite <b class="sg-t">${v.sg}</b><span class="muted"> / 3</span></span>` : ''}
      <span>Bhumjaithai tolerance <b class="${prCls === 'good' ? '' : 'down'}">${pr}</b><span class="muted"> / warning ${bb.warning}, revolt ${bb.revolt}</span></span>
      ${v.stage === 'ratified' || v.stage === 'failed' ? '' :
        `<span>Referendum projection <b class="${v.referendum >= 50 ? 'up' : 'down'}">${v.referendum}%</b></span>`}
    </div>`;

  box.innerHTML = `<div class="cs-steps">${steps}</div>
    <div class="cs-status">${status}</div>
    ${meters}
    <div class="cs-parts">${rows}</div>
    ${action ? `<button class="primary cs-act" ${noActions || g.con.lastActQuarter === g.quarter ? 'disabled' : ''}>${action} <span class="cs-cost">· 1 action</span></button>` : ''}`;

  box.querySelectorAll('.cs-opt').forEach(b => b.onclick = () => {
    g.setDraft(b.dataset.part, +b.dataset.i); renderConstitution();
  });
  const act = box.querySelector('.cs-act');
  if (act) act.onclick = () => {
    const r = g.constitutionAct();
    toast(r.msg, r.ok ? 'good' : 'critical');
    render();
  };
}
