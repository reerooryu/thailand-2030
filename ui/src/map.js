import { $, PROVINCES, CONSTITUENCIES, COALITIONS, el, g } from './core.js';

/* The provinces. Plain grey; colour only marks a status that differs from the
   default. Bangkok is a special administrative area from the start; provinces
   join it when the constitution's elected-governor pilot is ratified. */
export function renderMap() { renderMapInto($('#map')); }

/* Draw the province map into `box`. mode 'flag' lays the Thai flag over the
   whole Kingdom (annexed provinces included); 'provinces' is the normal map. */
export function renderMapInto(box, mode = 'provinces') {
  if (!box || !PROVINCES) return;
  // Preview of the territory layers for review: open the game with #mapdemo.
  if (location.hash === '#mapdemo' && !Object.keys(g.territory).length)
    g.territory = { phra_tabong: 'annexed', phibunsongkhram: 'occupied', nakhon_champassak: 'disputed' };
  const pilots = new Set(g.pilotGovernors());
  const terr = g.territory || {};
  const TERR = { disputed: 'Disputed', occupied: 'Under Thai occupation', annexed: 'Annexed as a province of Thailand' };
  const front = id => g.war && g.war.fronts[id];
  const status = p => p.historic ? `${TERR[terr[p.id]]}${front(p.id) && front(p.id).entered ? ` · held ${Math.round(front(p.id).occ)}% · dissent ${Math.round(front(p.id).dissent)}%` : ''} · today ${p.modern}`
    : p.id === 'bkk' ? 'Special administrative area, elected governor'
    : pilots.has(p.id) ? 'Elected governor (pilot, new constitution)' : '';
  const flag = mode === 'flag';
  const uid = box.id || 'map';
  const cls = p => p.water ? 'pv-water'
    : flag && (!p.historic || terr[p.id] === 'annexed') ? 'pv pv-flag'
    : p.historic ? `pv pv-${terr[p.id]}`
    : (p.id === 'bkk' || pilots.has(p.id)) ? 'pv pv-special' : 'pv';
  const fill = p => p.historic && terr[p.id] === 'occupied' && !flag ? ` style="fill:url(#${uid}-hatch)"`
    : p.historic && terr[p.id] === 'occupied' ? ` style="fill:url(#${uid}-hatch)"` : '';
  // At annexation Phibunsongkhram takes the name of its 1941 capital, Sisophon:
  // the 1941 map without the 1941 dictator's name on it.
  const renamed = h => h.id === 'phibunsongkhram' && terr[h.id] === 'annexed'
    ? { ...h, name: 'Sisophon', blurb: 'Phibunsongkhram in 1941, renamed at annexation after its old capital. ' + h.blurb } : h;
  const shown = [...PROVINCES.provinces,
    ...(PROVINCES.historic || []).filter(h => terr[h.id]).map(h => ({ ...renamed(h), historic: true }))];
  const kingdom = shown.filter(p => !p.water && (!p.historic || terr[p.id] === 'annexed'));
  const key = mode + '|' + [...pilots].join(',') + '|' + JSON.stringify(terr) + '|' + JSON.stringify(g.war ? g.war.fronts : {});
  if (box.dataset.key === key && box.firstChild) return;
  box.dataset.key = key;
  const nT = Object.keys(terr).length;
  const [, , VW, VH] = PROVINCES.viewBox.split(' ').map(Number);
  // Thai flag, 1:1:2:1:1 horizontal bands, clipped to the Kingdom's outline.
  const flagLayer = flag ? `<clipPath id="${uid}-clip">${kingdom.map(p => `<path d="${p.path}"/>`).join('')}</clipPath>
    <g clip-path="url(#${uid}-clip)" pointer-events="none">
      <rect x="0" y="0" width="${VW}" height="${VH}" fill="#a51931"/>
      <rect x="0" y="${VH / 6}" width="${VW}" height="${VH * 4 / 6}" fill="#f4f5f8"/>
      <rect x="0" y="${VH * 2 / 6}" width="${VW}" height="${VH * 2 / 6}" fill="#2d2a4a"/></g>` : '';
  box.innerHTML = `<div class="map-wrap"><svg class="map-svg" viewBox="${PROVINCES.viewBox}" role="img" aria-label="Map of Thailand's provinces">
    <defs><pattern id="${uid}-hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="4" height="4" fill="#5a5f66"/><rect width="2" height="4" fill="#d8443a"/></pattern></defs>
    ${shown.map(p => `<path class="${cls(p)}" data-id="${p.id}" d="${p.path}"${fill(p)}></path>`).join('')}
    ${flagLayer}
    </svg><div class="map-tip" hidden></div></div>
    ${flag ? '' : `<div class="map-legend"><span class="sw sw-special"></span>Special administration${pilots.size ? ` · ${pilots.size + 1} provinces` : ''}
      ${nT ? `<span class="sw sw-occupied"></span>Occupied <span class="sw sw-annexed"></span>Annexed` : ''}</div>`}`;
  const tip = box.querySelector('.map-tip');
  const byId = Object.fromEntries(shown.map(p => [p.id, p]));
  box.querySelectorAll('path.pv').forEach(el => {
    const show = () => {
      const p = byId[el.dataset.id], st = status(p);
      tip.innerHTML = `<b>${p.name}</b>${st ? `<span class="map-st">${st}</span>` : ''}<span>${p.blurb}</span>`;
      tip.hidden = false;
    };
    el.addEventListener('mouseenter', show);
    el.addEventListener('click', show);
    el.addEventListener('mouseleave', () => { tip.hidden = true; });
  });
}

