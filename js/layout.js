/* ============================================================
   Batoot Music — Shared Layout Builder
   Builds sidebar, player bar, and mobile nav on every page
   ============================================================ */

'use strict';

const Layout = {
  // ── Sidebar HTML ──────────────────────────────────────────
  buildSidebar(activePage) {
    const navItems = [
      { id: 'home',    label: 'الرئيسية',    labelEn: 'Home',     icon: 'home' },
      { id: 'search',  label: 'البحث',       labelEn: 'Search',   icon: 'search' },
      { id: 'library', label: 'مكتبتي',      labelEn: 'Library',  icon: 'library_music' },
    ];

    const playlists = window.BatootApp?.getState().playlists || [];

    return `
    <aside class="sidebar" id="sidebar">
      <!-- Logo -->
      <div class="sidebar-logo">
        <div class="sidebar-logo-icon">
          <span class="material-symbols-outlined" style="font-size:22px;font-variation-settings:'FILL' 1">queue_music</span>
        </div>
        <h1>بطوط</h1>
      </div>

      <!-- Main Nav -->
      <div class="sidebar-section" style="margin-top:12px">
        ${navItems.map(item => `
          <a href="${item.id === 'home' ? '../index.html' : (activePage === 'home' ? 'pages/' : '') + item.id + '.html'}"
             class="sidebar-nav-item ${activePage === item.id ? 'active' : ''}"
             data-en="${item.labelEn}" data-ar="${item.label}">
            <span class="material-symbols-outlined" style="font-variation-settings:'FILL' ${activePage === item.id ? '1' : '0'}">${item.icon}</span>
            <span>${item.label}</span>
          </a>
        `).join('')}
      </div>

      <div style="border-top:1px solid rgba(255,255,255,0.5);margin:16px 12px"></div>

      <!-- Playlists -->
      <div class="sidebar-section">
        <div class="sidebar-section-label" data-en="YOUR PLAYLISTS" data-ar="قوائمك">قوائمك</div>
        <button class="sidebar-nav-item" onclick="Layout.openCreatePlaylist()" style="width:100%;text-align:right">
          <span class="material-symbols-outlined" style="color:var(--primary-container)">add_circle</span>
          <span data-en="New Playlist" data-ar="قائمة جديدة">قائمة جديدة</span>
        </button>

        <div id="sidebar-playlists">
          ${playlists.slice(0, 8).map(pl => `
            <a href="playlist.html?id=${pl.id}" class="sidebar-playlist-item">
              <div class="sidebar-playlist-thumb">
                <span class="material-symbols-outlined" style="font-size:16px;font-variation-settings:'FILL' 1">queue_music</span>
              </div>
              <div style="min-width:0">
                <div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(pl.name)}</div>
                <div style="font-size:11px;color:var(--outline)">${pl.tracks.length} أغنية</div>
              </div>
            </a>
          `).join('')}
          ${playlists.length === 0 ? `<div style="font-size:12px;color:var(--outline);padding:8px 14px">لا توجد قوائم بعد</div>` : ''}
        </div>
      </div>

      <div style="flex:1"></div>
    </aside>`;
  },

  // ── Player Bar HTML ───────────────────────────────────────
  buildPlayerBar() {
    return `
    <div class="player-bar" id="player-bar">

      <!-- Track Info -->
      <div class="player-track-info">
        <div class="player-thumb" id="player-thumb">
          <div class="player-thumb-placeholder" id="player-thumb-placeholder">
            <span class="material-symbols-outlined" style="font-size:26px;color:var(--primary-container)">music_note</span>
          </div>
          <img src="" alt="" style="display:none;position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:12px" id="player-thumb-img">
        </div>
        <div style="min-width:0">
          <div class="player-track-name" id="player-track-name" data-ar="اختر أغنية" data-en="Pick a song">اختر أغنية</div>
          <div class="player-artist-name" id="player-artist-name" data-ar="بطوط ميوزك" data-en="Batoot Music">بطوط ميوزك</div>
        </div>
        <button class="player-like-btn btn-icon" id="player-like-btn" onclick="Layout.onLike()">
          <span class="material-symbols-outlined" style="font-size:20px">favorite_border</span>
        </button>
      </div>

      <!-- Controls -->
      <div class="player-controls">
        <div class="player-controls-btns">
          <button class="player-btn player-btn--sm" id="shuffle-btn" onclick="BatootApp.toggleShuffle()" title="Shuffle">
            <span class="material-symbols-outlined" style="font-size:20px">shuffle</span>
          </button>
          <button class="player-btn player-btn--sm" onclick="BatootApp.prev()" title="Previous">
            <span class="material-symbols-outlined" style="font-size:26px">skip_previous</span>
          </button>
          <button class="player-btn player-btn--lg" id="play-pause-btn" onclick="BatootApp.togglePlay()" title="Play/Pause">
            <span class="material-symbols-outlined" style="font-size:22px">play_arrow</span>
          </button>
          <button class="player-btn player-btn--sm" onclick="BatootApp.next()" title="Next">
            <span class="material-symbols-outlined" style="font-size:26px">skip_next</span>
          </button>
          <button class="player-btn player-btn--sm" id="repeat-btn" onclick="BatootApp.toggleRepeat()" title="Repeat">
            <span class="material-symbols-outlined" style="font-size:20px">repeat</span>
          </button>
        </div>
        <!-- Progress -->
        <div class="player-progress">
          <span class="player-time" id="current-time">0:00</span>
          <div class="progress-bar" id="progress-bar" onclick="Layout.onSeek(event)">
            <div class="progress-bar__fill" id="progress-fill" style="width:0%"></div>
          </div>
          <span class="player-time right" id="total-time">0:00</span>
        </div>
      </div>

      <!-- Volume -->
      <div class="player-volume">
        <button class="player-btn player-btn--sm" onclick="Layout.toggleMute()">
          <span class="material-symbols-outlined" id="volume-icon" style="font-size:20px">volume_up</span>
        </button>
        <div class="volume-bar" id="volume-bar" onclick="Layout.onVolumeClick(event)" style="cursor:pointer">
          <div class="volume-bar__fill" id="volume-fill" style="width:80%;height:100%;border-radius:9999px;background:linear-gradient(90deg,var(--outline),var(--primary-container))"></div>
        </div>
        <button class="player-btn player-btn--sm" onclick="Layout.openQueue()" title="Queue">
          <span class="material-symbols-outlined" style="font-size:20px">queue_music</span>
        </button>
      </div>
    </div>`;
  },

  // ── Mobile Nav HTML ───────────────────────────────────────
  buildMobileNav(activePage) {
    const items = [
      { id: 'home',    icon: 'home',          label: 'الرئيسية' },
      { id: 'search',  icon: 'search',        label: 'بحث' },
      { id: 'library', icon: 'library_music', label: 'مكتبة' },
    ];
    return `
    <nav class="mobile-nav" id="mobile-nav">
      <div class="mobile-nav-items">
        ${items.map(item => `
          <a href="${item.id === 'home' ? '../index.html' : item.id + '.html'}"
             class="mobile-nav-item ${activePage === item.id ? 'active' : ''}">
            <span class="material-symbols-outlined" style="font-variation-settings:'FILL' ${activePage === item.id ? '1' : '0'}">${item.icon}</span>
            <span>${item.label}</span>
          </a>
        `).join('')}
        <button class="mobile-nav-item" onclick="Layout.toggleSidebar()">
          <span class="material-symbols-outlined">menu</span>
          <span>المزيد</span>
        </button>
      </div>
    </nav>`;
  },

  // ── Queue Drawer ──────────────────────────────────────────
  buildQueueDrawer() {
    return `
    <div class="modal-overlay" id="queue-modal" onclick="if(event.target===this)this.classList.remove('open')">
      <div class="modal-box" style="max-width:400px;max-height:80vh;overflow-y:auto;padding:24px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
          <h2 class="text-headline-md" data-en="Queue" data-ar="قائمة التشغيل">قائمة التشغيل</h2>
          <button class="btn-icon" onclick="document.getElementById('queue-modal').classList.remove('open')">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div id="queue-list">
          <div style="text-align:center;color:var(--outline);padding:40px">لا توجد أغاني في القائمة</div>
        </div>
      </div>
    </div>`;
  },

  // ── Create Playlist Modal ─────────────────────────────────
  buildCreatePlaylistModal() {
    return `
    <div class="modal-overlay" id="create-playlist-modal" onclick="if(event.target===this)this.classList.remove('open')">
      <div class="modal-box" style="padding:32px">
        <h2 class="text-headline-md" style="margin-bottom:20px" data-en="New Playlist" data-ar="قائمة تشغيل جديدة">قائمة تشغيل جديدة</h2>
        <input type="text" id="new-playlist-name" class="input-glass" placeholder="اسم القائمة..." style="padding-right:16px;margin-bottom:16px" maxlength="60">
        <div style="display:flex;gap:10px;justify-content:flex-end">
          <button class="btn-secondary" onclick="document.getElementById('create-playlist-modal').classList.remove('open')">إلغاء</button>
          <button class="btn-primary" onclick="Layout.confirmCreatePlaylist()">إنشاء</button>
        </div>
      </div>
    </div>`;
  },

  // ── Inject Layout into page ───────────────────────────────
  inject(activePage) {
    // Insert sidebar
    const sidebarSlot = document.getElementById('sidebar-slot');
    if (sidebarSlot) sidebarSlot.outerHTML = this.buildSidebar(activePage);

    // Insert player
    const playerSlot = document.getElementById('player-slot');
    if (playerSlot) playerSlot.outerHTML = this.buildPlayerBar();

    // Insert mobile nav
    const mobileSlot = document.getElementById('mobile-nav-slot');
    if (mobileSlot) mobileSlot.outerHTML = this.buildMobileNav(activePage);

    // Insert modals
    document.body.insertAdjacentHTML('beforeend', this.buildQueueDrawer() + this.buildCreatePlaylistModal());

    // Fix image reference
    const img = document.getElementById('player-thumb-img');
    if (img) {
      img.onload = function() { this.style.display = 'block'; document.getElementById('player-thumb-placeholder').style.display = 'none'; };
      img.onerror = function() { this.style.display = 'none'; document.getElementById('player-thumb-placeholder').style.display = 'flex'; };
    }

    // Overlay for sidebar on mobile
    const overlay = document.createElement('div');
    overlay.id = 'sidebar-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.3);backdrop-filter:blur(4px);z-index:200;display:none';
    overlay.onclick = () => this.closeSidebar();
    document.body.appendChild(overlay);
  },

  // ── Event Handlers ────────────────────────────────────────
  onLike() {
    const state = window.BatootApp?.getState();
    if (!state) return;
    const t = state.queue[state.currentIndex];
    if (!t) return;
    window.BatootApp.toggleLike(t.id);
  },

  onSeek(e) {
    const bar = document.getElementById('progress-bar');
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    window.BatootApp?.seek(Math.max(0, Math.min(1, pct)));
  },

  onVolumeClick(e) {
    const bar = document.getElementById('volume-bar');
    if (!bar) return;
    const rect = bar.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    window.BatootApp?.setVolume(Math.max(0, Math.min(1, pct)));
  },

  toggleMute() {
    const audio = window.BatootApp?.getAudio();
    if (!audio) return;
    audio.muted = !audio.muted;
    const icon = document.getElementById('volume-icon');
    if (icon) icon.textContent = audio.muted ? 'volume_off' : 'volume_up';
  },

  openQueue() {
    const modal = document.getElementById('queue-modal');
    if (!modal) return;
    const state = window.BatootApp?.getState();
    const list = document.getElementById('queue-list');
    if (list && state?.queue?.length) {
      list.innerHTML = state.queue.map((t, i) => `
        <div class="track-row ${i === state.currentIndex ? 'playing' : ''}"
             onclick="BatootApp.play('${t.id}');document.getElementById('queue-modal').classList.remove('open')">
          <div class="track-row__num">${i + 1}</div>
          <div class="track-row__thumb" style="background:var(--surface-container)">
            ${t.image ? `<img src="${t.image}" style="width:100%;height:100%;object-fit:cover">` : ''}
          </div>
          <div class="track-row__info">
            <div class="track-row__title">${escHtml(t.title)}</div>
            <div class="track-row__artist">${escHtml(t.artist)}</div>
          </div>
          <div class="track-row__duration">${window.BatootApp.formatTime(t.duration)}</div>
        </div>
      `).join('');
    }
    modal.classList.add('open');
  },

  openCreatePlaylist() {
    document.getElementById('create-playlist-modal')?.classList.add('open');
    setTimeout(() => document.getElementById('new-playlist-name')?.focus(), 100);
  },

  confirmCreatePlaylist() {
    const input = document.getElementById('new-playlist-name');
    const name = input?.value.trim();
    if (!name) return;
    window.BatootApp?.createPlaylist(name);
    document.getElementById('create-playlist-modal')?.classList.remove('open');
    if (input) input.value = '';
    // Refresh sidebar playlists
    const container = document.getElementById('sidebar-playlists');
    const playlists = window.BatootApp?.getState().playlists || [];
    if (container) {
      container.innerHTML = playlists.slice(0, 8).map(pl => `
        <a href="playlist.html?id=${pl.id}" class="sidebar-playlist-item">
          <div class="sidebar-playlist-thumb">
            <span class="material-symbols-outlined" style="font-size:16px;font-variation-settings:'FILL' 1">queue_music</span>
          </div>
          <div style="min-width:0">
            <div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(pl.name)}</div>
            <div style="font-size:11px;color:var(--outline)">${pl.tracks.length} أغنية</div>
          </div>
        </a>
      `).join('');
    }
  },

  toggleSidebar() {
    const sb = document.getElementById('sidebar');
    const ov = document.getElementById('sidebar-overlay');
    if (!sb) return;
    sb.classList.toggle('open');
    if (ov) ov.style.display = sb.classList.contains('open') ? 'block' : 'none';
  },

  closeSidebar() {
    document.getElementById('sidebar')?.classList.remove('open');
    const ov = document.getElementById('sidebar-overlay');
    if (ov) ov.style.display = 'none';
  },
};

function escHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

window.Layout = Layout;
