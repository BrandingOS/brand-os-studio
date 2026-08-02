"""Text detection + layout analysis for logo-subtype disambiguation.

The lockup / wordmark / mark distinction is a LAYOUT question, not a style
question: is there text, and is there separate artwork next to it? A CLIP
embedding feels the presence of letters but can't separate "name + symbol"
from "name designed alone". This module answers it directly:

  - EasyOCR (Arabic + Latin) finds text regions and reads them.
  - An ink mask (alpha- or background-based) measures how much artwork
    mass sits OUTSIDE the text regions → the "icon mass".

Everything is lazy and guarded: if easyocr isn't installed, `analyze`
returns None and callers fall back to the pure-CLIP verdict.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Optional

import numpy as np
from PIL import Image

ANALYZE_SIZE = 640          # OCR input long side — CRAFT works well here
MASK_SIZE = 256             # ink-mask resolution
MIN_REGION_CONF = 0.35      # OCR regions below this are noise
BOX_PAD_FRAC = 0.035        # pad text boxes before subtracting from ink

_reader = None              # lazy singleton; False when easyocr unavailable

_ARABIC_RE = re.compile(r"[؀-ۿݐ-ݿ]")
_LATIN_RE = re.compile(r"[A-Za-z]")


@dataclass
class TextRegion:
    box: tuple[float, float, float, float]   # x0, y0, x1, y1 in 0..1
    text: str
    conf: float


@dataclass
class TextLayout:
    ok: bool = False                          # OCR actually ran
    regions: list[TextRegion] = field(default_factory=list)
    text: str = ""                            # reading-order joined text
    mean_conf: float = 0.0
    text_area_ratio: float = 0.0              # union of text boxes / image
    icon_mass_ratio: float = 0.0              # ink outside text boxes / image
    script: Optional[str] = None              # arabic | latin | mixed

    @property
    def has_text(self) -> bool:
        return self.ok and len(self.regions) > 0

    @property
    def word_chars(self) -> int:
        """Letters only — a monogram 'M' shouldn't count as a brand name."""
        return len(re.sub(r"[^\w]", "", self.text, flags=re.UNICODE))


def available() -> bool:
    try:
        import easyocr  # noqa: F401
        return True
    except ImportError:
        return False


def _get_reader():
    global _reader
    if _reader is False:
        return None
    if _reader is None:
        try:
            import easyocr
            _reader = easyocr.Reader(["ar", "en"], gpu=False, verbose=False)
        except Exception:
            _reader = False
            return None
    return _reader


def _ink_mask(img: Image.Image) -> np.ndarray:
    """Boolean mask of 'artwork' pixels at MASK_SIZE resolution.

    Alpha channel wins when present; otherwise pixels far from the median
    border color count as ink (logos on opaque flat backgrounds).
    """
    small = img.convert("RGBA")
    small.thumbnail((MASK_SIZE, MASK_SIZE), Image.LANCZOS)
    arr = np.asarray(small, dtype=np.float32)
    alpha = arr[..., 3]
    if (alpha < 200).mean() > 0.02:
        return alpha >= 200
    rgb = arr[..., :3]
    border = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
    bg = np.median(border, axis=0)
    dist = np.abs(rgb - bg).sum(axis=-1)
    return dist > 90.0


def analyze(img: Image.Image) -> Optional[TextLayout]:
    """Run OCR + ink analysis. None when easyocr is missing entirely."""
    reader = _get_reader()
    if reader is None:
        return None
    layout = TextLayout()

    # Transparent pixels turn black under a naive RGB convert, hiding dark
    # artwork from OCR. Composite on a background opposite to the ink's
    # own brightness so the text always has contrast.
    rgba = img.convert("RGBA")
    arr = np.asarray(rgba, dtype=np.float32)
    if (arr[..., 3] < 200).mean() > 0.02:
        ink = arr[..., 3] >= 200
        lum = (
            0.299 * arr[..., 0] + 0.587 * arr[..., 1] + 0.114 * arr[..., 2]
        )[ink].mean() if ink.any() else 0.0
        bg_color = (34, 34, 34) if lum > 170 else (255, 255, 255)
        bg = Image.new("RGB", rgba.size, bg_color)
        bg.paste(rgba, mask=rgba.split()[3])
        ocr_img = bg
    else:
        ocr_img = img.convert("RGB")
    ocr_img.thumbnail((ANALYZE_SIZE, ANALYZE_SIZE), Image.LANCZOS)
    w, h = ocr_img.size
    try:
        raw = reader.readtext(np.asarray(ocr_img))
    except Exception:
        return layout  # ok=False → callers treat as "no evidence"
    layout.ok = True

    for pts, text, conf in raw:
        if conf < MIN_REGION_CONF or not text.strip():
            continue
        xs = [p[0] for p in pts]
        ys = [p[1] for p in pts]
        layout.regions.append(TextRegion(
            box=(min(xs) / w, min(ys) / h, max(xs) / w, max(ys) / h),
            text=text.strip(),
            conf=float(conf),
        ))

    if layout.regions:
        ordered = sorted(layout.regions, key=lambda r: (r.box[1], r.box[0]))
        layout.text = " ".join(r.text for r in ordered)[:80]
        layout.mean_conf = float(np.mean([r.conf for r in layout.regions]))
        has_ar = bool(_ARABIC_RE.search(layout.text))
        has_la = bool(_LATIN_RE.search(layout.text))
        layout.script = "mixed" if (has_ar and has_la) else \
            "arabic" if has_ar else "latin" if has_la else None

    ink = _ink_mask(img)
    mh, mw = ink.shape
    text_mask = np.zeros_like(ink)
    for r in layout.regions:
        x0 = int(max(0.0, r.box[0] - BOX_PAD_FRAC) * mw)
        y0 = int(max(0.0, r.box[1] - BOX_PAD_FRAC) * mh)
        x1 = int(min(1.0, r.box[2] + BOX_PAD_FRAC) * mw)
        y1 = int(min(1.0, r.box[3] + BOX_PAD_FRAC) * mh)
        text_mask[y0:y1, x0:x1] = True
    layout.text_area_ratio = float(text_mask.mean())
    layout.icon_mass_ratio = float((ink & ~text_mask).mean())
    return layout