/* The 2030 count, province by province. Each province takes the colour of the
   party that won most of its constituency seats, shaded by how much of the
   province it won. 'change' colours provinces by the party that gained most
   seats on 2026, and leaves the unchanged ones grey. Annexed provinces appear
   when they voted. */
export function renderElectionMap(box, elec, mode = '2030') {
  if (!box || !PROVINCES || !elec || !elec.provinces) return;
  const colours = COALITIONS.seatColours || {};
  const R = elec.provinces;
  const order = ['Bhumjaithai', "People's", 'Pheu Thai', 'Kla Tham', 'Democrat', 'Others'];
  const top = seats => order.reduce((b, p) => (seats[p] > (seats[b] || 0) ? p : b), order[0]);
  const tot = seats => order.reduce((a, p) => a + (seats[p] || 0), 0);
  const gain = r => order.map(p => [p, (r.seats[p] || 0) - (r.seats2026[p] || 0)]).sort((a, b) => b[1] - a[1])[0];
  const paint = r => {
    if (mode === 'change') {
      if (r.annexed) return [colours[top(r.seats)], 1];
      const [p, d] = gain(r);
      return d > 0 ? [colours[p], Math.min(1, 0.45 + d / Math.max(1, tot(r.seats)))] : [null, 0];
    }
    const s = mode === '2026' ? r.seats2026 : r.seats;
    const n = tot(s); if (!n) return [null, 0];
    const p = top(s);
    return [colours[p], 0.4 + 0.6 * (s[p] / n)];
  };
  const shown = [...PROVINCES.provinces,
    ...(PROVINCES.historic || []).filter(h => R[h.id]).map(h => ({ ...h, historic: true,
      ...(h.id === 'phibunsongkhram' ? { name: 'Sisophon' } : {}) }))];
  const uid = box.id || 'elmap';
  const seatLine = s => order.filter(p => s[p]).map(p =>
    `<span class="em-chip"><i style="background:${colours[p]}"></i>${p} ${s[p]}</span>`).join('');
  const shareLine = sh => order.filter(p => sh[p] >= 3).sort((a, b) => sh[b] - sh[a]).slice(0, 4)
    .map(p => `${p} ${sh[p].toFixed(0)}%`).join(' · ');
  box.innerHTML = `<div class="map-wrap"><svg class="map-svg" viewBox="${PROVINCES.viewBox}" role="img" aria-label="Election map, ${mode}">
    ${shown.map(p => {
      if (p.water) return `<path class="pv-water" d="${p.path}"></path>`;
      const r = R[p.id]; const [c, o] = r ? paint(r) : [null, 0];
      return `<path class="pv pv-el${p.historic ? ' pv-annexed' : ''}" data-id="${p.id}" d="${p.path}"${c ? ` style="fill:${c};fill-opacity:${o.toFixed(2)}"` : ''}></path>`;
    }).join('')}
    </svg><div class="map-tip" hidden></div></div>
    <div class="map-legend">${mode === 'change'
      ? 'Coloured by the party that gained most seats on 2026 · grey: no change'
      : `Coloured by the party with most ${mode} constituency seats · paler: split province`}</div>`;
  const tip = box.querySelector('.map-tip');
  const byId = Object.fromEntries(shown.map(p => [p.id, p]));
  box.querySelectorAll('path.pv').forEach(el => {
    const show = () => {
      const p = byId[el.dataset.id], r = R[p.id];
      if (!r) { tip.hidden = true; return; }
      tip.innerHTML = `<b>${p.name}</b>
        <span class="map-st">${r.annexed ? 'Annexed · voting for the first time' : `2026: ${seatLine(r.seats2026)}`}</span>
        <span>2030: ${seatLine(r.seats)}</span>
        <span class="muted">Vote 2030: ${shareLine(r.share)}${r.annexed ? '' : `<br>Vote 2026: ${shareLine(r.share2026)}`}</span>
        ${r.districts !== tot(r.seats) ? `<span class="muted">${r.districts} multi-member district${r.districts > 1 ? 's' : ''}</span>` : ''}`;
      tip.hidden = false;
    };
    el.addEventListener('mouseenter', show);
    el.addEventListener('click', show);
    el.addEventListener('mouseleave', () => { tip.hidden = true; });
  });
}

