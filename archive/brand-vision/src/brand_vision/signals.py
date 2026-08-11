"""Deterministic signal extraction (Pillow + numpy).

Thresholds deliberately mirror the TS heuristics in
`src/features/onboarding-v4/utils/assetUpload.ts`:
- transparency: alpha < 200 counts as transparent; >5% share => transparent asset
- dominant colors: 64px downsample, RGB buckets of 24, neutral-share rule
"""
from __future__ import annotations

import math
import re
from typing import Optional

import numpy as np
from PIL import Image

from .schema import Signals

ALPHA_THRESHOLD = 200
COLOR_BUCKET = 24

_FILENAME_HINTS: list[tuple[str, str]] = [
    (r"(wordmark|logotype)", "wordmark"),
    (r"(favicon|app-?icon|(?<!word)mark|monogram|glyph|symbol)", "mark"),
    (r"\bicon\b", "icon"),
    (r"(horizontal|landscape|wide)", "horizontal"),
    (r"(vertical|stacked|portrait)", "vertical"),
    (r"(dark|night|inverse|inverted|white|on-dark)", "dark"),
    (r"(light|day|black|on-light|on-white)", "light"),
    (r"(logo|brand-?mark|emblem)", "logo"),
]


def extract_signals(
    img: Image.Image,
    filename: str,
    *,
    is_vector: bool = False,
    svg_has_text: Optional[bool] = None,
    svg_path_count: Optional[int] = None,
) -> Signals:
    """Compute all deterministic signals from an RGBA PIL image."""
    rgba = img.convert("RGBA")
    width, height = rgba.size
    aspect_ratio = round(width / height, 4) if height else 1.0

    small = _fit(rgba, 128)
    arr = np.asarray(small, dtype=np.uint8)
    alpha = arr[..., 3].astype(np.int32)

    total = alpha.size
    transparent = int((alpha < ALPHA_THRESHOLD).sum())
    transparency_ratio = round(transparent / total, 4) if total else 0.0
    has_transparency = transparency_ratio > 0.05

    opaque_mask = alpha >= ALPHA_THRESHOLD
    unique_colors = _unique_colors(arr, opaque_mask)
    dominant_colors = _dominant_colors(arr, opaque_mask)

    struct = _fit(rgba, 256)
    gray = np.asarray(_composite_white(struct).convert("L"), dtype=np.float64)

    edge_density = _edge_density(gray)
    entropy = _entropy(gray)
    flat_region_share = _flat_region_share(np.asarray(_composite_white(struct)))
    text_band_score, text_band_count = _text_bands(gray)
    tiling_score = _tiling_score(gray, edge_density)

    contains_text_guess = bool(svg_has_text) or (
        text_band_count >= 1 and text_band_score >= 0.25
    )

    from .colornames import name_colors

    dominant_color_names = name_colors(dominant_colors)

    return Signals(
        width=width,
        height=height,
        aspect_ratio=aspect_ratio,
        has_transparency=has_transparency,
        transparency_ratio=transparency_ratio,
        unique_colors=unique_colors,
        dominant_colors=dominant_colors,
        edge_density=round(edge_density, 4),
        entropy=round(entropy, 4),
        flat_region_share=round(flat_region_share, 4),
        text_band_score=round(text_band_score, 4),
        text_band_count=text_band_count,
        tiling_score=round(tiling_score, 4),
        is_vector=is_vector,
        svg_has_text=svg_has_text,
        svg_path_count=svg_path_count,
        contains_text_guess=contains_text_guess,
        filename_hint=filename_hint(filename),
        dominant_color_names=dominant_color_names,
    )


def filename_hint(filename: str) -> Optional[str]:
    stem = filename.rsplit("/", 1)[-1].rsplit(".", 1)[0].lower()
    for pattern, hint in _FILENAME_HINTS:
        if re.search(pattern, stem):
            return hint
    return None


# ---------------------------------------------------------------- internals


def _fit(img: Image.Image, max_edge: int) -> Image.Image:
    w, h = img.size
    scale = max_edge / max(w, h)
    if scale >= 1:
        return img
    return img.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)


def _composite_white(rgba: Image.Image) -> Image.Image:
    bg = Image.new("RGBA", rgba.size, (255, 255, 255, 255))
    return Image.alpha_composite(bg, rgba).convert("RGB")


