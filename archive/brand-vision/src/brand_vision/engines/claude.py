"""Claude vision engine — claude-opus-5 + structured outputs.

The image is sent as a base64 PNG block BEFORE a text block that carries the
filename and the measured Signals JSON, so the model grounds its verdict on
deterministic facts (critical for e.g. white-on-transparent logos, which
render invisibly on a white preview).
"""
from __future__ import annotations

import base64
import json
import os
from typing import Optional

from pydantic import BaseModel, Field

from .. import mapping
from ..config import get_settings
from ..schema import Category, ClassificationResult, LogoSlot
from .base import PreparedImage

SYSTEM_PROMPT = """\
You classify brand asset images uploaded during a brand onboarding flow. \
Return exactly one category.

Definitions:
- logo_wordmark: the brand NAME rendered as stylized text ONLY — no separate icon. \
A stylized single-letter monogram used alone is logo_mark, not logo_wordmark.
- logo_mark: an icon, symbol, or monogram ONLY, with no readable brand name.
- logo_lockup: an icon AND the brand name together in one arrangement.
- palette: an image whose subject is flat color swatches/chips/strips. \
A logo that happens to be colorful is NOT a palette.
- font_specimen: an image showcasing a typeface (alphabets, "Aa", pangrams, \
weight ladders). A brand name set as a logo is a wordmark, not a specimen.
- mockup: a logo or design shown APPLIED to a real-world or device context \
(business card, t-shirt, signage, phone screen). If the asset IS the flat \
logo file itself, choose the logo category even if it sits on a colored card.
- document: a screenshot, scan, slide, or webpage capture.
- pattern: a repeating decorative tile.
- photo: a photograph whose subject is not a brand asset.
- illustration: drawn/painted artwork that is not a logo.
- other: only when nothing else fits.

Edge rules:
- If the measured transparency ratio is high, the file is almost certainly a \
logo variant (photos are never transparent).
- If the brand name is readable in the artwork, prefer logo_wordmark or \
logo_lockup over logo_mark.
- For logo categories also pick logo_slot: horizontal (wide lockup), vertical \
(stacked lockup), wordmark, mark, primary (default lockup), dark (white/light \
artwork intended FOR dark backgrounds), light (black/dark artwork FOR light \
backgrounds).
- Set confidence honestly; below 0.6 means a human should review the result.\
"""


class ClaudeVerdict(BaseModel):
    category: Category
    confidence: float = Field(ge=0.0, le=1.0)
    logo_slot: Optional[LogoSlot] = None
    contains_brand_name_text: bool
    contains_icon_symbol: bool
    reasoning: str


class ClaudeEngine:
    name = "claude"

    def __init__(self, client=None, model: Optional[str] = None):
        self._client = client
        self.model = model or get_settings().claude_model

    @property
    def available(self) -> bool:
        return self._client is not None or bool(os.environ.get("ANTHROPIC_API_KEY"))

    @property
    def client(self):
        if self._client is None:
            import anthropic

            self._client = anthropic.Anthropic()
        return self._client

    def classify(self, img: PreparedImage) -> ClassificationResult:
        try:
            verdict = self._call(img)
        except Exception as exc:  # network/API failure -> structured fallback
            return self._fallback(img, f"Claude engine error: {type(exc).__name__}: {exc}")

        if verdict is None:
            return self._fallback(img, "Claude declined or returned no parseable output.")

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
            model=self.model,
            needs_review=verdict.confidence < 0.6,
            review_reasons=(["low model confidence"] if verdict.confidence < 0.6 else []),
        )

    # -------------------------------------------------------------- internals

    def _call(self, img: PreparedImage) -> Optional[ClaudeVerdict]:
        """One API call; a single app-level retry when parsing yields nothing."""
        for attempt in (1, 2):
            resp = self.client.messages.parse(
                model=self.model,
                max_tokens=2048,
                system=SYSTEM_PROMPT,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": "image/png",
                                    "data": base64.b64encode(img.png_bytes).decode(),
                                },
                            },
                            {"type": "text", "text": self._evidence_block(img)},
                        ],
                    }
                ],
                output_format=ClaudeVerdict,
            )
            if resp.stop_reason == "refusal":
                return None
            parsed = getattr(resp, "parsed_output", None)
            if parsed is not None:
                return parsed
        return None

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
            model=self.model,
            needs_review=True,
            review_reasons=[reason],
        )
