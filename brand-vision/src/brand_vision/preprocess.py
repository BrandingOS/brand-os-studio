"""Image loading, SVG handling, downscaling, and the non-image fast path.

Every upload is preprocessed exactly once into a `PreparedImage`; all engines
consume the same object (same measured signals, same PNG bytes).
"""
from __future__ import annotations

import io
from typing import Optional

from PIL import Image

from .config import get_settings
from .engines.base import PreparedImage
from .schema import Category, ClassificationResult, Signals
from .signals import extract_signals

SVG_MIMES = {"image/svg+xml", "text/xml", "application/xml"}
FONT_EXTS = {"ttf", "otf", "woff", "woff2", "eot"}
DOC_EXTS = {"pdf", "doc", "docx", "ppt", "pptx", "xls", "xlsx"}
SKIP_EXTS = {"zip", "rar", "7z", "mp3", "wav", "mp4", "mov", "webm", "avi"}


def fast_path_result(filename: str, content_type: Optional[str] = None) -> Optional[ClassificationResult]:
    """Non-image files never reach an engine — classify by extension."""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    empty = _empty_signals(filename)

    if ext in FONT_EXTS or (content_type or "").startswith("font/"):
        return ClassificationResult(
            category=Category.font_specimen,
            confidence=1.0,
            placement="fonts",
            is_logo=False,
            reasoning=f"Font binary ({ext}) — extension fast path.",
            signals=empty,
            engine="fast-path",
        )
    if ext in DOC_EXTS:
        return ClassificationResult(
            category=Category.document,
            confidence=1.0,
            placement="files",
            is_logo=False,
            reasoning=f"Document file ({ext}) — extension fast path.",
            signals=empty,
            engine="fast-path",
        )
    if ext in SKIP_EXTS:
        return ClassificationResult(
            category=Category.other,
            confidence=1.0,
            placement="files",
            is_logo=False,
            reasoning=f"Non-image file ({ext}) — extension fast path.",
            signals=empty,
            engine="fast-path",
        )
    return None


def prepare_image(data: bytes, filename: str, content_type: Optional[str] = None) -> PreparedImage:
    """Load raster or SVG bytes into a PreparedImage with signals computed once."""
    settings = get_settings()

    if _looks_like_svg(data, filename, content_type):
        return _prepare_svg(data, filename, settings.max_edge)

    img = Image.open(io.BytesIO(data))
    img.load()
    rgba = img.convert("RGBA")
    rgba = _fit(rgba, settings.max_edge)
    signals = extract_signals(rgba, filename, is_vector=False)
    return PreparedImage(
        pil=rgba,
        png_bytes=_to_png(rgba),
        signals=signals,
        filename=filename,
    )


# ---------------------------------------------------------------- internals


def _looks_like_svg(data: bytes, filename: str, content_type: Optional[str]) -> bool:
    if filename.lower().endswith(".svg") or (content_type or "") in SVG_MIMES:
        head = data[:512].lstrip()
        return b"<svg" in data[:4096] or head.startswith(b"<?xml") or head.startswith(b"<svg")
    return False


def _prepare_svg(data: bytes, filename: str, max_edge: int) -> PreparedImage:
    svg_has_text, svg_path_count = _inspect_svg(data)

    import cairosvg  # local import: keeps base import cheap and failure isolated

    png = cairosvg.svg2png(bytestring=data, output_width=None, output_height=None)
    img = Image.open(io.BytesIO(png)).convert("RGBA")
    img = _fit(img, max_edge)

    signals = extract_signals(
        img,
        filename,
        is_vector=True,
        svg_has_text=svg_has_text,
        svg_path_count=svg_path_count,
    )
    return PreparedImage(pil=img, png_bytes=_to_png(img), signals=signals, filename=filename)


def _inspect_svg(data: bytes) -> tuple[bool, int]:
    """Count <text>/<tspan> and shape elements with a safe XML parser."""
    from defusedxml import ElementTree as SafeET

    try:
        root = SafeET.fromstring(data.decode("utf-8", errors="replace"))
    except Exception:
        return False, 0

    text_tags = {"text", "tspan", "textPath"}
    shape_tags = {"path", "rect", "circle", "ellipse", "polygon", "polyline", "line"}
    has_text = False
    path_count = 0
    for el in root.iter():
        tag = el.tag.rsplit("}", 1)[-1]
        if tag in text_tags:
            has_text = True
        elif tag in shape_tags:
            path_count += 1
    return has_text, path_count


def _fit(img: Image.Image, max_edge: int) -> Image.Image:
    w, h = img.size
    scale = max_edge / max(w, h)
    if scale >= 1:
        return img
    return img.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)


def _to_png(img: Image.Image) -> bytes:
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _empty_signals(filename: str) -> Signals:
    from .signals import filename_hint

    return Signals(
        width=0,
        height=0,
        aspect_ratio=1.0,
        has_transparency=False,
        transparency_ratio=0.0,
        unique_colors=0,
        dominant_colors=[],
        edge_density=0.0,
        entropy=0.0,
        flat_region_share=0.0,
        text_band_score=0.0,
        text_band_count=0,
        tiling_score=0.0,
        is_vector=False,
        contains_text_guess=False,
        filename_hint=filename_hint(filename),
    )
