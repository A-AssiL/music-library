const Downloader = {
  render(view) {
    view.innerHTML = '';

    const card = UI.el('div', { class: 'modal', style: 'max-width:600px;margin:0 auto;' });

    card.appendChild(UI.el('h2', { text: '📥 Download from YouTube' }));
    card.appendChild(UI.el('p', {
      class: 'dim',
      style: 'margin-bottom:20px;font-size:0.9rem;',
      text: 'Paste a YouTube URL. The audio will be saved as .m4a or .webm (no FFmpeg needed).'
    }));

    const urlField = UI.el('div', { class: 'field' }, [
      UI.el('label', { text: 'YouTube URL *' }),
      UI.el('input', { id: 'ytUrl', placeholder: 'https://www.youtube.com/watch?v=...' })
    ]);
    card.appendChild(urlField);

    card.appendChild(UI.el('div', { class: 'field' }, [
      UI.el('label', { text: 'Title (optional)' }),
      UI.el('input', { id: 'ytTitle' })
    ]));
    card.appendChild(UI.el('div', { class: 'field' }, [
      UI.el('label', { text: 'Artist (optional)' }),
      UI.el('input', { id: 'ytArtist' })
    ]));

    const btn = UI.el('button', {
      class: 'btn btn-success full',
      text: '📥 Download',
      onclick: () => this.start()
    });
    card.appendChild(btn);

    card.appendChild(UI.el('div', { class: 'status', id: 'ytStatus' }));
    view.appendChild(card);
  },

  async start() {
    const url = document.getElementById('ytUrl').value.trim();
    const title = document.getElementById('ytTitle').value.trim();
    const artist = document.getElementById('ytArtist').value.trim();
    const st = document.getElementById('ytStatus');

    if (!url) {
      st.className = 'status err';
      st.textContent = '❌ Enter a YouTube URL';
      return;
    }

    st.className = 'status info';
    st.textContent = '⏳ Downloading... this may take a minute.';
    document.querySelector('#view .btn-success').disabled = true;

    try {
      const d = await API.downloadYoutube(url, title, artist);
      if (d.success) {
        st.className = 'status ok';
        st.textContent = '✅ ' + d.message;
        document.getElementById('ytUrl').value = '';
        document.getElementById('ytTitle').value = '';
        document.getElementById('ytArtist').value = '';
        UI.toast('Downloaded successfully', 'success');
        await Library.refresh();
      } else {
        st.className = 'status err';
        st.textContent = '❌ ' + (d.detail || d.message || 'Download failed');
      }
    } catch (e) {
      st.className = 'status err';
      st.textContent = '❌ ' + e.message;
    } finally {
      const b = document.querySelector('#view .btn-success');
      if (b) b.disabled = false;
    }
  }
};