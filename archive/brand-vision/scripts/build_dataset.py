"""Dataset builder for the custom brand-vision classifier.

Subcommands:
  synth   Generate procedural training images (real fonts, seeded randomness)
  fetch   Download open real-world sources (simple-icons, gilbarbara/logos, picsum)
  label   Auto-label unlabeled images with a teacher engine (ollama/claude/hybrid)
  stats   Per-class counts + label sources
  All paths live under brand-vision/dataset/ (gitignored).

Layout:
  dataset/
    raw/                 downloaded sources (kept for provenance)
    unlabeled/           images awaiting the teacher
    images/<class>/      final labeled images
    images/labels.json   master labels — compatible with `brand_vision report --fixtures dataset/images`
    quarantine/          low-confidence teacher verdicts for human review

Usage:
  uv run python scripts/build_dataset.py synth --per-class 300
  uv run python scripts/build_dataset.py fetch --photos 300 --icons 600 --logos all
  uv run python scripts/build_dataset.py label --teacher ollama --limit 400
  uv run python scripts/build_dataset.py stats
"""
from __future__ import annotations

import argparse
import json
import random
import shutil
import subprocess
import sys
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parents[1] / "src"))

from PIL import Image, ImageDraw, ImageFilter, ImageFont  # noqa: E402

ROOT = Path(__file__).parents[1]
DATASET = ROOT / "dataset"
RAW = DATASET / "raw"
UNLABELED = DATASET / "unlabeled"
IMAGES = DATASET / "images"
QUARANTINE = DATASET / "quarantine"
LABELS_FILE = IMAGES / "labels.json"

CLASSES = [
    "logo_lockup", "logo_wordmark", "logo_mark", "photo", "palette",
    "font_specimen", "illustration", "pattern", "document", "mockup", "other",
]

# ------------------------------------------------------------------ helpers

def load_labels() -> dict:
    if LABELS_FILE.exists():
        return json.loads(LABELS_FILE.read_text())
    return {}


def save_labels(labels: dict) -> None:
    IMAGES.mkdir(parents=True, exist_ok=True)
    LABELS_FILE.write_text(json.dumps(labels, indent=1, ensure_ascii=False, sort_keys=True))


def register(labels: dict, rel: str, category: str, source: str, confidence: float | None = None,
             teacher: str | None = None) -> None:
    entry: dict = {"category": category, "source": source}
    if confidence is not None:
        entry["confidence"] = round(confidence, 3)
    if teacher:
        entry["teacher"] = teacher
    labels[rel] = entry


def find_fonts() -> list[str]:
    """Real system fonts make wordmarks/specimens look like real artwork."""
    candidates: list[str] = []
    for pattern in ("*.ttf", "*.otf", "*.ttc"):
        for base in ("/System/Library/Fonts", "/System/Library/Fonts/Supplemental", "/Library/Fonts"):
            candidates.extend(str(p) for p in Path(base).glob(pattern))
    usable = []
    for path in candidates:
        name = Path(path).stem.lower()
        # Skip symbol/emoji/CJK-only faces that render tofu for Latin text.
        if any(bad in name for bad in ("emoji", "symbols", "dingbat", "wingding", "webding",
                                       "apple color", "noto sans myanmar", "hiragino", "pingfang",
                                       "songti", "stheiti", "kefa", "apple braille", "lastresort")):
            continue
        try:
            ImageFont.truetype(path, 40)
            usable.append(path)
        except Exception:
            continue
    return usable or []


SYLLABLES = ["ka", "lo", "mi", "ve", "ra", "zu", "no", "ta", "bri", "sol", "arc", "nex",
             "lum", "qui", "fen", "dor", "axi", "ola", "pri", "sta", "vio", "mer", "kai", "zen"]

ARABIC_WORDS = ["نور", "أمل", "ريحان", "سما", "دار", "بيت", "قمر", "نجم", "روح", "فن",
                "زين", "شمس", "بسمة", "لمسة", "رؤية", "إبداع", "تراث", "واحة", "نخبة",
                "صفوة", "أصالة", "مدار", "رونق", "سحاب", "جسر", "منارة", "بوابة"]

# macOS Arabic-capable faces (existence-checked at runtime).
ARABIC_FONT_CANDIDATES = [
    "/System/Library/Fonts/Supplemental/GeezaPro.ttc",
    "/System/Library/Fonts/GeezaPro.ttc",
    "/System/Library/Fonts/Supplemental/Damascus.ttc",
    "/System/Library/Fonts/Supplemental/AlNile.ttc",
    "/System/Library/Fonts/Supplemental/Baghdad.ttc",
    "/System/Library/Fonts/Supplemental/KufiStandardGK.ttc",
    "/System/Library/Fonts/Supplemental/Waseem.ttc",
    "/System/Library/Fonts/Supplemental/Farah.ttc",
    "/System/Library/Fonts/Supplemental/DecoTypeNaskh.ttc",
]


