from __future__ import annotations

import os

import pytest

from brand_vision.engines.claude import ClaudeEngine, ClaudeVerdict
from brand_vision.schema import Category

from .conftest import fake_client, parse_response


def verdict(**kw) -> ClaudeVerdict:
    base = dict(
        category=Category.logo_mark,
        confidence=0.95,
        logo_slot="mark",
        contains_brand_name_text=False,
        contains_icon_symbol=True,
        reasoning="A blue ring with an orange triangle — an icon mark.",
    )
    base.update(kw)
    return ClaudeVerdict(**base)


def test_happy_path(prepared):
    engine = ClaudeEngine(client=fake_client(parse_response(verdict())), model="claude-opus-5")
    result = engine.classify(prepared("logo_mark.png"))
    assert result.category is Category.logo_mark
    assert result.placement == "logos"
    assert result.is_logo is True
    assert result.logo_slot == "mark"
    assert result.engine == "claude"
    assert result.model == "claude-opus-5"
    assert not result.needs_review


def test_image_block_precedes_text(prepared):
    client = fake_client(parse_response(verdict()))
    ClaudeEngine(client=client).classify(prepared("logo_mark.png"))
    content = client.messages.calls[0]["messages"][0]["content"]
    assert content[0]["type"] == "image"
    assert content[0]["source"]["media_type"] == "image/png"
    assert content[1]["type"] == "text"
    assert "transparency_ratio" in content[1]["text"]


def test_refusal_returns_fallback(prepared):
    engine = ClaudeEngine(client=fake_client(parse_response(None, stop_reason="refusal")))
    result = engine.classify(prepared("logo_mark.png"))
    assert result.category is Category.other
    assert result.needs_review is True
    assert result.confidence == 0.0


def test_parse_none_retries_once(prepared):
    client = fake_client(parse_response(None), parse_response(verdict()))
    result = ClaudeEngine(client=client).classify(prepared("logo_mark.png"))
    assert len(client.messages.calls) == 2
    assert result.category is Category.logo_mark


def test_api_error_returns_fallback(prepared):
    engine = ClaudeEngine(client=fake_client(RuntimeError("boom")))
    result = engine.classify(prepared("logo_mark.png"))
    assert result.category is Category.other
    assert result.needs_review is True
    assert "boom" in result.reasoning


def test_non_logo_category_clears_slot(prepared):
    engine = ClaudeEngine(client=fake_client(parse_response(verdict(category=Category.photo, logo_slot="mark"))))
    result = engine.classify(prepared("photo.png"))
    assert result.logo_slot is None
    assert result.placement == "images"


@pytest.mark.live
def test_live_logo_mark(prepared):
    if not (os.environ.get("ANTHROPIC_API_KEY") and os.environ.get("BRAND_VISION_LIVE_TESTS") == "1"):
        pytest.skip("live tests disabled")
    result = ClaudeEngine().classify(prepared("logo_mark.png"))
    assert result.category in (Category.logo_mark, Category.logo_lockup)
    assert result.confidence > 0.5
