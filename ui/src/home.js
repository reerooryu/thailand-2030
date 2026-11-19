import { $ } from './core.js';
import { renderPrologue } from './prologue.js';
import { allAchievements, coalitionName, deleteEnding, deleteSave, exportEnding, exportRecord, exportSave,
         getAutosave, getRecord, importFile, listEndings, listSaves, resume, storageWorks, viewEnding, when } from './saves.js';

/* The title screen: Play and Settings over a faded photograph.

   The photograph is optional, like the campaign song. A news photo is not ours
   to redistribute, so it is not in the repository: drop one at
   ui/assets/home.webp and the build inlines it (window.HOME_BG); an unbundled
   page loads it from disk. Without it the screen falls back to the flag drawn
   in CSS. */

const SETTINGS_KEY = 'th2030.settings';
const DEFAULTS = { volume: 45, music: true };

export function loadSettings() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') }; }
  catch { return { ...DEFAULTS }; }
}
function saveSettings(s) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* private window */ }
}

function background(box) {
  // The bundled page sets HOME_BG to '' when it was built without the photo:
  // there is nothing on disk beside it to load, so skip the request.
  const src = window.HOME_BG ?? 'assets/home.webp';
  if (!src) return;
  const img = new Image();
  img.onload = () => { box.style.setProperty('--home-bg', `url("${src}")`); box.classList.add('has-photo'); };
  img.src = src;
}

export function renderHome() {
  const auto = getAutosave();
  openPanel = null;
  $('#game').hidden = true;
  $('#prologue').hidden = true;
  const home = $('#home');
  home.hidden = false;
  home.innerHTML = `
    <div class="home-bg"></div>
    <div class="home-inner">
      <div class="home-kicker">February 2026 – March 2030</div>
      <h1 class="home-title">Thailand 2030</h1>
      <p class="home-sub">Sixteen quarters, one coalition and a promise of 15,000 dollars a head.</p>
      <div class="home-menu">
        ${auto ? `<button id="home-continue" class="primary home-btn">Continue</button>
        <div class="home-cont muted">${coalitionName(auto.coalition)} · ${auto.label} · ${auto.headline.toLocaleString('en-US')} USD</div>` : ''}
        <button id="home-play" class="${auto ? '' : 'primary '}home-btn">${auto ? 'New game' : 'Play'}</button>
        <button id="home-load" class="home-btn">Load</button>
        <button id="home-ach" class="home-btn">Achievements</button>
        <button id="home-settings" class="home-btn">Settings</button>
      </div>
      <div id="home-panel" class="home-panel" hidden></div>
    </div>`;
  background(home);
  $('#home-play').onclick = () => { home.hidden = true; $('#prologue').hidden = false; renderPrologue(); };
  if (auto) $('#home-continue').onclick = () => resume(auto);
  $('#home-load').onclick = () => togglePanel('load', loadPanel);
  $('#home-ach').onclick = () => togglePanel('ach', achievementsPanel);
  $('#home-settings').onclick = () => togglePanel('settings', settingsPanel);
}

let openPanel = null;
function togglePanel(kind, draw) {
  const panel = $('#home-panel');
  if (!panel.hidden && openPanel === kind) { panel.hidden = true; openPanel = null; return; }
  openPanel = kind;
  panel.className = 'home-panel' + (kind === 'settings' ? '' : ' wide');
  draw(panel);
  panel.hidden = false;
}

const noStorage = () => storageWorks() ? ''
  : '<div class="hp-note warning-text">This browser is not keeping anything here (a private window, or storage turned off). Export to a file to keep your progress.</div>';

