# 🎵 Music Library

> A self-hosted personal music streaming server + YouTube downloader.
> Built with **FastAPI**, **Vanilla JavaScript**, and packaged as a **Windows desktop app**.

Music Library lets you build your own private music collection, download audio from YouTube, and stream it through a modern web interface — from your PC, phone, or tablet on your local network.

**No FFmpeg. No winget. One-click launch.**

---

## ✨ Features

### 🎧 Music Player
- Play music directly in the browser or desktop window
- Custom progress bar with click-to-seek and drag-to-seek
- Previous / next track
- Play / pause
- Shuffle mode (with visual feedback)
- Repeat mode — Repeat One with distinct icon 🔂
- Volume control
- Automatic playback of the next track
- HTTP Range request support for efficient streaming

### 📚 Music Library
- Upload **MP3**, **M4A**, and **WEBM** files
- Browse your entire collection
- Search by title or artist
- Sort by title, artist, date added, or duration
- Display track duration
- Download individual tracks to your device
- Delete tracks
- **Automatic cover art** from YouTube thumbnails

### 📥 YouTube Audio Download
- Paste a YouTube URL, download the audio directly through the server
- **No FFmpeg needed** — saves as `.m4a` or `.webm`
- Automatic cover image from YouTube
- Custom title and artist before download
- Handles YouTube playlist URLs (`&list=...`) by extracting only the video

### ❤️ Favorites
- Mark tracks as favourites
- Stored locally in browser `localStorage`
- Dedicated Favorites page

### 📋 Playlists
- **Elegant modal** to add tracks to any playlist
- **Create new playlists** directly from the modal
- **Dedicated playlist pages** with:
  - Hero banner showing cover, name, track count, total duration
  - ▶ Play All / 🔀 Shuffle / 🗑️ Delete buttons
  - Full track list with remove button
- Playlists stored in browser `localStorage`

### 🌙 Dark / Light Mode
- Toggle between themes
- Preference saved and restored automatically

### 📱 Responsive Interface
- Works on desktop, laptop, phone, and tablet
- Sidebar collapses to a hamburger menu on mobile
- Same interface accessible from phone via Wi-Fi

### 🖥️ Desktop App
- **Native window** using PyWebView — no browser tabs
- **Single `.exe`** built with PyInstaller — double-click to launch
- **No black terminal window**
- **No Python installation required** on the user's machine

---

## 🏗️ Architecture

```text
              ┌──────────────────────────┐
              │   MusicLibrary.exe       │
              │   (PyInstaller bundle)   │
              └────────────┬─────────────┘
                           │
              ┌────────────▼─────────────┐
              │      launcher.py         │
              │  (starts server + window)│
              └────────────┬─────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
   ┌─────────┐      ┌────────────┐      ┌───────────┐
   │ FastAPI │      │  PyWebView │      │  Static   │
   │ main.py │      │   window   │      │ HTML/CSS  │
   │         │      │            │      │    /JS    │
   └────┬────┘      └────────────┘      └───────────┘
        │
        ├── /tracks
        ├── /stream/{id}
        ├── /upload
        ├── /download          (yt-dlp)
        ├── /download-file/{id}
        ├── /search
        ├── /stats
        ├── /debug-formats
        └── /web