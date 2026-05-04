#!/usr/bin/env python3
"""Generate minimal PNG icons (RGBA) without third-party deps. Run from repo root: python3 scripts/gen_icons.py"""
from __future__ import annotations

import struct
import zlib
from pathlib import Path

# ASU-adjacent maroon for small toolbar/Store tile legibility
MAROON = (140, 29, 64, 255)


def _chunk(tag: bytes, data: bytes) -> bytes:
    return (
        struct.pack("!I", len(data))
        + tag
        + data
        + struct.pack("!I", zlib.crc32(tag + data) & 0xFFFFFFFF)
    )


def write_solid_rgba_png(path: Path, size: int, rgba: tuple[int, int, int, int]) -> None:
    r, g, b, a = rgba
    row = b"\x00" + bytes([r, g, b, a]) * size
    raw = row * size
    ihdr = struct.pack("!IIBBBBB", size, size, 8, 6, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n"
    png += _chunk(b"IHDR", ihdr)
    png += _chunk(b"IDAT", zlib.compress(raw, 9))
    png += _chunk(b"IEND", b"")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(png)


def main() -> None:
    root = Path(__file__).resolve().parent.parent
    icons = root / "icons"
    for size in (16, 32, 48, 128):
        write_solid_rgba_png(icons / f"icon{size}.png", size, MAROON)
    print("Wrote icons/icon16.png, icon32.png, icon48.png, icon128.png")


if __name__ == "__main__":
    main()
