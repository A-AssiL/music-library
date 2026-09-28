# 🎵 Music Library Server

> A self-hosted personal music streaming server built with **FastAPI** and **Vanilla JavaScript**.

Music Library Server lets you build your own private music collection and access it through a modern web interface from your computer, phone, tablet, or other devices on your network.

Upload your own MP3 / M4A / WEBM files, download audio from YouTube, manage your library, create playlists, mark favourites, search your collection, and stream your music directly from your browser.

---

## ✨ Features

### 🎧 Music Player

* Play music directly from the browser
* Custom progress bar
* Click or drag to seek through a track
* Previous / next track
* Play / pause
* Shuffle mode
* Repeat mode
* Volume control
* Keyboard shortcuts
* Automatic playback of the next track
* HTTP Range request support for efficient audio streaming

### 📚 Music Library

* Upload **MP3**, **M4A**, and **WEBM** files
* Browse your entire collection
* Search by title, artist, or album
* Sort by title, artist, date added, or duration
* Display track duration
* Display library statistics
* Download individual tracks to your device
* Delete tracks

### 📥 YouTube Audio Download

Paste a YouTube URL and download the audio directly through the server.

The backend uses **`yt-dlp` only** — no FFmpeg required.

* Downloads the best available audio stream as `.m4a` or `.webm`
* Automatically adds the track to your library
* Supports custom title and artist before download
* Works with most public YouTube videos

> **Note:** YouTube changes its format system frequently. If a download fails, run `pip install -U yt-dlp` and try again.

> **Important:** Only download or store content you have the legal right to download and use. Respect copyright and the terms applicable to the content and service you use.

### ❤️ Favorites

Mark tracks as favourites and quickly access the music you listen to most.

Favorites are stored locally in the browser using `localStorage`.

### 📋 Playlists

Create your own playlists and organize your music.

* Create playlists
* Rename playlists
* Delete playlists
* Add tracks to playlists
* Remove tracks from playlists
* Switch between playlists

Playlist information is stored in browser `localStorage`.

### 🌙 Dark / Light Mode

Switch between dark and light themes.

Your preference is saved locally and restored automatically when you return.

### 📱 Responsive Interface

The interface is designed to work across:

* 🖥️ Desktop
* 💻 Laptop
* 📱 Smartphone
* 📲 Tablet

The layout adapts to smaller screens automatically.

### 📊 Library Statistics

The dashboard provides information such as:

* Total number of tracks
* Total library size
* Total playing time
* Number of artists

---

# 🖥️ Screenshots

Add screenshots of your application here.

```text
docs/
└── screenshots/
    ├── dashboard.png
    ├── player.png
    ├── mobile.png
    └── playlist.png






the base(the magic) thing :


pip install -U yt-dlp