/* The count, constituency by constituency: the 400 seats of 2026 as they fell
   in 2030 (or 2026), a Bangkok inset, and the party-list seats as a grid.
   Districts merged by a new constitution share the colour of the seat they
   became. Annexed provinces have no 2026 districts and are drawn whole. */
const ELPARTIES = ['Bhumjaithai', "People's", 'Pheu Thai', 'Kla Tham', 'Democrat', 'Others'];
const BKK_VIEW = '196 432 60 60';
export function renderConstituencyMap(box, elec, mode = '2030') {
  if (!box || !CONSTITUENCIES || !elec || !elec.districts) return;
  const colours = COALITIONS.seatColours || {};
  const col = i => (i >= 0 ? colours[ELPARTIES[i]] : null);
  const names = Object.fromEntries([...PROVINCES.provinces, ...(PROVINCES.historic || [])].map(p => [p.id, p.name]));
  names.phibunsongkhram = 'Sisophon';
  const D = elec.districts;
  const fillOf = (k) => {
    const r = D[k]; if (!r) return null;
    if (mode === '2026') return col(r.w26);
    if (mode === 'change') return r.w26 < 0 || r.w !== r.w26 ? col(r.w) : null;
    return col(r.w);
  };
  const paths = Object.entries(CONSTITUENCIES.districts).map(([k, d]) => {
    const c = fillOf(k);
    return `<path class="cv" data-k="${k}" d="${d}"${c ? ` style="fill:${c}"` : ''}></path>`;
  }).join('');
  // annexed provinces, drawn whole in the winner's colour
  const annexed = mode === '2026' ? '' : (PROVINCES.historic || []).filter(h => elec.provinces[h.id]).map(h => {
    const s = elec.provinces[h.id].seats;
    const top = ELPARTIES.reduce((b, p) => (s[p] > (s[b] || 0) ? p : b), ELPARTIES[0]);
    return `<path class="cv cv-annexed" data-a="${h.id}" d="${h.path}" style="fill:${colours[top]}"></path>`;
  }).join('');
  const water = PROVINCES.provinces.filter(p => p.water).map(p => `<path class="pv-water" d="${p.path}"></path>`).join('');
  // the list, as a grid of seats in House order
  const ls = mode === '2026' ? elec.listSeats.y2026 : elec.listSeats.y2030;
  const order = ['Bhumjaithai', 'Pheu Thai', 'Others', 'Democrat', 'Kla Tham', "People's"];
  const seats = order.flatMap(p => Array(ls[p] || 0).fill(p));
  const cols = 10, R = 4.2, S = 11;
  const grid = seats.map((p, i) => `<circle cx="${(i % cols) * S + R + 1}" cy="${Math.floor(i / cols) * S + R + 1}" r="${R}" fill="${colours[p]}"><title>${p}</title></circle>`).join('');
  const gh = Math.ceil(seats.length / cols) * S + 2;
  const listTotal = seats.length;
  const legend = order.filter(p => ls[p]).map(p => `<span class="em-chip"><i style="background:${colours[p]}"></i>${p} ${ls[p]}</span>`).join('');
  box.innerHTML = `<div class="cm-grid">
    <div class="map-wrap cm-main"><svg class="map-svg" viewBox="${CONSTITUENCIES.viewBox}" role="img" aria-label="Constituency map, ${mode}">${water}${paths}${annexed}</svg><div class="map-tip" hidden></div></div>
    <div class="cm-side">
      <div class="cm-h">Bangkok and around</div>
      <div class="map-wrap cm-inset"><svg class="map-svg" viewBox="${BKK_VIEW}" role="img" aria-label="Bangkok constituencies">${paths}</svg><div class="map-tip" hidden></div></div>
      <div class="cm-h">Party list · ${listTotal} seats${mode === 'change' ? ' (2030)' : ''}</div>
      <svg class="cm-list" viewBox="0 0 ${cols * S + 2} ${gh}" role="img" aria-label="Party-list seats">${grid}</svg>
      <div class="cm-legend">${legend}</div>
    </div></div>
    <div class="map-legend">${mode === 'change'
      ? 'Coloured where the seat changed hands since 2026 · grey: held'
      : `Each 2026 constituency in the colour of who won it${mode === '2030' && elec.system.blockVote ? ' (merged districts share their slate\'s colour)' : ''}`}</div>`;
  const pct = v => ELPARTIES.map((p, i) => [p, v[i]]).filter(x => x[1] >= 3).sort((a, b) => b[1] - a[1]).slice(0, 4)
    .map(([p, x]) => `${p} ${x.toFixed(0)}%`).join(' · ');
  const chip = i => (i >= 0 ? `<span class="em-chip"><i style="background:${col(i)}"></i>${ELPARTIES[i]}</span>` : '—');
  box.querySelectorAll('.map-wrap').forEach(wrap => {
    const tip = wrap.querySelector('.map-tip');
    wrap.querySelectorAll('path.cv').forEach(el => {
      const show = () => {
        if (el.dataset.a) {
          const r = elec.provinces[el.dataset.a];
          tip.innerHTML = `<b>${names[el.dataset.a]}</b><span class="map-st">Annexed · voting for the first time</span>
            <span>2030: ${ELPARTIES.filter(p => r.seats[p]).map(p => `${p} ${r.seats[p]}`).join(' · ')}</span>
            <span class="muted">Vote 2030: ${ELPARTIES.filter(p => r.share[p] >= 3).map(p => `${p} ${r.share[p].toFixed(0)}%`).join(' · ')}</span>`;
        } else {
          const k = el.dataset.k, r = D[k]; if (!r) return;
          const [p, n] = [k.slice(0, k.lastIndexOf('-')), k.slice(k.lastIndexOf('-') + 1)];
          tip.innerHTML = `<b>${names[p]} ${n}</b>
            <span>2030: ${chip(r.w)} &nbsp; 2026: ${chip(r.w26)}</span>
            <span class="muted">Vote 2030: ${pct(r.v)}<br>Vote 2026: ${pct(r.v26)}</span>
            ${r.with ? `<span class="muted">Merged with ${r.with.map(x => x.replace(/^(.*)-(\d+)$/, (_, a, b) => `${names[a]} ${b}`)).join(', ')}</span>` : ''}`;
        }
        tip.hidden = false;
      };
      el.addEventListener('mouseenter', show);
      el.addEventListener('click', show);
      el.addEventListener('mouseleave', () => { tip.hidden = true; });
    });
  });
}
