const Player = {
  audio: new Audio(),
  _seeking: false,

  init() {
    const a = this.audio;
    a.volume = 0.8;

    a.addEventListener('loadedmetadata', () => {
      document.getElementById('timeEnd').textContent = UI.formatTime(a.duration);
    });

    a.addEventListener('timeupdate', () => {
      if (!this._seeking) {
        const p = a.duration ? (a.currentTime / a.duration) * 100 : 0;
        this._setBar(p);
      }
      document.getElementById('timeNow').textContent = UI.formatTime(a.currentTime);
    });

    a.addEventListener('play', () => {
      State.isPlaying = true;
      document.getElementById('btnPlay').textContent = '⏸';
    });

    a.addEventListener('pause', () => {
      State.isPlaying = false;
      document.getElementById('btnPlay').textContent = '▶️';
    });

    a.addEventListener('ended', () => {
      State.isPlaying = false;
      document.getElementById('btnPlay').textContent = '▶️';

      if (State.repeat) {
        // Repeat current song
        a.currentTime = 0;
        a.play().catch(() => {});
      } else {
        // Play next (shuffle handled inside next())
        this.next();
      }
    });

    // --- Progress bar ---
    const bar = document.getElementById('bar');
    const range = document.getElementById('barRange');

    const seekFromEvent = (e) => {
      const r = bar.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
      this.seek(x * 100);
    };
    bar.addEventListener('click', seekFromEvent);

    range.addEventListener('input', () => {
      this._seeking = true;
      this._setBar(parseFloat(range.value));
    });
    range.addEventListener('change', () => {
      if (this.audio.duration) {
        this.audio.currentTime = (parseFloat(range.value) / 100) * this.audio.duration;
      }
      this._seeking = false;
    });

    // --- Volume ---
    document.getElementById('volumeRange').addEventListener('input', (e) => {
      this.audio.volume = e.target.value / 100;
    });

    // --- Play / Pause ---
    document.getElementById('btnPlay').addEventListener('click', () => this.toggle());

    // --- Next / Prev ---
    document.getElementById('btnNext').addEventListener('click', () => this.next());
    document.getElementById('btnPrev').addEventListener('click', () => this.prev());

    // --- Shuffle ---
    const btnShuffle = document.getElementById('btnShuffle');
    btnShuffle.addEventListener('click', () => {
      State.shuffle = !State.shuffle;
      btnShuffle.classList.toggle('active', State.shuffle);
      btnShuffle.setAttribute('aria-pressed', State.shuffle);
      UI.toast(State.shuffle ? '🔀 Shuffle: ON' : '🔀 Shuffle: OFF');
    });

    // --- Repeat ---
    const btnRepeat = document.getElementById('btnRepeat');
    btnRepeat.addEventListener('click', () => {
      State.repeat = !State.repeat;
      btnRepeat.classList.toggle('active', State.repeat);
      btnRepeat.setAttribute('aria-pressed', State.repeat);

      // Change the icon so it's obvious
      btnRepeat.textContent = State.repeat ? '🔂' : '🔁';
      btnRepeat.title = State.repeat ? 'Repeat one: ON' : 'Repeat: OFF';

      UI.toast(State.repeat ? '🔂 Repeat one: ON' : '🔁 Repeat: OFF');
    });

    // Initialize UI
    btnShuffle.classList.toggle('active', State.shuffle);
    btnShuffle.setAttribute('aria-pressed', State.shuffle);
    btnRepeat.classList.toggle('active', State.repeat);
    btnRepeat.setAttribute('aria-pressed', State.repeat);
    btnRepeat.textContent = State.repeat ? '🔂' : '🔁';
  },

  _setBar(percent) {
    const p = Math.max(0, Math.min(100, percent));
    document.getElementById('barFill').style.width = p + '%';
    document.getElementById('barThumb').style.left = p + '%';
    document.getElementById('barRange').value = p;
  },

  seek(percent) {
    if (this.audio.duration) {
      this.audio.currentTime = (percent / 100) * this.audio.duration;
      this._setBar(percent);
    }
  },

  play(id) {
    const t = State.getTrack(id);
    if (!t) return;

    // If clicking the currently playing track → toggle
    if (State.currentTrackId === id && !this.audio.paused) {
      this.audio.pause();
      return;
    }

    State.currentTrackId = id;
    this.audio.src = API.streamUrl(id);
    this.audio.load();
    this.audio.play().catch((err) => {
      console.error('Play error:', err);
      UI.toast('Could not play this track', 'error');
    });

    this._renderNowPlaying(t);
    App.rerender();
  },

  toggle() {
    // Nothing selected → play first track
    if (!State.currentTrackId) {
      if (State.tracks.length) this.play(State.tracks[0].id);
      return;
    }

    // Track finished → restart from beginning
    if (this.audio.ended || 
        (this.audio.duration && this.audio.currentTime >= this.audio.duration - 0.1)) {
      this.audio.currentTime = 0;
      this.audio.play().catch(() => {});
      return;
    }

    // Normal toggle
    if (this.audio.paused) {
      this.audio.play().catch(() => {});
    } else {
      this.audio.pause();
    }
  },

  next() {
    const list = State.getVisibleTracks();
    if (!list.length) return;

    let idx = list.findIndex(t => t.id === State.currentTrackId);
    if (idx < 0) {
      this.play(list[0].id);
      return;
    }

    if (State.shuffle && list.length > 1) {
      // Pick a random track that isn't the current one
      let r;
      let guard = 0;
      do {
        r = Math.floor(Math.random() * list.length);
        guard++;
      } while (r === idx && guard < 50);
      idx = r;
    } else {
      idx = (idx + 1) % list.length;
    }

    this.play(list[idx].id);
  },

  prev() {
    const list = State.getVisibleTracks();
    if (!list.length) return;

    let idx = list.findIndex(t => t.id === State.currentTrackId);
    if (idx < 0) {
      this.play(list[0].id);
      return;
    }

    if (State.shuffle && list.length > 1) {
      let r;
      let guard = 0;
      do {
        r = Math.floor(Math.random() * list.length);
        guard++;
      } while (r === idx && guard < 50);
      idx = r;
    } else {
      idx = (idx - 1 + list.length) % list.length;
    }

    this.play(list[idx].id);
  },

  _renderNowPlaying(t) {
    document.getElementById('playerTitle').textContent = t.title || '—';
    document.getElementById('playerArtist').textContent = t.artist || '—';

    const art = document.getElementById('playerArt');
    art.innerHTML = '';
    const letter = (t.title || '🎵').charAt(0).toUpperCase();
    if (t.thumbnail) {
      const img = document.createElement('img');
      img.alt = '';
      img.src = t.thumbnail;
      img.onerror = () => { img.remove(); art.textContent = letter; };
      art.appendChild(img);
    } else {
      art.textContent = letter;
    }
  }
};