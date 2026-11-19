import { $, ACHIEVEMENTS, BrowserGame, BUILD, COALITIONS, g, setGame, toast } from './core.js';
import { render } from './dashboard.js';
import { showEnd } from './endscreen.js';
import { renderHome } from './home.js';

/* Saved games, saved endings and the record of past playthroughs.

   A save is the list of moves, not a copy of the game. The engine is
   deterministic (its one random stream is seeded), so the same moves from the
   same coalition rebuild exactly the same game. The moves are every call the
   UI makes that changes the game: the seven methods below. Wrapping them on
   the instance records only the calls the player makes, not the ones the
   engine makes internally (the depth counter).

   Replaying is exact only on the build that recorded it. A save from another
   build still loads, with a warning: a rebalanced card plays differently.

   An ending is exported with its moves too, so on the same build it replays to
   the live end screen, hover tooltips and all. It also carries a frozen copy
   of the screen, with every map view drawn in advance and each tooltip written
   onto its path, which is what is shown once the build has moved on. The
   ending is then exactly what the player saw, whatever later balance changes
   would have made of the same moves.

   Everything kept in the browser lives in localStorage, which can be cleared
   or unavailable (private windows), so every read and write is guarded and
   every save and ending can be exported to a file and imported back. */

const KEY = { auto: 'th2030.autosave', saves: 'th2030.saves', endings: 'th2030.endings', record: 'th2030.record' };
const MOVES = ['openTurn', 'endTurn', 'playCard', 'resolveEvent', 'setDraft', 'constitutionAct', 'warOrders'];
const MAX_SAVES = 12, MAX_ENDINGS = 20;

const read = (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };
const drop = k => { try { localStorage.removeItem(k); } catch { /* no storage */ } };
export function storageWorks() {
  try { localStorage.setItem('th2030.probe', '1'); localStorage.removeItem('th2030.probe'); return true; } catch { return false; }
}

export const coalitionName = id => (COALITIONS.options.find(o => o.id === id) || {}).name || id;
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
export const when = iso => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/* ---------- recording ---------- */
export function track(game, coalition) {
  game.__coalition = coalition;
  game.__moves = [];
  let depth = 0;
  for (const m of MOVES) {
    const orig = game[m].bind(game);
    game[m] = (...args) => {
      const top = depth === 0;
      depth++;
      try {
        const r = orig(...args);
        if (top) {
          game.__moves.push([m, JSON.parse(JSON.stringify(args))]);
          if (!game.__replaying && !game.__over) autosave(game);
        }
        return r;
      } finally { depth--; }
    };
  }
  return game;
}

function saveData(game, name) {
  return {
    kind: 'thailand2030-save', format: 1, build: BUILD, savedAt: new Date().toISOString(), name: name || '',
    coalition: game.__coalition, quarter: game.quarter, label: game.label, headline: Math.round(game.headline()),
    moves: game.__moves, record: getRecord(),
  };
}

/** Rebuild a game from its moves. The dashboard's GDP sparkline is UI-side
 *  history, written on every redraw, so the replay writes it the same way. */
export function replay(data) {
  const game = track(new BrowserGame(data.coalition), data.coalition);
  game.__replaying = true;
  game.gdpTrack = [];
  let last = null, failed = 0;
  for (const [m, args] of data.moves || []) {
    if (!MOVES.includes(m)) continue;
    try {
      if (m === 'endTurn') game.gdpTrack[game.quarter] = game.headline();
      const r = game[m](...args);
      if (m === 'endTurn') last = r;
      if (m === 'openTurn') game.gdpTrack[game.quarter] = game.headline();
    } catch { failed++; }
  }
  game.__replaying = false;
  const over = !!last && last.ok && (last.snap || last.fallen || game.quarter >= 16);
  return { game, last, over, failed };
}

function showGameScreen() {
  $('#home').hidden = true;
  $('#prologue').hidden = true;
  $('#game').hidden = false;
}

function warnBuild(data, what) {
  if (data.build && data.build !== BUILD)
    toast(`This ${what} was made on another version of the game. It replays the same moves, so the numbers may differ.`, 'warning');
}

/** Pick up a saved game where it was left. */
export function resume(data) {
  const { game, last, over } = replay(data);
  mergeRecord(data.record);
  setGame(game);
  showGameScreen();
  if (window.playAnthem) window.playAnthem();
  warnBuild(data, 'save');
  if (over) { game.__over = true; showEnd(last.fallen ? last.walked : null, !!last.snap); return; }
  render();
  if (game.pending.length) toast('News requires your attention', 'warning');
}

