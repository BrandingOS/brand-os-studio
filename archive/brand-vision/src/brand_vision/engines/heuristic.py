"""Deterministic decision tree over measured signals.

Ordered rules, first match wins, fixed confidences — fully golden-assertable.
The heuristic never claims `mockup` (that requires visual context); it returns
photo/other at low confidence and lets the claude/hybrid engines handle it.
"""
from __future__ import annotations

from .. import mapping
from ..schema import Category, ClassificationResult
from .base import PreparedImage


class HeuristicEngine:
    name = "heuristic"

    @property
    def available(self) -> bool:
        return True

    def classify(self, img: PreparedImage) -> ClassificationResult:
        s = img.signals
        category, confidence, reason = self._decide(img)
        slot = mapping.default_slot(category, s)
        return ClassificationResult(
            category=category,
            confidence=confidence,
            placement=mapping.placement_for(category),
            is_logo=mapping.is_logo_category(category),
            logo_slot=slot,
            reasoning=reason,
            signals=s,
            engine=self.name,
            needs_review=confidence < 0.6,
            review_reasons=(["low heuristic confidence"] if confidence < 0.6 else []),
        )

    def _decide(self, img: PreparedImage) -> tuple[Category, float, str]:
        s = img.signals

        # 1. SVG structure is the strongest evidence available.
        if s.is_vector:
            has_shapes = (s.svg_path_count or 0) > 0
            if s.svg_has_text and not has_shapes:
                return (
                    Category.logo_wordmark,
                    0.9,
                    "SVG containing only text elements — a wordmark.",
                )
            if s.svg_has_text and has_shapes:
                return (
                    Category.logo_lockup,
                    0.85,
                    "SVG with both text and shape elements — icon + name lockup.",
                )
            if has_shapes and 0.7 <= s.aspect_ratio <= 1.4 and not s.contains_text_guess:
                return (
                    Category.logo_mark,
                    0.85,
                    "Square-ish vector shapes with no text — an icon mark.",
                )
            if has_shapes:
                # Wide/tall vector, text may be outlined into paths.
                if s.aspect_ratio > 2.2:
                    return (
                        Category.logo_wordmark if s.text_band_count <= 2 else Category.logo_lockup,
                        0.7,
                        "Wide vector artwork — likely a wordmark or horizontal lockup.",
                    )
                return (Category.logo_lockup, 0.7, "Vector artwork — treated as a logo lockup.")

        # 2. Palette: dominated by large flat blocks, few colors, few edges.
        if s.flat_region_share > 0.8 and s.unique_colors <= 24 and s.edge_density < 0.06 and not s.has_transparency:
            return (
                Category.palette,
                0.9,
                "Large flat color blocks with very few colors and edges — a palette sheet.",
            )

        # 3. Font specimen: many regular text bands on a near-monochrome sheet.
        # Tiling guard: a repeating pattern also produces regular "bands".
        if (
            s.text_band_count >= 4
            and s.text_band_score >= 0.55
            and len(s.dominant_colors) <= 3
            and not s.has_transparency
            and s.tiling_score < 0.9
        ):
            return (
                Category.font_specimen,
                0.75,
                "Multiple regular rows of text on a plain sheet — a type specimen.",
            )

        # 4. Transparency + limited palette => logo family.
        if s.transparency_ratio > 0.05 and s.unique_colors < 64:
            if s.aspect_ratio > 2.5:
                if s.contains_text_guess or s.text_band_count >= 1:
                    return (
                        Category.logo_wordmark,
                        0.8,
                        "Wide transparent artwork with text — a wordmark.",
                    )
                return (
                    Category.logo_lockup,
                    0.75,
                    "Wide transparent artwork — a horizontal lockup.",
                )
            if s.aspect_ratio <= 1.35 and s.text_band_score < 0.4:
                return (
                    Category.logo_mark,
                    0.8,
                    "Square-ish transparent artwork with few colors — an icon mark.",
                )
            return (
                Category.logo_lockup,
                0.75,
                "Transparent artwork with a limited palette — a logo lockup.",
            )

        # 5. Pattern: strong self-similarity under translation.
        if s.tiling_score > 0.85 and s.unique_colors > 4:
            return (Category.pattern, 0.8, "Image repeats under translation — a tiling pattern.")

        # 6. Photo vs illustration.
        if s.unique_colors > 4000 and s.entropy > 6.5:
            return (Category.photo, 0.85, "Thousands of colors and high entropy — a photograph.")
        if s.unique_colors > 1500 and s.entropy > 6.0 and s.flat_region_share < 0.4:
            return (Category.photo, 0.7, "Rich continuous tones — likely a photograph.")
        if 24 < s.unique_colors <= 1500 and s.flat_region_share > 0.35 and s.edge_density > 0.03:
            return (
                Category.illustration,
                0.6,
                "Moderate palette with flat fills and crisp edges — an illustration.",
            )

        # 7. Document: light background, several text bands, screen/paper aspect.
        if (
            s.text_band_count >= 3
            and s.flat_region_share > 0.5
            and 0.5 <= s.aspect_ratio <= 2.0
            and not s.has_transparency
        ):
            return (
                Category.document,
                0.65,
                "Text rows on a flat background — a document or screenshot.",
            )

        # 8. Opaque but logo-named file with few colors.
        if s.filename_hint in ("logo", "mark", "icon", "wordmark", "horizontal", "vertical") and s.unique_colors < 200:
            cat = {
                "wordmark": Category.logo_wordmark,
                "mark": Category.logo_mark,
                "icon": Category.logo_mark,
            }.get(s.filename_hint or "", Category.logo_lockup)
            return (cat, 0.6, f"Filename suggests a logo ('{s.filename_hint}') and the palette is limited.")

        return (Category.other, 0.3, "No deterministic rule matched.")
