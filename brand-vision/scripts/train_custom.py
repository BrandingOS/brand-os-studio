"""Train the custom brand-vision classifier (v1: CLIP linear probe).

Pipeline:
  1. Load dataset/images/labels.json (5k+ labeled images).
  2. Embed every image with the SAME feature path the runtime engine uses
     (CLIP ViT-B-32, white+dark composite average) — cached to disk.
  3. Stratified train/val split (85/15, seeded).
  4. Train a linear head with class weights + label smoothing.
  5. Report val accuracy, per-class recall, confusion matrix.
  6. Save weights + metadata to models/custom_v1.npz / .json.

Run:  uv run python scripts/train_custom.py [--epochs 300] [--relabel-embed]
"""
from __future__ import annotations

import argparse
import io
import json
import sys
import time
from collections import Counter, defaultdict
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parents[1] / "src"))

ROOT = Path(__file__).parents[1]
IMAGES = ROOT / "dataset" / "images"
LABELS_FILE = IMAGES / "labels.json"
GOLDEN_FILE = ROOT / "dataset" / "golden.json"
MODELS = ROOT / "models"
EMBED_CACHE = MODELS / "embeddings_v1.npz"

SEED = 42


def load_image_rgba(path: Path):
    from PIL import Image

    data = path.read_bytes()
    if path.suffix.lower() == ".svg":
        import cairosvg

        png = cairosvg.svg2png(bytestring=data, output_width=512)
        return Image.open(io.BytesIO(png)).convert("RGBA")
    img = Image.open(io.BytesIO(data))
    img.load()
    rgba = img.convert("RGBA")
    if max(rgba.size) > 512:
        s = 512 / max(rgba.size)
        rgba = rgba.resize((max(1, round(rgba.width * s)), max(1, round(rgba.height * s))))
    return rgba


def build_embeddings(labels: dict, force: bool = False):
    """Embed all labeled images; cache as npz keyed by relative path."""
    from brand_vision.engines.local_clip import LocalClipEngine

    cache = {}
    if EMBED_CACHE.exists() and not force:
        loaded = np.load(EMBED_CACHE, allow_pickle=True)
        cache = {k: loaded[k] for k in loaded.files}
        print(f"embedding cache: {len(cache)} entries")

    engine = LocalClipEngine()
    todo = [rel for rel in labels if rel not in cache and (IMAGES / rel).exists()]
    print(f"embedding {len(todo)} new images…")
    start = time.time()
    for i, rel in enumerate(todo):
        try:
            pil = load_image_rgba(IMAGES / rel)
            feat = engine.embed(pil).squeeze(0).cpu().numpy().astype(np.float32)
            cache[rel] = feat
        except Exception as exc:
            print(f"!! {rel}: {exc}", file=sys.stderr)
        if (i + 1) % 250 == 0:
            rate = (i + 1) / (time.time() - start)
            print(f"  {i + 1}/{len(todo)}  ({rate:.1f} img/s, eta {int((len(todo) - i - 1) / rate)}s)", flush=True)
    MODELS.mkdir(exist_ok=True)
    np.savez_compressed(EMBED_CACHE, **cache)
    print(f"embeddings ready: {len(cache)} total")
    return cache


def load_golden() -> set[str]:
    """Held-out trusted set — never trained on, reported separately."""
    if not GOLDEN_FILE.exists():
        return set()
    return set(json.loads(GOLDEN_FILE.read_text()))


def stratified_split(labels: dict, cache: dict, exclude: set[str] = frozenset()):
    rng = np.random.default_rng(SEED)
    by_class: dict[str, list[str]] = defaultdict(list)
    for rel, entry in labels.items():
        if rel in cache and rel not in exclude:
            by_class[entry["category"]].append(rel)
    train, val = [], []
    for cls, rels in sorted(by_class.items()):
        rels = sorted(rels)
        rng.shuffle(rels)
        n_val = max(1, int(len(rels) * 0.15))
        val.extend((r, cls) for r in rels[:n_val])
        train.extend((r, cls) for r in rels[n_val:])
    rng.shuffle(train)
    return train, val