/* ---------- the browser's own slots ---------- */
export function autosave(game = g) {
  if (!game || !game.__moves || game.__over) return;
  write(KEY.auto, saveData(game, 'Autosave'));
}
export const getAutosave = () => read(KEY.auto, null);
export const clearAutosave = () => drop(KEY.auto);
export const listSaves = () => read(KEY.saves, []);
export function saveToBrowser(game = g) {
  const list = listSaves();
  list.unshift({ id: uid(), ...saveData(game, `${coalitionName(game.__coalition)} · ${game.label}`) });
  if (!write(KEY.saves, list.slice(0, MAX_SAVES))) { toast('This browser will not keep saves here. Export the save to a file instead.', 'warning'); return false; }
  toast(`Saved: ${game.label}`, 'good');
  return true;
}
export function deleteSave(id) { write(KEY.saves, listSaves().filter(s => s.id !== id)); }

export const listEndings = () => read(KEY.endings, []);
/** Keep an ending in the browser, its frozen copy gzipped (about a tenth of
 *  the size). If even that will not fit, the oldest frozen copies go first:
 *  an ending without one still replays on the build that made it. */
export async function keepEnding(data) {
  let entry = data;
  if (data.snapshot) {
    const z = await gzip(JSON.stringify(data.snapshot));
    if (z) entry = { ...data, snapshot: null, packed: z };
  }
  const list = listEndings().filter(e => e.id !== data.id);
  list.unshift(entry);
  let kept = list.slice(0, MAX_ENDINGS);
  while (kept.length && !write(KEY.endings, kept)) {
    const big = kept.map(e => !!(e.snapshot || e.packed)).lastIndexOf(true);
    if (big < 0) { kept = kept.slice(0, -1); continue; }
    kept[big] = { ...kept[big], snapshot: null, packed: null };
  }
}
export function deleteEnding(id) { write(KEY.endings, listEndings().filter(e => e.id !== id)); }

/* ---------- the record of past playthroughs ---------- */
export function getRecord() {
  const r = read(KEY.record, null);
  return r && r.ach ? r : { plays: 0, ach: {} };
}
/** Note a finished term. Returns the names earned for the first time. */
export function recordEnding(earned, summary) {
  const r = getRecord();
  const fresh = [];
  r.plays = (r.plays || 0) + 1;
  for (const name of earned) {
    const a = r.ach[name];
    if (!a) { fresh.push(name); r.ach[name] = { first: new Date().toISOString(), times: 1, best: summary.headline }; }
    else { a.times = (a.times || 1) + 1; a.best = Math.max(a.best || 0, summary.headline); }
  }
  r.best = Math.max(r.best || 0, summary.headline);
  write(KEY.record, r);
  return fresh;
}
/** Fold another record in (from an imported file): earliest date, most times. */
export function mergeRecord(other) {
  if (!other || !other.ach) return 0;
  const r = getRecord();
  let added = 0;
  for (const [name, a] of Object.entries(other.ach)) {
    const mine = r.ach[name];
    if (!mine) { r.ach[name] = { ...a }; added++; continue; }
    if (a.first && (!mine.first || a.first < mine.first)) mine.first = a.first;
    mine.times = Math.max(mine.times || 1, a.times || 1);
    mine.best = Math.max(mine.best || 0, a.best || 0);
  }
  r.plays = Math.max(r.plays || 0, other.plays || 0);
  r.best = Math.max(r.best || 0, other.best || 0);
  write(KEY.record, r);
  return added;
}
export const allAchievements = () => ACHIEVEMENTS;

/* ---------- endings ---------- */
/** Called by the live end screen once it is drawn. `maps` are the pre-drawn
 *  views from captureMaps(). */
export function endingData({ walked, snap, elec, ideology, earned, html, maps, theme }) {
  const game = g;
  return {
    kind: 'thailand2030-ending', format: 1, build: BUILD, savedAt: new Date().toISOString(), id: uid(),
    coalition: game.__coalition, moves: game.__moves, end: { walked: walked || null, snap: !!snap },
    summary: {
      headline: Math.round(game.headline()), label: game.quarter >= 16 && !walked && !snap ? 'March 2030' : game.label,
      coalition: coalitionName(game.__coalition),
      ideology: ideology.name, seats: elec ? elec.playerSeats : null, verdict: elec ? elec.headline : (walked ? 'The government fell' : ''),
      achievements: earned,
    },
    snapshot: { html, ...pack(maps), theme },
    record: getRecord(),
  };
}

