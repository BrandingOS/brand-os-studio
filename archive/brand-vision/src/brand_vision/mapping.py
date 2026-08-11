"""Single source of truth: category -> placement / onboarding fields / logo slot.

Mirrors `OnboardingAsset` in `src/features/onboarding-v4/types.ts` and the
filename regexes of `inferSlot` in `panels/LogoSlots.tsx`.

Slot color convention (documented at SetUpScreen.tsx:180): the onboarding
"dark" slot holds the LIGHT-colored artwork (meant FOR dark backgrounds), and
"light" holds the dark/black artwork.
"""
from __future__ import annotations

import re
from typing import Optional

from .schema import Category, LogoSlot, Placement, Signals

# category -> (placement, onboarding AssetKind, is_logo)
_CATEGORY_TABLE: dict[Category, tuple[Placement, str, bool]] = {
    Category.logo_lockup: ("logos", "image", True),
    Category.logo_wordmark: ("logos", "image", True),
    Category.logo_mark: ("logos", "image", True),
    Category.photo: ("images", "image", False),
    Category.illustration: ("images", "image", False),
    Category.pattern: ("images", "image", False),
    Category.mockup: ("images", "image", False),
    Category.palette: ("colors", "color", False),
    Category.font_specimen: ("fonts", "font", False),
    Category.document: ("files", "file", False),
    Category.other: ("files", "file", False),
}

# v3 LogoRole vocabulary (src/shared/types/brandAssets.ts) for future integration.
_SLOT_TO_LOGO_ROLE: dict[str, str] = {
    "primary": "primary",
    "wordmark": "wordmark",
    "mark": "iconmark",
    "horizontal": "horizontal",
    "vertical": "stacked",
    "light": "mono.black",  # onboarding "light" slot = dark artwork for light bg
    "dark": "mono.white",   # onboarding "dark" slot = light artwork for dark bg
}

# Ported from LogoSlots.tsx inferSlot + assetUpload.ts LOGO_FILENAME.
# Order matters: "wordmark" must be tested before "mark".
_FILENAME_SLOT_PATTERNS: list[tuple[str, LogoSlot]] = [
    (r"(wordmark|logotype)", "wordmark"),
    (r"(icon|(?<!word)mark|symbol|monogram|glyph|favicon)", "mark"),
    (r"(horizontal|landscape|wide)", "horizontal"),
    (r"(vertical|stacked|portrait)", "vertical"),
    (r"(dark|night|inverse|inverted|white|on-dark)", "dark"),
    (r"(light|day|black|on-light|on-white)", "light"),
]


def placement_for(category: Category) -> Placement:
    return _CATEGORY_TABLE[category][0]


def asset_kind_for(category: Category) -> str:
    return _CATEGORY_TABLE[category][1]


def is_logo_category(category: Category) -> bool:
    return _CATEGORY_TABLE[category][2]


def filename_slot_hint(filename: str) -> Optional[LogoSlot]:
    stem = filename.rsplit(".", 1)[0].lower()
    for pattern, slot in _FILENAME_SLOT_PATTERNS:
        if re.search(pattern, stem):
            return slot
    return None


def default_slot(category: Category, signals: Signals) -> Optional[LogoSlot]:
    """Aspect/filename based slot suggestion for logo categories."""
    if not is_logo_category(category):
        return None

    # Measured color wins over filename: white artwork on transparency belongs
    # in the on-dark slot regardless of shape (the onboarding "dark" slot holds
    # the light-colored variant — see SetUpScreen.tsx:180).
    if signals.transparency_ratio > 0.05 and _is_white_artwork(signals):
        return "dark"

    hint = filename_slot_hint_from_signals(signals)
    if hint is not None:
        # A wordmark category always keeps the wordmark slot even if the
        # filename says otherwise about orientation.
        if category is Category.logo_wordmark and hint in ("horizontal", "vertical"):
            return "wordmark"
        return hint

    if category is Category.logo_wordmark:
        return "wordmark"

    if category is Category.logo_mark:
        return "mark"

    # Lockup: orientation from aspect ratio.
    ar = signals.aspect_ratio
    if ar >= 1.9:
        return "horizontal"
    if ar <= 0.75:
        return "vertical"
    return "primary"


def filename_slot_hint_from_signals(signals: Signals) -> Optional[LogoSlot]:
    hint = signals.filename_hint
    if hint is None:
        return None
    mapping: dict[str, LogoSlot] = {
        "mark": "mark",
        "icon": "mark",
        "horizontal": "horizontal",
        "vertical": "vertical",
        "wordmark": "wordmark",
        "dark": "dark",
        "light": "light",
    }
    return mapping.get(hint)


def to_logo_role(slot: Optional[LogoSlot]) -> Optional[str]:
    if slot is None:
        return None
    return _SLOT_TO_LOGO_ROLE.get(slot)


def _is_white_artwork(signals: Signals) -> bool:
    """True when the visible (non-transparent) artwork is white/near-white."""
    if not signals.dominant_colors:
        return False
    top = signals.dominant_colors[0].lstrip("#")
    if len(top) != 6:
        return False
    r, g, b = (int(top[i : i + 2], 16) for i in (0, 2, 4))
    return r > 230 and g > 230 and b > 230
