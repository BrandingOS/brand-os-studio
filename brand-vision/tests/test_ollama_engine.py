from __future__ import annotations

import json

from brand_vision.engines.claude import ClaudeEngine
from brand_vision.engines.heuristic import HeuristicEngine
from brand_vision.engines.hybrid import HybridEngine
from brand_vision.engines.ollama_vlm import OllamaEngine
from brand_vision.schema import Category

from .test_claude_engine import verdict


def transport_returning(v):
    def _transport(path, payload):
        assert path == "/api/chat"
        return {"message": {"content": v.model_dump_json()}}

    return _transport


def test_happy_path(prepared):
    eng = OllamaEngine(transport=transport_returning(verdict()))
    result = eng.classify(prepared("logo_mark.png"))
    assert result.category is Category.logo_mark
    assert result.engine == "ollama"
    assert result.model.startswith("ollama/")
    assert result.placement == "logos"


def test_sends_schema_and_image(prepared):
    calls = []

    def transport(path, payload):
        calls.append(payload)
        return {"message": {"content": verdict().model_dump_json()}}

    OllamaEngine(transport=transport).classify(prepared("logo_mark.png"))
    payload = calls[0]
    assert payload["format"]["properties"]["category"]  # JSON schema enforced
    assert payload["messages"][1]["images"]             # image attached
    assert "transparency_ratio" in payload["messages"][1]["content"]


def test_garbage_output_retries_then_falls_back(prepared):
    calls = []

    def transport(path, payload):
        calls.append(1)
        return {"message": {"content": "not json at all"}}

    result = OllamaEngine(transport=transport).classify(prepared("logo_mark.png"))
    assert len(calls) == 2
    assert result.category is Category.other
    assert result.needs_review


def test_transport_error_falls_back(prepared):
    def transport(path, payload):
        raise ConnectionError("ollama down")

    result = OllamaEngine(transport=transport).classify(prepared("logo_mark.png"))
    assert result.category is Category.other
    assert result.needs_review


def test_hybrid_uses_ollama_when_claude_unavailable(prepared, monkeypatch):
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    claude = ClaudeEngine(client=None)
    assert claude.available is False

    ollama = OllamaEngine(transport=transport_returning(verdict(confidence=0.9)))
    hybrid = HybridEngine(claude=claude, heuristic=HeuristicEngine(), fallback_vision=ollama)
    assert hybrid.available is True

    result = hybrid.classify(prepared("logo_mark.png"))
    assert result.engine == "hybrid"
    assert result.category is Category.logo_mark
    # R5 agreement boost with the heuristic
    assert result.confidence >= 0.9
