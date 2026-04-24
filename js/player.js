/* ============================================================
   Batoot Music — Core Player Engine + API Integration
   ============================================================
   Uses Jamendo API (free, no auth required for basic calls)
   Fallback: built-in demo tracks if API unavailable
   ============================================================ */

'use strict';

// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────
const CONFIG = {
  // Jamendo API — free music API with real streamable audio
  JAMENDO_CLIENT_ID: '9e7c6c5a', // public demo client id
  JAMENDO_BASE: 'https://api.jamendo.com/v3.0',
  // iTunes Search API — free, no key needed
  ITUNES_BASE: 'https://itunes.apple.com',
  // How many tracks per fetch
  LIMIT: 20,
};

// ─────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────
const State = {
  queue: [],          // array of track objects
  currentIndex: -1,  // index in queue
  isPlaying: false,
  repeat: 'off',     // 'off' | 'one' | 'all'
  shuffle: false,
  volume: 0.8,
  currentPage: 'home',
  liked: new Set(JSON.parse(localStorage.getItem('batoot_liked') || '[]')),
  history: [],
  playlists: JSON.parse(localStorage.getItem('batoot_playlists') || '[]'),
  recentSearches: JSON.parse(localStorage.getItem('batoot_searches') || '[]'),
};

// ─────────────────────────────────────────────
// AUDIO ENGINE
// ─────────────────────────────────────────────
const audio = new Audio();
audio.volume = State.volume;
audio.crossOrigin = 'anonymous';

audio.addEventListener('timeupdate', onTimeUpdate);
audio.addEventListener('ended', onTrackEnd);
audio.addEventListener('error', onAudioError);
audio.addEventListener('loadstart', () => setPlayerLoading(true));
audio.addEventListener('canplay', () => setPlayerLoading(false));

function onTimeUpdate() {
  const pct = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0;
  setEl('#progress-fill', el => el.style.width = pct + '%');
  setEl('#current-time', el => el.textContent = formatTime(audio.currentTime));
  setEl('#total-time', el => el.textContent = formatTime(audio.duration || 0));
}

function onTrackEnd() {
  if (State.repeat === 'one') {
    audio.currentTime = 0; audio.play();
  } else {
    nextTrack();
  }
}

function onAudioError() {
  console.warn('[Batoot] Audio error, trying next track');
  nextTrack();
}

function setPlayerLoading(loading) {
  const btn = document.getElementById('play-pause-btn');
  if (!btn) return;
  btn.innerHTML = loading
    ? '<span class="material-symbols-outlined animate-spin" style="font-size:22px">autorenew</span>'
    : (State.isPlaying
      ? '<span class="material-symbols-outlined" style="font-size:22px">pause</span>'
      : '<span class="material-symbols-outlined" style="font-size:22px">play_arrow</span>');
}

// ─────────────────────────────────────────────
// PLAYBACK CONTROLS
// ─────────────────────────────────────────────
function playTrack(track, queueTracks = null) {
  if (queueTracks) State.queue = [...queueTracks];
  const idx = State.queue.findIndex(t => t.id === track.id);
  State.currentIndex = idx !== -1 ? idx : 0;
  if (idx === -1) State.queue.unshift(track);

  const t = State.queue[State.currentIndex];
  audio.src = t.audio;
  audio.play().then(() => {
    State.isPlaying = true;
    updatePlayerUI(t);
    addToHistory(t);
    updateMediaSession(t);
  }).catch(err => {
    console.warn('[Batoot] Playback blocked:', err);
    State.isPlaying = false;
  });
}

function togglePlay() {
  if (!audio.src) return;
  if (State.isPlaying) { audio.pause(); State.isPlaying = false; }
  else { audio.play(); State.isPlaying = true; }
  updatePlayBtn();
}

function nextTrack() {
  if (!State.queue.length) return;
  let idx = State.currentIndex;
  if (State.shuffle) {
    let r; do { r = Math.floor(Math.random() * State.queue.length); } while (r === idx && State.queue.length > 1);
    idx = r;
  } else {
    idx = (idx + 1) % State.queue.length;
    if (State.repeat === 'off' && idx === 0) { audio.pause(); State.isPlaying = false; updatePlayBtn(); return; }
  }
  State.currentIndex = idx;
  const t = State.queue[idx];
  audio.src = t.audio;
  audio.play();
  State.isPlaying = true;
  updatePlayerUI(t);
  addToHistory(t);
  updateMediaSession(t);
}

function prevTrack() {
  if (audio.currentTime > 3) { audio.currentTime = 0; return; }
  if (!State.queue.length) return;
  let idx = State.currentIndex - 1;
  if (idx < 0) idx = State.queue.length - 1;
  State.currentIndex = idx;
  const t = State.queue[idx];
  audio.src = t.audio;
  audio.play();
  State.isPlaying = true;
  updatePlayerUI(t);
}

function setVolume(v) {
  State.volume = Math.max(0, Math.min(1, v));
  audio.volume = State.volume;
  setEl('#volume-fill', el => el.style.width = (State.volume * 100) + '%');
}

