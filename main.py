import os
import json
import shutil
from pathlib import Path
from typing import List, Optional
from datetime import datetime
import re

from fastapi import FastAPI, HTTPException, UploadFile, File, Query
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import yt_dlp
from mutagen.mp3 import MP3
from mutagen.id3 import ID3, TIT2, TPE1, TALB, TDRC
import aiofiles


from fastapi import FastAPI, HTTPException, UploadFile, File, Query, Request
# ============================================
# CONFIGURATION
# ============================================

BASE_DIR = Path(__file__).parent.absolute()
DOWNLOAD_DIR = BASE_DIR / "downloads"
LIBRARY_DIR = BASE_DIR / "library"
STATIC_DIR = BASE_DIR / "static"
METADATA_FILE = LIBRARY_DIR / "metadata.json"

# Create all necessary directories
DOWNLOAD_DIR.mkdir(exist_ok=True)
LIBRARY_DIR.mkdir(exist_ok=True)
STATIC_DIR.mkdir(exist_ok=True)

# ============================================
# FASTAPI APP INITIALIZATION
# ============================================

app = FastAPI(
    title="🎵 Music Library Server",
    description="Download and manage music from YouTube",
    version="1.0.0"
)

# Enable CORS for all origins (for web access)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# DATA MODELS (Pydantic)
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
    youtube_url: Optional[str] = None
    thumbnail: Optional[str] = None

class DownloadRequest(BaseModel):
    url: str
    title: Optional[str] = None
    artist: Optional[str] = None

class DownloadResponse(BaseModel):
    success: bool
    message: str
    track_id: Optional[str] = None
    track: Optional[MusicTrack] = None

# ============================================
# LIBRARY MANAGEMENT
# ============================================

def load_library():
    """Load music library metadata from JSON file"""
    if METADATA_FILE.exists():
        try:
            with open(METADATA_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return {"tracks": []}
    return {"tracks": []}

def save_library(library_data):
    """Save music library metadata to JSON file"""
    with open(METADATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(library_data, f, indent=2, ensure_ascii=False)

def get_track_by_id(track_id: str):
    """Get a track by its ID"""
    library = load_library()
    for track in library["tracks"]:
        if track["id"] == track_id:
            return track
    return None

def sanitize_filename(filename: str) -> str:
    """Remove invalid characters from filename for Windows"""
    # Remove invalid characters
    filename = re.sub(r'[<>:"/\\|?*]', '', filename)
    # Remove trailing dots and spaces
    filename = filename.strip('. ')
    # Limit length
    if len(filename) > 200:
        filename = filename[:200]
    return filename or "untitled"

# ============================================
# YOUTUBE DOWNLOAD FUNCTION
# ============================================

def download_youtube_audio(url: str, custom_title: Optional[str] = None, custom_artist: Optional[str] = None):
    """Download audio from YouTube using yt-dlp"""
    
    # Create a unique temp directory
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:-3]
    temp_dir = DOWNLOAD_DIR / timestamp
    temp_dir.mkdir(exist_ok=True)
    
    ydl_opts = {
        'format': 'bestaudio/best',
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }],
        'outtmpl': str(temp_dir / '%(title)s.%(ext)s'),
        'quiet': True,
        'no_warnings': True,
        'extract_flat': False,
        'ignoreerrors': True,
        'no_check_certificate': True,
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            # Download and extract info
            info = ydl.extract_info(url, download=True)
            
            if not info:
                raise Exception("Failed to extract video information")
            
            # Get metadata
            original_title = info.get('title', 'Unknown')
            artist = info.get('uploader', 'Unknown Artist')
            
            # Find the downloaded MP3 file
            mp3_files = list(temp_dir.glob("*.mp3"))
            if not mp3_files:
                raise Exception("No MP3 file was downloaded")
            
            file_path = mp3_files[0]
            
            # Use custom title/artist if provided
            final_title = custom_title or original_title
            final_artist = custom_artist or artist
            
            # Generate track ID
            track_id = f"track_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            # Create final filename and path
            new_filename = sanitize_filename(f"{final_title} - {final_artist}.mp3")
            final_path = LIBRARY_DIR / new_filename
            
            # Handle duplicate filenames
            counter = 1
            while final_path.exists():
                name_parts = new_filename.rsplit('.', 1)
                new_filename = sanitize_filename(f"{name_parts[0]}_{counter}.{name_parts[1]}")
                final_path = LIBRARY_DIR / new_filename
                counter += 1
            
            # Move file to library
            shutil.move(str(file_path), str(final_path))
            
            # Clean up temp directory
            shutil.rmtree(temp_dir)
            
            # Extract audio metadata
            try:
                audio = MP3(final_path)
                duration = int(audio.info.length)
                file_size = final_path.stat().st_size
            except:
                duration = 0
                file_size = final_path.stat().st_size
            
            # Get thumbnail
            thumbnail = info.get('thumbnail')
            
            # Create track metadata
            track = {
                "id": track_id,
                "title": final_title,
                "artist": final_artist,
                "album": info.get('album') or info.get('title', ''),
                "year": str(info.get('upload_date', ''))[:4] if info.get('upload_date') else None,
                "duration": duration,
                "file_path": str(final_path),
                "file_size": file_size,
                "added_date": datetime.now().isoformat(),
                "youtube_url": url,
                "thumbnail": thumbnail
            }
            
            # Update MP3 ID3 tags
            try:
                audio_tags = ID3(final_path)
                audio_tags.add(TIT2(encoding=3, text=final_title))
                audio_tags.add(TPE1(encoding=3, text=final_artist))
                if track['album']:
                    audio_tags.add(TALB(encoding=3, text=track['album']))
                if track['year']:
                    audio_tags.add(TDRC(encoding=3, text=track['year']))
                audio_tags.save()
            except:
                pass  # Ignore tag errors
            
            return track
            
    except Exception as e:
        # Clean up on error
        if temp_dir.exists():
            shutil.rmtree(temp_dir)
        raise Exception(f"Download failed: {str(e)}")

