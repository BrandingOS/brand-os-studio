"""Visual feeding: fetch real-world logos & design images from the web.

Two sources:
  1. DuckDuckGo image search — style-name queries (EN + AR). The query itself
     becomes a weak style tag stored in dataset/web_meta.json.
  2. Wikimedia Commons API — real (incl. Arabic) logo files.

Downloads land in dataset/unlabeled/ with slugged names; the existing teacher
labeling pipeline (build_dataset.py label) assigns the final category. Style
tags survive in web_meta.json for the future style head.

Run:  uv run python scripts/fetch_web.py --per-query 40
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).parents[1]
UNLABELED = ROOT / "dataset" / "unlabeled"
META_FILE = ROOT / "dataset" / "web_meta.json"

# query -> (slug, style_tag, expected_category_hint)
QUERIES: list[tuple[str, str, str]] = [
    # English logo styles
    ("minimalist logo design", "min", "minimalist"),
    ("vintage retro logo", "vintage", "vintage"),
    ("mascot logo esports", "mascot", "mascot"),
    ("emblem badge logo", "emblem", "emblem"),
    ("geometric logo mark", "geo", "geometric"),
    ("abstract logo symbol", "abstract", "abstract"),
    ("monogram letter logo", "monogram", "monogram"),
    ("lettermark logo design", "lettermark", "lettermark"),
    ("negative space logo", "negspace", "negative-space"),
    ("hand drawn organic logo", "handdrawn", "hand-drawn"),
    ("luxury brand logo gold", "luxury", "luxury"),
    ("gradient modern logo", "gradient", "gradient"),
    ("flat minimal brand logo", "flat", "flat"),
    ("wordmark logo typography", "wordmarkq", "wordmark"),
    ("tech startup logo", "tech", "tech"),
    ("3d glossy logo design", "3d", "3d"),
    ("animal logo mark", "animal", "animal"),
    ("heraldic crest shield logo", "crest", "crest"),
    ("signature script logo", "script", "script"),
    ("sports team logo", "sports", "sports"),
    ("restaurant food logo", "food", "food"),
    ("gaming esports logo", "gaming", "gaming"),
    ("line art logo minimal", "lineart", "line-art"),
    ("circular badge round logo", "roundbadge", "round-badge"),
    ("law firm serif logo", "corporate", "corporate"),
    ("beauty fashion brand logo", "fashion", "fashion"),
    ("real estate logo building", "realestate", "real-estate"),
    # Arabic logo styles
    ("شعار عربي احترافي", "ar_pro", "arabic"),
    ("شعارات شركات عربية", "ar_co", "arabic"),
    ("شعار خط عربي كاليجرافي", "ar_calli", "calligraphy"),
    ("تصميم شعار عربي مودرن", "ar_modern", "arabic-modern"),
    ("شعار مطعم عربي", "ar_rest", "arabic"),
    ("هوية بصرية شعار عربي", "ar_ident", "arabic"),
    # Broader design material (feeds the non-logo classes)
    ("brand color palette design", "dpalette", "palette-design"),
    ("typography specimen poster", "dtype", "type-specimen"),
    ("seamless pattern design", "dpattern", "pattern-design"),
    ("business card mockup", "dmockup", "mockup"),
    ("brand guidelines page", "dguide", "brand-guidelines"),
    ("flat illustration design", "dillu", "illustration"),
    # ── Design-vocabulary round: typography styles ──
    ("serif font specimen sheet", "t_serif", "type-serif"),
    ("sans serif font specimen", "t_sans", "type-sans"),
    ("slab serif typeface sample", "t_slab", "type-slab"),
    ("script calligraphy font sample", "t_script", "type-script"),
    ("monospace font specimen", "t_mono", "type-mono"),
    ("display font poster type", "t_display", "type-display"),
    ("خط الثلث لوحة خطية", "t_thuluth", "type-arabic-thuluth"),
    ("الخط الكوفي تصميم", "t_kufi", "type-arabic-kufi"),
    ("خط النسخ نموذج", "t_naskh", "type-arabic-naskh"),
    ("الخط الديواني لوحة", "t_diwani", "type-arabic-diwani"),
    ("خط الرقعة نموذج كتابة", "t_ruqaa", "type-arabic-ruqaa"),
    ("arabic modern font specimen", "t_armodern", "type-arabic-modern"),
    # ── pattern styles ──
    ("islamic geometric pattern", "p_islamic", "pattern-islamic"),
    ("arabesque ornament pattern", "p_arabesque", "pattern-arabesque"),
    ("mandala pattern design", "p_mandala", "pattern-mandala"),
    ("memphis style pattern", "p_memphis", "pattern-memphis"),
    ("art deco pattern gold", "p_artdeco", "pattern-artdeco"),
    ("japanese seigaiha wave pattern", "p_wave", "pattern-wave"),
    # ── palette moods ──
    ("pastel color palette", "c_pastel", "palette-pastel"),
    ("earth tones color palette", "c_earth", "palette-earth"),
    ("neon color palette", "c_neon", "palette-neon"),
    ("monochrome color palette", "c_monochrome", "palette-monochrome"),
    ("vintage retro color palette", "c_retro", "palette-retro"),
    # ── brand applications ──
    ("letterhead stationery design", "a_letterhead", "app-letterhead"),
    ("brand packaging box design", "a_packaging", "app-packaging"),
    ("poster design typography", "a_poster", "app-poster"),
    ("social media post design template", "a_social", "app-social"),
    ("icon set line icons", "a_icons", "app-iconset"),
    ("infographic design chart", "a_infographic", "app-infographic"),
    ("app UI screenshot design", "a_ui", "app-ui"),
]


def fetch_ddg(per_query: int) -> int:
    from ddgs import DDGS

    UNLABELED.mkdir(parents=True, exist_ok=True)
    meta = json.loads(META_FILE.read_text()) if META_FILE.exists() else {}
    seen_hashes = set(m.get("sha1") for m in meta.values())
    total = 0

    for query, slug, tag in QUERIES:
        try:
            with DDGS() as ddgs:
                results = list(ddgs.images(query, max_results=per_query, safesearch="moderate"))
        except Exception as exc:
            print(f"!! search '{query}': {exc}", file=sys.stderr)
            continue
        got = 0
        for j, r in enumerate(results):
            url = r.get("image")
            if not url:
                continue
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (brand-vision-dataset)"})
                with urllib.request.urlopen(req, timeout=15) as resp:
                    data = resp.read(8 * 1024 * 1024)
            except Exception:
                continue
            if len(data) < 4000:  # skip tracking pixels / broken
                continue
            sha = hashlib.sha1(data).hexdigest()
            if sha in seen_hashes:
                continue
            seen_hashes.add(sha)
            ext = ".png" if data[:8].startswith(b"\x89PNG") else ".jpg"
            name = f"web_{slug}_{j:03d}{ext}"
            (UNLABELED / name).write_bytes(data)
            meta[name] = {"query": query, "style_tag": tag, "sha1": sha, "source": "ddg"}
            got += 1
            total += 1
        print(f"  {slug:10s} '{query}': +{got}", flush=True)
        META_FILE.write_text(json.dumps(meta, indent=1, ensure_ascii=False))
        time.sleep(2)  # be polite between queries
    return total


def fetch_commons(limit: int) -> int:
    """Wikimedia Commons search for real logo files (incl. Arabic 'شعار')."""
    UNLABELED.mkdir(parents=True, exist_ok=True)
    meta = json.loads(META_FILE.read_text()) if META_FILE.exists() else {}
    seen_hashes = set(m.get("sha1") for m in meta.values())
    total = 0
    searches = [("logo svg company", "wm_en"), ("شعار", "wm_ar")]
    for term, slug in searches:
        params = urllib.parse.urlencode({
            "action": "query", "format": "json", "generator": "search",
            "gsrsearch": f"filetype:bitmap|drawing {term}", "gsrnamespace": 6,
            "gsrlimit": limit, "prop": "imageinfo", "iiprop": "url|size",
            "iiurlwidth": 800,
        })
        try:
            req = urllib.request.Request(
                f"https://commons.wikimedia.org/w/api.php?{params}",
                headers={"User-Agent": "brand-vision-dataset/0.1 (internal training)"},
            )
            with urllib.request.urlopen(req, timeout=30) as resp:
                pages = json.loads(resp.read().decode()).get("query", {}).get("pages", {})
        except Exception as exc:
            print(f"!! commons '{term}': {exc}", file=sys.stderr)
            continue
        got = 0
        for j, page in enumerate(pages.values()):
            infos = page.get("imageinfo") or []
            if not infos:
                continue
            url = infos[0].get("thumburl") or infos[0].get("url")
            if not url:
                continue
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "brand-vision-dataset/0.1"})
                with urllib.request.urlopen(req, timeout=20) as resp:
                    data = resp.read(8 * 1024 * 1024)
            except Exception:
                continue
            if len(data) < 4000:
                continue
            sha = hashlib.sha1(data).hexdigest()
            if sha in seen_hashes:
                continue
            seen_hashes.add(sha)
            ext = ".png" if data[:8].startswith(b"\x89PNG") else ".jpg"
            name = f"{slug}_{j:03d}{ext}"
            (UNLABELED / name).write_bytes(data)
            meta[name] = {"query": term, "style_tag": "commons", "sha1": sha, "source": "wikimedia"}
            got += 1
            total += 1
        print(f"  {slug}: +{got} from Commons ('{term}')", flush=True)
        META_FILE.write_text(json.dumps(meta, indent=1, ensure_ascii=False))
    return total


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--per-query", type=int, default=40)
    parser.add_argument("--commons-limit", type=int, default=50)
    args = parser.parse_args()
    n1 = fetch_ddg(args.per_query)
    n2 = fetch_commons(args.commons_limit)
    print(f"web feeding done: +{n1} search images, +{n2} commons images")