def find_arabic_fonts() -> list[str]:
    out = []
    for path in ARABIC_FONT_CANDIDATES:
        if Path(path).exists():
            try:
                ImageFont.truetype(path, 40)
                out.append(path)
            except Exception:
                continue
    return out


ARABIC_FONTS = find_arabic_fonts()


def shape_arabic(text: str) -> str:
    """Pre-shape Arabic for PIL without raqm (presentation forms + RTL order)."""
    try:
        import arabic_reshaper
        from bidi.algorithm import get_display

        return get_display(arabic_reshaper.reshape(text))
    except ImportError:
        return text


def brand_name_and_fonts(rng: random.Random, fonts: list[str], allow_arabic: bool = True) -> tuple[str, list[str]]:
    """Display-ready brand name + the font pool that can render it.
    ~45% Arabic when Arabic fonts exist — real users upload Arabic wordmarks."""
    if allow_arabic and ARABIC_FONTS and rng.random() < 0.45:
        word = rng.choice(ARABIC_WORDS)
        if rng.random() < 0.3:
            word = f"{rng.choice(['دار', 'بيت', 'واحة'])} {word}"
        return shape_arabic(word), ARABIC_FONTS
    n = rng.choice([2, 2, 3])
    word = "".join(rng.choice(SYLLABLES) for _ in range(n))
    style = rng.random()
    if style < 0.4:
        word = word.capitalize()
    elif style < 0.7:
        word = word.upper()
    return word, fonts


def brand_name(rng: random.Random) -> str:
    """Latin-only variant (used where Arabic shaping isn't wanted)."""
    name, _ = brand_name_and_fonts(rng, [], allow_arabic=False)
    return name


def palette_colors(rng: random.Random, n: int) -> list[tuple[int, int, int]]:
    base_h = rng.random()
    out = []
    for i in range(n):
        import colorsys

        h = (base_h + rng.choice([0, 0.08, 0.5, 0.33, 0.66]) * (i / max(1, n - 1))) % 1
        s = rng.uniform(0.35, 0.9)
        v = rng.uniform(0.45, 0.95)
        r, g, b = colorsys.hsv_to_rgb(h, s, v)
        out.append((int(r * 255), int(g * 255), int(b * 255)))
    return out


# ------------------------------------------------------------------ synth generators
# Each returns a PIL image. rng-seeded => reproducible.

