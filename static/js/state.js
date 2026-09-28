const State = {
  tracks: [],
  currentTrackId: null,
  isPlaying: false,
  shuffle: false,
  repeat: false,
  currentView: 'home',
  searchQuery: '',
  sortBy: 'date',
  favorites: JSON.parse(localStorage.getItem('favorites') || '[]'),
  playlists: JSON.parse(localStorage.getItem('playlists') || '{}'),

  saveFavorites() {
    localStorage.setItem('favorites', JSON.stringify(this.favorites));
  },
  savePlaylists() {
    localStorage.setItem('playlists', JSON.stringify(this.playlists));
  },

  isFavorite(id) { return this.favorites.includes(id); },
  toggleFavorite(id) {
    const i = this.favorites.indexOf(id);
    if (i > -1) this.favorites.splice(i, 1);
    else this.favorites.push(id);
    this.saveFavorites();
  },

  getTrack(id) { return this.tracks.find(t => t.id === id); },

  getVisibleTracks() {
    let list = this.tracks.slice();
    const q = this.searchQuery.toLowerCase().trim();
    if (q) {
      list = list.filter(t =>
        (t.title || '').toLowerCase().includes(q) ||
        (t.artist || '').toLowerCase().includes(q)
      );
    }
    if (this.currentView === 'favorites') {
      list = list.filter(t => this.isFavorite(t.id));
    }
    list.sort((a, b) => {
      const s = this.sortBy;
      if (s === 'title') return (a.title || '').localeCompare(b.title || '');
      if (s === 'artist') return (a.artist || '').localeCompare(b.artist || '');
      if (s === 'duration') return (a.duration || 0) - (b.duration || 0);
      return new Date(b.added_date || 0) - new Date(a.added_date || 0);
    });
    return list;
  }
};