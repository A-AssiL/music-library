# -*- mode: python ; coding: utf-8 -*-
"""
PyInstaller spec for Music Library.
Build with:  pyinstaller MusicLibrary.spec --clean
Output:      dist/MusicLibrary/MusicLibrary.exe
"""

from PyInstaller.utils.hooks import collect_all, collect_submodules
from pathlib import Path

# Collect yt-dlp (needs its extractors + data)
ytdlp_datas, ytdlp_binaries, ytdlp_hiddenimports = collect_all("yt_dlp")

# Collect all uvicorn submodules
uvicorn_hiddenimports = collect_submodules("uvicorn")

block_cipher = None

a = Analysis(
    ["launcher.py"],
    pathex=["."],
    binaries=ytdlp_binaries,
    datas=ytdlp_datas + [
        ("static", "static"),        # bundle the whole static/ folder
    ],
    hiddenimports=(
        uvicorn_hiddenimports
        + ytdlp_hiddenimports
        + [
            "mutagen",
            "mutagen.mp3",
            "mutagen.id3",
            "mutagen.flac",
            "mutagen.mp4",
            "aiofiles",
            "python_multipart",
        ]
    ),
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=["tkinter", "PyQt5", "PySide2", "matplotlib"],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="MusicLibrary",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,          # ← hides the black window
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,              # ← add path to .ico later if you want
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name="MusicLibrary",
)