"""Local vision-LLM engine via Ollama (free, fully offline).

Same contract and prompt as the Claude engine, but the verdict comes from a
local model (default: qwen2.5vl:7b) served by Ollama at localhost:11434.
Structured output is enforced with Ollama's JSON-schema `format` parameter.
"""
from __future__ import annotations

import base64
import io
import json
import os
import urllib.error
import urllib.request
from typing import Optional

from PIL import Image

from .. import mapping
from ..schema import Category, ClassificationResult
from .base import PreparedImage
from .claude import SYSTEM_PROMPT, ClaudeVerdict

DEFAULT_URL = "http://localhost:11434"
DEFAULT_MODEL = "qwen2.5vl:7b"

INSTALL_HINT = (
    "Install Ollama (brew install ollama), run `ollama serve`, "
    f"then `ollama pull {DEFAULT_MODEL}`."
)


class OllamaEngine:
    name = "ollama"

    def __init__(self, base_url: Optional[str] = None, model: Optional[str] = None, transport=None):
        self.base_url = (base_url or os.environ.get("BRAND_VISION_OLLAMA_URL") or DEFAULT_URL).rstrip("/")
        self.model = model or os.environ.get("BRAND_VISION_OLLAMA_MODEL") or DEFAULT_MODEL
        self._transport = transport  # injectable for tests

    @property
    def available(self) -> bool:
        if self._transport is not None:
            return True
        try:
            with urllib.request.urlopen(f"{self.base_url}/api/tags", timeout=2) as resp:
                tags = json.loads(resp.read().decode())
            base = self.model.split(":")[0]
            return any(m.get("name", "").startswith(base) for m in tags.get("models", []))
        except Exception:
            return False

    def classify(self, img: PreparedImage) -> ClassificationResult:
        try:
            verdict = self._call(img)
        except Exception as exc:
            return self._fallback(img, f"Ollama engine error: {type(exc).__name__}: {exc}")
        if verdict is None:
            return self._fallback(img, "Ollama returned no parseable verdict.")

        slot = verdict.logo_slot
        if mapping.is_logo_category(verdict.category) and slot is None:
            slot = mapping.default_slot(verdict.category, img.signals)
        if not mapping.is_logo_category(verdict.category):
            slot = None

        return ClassificationResult(
            category=verdict.category,
            confidence=verdict.confidence,
            placement=mapping.placement_for(verdict.category),
            is_logo=mapping.is_logo_category(verdict.category),
            logo_slot=slot,
            reasoning=verdict.reasoning,
            signals=img.signals,
            engine=self.name,
            model=f"ollama/{self.model}",
            needs_review=verdict.confidence < 0.6,
            review_reasons=(["low model confidence"] if verdict.confidence < 0.6 else []),
        )

    # -------------------------------------------------------------- internals

    def _call(self, img: PreparedImage) -> Optional[ClaudeVerdict]:
        payload = {
            "model": self.model,
            "stream": False,
            "format": ClaudeVerdict.model_json_schema(),
            # num_predict caps runaway generations; brevity comes from the prompt.
            "options": {"temperature": 0, "num_predict": 400},
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": self._evidence_block(img)
                    + "\nKeep reasoning to ONE short sentence.",
                    "images": [self._image_b64(img)],
                },
            ],
        }
        for _attempt in (1, 2):
            body = self._post("/api/chat", payload)
            content = (body.get("message") or {}).get("content") or ""
            try:
                return ClaudeVerdict.model_validate_json(content)
            except Exception:
                continue
        return None

    def _image_b64(self, img: PreparedImage, max_edge: int | None = None) -> str:
        """Local models pay heavily per vision token — 768px is plenty for
        classification and roughly quarters the prefill cost vs 1536px."""
        if max_edge is None:
            max_edge = int(os.environ.get("BRAND_VISION_OLLAMA_MAX_EDGE", "768"))
        pil = img.pil
        if max(pil.size) > max_edge:
            scale = max_edge / max(pil.size)
            pil = pil.resize(
                (max(1, round(pil.width * scale)), max(1, round(pil.height * scale))),
                Image.LANCZOS,
            )
            buf = io.BytesIO()
            pil.save(buf, format="PNG")
            return base64.b64encode(buf.getvalue()).decode()
        return base64.b64encode(img.png_bytes).decode()

    def _post(self, path: str, payload: dict) -> dict:
        if self._transport is not None:
            return self._transport(path, payload)
        req = urllib.request.Request(
            f"{self.base_url}{path}",
            data=json.dumps(payload).encode(),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=180) as resp:
            return json.loads(resp.read().decode())

    def _evidence_block(self, img: PreparedImage) -> str:
        s = img.signals
        facts = {
            "filename": img.filename,
            "width": s.width,
            "height": s.height,
            "aspect_ratio": s.aspect_ratio,
            "transparency_ratio": s.transparency_ratio,
            "unique_colors": s.unique_colors,
            "dominant_colors": s.dominant_colors,
            "is_vector_source": s.is_vector,
            "svg_has_text_elements": s.svg_has_text,
            "text_band_count": s.text_band_count,
            "tiling_score": s.tiling_score,
        }
        return (
            "Classify this image. Measured facts about the original file "
            "(trust these over what the preview seems to show):\n"
            + json.dumps(facts, ensure_ascii=False)
        )

    def _fallback(self, img: PreparedImage, reason: str) -> ClassificationResult:
        return ClassificationResult(
            category=Category.other,
            confidence=0.0,
            placement=mapping.placement_for(Category.other),
            is_logo=False,
            logo_slot=None,
            reasoning=reason,
            signals=img.signals,
            engine=self.name,
            model=f"ollama/{self.model}",
            needs_review=True,
            review_reasons=[reason],
        )
