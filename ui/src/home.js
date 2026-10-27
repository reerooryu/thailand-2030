import { $ } from './core.js';
import { renderPrologue } from './prologue.js';

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
        <button id="home-play" class="primary home-btn">Play</button>
        <button id="home-settings" class="home-btn">Settings</button>
      </div>
      <div id="home-panel" class="home-panel" hidden></div>
    </div>`;
  background(home);
  $('#home-play').onclick = () => { home.hidden = true; $('#prologue').hidden = false; renderPrologue(); };
  $('#home-settings').onclick = () => toggleSettings();
}

function toggleSettings() {
  const panel = $('#home-panel');
  if (!panel.hidden) { panel.hidden = true; return; }
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

