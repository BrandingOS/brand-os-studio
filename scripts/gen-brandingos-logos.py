#!/usr/bin/env python3
"""
Generate the BrandingOS logo files in `public/brands/brandingos/`.

This is an AUTHORING tool, run by hand — the output is committed. It exists so
the logo files are derived rather than drawn twice:

  * the mark's geometry is read out of `src/shared/ds/BrandMark.tsx`, which
    CLAUDE.md names as the only place that geometry may live. Re-run this after
    changing the mark and the logo files follow.
  * the wordmark is OUTLINED from Plus Jakarta Sans rather than left as
    `<text>`. An SVG rasterised through `<img>` — which is how every export path
    in this app works — cannot see the page's webfonts and silently falls back
    to a system sans. Outlines render identically everywhere.

Usage:
    pip install fonttools
    unzip archive/Brands/vector/fonts/Plus_Jakarta_Sans.zip -d /tmp/pjs
    python3 scripts/gen-brandingos-logos.py /tmp/pjs/static/PlusJakartaSans-SemiBold.ttf
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
MARK_SRC = ROOT / "src" / "shared" / "ds" / "BrandMark.tsx"
OUT_DIR = ROOT / "public" / "brands" / "brandingos"

WORDMARK = "BrandingOS"
MARK_VIEWBOX = 113.01          # the mark is square, viewBox "0 0 113.01 113.01"
TRACKING_EM = -0.022           # the DS sets tight tracking on display type

# Brand values, mirrored from src/shared/ds/tokens.json. Kept as literals
# because these files are static artefacts, not runtime-themed components.
INK = "#111113"                # --ds-accent (light)
CREAM = "#F5F4EF"              # --ds-bg (light) / --ds-accent-fg
BLACK = "#000000"
WHITE = "#FFFFFF"


def read_mark_paths() -> tuple[list[str], str]:
    """Pull the eight ring-dot paths and the centre dot out of BrandMark.tsx."""
    src = MARK_SRC.read_text()

    ring_block = re.search(r"const RING_DOTS = \[(.*?)\n\];", src, re.S)
    if not ring_block:
        sys.exit("Could not find RING_DOTS in BrandMark.tsx")
    ring = re.findall(r"d:\s*'([^']+)'", ring_block.group(1))
    if len(ring) != 8:
        sys.exit(f"Expected 8 ring dots, found {len(ring)}")

    centre = re.search(r"const CENTER_DOT =\s*'([^']+)'", src)
    if not centre:
        sys.exit("Could not find CENTER_DOT in BrandMark.tsx")

    return ring, centre.group(1)


def outline_wordmark(font_path: Path) -> tuple[str, float, float, float]:
    """Outline WORDMARK to a single path.

    Returns (path_data, width, cap_top, descender_depth) in font units, already
    flipped into SVG's y-down space with the baseline at y=0.

    The descender depth is returned because it is NOT optional: "BrandingOS"
    has a `g`, and sizing a box to the cap height alone crops its tail. Any box
    drawn around this path has to reach `descender_depth` BELOW the baseline.
    """
    font = TTFont(str(font_path))
    upem = font["head"].unitsPerEm
    glyphs = font.getGlyphSet()
    cmap = font.getBestCmap()
    hmtx = font["hmtx"]

    # Kerning, when the font exposes a plain GPOS pair table. Plus Jakarta Sans
    # carries most of its spacing in the advances, so a missing table is fine —
    # we simply lay out on advances alone.
    kern = {}
    if "kern" in font:
        for sub in font["kern"].kernTables:
            kern.update(sub.kernTable)

    parts: list[str] = []
    x = 0.0
    tracking = TRACKING_EM * upem
    prev = None
    top = 0.0
    bottom = 0.0

    for ch in WORDMARK:
        name = cmap.get(ord(ch))
        if name is None:
            sys.exit(f"Font has no glyph for {ch!r}")
        if prev is not None:
            x += kern.get((prev, name), 0)

        pen = SVGPathPen(glyphs)
        glyphs[name].draw(pen)
        d = pen.getCommands()
        if d:
            # Flip y (font units are y-up) and place at the running pen x.
            parts.append(f'<path transform="translate({x:.2f},0) scale(1,-1)" d="{d}"/>')

        bounds = BoundsPen(glyphs)
        glyphs[name].draw(bounds)
        if bounds.bounds:
            top = max(top, bounds.bounds[3])
            bottom = min(bottom, bounds.bounds[1])

        x += hmtx[name][0] + tracking
        prev = name

    width = x - tracking  # no tracking after the final glyph
    return "\n    ".join(parts), width, top, -bottom


def mark_group(ring: list[str], centre: str, color: str, opacity_centre: float = 0.9) -> str:
    dots = "\n    ".join(f'<path d="{d}"/>' for d in ring)
    return (
        f'<g fill="{color}">\n    {dots}\n'
        f'    <path d="{centre}" opacity="{opacity_centre}"/>\n  </g>'
    )


def svg(width: float, height: float, body: str, title: str) -> str:
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{width:.2f}" height="{height:.2f}" '
        f'viewBox="0 0 {width:.2f} {height:.2f}" role="img" aria-label="{title}">\n'
        f'  <title>{title}</title>\n  {body}\n</svg>\n'
    )


def build(font_path: Path) -> None:
    ring, centre = read_mark_paths()
    word_d, word_units_w, cap_units, desc_units = outline_wordmark(font_path)

    # ── Proportions ──────────────────────────────────────────────────────────
    # The wordmark's cap height sits at 46% of the mark's height, and the gap
    # between them is 28% of it. Both were chosen by eye against the mark's own
    # optical weight: the nine dots read lighter than solid type, so a wordmark
    # matched to the FULL mark height overpowers it.
    cap_h = MARK_VIEWBOX * 0.46
    scale = cap_h / cap_units
    word_w = word_units_w * scale
    desc_h = desc_units * scale
    gap = MARK_VIEWBOX * 0.28

    def wordmark_group(color: str, x: float, baseline: float) -> str:
        return (
            f'<g fill="{color}" transform="translate({x:.2f},{baseline:.2f}) '
            f'scale({scale:.6f})">\n    {word_d}\n  </g>'
        )

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    # ── icon: the mark alone ─────────────────────────────────────────────────
    (OUT_DIR / "icon.svg").write_text(
        svg(MARK_VIEWBOX, MARK_VIEWBOX, mark_group(ring, centre, INK), "BrandingOS icon")
    )

    # ── wordmark: type alone, baseline-boxed ────────────────────────────────
    pad = cap_h * 0.12
    (OUT_DIR / "wordmark.svg").write_text(
        svg(
            word_w,
            cap_h + desc_h + pad * 2,
            f'<g fill="{INK}" transform="translate(0,{cap_h + pad:.2f}) scale({scale:.6f})">\n'
            f'    {word_d}\n  </g>',
            "BrandingOS wordmark",
        )
    )

    # ── horizontal lockup, in four inks ─────────────────────────────────────
    h_w = MARK_VIEWBOX + gap + word_w
    h_baseline = MARK_VIEWBOX / 2 + cap_h / 2
    for filename, color, title in (
        ("logo.svg", INK, "BrandingOS"),
        ("logo-black.svg", BLACK, "BrandingOS, black"),
        ("logo-white.svg", CREAM, "BrandingOS, on dark"),
    ):
        body = (
            f'{mark_group(ring, centre, color)}\n  '
            f'{wordmark_group(color, MARK_VIEWBOX + gap, h_baseline)}'
        )
        (OUT_DIR / filename).write_text(svg(h_w, MARK_VIEWBOX, body, title))

    # ── stacked lockup ──────────────────────────────────────────────────────
    s_gap = MARK_VIEWBOX * 0.22
    s_w = max(MARK_VIEWBOX, word_w)
    s_baseline = MARK_VIEWBOX + s_gap + cap_h
    s_h = s_baseline + desc_h
    mark_x = (s_w - MARK_VIEWBOX) / 2
    word_x = (s_w - word_w) / 2
    body = (
        f'<g transform="translate({mark_x:.2f},0)">{mark_group(ring, centre, INK)}</g>\n  '
        f'{wordmark_group(INK, word_x, s_baseline)}'
    )
    (OUT_DIR / "logo-stacked.svg").write_text(svg(s_w, s_h, body, "BrandingOS, stacked"))

    for f in sorted(OUT_DIR.glob("*.svg")):
        print(f"  {f.relative_to(ROOT)}  {f.stat().st_size:,} bytes")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    build(Path(sys.argv[1]))
