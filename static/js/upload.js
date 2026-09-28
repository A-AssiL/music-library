const Upload = {
  init() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');

    document.getElementById('btnBrowse').addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('click', (e) => {
      if (e.target === dropZone || e.target.tagName === 'P') fileInput.click();
    });

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      if (e.dataTransfer.files.length) this.handle(e.dataTransfer.files);
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files.length) this.handle(fileInput.files);
      fileInput.value = '';
    });
  },

  async handle(files) {
    const st = document.getElementById('uploadStatus');
    for (const file of files) {
      const n = file.name.toLowerCase();
      if (!/\.(mp3|m4a|webm)$/.test(n)) {
        st.className = 'status err';
        st.textContent = '⚠️ Unsupported: ' + file.name;
        continue;
      }

      const fd = new FormData();
      fd.append('file', file);
      const t = document.getElementById('uploadTitle').value.trim();
      const a = document.getElementById('uploadArtist').value.trim();
      if (t) fd.append('title', t);
      if (a) fd.append('artist', a);

      st.className = 'status info';
      st.textContent = '⏳ Uploading ' + file.name + '...';

      try {
        const d = await API.upload(fd);
        if (d.success) {
          st.className = 'status ok';
          st.textContent = '✅ ' + d.message;
          UI.toast('Uploaded', 'success');
          await Library.refresh();
        } else {
          st.className = 'status err';
          st.textContent = '❌ ' + (d.detail || d.message);
        }
      } catch (e) {
        st.className = 'status err';
        st.textContent = '❌ ' + e.message;
      }
    }

    setTimeout(() => {
      UI.closeModal('uploadModal');
      document.getElementById('uploadTitle').value = '';
      document.getElementById('uploadArtist').value = '';
      st.textContent = '';
    }, 1400);
  }
};