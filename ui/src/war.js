import { $, PROVINCES, g } from './core.js';
import { render } from './dashboard.js';

/* The Cambodian war. Shown once operations begin (war.ts). Every order here is
   free; only the six decision events in the news take an action. */
export const WAR_NAMES = { phra_tabong: 'Phra Tabong', phibunsongkhram: 'Sisophon', nakhon_champassak: 'Nakhon Champassak' };
export const MOB = [['standing', 'Standing forces', '6 brigades'], ['partial', 'Partial call-up', '9 brigades · reservists leave work'], ['full', 'Full mobilisation', '12 brigades · bigger hit to output']];
export const AIRC = [['military', 'Military targets', 'Slowest, cleanest'], ['interdiction', 'Interdiction', 'Supply lines · faster'], ['strategic', 'Strategic', 'Bridges, power · fastest, civilians pay']];
export const DIPLO = [['none', 'None', ''], ['beijing', 'Beijing back channel', 'China stays out'], ['hanoi', 'Reassure Hanoi', 'Vietnam stays out'], ['asean', 'Engage ASEAN', 'Attention falls']];
export const POSTURES = [['hold', 'Hold'], ['advance', 'Advance'], ['assault', 'Assault']];
export const RECONS = [['aid', 'Aid'], ['martial', 'Martial law'], ['crackdown', 'Crack down']];
/* Close-up of the three 1941 provinces as a campaign map. Each province is cut
   into cells with a fixed order of capture (config/provinces.json): a front at
   x% holds every cell ranked at or below x. Cells just beyond the line are
   contested, more of them while Cambodian strength is high. */