/** Draw a map view into a detached box and write each tooltip onto its path,
 *  so the frozen copy can show them without the game behind it. */
export function captureMap(draw) {
  const box = document.createElement('div');
  draw(box);
  box.querySelectorAll('path.pv, path.cv').forEach(p => {
    const tip = (p.closest('.map-wrap') || box).querySelector('.map-tip');
    if (!tip) return;
    tip.hidden = true;
    p.dispatchEvent(new Event('mouseenter'));
    if (!tip.hidden && tip.innerHTML) p.setAttribute('data-tip', tip.innerHTML);
  });
  box.querySelectorAll('.map-tip').forEach(t => { t.hidden = true; t.innerHTML = ''; });
  return box.innerHTML;
}

function wireTips(root) {
  root.querySelectorAll('path[data-tip]').forEach(p => {
    const tip = (p.closest('.map-wrap') || root).querySelector('.map-tip');
    if (!tip) return;
    const show = () => { tip.innerHTML = p.getAttribute('data-tip'); tip.hidden = false; };
    p.addEventListener('mouseenter', show);
    p.addEventListener('click', show);
    p.addEventListener('mouseleave', () => { tip.hidden = true; });
  });
}

/** Show a saved ending. On the build that made it, replay it to the live end
 *  screen; on any other, show the frozen copy. */
export async function viewEnding(data) {
  data = await unpacked(data);
  mergeRecord(data.record);
  if (data.build === BUILD && data.moves) {
    const { game, last, over } = replay(data);
    if (over) {
      game.__over = true;
      setGame(game);
      $('#home').hidden = true;
      showEnd(data.end.walked, data.end.snap, { viewing: data, earnedNow: data.summary.achievements });
      return;
    }
  }
  if (!data.snapshot || !data.snapshot.html) { toast('This ending was kept without its picture and was made on another version, so it cannot be shown.', 'warning'); return; }
  showFrozen(data);
}

function showFrozen(data) {
  $('#home').hidden = true;
  $('#game').hidden = true;
  const w = $('#prologue');
  w.hidden = false;
  w.innerHTML = viewingBanner(data, true) + data.snapshot.html;
  const maps = unpackMaps(data.snapshot);
  const put = (id, key) => { const box = w.querySelector(id); if (box && maps[key]) { box.innerHTML = maps[key]; wireTips(box); } };
  let view = 'districts', mode = '2030';
  const drawEl = () => put('#el-map', `el:${view}:${mode}`);
  drawEl();
  put('#end-map', 'end:provinces');
  w.querySelectorAll('.el-view-tg button').forEach(b => b.onclick = () => {
    w.querySelectorAll('.el-view-tg button').forEach(x => x.classList.toggle('on', x === b)); view = b.dataset.v; drawEl(); });
  w.querySelectorAll('.el-mode-tg button').forEach(b => b.onclick = () => {
    w.querySelectorAll('.el-mode-tg button').forEach(x => x.classList.toggle('on', x === b)); mode = b.dataset.m; drawEl(); });
  w.querySelectorAll('.end-map-tg button').forEach(b => b.onclick = () => {
    w.querySelectorAll('.end-map-tg button').forEach(x => x.classList.toggle('on', x === b)); put('#end-map', `end:${b.dataset.m}`); });
  wireEndActions(w, data);
  if (window.playEnding && data.snapshot.theme) window.playEnding(data.snapshot.theme);
  window.scrollTo(0, 0);
}

export function viewingBanner(data, frozen) {
  return `<div class="viewing-banner"><b>A saved ending</b> · ${data.summary.coalition} · ${data.summary.label}
    · ${data.summary.headline.toLocaleString('en-US')} USD · kept ${when(data.savedAt)}${frozen && data.build !== BUILD
    ? '<span class="muted"> · shown as it was: the game has changed since</span>' : ''}</div>`;
}

/** The buttons under an end screen: export, and leave. */
export function wireEndActions(w, data) {
  const exp = w.querySelector('#end-export');
  if (exp) exp.onclick = () => exportEnding(data);
  const again = w.querySelector('#again');
  if (again) {
    if (w.querySelector('.viewing-banner')) again.textContent = 'Back to the title screen';
    again.onclick = () => renderHome();
  }
}

/* ---------- packing the frozen copy ----------
   The eight map views share their geometry and their tooltips, so each long
   attribute value is stored once in a table and referenced from the views. */
