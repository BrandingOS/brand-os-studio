"""Hybrid engine: Claude verdict cross-checked against deterministic signals.

Ordered fusion rules (each row is unit-tested in tests/test_hybrid.py). The
hybrid never hard-fails: if Claude errors or refuses, the heuristic result is
returned flagged for review.
"""
from __future__ import annotations

from .. import mapping
from ..schema import Category, ClassificationResult
from .base import PreparedImage
from .claude import ClaudeEngine
from .heuristic import HeuristicEngine

_LOGO_CATS = {Category.logo_lockup, Category.logo_wordmark, Category.logo_mark}
_VISUAL_CATS = {Category.photo, Category.illustration, Category.mockup}


class HybridEngine:
    name = "hybrid"

    def __init__(
        self,
        claude: ClaudeEngine | None = None,
        heuristic: HeuristicEngine | None = None,
        fallback_vision=None,
    ):
        """`claude` is the primary vision verdict source; `fallback_vision` is an
        optional free/local substitute (e.g. the Ollama engine) used when the
        Claude API is unavailable."""
        self.claude = claude or ClaudeEngine()
        self.heuristic = heuristic or HeuristicEngine()
        self.fallback_vision = fallback_vision

    @property
    def available(self) -> bool:
        return self.claude.available or (
            self.fallback_vision is not None and self.fallback_vision.available
        )

    def classify(self, img: PreparedImage) -> ClassificationResult:
        heur = self.heuristic.classify(img)

        vision_engine = self.claude
        if not self.claude.available and self.fallback_vision is not None and self.fallback_vision.available:
            vision_engine = self.fallback_vision
        vision = vision_engine.classify(img)

        # Rule 8: vision engine errored/refused (confidence 0 + review flag) -> heuristic.
        if vision.confidence == 0.0 and vision.needs_review:
            return fuse_error(heur, vision)

        return fuse(vision, heur, img)


def fuse_error(heur: ClassificationResult, claude: ClassificationResult) -> ClassificationResult:
    out = heur.model_copy(deep=True)
    out.engine = "hybrid"
    out.model = claude.model
    out.needs_review = True
    out.review_reasons = list(
        dict.fromkeys([*out.review_reasons, "claude unavailable — heuristic verdict only", *claude.review_reasons])
    )
    return out


def fuse(claude: ClassificationResult, heur: ClassificationResult, img: PreparedImage) -> ClassificationResult:
    """Pure fusion function — deterministic given the two verdicts + signals."""
    s = img.signals
    out = claude.model_copy(deep=True)
    out.engine = "hybrid"
    fired: list[str] = []

    # Rule 1: claude says photo-like, but the file is clearly transparent artwork.
    if claude.category in _VISUAL_CATS and s.transparency_ratio > 0.25:
        if heur.category in _LOGO_CATS:
            out.category = heur.category
            out.logo_slot = heur.logo_slot
        else:
            out.category = Category.logo_lockup
            out.logo_slot = mapping.default_slot(Category.logo_lockup, s)
        out.confidence = min(claude.confidence, 0.7)
        out.needs_review = True
        fired.append("R1: photo-like verdict contradicts measured transparency — treated as logo")

    # Rule 2: palette verdict but the pixels don't look like flat swatches.
    elif claude.category is Category.palette and (s.unique_colors > 500 or s.flat_region_share < 0.5):
        out.confidence = max(0.0, claude.confidence - 0.25)
        out.needs_review = True
        fired.append("R2: palette verdict but color/flatness signals disagree")

    # Rule 4: wordmark without any text evidence.
    elif (
        claude.category is Category.logo_wordmark
        and s.contains_text_guess is False
        and s.text_band_score < 0.05
    ):
        if s.aspect_ratio <= 1.4:
            out.category = Category.logo_mark
            out.logo_slot = mapping.default_slot(Category.logo_mark, s)
            fired.append("R4: wordmark verdict with no text evidence on square art — demoted to mark")
        else:
            fired.append("R4: wordmark verdict with no text evidence — kept, flagged")
        out.needs_review = True

    # Rule 5: agreement between engines -> confidence boost.
    elif claude.category == heur.category:
        out.confidence = min(0.99, max(claude.confidence, heur.confidence) + 0.05)
        out.needs_review = False
        out.review_reasons = []
        fired.append("R5: engines agree")

    # Rule 6: strong heuristic vs weak claude disagreement.
    elif heur.confidence >= 0.8 and claude.confidence < 0.6:
        out.needs_review = True
        fired.append(
            f"R6: engines disagree (claude={claude.category.value}@{claude.confidence:.2f}, "
            f"heuristic={heur.category.value}@{heur.confidence:.2f})"
        )

    # Rule 3: vector source strengthens any logo verdict (applies on top).
    if out.category in _LOGO_CATS and s.is_vector:
        out.confidence = min(0.99, out.confidence + 0.1)
        fired.append("R3: vector source supports logo verdict")

    # Rule 7: slot sanity against aspect ratio.
    if out.logo_slot == "horizontal" and s.aspect_ratio < 1.6:
        out.logo_slot = mapping.default_slot(out.category, s)
        fired.append("R7: horizontal slot rejected (aspect ratio too square)")
    elif out.logo_slot == "vertical" and s.aspect_ratio > 0.9:
        out.logo_slot = mapping.default_slot(out.category, s)
        fired.append("R7: vertical slot rejected (aspect ratio too wide)")
    elif out.logo_slot == "mark" and not (0.7 <= s.aspect_ratio <= 1.4) and s.filename_hint not in ("mark", "icon"):
        out.logo_slot = mapping.default_slot(out.category, s)
        fired.append("R7: mark slot rejected (aspect ratio not square-ish)")

    # Re-derive dependent fields after any category change.
    out.placement = mapping.placement_for(out.category)
    out.is_logo = mapping.is_logo_category(out.category)
    if not out.is_logo:
        out.logo_slot = None

    if fired:
        out.review_reasons = list(dict.fromkeys([*out.review_reasons, *fired]))
        out.reasoning = f"{claude.reasoning} [hybrid: {'; '.join(fired)}]"
    return out
