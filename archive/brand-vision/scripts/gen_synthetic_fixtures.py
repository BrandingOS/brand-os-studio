"""Generate deterministic synthetic fixtures for the golden test suite.

Run:  uv run python scripts/gen_synthetic_fixtures.py
Outputs land in fixtures/synthetic/ and are committed, so tests run offline.
Everything is drawn procedurally (no randomness) — regenerating produces
byte-identical semantics (not necessarily identical bytes across Pillow
versions, which is fine: tests assert classifications, not hashes).
"""
from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw

OUT = Path(__file__).parents[1] / "fixtures" / "synthetic"


def save(img: Image.Image, name: str) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    img.save(OUT / name)
    print("wrote", OUT / name)


def logo_mark() -> None:
    """Square icon on transparency: ring + triangle, 2 colors."""
    img = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse((56, 56, 456, 456), outline=(40, 90, 220, 255), width=48)
    d.polygon([(256, 150), (356, 330), (156, 330)], fill=(240, 120, 40, 255))
    save(img, "logo_mark.png")


def _brand_font(size: int):
    """A real system font — a wordmark fixture must contain a real word."""
    from PIL import ImageFont

    for path in (
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "C:/Windows/Fonts/arialbd.ttf",
    ):
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return None


def logo_lockup_horizontal() -> None:
    """Wide lockup: icon left + real wordmark text right, on transparency."""
    img = Image.new("RGBA", (1200, 400), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse((40, 60, 320, 340), fill=(30, 160, 120, 255))
    font = _brand_font(170)
    if font is not None:
        d.text((400, 110), "MERIDIAN", font=font, fill=(25, 40, 65, 255))
        save(img, "logo_lockup_horizontal.png")
        return
    # No system font available — fall back to text-like bars.
    x = 400
    for w in (90, 60, 110, 70, 95):
        d.rectangle((x, 150, x + w, 260), fill=(25, 30, 45, 255))
        x += w + 28
    save(img, "logo_lockup_horizontal.png")


def logo_wordmark() -> None:
    """Very wide text-only artwork on transparency."""
    img = Image.new("RGBA", (1400, 280), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    font = _brand_font(190)
    if font is not None:
        d.text((40, 30), "BLUEHARBOR", font=font, fill=(180, 40, 90, 255))
        save(img, "logo_wordmark.png")
        return
    x = 30
    for w in (100, 70, 120, 80, 100, 65, 110, 90):
        d.rectangle((x, 80, x + w, 210), fill=(180, 40, 90, 255))
        x += w + 34
    save(img, "logo_wordmark.png")


def white_mark_on_transparent() -> None:
    """White icon on transparency — the invisible-on-white trap."""
    img = Image.new("RGBA", (500, 500), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((80, 80, 420, 420), radius=70, fill=(255, 255, 255, 255))
    d.ellipse((190, 190, 310, 310), fill=(0, 0, 0, 0))
    save(img, "logo_mark_white.png")


def palette() -> None:
    """Five flat color strips."""
    colors = [(230, 57, 70), (241, 250, 238), (168, 218, 220), (69, 123, 157), (29, 53, 87)]
    img = Image.new("RGBA", (1000, 400), (255, 255, 255, 255))
    d = ImageDraw.Draw(img)
    w = 1000 // len(colors)
    for i, c in enumerate(colors):
        d.rectangle((i * w, 0, (i + 1) * w, 400), fill=(*c, 255))
    save(img, "palette.png")


def font_specimen() -> None:
    """Rows of text-like bars on white — a type waterfall."""
    img = Image.new("RGBA", (900, 1100), (255, 255, 255, 255))
    d = ImageDraw.Draw(img)
    y = 60
    for row in range(9):
        h = 34 + (row % 3) * 6
        x = 60
        while x < 780:
            w = 34 + ((x * 7 + row * 13) % 46)
            d.rectangle((x, y, x + w, y + h), fill=(20, 20, 26, 255))
            x += w + 16
        y += h + 52
    save(img, "font_specimen.png")


def photo_like() -> None:
    """Deterministic smooth gradient + sinusoidal detail — thousands of colors."""
    w, h = 800, 600
    img = Image.new("RGB", (w, h))
    px = img.load()
    for y in range(h):
        for x in range(w):
            r = int(120 + 100 * math.sin(x / 41.0) * math.cos(y / 29.0)) + (x * 13 + y * 7) % 17
            g = int(110 + 90 * math.sin((x + y) / 53.0)) + (x * 5 + y * 11) % 23
            b = int(130 + 80 * math.cos(x / 23.0) * math.sin(y / 37.0)) + (x * 3 + y * 17) % 19
            px[x, y] = (max(0, min(255, r)), max(0, min(255, g)), max(0, min(255, b)))
    save(img.convert("RGBA"), "photo.png")


def pattern() -> None:
    """Repeating polka tile."""
    tile = Image.new("RGBA", (80, 80), (250, 245, 235, 255))
    d = ImageDraw.Draw(tile)
    d.ellipse((22, 22, 58, 58), fill=(200, 80, 60, 255))
    img = Image.new("RGBA", (640, 640))
    for yy in range(0, 640, 80):
        for xx in range(0, 640, 80):
            img.paste(tile, (xx, yy))
    save(img, "pattern.png")


def svg_wordmark() -> None:
    svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 120">
  <text x="10" y="85" font-family="Georgia" font-size="80" fill="#20304a">ACMECO</text>
</svg>"""
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "wordmark.svg").write_text(svg)
    print("wrote", OUT / "wordmark.svg")


def svg_mark() -> None:
    svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="40" fill="#2255cc"/>
  <path d="M30 55 L50 25 L70 55 Z" fill="#ffffff"/>
</svg>"""
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "mark.svg").write_text(svg)
    print("wrote", OUT / "mark.svg")


def svg_lockup() -> None:
    svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 100">
  <circle cx="50" cy="50" r="35" fill="#0e9f6e"/>
  <text x="110" y="68" font-family="Helvetica" font-size="52" fill="#111827">Acme</text>
</svg>"""
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "lockup.svg").write_text(svg)
    print("wrote", OUT / "lockup.svg")


if __name__ == "__main__":
    logo_mark()
    logo_lockup_horizontal()
    logo_wordmark()
    white_mark_on_transparent()
    palette()
    font_specimen()
    photo_like()
    pattern()
    svg_wordmark()
    svg_mark()
    svg_lockup()
