"""Clean the weak web labels by disagreement arbitration.

The 4.4k "teacher" (web weak-labeled) images cap the model's accuracy: the
model learns from a teacher that is sometimes wrong. Reviewing all of them
with a VLM would take days — so we only arbitrate DISAGREEMENTS:

  1. Predict every teacher image with the custom head (instant — cached
     embeddings), keep cases where prediction != stored label.
  2. Send only those to Qwen (Ollama) as arbiter.
  3. Apply verdicts:  qwen == model  → relabel to the model's category
                      qwen == label  → keep the stored label
                      three-way split → quarantine (drop from training)

Agreement cases (~85%+) are left untouched — when two independent systems
agree, the label is almost certainly right.

Run:  uv run python scripts/verify_labels.py            # arbitrate + apply
      uv run python scripts/verify_labels.py --dry-run  # count disagreements only
      uv run python scripts/verify_labels.py --limit 50 # partial pass (resumable)
"""
from __future__ import annotations

import argparse
import json
import shutil
import sys
from collections import Counter
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parents[1] / "src"))

ROOT = Path(__file__).parents[1]
IMAGES = ROOT / "dataset" / "images"
LABELS_FILE = IMAGES / "labels.json"
QUARANTINE = ROOT / "dataset" / "quarantine"
EMBED_CACHE = ROOT / "models" / "embeddings_v1.npz"
HEAD = ROOT / "models" / "custom_v1.npz"
PROGRESS_FILE = ROOT / "dataset" / "verify_progress.json"

SUSPECT_SOURCES = {"teacher"}
MIN_MODEL_CONF = 0.50   # weaker predictions aren't evidence against the label


def predict_all(rels: list[str]) -> dict[str, tuple[str, float]]:
    """Custom-head predictions from cached embeddings — no image I/O."""
    cache = np.load(EMBED_CACHE, allow_pickle=True)
    data = np.load(HEAD, allow_pickle=True)
    W1, b1, W2, b2 = data["W1"], data["b1"], data["W2"], data["b2"]
    T = float(data["T"]) if "T" in data.files else 1.0
    classes = [str(c) for c in data["classes"]]
    out: dict[str, tuple[str, float]] = {}
    for rel in rels:
        if rel not in cache.files:
            continue
        feat = cache[rel]
        logits = (W2 @ np.maximum(0.0, W1 @ feat + b1) + b2) / T
        exp = np.exp(logits - logits.max())
        probs = exp / exp.sum()
        best = int(probs.argmax())
        out[rel] = (classes[best], float(probs[best]))
    return out


_qwen = None


def qwen_category(rel: str):
    """Ask the local VLM for its independent verdict. None on failure."""
    global _qwen
    from brand_vision.engines.ollama_vlm import OllamaEngine
    from brand_vision.preprocess import prepare_image

    if _qwen is None:
        _qwen = OllamaEngine()
    try:
        path = IMAGES / rel
        prepared = prepare_image(path.read_bytes(), path.name)
        return _qwen.classify(prepared).category.value
    except Exception as exc:
        print(f"    qwen failed on {rel}: {exc}")
        return None


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--limit", type=int, default=0, help="max arbitrations this run")
    args = ap.parse_args()

    labels = json.loads(LABELS_FILE.read_text())
    suspects = [
        rel for rel, m in labels.items()
        if isinstance(m, dict) and m.get("source") in SUSPECT_SOURCES
    ]
    print(f"suspect (weak) labels: {len(suspects)} of {len(labels)}")

    preds = predict_all(suspects)
    disagreements = [
        (rel, labels[rel]["category"], cat, conf)
        for rel, (cat, conf) in preds.items()
        if cat != labels[rel]["category"] and conf >= MIN_MODEL_CONF
    ]
    agree = len(preds) - len(disagreements)
    print(f"model agrees with label: {agree}/{len(preds)} "
          f"({agree / max(1, len(preds)):.0%}) — arbitrating {len(disagreements)}")
    if args.dry_run:
        pairs = Counter((lab, cat) for _, lab, cat, _ in disagreements)
        for (lab, cat), n in pairs.most_common(15):
            print(f"  {n:4d}  label={lab:14s} model says {cat}")
        return 0

    done: dict[str, str] = (
        json.loads(PROGRESS_FILE.read_text()) if PROGRESS_FILE.exists() else {}
    )
    QUARANTINE.mkdir(parents=True, exist_ok=True)
    counts = Counter()
    todo = [d for d in disagreements if d[0] not in done]
    if args.limit:
        todo = todo[: args.limit]
    print(f"arbitrating {len(todo)} (resuming past {len(done)})")

    for i, (rel, label_cat, model_cat, conf) in enumerate(todo, 1):
        verdict = qwen_category(rel)
        done[rel] = verdict or "error"
        if verdict == model_cat:
            labels[rel]["category"] = model_cat
            labels[rel]["source"] = "arbitrated-model"
            counts["relabeled"] += 1
        elif verdict == label_cat:
            labels[rel]["source"] = "arbitrated-kept"
            counts["kept"] += 1
        elif verdict is None:
            counts["error"] += 1
        else:
            src = IMAGES / rel
            if src.exists():
                dest = QUARANTINE / rel.replace("/", "__")
                shutil.move(str(src), str(dest))
            labels.pop(rel, None)
            counts["quarantined"] += 1
        if i % 10 == 0 or i == len(todo):
            print(f"  {i}/{len(todo)}  {dict(counts)}", flush=True)
            LABELS_FILE.write_text(json.dumps(labels, indent=1))
            PROGRESS_FILE.write_text(json.dumps(done, indent=1))

    LABELS_FILE.write_text(json.dumps(labels, indent=1))
    PROGRESS_FILE.write_text(json.dumps(done, indent=1))
    print(f"\ndone: {dict(counts)}")
    print("next: uv run python scripts/train_custom.py  (embeddings cached — fast)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
