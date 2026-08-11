from __future__ import annotations

import pytest

from brand_vision.engines.heuristic import HeuristicEngine
from brand_vision.schema import Category

ENGINE = HeuristicEngine()

GOLDEN = [
    ("logo_mark.png", Category.logo_mark, "logos", "mark"),
    ("logo_lockup_horizontal.png", Category.logo_lockup, "logos", "horizontal"),
    ("logo_wordmark.png", Category.logo_wordmark, "logos", "wordmark"),
    ("palette.png", Category.palette, "colors", None),
    ("font_specimen.png", Category.font_specimen, "fonts", None),
    ("photo.png", Category.photo, "images", None),
    ("pattern.png", Category.pattern, "images", None),
    ("wordmark.svg", Category.logo_wordmark, "logos", "wordmark"),
    ("mark.svg", Category.logo_mark, "logos", "mark"),
    ("lockup.svg", Category.logo_lockup, "logos", None),  # slot depends on AR
]


@pytest.mark.parametrize("name,category,placement,slot", GOLDEN)
def test_golden(prepared, name, category, placement, slot):
    result = ENGINE.classify(prepared(name))
    assert result.category is category, f"{name}: got {result.category} ({result.reasoning})"
    assert result.placement == placement
    if slot is not None:
        assert result.logo_slot == slot, f"{name}: got slot {result.logo_slot}"


def test_white_mark_gets_dark_slot(prepared):
    """White artwork on transparency must land in the 'dark' slot (for dark bg)."""
    result = ENGINE.classify(prepared("logo_mark_white.png"))
    assert result.category is Category.logo_mark
    assert result.logo_slot == "dark"


def test_low_confidence_flags_review(prepared):
    result = ENGINE.classify(prepared("photo.png"))
    assert result.confidence >= 0.6
    assert result.needs_review is False
