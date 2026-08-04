#!/usr/bin/env python3
"""
Generate the PetWell browser icons from the app's own PawMark geometry.

    python3 frontend/scripts/build-icons.py

Writes into src/app/, where the Next.js App Router picks them up automatically:
    icon.svg        modern browsers, scales cleanly
    favicon.ico     16/32/48 fallback
    apple-icon.png  180x180 for iOS home screen

The ellipse coordinates are copied from components/shared/Logo.tsx (viewBox
0 0 64 64) so the tab icon and the in-app mark are the same drawing. Raster
output is supersampled 4x and downscaled, since Pillow's draw calls are aliased.
"""

import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw

# Brand blue — the accent used across AppShell, buttons and badges.
BRAND = (94, 134, 173)  # #5E86AD
PAW = (255, 255, 255)

# (cx, cy, rx, ry) on a 64x64 canvas, straight from PawMark in Logo.tsx.
PAW_ELLIPSES = [
    (32.0, 42.0, 13.0, 10.0),  # pad
    (16.0, 30.0, 5.2, 7.0),  # outer left toe
    (25.0, 21.0, 5.0, 7.2),  # inner left toe
    (39.0, 21.0, 5.0, 7.2),  # inner right toe
    (48.0, 30.0, 5.2, 7.0),  # outer right toe
]
PAW_BOX = (10.8, 13.8, 53.2, 52.0)
PAW_SCALE = 1.12

# At 16px the true geometry blurs into a blob: each toe lands on about two
# pixels and antialiasing closes the gaps between them. This variant slims the
# toes, spreads them wider and enlarges the pad, so the four toes stay separate
# once downscaled. Larger sizes use the real geometry above.
PAW_ELLIPSES_SMALL = [
    (32.0, 43.0, 14.0, 10.5),
    (14.0, 30.0, 4.4, 6.0),
    (24.0, 20.0, 4.3, 6.2),
    (40.0, 20.0, 4.3, 6.2),
    (50.0, 30.0, 4.4, 6.0),
]
PAW_BOX_SMALL = (9.6, 13.8, 54.4, 53.5)
PAW_SCALE_SMALL = 1.06

SMALL_THRESHOLD = 24  # below this, use the simplified drawing

SS = 4  # supersample factor
OUT = Path(__file__).resolve().parent.parent / "src" / "app"


def draw_icon(size: int, rounded: bool = True) -> Image.Image:
    px = size * SS
    img = Image.new("RGBA", (px, px), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    if rounded:
        d.rounded_rectangle([0, 0, px - 1, px - 1], radius=px * 0.22, fill=BRAND)
    else:
        d.rectangle([0, 0, px - 1, px - 1], fill=BRAND)

    small = size < SMALL_THRESHOLD
    ellipses = PAW_ELLIPSES_SMALL if small else PAW_ELLIPSES
    box = PAW_BOX_SMALL if small else PAW_BOX
    paw_scale = PAW_SCALE_SMALL if small else PAW_SCALE

    # Map the 64-unit paw into the tile, centred and scaled.
    x0, y0, x1, y1 = box
    paw_w, paw_h = x1 - x0, y1 - y0
    scale = (px / 64.0) * paw_scale
    off_x = (px - paw_w * scale) / 2 - x0 * scale
    off_y = (px - paw_h * scale) / 2 - y0 * scale

    for cx, cy, rx, ry in ellipses:
        d.ellipse(
            [
                off_x + (cx - rx) * scale,
                off_y + (cy - ry) * scale,
                off_x + (cx + rx) * scale,
                off_y + (cy + ry) * scale,
            ],
            fill=PAW,
        )

    return img.resize((size, size), Image.LANCZOS)


def svg() -> str:
    x0, y0, x1, y1 = PAW_BOX
    paw_w, paw_h = x1 - x0, y1 - y0
    scale = PAW_SCALE
    off_x = (64 - paw_w * scale) / 2 - x0 * scale
    off_y = (64 - paw_h * scale) / 2 - y0 * scale

    shapes = "\n".join(
        f'  <ellipse cx="{off_x + cx * scale:.2f}" cy="{off_y + cy * scale:.2f}"'
        f' rx="{rx * scale:.2f}" ry="{ry * scale:.2f}" fill="#FFFFFF" />'
        for cx, cy, rx, ry in PAW_ELLIPSES
    )
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" '
        'width="64" height="64" role="img" aria-label="PetWell">\n'
        '  <rect width="64" height="64" rx="14" fill="#5E86AD" />\n'
        f"{shapes}\n"
        "</svg>\n"
    )


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)

    (OUT / "icon.svg").write_text(svg(), encoding="utf-8")

    # Each size is drawn at its own size rather than resized from one master,
    # so the 16px entry keeps its simplified geometry.
    #
    # Pillow cannot do this: its ICO writer resizes a single source image, and
    # append_images is ignored for the format (it silently writes one frame).
    # ImageMagick takes one file per frame, so shell out for the assembly.
    with tempfile.TemporaryDirectory() as tmp:
        frame_paths = []
        for size in (16, 32, 48):
            frame_path = Path(tmp) / f"{size}.png"
            draw_icon(size).save(frame_path, format="PNG")
            frame_paths.append(str(frame_path))
        subprocess.run(
            ["convert", *frame_paths, str(OUT / "favicon.ico")], check=True
        )

    # iOS applies its own mask and shows transparency as black, so this one is
    # a full opaque square.
    draw_icon(180, rounded=False).convert("RGB").save(
        OUT / "apple-icon.png", format="PNG"
    )

    for name in ("icon.svg", "favicon.ico", "apple-icon.png"):
        path = OUT / name
        print(f"wrote {path.relative_to(OUT.parent.parent)}  ({path.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