def _unique_colors(arr: np.ndarray, opaque_mask: np.ndarray) -> int:
    rgb = arr[..., :3][opaque_mask]
    if rgb.size == 0:
        return 0
    quant = (rgb // 8).astype(np.int32)
    keys = quant[:, 0] * 32 * 32 + quant[:, 1] * 32 + quant[:, 2]
    return int(np.unique(keys).size)


def _dominant_colors(arr: np.ndarray, opaque_mask: np.ndarray, count: int = 6) -> list[str]:
    """Port of extractDominantColors: bucket=24, neutral-share rule, chromatic first."""
    rgb = arr[..., :3][opaque_mask].astype(np.int32)
    if rgb.size == 0:
        return []
    total = rgb.shape[0]
    quant = rgb // COLOR_BUCKET
    keys = quant[:, 0] * 1000000 + quant[:, 1] * 1000 + quant[:, 2]
    uniq, counts = np.unique(keys, return_counts=True)

    swatches: list[tuple[str, float, float, float]] = []  # hex, share, hue, sat
    for key, n in zip(uniq.tolist(), counts.tolist()):
        qr, qg, qb = key // 1000000, (key // 1000) % 1000, key % 1000
        r = min(255, qr * COLOR_BUCKET + COLOR_BUCKET // 2)
        g = min(255, qg * COLOR_BUCKET + COLOR_BUCKET // 2)
        b = min(255, qb * COLOR_BUCKET + COLOR_BUCKET // 2)
        share = n / total
        hue, sat = _hue_sat(r, g, b)
        is_neutral = sat < 0.12
        # Neutral swatches only kept when they are a mid-share element
        # (background walls and tiny noise are dropped) — mirrors the TS rule.
        if is_neutral and not (0.08 < share < 0.6):
            continue
        swatches.append((f"#{r:02x}{g:02x}{b:02x}", share, hue, sat))

    if not swatches:
        # Mono artwork (e.g. an all-white logo on transparency): the single
        # neutral covers ~100% and was dropped above — bring neutrals back.
        for key, n in zip(uniq.tolist(), counts.tolist()):
            qr, qg, qb = key // 1000000, (key // 1000) % 1000, key % 1000
            r = min(255, qr * COLOR_BUCKET + COLOR_BUCKET // 2)
            g = min(255, qg * COLOR_BUCKET + COLOR_BUCKET // 2)
            b = min(255, qb * COLOR_BUCKET + COLOR_BUCKET // 2)
            share = n / total
            if share > 0.02:
                hue, sat = _hue_sat(r, g, b)
                swatches.append((f"#{r:02x}{g:02x}{b:02x}", share, hue, sat))

    # Merge same-hue chromatic swatches (within 18 degrees), keep the biggest.
    merged: list[tuple[str, float, float, float]] = []
    for sw in sorted(swatches, key=lambda s: -s[1]):
        if sw[3] >= 0.12 and any(
            m[3] >= 0.12 and _hue_dist(m[2], sw[2]) < 18 for m in merged
        ):
            continue
        merged.append(sw)

    merged.sort(key=lambda s: (s[3] < 0.12, -s[1]))  # chromatic first, then share
    return [m[0] for m in merged[:count]]


def _hue_sat(r: int, g: int, b: int) -> tuple[float, float]:
    mx, mn = max(r, g, b), min(r, g, b)
    delta = mx - mn
    sat = 0.0 if mx == 0 else delta / mx
    if delta == 0:
        return 0.0, sat
    if mx == r:
        hue = ((g - b) / delta) % 6
    elif mx == g:
        hue = (b - r) / delta + 2
    else:
        hue = (r - g) / delta + 4
    return hue * 60.0, sat


def _hue_dist(a: float, b: float) -> float:
    d = abs(a - b) % 360
    return min(d, 360 - d)


def _edge_density(gray: np.ndarray) -> float:
    if gray.shape[0] < 3 or gray.shape[1] < 3:
        return 0.0
    gx = np.abs(np.diff(gray, axis=1))
    gy = np.abs(np.diff(gray, axis=0))
    mag = np.zeros_like(gray)
    mag[:, :-1] += gx
    mag[:-1, :] += gy
    return float((mag > 40).mean())


def _entropy(gray: np.ndarray) -> float:
    hist, _ = np.histogram(gray, bins=256, range=(0, 255))
    p = hist / max(1, hist.sum())
    p = p[p > 0]
    return float(-(p * np.log2(p)).sum())


def _flat_region_share(rgb: np.ndarray) -> float:
    """Share of pixels identical (after 16-step quantization) to right+down neighbors."""
    if rgb.shape[0] < 2 or rgb.shape[1] < 2:
        return 1.0
    q = (rgb.astype(np.int32) // 16)
    same_right = (q[:, :-1, :] == q[:, 1:, :]).all(axis=2)
    same_down = (q[:-1, :, :] == q[1:, :, :]).all(axis=2)
    flat = same_right[:-1, :] & same_down[:, :-1]
    return float(flat.mean())


def _text_bands(gray: np.ndarray) -> tuple[float, int]:
    """Detect periodic horizontal ink bands (rows of text / specimen sheets)."""
    h = gray.shape[0]
    if h < 8:
        return 0.0, 0
    # Ink = darker than the row-median background estimate.
    bg = float(np.median(gray))
    ink = (gray < bg - 40).astype(np.float64)
    profile = ink.mean(axis=1)
    active = profile > 0.02

    bands: list[int] = []
    run = 0
    for a in active:
        if a:
            run += 1
        elif run:
            bands.append(run)
            run = 0
    if run:
        bands.append(run)

    # Discard bands taller than half the image (that's a shape, not a text row).
    bands = [b for b in bands if 1 <= b <= h * 0.5]
    n = len(bands)
    if n == 0:
        return 0.0, 0
    if n == 1:
        return 0.15, 1

    heights = np.array(bands, dtype=np.float64)
    regularity = 1.0 - min(1.0, float(heights.std() / max(1.0, heights.mean())))
    density_ok = min(1.0, n / 5.0)
    return float(max(0.0, min(1.0, 0.5 * regularity + 0.5 * density_ok))), n


def _tiling_score(gray: np.ndarray, edge_density: float) -> float:
    """Autocorrelation at fractional offsets; flat images are excluded."""
    if edge_density < 0.01:
        return 0.0
    h, w = gray.shape
    best = 0.0
    for frac in (2, 3, 4):
        sx = w // frac
        sy = h // frac
        if sx >= 8:
            best = max(best, _shift_corr(gray[:, : w - sx], gray[:, sx:]))
        if sy >= 8:
            best = max(best, _shift_corr(gray[: h - sy, :], gray[sy:, :]))
    return max(0.0, best)


def _shift_corr(a: np.ndarray, b: np.ndarray) -> float:
    fa, fb = a.ravel(), b.ravel()
    if fa.std() < 1e-6 or fb.std() < 1e-6:
        return 0.0
    c = np.corrcoef(fa, fb)[0, 1]
    return float(c) if math.isfinite(c) else 0.0