# ============================================
# API ENDPOINTS
# ============================================

@app.get("/", response_class=HTMLResponse)
async def root():
    """Redirect to web interface"""
    return """
    <html>
        <head><title>🎵 Music Library</title></head>
        <body style="font-family: Arial; text-align: center; padding: 50px;">
            <h1>🎵 Music Library Server</h1>
            <p>Visit the <a href="/web">Web Interface</a> or <a href="/docs">API Docs</a></p>
            <script>window.location.href = '/web';</script>
        </body>
    </html>
    """

@app.get("/tracks", response_model=List[MusicTrack])
async def get_all_tracks():
    """Get all tracks in the library"""
    library = load_library()
    return library["tracks"]

@app.get("/tracks/{track_id}", response_model=MusicTrack)
async def get_track(track_id: str):
    """Get a specific track by ID"""
    track = get_track_by_id(track_id)
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    return track

@app.post("/download", response_model=DownloadResponse)
async def download_track(request: DownloadRequest):
    """Download audio from YouTube and add to library"""
    
    # Validate URL
    if not request.url or not (request.url.startswith("http")):
        raise HTTPException(status_code=400, detail="Invalid URL")
    
    try:
        # Download the audio
        track = download_youtube_audio(
            request.url,
            request.title,
            request.artist
        )
        
        # Add to library
        library = load_library()
        library["tracks"].append(track)
        save_library(library)
        
        return DownloadResponse(
            success=True,
            message=f"✅ Successfully downloaded: {track['title']}",
            track_id=track["id"],
            track=track
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/upload")
async def upload_local_file(
    file: UploadFile = File(...),
    title: Optional[str] = None,
    artist: Optional[str] = None
):
    """Upload a local MP3 file to the library"""
    
    # Validate file type
    if not file.filename.lower().endswith('.mp3'):
        raise HTTPException(status_code=400, detail="Only MP3 files are allowed")
    
    try:
        # Generate track ID and filename
        track_id = f"track_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # Create filename
        original_name = Path(file.filename).stem
        final_title = title or original_name
        final_artist = artist or "Unknown Artist"
        
        new_filename = sanitize_filename(f"{final_title} - {final_artist}.mp3")
        final_path = LIBRARY_DIR / new_filename
        
        # Handle duplicate filenames
        counter = 1
        while final_path.exists():
            name_parts = new_filename.rsplit('.', 1)
            new_filename = sanitize_filename(f"{name_parts[0]}_{counter}.{name_parts[1]}")
            final_path = LIBRARY_DIR / new_filename
            counter += 1
        
        # Save file
        async with aiofiles.open(final_path, 'wb') as f:
            content = await file.read()
            await f.write(content)
        
        # Extract metadata
        try:
            audio = MP3(final_path)
            duration = int(audio.info.length)
            file_size = final_path.stat().st_size
        except:
            duration = 0
            file_size = final_path.stat().st_size
        
        # Create track
        track = {
            "id": track_id,
            "title": final_title,
            "artist": final_artist,
            "album": None,
            "year": None,
            "duration": duration,
            "file_path": str(final_path),
            "file_size": file_size,
            "added_date": datetime.now().isoformat(),
            "youtube_url": None,
            "thumbnail": None
        }
        
        # Update ID3 tags
        try:
            audio_tags = ID3(final_path)
            audio_tags.add(TIT2(encoding=3, text=final_title))
            audio_tags.add(TPE1(encoding=3, text=final_artist))
            audio_tags.save()
        except:
            pass
        
        # Add to library
        library = load_library()
        library["tracks"].append(track)
        save_library(library)
        
        return {
            "success": True,
            "message": f"✅ Uploaded: {track['title']}",
            "track": track
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from fastapi.responses import StreamingResponse
import os

from fastapi.responses import StreamingResponse
import os

@app.get("/stream/{track_id}")
async def stream_track(track_id: str, request: Request):
    track = get_track_by_id(track_id)
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    file_path = Path(track["file_path"])
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    file_size = file_path.stat().st_size
    range_header = request.headers.get("range")

    if range_header:
        # Parse "bytes=start-end"
        range_match = range_header.replace("bytes=", "").split("-")
        start = int(range_match[0]) if range_match[0] else 0
        end = int(range_match[1]) if range_match[1] else file_size - 1

        # Clamp to valid range
        start = max(0, start)
        end = min(file_size - 1, end)
        if start > end:
            start = end = 0

        content_length = end - start + 1

        def generate_chunks():
            with open(file_path, "rb") as f:
                f.seek(start)
                remaining = content_length
                chunk_size = 1024 * 1024  # 1MB
                while remaining > 0:
                    chunk = f.read(min(chunk_size, remaining))
                    if not chunk:
                        break
                    remaining -= len(chunk)
                    yield chunk

        headers = {
            "Content-Range": f"bytes {start}-{end}/{file_size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(content_length),
            "Content-Type": "audio/mpeg",
            "Cache-Control": "no-cache",
        }
        return StreamingResponse(
            generate_chunks(),
            status_code=206,
            headers=headers,
            media_type="audio/mpeg",
        )
    else:
        # Full file response
        return FileResponse(
            path=file_path,
            media_type="audio/mpeg",
            filename=file_path.name,
            headers={"Accept-Ranges": "bytes"},
        )  
@app.get("/download-file/{track_id}")
async def download_file(track_id: str):
    """Download the MP3 file directly"""
    
    track = get_track_by_id(track_id)
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    
    file_path = Path(track["file_path"])
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(
        path=file_path,
        media_type="audio/mpeg",
        filename=sanitize_filename(f"{track['title']} - {track['artist']}.mp3")
    )

@app.delete("/tracks/{track_id}")
async def delete_track(track_id: str):
    """Delete a track from the library"""
    
    track = get_track_by_id(track_id)
    if not track:
        raise HTTPException(status_code=404, detail="Track not found")
    
    # Delete file
    file_path = Path(track["file_path"])
    if file_path.exists():
        file_path.unlink()
    
    # Remove from library
    library = load_library()
    library["tracks"] = [t for t in library["tracks"] if t["id"] != track_id]
    save_library(library)
    
    return {"success": True, "message": f"🗑️ Deleted: {track['title']}"}

@app.get("/search")
async def search_tracks(
    q: str = Query(..., min_length=1),
    limit: int = Query(50, ge=1, le=100)
):
    """Search tracks by title or artist"""
    
    library = load_library()
    query = q.lower()
    
    results = []
    for track in library["tracks"]:
        if (query in track["title"].lower() or 
            query in track["artist"].lower() or
            (track.get("album") and query in track["album"].lower())):
            results.append(track)
    
    return {
        "results": results[:limit],
        "total": len(results)
    }

@app.get("/stats")
async def get_stats():
    """Get library statistics"""
    
    library = load_library()
    tracks = library["tracks"]
    
    total_size = sum(t.get("file_size", 0) for t in tracks)
    total_duration = sum(t.get("duration", 0) for t in tracks)
    
    return {
        "total_tracks": len(tracks),
        "total_size_mb": round(total_size / (1024 * 1024), 2),
        "total_duration_hours": round(total_duration / 3600, 2),
        "artists": len(set(t.get("artist", "Unknown") for t in tracks if t.get("artist")))
    }

# ============================================
# SERVE STATIC FILES (WEB INTERFACE)
# ============================================

# Create static directory if it doesn't exist
STATIC_DIR.mkdir(exist_ok=True)

# Mount static files
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

@app.get("/web", response_class=HTMLResponse)
async def web_interface():
    """Serve the web interface"""
    index_file = STATIC_DIR / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    return HTMLResponse("""
    <html>
        <head><title>Music Library</title></head>
        <body>
            <h1>🎵 Music Library</h1>
            <p>Please create <code>static/index.html</code> file.</p>
        </body>
    </html>
    """)

# ============================================
# RUN THE SERVER
# ============================================

if __name__ == "__main__":
    import uvicorn
    print("""
    ╔══════════════════════════════════════════╗
    ║     🎵 Music Library Server              ║
    ║                                          ║
    ║  Running on: http://localhost:8000      ║
    ║  Web UI:    http://localhost:8000/web   ║
    ║  API Docs:  http://localhost:8000/docs  ║
    ╚══════════════════════════════════════════╝
    """)
    uvicorn.run(app, host="0.0.0.0", port=8000)