export function warMapSvg(w) {
  const meta = PROVINCES._meta || {}, [vx, vy, vw, vh] = meta.warView || [300, 395, 290, 175];
  const hist = Object.fromEntries((PROVINCES.historic || []).map(h => [h.id, h]));
  const thai = PROVINCES.provinces.filter(p => !p.water).map(p => `<path class="wm-thai" d="${p.path}"/>`).join('');
  const prov = Object.entries(w.fronts).map(([id, f]) => {
    const h = hist[id]; if (!h) return '';
    const cells = h.cells || [];
    const occ = f.occ / 100, belt = w.stage === 'war' && !w.ceasefire ? 0.04 + 0.1 * f.enemy / 100 : 0;
    if (w.annexed) return `<path class="wm-annexed" d="${h.path}"/>`;
    // The set-piece objectives count as held once they fall, whatever the percentage.
    const gateDone = id === 'phra_tabong' ? w.battambang === 'taken' : id === 'nakhon_champassak' ? w.preahVihear === 'taken' : false;
    const isHeld = c => c.r <= occ + 1e-6 || (c.gate && gateDone);
    const held = cells.filter(isHeld), cont = cells.filter(c => !isHeld(c) && c.r <= occ + belt);
    const heldD = held.map(c => c.d).join('');
    return `<clipPath id="wm-c-${id}"><path d="${h.path}"/></clipPath>
      <path class="wm-prov" d="${h.path}"/>
      <g clip-path="url(#wm-c-${id})">
        ${cells.map(c => `<path class="wm-cell" d="${c.d}"/>`).join('')}
        ${cont.map(c => `<path class="wm-cont" d="${c.d}"/>`).join('')}
        ${heldD ? `<path class="wm-front" d="${heldD}"/><path class="wm-held" d="${heldD}"/>` : ''}
      </g>
      <path class="wm-edge" d="${h.path}"/>`;
  }).join('');
  const roads = (meta.warRoads || []).map(d => `<path class="wm-road" d="${d}"/>`).join('');
  const towns = Object.entries(meta.warTowns || {}).map(([id, t]) => {
    const f = w.fronts[t.prov];
    let st = f && f.occ / 100 >= t.r - 1e-6 ? 'taken' : 'open';
    if (id === 'battambang' && w.battambang === 'siege') st = 'siege';
    if (id === 'preah_vihear' && w.preahVihear === 'bypassed') st = 'bypassed';
    if (id === 'preah_vihear' && w.preahVihear === 'taken') st = 'taken';
    if (w.annexed) st = 'taken';
    const label = t.name + (id === 'poipet' && g.flags.has('war_poipet_raided') ? ' · raided' : st === 'siege' ? ' · siege' : id === 'preah_vihear' && st === 'bypassed' ? ' · bypassed' : '');
    return `<g class="wm-mk ${st}" transform="translate(${t.xy[0]},${t.xy[1]})"><circle r="${st === 'siege' ? 5 : 2.6}" class="wm-ring"/><circle r="1.8"/><text x="3.6" y="-2.6">${label}</text></g>`;
  }).join('');
  return `<svg class="wm" viewBox="${vx} ${vy} ${vw} ${vh}" role="img" aria-label="The front">
    <defs><pattern id="wm-hatch" width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="3" height="3" fill="#3b3434"/><rect width="1.2" height="3" fill="#b33a32"/></pattern></defs>
    <g>${thai}</g>${prov}<g>${roads}</g>
    <g class="wm-arrows"></g><g class="wm-units"></g>${towns}
  </svg>`;
}
/* Arrows and brigade counters sit at the deepest held cell of each front. */
export function layoutWarMap(box, w) {
  const svg = box.querySelector('svg.wm'); if (!svg || w.stage !== 'war') return;
  const NS = 'http://www.w3.org/2000/svg';
  const arrows = svg.querySelector('.wm-arrows'), units = svg.querySelector('.wm-units');
  const hist = Object.fromEntries((PROVINCES.historic || []).map(h => [h.id, h]));
  for (const [id, f] of Object.entries(w.fronts)) {
    if (f.occ >= 100 || !hist[id]) continue;
    const cells = hist[id].cells || [];
    const occ = f.occ / 100;
    const held = cells.filter(c => c.r <= occ + 1e-6);
    const tip = held.length ? held[held.length - 1] : cells[0];
    const next = cells.find(c => c.r > occ + 1e-6) || tip;
    const box2 = d => { const t = document.createElementNS(NS, 'path'); t.setAttribute('d', d); svg.appendChild(t); const b = t.getBBox(); t.remove(); return [b.x + b.width / 2, b.y + b.height / 2]; };
    const [x0, y0] = box2(tip.d), [x1, y1] = box2(next.d);
    const ang = Math.atan2(y1 - y0, x1 - x0) * 180 / Math.PI;
    const cls = w.ceasefire ? 'hold' : f.posture;
    if (cls !== 'hold' && f.entered) {
      const a = document.createElementNS(NS, 'path');
      a.setAttribute('d', cls === 'assault' ? 'M-8,-3.5 L2.5,-3.5 L2.5,-7 L9.5,0 L2.5,7 L2.5,3.5 L-8,3.5 Z' : 'M-6,-2.2 L1.8,-2.2 L1.8,-5 L7,0 L1.8,5 L1.8,2.2 L-6,2.2 Z');
      a.setAttribute('transform', `translate(${x0},${y0}) rotate(${ang})`); a.setAttribute('class', 'wm-arrow ' + cls);
      arrows.appendChild(a);
    }
    const u = document.createElementNS(NS, 'g');
    u.setAttribute('transform', `translate(${x0 - 15},${y0 - 9})`); u.setAttribute('class', 'wm-unit');
    u.innerHTML = `<rect width="10" height="7.5" rx="1"/><text x="5" y="5.8">${f.brigades}</text>`;
    units.appendChild(u);
  }
}

