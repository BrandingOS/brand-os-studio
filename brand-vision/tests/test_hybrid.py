"""One test per hybrid fusion rule."""
from __future__ import annotations

from brand_vision.engines.claude import ClaudeEngine
from brand_vision.engines.heuristic import HeuristicEngine
from brand_vision.engines.hybrid import HybridEngine
from brand_vision.schema import Category

from .conftest import fake_client, parse_response
from .test_claude_engine import verdict


def hybrid_with(claude_response, heuristic=None):
    return HybridEngine(
        claude=ClaudeEngine(client=fake_client(claude_response), model="claude-opus-5"),
        heuristic=heuristic or HeuristicEngine(),
    )


def test_r1_photo_verdict_on_transparent_art_becomes_logo(prepared):
    img = prepared("logo_mark.png")  # transparency_ratio >> 0.25
    eng = hybrid_with(parse_response(verdict(category=Category.photo, logo_slot=None, confidence=0.9)))
    result = eng.classify(img)
    assert result.category in (Category.logo_mark, Category.logo_lockup)
    assert result.is_logo
    assert result.needs_review
    assert any("R1" in r for r in result.review_reasons)


def test_r2_palette_verdict_without_flat_signals(prepared):
    img = prepared("photo.png")  # thousands of colors, low flatness
    eng = hybrid_with(parse_response(verdict(category=Category.palette, logo_slot=None, confidence=0.9)))
    result = eng.classify(img)
    assert result.category is Category.palette
    assert result.confidence <= 0.65
    assert result.needs_review


def test_r3_vector_confidence_boost(prepared):
    img = prepared("mark.svg")
    eng = hybrid_with(parse_response(verdict(confidence=0.8)))
    result = eng.classify(img)
    assert result.confidence > 0.8


def test_r4_wordmark_without_text_on_square_art_demoted(prepared):
    img = prepared("logo_mark.png")  # square, no text bands
    assert img.signals.contains_text_guess is False
    eng = hybrid_with(parse_response(verdict(category=Category.logo_wordmark, logo_slot="wordmark", confidence=0.7)))
    result = eng.classify(img)
    assert result.category is Category.logo_mark
    assert result.needs_review


def test_r5_agreement_boosts_confidence(prepared):
    img = prepared("logo_mark.png")
    eng = hybrid_with(parse_response(verdict(confidence=0.7)))
    result = eng.classify(img)
    # heuristic also says logo_mark (0.8) -> max + 0.05
    assert result.category is Category.logo_mark
    assert result.confidence >= 0.85
    assert result.needs_review is False


def test_r6_strong_heuristic_weak_claude_flags_review(prepared):
    img = prepared("palette.png")  # heuristic: palette @ 0.9
    eng = hybrid_with(parse_response(verdict(category=Category.illustration, logo_slot=None, confidence=0.5)))
    result = eng.classify(img)
    assert result.category is Category.illustration  # claude wins semantics
    assert result.needs_review
    assert any("R6" in r for r in result.review_reasons)


def test_r7_slot_sanity(prepared):
    img = prepared("logo_mark.png")  # square-ish
    eng = hybrid_with(parse_response(verdict(category=Category.logo_lockup, logo_slot="horizontal", confidence=0.9)))
    result = eng.classify(img)
    assert result.logo_slot != "horizontal"
    assert any("R7" in r for r in result.review_reasons)


def test_r8_claude_error_falls_back_to_heuristic(prepared):
    img = prepared("palette.png")
    eng = hybrid_with(RuntimeError("api down"))
    result = eng.classify(img)
    assert result.category is Category.palette  # heuristic verdict
    assert result.engine == "hybrid"
    assert result.needs_review
    assert any("claude unavailable" in r for r in result.review_reasons)
