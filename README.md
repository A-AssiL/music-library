# 🎵 Music Library Server

> A self-hosted personal music streaming server built with **FastAPI** and **Vanilla JavaScript**.

Music Library Server lets you build your own private music collection and access it through a modern web interface from your computer, phone, tablet, or other devices on your network.

Upload your own MP3 files, manage your library, create playlists, mark favourites, search your collection, and stream your music directly from your browser.

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

* Upload MP3 files
* Browse your entire collection
* Search by:

  * Title
  * Artist
  * Album
* Sort by:

  * Title
  * Artist
  * Date added
  * Duration
* Display track duration
* Display library statistics
* Download individual tracks
* Delete tracks

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

Playlist information is currently stored in browser `localStorage`.

### 📥 YouTube Audio Download

Paste a YouTube URL and download the audio through the server.

The backend uses:

* `yt-dlp`
* `FFmpeg`

Downloaded audio can then be added to your music library.

> **Important:** Only download or store content you have the legal right to download and use. Respect copyright and the terms applicable to the content and service you use.

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
```

Example:

![Music Library Dashboard](docs/screenshots/dashboard.png)

---

# 🏗️ Architecture

The project follows a simple client/server architecture:

```text
                     ┌─────────────────────┐
                     │      Browser        │
                     │                     │
                     │ HTML + CSS + JS     │
                     └──────────┬──────────┘
                                │
                         HTTP / REST API
                                │
                                ▼
                     ┌─────────────────────┐
                     │      FastAPI        │
                     │      Backend        │
                     ├─────────────────────┤
                     │ Library Management  │
                     │ Upload / Download   │
                     │ Audio Streaming     │
                     │ Metadata            │
                     └──────────┬──────────┘
                                │
                 ┌──────────────┼──────────────┐
                 ▼              ▼              ▼
           ┌──────────┐   ┌──────────┐   ┌──────────┐
           │ Library  │   │ Metadata │   │ FFmpeg   │
           │  MP3s    │   │  JSON    │   │ yt-dlp   │
           └──────────┘   └──────────┘   └──────────┘
```

---

# 🛠️ Tech Stack

## Backend

* Python
* FastAPI
* Uvicorn
* Pydantic
* python-multipart
* aiofiles

## Frontend

* HTML5
* CSS3
* Vanilla JavaScript
* Web Audio / HTML5 Audio APIs
* Browser `localStorage`

## Audio

* FFmpeg
* yt-dlp
* Mutagen

No frontend framework is required.

---

# 📁 Project Structure

A typical project structure looks like this:

```text
music-library-server/
│
├── main.py
├── requirements.txt
├── README.md
├── LICENSE
├── .gitignore
│
├── static/
│   └── index.html
│
├── library/
│   ├── metadata.json
│   └── *.mp3
│
├── downloads/
│   └── temporary-files
│
└── docs/
    └── screenshots/
```

### Important directories

| Directory    | Purpose                             |
| ------------ | ----------------------------------- |
| `static/`    | Frontend files                      |
| `library/`   | Permanent music collection          |
| `downloads/` | Temporary download/conversion files |
| `docs/`      | Documentation and screenshots       |

`library/metadata.json` contains the metadata used to manage the music collection.

---

# 🚀 Installation

## Requirements

Before installing the project, make sure you have:

* Python 3.7+
* FFmpeg
* Git
* Internet connection for YouTube downloading

---

## 1. Clone the repository

```bash
git clone https://github.com/YOUR_USERNAME/music-library-server.git
cd music-library-server
```

Replace `YOUR_USERNAME` with your GitHub username.

---

## 2. Create a virtual environment

### Windows

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

### Linux / macOS

```bash
python3 -m venv venv
source venv/bin/activate
```

---

## 3. Install Python dependencies

```bash
pip install -r requirements.txt
```

Example `requirements.txt`:

```text
fastapi
uvicorn[standard]
yt-dlp
mutagen
python-multipart
aiofiles
pydantic
python-dotenv
```

---

# 🎬 Install FFmpeg

FFmpeg is required when converting downloaded audio.

### Windows

Using `winget`:

```powershell
winget install "FFmpeg (Essentials Build)"
```

Or install FFmpeg manually and make sure `ffmpeg` is available from your terminal.

Verify:

```powershell
ffmpeg -version
```

### Ubuntu / Debian

```bash
sudo apt update
sudo apt install ffmpeg
```

Verify:

```bash
ffmpeg -version
```

### macOS

```bash
brew install ffmpeg
```

---

# ▶️ Running the Server

Start the application with:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

For development with automatic reload:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The application will be available at:

```text
http://localhost:8000/web
```

---

# 🌐 Accessing From Another Device

If the server is running on your local network, you can access it from another device.

For example, if your server's LAN IP is:

```text
192.168.1.4
```

open:

```text
http://192.168.1.4:8000/web
```

This allows you to use the music library from:

* Your phone
* Another PC
* Laptop
* Tablet
* Smart devices with a compatible browser

The server must be reachable from the other device and the firewall must allow the configured port.

---

# 📡 API

The backend exposes a REST API.

## General

| Method | Endpoint | Description                     |
| ------ | -------- | ------------------------------- |
| `GET`  | `/`      | Redirect to the web application |
| `GET`  | `/web`   | Web interface                   |

## Tracks

| Method   | Endpoint       | Description               |
| -------- | -------------- | ------------------------- |
| `GET`    | `/tracks`      | Return all tracks         |
| `GET`    | `/tracks/{id}` | Return one track          |
| `DELETE` | `/tracks/{id}` | Delete a track            |
| `GET`    | `/search`      | Search the music library  |
| `GET`    | `/stats`       | Return library statistics |

Example:

```text
GET /search?q=metal&limit=20
```

## Upload

```text
POST /upload
```

Accepts an MP3 file using `multipart/form-data`.

## YouTube Download

```text
POST /download
```

Example request:

```json
{
  "url": "https://www.youtube.com/watch?v=...",
  "title": "My Track",
  "artist": "Artist"
}
```

## Streaming

```text
GET /stream/{id}
```

The streaming endpoint supports HTTP `Range` requests.

This is important because it allows the browser to request only portions of an audio file, which enables seeking through the track.

## Direct Download

```text
GET /download-file/{id}
```

Downloads the original MP3 file.

---

# 🔊 Audio Streaming

The player uses HTTP Range requests for seeking.

A request can look like:

```http
Range: bytes=0-100
```

The server should respond with a partial-content response:

```http
HTTP/1.1 206 Partial Content
```

along with appropriate headers such as:

```http
Accept-Ranges: bytes
Content-Range: bytes ...
Content-Length: ...
Content-Type: audio/mpeg
```

This is what allows the browser to jump to different positions in an MP3 without downloading the entire file first.

---

# ⚙️ Configuration

The server can be configured through the application settings/environment variables used by the backend.

Common options include:

```text
HOST=0.0.0.0
PORT=8000
```

The default library location is:

```text
library/
```

Metadata:

```text
library/metadata.json
```

Temporary downloads:

```text
downloads/
```

---

# 🔐 Security Notes

This project is primarily designed for **personal/self-hosted use**.

Before exposing it to the public internet, consider implementing:

* Authentication
* Authorization
* HTTPS/TLS
* Rate limiting
* Upload size limits
* File type validation
* Request validation
* Secure secret management
* Protection against path traversal
* Restricted administrative endpoints
* Reverse proxy configuration
* Firewall rules

Do **not** expose an unauthenticated music management server directly to the public internet.

For a home server, keeping the application accessible only through your LAN is a much safer starting point.

---

# 🐳 Docker

Docker support can be added to make deployment easier and reproducible.

A typical deployment can eventually look like:

```text
Docker Compose
│
├── music-library
│   ├── FastAPI
│   ├── Uvicorn
│   ├── FFmpeg
│   └── yt-dlp
│
└── Persistent Storage
    └── library/
