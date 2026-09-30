"""Render the brand SVG with Remotion and package it as PNG/ICO.

Requires the project dev dependencies, Node.js and Pillow.
"""

from pathlib import Path
import os
import subprocess

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "build" / "icon.svg"
PNG = ROOT / "build" / "icon.png"
ICO = ROOT / "build" / "icon.ico"

subprocess.run(
    [
        "npx.cmd" if os.name == "nt" else "npx",
        "remotion",
        "still",
        "docs/media/promo/entry.tsx",
        "PocketDesktopIcon",
        str(PNG),
        "--public-dir=build",
    ],
    cwd=ROOT,
    check=True,
)
image = Image.open(PNG).convert("RGBA")
image.save(ICO, format="ICO", sizes=[(size, size) for size in (16, 24, 32, 48, 64, 128, 256)])
print(f"Rendered {PNG.name} and {ICO.name} from {SOURCE.name}")