def gen_logo_mark(rng: random.Random, fonts: list[str]) -> Image.Image:
    size = rng.choice([400, 512, 600])
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    c1, c2 = palette_colors(rng, 2)
    mono = rng.random() < 0.25
    if mono:
        tone = rng.choice([(255, 255, 255), (17, 17, 17)])
        c1 = c2 = tone
    m = size // 8
    kind = rng.randrange(6)
    if kind == 0:
        d.ellipse((m, m, size - m, size - m), outline=(*c1, 255), width=size // 9)
        d.polygon([(size // 2, m * 2.2), (size - m * 2.2, size - m * 2.2), (m * 2.2, size - m * 2.2)], fill=(*c2, 255))
    elif kind == 1:
        d.rounded_rectangle((m, m, size - m, size - m), radius=size // 6, fill=(*c1, 255))
        d.ellipse((size * 0.3, size * 0.3, size * 0.7, size * 0.7), fill=(0, 0, 0, 0) if not mono else (*c2, 255))
    elif kind == 2:
        for i in range(3):
            off = m + i * size // 9
            d.arc((off, off, size - off, size - off), start=rng.randrange(360), end=rng.randrange(360) + 200,
                  fill=(*c1, 255), width=size // 14)
    elif kind == 3:
        pts = [(rng.randrange(m, size - m), rng.randrange(m, size - m)) for _ in range(3)]
        d.polygon(pts, fill=(*c1, 255))
        d.ellipse((size * 0.4, size * 0.4, size * 0.6, size * 0.6), fill=(*c2, 255))
    elif kind == 4 and fonts:
        # Single-letter monogram
        f = ImageFont.truetype(rng.choice(fonts), int(size * 0.62))
        letter = chr(rng.randrange(ord("A"), ord("Z") + 1))
        d.rounded_rectangle((m, m, size - m, size - m), radius=size // 5, fill=(*c1, 255))
        bbox = d.textbbox((0, 0), letter, font=f)
        d.text(((size - bbox[2] + bbox[0]) / 2 - bbox[0], (size - bbox[3] + bbox[1]) / 2 - bbox[1]),
               letter, font=f, fill=(255, 255, 255, 255) if not mono else (*c2, 255))
    else:
        d.pieslice((m, m, size - m, size - m), rng.randrange(180), rng.randrange(180, 360), fill=(*c1, 255))
        d.pieslice((size * 0.25, size * 0.25, size * 0.75, size * 0.75), 0, 360, fill=(*c2, 255))
    return img


def _text_image(text: str, font_path: str, px: int, color: tuple[int, int, int]) -> Image.Image:
    f = ImageFont.truetype(font_path, px)
    dummy = ImageDraw.Draw(Image.new("RGBA", (10, 10)))
    bbox = dummy.textbbox((0, 0), text, font=f)
    w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    img = Image.new("RGBA", (w + 20, h + 20), (0, 0, 0, 0))
    ImageDraw.Draw(img).text((10 - bbox[0], 10 - bbox[1]), text, font=f, fill=(*color, 255))
    return img


def gen_logo_wordmark(rng: random.Random, fonts: list[str]) -> Image.Image:
    if not fonts:
        raise RuntimeError("no usable fonts")
    color = rng.choice(palette_colors(rng, 3) + [(20, 22, 30), (250, 250, 250)])
    name, pool = brand_name_and_fonts(rng, fonts)
    img = _text_image(name, rng.choice(pool), rng.choice([90, 120, 160]), color)
    pad = rng.randrange(10, 60)
    out = Image.new("RGBA", (img.width + pad * 2, img.height + pad * 2), (0, 0, 0, 0))
    out.paste(img, (pad, pad), img)
    return out


def gen_logo_lockup(rng: random.Random, fonts: list[str]) -> Image.Image:
    mark = gen_logo_mark(rng, fonts)
    word = gen_logo_wordmark(rng, fonts)
    stacked = rng.random() < 0.35
    scale = word.height / mark.height * rng.uniform(1.1, 1.8) if not stacked else 1.0
    mh = int(word.height * rng.uniform(1.2, 2.2)) if not stacked else int(word.width * rng.uniform(0.35, 0.6))
    mark = mark.resize((mh, mh), Image.LANCZOS)
    gap = rng.randrange(20, 60)
    if stacked:
        w = max(mark.width, word.width) + 60
        h = mark.height + gap + word.height + 60
        out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        out.paste(mark, ((w - mark.width) // 2, 30), mark)
        out.paste(word, ((w - word.width) // 2, 30 + mark.height + gap), word)
    else:
        w = mark.width + gap + word.width + 60
        h = max(mark.height, word.height) + 60
        out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        out.paste(mark, (30, (h - mark.height) // 2), mark)
        out.paste(word, (30 + mark.width + gap, (h - word.height) // 2), word)
    return out


def _hex_of(c: tuple[int, int, int]) -> str:
    return "#{:02X}{:02X}{:02X}".format(*c)


NEUTRALS = [(255, 255, 255), (0, 0, 0), (17, 17, 20), (245, 243, 238), (230, 228, 222),
            (120, 120, 124), (60, 60, 64), (200, 198, 192)]


def gen_palette(rng: random.Random, fonts) -> Image.Image:
    """Real-world palette shapes: strips (vertical AND horizontal/flag-like),
    chips, circles, hex-code cards, dark backgrounds, titles (EN/AR).
    Real brand palettes very often contain black/white/neutrals — inject them."""
    n = rng.randrange(2, 8)
    colors = palette_colors(rng, n)
    # ~60% of real palettes include neutrals (black/white/grey/cream).
    if rng.random() < 0.6:
        k = rng.randrange(1, max(2, n))
        for idx in rng.sample(range(n), k):
            colors[idx] = rng.choice(NEUTRALS)
    fonts = fonts or []
    label_font = ImageFont.truetype(rng.choice(fonts), 22) if fonts else None
    title_font = ImageFont.truetype(rng.choice(fonts), 34) if fonts else None
    layout = rng.randrange(9)

    def maybe_title(d: ImageDraw.ImageDraw, w: int, y: int, fg=(60, 60, 66)) -> None:
        if title_font and rng.random() < 0.5:
            title = rng.choice(["Brand Colors", "Color Palette", "COLORS", "Palette 01",
                                shape_arabic("ألوان الهوية"), shape_arabic("لوحة الألوان")])
            d.text((w // 2, y), title, font=title_font, fill=fg, anchor="mm")

    if layout == 0:  # full-bleed vertical strips (coolors-style), hex on each
        w, h = 1000, rng.choice([400, 500, 620])
        img = Image.new("RGB", (w, h), (255, 255, 255))
        d = ImageDraw.Draw(img)
        sw = w // n
        for i, c in enumerate(colors):
            d.rectangle((i * sw, 0, (i + 1) * sw, h), fill=c)
            if label_font and rng.random() < 0.8:
                fg = (255, 255, 255) if sum(c) < 400 else (20, 20, 24)
                d.text((i * sw + sw // 2, h - 44), _hex_of(c), font=label_font, fill=fg, anchor="mm")
    elif layout == 1:  # rounded chips + hex labels below, light bg
        w, h = 1000, 460
        img = Image.new("RGB", (w, h), rng.choice([(255, 255, 255), (247, 245, 240)]))
        d = ImageDraw.Draw(img)
        maybe_title(d, w, 34)
        cw = (w - 60) // n
        for i, c in enumerate(colors):
            x = 30 + i * cw
            d.rounded_rectangle((x + 8, 70, x + cw - 8, h - 130), radius=24, fill=c)
            if label_font:
                d.text((x + cw // 2, h - 92), _hex_of(c), font=label_font, fill=(90, 90, 96), anchor="mm")
    elif layout == 2:  # grid swatches
        cols = min(n, 4)
        rows = (n + cols - 1) // cols
        w, h = 900, 220 * rows + 60
        img = Image.new("RGB", (w, h), (255, 255, 255))
        d = ImageDraw.Draw(img)
        cw = (w - 60) // cols
        for i, c in enumerate(colors):
            r_, c_ = divmod(i, cols)
            x, y = 30 + c_ * cw, 30 + r_ * 220
            d.rectangle((x + 6, y + 6, x + cw - 6, y + 190), fill=c)
    elif layout == 3:  # circles row (dots palette)
        w, h = 1000, 360
        img = Image.new("RGB", (w, h), rng.choice([(255, 255, 255), (250, 248, 244), (24, 26, 32)]))
        d = ImageDraw.Draw(img)
        maybe_title(d, w, 40, fg=(150, 150, 156))
        cw = (w - 80) // n
        r = min(cw // 2 - 10, 90)
        for i, c in enumerate(colors):
            cx = 40 + i * cw + cw // 2
            d.ellipse((cx - r, h // 2 - r + 20, cx + r, h // 2 + r + 20), fill=c)
    elif layout == 4:  # paint-chip card (stacked shades of one hue + hex)
        w, h = 420, 640
        img = Image.new("RGB", (w, h), (255, 255, 255))
        d = ImageDraw.Draw(img)
        base = colors[0]
        rows = 5
        for i in range(rows):
            f = 0.35 + 0.65 * (i / (rows - 1))
            c = tuple(int(255 - (255 - ch) * f) for ch in base)
            d.rectangle((20, 20 + i * (h - 120) // rows, w - 20, 12 + (i + 1) * (h - 120) // rows), fill=c)
        if label_font:
            d.text((w // 2, h - 50), _hex_of(base), font=label_font, fill=(80, 80, 86), anchor="mm")
    elif layout == 5:  # 60-30-10 proportional bars
        w, h = 1000, 300
        img = Image.new("RGB", (w, h), (255, 255, 255))
        d = ImageDraw.Draw(img)
        shares = sorted([rng.uniform(0.5, 0.65), rng.uniform(0.2, 0.35)], reverse=True)
        shares.append(1 - sum(shares))
        x = 0
        for c, s in zip(colors[:3], shares):
            d.rectangle((x, 40, x + int(w * s), h - 40), fill=c)
            x += int(w * s)
    elif layout == 6:  # dark-bg swatch cards with names
        w, h = 1000, 480
        img = Image.new("RGB", (w, h), (20, 22, 28))
        d = ImageDraw.Draw(img)
        maybe_title(d, w, 40, fg=(220, 220, 226))
        cw = (w - 80) // n
        names = ["Primary", "Secondary", "Accent", "Dark", "Light", "Muted", "Pop"]
        for i, c in enumerate(colors):
            x = 40 + i * cw
            d.rounded_rectangle((x + 6, 80, x + cw - 6, h - 140), radius=16, fill=c)
            if label_font:
                d.text((x + cw // 2, h - 104), names[i % len(names)], font=label_font,
                       fill=(200, 200, 206), anchor="mm")
                d.text((x + cw // 2, h - 72), _hex_of(c), font=label_font, fill=(140, 140, 146), anchor="mm")
    elif layout == 7:  # horizontal rows with hex to the right
        w, h = 800, 90 * n + 60
        img = Image.new("RGB", (w, h), (255, 255, 255))
        d = ImageDraw.Draw(img)
        for i, c in enumerate(colors):
            y = 30 + i * 90
            d.rounded_rectangle((30, y, w - 220, y + 70), radius=12, fill=c)
            if label_font:
                d.text((w - 120, y + 35), _hex_of(c), font=label_font, fill=(70, 70, 76), anchor="mm")
    else:  # full-bleed HORIZONTAL stripes stacked vertically (flag-like)
        w = rng.choice([800, 1000])
        h = rng.choice([500, 640, 800])
        img = Image.new("RGB", (w, h), (255, 255, 255))
        d = ImageDraw.Draw(img)
        sh = h // n
        for i, c in enumerate(colors):
            d.rectangle((0, i * sh, w, (i + 1) * sh if i < n - 1 else h), fill=c)
            if label_font and rng.random() < 0.5:
                fg = (255, 255, 255) if sum(c) < 400 else (20, 20, 24)
                d.text((w // 2, i * sh + sh // 2), _hex_of(c), font=label_font, fill=fg, anchor="mm")
    return img.convert("RGBA")


PANGRAMS = ["The quick brown fox jumps over the lazy dog", "Pack my box with five dozen jugs",
            "Sphinx of black quartz judge my vow", "How vexingly quick daft zebras jump"]


def gen_font_specimen(rng: random.Random, fonts: list[str]) -> Image.Image:
    if not fonts:
        raise RuntimeError("no usable fonts")
    font_path = rng.choice(fonts)
    w, h = 900, rng.choice([1000, 1200])
    bg = rng.choice([(255, 255, 255), (250, 248, 244), (24, 24, 28)])
    fg = (20, 20, 24) if bg[0] > 128 else (240, 240, 240)
    img = Image.new("RGB", (w, h), bg)
    d = ImageDraw.Draw(img)
    y = 50
    d.text((50, y), "Aa", font=ImageFont.truetype(font_path, 130), fill=fg)
    y += 190
    d.text((50, y), "ABCDEFGHIJKLMNOPQRSTUVWXYZ", font=ImageFont.truetype(font_path, 34), fill=fg)
    y += 60
    d.text((50, y), "abcdefghijklmnopqrstuvwxyz", font=ImageFont.truetype(font_path, 34), fill=fg)
    y += 60
    d.text((50, y), "0123456789 !?&%()", font=ImageFont.truetype(font_path, 34), fill=fg)
    y += 80
    for px in (18, 24, 30, 38, 48):
        if y > h - 80:
            break
        d.text((50, y), rng.choice(PANGRAMS), font=ImageFont.truetype(font_path, px), fill=fg)
        y += px + 26
    return img.convert("RGBA")


def gen_pattern(rng: random.Random, _fonts) -> Image.Image:
    tile_size = rng.choice([60, 80, 100])
    c1, c2 = palette_colors(rng, 2)
    bg = rng.choice([(250, 246, 238), (255, 255, 255), c2])
    tile = Image.new("RGBA", (tile_size, tile_size), (*bg, 255))
    d = ImageDraw.Draw(tile)
    kind = rng.randrange(4)
    q = tile_size // 4
    if kind == 0:
        d.ellipse((q, q, tile_size - q, tile_size - q), fill=(*c1, 255))
    elif kind == 1:
        d.line((0, 0, tile_size, tile_size), fill=(*c1, 255), width=q)
        d.line((0, tile_size, tile_size, 0), fill=(*c1, 255), width=q // 2)
    elif kind == 2:
        d.rectangle((0, 0, tile_size // 2, tile_size // 2), fill=(*c1, 255))
        d.rectangle((tile_size // 2, tile_size // 2, tile_size, tile_size), fill=(*c1, 255))
    else:
        d.polygon([(tile_size // 2, q), (tile_size - q, tile_size - q), (q, tile_size - q)], fill=(*c1, 255))
    n = 640 // tile_size + 1
    img = Image.new("RGBA", (n * tile_size, n * tile_size))
    for yy in range(n):
        for xx in range(n):
            img.paste(tile, (xx * tile_size, yy * tile_size))
    return img.crop((0, 0, 640, 640))


def gen_document(rng: random.Random, fonts: list[str]) -> Image.Image:
    w, h = rng.choice([(850, 1100), (1200, 750)])
    img = Image.new("RGB", (w, h), (255, 255, 255))
    d = ImageDraw.Draw(img)
    fg = (40, 40, 46)
    y = 70
    if fonts:
        d.text((70, y), brand_name(rng).upper() + " REPORT", font=ImageFont.truetype(rng.choice(fonts), 34), fill=fg)
    y += 80
    rng2 = random.Random(rng.random())
    while y < h - 90:
        line_w = rng2.randrange(int(w * 0.5), int(w * 0.85))
        d.rectangle((70, y, 70 + line_w, y + 12), fill=(120, 120, 126))
        y += 30
        if rng2.random() < 0.15:
            y += 26
    if rng.random() < 0.4:
        d.rectangle((70, h - 260, w - 70, h - 110), outline=(180, 180, 186), width=2)
    return img.convert("RGBA")


def gen_illustration(rng: random.Random, _fonts) -> Image.Image:
    w, h = 800, 600
    sky, ground, a1, a2 = palette_colors(rng, 4)
    img = Image.new("RGB", (w, h), sky)
    d = ImageDraw.Draw(img)
    sx = rng.randrange(80, 600)
    d.ellipse((sx, 60, sx + 110, 170), fill=a2)
    d.ellipse((-200, h - 260, w * 0.7, h + 200), fill=ground)
    d.ellipse((w * 0.4, h - 220, w + 200, h + 240), fill=tuple(max(0, c - 25) for c in ground))
    hx = rng.randrange(120, 500)
    d.rectangle((hx, h - 330, hx + 160, h - 180), fill=a1)
    d.polygon([(hx - 20, h - 330), (hx + 80, h - 420), (hx + 180, h - 330)], fill=tuple(max(0, c - 40) for c in a1))
    for _ in range(rng.randrange(2, 5)):
        cx = rng.randrange(40, w - 40)
        d.ellipse((cx, rng.randrange(40, 160), cx + rng.randrange(70, 140), rng.randrange(190, 240)), fill=(255, 255, 255))
    return img.convert("RGBA")


def gen_mockup(rng: random.Random, fonts: list[str]) -> Image.Image:
    """Logo applied to a 'physical' card in a soft-shadow scene."""
    w, h = 900, 700
    bg1, bg2 = palette_colors(rng, 2)
    img = Image.new("RGB", (w, h))
    d = ImageDraw.Draw(img)
    for y in range(h):  # vertical gradient backdrop
        t = y / h
        d.line((0, y, w, y), fill=tuple(int(bg1[i] * (1 - t) + bg2[i] * t * 0.5 + 90 * t) for i in range(3)))
    card_w, card_h = rng.choice([(520, 320), (420, 420), (560, 280)])
    cx, cy = (w - card_w) // 2 + rng.randrange(-60, 60), (h - card_h) // 2 + rng.randrange(-40, 40)
    shadow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((cx + 12, cy + 18, cx + card_w + 12, cy + card_h + 18),
                                             radius=18, fill=(0, 0, 0, 90))
    shadow = shadow.filter(ImageFilter.GaussianBlur(14))
    img = Image.alpha_composite(img.convert("RGBA"), shadow)
    d = ImageDraw.Draw(img)
    card_color = rng.choice([(255, 255, 255), (250, 248, 244), (22, 24, 30)])
    d.rounded_rectangle((cx, cy, cx + card_w, cy + card_h), radius=18, fill=(*card_color, 255))
    logo = rng.choice([gen_logo_lockup, gen_logo_mark, gen_logo_wordmark])(rng, fonts)
    scale = min((card_w * 0.7) / logo.width, (card_h * 0.6) / logo.height)
    logo = logo.resize((max(1, int(logo.width * scale)), max(1, int(logo.height * scale))), Image.LANCZOS)
    img.paste(logo, (cx + (card_w - logo.width) // 2, cy + (card_h - logo.height) // 2), logo)
    return img


def gen_other(rng: random.Random, _fonts) -> Image.Image:
    """Out-of-distribution filler: gradients, noise, abstract blobs — teaches
    the head an explicit 'none of the above' region."""
    w, h = 640, 640
    kind = rng.randrange(3)
    if kind == 0:  # smooth gradient wall
        c1, c2 = palette_colors(rng, 2)
        img = Image.new("RGB", (w, h))
        d = ImageDraw.Draw(img)
        for y in range(h):
            t = y / h
            d.line((0, y, w, y), fill=tuple(int(c1[i] * (1 - t) + c2[i] * t) for i in range(3)))
        return img.convert("RGBA")
    if kind == 1:  # random noise field
        rnd = random.Random(rng.random())
        img = Image.new("RGB", (128, 128))
        px = img.load()
        for y in range(128):
            for x in range(128):
                px[x, y] = (rnd.randrange(256), rnd.randrange(256), rnd.randrange(256))
        return img.resize((w, h), Image.NEAREST).convert("RGBA")
    # soft abstract blobs
    img = Image.new("RGB", (w, h), rng.choice([(240, 238, 233), (18, 20, 26)]))
    d = ImageDraw.Draw(img)
    for c in palette_colors(rng, rng.randrange(3, 7)):
        x, y = rng.randrange(-100, w), rng.randrange(-100, h)
        r = rng.randrange(80, 320)
        d.ellipse((x, y, x + r, y + r), fill=c)
    return img.filter(ImageFilter.GaussianBlur(rng.randrange(8, 40))).convert("RGBA")


GENERATORS = {
    "logo_mark": gen_logo_mark,
    "logo_wordmark": gen_logo_wordmark,
    "logo_lockup": gen_logo_lockup,
    "palette": gen_palette,
    "font_specimen": gen_font_specimen,
    "pattern": gen_pattern,
    "document": gen_document,
    "illustration": gen_illustration,
    "mockup": gen_mockup,
    "other": gen_other,
}


def cmd_synth(args) -> int:
    fonts = find_fonts()
    print(f"usable system fonts: {len(fonts)} · arabic fonts: {len(ARABIC_FONTS)}")
    labels = load_labels()
    only = set(args.only.split(",")) if args.only else None
    total = 0
    for cls, gen in GENERATORS.items():
        if only and cls not in only:
            continue
        out_dir = IMAGES / cls
        out_dir.mkdir(parents=True, exist_ok=True)
        made = 0
        for i in range(args.per_class):
            rng = random.Random(hash((cls, i, args.seed)) & 0xFFFFFFFF)
            name = f"synth_{i:04d}.png"
            rel = f"{cls}/{name}"
            if rel in labels and not args.force:
                continue
            try:
                img = gen(rng, fonts)
            except Exception as exc:
                print(f"!! {cls}#{i}: {exc}", file=sys.stderr)
                continue
            img.save(out_dir / name)
            register(labels, rel, cls, "synthetic")
            made += 1
        total += made
        print(f"{cls:15s} +{made}")
    save_labels(labels)
    print(f"synth done: +{total} images (labels: {len(labels)})")
    return 0


# ------------------------------------------------------------------ fetch

def _clone(repo: str, dest: Path) -> bool:
    if dest.exists():
        return True
    dest.parent.mkdir(parents=True, exist_ok=True)
    r = subprocess.run(["git", "clone", "--depth", "1", repo, str(dest)], capture_output=True, text=True)
    if r.returncode != 0:
        print(f"!! clone failed {repo}: {r.stderr.strip()[:200]}", file=sys.stderr)
        return False
    return True


def cmd_fetch(args) -> int:
    labels = load_labels()

    # 1. simple-icons — thousands of official brand icon MARKS (known label).
    if args.icons:
        repo = RAW / "simple-icons"
        if _clone("https://github.com/simple-icons/simple-icons.git", repo):
            svgs = sorted((repo / "icons").glob("*.svg"))
            rng = random.Random(args.seed)
            rng.shuffle(svgs)
            out_dir = IMAGES / "logo_mark"
            out_dir.mkdir(parents=True, exist_ok=True)
            n = 0
            for svg in svgs[: args.icons]:
                rel = f"logo_mark/si_{svg.stem}.svg"
                if rel in labels:
                    continue
                shutil.copy(svg, IMAGES / rel)
                register(labels, rel, "logo_mark", "simple-icons")
                n += 1
            print(f"simple-icons: +{n} logo_mark SVGs")

    # 2. gilbarbara/logos — real brand logos (lockups/wordmarks/marks mixed) → unlabeled.
    if args.logos:
        repo = RAW / "gilbarbara-logos"
        if _clone("https://github.com/gilbarbara/logos.git", repo):
            svgs = sorted((repo / "logos").glob("*.svg"))
            if args.logos != "all":
                rng = random.Random(args.seed + 1)
                rng.shuffle(svgs)
                svgs = svgs[: int(args.logos)]
            UNLABELED.mkdir(parents=True, exist_ok=True)
            n = 0
            for svg in svgs:
                dest = UNLABELED / f"gb_{svg.stem}.svg"
                if dest.exists() or f"__any__gb_{svg.stem}" in labels:
                    continue
                if any(k.endswith(f"gb_{svg.stem}.svg") for k in labels):
                    continue
                shutil.copy(svg, dest)
                n += 1
            print(f"gilbarbara/logos: +{n} unlabeled real logos")

    # 3. picsum — real photographs (known label).
    if args.photos:
        out_dir = IMAGES / "photo"
        out_dir.mkdir(parents=True, exist_ok=True)
        n = 0
        for i in range(args.photos):
            rel = f"photo/picsum_{i:04d}.jpg"
            if rel in labels:
                continue
            url = f"https://picsum.photos/seed/bv{args.seed}_{i}/800/600.jpg"
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "brand-vision-dataset/0.1"})
                with urllib.request.urlopen(req, timeout=30) as resp:
                    (out_dir / f"picsum_{i:04d}.jpg").write_bytes(resp.read())
                register(labels, rel, "photo", "picsum")
                n += 1
            except Exception as exc:
                print(f"!! picsum {i}: {exc}", file=sys.stderr)
        print(f"picsum: +{n} photos")

    save_labels(labels)
    return 0


# ------------------------------------------------------------------ label (teacher)

def cmd_label(args) -> int:
    from brand_vision.engines import classify_with, get_engine
    from brand_vision.preprocess import prepare_image

    engine = get_engine(args.teacher)
    if not engine.available:
        print(f"Teacher '{args.teacher}' is not available.", file=sys.stderr)
        return 1

    # Sharded parallel mode: each worker owns files[shard::shards] and writes
    # its own labels file; `merge` folds them into the master labels.json.
    sharded = args.shards > 1
    labels = {} if sharded else load_labels()
    labels_path = (IMAGES / f"labels.shard{args.shard}.json") if sharded else LABELS_FILE

    def persist() -> None:
        IMAGES.mkdir(parents=True, exist_ok=True)
        labels_path.write_text(json.dumps(labels, indent=1, ensure_ascii=False, sort_keys=True))

    QUARANTINE.mkdir(parents=True, exist_ok=True)
    files = sorted(p for p in UNLABELED.iterdir() if p.suffix.lower() in (".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif"))
    if sharded:
        files = files[args.shard :: args.shards]
    if args.limit:
        files = files[: args.limit]
    print(f"labeling {len(files)} files with teacher={args.teacher} (min-conf {args.min_conf})")

    done = kept = quarantined = 0
    for path in files:
        try:
            img = prepare_image(path.read_bytes(), path.name)
            result = classify_with(args.teacher, img)
        except Exception as exc:
            print(f"!! {path.name}: {exc}", file=sys.stderr)
            shutil.move(str(path), QUARANTINE / path.name)
            quarantined += 1
            continue

        done += 1
        if result.confidence >= args.min_conf and not result.needs_review:
            cls = result.category.value
            (IMAGES / cls).mkdir(parents=True, exist_ok=True)
            rel = f"{cls}/{path.name}"
            shutil.move(str(path), IMAGES / rel)
            register(labels, rel, cls, "teacher", confidence=result.confidence, teacher=args.teacher)
            kept += 1
        elif args.keep_uncertain:
            # Pre-pass mode: leave uncertain files in unlabeled/ for a
            # stronger teacher instead of quarantining them.
            continue
        else:
            meta = QUARANTINE / (path.name + ".verdict.json")
            meta.write_text(result.model_dump_json(indent=1))
            shutil.move(str(path), QUARANTINE / path.name)
            quarantined += 1

        if done % 20 == 0:
            persist()
            print(f"  progress: {done}/{len(files)} — kept {kept}, quarantined {quarantined}")

    persist()
    print(f"label done: kept {kept}, quarantined {quarantined} (review dataset/quarantine/)")
    return 0


def cmd_merge(_args) -> int:
    labels = load_labels()
    added = 0
    for shard_file in sorted(IMAGES.glob("labels.shard*.json")):
        part = json.loads(shard_file.read_text())
        for k, v in part.items():
            if k not in labels:
                labels[k] = v
                added += 1
        shard_file.unlink()
    save_labels(labels)
    print(f"merged +{added} shard labels (total {len(labels)})")
    return 0


# ------------------------------------------------------------------ stats

def cmd_stats(_args) -> int:
    labels = load_labels()
    from collections import Counter

    by_class: Counter = Counter()
    by_source: Counter = Counter()
    for entry in labels.values():
        by_class[entry["category"]] += 1
        by_source[entry.get("source", "?")] += 1
    print(f"total labeled: {len(labels)}")
    for cls in CLASSES:
        print(f"  {cls:15s} {by_class.get(cls, 0)}")
    print("sources:")
    for src, n in by_source.most_common():
        print(f"  {src:15s} {n}")
    pending = len(list(UNLABELED.glob("*"))) if UNLABELED.exists() else 0
    quarantined = len([p for p in QUARANTINE.glob("*") if not p.name.endswith(".json")]) if QUARANTINE.exists() else 0
    print(f"unlabeled pending: {pending} · quarantined: {quarantined}")
    return 0


# ------------------------------------------------------------------ main

def main(argv=None) -> int:
    parser = argparse.ArgumentParser(prog="build_dataset")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("synth")
    p.add_argument("--per-class", type=int, default=300)
    p.add_argument("--seed", type=int, default=7)
    p.add_argument("--force", action="store_true")
    p.add_argument("--only", default="", help="comma-separated class subset")

    p = sub.add_parser("fetch")
    p.add_argument("--icons", type=int, default=600)
    p.add_argument("--logos", default="all", help="'all' or a number")
    p.add_argument("--photos", type=int, default=300)
    p.add_argument("--seed", type=int, default=7)

    p = sub.add_parser("label")
    p.add_argument("--teacher", default="ollama", choices=["ollama", "claude", "hybrid", "heuristic"])
    p.add_argument("--min-conf", type=float, default=0.75)
    p.add_argument("--limit", type=int, default=0)
    p.add_argument("--keep-uncertain", action="store_true",
                   help="leave low-confidence files in unlabeled/ (pre-pass mode)")
    p.add_argument("--shard", type=int, default=0)
    p.add_argument("--shards", type=int, default=1)

    sub.add_parser("stats")
    sub.add_parser("merge")

    args = parser.parse_args(argv)
    return {"synth": cmd_synth, "fetch": cmd_fetch, "label": cmd_label,
            "stats": cmd_stats, "merge": cmd_merge}[args.cmd](args)


if __name__ == "__main__":
    raise SystemExit(main())
