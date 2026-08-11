from __future__ import annotations


def test_transparency_detected_on_mark(prepared):
    img = prepared("logo_mark.png")
    s = img.signals
    assert s.has_transparency
    assert s.transparency_ratio > 0.3
    assert 0.9 <= s.aspect_ratio <= 1.1


def test_opaque_palette_signals(prepared):
    s = prepared("palette.png").signals
    assert not s.has_transparency
    assert s.flat_region_share > 0.8
    assert s.unique_colors <= 24
    assert s.edge_density < 0.06
    assert len(s.dominant_colors) >= 3


def test_photo_signals(prepared):
    s = prepared("photo.png").signals
    assert s.unique_colors > 4000
    assert s.entropy > 6.5
    assert not s.has_transparency


def test_font_specimen_bands(prepared):
    s = prepared("font_specimen.png").signals
    assert s.text_band_count >= 4
    assert s.text_band_score >= 0.55


def test_pattern_tiling(prepared):
    s = prepared("pattern.png").signals
    assert s.tiling_score > 0.85


def test_svg_signals(prepared):
    s = prepared("wordmark.svg").signals
    assert s.is_vector
    assert s.svg_has_text is True

    s2 = prepared("mark.svg").signals
    assert s2.is_vector
    assert s2.svg_has_text is False
    assert (s2.svg_path_count or 0) >= 1


def test_filename_hints():
    from brand_vision.signals import filename_hint

    assert filename_hint("acme-wordmark.png") == "wordmark"
    assert filename_hint("acme-mark.svg") == "mark"
    assert filename_hint("favicon.png") == "mark"
    assert filename_hint("logo-horizontal.png") == "horizontal"
    assert filename_hint("logo-white-on-dark.png") == "dark"
    assert filename_hint("logo.png") == "logo"
    assert filename_hint("IMG_2041.jpg") is None