export function renderWar() {
  const wrap = $('#war-wrap'), box = $('#war');
  if (!wrap || !box) return;
  const w = g.warView();
  wrap.hidden = w.stage === 'none';
  if (w.stage === 'none') return;
  const n = x => Math.round(x).toLocaleString();
  const fighting = w.stage === 'war';
  const peace = w.stage === 'won';
  const title = $('#war-wrap .panel-title');
  if (title) title.textContent = peace ? 'The New Provinces' : 'The War';
  const status = w.annexed ? 'Annexed' : peace ? `Occupation · war ended ${g.labelAt(w.wonQuarter)}`
    : w.stage === 'frozen' ? 'Ceasefire on the current line' : w.ceasefire ? 'Ceasefire (temporary)' : `At war since ${g.labelAt(w.startQuarter)}`;
  const f = g.fta;
  const chip = (label, state, cls) => `<span class="wchip ${cls}"><span class="wchip-l">${label}</span>${state}</span>`;
  const chips = [
    chip('China', w.chinaArming ? 'arming Cambodia' : 'staying out', w.chinaArming ? 'bad' : 'ok'),
    chip('Vietnam', w.vietnamArming ? 'arming Cambodia' : w.diplomacy === 'hanoi' ? 'reassured' : 'watching', w.vietnamArming ? 'bad' : w.diplomacy === 'hanoi' ? 'ok' : 'neutral'),
    chip('ASEAN', w.diplomacy === 'asean' ? 'engaged' : 'sidelined', w.diplomacy === 'asean' ? 'ok' : 'neutral'),
    chip('EU', f.suspended ? 'FTA suspended' : g.flags.has('eu_fta_restored') ? 'FTA restored' : f.stage === 'in_force' ? 'FTA in force' : 'FTA talks', f.suspended ? 'bad' : 'ok'),
  ].join('');
  const seg = (list, cur, kind) => `<div class="wseg">${list.map(([id, label, d]) =>
    `<button class="ws${cur === id ? ' on' : ''}" data-k="${kind}" data-v="${id}" title="${d || ''}"><b>${label}</b>${d ? `<span>${d}</span>` : ''}</button>`).join('')}</div>`;
  const bar = (v, cls, marks = []) => `<span class="wf-bar">${marks.map(m => `<i class="wf-mk" style="left:${m}%"></i>`).join('')}<span class="${cls}" style="width:${Math.max(0, Math.min(100, v))}%"></span></span>`;
  const POP = { phra_tabong: 1.08, phibunsongkhram: 1.6, nakhon_champassak: 0.35 };
  const fronts = Object.entries(w.fronts).map(([id, fr]) => {
    const name = WAR_NAMES[id];
    const note = id === 'phra_tabong' && w.battambang !== 'taken' ? (w.battambang === 'siege' ? 'Battambang under siege' : 'Battambang holds out at 60%')
      : id === 'nakhon_champassak' && w.preahVihear === 'open' ? 'Preah Vihear blocks the way at 40%' : '';
    const aq = fr.aidQ || 0, pop = POP[id];
    const recon = peace ? `<div class="wrecon">
        <div><b>${n(Math.min(1, aq / 4) * pop * 1e6)}</b><span>ID cards issued</span></div>
        <div><b>${n(aq * 35 * pop)}</b><span>schools rebuilt or opened</span></div>
        <div><b>${n(aq * 8 * pop)}</b><span>clinics</span></div></div>` : '';
    return `<div class="wfront ${fighting && fr.occ < 100 ? 'p-' + (w.ceasefire ? 'hold' : fr.posture) : ''}">
      <div class="wfh"><b>${name}</b><span class="muted">${note}</span></div>
      ${peace ? '' : `<div class="wfr"><span class="wf-l">Held</span>${bar(fr.occ, 'wf-occ')}<b>${n(fr.occ)}%</b></div>
      <div class="wfr"><span class="wf-l">Cambodian strength</span>${bar(fr.enemy, 'wf-en')}<b>${n(fr.enemy)}</b></div>`}
      <div class="wfr"><span class="wf-l">Dissent</span>${bar(fr.dissent, 'wf-dis', peace && !w.annexed ? [10] : [40])}<b>${fr.entered ? n(fr.dissent) + '%' : '–'}</b></div>
      ${recon}
      ${fighting && fr.occ < 100 ? `<div class="wfr wbrig"><span class="wf-l">Brigades</span>
        <button class="wb-pm" data-p="${id}" data-d="-1"${fr.brigades <= 0 ? ' disabled' : ''}>−</button><b>${fr.brigades}</b>
        <button class="wb-pm" data-p="${id}" data-d="1"${w.used >= w.pool ? ' disabled' : ''}>+</button></div>
        ${seg(POSTURES, fr.posture, 'posture:' + id)}` : ''}
      ${fr.entered || fighting ? seg(RECONS, fr.recon, 'recon:' + id) : ''}
    </div>`; }).join('');
  const integ = g.flags.has('integration_hastened') ? 'Integration hastened' : w.annexed ? 'Integration on the original timeline' : '';
  const full = fighting && !w.ceasefire && w.mobilisation === 'full' && Object.values(w.fronts).some(fr => fr.posture === 'assault' && fr.occ < 100);
  box.className = full ? 'war-full' : '';
  box.innerHTML = `${full ? '<div class="war-flag"></div><div class="war-banner"><b>Full Offensive</b><span>All as One!</span></div>' : ''}
    <div class="war-head"><b>${status}</b><span class="wchips">${chips}</span></div>
    <div class="war-top">
      <div class="war-mapbox">${warMapSvg(w)}</div>
      <div class="war-side">
        <div class="war-att"><span class="wf-l">International attention</span><b>${n(w.attention)}</b></div>
        <div class="war-attbar">${bar(w.attention, 'wf-att', [40, 60])}<div class="wat-l"><span style="left:40%">EU suspends</span><span style="left:60%">Vietnam arms</span></div></div>
        <div class="war-stats">
          <div><span class="ws-n">${n(w.thaiCasualties)}</span><span class="ws-l">Thai military killed and wounded</span></div>
          <div><span class="ws-n">${n(w.khmerCasualties)}</span><span class="ws-l">Cambodian killed and wounded</span></div>
          <div><span class="ws-n">${n(w.displaced)}</span><span class="ws-l">civilians displaced</span></div>
          <div><span class="ws-n">${fighting ? `${w.used}/${w.pool}` : n(w.avgDissent) + '%'}</span><span class="ws-l">${fighting ? 'brigades committed' : 'average dissent'}</span></div>
        </div>
      </div>
    </div>
    ${fighting ? `<div class="war-sub">Strategy</div>
      <div class="war-strat">${seg(MOB, w.mobilisation, 'mobilisation')}${seg(AIRC, w.air, 'air')}</div>
      <div class="war-strat">${seg(DIPLO, w.diplomacy, 'diplomacy')}
        <button class="ws wcf${w.ceasefire ? ' on' : ''}" data-k="ceasefire"><b>${w.ceasefire ? 'Resume operations' : 'Ceasefire'}</b><span>${w.ceasefire ? 'Fronts move again' : 'Stop all fronts; attention fades'}</span></button></div>`
      : `<div class="war-sub">Diplomacy</div>${seg(DIPLO, w.diplomacy, 'diplomacy')}`}
    <div class="war-sub">${peace ? 'Provinces' : 'Fronts'}</div><div class="war-fronts2">${fronts}</div>
    ${peace && !w.annexed ? `<div class="war-note">${w.avgDissent < 10 && Object.values(w.fronts).every(fr => fr.dissent < 10) ? 'Dissent is below 10% everywhere: the annexation bill is on your desk.' : 'The annexation bill unlocks when dissent is below 10% in all three provinces (the tick on each bar).'}</div>` : ''}
    ${integ ? `<div class="war-note">${integ}.</div>` : ''}
    ${fighting ? '<div class="war-note muted">Orders are free. War decisions in the news each take an action.</div>' : ''}`;
  layoutWarMap(box, w);
  box.querySelectorAll('button.ws').forEach(b => b.onclick = () => {
    const [k, p] = b.dataset.k.split(':'), v = b.dataset.v;
    if (k === 'ceasefire') g.warOrders({ ceasefire: !w.ceasefire });
    else if (p) g.warOrders({ fronts: { [p]: { [k]: v } } });
    else g.warOrders({ [k]: v });
    render();
  });
  box.querySelectorAll('button.wb-pm').forEach(b => b.onclick = () => {
    const p = b.dataset.p; g.warOrders({ fronts: { [p]: { brigades: w.fronts[p].brigades + +b.dataset.d } } }); render();
  });
}
