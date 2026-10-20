/* ---- campaign song -------------------------------------------------------
   Three sources, tried in order, because the recording is not ours to ship:

     1. the local mp3, inlined at build time if it is present on disk
     2. the YouTube embed, streamed from the rights holder's own upload
     3. nothing at all — the transport hides and the game is silent

   WHEN IT STARTS. Not on load: on the coalition choice, three seconds into the
   track, so the song opens as the government forms rather than over an empty
   title screen. That timing is also what makes the audio simple — playback
   begun inside a click handler is a user gesture, so no browser blocks it and
   none of the muted-autoplay machinery this used to need survives. The
   transport is a genuine play/pause from then on; once it has been paused
   deliberately, nothing starts it again behind the player's back. */
export const ANTHEM_IN = 3;   // seconds to skip — the intro is instrumental

/* Ending themes by revealed ideology. YouTube id and start time in seconds. */
export const ENDING_THEMES = {
  'Big Push Developmentalism':      { id: 'pdfk9O3zZ7E', start: 139, title: 'โนพลอมแพลม', sub: 'Big Push Developmentalism' },
  'Developmental Statism':          { id: 'qPZE24ybIpo', start: 104, title: 'เพียงแค่ใจเรารักกัน', sub: 'Developmental Statism' },
  'Chinese Developmentalism':       { id: 'Kk8YzHeE7Sg', start: 137, title: 'Blazing Red Tassel', sub: 'Chinese Developmentalism' },
  'Authoritarian Developmentalism': { id: 'xKjr8QlDoDY', start: 0,   title: 'เมียรายเดือน', sub: 'Authoritarian Developmentalism' },
  'Social Democracy':               { id: '5r4zSObI2F8', start: 0,   title: 'ลาวม่านแก้ว', sub: 'Social Democracy' },
};
(function music() {
  const btn = document.getElementById('mus-toggle');
  const box = document.getElementById('player');
  if (!btn || !box) return;
  const hide = () => { box.style.display = 'none'; };

  let userPaused = false, playing = false, started = false;
  // Volume and on/off from the title screen's settings (home.js writes them).
  let settings = { volume: 45, music: true };
  try { settings = { ...settings, ...JSON.parse(localStorage.getItem('th2030.settings') || '{}') }; } catch { /* no storage */ }
  const vol = () => settings.volume;
  let localEl = null, ytPlayer = null;
  const paint = () => {
    btn.textContent = muted ? '🔇' : playing ? '❙❙' : '▶';
    box.classList.toggle('paused', !playing);
  };

  const local = el => {
    localEl = el; el.volume = vol() / 100;
    const sync = () => { playing = !el.paused; paint(); };
    const play = () => el.play().then(sync).catch(() => {});
    // currentTime cannot be set before the browser knows how long the track is.
    const seekIn = () => { try { el.currentTime = ANTHEM_IN; } catch { /* not seekable yet */ } };
    window.playAnthem = () => {
      warmYT();
      if (started || userPaused || !settings.music) return;
      started = true;
      if (el.readyState >= 1) { seekIn(); play(); }
      else el.addEventListener('loadedmetadata', () => { seekIn(); play(); }, { once: true });
    };
    btn.onclick = () => {
      if (el.paused) { userPaused = false; started = true; play(); }
      else { userPaused = true; el.pause(); sync(); }
    };
    el.onplay = sync; el.onpause = sync;
    paint();
  };

  // The ending theme (set by playEnding) loops itself rather than falling back
  // to the campaign song when the video ends.
  let ending = null;
  const onState = (p, e) => {
    playing = e.data === window.YT.PlayerState.PLAYING; paint();
    if (ending && e.data === window.YT.PlayerState.ENDED) { p.seekTo(ending.start, true); p.playVideo(); }
  };
  let ytShared = null;              // { player, ready } once any YouTube player exists
  const loadApi = (boot, fail) => {
    if (window.YT && window.YT.Player) return boot();
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { if (prev) prev(); boot(); };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.onerror = fail;
    document.head.appendChild(s);
  };

  const youtube = id => {
    const frame = document.getElementById('yt-frame');
    if (!frame || !window.location.protocol.startsWith('http')) return hide();
    let player = null, ready = false, wanted = false;
    // If the API never arrives — offline, blocked, or the embed is disabled for
    // this video — there is nothing to control, so remove the transport rather
    // than leaving a button that does nothing.
    const giveUp = setTimeout(() => { if (!ready) hide(); }, 8000);
    const go = () => { player.seekTo(ANTHEM_IN, true); player.playVideo(); };

    const boot = () => {
      player = new window.YT.Player('yt-frame', {
        videoId: id, host: 'https://www.youtube-nocookie.com',
        // `playlist` set to the same id is what makes loop work on a single video.
        playerVars: { autoplay: 0, loop: 1, playlist: id, controls: 0, disablekb: 1,
                      modestbranding: 1, playsinline: 1, rel: 0 },
        events: {
          onReady: e => {
            ready = true; clearTimeout(giveUp);
            ytShared = { player, ready: true }; ytPlayer = player;
            e.target.setVolume(vol());
            // The coalition may well have been chosen while the embed was still
            // loading; honour the request rather than dropping it.
            if (wanted && !userPaused) go();
            paint();
          },
          onStateChange: e => onState(player, e),
          onError: () => { clearTimeout(giveUp); if (!ending) hide(); },
        },
      });
    };

    window.playAnthem = () => {
      if (started || userPaused || !settings.music) return;
      started = true; wanted = true;
      if (ready) go();
    };
    btn.onclick = () => {
      if (!player || !ready) return;
      started = true;
      if (playing) { userPaused = true; player.pauseVideo(); }
      else { userPaused = false; wanted = true; go(); }
    };

    loadApi(boot, () => { clearTimeout(giveUp); hide(); });
    paint();
  };

  /* Ending themes, one per revealed ideology. Streamed from YouTube in every
     build (there is no local copy), so a file:// page keeps the campaign song.

     Browsers only allow sound that starts inside a click. The end screen opens
     from the End-turn click, but creating a YouTube player then is too slow:
     it finishes after the click has expired. So the mp3 build creates a silent
     player at the coalition choice, and the ending reuses it at once. If the
     browser still refuses, the theme starts muted and the play button unmutes. */
  let pendingEnding = null, muted = false;
  const warmYT = () => {
    if (ytShared || warmYT.busy || !window.location.protocol.startsWith('http')) return;
    warmYT.busy = true;
    loadApi(() => {
      const p = new window.YT.Player('yt-frame', {
        videoId: Object.values(ENDING_THEMES)[0].id, host: 'https://www.youtube-nocookie.com',
        playerVars: { autoplay: 0, controls: 0, disablekb: 1, modestbranding: 1, playsinline: 1, rel: 0 },
        events: {
          onReady: () => { ytShared = { player: p, ready: true }; ytPlayer = p; if (pendingEnding) startEnding(p, pendingEnding); },
          onStateChange: e => onState(p, e),
        },
      });
    }, () => {});
  };
  const startEnding = (p, track) => {
    pendingEnding = null;
    p.setVolume(vol());
    p.loadVideoById({ videoId: track.id, startSeconds: track.start });
    if (userPaused) { p.pauseVideo(); return; }
    // Blocked: play muted rather than not at all, and let the button unmute.
    setTimeout(() => {
      if (playing || userPaused) return;
      muted = true; p.mute(); p.playVideo();
      btn.textContent = '🔇'; btn.title = 'Unmute';
    }, 1500);
  };
  window.playEnding = track => {
    if (!track || !settings.music || !window.location.protocol.startsWith('http')) return;
    const local = document.getElementById('anthem');
    if (local) local.pause();
    ending = track;
    box.style.display = '';
    const t = box.querySelector('.mus-title'), sub = box.querySelector('.mus-sub');
    if (t) t.textContent = track.title;
    if (sub) sub.textContent = track.sub || '';
    // The button controls the ending from now on, even before the player is ready.
    btn.onclick = () => {
      const p = ytShared && ytShared.player;
      if (!p) { userPaused = false; return; }
      if (muted) { muted = false; btn.title = ''; p.unMute(); p.setVolume(vol()); p.playVideo(); paint(); return; }
      if (playing) { userPaused = true; p.pauseVideo(); }
      else { userPaused = false; p.playVideo(); }
    };
    if (ytShared && ytShared.ready) return startEnding(ytShared.player, track);
    pendingEnding = track;
    warmYT();
  };

  // Settings changed on the title screen: apply the volume at once, and stop the
  // music if it was switched off. Switching it back on does not start anything;
  // the song starts at the coalition choice, or from the play button.
  window.applyMusicSettings = next => {
    settings = { ...settings, ...next };
    if (localEl) { localEl.volume = vol() / 100; if (!settings.music) { localEl.pause(); userPaused = true; } }
    if (ytPlayer && ytPlayer.setVolume) { ytPlayer.setVolume(vol()); if (!settings.music) { ytPlayer.pauseVideo(); userPaused = true; } }
    if (settings.music && !started) userPaused = false;
  };

  const el = document.getElementById('anthem');
  if (el) local(el);
  else if (window.ANTHEM_YT) youtube(window.ANTHEM_YT);
  else hide();
})();
