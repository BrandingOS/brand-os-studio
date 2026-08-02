from __future__ import annotations

from brand_vision.logolayout import refine, should_analyze
from brand_vision.schema import Category, Signals
from brand_vision.textdetect import TextLayout, TextRegion


def sig(**over) -> Signals:
    base = dict(
        width=512, height=512, aspect_ratio=1.0, has_transparency=True,
        transparency_ratio=0.6, unique_colors=12, dominant_colors=["#112233"],
        edge_density=0.1, entropy=3.0, flat_region_share=0.0,
        text_band_score=0.0, text_band_count=0, tiling_score=0.0,
        is_vector=False, contains_text_guess=False,
    )
    base.update(over)
    return Signals(**base)


def region(text: str, conf: float = 0.9) -> TextRegion:
    return TextRegion(box=(0.1, 0.4, 0.9, 0.6), text=text, conf=conf)


def layout(text_regions, icon_mass=0.0, ok=True) -> TextLayout:
    lay = TextLayout(ok=ok, regions=text_regions)
    if text_regions:
        lay.text = " ".join(r.text for r in text_regions)
        lay.mean_conf = sum(r.conf for r in text_regions) / len(text_regions)
    lay.icon_mass_ratio = icon_mass
    return lay


def test_L1_text_plus_icon_mass_promotes_to_lockup():
    cat, conf, note = refine(
        Category.logo_wordmark, 0.55, layout([region("Acme")], icon_mass=0.2), sig()
    )
    assert cat is Category.logo_lockup
    assert conf >= 0.82 and note


def test_L2_text_only_promotes_to_wordmark():
    cat, conf, note = refine(
        Category.logo_mark, 0.5, layout([region("Meridian")], icon_mass=0.02), sig()
    )
    assert cat is Category.logo_wordmark
    assert note


def test_monogram_guard_two_letters_stay_mark():
    cat, _, note = refine(
        Category.logo_mark, 0.7, layout([region("VC")], icon_mass=0.02), sig()
    )
    assert cat is Category.logo_mark and note is None


def test_L3_no_text_anywhere_flips_weak_wordmark_to_mark():
    cat, _, note = refine(Category.logo_wordmark, 0.55, layout([]), sig())
    assert cat is Category.logo_mark and note


def test_L3_respects_pixel_heuristic_disagreement():
    # OCR missed it but the pixel heuristic sees text (stylized Arabic) — hold.
    cat, _, note = refine(
        Category.logo_wordmark, 0.55, layout([]), sig(contains_text_guess=True)
    )
    assert cat is Category.logo_wordmark and note is None


def test_L3_never_flips_a_confident_wordmark():
    cat, _, _ = refine(Category.logo_wordmark, 0.9, layout([]), sig())
    assert cat is Category.logo_wordmark


def test_dead_zone_between_thresholds_changes_nothing():
    cat, conf, note = refine(
        Category.logo_mark, 0.5, layout([region("Acme")], icon_mass=0.08), sig()
    )
    assert cat is Category.logo_mark and note is None and conf == 0.5


def test_agreement_boosts_confidence_without_note():
    cat, conf, note = refine(
        Category.logo_lockup, 0.6, layout([region("Acme")], icon_mass=0.3), sig()
    )
    assert cat is Category.logo_lockup and conf >= 0.85 and note is None


def test_none_layout_and_non_logo_categories_pass_through():
    assert refine(Category.photo, 0.9, layout([region("x")]), sig())[2] is None
    assert refine(Category.logo_mark, 0.9, None, sig())[2] is None
    cat, conf, _ = refine(Category.logo_mark, 0.9, layout([], ok=False), sig())
    assert cat is Category.logo_mark and conf == 0.9


def test_should_analyze_targets_logoish_and_uncertain_only():
    assert should_analyze(Category.logo_wordmark, 0.99, sig())
    assert should_analyze(Category.other, 0.4, sig())
    assert not should_analyze(Category.other, 0.9, sig())
    assert not should_analyze(Category.photo, 0.3, sig())


def test_L0_transparent_palette_is_rescued_as_logo():
    s = sig(transparency_ratio=0.55)
    assert should_analyze(Category.palette, 0.7, s)
    # Text + big separate artwork → lockup.
    cat, conf, note = refine(
        Category.palette, 0.45, layout([region("Acme")], icon_mass=0.2), s
    )
    assert cat is Category.logo_lockup and conf >= 0.78 and "transparent" in note
    # Text alone → wordmark.
    cat, _, _ = refine(
        Category.palette, 0.45, layout([region("Acme")], icon_mass=0.02), s
    )
    assert cat is Category.logo_wordmark
    # No text, solid artwork → mark.
    cat, _, _ = refine(Category.palette, 0.45, layout([], icon_mass=0.3), s)
    assert cat is Category.logo_mark


def test_L0_opaque_palette_is_untouched():
    s = sig(transparency_ratio=0.0, has_transparency=False)
    assert not should_analyze(Category.palette, 0.5, s)
    cat, _, note = refine(
        Category.palette, 0.9, layout([region("#FF0000 Crimson")], icon_mass=0.4), s
    )
    assert cat is Category.palette and note is None
