const API = {
  async getTracks() {
    return (await fetch('/tracks')).json();
  },
  async getStats() {
    return (await fetch('/stats')).json();
  },
  async deleteTrack(id) {
    return (await fetch(`/tracks/${id}`, { method: 'DELETE' })).json();
  },
  async search(q) {
    return (await fetch(`/search?q=${encodeURIComponent(q)}`)).json();
  },
  async upload(formData) {
    const r = await fetch('/upload', { method: 'POST', body: formData });
    return r.json();
  },
  async downloadYoutube(url, title, artist) {
    const r = await fetch('/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, title, artist })
    });
    return r.json();
  },
  streamUrl(id) { return `/stream/${id}`; },
  downloadUrl(id) { return `/download-file/${id}`; }
};