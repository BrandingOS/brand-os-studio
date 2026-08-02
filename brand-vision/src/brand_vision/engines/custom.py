"""Our own trained classifier (v1): CLIP features + trained linear head.

Trained by scripts/train_custom.py on the collected dataset. Fully local and
free — the head is an 11×512 matrix loaded from models/custom_v1.npz, applied
on top of the exact same embedding path the CLIP engine uses.
"""
from __future__ import annotations

from pathlib import Path
from typing import Optional

import numpy as np

from .. import logolayout, mapping, textdetect
from ..schema import Category, ClassificationResult, StyleTag
from ..styles import display_label
from .base import PreparedImage
from .local_clip import LocalClipEngine

WEIGHTS = Path(__file__).parents[3] / "models" / "custom_v1.npz"
META = Path(__file__).parents[3] / "models" / "custom_v1.json"
STYLE_WEIGHTS = Path(__file__).parents[3] / "models" / "style_v1.npz"

STYLE_THRESHOLD = 0.35
STYLE_MAX_TAGS = 3

TRAIN_HINT = "Train it first: uv run python scripts/train_custom.py"


class CustomEngine:
    name = "custom"

    def __init__(self, clip: Optional[LocalClipEngine] = None, weights_path: Path = WEIGHTS):
        self.clip = clip or LocalClipEngine()
        self.weights_path = weights_path
        self._head = None        # (forward, classes, T)
        self._style_head = None  # (forward, tags) or False when absent
        self._style_dim = None   # input dim the style head expects

    @property
    def available(self) -> bool:
        return self.weights_path.exists() and self.clip.available

    @property
    def model(self) -> str:
        return "custom_v1 (CLIP ViT-B-32 + trained head)"

    def classify(self, img: PreparedImage) -> ClassificationResult:
        forward, classes, T = self._load()
        feat = self.clip.embed(img.pil).squeeze(0).cpu().numpy().astype(np.float32)
        logits = forward(feat) / T
        exp = np.exp(logits - logits.max())
        probs = exp / exp.sum()
        best = int(probs.argmax())
        category = Category(classes[best])
        confidence = round(float(probs[best]), 4)

        top2 = np.argsort(probs)[::-1][:2]
        margin = float(probs[top2[0]] - probs[top2[1]])

        # Layout evidence: OCR-based lockup/wordmark/mark disambiguation.
        detected_text = None
        layout_note = None
        if logolayout.should_analyze(category, confidence, img.signals):
            try:
                layout = textdetect.analyze(img.pil)
            except Exception:
                layout = None  # OCR is advisory — never let it sink a classify
            category, confidence, layout_note = logolayout.refine(
                category, confidence, layout, img.signals
            )
            if layout is not None and layout.ok:
                img.signals.ocr_text = layout.text or None
                img.signals.ocr_conf = round(layout.mean_conf, 3)
                img.signals.ocr_script = layout.script
                img.signals.ocr_text_area = round(layout.text_area_ratio, 3)
                img.signals.ocr_icon_mass = round(layout.icon_mass_ratio, 3)
                if layout.has_text and layout.mean_conf >= 0.45:
                    detected_text = layout.text

        slot = mapping.default_slot(category, img.signals)
        style_tags = self._styles_for(feat)
        # A layout override means measured evidence broke the tie — the CLIP
        # margin no longer reflects the actual uncertainty.
        needs_review = confidence < 0.6 or (margin < 0.15 and layout_note is None)
        reasons = []
        if needs_review:
            runner_up = Category(classes[int(top2[1])])
            reasons.append(
                f"close call vs {runner_up.value} ({probs[top2[1]]:.2f})"
                if margin < 0.15
                else "low confidence"
            )
        style_note = (
            " Style: " + ", ".join(t.label for t in style_tags) + "." if style_tags else ""
        )
        extra_note = f" {layout_note}." if layout_note else ""
        return ClassificationResult(
            category=category,
            confidence=confidence,
            placement=mapping.placement_for(category),
            is_logo=mapping.is_logo_category(category),
            logo_slot=slot,
            style_tags=style_tags,
            detected_text=detected_text,
            reasoning=f"Trained classifier: {category.value} at {confidence:.0%} "
            f"(margin {margin:.2f} over runner-up).{extra_note}{style_note}",
            signals=img.signals,
            engine=self.name,
            model=self.model,
            needs_review=needs_review,
            review_reasons=reasons,
        )

    def _styles_for(self, feat: np.ndarray) -> list[StyleTag]:
        """Design-vocabulary tags from the multi-label style head (sigmoid)."""
        head = self._load_style_head()
        if head is None:
            return []
        forward, tags = head
        if self._style_dim is not None and feat.shape[-1] != self._style_dim:
            return []  # foreign embedding (e.g. test doubles) — head doesn't apply
        logits = forward(feat)
        probs = 1.0 / (1.0 + np.exp(-logits))
        ranked = np.argsort(probs)[::-1][:STYLE_MAX_TAGS]
        return [
            StyleTag(tag=tags[i], label=display_label(tags[i]), confidence=round(float(probs[i]), 3))
            for i in ranked
            if probs[i] >= STYLE_THRESHOLD
        ]

    def _load_style_head(self):
        if self._style_head is False:
            return None
        if self._style_head is None:
            if not STYLE_WEIGHTS.exists():
                self._style_head = False
                return None
            data = np.load(STYLE_WEIGHTS, allow_pickle=True)
            W1, b1, W2, b2 = data["W1"], data["b1"], data["W2"], data["b2"]
            tags = [str(t) for t in data["tags"]]
            self._style_dim = int(W1.shape[1])

            def forward(feat, W1=W1, b1=b1, W2=W2, b2=b2):
                h = np.maximum(0.0, W1 @ feat + b1)
                return W2 @ h + b2

            self._style_head = (forward, tags)
        return self._style_head

    def _load(self):
        if self._head is None:
            data = np.load(self.weights_path, allow_pickle=True)
            T = float(data["T"]) if "T" in data.files else 1.0
            classes = [str(c) for c in data["classes"]]
            if "W1" in data.files:  # MLP head (v2+)
                W1, b1, W2, b2 = data["W1"], data["b1"], data["W2"], data["b2"]

                def forward(feat, W1=W1, b1=b1, W2=W2, b2=b2):
                    h = np.maximum(0.0, W1 @ feat + b1)
                    return W2 @ h + b2

            else:  # linear head (v1)
                W, b = data["W"], data["b"]

                def forward(feat, W=W, b=b):
                    return W @ feat + b

            self._head = (forward, classes, T)
        return self._head
