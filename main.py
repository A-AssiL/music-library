import json
import re
import mimetypes
import shutil
import traceback
from pathlib import Path
from typing import List, Optional
from datetime import datetime

from fastapi import FastAPI, HTTPException, UploadFile, File, Query, Request
from fastapi.responses import FileResponse, HTMLResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from mutagen import File as MutagenFile
from mutagen.id3 import ID3, TIT2, TPE1
import aiofiles
import yt_dlp


# ============================================
# CONFIGURATION
# ============================================

import sys

def _resolve_dirs():
    """
    Returns (READ_DIR, WRITE_DIR).

    READ_DIR  = where static/ lives (inside PyInstaller bundle when frozen)
    WRITE_DIR = where library/, metadata.json, temp_downloads/ live
                (always beside the exe so user data survives updates)
    """
    if getattr(sys, "frozen", False):
        # Running as PyInstaller exe
        exe_dir = Path(sys.executable).parent

        # PyInstaller 6.x onedir mode: bundled files go into _internal/
        bundled = exe_dir / "_internal"
        read_dir = bundled if bundled.exists() else exe_dir

        write_dir = exe_dir
        return read_dir, write_dir

    # Running from source
    base = Path(__file__).parent.absolute()
    return base, base


READ_DIR, WRITE_DIR = _resolve_dirs()

# Read-only bundled resources
STATIC_DIR = READ_DIR / "static"

# Writable user data (next to exe so it persists)
LIBRARY_DIR = WRITE_DIR / "library"
TEMP_DIR = WRITE_DIR / "temp_downloads"
METADATA_FILE = LIBRARY_DIR / "metadata.json"

# Keep BASE_DIR for backwards compatibility
BASE_DIR = WRITE_DIR
ALLOWED_EXTENSIONS = {".mp3", ".m4a", ".webm", ".opus", ".ogg"}

LIBRARY_DIR.mkdir(exist_ok=True)
STATIC_DIR.mkdir(exist_ok=True)
TEMP_DIR.mkdir(exist_ok=True)


# ============================================
# FASTAPI APP
# ============================================

