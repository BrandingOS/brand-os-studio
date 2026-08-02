"""Zero-shot CLIP engine (optional extra: `uv sync --extra local`).

open_clip ViT-B-32 (laion2b_s34b_b79k): no training needed, ~150 MB, fast on
CPU/MPS. Confidence is a softmax over class prompt-ensemble similarities —
relative, not calibrated. RGBA images are composited on BOTH white and dark
backgrounds and the embeddings averaged, so white-on-transparent logos don't
vanish.
"""
from __future__ import annotations

from typing import Optional

from .. import mapping
from ..schema import Category, ClassificationResult
from .base import PreparedImage

INSTALL_HINT = "Install the local engine with: uv sync --extra local"

PROMPTS: dict[Category, list[str]] = {
    Category.logo_lockup: [
        "a company logo with an icon and the brand name together",
        "a brand logo lockup, symbol plus wordmark",
        "a corporate logo with text and a symbol on a plain background",
    ],
    Category.logo_wordmark: [
        "a brand name written as a stylized wordmark logo",
        "a logotype, the company name as styled text only",
        "a text-only brand logo on a plain background",
    ],
    Category.logo_mark: [
        "a minimalist logo icon symbol on a plain background",
        "an app icon",
        "a brand monogram or emblem without text",
    ],
    Category.photo: [
        "a photograph of a real scene",
        "a photo taken with a camera",
        "a portrait or landscape photograph",
    ],
    Category.palette: [
        "a color palette with flat color swatches",
        "brand color scheme chips in a row",
        "a set of flat colored rectangles showing a color palette",
    ],
    Category.font_specimen: [
        "a typography specimen sheet showing alphabet letters",
        "a font sample sheet with Aa and a pangram",
        "a typeface showcase with rows of letters in different weights",
    ],
    Category.illustration: [
        "a digital illustration or drawing",
        "flat vector illustration artwork",
        "a cartoon style drawing",
    ],
    Category.pattern: [
        "a seamless repeating decorative pattern",
        "a tiled wallpaper pattern",
        "a repeating geometric texture",
    ],
    Category.document: [
        "a screenshot of a document or webpage",
        "a scanned page with paragraphs of text",
        "a presentation slide with text",
    ],
    Category.mockup: [
        "a logo printed on a business card mockup",
        "brand design shown on a t-shirt or product mockup",
        "a phone screen mockup showing an app design",
    ],
    Category.other: [
        "an abstract unclassifiable image",
    ],
}


class LocalClipEngine:
    name = "local"

    def __init__(self, model_name: str = "ViT-B-32", pretrained: str = "laion2b_s34b_b79k"):
        self.model_name = model_name
        self.pretrained = pretrained
        self._loaded = None  # (model, preprocess, tokenizer, text_features, cats)

    @property
    def available(self) -> bool:
        try:
            import open_clip  # noqa: F401
            import torch  # noqa: F401

            return True
        except ImportError:
            return False

    def embed(self, pil) -> "object":
        """Normalized CLIP embedding of an RGBA image, averaged over white and
        dark background composites (so white logos don't vanish). This is the
        shared feature path for both zero-shot and the trained custom head."""
        import torch
        from PIL import Image

        model, preprocess, _text_features, _cats = self._load()
        device = self._device()

        embeds = []
        for bg_color in ((255, 255, 255, 255), (24, 24, 28, 255)):
            bg = Image.new("RGBA", pil.size, bg_color)
            composed = Image.alpha_composite(bg, pil).convert("RGB")
            tensor = preprocess(composed).unsqueeze(0).to(device)
            with torch.no_grad():
                feat = model.encode_image(tensor)
            embeds.append(feat / feat.norm(dim=-1, keepdim=True))
        image_features = torch.mean(torch.stack(embeds), dim=0)
        return image_features / image_features.norm(dim=-1, keepdim=True)

    def _device(self) -> str:
        import torch

        return "mps" if torch.backends.mps.is_available() else "cpu"

    def classify(self, img: PreparedImage) -> ClassificationResult:
        model, preprocess, text_features, cats = self._load()
        image_features = self.embed(img.pil)

        sims = (100.0 * image_features @ text_features.T).softmax(dim=-1).squeeze(0)
        best = int(sims.argmax().item())
        category = cats[best]
        confidence = round(float(sims[best].item()), 4)

        slot = mapping.default_slot(category, img.signals)
        return ClassificationResult(
            category=category,
            confidence=confidence,
            placement=mapping.placement_for(category),
            is_logo=mapping.is_logo_category(category),
            logo_slot=slot,
            reasoning=f"CLIP zero-shot: top class '{category.value}' at softmax {confidence:.2f} "
            "(relative confidence, not calibrated).",
            signals=img.signals,
            engine=self.name,
            model=f"open_clip/{self.model_name}/{self.pretrained}",
            needs_review=confidence < 0.5,
            review_reasons=(["low CLIP softmax margin"] if confidence < 0.5 else []),
        )

    def _load(self):
        if self._loaded is not None:
            return self._loaded
        import open_clip
        import torch

        device = self._device()
        model, _, preprocess = open_clip.create_model_and_transforms(
            self.model_name, pretrained=self.pretrained
        )
        model.eval()
        model.to(device)
        tokenizer = open_clip.get_tokenizer(self.model_name)

        cats = list(PROMPTS.keys())
        feats = []
        with torch.no_grad():
            for cat in cats:
                tokens = tokenizer(PROMPTS[cat]).to(device)
                emb = model.encode_text(tokens)
                emb = emb / emb.norm(dim=-1, keepdim=True)
                feats.append(emb.mean(dim=0))
        text_features = torch.stack(feats)
        text_features = text_features / text_features.norm(dim=-1, keepdim=True)

        self._loaded = (model, preprocess, text_features, cats)
        return self._loaded
