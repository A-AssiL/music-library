const Playlists = {
  _addTargetId: null,

  /* ============================================
     Playlists list page
     ============================================ */
  render(view) {
    view.innerHTML = '';
    const names = Object.keys(State.playlists);

    const head = UI.el('div', { class: 'section-head' }, [
      UI.el('h2', { text: `📋 Playlists (${names.length})` }),
      UI.el('button', {
        class: 'btn btn-primary',
        text: '+ New Playlist',
        onclick: () => this.openCreateModal()
      })
    ]);
    view.appendChild(head);

    if (!names.length) {
      view.appendChild(UI.el('div', { class: 'empty' }, [
        UI.el('span', { class: 'empty-icon', text: '📋' }),
        UI.el('p', { text: 'No playlists yet. Create one to organize your music.' }),
        (() => {
          const b = UI.el('button', {
            class: 'btn btn-primary',
            text: '+ Create first playlist',
            style: 'margin-top:16px;',
            onclick: () => this.openCreateModal()
          });
          return b;
        })()
      ]));
      return;
    }

    const grid = UI.el('div', { class: 'songs-grid' });
    names.forEach(name => {
      grid.appendChild(this._playlistCard(name));
    });
    view.appendChild(grid);
  },

  _playlistCard(name) {
    const ids = State.playlists[name] || [];
    const card = UI.el('div', { class: 'song-card' });

    const art = UI.el('div', { class: 'song-art' });
    art.textContent = '📋';
    card.appendChild(art);

    const info = UI.el('div', { class: 'song-info' });
    info.appendChild(UI.el('div', { class: 'song-title', text: name }));
    info.appendChild(UI.el('div', {
      class: 'song-artist',
      text: `${ids.length} track${ids.length === 1 ? '' : 's'}`
    }));

    const bottom = UI.el('div', { class: 'song-bottom' });
    bottom.appendChild(UI.el('span', { class: 'song-dur' }));

    const actions = UI.el('div', { class: 'song-actions' });

    actions.appendChild(UI.el('button', {
      class: 'mini-btn',
      text: '▶️',
      title: 'Play all',
      onclick: (e) => {
        e.stopPropagation();
        if (ids.length) Player.play(ids[0]);
        else UI.toast('Playlist is empty');
      }
    }));

    actions.appendChild(UI.el('button', {
      class: 'mini-btn',
      text: '🗑️',
      title: 'Delete playlist',
      onclick: (e) => {
        e.stopPropagation();
        if (!confirm(`Delete playlist "${name}"?`)) return;
        delete State.playlists[name];
        State.savePlaylists();
        UI.toast('Playlist deleted', 'success');
        App.rerender();
      }
    }));

    bottom.appendChild(actions);
    info.appendChild(bottom);
    card.appendChild(info);

    card.addEventListener('click', () => {
      location.hash = `playlists/${encodeURIComponent(name)}`;
    });

    return card;
  },

  /* ============================================
     Playlist detail page
     ============================================ */
  renderDetail(view, name) {
    view.innerHTML = '';

    if (!State.playlists[name]) {
      view.appendChild(UI.el('div', { class: 'empty' }, [
        UI.el('span', { class: 'empty-icon', text: '❓' }),
        UI.el('p', { text: `Playlist "${name}" not found.` }),
        (() => UI.el('button', {
          class: 'btn btn-primary',
          text: 'Back to Playlists',
          style: 'margin-top:16px;',
          onclick: () => location.hash = 'playlists'
        }))()
      ]));
      return;
    }

    const ids = State.playlists[name] || [];
    const tracks = ids.map(id => State.getTrack(id)).filter(Boolean);
    const totalDur = tracks.reduce((s, t) => s + (t.duration || 0), 0);

    // Hero
    const hero = UI.el('div', { class: 'playlist-hero' });
    hero.appendChild(UI.el('div', { class: 'playlist-hero-art', text: '📋' }));

    const heroInfo = UI.el('div', { class: 'playlist-hero-info' });
    heroInfo.appendChild(UI.el('div', { class: 'playlist-hero-label', text: 'Playlist' }));
    heroInfo.appendChild(UI.el('div', { class: 'playlist-hero-title', text: name }));
    heroInfo.appendChild(UI.el('div', {
      class: 'playlist-hero-meta',
      text: `${tracks.length} track${tracks.length === 1 ? '' : 's'}  •  ${UI.formatTime(totalDur)}`
    }));

    const heroActions = UI.el('div', { class: 'playlist-hero-actions' });
    heroActions.appendChild(UI.el('button', {
      class: 'btn',
      text: '▶ Play All',
      onclick: () => {
        if (tracks.length) Player.play(tracks[0].id);
        else UI.toast('Playlist is empty');
      }
    }));
    heroActions.appendChild(UI.el('button', {
      class: 'btn',
      text: '🔀 Shuffle',
      onclick: () => {
        if (!tracks.length) { UI.toast('Playlist is empty'); return; }
        State.shuffle = true;
        document.getElementById('btnShuffle').classList.add('active');
        const r = Math.floor(Math.random() * tracks.length);
        Player.play(tracks[r].id);
      }
    }));
    heroActions.appendChild(UI.el('button', {
      class: 'btn',
      text: '🗑️ Delete',
      onclick: () => {
        if (!confirm(`Delete playlist "${name}"?`)) return;
        delete State.playlists[name];
        State.savePlaylists();
        UI.toast('Playlist deleted', 'success');
        location.hash = 'playlists';
      }
    }));
    heroInfo.appendChild(heroActions);
    hero.appendChild(heroInfo);
    view.appendChild(hero);

    // Tracks
    if (!tracks.length) {
      view.appendChild(UI.el('div', { class: 'empty' }, [
        UI.el('span', { class: 'empty-icon', text: '🎵' }),
        UI.el('p', { text: 'This playlist is empty. Add tracks from All Songs.' }),
        (() => UI.el('button', {
          class: 'btn btn-primary',
          text: 'Browse All Songs',
          style: 'margin-top:16px;',
          onclick: () => location.hash = 'songs'
        }))()
      ]));
      return;
    }

    const table = UI.el('div', { class: 'track-table' });
    tracks.forEach((t, i) => {
      table.appendChild(this._trackRow(name, t, i));
    });
    view.appendChild(table);
  },

  _trackRow(playlistName, t, index) {
    const isPlaying = State.currentTrackId === t.id;
    const row = UI.el('div', { class: 'track-row' + (isPlaying ? ' playing' : '') });

    row.appendChild(UI.el('span', {
      class: 'track-num',
      text: isPlaying ? '▶' : String(index + 1)
    }));

    row.appendChild(UI.el('span', {
      class: 'track-title-cell',
      text: t.title || '—'
    }));

    row.appendChild(UI.el('span', {
      class: 'track-cell artist',
      text: t.artist || '—'
    }));

    row.appendChild(UI.el('span', {
      class: 'track-cell',
      text: UI.formatDuration(t.duration)
    }));

    const actions = UI.el('div', { class: 'track-actions' });
    actions.appendChild(UI.el('button', {
      class: 'mini-btn',
      text: '➖',
      title: 'Remove from playlist',
      onclick: (e) => {
        e.stopPropagation();
        this.removeTrack(playlistName, t.id);
      }
    }));
    row.appendChild(actions);

    row.addEventListener('click', () => Player.play(t.id));
    return row;
  },

  /* ============================================
     Add to playlist modal
     ============================================ */
  openAddModal(trackId) {
    this._addTargetId = trackId;
    const track = State.getTrack(trackId);
    if (!track) return;

    // Preview
    const preview = document.getElementById('addTrackPreview');
    preview.innerHTML = '';

    const art = UI.el('div', { class: 'add-track-preview-art' });
    const letter = (track.title || '🎵').charAt(0).toUpperCase();
    if (track.thumbnail) {
      const img = document.createElement('img');
      img.src = track.thumbnail;
      img.alt = '';
      img.onerror = () => { img.remove(); art.textContent = letter; };
      art.appendChild(img);
    } else {
      art.textContent = letter;
    }
    preview.appendChild(art);

    const info = UI.el('div', { class: 'add-track-preview-info' });
    info.appendChild(UI.el('div', {
      class: 'add-track-preview-title',
      text: track.title || '—'
    }));
    info.appendChild(UI.el('div', {
      class: 'add-track-preview-artist',
      text: track.artist || '—'
    }));
    preview.appendChild(info);

    // Reset input
    document.getElementById('newPlaylistInput').value = '';

    // Render picker
    this._renderPicker();

    UI.openModal('addToPlaylistModal');
  },

  _renderPicker() {
    const picker = document.getElementById('playlistPicker');
    picker.innerHTML = '';

    const names = Object.keys(State.playlists);
    if (!names.length) {
      picker.appendChild(UI.el('div', {
        class: 'picker-empty',
        text: 'No playlists yet. Create one above.'
      }));
      return;
    }

    names.forEach(name => {
      const ids = State.playlists[name] || [];
      const already = this._addTargetId && ids.includes(this._addTargetId);

      const item = UI.el('div', {
        class: 'picker-item' + (already ? ' added' : '')
      });

      const left = UI.el('div', { class: 'picker-left' });
      left.appendChild(UI.el('span', { class: 'picker-icon', text: '📋' }));
      left.appendChild(UI.el('span', { class: 'picker-name', text: name }));
      item.appendChild(left);

      item.appendChild(UI.el('span', {
        class: 'picker-count',
        text: already ? '✓ Added' : `${ids.length}`
      }));

      item.addEventListener('click', () => this._pickPlaylist(name));
      picker.appendChild(item);
    });
  },

  _pickPlaylist(name) {
    if (!this._addTargetId) return;
    const added = this.addTrack(name, this._addTargetId, true);
    if (added) {
      UI.closeModal('addToPlaylistModal');
      this._addTargetId = null;
    }
  },

  /* ============================================
     Create new playlist
     ============================================ */
  openCreateModal() {
    document.getElementById('newPlaylistNameInput').value = '';
    document.getElementById('createPlaylistStatus').textContent = '';
    UI.openModal('createPlaylistModal');
    setTimeout(() => document.getElementById('newPlaylistNameInput').focus(), 100);
  },

  _confirmCreate() {
    const input = document.getElementById('newPlaylistNameInput');
    const st = document.getElementById('createPlaylistStatus');
    const name = input.value.trim();

    if (!name) {
      st.className = 'status err';
      st.textContent = '❌ Enter a playlist name';
      return;
    }
    if (State.playlists[name]) {
      st.className = 'status err';
      st.textContent = '❌ A playlist with this name already exists';
      return;
    }

    State.playlists[name] = [];
    State.savePlaylists();
    UI.toast(`Playlist "${name}" created`, 'success');
    UI.closeModal('createPlaylistModal');

    // If we came from the add-to-playlist modal, add the track and refresh picker
    if (this._addTargetId) {
      this.addTrack(name, this._addTargetId, true);
      this._renderPicker();
      UI.toast(`Added to "${name}"`, 'success');
    } else {
      App.rerender();
    }
  },

  _confirmCreateAndAdd() {
    // From add-to-playlist modal's "Create" button
    const input = document.getElementById('newPlaylistInput');
    const name = input.value.trim();

    if (!name) {
      UI.toast('Enter a playlist name', 'error');
      input.focus();
      return;
    }
    if (State.playlists[name]) {
      UI.toast('Playlist already exists', 'error');
      return;
    }

    State.playlists[name] = [];
    State.savePlaylists();

    if (this._addTargetId) {
      this.addTrack(name, this._addTargetId, true);
    }

    input.value = '';
    this._renderPicker();
    UI.toast(`Created "${name}"`, 'success');
  },

  /* ============================================
     Core operations
     ============================================ */
  addTrack(name, trackId, silent = false) {
    if (!State.playlists[name]) State.playlists[name] = [];
    if (State.playlists[name].includes(trackId)) {
      if (!silent) UI.toast('Already in playlist');
      return false;
    }
    State.playlists[name].push(trackId);
    State.savePlaylists();
    if (!silent) UI.toast(`Added to "${name}"`, 'success');
    return true;
  },

  removeTrack(name, trackId) {
    if (!State.playlists[name]) return;
    State.playlists[name] = State.playlists[name].filter(id => id !== trackId);
    State.savePlaylists();
    UI.toast('Removed from playlist', 'success');
    App.rerender();
  }
};