/* Saved games and saved endings: the browser's own, and files. */
function loadPanel(panel) {
  const saves = listSaves(), auto = getAutosave(), endings = listEndings();
  const saveRow = (sv, i) => `<div class="hp-item">
      <div class="hp-item-main"><b>${coalitionName(sv.coalition)} · ${sv.label}</b>
        <span class="muted">${sv.headline.toLocaleString('en-US')} USD · ${sv.name === 'Autosave' ? 'autosave' : 'saved'} ${when(sv.savedAt)}</span></div>
      <div class="hp-item-btns"><button data-load="${i}">Load</button><button data-exp="${i}">Export</button>${sv.id ? `<button data-del="${sv.id}" aria-label="Delete">✕</button>` : ''}</div>
    </div>`;
  const all = [...(auto ? [auto] : []), ...saves];
  const endRow = (e, i) => `<div class="hp-item">
      <div class="hp-item-main"><b>${e.summary.coalition} · ${e.summary.headline.toLocaleString('en-US')} USD</b>
        <span class="muted">${e.summary.ideology} · ${e.summary.achievements.length} achievement${e.summary.achievements.length === 1 ? '' : 's'} · ${when(e.savedAt)}</span></div>
      <div class="hp-item-btns"><button data-view="${i}">View</button><button data-eexp="${i}">Export</button><button data-edel="${e.id}" aria-label="Delete">✕</button></div>
    </div>`;
  panel.innerHTML = `
    <div class="hp-title">Saved games</div>
    ${all.length ? all.map(saveRow).join('') : '<div class="hp-note muted">No saved games yet. Save from the menu during a game, or it saves itself as you play.</div>'}
    <div class="hp-title hp-gap">Endings</div>
    ${endings.length ? endings.map(endRow).join('') : '<div class="hp-note muted">Every finished term is kept here, so you can look at its end screen again.</div>'}
    <div class="hp-foot"><button id="hp-import" class="ghost">Open a file…</button>
      <span class="muted">a save, an ending or an achievements record you exported</span></div>
    ${noStorage()}`;
  panel.querySelectorAll('[data-load]').forEach(b => b.onclick = () => resume(all[+b.dataset.load]));
  panel.querySelectorAll('[data-exp]').forEach(b => b.onclick = () => exportSave(all[+b.dataset.exp]));
  panel.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { deleteSave(b.dataset.del); loadPanel(panel); });
  panel.querySelectorAll('[data-view]').forEach(b => b.onclick = () => viewEnding(endings[+b.dataset.view]));
  panel.querySelectorAll('[data-eexp]').forEach(b => b.onclick = () => exportEnding(endings[+b.dataset.eexp]));
  panel.querySelectorAll('[data-edel]').forEach(b => b.onclick = () => { deleteEnding(b.dataset.edel); loadPanel(panel); });
  $('#hp-import').onclick = () => importFile(() => loadPanel(panel));
}

/* Every achievement, and which ones any playthrough in this browser has earned. */
function achievementsPanel(panel) {
  const rec = getRecord(), list = allAchievements();
  const got = list.filter(a => rec.ach[a.name]);
  const order = { legendary: 0, rare: 1, uncommon: 2, common: 3 };
  const sorted = [...list].sort((a, b) => (!!rec.ach[b.name] - !!rec.ach[a.name]) || order[a.rarity] - order[b.rarity]);
  panel.innerHTML = `
    <div class="hp-title">Achievements · ${got.length} of ${list.length}</div>
    <div class="hp-note muted">${rec.plays ? `Across ${rec.plays} finished term${rec.plays === 1 ? '' : 's'}${rec.best ? `, best ${rec.best.toLocaleString('en-US')} USD a head` : ''}.` : 'Finish a term to start the record.'}</div>
    <div class="ach-grid hp-ach">${sorted.map(a => {
      const r = rec.ach[a.name];
      return `<div class="ach ${r ? 'got' : 'locked'} r-${a.rarity}">
        <div class="ach-h"><span class="ach-name">${r ? a.name : '???'}</span><span class="ach-rarity">${a.rarity}</span></div>
        <div class="ach-req">${a.requirement}</div>
        ${r ? `<div class="ach-when">First earned ${when(r.first)}${r.times > 1 ? ` · ${r.times} times` : ''}</div>` : ''}
      </div>`; }).join('')}</div>
    <div class="hp-foot"><button id="hp-rexp" class="ghost">Export record</button><button id="hp-rimp" class="ghost">Import record…</button>
      <span class="muted">Opening an exported save or ending adds its achievements too.</span></div>
    ${noStorage()}`;
  $('#hp-rexp').onclick = () => exportRecord();
  $('#hp-rimp').onclick = () => importFile(() => achievementsPanel(panel));
}

function settingsPanel(panel) {
  const s = loadSettings();
  panel.innerHTML = `
    <div class="hp-title">Settings</div>
    <label class="hp-row"><span>Music</span>
      <input type="checkbox" id="set-music" ${s.music ? 'checked' : ''}></label>
    <label class="hp-row"><span>Volume</span>
      <input type="range" id="set-volume" min="0" max="100" step="5" value="${s.volume}">
      <b id="set-volume-v">${s.volume}</b></label>
    <div class="hp-note muted">The campaign song starts when you choose a coalition; the ending theme plays on the final screen.</div>`;
  panel.hidden = false;
  const apply = () => {
    const next = { volume: +$('#set-volume').value, music: $('#set-music').checked };
    $('#set-volume-v').textContent = next.volume;
    saveSettings(next);
    if (window.applyMusicSettings) window.applyMusicSettings(next);
  };
  $('#set-volume').oninput = apply;
  $('#set-music').onchange = apply;
}