app = FastAPI(
    title="Music Library Server",
    description="Library + YouTube downloader (no FFmpeg needed)",
    version="2.4.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================
# MODELS
# ============================================

class MusicTrack(BaseModel):
    id: str
    title: str
    artist: Optional[str] = "Unknown Artist"
    album: Optional[str] = None
    year: Optional[str] = None
    duration: Optional[int] = None
    file_path: str
    file_size: int
    added_date: str
    source_url: Optional[str] = None
    thumbnail: Optional[str] = None


class DownloadRequest(BaseModel):
    url: str
    title: Optional[str] = None
    artist: Optional[str] = None


# ============================================
# LIBRARY HELPERS
# ============================================

def load_library():
    if METADATA_FILE.exists():
        try:
            with open(METADATA_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {"tracks": []}
    return {"tracks": []}


def save_library(data):
    with open(METADATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def get_track_by_id(track_id: str):
    for track in load_library()["tracks"]:
        if track["id"] == track_id:
            return track
    return None


def sanitize_filename(name: str) -> str:
    name = re.sub(r'[<>:"/\\|?*]', "", name)
    name = name.strip(". ")
    if len(name) > 180:
        name = name[:180]
    return name or "untitled"


def unique_path(path: Path) -> Path:
    if not path.exists():
        return path
    stem, ext = path.stem, path.suffix
    i = 1
    while True:
        candidate = path.parent / f"{stem}_{i}{ext}"
        if not candidate.exists():
            return candidate
        i += 1


def read_duration(path: Path) -> int:
    try:
        audio = MutagenFile(path)
        if audio and audio.info:
            return int(audio.info.length)
    except Exception:
        pass
    return 0


# ============================================
# ROUTES
# ============================================

@app.get("/", response_class=HTMLResponse)
async def root():
    return """
    <html>
        <head><title>Music Library</title></head>
        <body style="font-family:Arial;text-align:center;padding:50px;">
            <h1>Music Library Server</h1>
            <p><a href="/web">Web Interface</a> | <a href="/docs">API Docs</a></p>
            <script>window.location.href='/web';</script>
        </body>
    </html>
    """


@app.get("/tracks", response_model=List[MusicTrack])
async def get_all_tracks():
    return load_library()["tracks"]


@app.get("/tracks/{track_id}", response_model=MusicTrack)
async def get_track(track_id: str):
    track = get_track_by_id(track_id)
    if not track:
        raise HTTPException(404, "Track not found")
    return track


# ---------- UPLOAD LOCAL FILE ----------

@app.post("/upload")
async def upload_local_file(
    file: UploadFile = File(...),
    title: Optional[str] = None,
    artist: Optional[str] = None,
):
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            400, f"Unsupported file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    try:
        track_id = f"track_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}"
        base_title = title or Path(file.filename).stem
        base_artist = artist or "Unknown Artist"

        filename = sanitize_filename(f"{base_title} - {base_artist}{ext}")
        final_path = unique_path(LIBRARY_DIR / filename)

        async with aiofiles.open(final_path, "wb") as f:
            await f.write(await file.read())

        duration = read_duration(final_path)
        size = final_path.stat().st_size

        track = {
            "id": track_id,
            "title": base_title,
            "artist": base_artist,
            "album": None,
            "year": None,
            "duration": duration,
            "file_path": str(final_path),
            "file_size": size,
            "added_date": datetime.now().isoformat(),
            "source_url": None,
            "thumbnail": None,
        }

        if ext == ".mp3":
            try:
                tags = ID3(final_path)
                tags.add(TIT2(encoding=3, text=base_title))
                tags.add(TPE1(encoding=3, text=base_artist))
                tags.save()
            except Exception:
                pass

        lib = load_library()
        lib["tracks"].append(track)
        save_library(lib)

        return {"success": True, "message": f"Uploaded: {base_title}", "track": track}

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(500, str(e))

# ---------- YOUTUBE DOWNLOAD ----------

@app.post("/download")
async def download_from_youtube(req: DownloadRequest):
    # A valid URL must start with http
    if not req.url or not req.url.startswith("http"):
        raise HTTPException(400, "Invalid URL")

    # --- FIX: Clean the URL to extract only the video ID ---
    # This prevents yt-dlp from ever seeing a playlist parameter.
    from urllib.parse import urlparse, parse_qs
    try:
        parsed = urlparse(req.url)
        qs = parse_qs(parsed.query)
        video_id = qs.get("v", [None])[0]
        # Handle short youtu.be URLs
        if not video_id and parsed.netloc == "youtu.be":
            video_id = parsed.path.lstrip("/")
        
        if video_id:
            clean_url = f"https://www.youtube.com/watch?v={video_id}"
            print(f"DEBUG cleaned URL: {clean_url}")
            req.url = clean_url
    except Exception:
        pass # If it fails, proceed with the original URL
    # --- End of fix ---

    temp_dir = TEMP_DIR / datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    temp_dir.mkdir(parents=True, exist_ok=True)

    # ... (your debug probe code can stay here) ...

    ydl_opts = {
        "format": "bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio",
        "outtmpl": str(temp_dir / "%(title)s.%(ext)s"),
        "restrictfilenames": True,
        "quiet": True,
        "no_warnings": True,
        # --- FIX: Tell yt-dlp to ignore any playlist in the URL ---
        "noplaylist": True, 
        "ignoreerrors": False,
        "nocheckcertificate": True,
        "retries": 20,
        "fragment_retries": 20,
        "socket_timeout": 60,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(req.url, download=True)
        if not info:
            raise Exception("Could not extract video info")

        original_title = info.get("title", "Unknown")
        uploader = info.get("uploader") or "Unknown Artist"
        album = info.get("album") or info.get("title", "")
        year = str(info.get("upload_date", ""))[:4] or None
        thumbnail = info.get("thumbnail")

        # ---- Find the downloaded file ----
        all_files = [p for p in temp_dir.iterdir() if p.is_file()]
        print("DEBUG temp_dir contents:", [p.name for p in all_files])

        downloaded = [
            p for p in all_files
            if p.suffix.lower() in ALLOWED_EXTENSIONS
        ]
        if not downloaded:
            raise Exception(
                f"No audio file was downloaded. Files in temp: "
                f"{[p.name for p in all_files]}"
            )

        src = downloaded[0]
        ext = src.suffix.lower()

        final_title = req.title or original_title
        final_artist = req.artist or uploader

        filename = sanitize_filename(f"{final_title} - {final_artist}{ext}")
        dest = unique_path(LIBRARY_DIR / filename)
        shutil.move(str(src), str(dest))

        duration = read_duration(dest)
        size = dest.stat().st_size

        track = {
            "id": f"track_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}",
            "title": final_title,
            "artist": final_artist,
            "album": album,
            "year": year,
            "duration": duration,
            "file_path": str(dest),
            "file_size": size,
            "added_date": datetime.now().isoformat(),
            "source_url": req.url,
            "thumbnail": thumbnail,
        }

        if ext == ".mp3":
            try:
                tags = ID3(dest)
                tags.add(TIT2(encoding=3, text=final_title))
                tags.add(TPE1(encoding=3, text=final_artist))
                tags.save()
            except Exception:
                pass

        lib = load_library()
        lib["tracks"].append(track)
        save_library(lib)

        return {
            "success": True,
            "message": f"Downloaded: {final_title}",
            "track": track,
        }

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(500, f"Download failed: {type(e).__name__}: {e}")
    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


# ---------- DEBUG: LIST FORMATS ----------

@app.get("/debug-formats")
async def debug_formats(url: str):
    """List available formats for a YouTube URL (for debugging)."""
    try:
        with yt_dlp.YoutubeDL({"quiet": True, "no_warnings": True}) as ydl:
            info = ydl.extract_info(url, download=False)
        formats = [
            {
                "format_id": f.get("format_id"),
                "ext": f.get("ext"),
                "acodec": f.get("acodec"),
                "vcodec": f.get("vcodec"),
                "abr": f.get("abr"),
                "protocol": f.get("protocol"),
                "note": f.get("format_note"),
            }
            for f in info.get("formats", [])
        ]
        return {"title": info.get("title"), "formats": formats}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(500, str(e))


# ---------- STREAM ----------

@app.get("/stream/{track_id}")
async def stream_track(track_id: str, request: Request):
    track = get_track_by_id(track_id)
    if not track:
        raise HTTPException(404, "Track not found")

    file_path = Path(track["file_path"])
    if not file_path.exists():
        raise HTTPException(404, "File not found")

    mime_type, _ = mimetypes.guess_type(file_path)
    if not mime_type:
        mime_type = "application/octet-stream"

    size = file_path.stat().st_size
    range_header = request.headers.get("range")

    if range_header:
        m = range_header.replace("bytes=", "").split("-")
        start = int(m[0]) if m[0] else 0
        end = int(m[1]) if m[1] else size - 1
        start = max(0, start)
        end = min(size - 1, end)
        if start > end:
            start = end = 0
        length = end - start + 1

        def chunks():
            with open(file_path, "rb") as f:
                f.seek(start)
                remaining = length
                while remaining > 0:
                    buf = f.read(min(1024 * 1024, remaining))
                    if not buf:
                        break
                    remaining -= len(buf)
                    yield buf

        return StreamingResponse(
            chunks(),
            206,
            headers={
                "Content-Range": f"bytes {start}-{end}/{size}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(length),
                "Content-Type": mime_type,
            },
            media_type=mime_type,
        )

    return FileResponse(file_path, media_type=mime_type, filename=file_path.name)


# ---------- DOWNLOAD TO DEVICE ----------

@app.get("/download-file/{track_id}")
async def download_file(track_id: str):
    track = get_track_by_id(track_id)
    if not track:
        raise HTTPException(404, "Track not found")

    file_path = Path(track["file_path"])
    if not file_path.exists():
        raise HTTPException(404, "File not found")

    mime_type, _ = mimetypes.guess_type(file_path)
    if not mime_type:
        mime_type = "application/octet-stream"

    download_name = sanitize_filename(
        f"{track['title']} - {track['artist']}{file_path.suffix}"
    )
    return FileResponse(file_path, media_type=mime_type, filename=download_name)


# ---------- DELETE ----------

@app.delete("/tracks/{track_id}")
async def delete_track(track_id: str):
    track = get_track_by_id(track_id)
    if not track:
        raise HTTPException(404, "Track not found")

    p = Path(track["file_path"])
    if p.exists():
        p.unlink()

    lib = load_library()
    lib["tracks"] = [t for t in lib["tracks"] if t["id"] != track_id]
    save_library(lib)
    return {"success": True, "message": f"Deleted: {track['title']}"}


# ---------- SEARCH / STATS ----------

@app.get("/search")
async def search_tracks(q: str = Query(..., min_length=1), limit: int = 50):
    query = q.lower()
    results = [
        t for t in load_library()["tracks"]
        if query in t["title"].lower() or query in t["artist"].lower()
    ]
    return {"results": results[:limit], "total": len(results)}


@app.get("/stats")
async def get_stats():
    tracks = load_library()["tracks"]
    total_size = sum(t.get("file_size", 0) for t in tracks)
    total_duration = sum(t.get("duration", 0) for t in tracks)
    return {
        "total_tracks": len(tracks),
        "total_size_mb": round(total_size / (1024 * 1024), 2),
        "total_duration_hours": round(total_duration / 3600, 2),
        "artists": len(set(t.get("artist") for t in tracks if t.get("artist"))),
    }


# ---------- STATIC ----------

app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


@app.get("/web", response_class=HTMLResponse)
async def web_interface():
    index_file = STATIC_DIR / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    return HTMLResponse("<h1>Create static/index.html</h1>")


# ============================================

if __name__ == "__main__":
    import uvicorn
    print("Music Library Server -> http://localhost:8000/web")
    uvicorn.run(app, host="0.0.0.0", port=8000)