function toggleShuffle() {
  State.shuffle = !State.shuffle;
  const btn = document.getElementById('shuffle-btn');
  if (btn) btn.classList.toggle('active', State.shuffle);
}

function toggleRepeat() {
  const modes = ['off', 'all', 'one'];
  State.repeat = modes[(modes.indexOf(State.repeat) + 1) % modes.length];
  const btn = document.getElementById('repeat-btn');
  if (!btn) return;
  btn.classList.toggle('active', State.repeat !== 'off');
  const icon = btn.querySelector('.material-symbols-outlined');
  if (icon) icon.textContent = State.repeat === 'one' ? 'repeat_one' : 'repeat';
}

function seekTo(pct) {
  if (audio.duration) audio.currentTime = audio.duration * pct;
}

// ─────────────────────────────────────────────
// PLAYER UI UPDATES
// ─────────────────────────────────────────────
function updatePlayerUI(track) {
  // Update thumbnail image
  const img = document.getElementById('player-thumb-img');
  const placeholder = document.getElementById('player-thumb-placeholder');
  if (img) {
    if (track.image) {
      img.src = track.image;
      img.alt = track.title || '';
      img.style.display = 'block';
      if (placeholder) placeholder.style.display = 'none';
    } else {
      img.style.display = 'none';
      if (placeholder) placeholder.style.display = 'flex';
    }
  }
  setEl('#player-track-name', el => el.textContent = track.title || 'Unknown Track');
  setEl('#player-artist-name', el => el.textContent = track.artist || 'Unknown Artist');
  updatePlayBtn();
  updateLikeBtn(track.id);
  // Update document title
  document.title = `${track.title} — بطوط ميوزك`;
}

function updatePlayBtn() {
  const btn = document.getElementById('play-pause-btn');
  if (!btn) return;
  btn.innerHTML = State.isPlaying
    ? '<span class="material-symbols-outlined" style="font-size:22px">pause</span>'
    : '<span class="material-symbols-outlined" style="font-size:22px">play_arrow</span>';
}

function updateLikeBtn(id) {
  const btn = document.getElementById('player-like-btn');
  if (!btn) return;
  const liked = State.liked.has(String(id));
  btn.classList.toggle('liked', liked);
  const icon = btn.querySelector('.material-symbols-outlined');
  if (icon) icon.textContent = liked ? 'favorite' : 'favorite_border';
  if (icon) icon.style.fontVariationSettings = liked ? "'FILL' 1" : "'FILL' 0";
}

function toggleLike(id) {
  const key = String(id);
  if (State.liked.has(key)) State.liked.delete(key);
  else State.liked.add(key);
  localStorage.setItem('batoot_liked', JSON.stringify([...State.liked]));
  updateLikeBtn(key);
}

// ─────────────────────────────────────────────
// MEDIA SESSION API
// ─────────────────────────────────────────────
function updateMediaSession(track) {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.title || 'Unknown',
    artist: track.artist || 'Unknown',
    album: track.album || 'Batoot Music',
    artwork: track.image ? [{ src: track.image, sizes: '300x300', type: 'image/jpeg' }] : [],
  });
  navigator.mediaSession.setActionHandler('play', () => { audio.play(); State.isPlaying = true; updatePlayBtn(); });
  navigator.mediaSession.setActionHandler('pause', () => { audio.pause(); State.isPlaying = false; updatePlayBtn(); });
  navigator.mediaSession.setActionHandler('nexttrack', nextTrack);
  navigator.mediaSession.setActionHandler('previoustrack', prevTrack);
}

