"""Bilingual (EN/AR) color naming.

Given any hex, return the nearest named color — so a palette verdict can say
"Burgundy / نبيتي" instead of "#7B1E2B". Matching runs in CIE-ish weighted
RGB+HSL space against a curated anchor list that covers the names designers
actually use (including the Arabic ones that have no literal English twin,
like نبيتي and كشمير).
"""
from __future__ import annotations

import colorsys

# (hex, english, arabic)
ANCHORS: list[tuple[str, str, str]] = [
    ("#000000", "Black", "أسود"),
    ("#1A1A1A", "Ink", "أسود فحمي"),
    ("#36454F", "Charcoal", "فحمي"),
    ("#555555", "Dark Grey", "رمادي غامق"),
    ("#808080", "Grey", "رمادي"),
    ("#B0B0B0", "Silver", "فضي"),
    ("#D3D3D3", "Light Grey", "رمادي فاتح"),
    ("#F5F5F0", "Off White", "أبيض مطفي"),
    ("#FFFFFF", "White", "أبيض"),
    ("#F5F5DC", "Beige", "بيج"),
    ("#EDE8D0", "Cream", "كريمي"),
    ("#F7E7CE", "Champagne", "شمبين"),
    ("#D2B48C", "Tan", "بني فاتح"),
    ("#C19A6B", "Camel", "جملي"),
    ("#A0785A", "Caramel", "كراميل"),
    ("#8B5E3C", "Brown", "بني"),
    ("#5C4033", "Chocolate", "شوكولاتة"),
    ("#3D2B1F", "Espresso", "بني غامق"),
    ("#800020", "Burgundy", "نبيتي"),
    ("#722F37", "Wine", "خمري"),
    ("#8B0000", "Dark Red", "أحمر غامق"),
    ("#C41E3A", "Crimson", "قرمزي"),
    ("#FF0000", "Red", "أحمر"),
    ("#E34234", "Vermilion", "أحمر ناري"),
    ("#FA8072", "Salmon", "سلموني"),
    ("#FF7F50", "Coral", "مرجاني"),
    ("#FF8C00", "Orange", "برتقالي"),
    ("#E2725B", "Terracotta", "طوبي"),
    ("#CC7722", "Ochre", "أصفر أرضي"),
    ("#FFBF00", "Amber", "عنبري"),
    ("#FFD700", "Gold", "ذهبي"),
    ("#FFFF00", "Yellow", "أصفر"),
    ("#FFFACD", "Lemon", "ليموني"),
    ("#F0E68C", "Khaki", "كاكي"),
    ("#808000", "Olive", "زيتوني"),
    ("#9ACD32", "Lime", "أخضر ليموني"),
    ("#7CB342", "Grass", "أخضر عشبي"),
    ("#228B22", "Green", "أخضر"),
    ("#006400", "Dark Green", "أخضر غامق"),
    ("#2E8B57", "Emerald", "زمردي"),
    ("#98FF98", "Mint", "نعناعي"),
    ("#0D5C63", "Pine", "أخضر صنوبري"),
    ("#008080", "Teal", "بترولي"),
    ("#40E0D0", "Turquoise", "تركوازي"),
    ("#00FFFF", "Cyan", "سماوي مشبع"),
    ("#87CEEB", "Sky Blue", "سماوي"),
    ("#B0E0E6", "Powder Blue", "لبني"),
    ("#4682B4", "Steel Blue", "أزرق صلب"),
    ("#0000FF", "Blue", "أزرق"),
    ("#1E5ADC", "Royal Blue", "أزرق ملكي"),
    ("#000080", "Navy", "كحلي"),
    ("#191970", "Midnight Blue", "أزرق ليلي"),
    ("#6A5ACD", "Indigo", "نيلي"),
    ("#8A2BE2", "Violet", "بنفسجي مشبع"),
    ("#800080", "Purple", "أرجواني"),
    ("#9B7CB6", "Lavender", "لافندر"),
    ("#E6E6FA", "Lilac", "ليلكي"),
    ("#C8A2C8", "Mauve", "موف"),
    ("#FF00FF", "Magenta", "فوشيا مشبع"),
    ("#FF1493", "Fuchsia", "فوشيا"),
    ("#FFC0CB", "Pink", "وردي"),
    ("#FFB6C1", "Rose", "وردي فاتح"),
    ("#E8B4B8", "Blush", "وردي ترابي"),
    ("#D4A5A5", "Dusty Rose", "وردي مطفي"),
    ("#F4C2C2", "Baby Pink", "بمبي"),
    ("#DEA5A4", "Cashmere", "كشمير"),
]

_RGB = [
    (int(h[1:3], 16), int(h[3:5], 16), int(h[5:7], 16))
    for h, _, _ in ANCHORS
]


def _dist(a: tuple[int, int, int], b: tuple[int, int, int]) -> float:
    """Weighted RGB distance (redmean approximation of perceptual distance)."""
    rmean = (a[0] + b[0]) / 2
    dr, dg, db = a[0] - b[0], a[1] - b[1], a[2] - b[2]
    return (
        (2 + rmean / 256) * dr * dr
        + 4 * dg * dg
        + (2 + (255 - rmean) / 256) * db * db
    ) ** 0.5


def name_color(hex_str: str) -> dict:
    """{'hex', 'en', 'ar'} for the nearest anchor. Unparseable hex → greys."""
    v = hex_str.lstrip("#")
    if len(v) == 3:
        v = "".join(c * 2 for c in v)
    try:
        rgb = (int(v[0:2], 16), int(v[2:4], 16), int(v[4:6], 16))
    except (ValueError, IndexError):
        return {"hex": hex_str, "en": "Unknown", "ar": "غير معروف"}

    # Saturation guard: a clearly chromatic color must not land on a grey
    # anchor just because it's dark, and vice versa.
    h, l, s = colorsys.rgb_to_hls(*(c / 255 for c in rgb))
    best_i, best_d = 0, float("inf")
    for i, anchor in enumerate(_RGB):
        ah, al, asat = colorsys.rgb_to_hls(*(c / 255 for c in anchor))
        d = _dist(rgb, anchor)
        if (s > 0.25) != (asat > 0.25):
            d *= 2.2  # cross-family match is a last resort
        if d < best_d:
            best_d, best_i = d, i
    _, en, ar = ANCHORS[best_i]
    return {"hex": f"#{v.upper()}", "en": en, "ar": ar}


def name_colors(hexes: list[str]) -> list[dict]:
    return [name_color(h) for h in hexes]
