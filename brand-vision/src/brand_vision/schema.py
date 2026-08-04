"""Wire contract for the brand-vision classifier.

This schema is the frozen contract between the classifier service and the
BrandOS site. `LogoSlot` mirrors the onboarding-v4 union in
`src/features/onboarding-v4/types.ts` exactly; `Placement` mirrors the
sections of the UploadsReviewPanel.
"""
from __future__ import annotations

from enum import Enum
from typing import Literal, Optional

from pydantic import BaseModel, Field


class Category(str, Enum):
    logo_lockup = "logo_lockup"        # icon + brand name combined
    logo_wordmark = "logo_wordmark"    # stylized brand NAME text only
    logo_mark = "logo_mark"            # icon / symbol / monogram only
    photo = "photo"
    palette = "palette"                # flat color swatches image
    font_specimen = "font_specimen"    # typeface showcase (Aa, alphabets, pangrams)
    illustration = "illustration"
    pattern = "pattern"                # repeating decorative tile
    document = "document"              # screenshot / scan / slide / webpage
    mockup = "mockup"                  # brand applied to an object/context
    other = "other"


Placement = Literal["logos", "images", "colors", "fonts", "files"]

# Exactly the onboarding-v4 LogoSlot union.
LogoSlot = Literal["primary", "light", "dark", "mark", "horizontal", "vertical", "wordmark"]

EngineName = Literal["heuristic", "local", "ollama", "claude", "hybrid"]


class Signals(BaseModel):
    """Deterministic, measured facts about the image. Computed once per upload."""

    width: int
    height: int
    aspect_ratio: float                     # width / height
    has_transparency: bool
    transparency_ratio: float               # 0..1 share of pixels with alpha < 200
    unique_colors: int                      # quantized count on a 128px downscale
    dominant_colors: list[str]              # hex strings, chromatic-first
    edge_density: float                     # 0..1
    entropy: float                          # grayscale histogram entropy (0..8)
    flat_region_share: float                # 0..1, share covered by large flat blocks
    text_band_score: float                  # 0..1, periodic horizontal ink bands
    text_band_count: int                    # number of detected ink bands
    tiling_score: float                     # 0..1, autocorrelation tiling evidence
    is_vector: bool
    svg_has_text: Optional[bool] = None     # SVG only
    svg_path_count: Optional[int] = None    # SVG only
    contains_text_guess: bool
    filename_hint: Optional[str] = None     # logo|wordmark|mark|icon|horizontal|vertical|dark|light
    # Bilingual names for dominant_colors, index-aligned: [{hex, en, ar}].
    dominant_color_names: list[dict] = Field(default_factory=list)
    # OCR layout facts (filled by engines that run text detection).
    ocr_text: Optional[str] = None          # recognized text, reading order
    ocr_conf: float = 0.0                   # mean region confidence
    ocr_script: Optional[str] = None        # arabic | latin | mixed
    ocr_text_area: float = 0.0              # text-box union / image area
    ocr_icon_mass: float = 0.0              # ink outside text boxes / image
    ocr_icon_extent: float = 0.0            # bbox of that ink / image


class StyleTag(BaseModel):
    """A design-vocabulary label ("minimalist", "arabic-kufi", "art-deco"…)."""

    tag: str
    label: str                              # human-readable, e.g. "Kufi (Arabic)"
    confidence: float = Field(ge=0.0, le=1.0)


class ClassificationResult(BaseModel):
    category: Category
    confidence: float = Field(ge=0.0, le=1.0)
    placement: Placement
    is_logo: bool
    logo_slot: Optional[LogoSlot] = None
    # Design-style vocabulary (multi-label, best-first). Empty when the
    # engine has no style model or nothing clears the threshold.
    style_tags: list[StyleTag] = Field(default_factory=list)
    # Brand name (or other text) read off the artwork, when OCR ran.
    detected_text: Optional[str] = None
    reasoning: str
    signals: Signals
    engine: str
    model: Optional[str] = None
    latency_ms: int = 0
    needs_review: bool = False
    review_reasons: list[str] = Field(default_factory=list)


class EngineInfo(BaseModel):
    name: str
    available: bool
    model: Optional[str] = None
    hint: Optional[str] = None


class BatchItemResult(BaseModel):
    filename: str
    ok: bool
    result: Optional[ClassificationResult] = None
    results: Optional[dict[str, ClassificationResult]] = None  # engine="all"
    error: Optional[str] = None
