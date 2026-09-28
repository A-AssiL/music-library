const UI = {
  toast(msg, type = '') {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = 'toast show ' + type;
    clearTimeout(this._t);
    this._t = setTimeout(() => el.classList.remove('show'), 2800);
  },

  openModal(id) { document.getElementById(id).classList.add('active'); },
  closeModal(id) { document.getElementById(id).classList.remove('active'); },

  formatTime(sec) {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return m + ':' + String(s).padStart(2, '0');
  },

  formatDuration(sec) {
    if (!sec) return '--:--';
    return this.formatTime(sec);
  },

  formatDate(iso) {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString();
    } catch { return ''; }
  },

  greeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  },

  escape(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  },

  el(tag, attrs = {}, children = []) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k === 'html') e.innerHTML = v;
      else if (k.startsWith('on') && typeof v === 'function') {
        e.addEventListener(k.slice(2).toLowerCase(), v);
      } else if (k === 'dataset') {
        Object.assign(e.dataset, v);
      } else {
        e.setAttribute(k, v);
      }
    }
    for (const c of [].concat(children)) {
      if (typeof c === 'string') e.appendChild(document.createTextNode(c));
      else if (c) e.appendChild(c);
    }
    return e;
  },

  artwork(track, size = 'big') {
    // Returns a DOM element with cover image or fallback emoji
    const wrap = document.createElement('div');
    wrap.className = size === 'big' ? 'song-art' : 'player-art';
    const letter = (track.title || '🎵').charAt(0).toUpperCase();
    if (track.thumbnail) {
      const img = document.createElement('img');
      img.alt = '';
      img.loading = 'lazy';
      img.src = track.thumbnail;
      img.onerror = () => { img.remove(); wrap.textContent = letter; };
      wrap.appendChild(img);
    } else {
      wrap.textContent = letter;
    }
    return wrap;
  }
};