function pack(maps) {
  const table = [], index = new Map();
  const ref = v => { let i = index.get(v); if (i === undefined) { i = table.length; table.push(v); index.set(v, i); } return i; };
  const out = {};
  for (const [k, html] of Object.entries(maps))
    out[k] = html.replace(/ (d|data-tip)="([^"]*)"/g, (all, a, v) => v.length > 24 ? ` ${a}="§${ref(v)}"` : all);
  return { maps: out, table };
}
function unpackMaps(snap) {
  const maps = (snap && snap.maps) || {};
  if (!snap.table) return maps;
  return Object.fromEntries(Object.entries(maps).map(([k, html]) =>
    [k, html.replace(/ (d|data-tip)="§(\d+)"/g, (all, a, i) => ` ${a}="${snap.table[+i] ?? ''}"`)]));
}

const toB64 = buf => { const b = new Uint8Array(buf); let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); };
const fromB64 = str => Uint8Array.from(atob(str), c => c.charCodeAt(0));
async function gzip(text) {
  try {
    if (typeof CompressionStream === 'undefined') return null;
    return toB64(await new Response(new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
  } catch { return null; }
}
async function gunzip(b64) {
  return new Response(new Blob([fromB64(b64)]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
}
/** An ending as kept in the browser, with its frozen copy unzipped again. */
async function unpacked(data) {
  if (data.snapshot || !data.packed) return data;
  try { return { ...data, snapshot: JSON.parse(await gunzip(data.packed)), packed: undefined }; }
  catch { return { ...data, packed: undefined }; }
}

/* ---------- files ---------- */
const slug = s => String(s).replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase();
function download(obj, name) {
  const blob = new Blob([JSON.stringify(obj)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
}
export function exportSave(data) {
  const d = data || saveData(g);
  download(d, `thailand2030-save-${slug(coalitionName(d.coalition))}-${slug(d.label)}.json`);
}
export async function exportEnding(data) {
  data = await unpacked(data);
  download(data, `thailand2030-ending-${slug(data.summary.coalition)}-${data.summary.headline}usd-${data.savedAt.slice(0, 10)}.json`);
}
export function exportRecord() {
  download({ kind: 'thailand2030-record', format: 1, savedAt: new Date().toISOString(), ...getRecord() },
    `thailand2030-achievements-${new Date().toISOString().slice(0, 10)}.json`);
}

/** Open a file the player exported earlier: a save, an ending or a record. */
export function importFile(after) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.onchange = () => {
    const f = input.files && input.files[0];
    if (!f) return;
    f.text().then(text => {
      let d;
      try { d = JSON.parse(text); } catch { toast('That file is not a Thailand 2030 save.', 'critical'); return; }
      if (d.kind === 'thailand2030-save') {
        const list = listSaves();
        if (!list.some(s => s.savedAt === d.savedAt && s.moves.length === d.moves.length)) {
          list.unshift({ ...d, id: uid() });
          write(KEY.saves, list.slice(0, MAX_SAVES));
        }
        resume(d);
      } else if (d.kind === 'thailand2030-ending') {
        keepEnding(d);
        viewEnding(d);
      } else if (d.kind === 'thailand2030-record') {
        const n = mergeRecord(d);
        toast(n ? `${n} achievement${n === 1 ? '' : 's'} added to your record` : 'Nothing new in that record', 'good');
        if (after) after();
      } else toast('That file is not a Thailand 2030 save.', 'critical');
    });
  };
  input.click();
}

/* ---------- the in-game menu ---------- */
export function mountGameMenu() {
  const btn = $('#game-menu-btn'), menu = $('#game-menu');
  if (!btn || !menu) return;
  const close = () => { menu.hidden = true; };
  btn.onclick = e => { e.stopPropagation(); menu.hidden = !menu.hidden; };
  document.addEventListener('click', e => { if (!menu.hidden && !menu.contains(e.target)) close(); });
  menu.innerHTML = `
    <button data-a="save">Save in this browser</button>
    <button data-a="export">Export save file</button>
    <button data-a="quit">Quit to the title screen</button>
    <div class="gm-note muted">The game also saves itself every move. Continue from the title screen.</div>`;
  menu.querySelector('[data-a=save]').onclick = () => { saveToBrowser(); close(); };
  menu.querySelector('[data-a=export]').onclick = () => { exportSave(); close(); };
  menu.querySelector('[data-a=quit]').onclick = () => { autosave(); close(); renderHome(); };
}
