"""Weak-label web-fetched images: search-query style tag => category prior,
heuristic signals as junk filter. Fast path used instead of the slow local VLM;
Qwen verification remains an optional offline cleanup pass.

Run:  uv run python scripts/weak_label_web.py
"""
from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parents[1] / "src"))
sys.path.insert(0, str(Path(__file__).parent))

from brand_vision.engines.heuristic import HeuristicEngine  # noqa: E402
from brand_vision.preprocess import prepare_image  # noqa: E402
from brand_vision.schema import Category  # noqa: E402

from build_dataset import IMAGES, QUARANTINE, UNLABELED, load_labels, register, save_labels  # noqa: E402

META = Path(__file__).parents[1] / "dataset" / "web_meta.json"

DESIGN_MAP = {
    "palette-design": "palette",
    "type-specimen": "font_specimen",
    "pattern-design": "pattern",
    "mockup": "mockup",
    "illustration": "illustration",
    "brand-guidelines": "document",
    # Typography styles are all font specimens; Arabic calligraphy sheets too.
    "type-serif": "font_specimen",
    "type-sans": "font_specimen",
    "type-slab": "font_specimen",
    "type-script": "font_specimen",
    "type-mono": "font_specimen",
    "type-display": "font_specimen",
    "type-arabic-thuluth": "font_specimen",
    "type-arabic-kufi": "font_specimen",
    "type-arabic-naskh": "font_specimen",
    "type-arabic-diwani": "font_specimen",
    "type-arabic-ruqaa": "font_specimen",
    "type-arabic-modern": "font_specimen",
    # Pattern styles.
    "pattern-islamic": "pattern",
    "pattern-arabesque": "pattern",
    "pattern-mandala": "pattern",
    "pattern-memphis": "pattern",
    "pattern-artdeco": "pattern",
    "pattern-wave": "pattern",
    # Palette moods.
    "palette-pastel": "palette",
    "palette-earth": "palette",
    "palette-neon": "palette",
    "palette-monochrome": "palette",
    "palette-retro": "palette",
    # Brand applications: printed/applied surfaces read as mockups; screens
    # and layouts read as documents; icon sets are illustrations of marks —
    # the style tag preserves the precise name either way.
    "app-letterhead": "mockup",
    "app-packaging": "mockup",
    "app-poster": "document",
    "app-social": "document",
    "app-iconset": "illustration",
    "app-infographic": "document",
    "app-ui": "document",
}
LOGO = {Category.logo_lockup, Category.logo_wordmark, Category.logo_mark}


def main() -> int:
    meta = json.loads(META.read_text()) if META.exists() else {}
    labels = load_labels()
    eng = HeuristicEngine()
    QUARANTINE.mkdir(parents=True, exist_ok=True)

    done = junk = 0
    for path in sorted(UNLABELED.iterdir()):
        if not (path.name.startswith("web_") or path.name.startswith("wm_")):
            continue
        tag = (meta.get(path.name) or {}).get("style_tag", "")
        try:
            img = prepare_image(path.read_bytes(), path.name)
            r = eng.classify(img)
            s = img.signals
        except Exception:
            shutil.move(str(path), QUARANTINE / path.name)
            junk += 1
            continue

        if tag in DESIGN_MAP:
            cat, conf = DESIGN_MAP[tag], 0.6
            if r.category is Category.photo and r.confidence >= 0.8 and tag != "mockup":
                shutil.move(str(path), QUARANTINE / path.name)
                junk += 1
                continue
        else:
            if r.category in (Category.photo, Category.document) and r.confidence >= 0.65:
                shutil.move(str(path), QUARANTINE / path.name)
                junk += 1
                continue
            if r.category in LOGO:
                cat, conf = r.category.value, min(r.confidence, 0.65)
            else:
                ar = s.aspect_ratio
                if ar >= 2.2:
                    cat = "logo_wordmark" if s.contains_text_guess else "logo_lockup"
                elif 0.7 <= ar <= 1.4:
                    cat = "logo_mark"
                else:
                    cat = "logo_lockup"
                conf = 0.55
        rel = f"{cat}/{path.name}"
        (IMAGES / cat).mkdir(parents=True, exist_ok=True)
        shutil.move(str(path), IMAGES / rel)
        register(labels, rel, cat, "teacher", confidence=conf,
                 teacher=f"web-weak:{tag}" if tag else "web-weak")
        done += 1

    save_labels(labels)
    print(f"weak-labeled {done}, quarantined {junk}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
