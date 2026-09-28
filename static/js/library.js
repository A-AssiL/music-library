const Library = {
  async refresh() {
    State.tracks = await API.getTracks();
    App.rerender();
  },

  renderHome(view) {
    view.innerHTML = '';
    const h1 = UI.el('h1', { text: `${UI.greeting()} 👋` });
    const p = UI.el('p', { class: 'dim', text: 'Your personal music collection' });
    view.appendChild(UI.el('div', { class: 'greet' }, [h1, p]));

    const stats = UI.el('div', { class: 'stats', id: 'statsBox' });
    view.appendChild(stats);

    const quick = UI.el('div', { class: 'quick' }, [
      this._quickCard('📤', 'Upload Audio', () => UI.openModal('uploadModal')),
      this._quickCard('📥', 'Download from YouTube', () => location.hash = 'youtube')
    ]);
    view.appendChild(quick);

    const head = UI.el('div', { class: 'section-head' }, [
      UI.el('h2', { text: 'Recently Added' })
    ]);
    view.appendChild(head);

    const grid = UI.el('div', { class: 'songs-grid' });
    const recent = State.tracks
      .slice()
      .sort((a, b) => new Date(b.added_date || 0) - new Date(a.added_date || 0))
      .slice(0, 6);
    if (recent.length) {
      recent.forEach(t => grid.appendChild(this._songCard(t)));
    } else {
      grid.appendChild(this._empty('No tracks yet'));
    }
    view.appendChild(grid);

    this._loadStats();
  },

  _quickCard(icon, label, onClick) {
    return UI.el('div', { class: 'quick-card', onclick: onClick }, [
      UI.el('span', { class: 'quick-icon', text: icon }),
      UI.el('span', { text: label })
    ]);
  },

  async _loadStats() {
    try {
      const s = await API.getStats();
      const box = document.getElementById('statsBox');
      if (!box) return;
      box.innerHTML = '';
      const items = [
        ['🎵', s.total_tracks, 'Tracks'],
        ['⏱', (s.total_duration_hours || 0).toFixed(1), 'Hours'],
        ['👤', s.artists, 'Artists'],
        ['💾', (s.total_size_mb || 0).toFixed(1), 'MB']
      ];
      items.forEach(([icon, val, label]) => {
        box.appendChild(UI.el('div', { class: 'stat' }, [
          UI.el('span', { class: 'stat-icon', text: icon }),
          UI.el('span', { class: 'stat-value', text: String(val ?? 0) }),
          UI.el('span', { class: 'stat-label', text: label })
        ]));
      });
    } catch (e) { console.error(e); }
  },

  renderSongs(view) {
    view.innerHTML = '';
    const list = State.getVisibleTracks();
    const h = UI.el('div', { class: 'section-head' }, [
      UI.el('h2', { text: `All Songs (${list.length})` })
    ]);
    view.appendChild(h);

    const grid = UI.el('div', { class: 'songs-grid' });
    if (!list.length) grid.appendChild(this._empty('No tracks match your search'));
    else list.forEach(t => grid.appendChild(this._songCard(t)));
    view.appendChild(grid);
  },

  renderFavorites(view) {
    view.innerHTML = '';
    const list = State.getVisibleTracks();
    const h = UI.el('div', { class: 'section-head' }, [
      UI.el('h2', { text: `❤️ Favorites (${list.length})` })
    ]);
    view.appendChild(h);

    const grid = UI.el('div', { class: 'songs-grid' });
    if (!list.length) grid.appendChild(this._empty('No favorites yet'));
    else list.forEach(t => grid.appendChild(this._songCard(t)));
    view.appendChild(grid);
  },

  _songCard(t) {
    const card = UI.el('div', { class: 'song-card' });

    const art = UI.artwork(t, 'big');
    const over = UI.el('div', { class: 'play-over', text: '▶' });
    art.appendChild(over);
    art.addEventListener('click', (e) => {
      e.stopPropagation();
      Player.play(t.id);
    });
    card.appendChild(art);

    const info = UI.el('div', { class: 'song-info' });
    info.appendChild(UI.el('div', { class: 'song-title', text: t.title || '—' }));
    info.appendChild(UI.el('div', { class: 'song-artist', text: t.artist || '—' }));

    const fav = State.isFavorite(t.id);
    const bottom = UI.el('div', { class: 'song-bottom' });

    const dur = UI.el('span', { class: 'song-dur', text: UI.formatDuration(t.duration) });
    bottom.appendChild(dur);

    const actions = UI.el('div', { class: 'song-actions' });

    const favBtn = UI.el('button', {
      class: 'mini-btn' + (fav ? ' fav' : ''),
      text: fav ? '❤️' : '🤍',
      title: 'Favorite',
      onclick: (e) => {
        e.stopPropagation();
        State.toggleFavorite(t.id);
        App.rerender();
      }
    });
    actions.appendChild(favBtn);

    const dlBtn = UI.el('button', {
      class: 'mini-btn', text: '⬇️', title: 'Download',
      onclick: (e) => { e.stopPropagation(); location.href = API.downloadUrl(t.id); }
    });
    actions.appendChild(dlBtn);

    const plBtn = UI.el('button', {
      class: 'mini-btn', text: '📋', title: 'Add to playlist',
      onclick: (e) => {
        e.stopPropagation();
        Playlists.openAddModal(t.id);
      }
    });
    actions.appendChild(plBtn);

    const delBtn = UI.el('button', {
      class: 'mini-btn', text: '🗑️', title: 'Delete',
      onclick: async (e) => {
        e.stopPropagation();
        if (!confirm(`Delete "${t.title}"?`)) return;
        await API.deleteTrack(t.id);
        UI.toast('Deleted', 'success');
        await Library.refresh();
      }
    });
    actions.appendChild(delBtn);

    bottom.appendChild(actions);
    info.appendChild(bottom);
    card.appendChild(info);
    return card;
  },

  _empty(msg) {
    return UI.el('div', { class: 'empty' }, [
      UI.el('span', { class: 'empty-icon', text: '🎵' }),
      UI.el('p', { text: msg })
    ]);
  }
};