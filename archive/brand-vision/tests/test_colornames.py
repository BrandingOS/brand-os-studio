from __future__ import annotations

from brand_vision.colornames import name_color


def test_exact_anchors():
    assert name_color("#000000")["en"] == "Black"
    assert name_color("#FFFFFF")["ar"] == "أبيض"
    assert name_color("#000080")["ar"] == "كحلي"


def test_nearby_shades_resolve_to_the_designer_name():
    # Burgundy and wine are neighbors — either name is a correct read here.
    assert name_color("#7B1E2B")["ar"] in ("نبيتي", "خمري")
    assert name_color("#1E5ADC")["en"] == "Royal Blue"
    assert name_color("#F6E9D2")["en"] in ("Cream", "Champagne", "Beige", "Off White")


def test_chromatic_never_lands_on_a_grey():
    # A saturated dark red must not be called "Charcoal" just because it's dark.
    dark_red = name_color("#5E1010")
    assert "Grey" not in dark_red["en"] and dark_red["en"] not in ("Black", "Charcoal", "Ink")


def test_grey_never_lands_on_a_chromatic():
    grey = name_color("#6E6E72")
    assert grey["en"] in ("Grey", "Dark Grey", "Silver", "Light Grey", "Charcoal")


def test_shorthand_and_garbage():
    assert name_color("#00F")["en"] == "Blue"
    assert name_color("oops")["en"] == "Unknown"
