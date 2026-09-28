"""
Music Library Launcher
------------------------
Starts FastAPI in a background thread, then opens a native window.
Runs from source (python launcher.py) or from .exe (PyInstaller).
"""

import sys
import os
import time
import threading
import socket
import traceback
import logging
from pathlib import Path


# ================================================================
# Base dir — works from source AND from .exe
# ================================================================
def _base_dir() -> Path:
    if getattr(sys, "frozen", False):
        # Running from PyInstaller exe
        return Path(sys.executable).parent
    return Path(__file__).parent.absolute()


BASE_DIR = _base_dir()
sys.path.insert(0, str(BASE_DIR))

# ================================================================
# Log file for debugging (silent runs)
# ================================================================
LOG_FILE = BASE_DIR / "launcher.log"

logging.basicConfig(
    filename=str(LOG_FILE),
    level=logging.INFO,
    format="%(asctime)s  %(levelname)s  %(message)s",
)

# ================================================================
# Hide console ONLY when running as .exe (not from python)
# ================================================================
IS_FROZEN = getattr(sys, "frozen", False)

if IS_FROZEN and sys.platform == "win32":
    try:
        import ctypes
        ctypes.windll.user32.ShowWindow(
            ctypes.windll.kernel32.GetConsoleWindow(), 0
        )
    except Exception:
        pass


# ================================================================
# Imports (deferred so errors get logged)
# ================================================================
try:
    import uvicorn
    import webview
    from main import app
except Exception as e:
    logging.exception("Import failed")
    if not IS_FROZEN:
        raise
    # Show a native error dialog on Windows
    try:
        import ctypes
        ctypes.windll.user32.MessageBoxW(
            0, f"Failed to start:\n\n{e}", "Music Library Error", 0x10
        )
    except Exception:
        pass
    sys.exit(1)


# ================================================================
# Config
# ================================================================
HOST = "127.0.0.1"
PORT = 8000
URL = f"http://{HOST}:{PORT}/web"

logging.info("Starting Music Library...")
logging.info(f"Base dir: {BASE_DIR}")
logging.info(f"URL: {URL}")


# ================================================================
# Helpers
# ================================================================
def _is_port_in_use(host: str, port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.3)
        return s.connect_ex((host, port)) == 0


def _wait_for_server(host: str, port: int, timeout: float = 20.0) -> bool:
    start = time.time()
    while time.time() - start < timeout:
        try:
            with socket.create_connection((host, port), timeout=0.5):
                return True
        except OSError:
            time.sleep(0.1)
    return False


def _find_free_port(start: int = 8000, end: int = 8100) -> int:
    for p in range(start, end):
        if not _is_port_in_use(HOST, p):
            return p
    return start


def run_server(port: int):
    try:
        uvicorn.run(
            app,
            host=HOST,
            port=port,
            log_level="warning",
            access_log=False,
        )
    except Exception:
        logging.exception("Server crashed")


# ================================================================
# Main
# ================================================================
def main():
    global URL

    # Pick a free port (in case 8000 is taken)
    port = PORT
    if _is_port_in_use(HOST, port):
        logging.warning(f"Port {port} in use, finding another...")
        port = _find_free_port(8000, 8100)
    URL = f"http://{HOST}:{port}/web"

    # Start server in background
    server_thread = threading.Thread(
        target=run_server, args=(port,), daemon=True
    )
    server_thread.start()

    # Wait for it to come up
    if not _wait_for_server(HOST, port, timeout=20):
        logging.error("Server did not start")
        if IS_FROZEN:
            try:
                import ctypes
                ctypes.windll.user32.MessageBoxW(
                    0,
                    f"Server did not start on port {port}.\n"
                    f"See: {LOG_FILE}",
                    "Music Library Error",
                    0x10,
                )
            except Exception:
                pass
        sys.exit(1)

    logging.info(f"Server ready at {URL}")

    # Open the native window
    try:
        webview.create_window(
            "🎵 Music Library",
            URL,
            width=1200,
            height=800,
            min_size=(900, 600),
            text_select=False,
            easy_drag=False,
        )
        webview.start()
    except Exception:
        logging.exception("Webview failed")
    finally:
        logging.info("App closed")


if __name__ == "__main__":
    try:
        main()
    except Exception:
        logging.exception("Fatal error in main")
        raise