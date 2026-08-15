#!/usr/bin/env python3
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parents[1] / "src" / "extension" / "icons"
OUT.mkdir(parents=True, exist_ok=True)

for size in (16, 32, 48, 128):
    scale = size / 128
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((2 * scale, 2 * scale, 126 * scale, 126 * scale), radius=26 * scale, fill=(10, 102, 194, 255))
    draw.rounded_rectangle((24 * scale, 28 * scale, 104 * scale, 94 * scale), radius=10 * scale, outline=(255, 255, 255, 245), width=max(1, int(8 * scale)))
    draw.line((38 * scale, 86 * scale, 91 * scale, 37 * scale), fill=(255, 255, 255, 255), width=max(2, int(13 * scale)))
    draw.polygon(((33 * scale, 93 * scale), (40 * scale, 76 * scale), (49 * scale, 85 * scale)), fill=(255, 255, 255, 255))
    draw.arc((48 * scale, 52 * scale, 90 * scale, 91 * scale), start=210, end=350, fill=(255, 82, 75, 255), width=max(1, int(6 * scale)))
    image.save(OUT / f"icon-{size}.png")