```

Persistent volumes should be used for the music library so that rebuilding the container does not remove your music.

---

# 🧪 Development

Start the development server:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

Then open:

```text
http://localhost:8000/web
```

When debugging API problems, FastAPI also provides interactive API documentation:

```text
http://localhost:8000/docs
```

and:

```text
http://localhost:8000/redoc
```

---

# 🐛 Troubleshooting

## The page does not load

Check that the server is running:

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

Then visit:

```text
http://localhost:8000/web
```

---

## Music does not play

Check:

1. The track exists in `library/`.
2. `/stream/{id}` returns the audio correctly.
3. The browser console contains no JavaScript errors.
4. The server returns the correct audio MIME type.
5. Range requests are supported.

---

## Seeking does not work

The streaming endpoint must correctly handle the browser's `Range` header.

A successful partial response should return:

```text
206 Partial Content
```

and include:

```text
Accept-Ranges: bytes
Content-Range: bytes ...
```

---

## YouTube download fails

Check:

```bash
yt-dlp --version
```

and:

```bash
ffmpeg -version
```

Both must be available to the application.

YouTube and other online services can also change their behavior, which may require updating `yt-dlp`.

---

# 🗺️ Roadmap

The project is currently focused on providing a simple self-hosted music experience.

Potential future improvements:

* [ ] User authentication
* [ ] Persistent playlists in the backend
* [ ] Album support
* [ ] Artist pages
* [ ] Album artwork management
* [ ] Better metadata editing
* [ ] Automatic metadata extraction
* [ ] Queue management
* [ ] Recently played tracks
* [ ] Listening history
* [ ] Multiple user accounts
* [ ] Persistent favorites
* [ ] Docker Compose deployment
* [ ] HTTPS / reverse proxy setup
* [ ] PWA support
* [ ] Mobile-friendly installation
* [ ] Backup and restore
* [ ] PostgreSQL/SQLite database option
* [ ] Better audio format support

---

# 🤝 Contributing

Contributions, bug reports, and suggestions are welcome.

### Fork the project

```bash
git clone https://github.com/A-AssiL/music-library.git
cd music-library
```

Create a branch:

```bash
git checkout -b feature/my-feature
```

Make your changes and test them.

Commit:

```bash
git add .
git commit -m "Add my feature"
```

Push:

```bash
git push origin feature/my-feature
```

Then open a Pull Request.

---

# 📄 License

This project is licensed under the **MIT License**.

See [`LICENSE`](LICENSE) for the complete license text.

---

# 🙏 Acknowledgements

This project is built with excellent open-source software:

* FastAPI
* Uvicorn
* yt-dlp
* FFmpeg
* Mutagen
* Python

---

# 📬 Contact

Found a bug or have an idea?

Open a GitHub Issue or start a discussion in the repository.

---

## ⭐ Support the Project

If you find this project useful:

* ⭐ Star the repository
* 🐛 Report bugs
* 💡 Suggest improvements
* 🔧 Contribute code
* 📢 Share the project

---

**Built for personal music ownership, self-hosting, and learning. 🎧**
