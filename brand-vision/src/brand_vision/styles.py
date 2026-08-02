"""Design-style vocabulary the machine can name.

Each tag maps a weak-supervision source label (the web-search query that
fetched the image) to a human-readable design term. The style head is
multi-label: a logo can be both "geometric" and "minimalist".
"""
from __future__ import annotations

# tag -> display label
STYLE_LABELS: dict[str, str] = {
    # Logo styles
    "minimalist": "Minimalist",
    "vintage": "Vintage / Retro",
    "mascot": "Mascot",
    "emblem": "Emblem / Badge",
    "geometric": "Geometric",
    "abstract": "Abstract",
    "monogram": "Monogram",
    "lettermark": "Lettermark",
    "negative-space": "Negative Space",
    "hand-drawn": "Hand-drawn",
    "luxury": "Luxury",
    "gradient": "Gradient",
    "flat": "Flat",
    "wordmark": "Wordmark style",
    "tech": "Tech / Startup",
    "3d": "3D / Glossy",
    "animal": "Animal Mark",
    "crest": "Crest / Heraldic",
    "script": "Script / Signature",
    "sports": "Sports",
    "food": "Food / Restaurant",
    "gaming": "Gaming / Esports",
    "line-art": "Line Art",
    "round-badge": "Round Badge",
    "corporate": "Corporate",
    "fashion": "Fashion / Beauty",
    "real-estate": "Real Estate",
    "arabic": "Arabic",
    "arabic-modern": "Arabic Modern",
    "calligraphy": "Calligraphy / خط عربي",
    "illustration": "Illustrative",
    # Typography styles
    "type-serif": "Serif",
    "type-sans": "Sans-serif",
    "type-slab": "Slab Serif",
    "type-script": "Script Type",
    "type-mono": "Monospace",
    "type-display": "Display Type",
    "type-arabic-thuluth": "Thuluth / خط الثلث",
    "type-arabic-kufi": "Kufi / الخط الكوفي",
    "type-arabic-naskh": "Naskh / خط النسخ",
    "type-arabic-diwani": "Diwani / الخط الديواني",
    "type-arabic-ruqaa": "Ruq'ah / خط الرقعة",
    "type-arabic-modern": "Modern Arabic Type",
    # Pattern styles
    "pattern-islamic": "Islamic Geometric / زخرفة هندسية",
    "pattern-arabesque": "Arabesque / أرابيسك",
    "pattern-mandala": "Mandala",
    "pattern-memphis": "Memphis",
    "pattern-artdeco": "Art Deco",
    "pattern-wave": "Wave Pattern",
    # Palette moods
    "palette-pastel": "Pastel Palette",
    "palette-earth": "Earth Tones",
    "palette-neon": "Neon Palette",
    "palette-monochrome": "Monochrome Palette",
    "palette-retro": "Retro Palette",
    # Applications
    "app-letterhead": "Letterhead",
    "app-packaging": "Packaging",
    "app-poster": "Poster",
    "app-social": "Social Post",
    "app-iconset": "Icon Set",
    "app-infographic": "Infographic",
    "app-ui": "App / UI",
}

# Source tags that describe provenance, not style — never trained on.
NON_STYLE_TAGS = {"commons", "palette-design", "type-specimen", "pattern-design",
                  "mockup", "brand-guidelines"}


def display_label(tag: str) -> str:
    return STYLE_LABELS.get(tag, tag.replace("-", " ").title())
