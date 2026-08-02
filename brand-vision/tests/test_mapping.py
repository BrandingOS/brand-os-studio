from __future__ import annotations

from brand_vision import mapping
from brand_vision.schema import Category, Signals


def sig(**kw) -> Signals:
    base = dict(
        width=500, height=500, aspect_ratio=1.0, has_transparency=False,
        transparency_ratio=0.0, unique_colors=10, dominant_colors=["#2255cc"],
        edge_density=0.05, entropy=3.0, flat_region_share=0.5,
        text_band_score=0.0, text_band_count=0, tiling_score=0.0,
        is_vector=False, contains_text_guess=False, filename_hint=None,
    )
    base.update(kw)
    return Signals(**base)


def test_placements():
    assert mapping.placement_for(Category.logo_mark) == "logos"
    assert mapping.placement_for(Category.palette) == "colors"
    assert mapping.placement_for(Category.font_specimen) == "fonts"
    assert mapping.placement_for(Category.photo) == "images"
    assert mapping.placement_for(Category.document) == "files"


def test_asset_kinds():
    assert mapping.asset_kind_for(Category.palette) == "color"
    assert mapping.asset_kind_for(Category.font_specimen) == "font"
    assert mapping.asset_kind_for(Category.logo_lockup) == "image"


def test_slot_from_aspect():
    assert mapping.default_slot(Category.logo_lockup, sig(aspect_ratio=3.0)) == "horizontal"
    assert mapping.default_slot(Category.logo_lockup, sig(aspect_ratio=0.6)) == "vertical"
    assert mapping.default_slot(Category.logo_lockup, sig(aspect_ratio=1.0)) == "primary"
    assert mapping.default_slot(Category.logo_wordmark, sig()) == "wordmark"
    assert mapping.default_slot(Category.logo_mark, sig()) == "mark"
    assert mapping.default_slot(Category.photo, sig()) is None


def test_white_artwork_goes_to_dark_slot():
    s = sig(transparency_ratio=0.4, dominant_colors=["#fefefe"])
    assert mapping.default_slot(Category.logo_mark, s) == "dark"
    assert mapping.default_slot(Category.logo_lockup, s) == "dark"


def test_filename_hint_overrides_aspect():
    s = sig(aspect_ratio=3.0, filename_hint="mark")
    assert mapping.default_slot(Category.logo_lockup, s) == "mark"


def test_filename_slot_hint_ordering():
    # "wordmark" must not be captured by the "mark" pattern.
    assert mapping.filename_slot_hint("acme-wordmark.png") == "wordmark"
    assert mapping.filename_slot_hint("acme-mark.png") == "mark"


def test_to_logo_role():
    assert mapping.to_logo_role("mark") == "iconmark"
    assert mapping.to_logo_role("vertical") == "stacked"
    assert mapping.to_logo_role("dark") == "mono.white"
    assert mapping.to_logo_role(None) is None