def train(args) -> int:
    import torch

    labels = json.loads(LABELS_FILE.read_text())
    cache = build_embeddings(labels, force=args.relabel_embed)
    golden = load_golden()
    train_set, val_set = stratified_split(labels, cache, exclude=golden)
    classes = sorted({cls for _, cls in train_set})
    cls_idx = {c: i for i, c in enumerate(classes)}
    print(f"train {len(train_set)} / val {len(val_set)} / golden {len(golden)} "
          f"/ classes {len(classes)}")

    def to_tensors(pairs):
        X = np.stack([cache[r] for r, _ in pairs])
        y = np.array([cls_idx[c] for _, c in pairs], dtype=np.int64)
        return torch.from_numpy(X), torch.from_numpy(y)

    Xtr, ytr = to_tensors(train_set)
    Xva, yva = to_tensors(val_set)

    counts = Counter(c for _, c in train_set)
    weights = torch.tensor(
        [len(train_set) / (len(classes) * counts[c]) for c in classes], dtype=torch.float32
    )

    torch.manual_seed(SEED)
    head = torch.nn.Sequential(
        torch.nn.Linear(Xtr.shape[1], 256),
        torch.nn.ReLU(),
        torch.nn.Dropout(0.2),
        torch.nn.Linear(256, len(classes)),
    )
    opt = torch.optim.AdamW(head.parameters(), lr=3e-3, weight_decay=1e-4)
    loss_fn = torch.nn.CrossEntropyLoss(weight=weights, label_smoothing=0.05)

    best_acc, best_state = 0.0, None
    for epoch in range(args.epochs):
        head.train()
        opt.zero_grad()
        loss = loss_fn(head(Xtr), ytr)
        loss.backward()
        opt.step()
        if (epoch + 1) % 20 == 0 or epoch == args.epochs - 1:
            head.eval()
            with torch.no_grad():
                acc = (head(Xva).argmax(1) == yva).float().mean().item()
            if acc > best_acc:
                best_acc = acc
                best_state = {k: v.clone() for k, v in head.state_dict().items()}
            print(f"epoch {epoch + 1:4d}  loss {loss.item():.4f}  val acc {acc:.4f}")

    head.load_state_dict(best_state)
    head.eval()

    # ---- temperature calibration on the val set (honest confidences)
    with torch.no_grad():
        raw_logits = head(Xva)
    best_T, best_nll = 1.0, float("inf")
    nll_fn = torch.nn.CrossEntropyLoss()
    for T in np.arange(0.5, 5.01, 0.1):
        nll = nll_fn(raw_logits / float(T), yva).item()
        if nll < best_nll:
            best_nll, best_T = nll, float(T)
    print(f"calibrated temperature: {best_T:.1f}")

    # ---- final evaluation
    with torch.no_grad():
        logits = head(Xva)
        preds = logits.argmax(1)
    acc = (preds == yva).float().mean().item()
    confusion: dict[str, Counter] = defaultdict(Counter)
    for p, t in zip(preds.tolist(), yva.tolist()):
        confusion[classes[t]][classes[p]] += 1

    print(f"\n=== custom v1 — val accuracy {acc:.1%} ({len(val_set)} held-out images)")
    per_class = {}
    for cls in classes:
        total = sum(confusion[cls].values())
        hit = confusion[cls][cls]
        per_class[cls] = {"recall": round(hit / total, 4) if total else 0, "support": total}
        print(f"  {cls:15s} recall {hit}/{total} = {hit / total:.0%}")
    print("\nconfusion (actual \\ predicted):")
    header = " " * 16 + "".join(c[:9].rjust(10) for c in classes)
    print(header)
    for actual in classes:
        row = actual[:14].ljust(16)
        for pred_cls in classes:
            n = confusion[actual][pred_cls]
            row += (str(n) if n else "·").rjust(10)
        print(row)

    # ---- golden holdout (trusted, never trained on)
    golden_acc = None
    golden_pairs = [
        (r, labels[r]["category"]) for r in sorted(golden)
        if r in cache and r in labels
    ]
    if golden_pairs:
        Xg, yg = to_tensors(golden_pairs)
        with torch.no_grad():
            golden_acc = (head(Xg).argmax(1) == yg).float().mean().item()
        print(f"\n=== golden holdout — {golden_acc:.1%} ({len(golden_pairs)} images)")

    # ---- save (MLP head: two layers)
    MODELS.mkdir(exist_ok=True)
    np.savez(
        MODELS / "custom_v1.npz",
        arch="mlp",
        W1=head[0].weight.detach().numpy().astype(np.float32),
        b1=head[0].bias.detach().numpy().astype(np.float32),
        W2=head[3].weight.detach().numpy().astype(np.float32),
        b2=head[3].bias.detach().numpy().astype(np.float32),
        classes=np.array(classes),
        T=np.float32(best_T),
    )
    meta = {
        "version": 2,
        "arch": "mlp-256",
        "temperature": round(best_T, 2),
        "backbone": "open_clip/ViT-B-32/laion2b_s34b_b79k",
        "feature_path": "white+dark composite average, L2-normalized",
        "classes": classes,
        "val_accuracy": round(acc, 4),
        "golden_accuracy": round(golden_acc, 4) if golden_acc is not None else None,
        "per_class": per_class,
        "train_size": len(train_set),
        "val_size": len(val_set),
        "seed": SEED,
    }
    (MODELS / "custom_v1.json").write_text(json.dumps(meta, indent=1))
    print(f"\nsaved: models/custom_v1.npz + custom_v1.json (val acc {acc:.1%})")
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--epochs", type=int, default=400)
    parser.add_argument("--relabel-embed", action="store_true")
    raise SystemExit(train(parser.parse_args()))