// ─────────────────────────────────────────────
// API — JAMENDO (free music API)
// ─────────────────────────────────────────────
async function fetchJamendoTracks(params = {}) {
  const base = {
    client_id: CONFIG.JAMENDO_CLIENT_ID,
    format: 'json',
    limit: CONFIG.LIMIT,
    include: 'musicinfo',
    audioformat: 'mp32',
    audiodlformat: 'mp32',
    ...params,
  };
  const query = new URLSearchParams(base).toString();
  const url = `${CONFIG.JAMENDO_BASE}/tracks/?${query}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Jamendo API error');
  const data = await res.json();
  return (data.results || []).map(mapJamendoTrack);
}

function mapJamendoTrack(t) {
  return {
    id: 'j_' + t.id,
    title: t.name,
    artist: t.artist_name,
    album: t.album_name,
    image: t.album_image || t.image || null,
    audio: t.audio, // direct MP3 stream
    duration: t.duration,
    genre: t.musicinfo?.tags?.genres?.[0] || 'Various',
    source: 'jamendo',
    jamendoId: t.id,
  };
}

async function searchJamendo(query) {
  return fetchJamendoTracks({ namesearch: query });
}

async function getJamendoTrending() {
  return fetchJamendoTracks({ order: 'popularity_week', featured: 1 });
}

async function getJamendoByGenre(tag) {
  return fetchJamendoTracks({ tags: tag, order: 'popularity_week' });
}

async function getJamendoNew() {
  return fetchJamendoTracks({ order: 'releasedate_desc' });
}

// ─────────────────────────────────────────────
// HISTORY & PLAYLISTS
// ─────────────────────────────────────────────
function addToHistory(track) {
  State.history = [track, ...State.history.filter(t => t.id !== track.id)].slice(0, 50);
}

function savePlaylists() {
  localStorage.setItem('batoot_playlists', JSON.stringify(State.playlists));
}

function createPlaylist(name) {
  const pl = { id: 'pl_' + Date.now(), name, tracks: [], createdAt: Date.now() };
  State.playlists.unshift(pl);
  savePlaylists();
  return pl;
}

function addToPlaylist(playlistId, track) {
  const pl = State.playlists.find(p => p.id === playlistId);
  if (!pl) return;
  if (pl.tracks.find(t => t.id === track.id)) return;
  pl.tracks.push(track);
  savePlaylists();
}

// ─────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────
function formatTime(s) {
  if (!s || isNaN(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
}

function setEl(selector, fn) {
  const el = document.querySelector(selector);
  if (el) fn(el);
}

function el(selector) { return document.querySelector(selector); }
function els(selector) { return [...document.querySelectorAll(selector)]; }

// ─────────────────────────────────────────────
// RENDER HELPERS
// ─────────────────────────────────────────────
function renderMusicCards(tracks) {
  return tracks.map(t => `
    <div class="music-card" onclick="BatootApp.play('${t.id}')" data-id="${t.id}">
      <div class="music-card__thumb">
        ${t.image
          ? `<img src="${t.image}" alt="${escHtml(t.title)}" loading="lazy">`
          : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--primary-fixed),var(--secondary-fixed))"><span class="material-symbols-outlined" style="color:var(--primary-container);font-size:36px">music_note</span></div>`
        }
        <button class="music-card__play" onclick="event.stopPropagation();BatootApp.play('${t.id}')">
          <span class="material-symbols-outlined" style="font-size:20px">play_arrow</span>
        </button>
      </div>
      <div class="music-card__title">${escHtml(t.title)}</div>
      <div class="music-card__sub">${escHtml(t.artist)}</div>
    </div>
  `).join('');
}

function renderTrackRows(tracks, showNum = true) {
  return tracks.map((t, i) => `
    <div class="track-row ${State.queue[State.currentIndex]?.id === t.id ? 'playing' : ''}"
         onclick="BatootApp.play('${t.id}')" data-id="${t.id}">
      <div class="track-row__num">${showNum ? i + 1 : ''}</div>
      <div class="track-row__equalizer">
        <div class="eq-bar"></div><div class="eq-bar"></div><div class="eq-bar"></div>
      </div>
      <div class="track-row__thumb">
        ${t.image ? `<img src="${t.image}" alt="${escHtml(t.title)}" loading="lazy">` : ''}
      </div>
      <div class="track-row__info">
        <div class="track-row__title">${escHtml(t.title)}</div>
        <div class="track-row__artist">${escHtml(t.artist)}</div>
      </div>
      <div class="track-row__duration">${formatTime(t.duration)}</div>
      <div class="track-row__actions">
        <button class="btn-icon" onclick="event.stopPropagation();BatootApp.toggleLike('${t.id}')">
          <span class="material-symbols-outlined" style="font-size:18px">${State.liked.has(t.id) ? 'favorite' : 'favorite_border'}</span>
        </button>
        <button class="btn-icon" onclick="event.stopPropagation();">
          <span class="material-symbols-outlined" style="font-size:18px">more_horiz</span>
        </button>
      </div>
    </div>
  `).join('');
}

function escHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─────────────────────────────────────────────
// TRACK LOOKUP
// ─────────────────────────────────────────────
const trackCache = {};

function cacheTrack(t) { trackCache[t.id] = t; }
function cacheTracks(arr) { arr.forEach(cacheTrack); }

function getTrack(id) {
  return trackCache[id] || State.queue.find(t => t.id === id) || null;
}

// ─────────────────────────────────────────────
// PUBLIC APP API
// ─────────────────────────────────────────────
window.BatootApp = {
  play(id) {
    const t = getTrack(id);
    if (t) playTrack(t, Object.values(trackCache));
  },
  togglePlay,
  next: nextTrack,
  prev: prevTrack,
  seek(pct) { seekTo(pct); },
  setVolume,
  toggleShuffle,
  toggleRepeat,
  toggleLike(id) { toggleLike(id); },
  isLiked: id => State.liked.has(String(id)),
  getState: () => State,
  getAudio: () => audio,
  formatTime,
  renderMusicCards,
  renderTrackRows,
  fetchJamendoTracks,
  searchJamendo,
  getJamendoTrending,
  getJamendoByGenre,
  getJamendoNew,
  cacheTracks,
  cacheTrack,
  getTrack,
  createPlaylist,
  addToPlaylist,
  savePlaylists,
};

// Export for modules
if (typeof module !== 'undefined') module.exports = window.BatootApp;
