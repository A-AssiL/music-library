const App = {
  init() {
    Player.init();
    Upload.init();

    // Theme
    const dark = localStorage.getItem('darkMode') === 'true';
    if (dark) document.body.classList.add('dark');
    document.getElementById('btnTheme').textContent = dark ? '☀️' : '🌙';
    document.getElementById('btnTheme').addEventListener('click', () => {
      const nowDark = !document.body.classList.contains('dark');
      document.body.classList.toggle('dark', nowDark);
      localStorage.setItem('darkMode', nowDark);
      document.getElementById('btnTheme').textContent = nowDark ? '☀️' : '🌙';
    });

    // Sidebar toggle
    document.getElementById('btnMenu').addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
    });

    // Upload button
    document.getElementById('btnUpload').addEventListener('click', () => UI.openModal('uploadModal'));

    // Modal close
    document.querySelectorAll('[data-close]').forEach(el => {
      el.addEventListener('click', () => UI.closeModal(el.dataset.close));
    });
    document.querySelectorAll('.modal-overlay').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target === el) el.classList.remove('active');
      });
    });

    // Add to playlist — "Create" button
    document.getElementById('btnCreatePlaylist').addEventListener('click', () => {
      Playlists._confirmCreateAndAdd();
    });
    document.getElementById('newPlaylistInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') Playlists._confirmCreateAndAdd();
    });

    // Create playlist modal
    document.getElementById('btnConfirmCreatePlaylist').addEventListener('click', () => {
      Playlists._confirmCreate();
    });
    document.getElementById('newPlaylistNameInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') Playlists._confirmCreate();
    });

    // Search + sort
    document.getElementById('searchInput').addEventListener('input', (e) => {
      State.searchQuery = e.target.value;
      this.rerender();
    });
    document.getElementById('sortSelect').addEventListener('change', (e) => {
      State.sortBy = e.target.value;
      this.rerender();
    });

    // Router
    window.addEventListener('hashchange', () => this.route());
    if (!location.hash) location.hash = 'home';
    this.route();

    // Initial data
    Library.refresh();
  },

  route() {
    const hash = (location.hash || '#home').slice(1);
    const [view, param] = hash.split('/');

    // Clear search when leaving All Songs
    if (view !== 'songs' && State.searchQuery) {
      State.searchQuery = '';
      document.getElementById('searchInput').value = '';
    }

    State.currentView = view;
    State.currentParam = param ? decodeURIComponent(param) : null;

    // Show search ONLY on All Songs
    const searchBox = document.querySelector('.search');
    if (searchBox) {
      searchBox.style.display = (view === 'songs') ? '' : 'none';
    }

    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.view === view);
    });

    if (window.innerWidth <= 992) {
      document.getElementById('sidebar').classList.remove('open');
    }

    this.rerender();
  },

  rerender() {
    const view = document.getElementById('view');
    switch (State.currentView) {
      case 'home': Library.renderHome(view); break;
      case 'songs': Library.renderSongs(view); break;
      case 'favorites': Library.renderFavorites(view); break;
      case 'playlists':
        if (State.currentParam) Playlists.renderDetail(view, State.currentParam);
        else Playlists.render(view);
        break;
      case 'youtube': Downloader.render(view); break;
      default: Library.renderHome(view);
    }
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());