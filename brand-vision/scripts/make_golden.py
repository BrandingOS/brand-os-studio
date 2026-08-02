"""Build dataset/golden.json — a trusted, held-out evaluation set.

Golden images are REAL web images whose label survived double confirmation
(model agreed, or Qwen arbitration kept/relabeled them). They are excluded
from training by train_custom.py and reported as a separate accuracy — a
regression metric that can't be flattered by memorizing the training data.

Stratified: up to PER_CLASS images per category, seeded, stable across
runs (only grows when a class was under-filled and new data arrives).

Run:  uv run python scripts/make_golden.py
"""
from __future__ import annotations

import json
import sys
from collections import defaultdict
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parents[1] / "src"))

ROOT = Path(__file__).parents[1]
LABELS_FILE = ROOT / "dataset" / "images" / "labels.json"
GOLDEN_FILE = ROOT / "dataset" / "golden.json"

SEED = 1337
PER_CLASS = 25
TRUSTED_SOURCES = {"teacher", "arbitrated-kept", "arbitrated-model"}


def main() -> int:
    labels = json.loads(LABELS_FILE.read_text())
    existing = set(json.loads(GOLDEN_FILE.read_text())) if GOLDEN_FILE.exists() else set()
    # Keep prior members that still exist — a golden set must stay stable.
    golden = {rel for rel in existing if rel in labels}

    by_class: dict[str, list[str]] = defaultdict(list)
    for rel, m in labels.items():
        if isinstance(m, dict) and m.get("source") in TRUSTED_SOURCES and rel not in golden:
            by_class[m["category"]].append(rel)

    rng = np.random.default_rng(SEED)
    filled = defaultdict(int)
    for rel in golden:
        filled[labels[rel]["category"]] += 1
    for cls, rels in sorted(by_class.items()):
        need = PER_CLASS - filled[cls]
        if need <= 0:
            continue
        rels = sorted(rels)
        rng.shuffle(rels)
        golden.update(rels[:need])

    GOLDEN_FILE.write_text(json.dumps(sorted(golden), indent=1))
    counts = defaultdict(int)
    for rel in golden:
        counts[labels[rel]["category"]] += 1
    print(f"golden set: {len(golden)} images")
    for cls, n in sorted(counts.items()):
        print(f"  {cls:15s} {n}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
