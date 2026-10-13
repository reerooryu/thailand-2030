import { $, PROVINCES, el, g } from './core.js';

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
