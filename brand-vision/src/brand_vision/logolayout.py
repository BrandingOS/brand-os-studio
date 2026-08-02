"""Layout-evidence fusion: refine lockup / wordmark / mark using OCR facts.

Pure decision table over (CLIP verdict, TextLayout) — no I/O, fully
unit-testable. The philosophy mirrors the hybrid engine's fusion rules:
measured evidence overrides a soft prior only when it is strong, and every
override is explained.

Rules (first match wins):
  L1  text(≥3 letters) + icon mass ≥ 10%  → logo_lockup
  L2  text(≥4 letters) + icon mass < 6%   → logo_wordmark
  L3  no text at all + verdict wordmark/lockup, weakly held and the
      heuristic text guess agrees there's no text → logo_mark
Monogram guard: 1–2 letters never promote to wordmark (an OCR'd "M" is
still a mark). Between 6% and 10% icon mass is a dead zone — no override.
"""
from __future__ import annotations

from typing import Optional

from .schema import Category, Signals
from .textdetect import TextLayout

LOGOISH = {
    Category.logo_lockup,
    Category.logo_wordmark,
    Category.logo_mark,
    Category.other,
    Category.illustration,
}

ICON_MASS_LOCKUP = 0.10     # separate artwork this big ⇒ icon next to name
ICON_MASS_NONE = 0.06       # below this there is no meaningful icon
LOCKUP_MIN_CHARS = 3
WORDMARK_MIN_CHARS = 4
NO_TEXT_MAX_CONF = 0.75     # only flip a weakly-held text verdict
TRANSPARENT_PALETTE = 0.10  # real palette exports are opaque rectangles


def _transparent_palette(category: Category, signals: Signals) -> bool:
    """A 'palette' with a transparent background is a logo wearing a costume."""
    return (
        category is Category.palette
        and signals.transparency_ratio > TRANSPARENT_PALETTE
    )


def should_analyze(category: Category, confidence: float, signals: Signals) -> bool:
    """OCR costs ~1s — only spend it where layout can change the answer."""
    if category in (Category.logo_lockup, Category.logo_wordmark, Category.logo_mark):
        return True
    if _transparent_palette(category, signals):
        return True
    return category in LOGOISH and confidence < 0.6


def refine(
    category: Category,
    confidence: float,
    layout: Optional[TextLayout],
    signals: Signals,
) -> tuple[Category, float, Optional[str]]:
    """Returns (category, confidence, note). note=None ⇒ no change."""
    rescued_palette = _transparent_palette(category, signals)
    if layout is None or not layout.ok or (category not in LOGOISH and not rescued_palette):
        return category, confidence, None

    # L0 — transparent "palette" is really a logo; decide which kind.
    if rescued_palette:
        note = (
            f"layout: transparent background ({signals.transparency_ratio:.0%}) "
            f"rules out a palette export"
        )
        if layout.has_text and layout.word_chars >= LOCKUP_MIN_CHARS:
            if layout.icon_mass_ratio >= ICON_MASS_LOCKUP:
                return Category.logo_lockup, max(confidence, 0.78), note + " → lockup"
            return Category.logo_wordmark, max(confidence, 0.78), note + " → wordmark"
        if layout.icon_mass_ratio >= ICON_MASS_NONE or signals.contains_text_guess:
            cat = (
                Category.logo_wordmark
                if signals.contains_text_guess and layout.icon_mass_ratio < ICON_MASS_LOCKUP
                else Category.logo_mark
            )
            return cat, max(confidence, 0.72), note + f" → {cat.value}"
        return category, confidence, None  # sparse ink, no text — leave it

    if layout.has_text and layout.mean_conf >= 0.45:
        chars = layout.word_chars
        # L1 — name + separate artwork = lockup.
        if chars >= LOCKUP_MIN_CHARS and layout.icon_mass_ratio >= ICON_MASS_LOCKUP:
            if category != Category.logo_lockup:
                return (
                    Category.logo_lockup,
                    max(confidence, 0.82),
                    f"layout: text “{layout.text}” + {layout.icon_mass_ratio:.0%} "
                    f"artwork outside it → lockup",
                )
            return category, max(confidence, 0.85), None  # confirmed
        # L2 — name with no separate artwork = wordmark.
        if chars >= WORDMARK_MIN_CHARS and layout.icon_mass_ratio < ICON_MASS_NONE:
            if category != Category.logo_wordmark:
                return (
                    Category.logo_wordmark,
                    max(confidence, 0.82),
                    f"layout: only text “{layout.text}” "
                    f"({layout.icon_mass_ratio:.0%} residual ink) → wordmark",
                )
            return category, max(confidence, 0.85), None
        return category, confidence, None

    # L3 — OCR found nothing: a weakly-held text verdict flips to mark,
    # but only when the pixel heuristic also saw no text (Arabic thuluth
    # or heavily stylized script can defeat OCR — don't fight it alone).
    if (
        not layout.has_text
        and category in (Category.logo_wordmark, Category.logo_lockup)
        and confidence < NO_TEXT_MAX_CONF
        and not signals.contains_text_guess
    ):
        return (
            Category.logo_mark,
            max(confidence, 0.70),
            "layout: no text found by OCR or pixel heuristic → mark",
        )
    return category, confidence, None
