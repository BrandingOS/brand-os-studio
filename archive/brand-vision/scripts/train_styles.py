"""Train the multi-label STYLE head (design vocabulary) on CLIP embeddings.

Weak supervision: the web-search query that fetched each image is its style
label ("mascot logo esports" → mascot). One image gets one positive tag, so
this is trained as multi-label with a single positive per sample — at
inference several tags can fire together (sigmoid, not softmax).

Reuses models/embeddings_v1.npz where possible; embeds anything missing.

Run:  uv run python scripts/train_styles.py
"""
from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parents[1] / "src"))

from brand_vision.styles import NON_STYLE_TAGS  # noqa: E402

ROOT = Path(__file__).parents[1]
DATASET = ROOT / "dataset"
IMAGES = DATASET / "images"
META_FILE = DATASET / "web_meta.json"
MODELS = ROOT / "models"
EMBED_CACHE = MODELS / "embeddings_v1.npz"

SEED = 42
MIN_SAMPLES_PER_TAG = 15


def load_embedding_cache() -> dict[str, np.ndarray]:
    if not EMBED_CACHE.exists():
        return {}
    loaded = np.load(EMBED_CACHE, allow_pickle=True)
    return {k: loaded[k] for k in loaded.files}


def find_image_rel(filename: str, labels: dict) -> str | None:
    """web_meta keys are bare filenames; labels.json keys are '<class>/<file>'."""
    for rel in labels:
        if rel.endswith("/" + filename):
            return rel
    return None


def main() -> int:
    import torch

    meta = json.loads(META_FILE.read_text())
    labels = json.loads((IMAGES / "labels.json").read_text())
    cache = load_embedding_cache()

    # Collect (embedding, tag) pairs for images that made it into the dataset.
    tag_counts = Counter()
    samples: list[tuple[str, str]] = []  # (rel, tag)
    missing_embed: list[str] = []
    for filename, m in meta.items():
        tag = m.get("style_tag")
        if not tag or tag in NON_STYLE_TAGS:
            continue
        rel = find_image_rel(filename, labels)
        if rel is None:
            continue
        if rel not in cache:
            missing_embed.append(rel)
            continue
        samples.append((rel, tag))
        tag_counts[tag] += 1

    # Embed stragglers (new fetch round images not yet embedded).
    if missing_embed:
        from train_custom import build_embeddings  # reuse the embedder + cache

        print(f"embedding {len(missing_embed)} images missing from cache…")
        cache = build_embeddings(labels)
        for filename, m in meta.items():
            tag = m.get("style_tag")
            if not tag or tag in NON_STYLE_TAGS:
                continue
            rel = find_image_rel(filename, labels)
            if rel and rel in cache and (rel, tag) not in samples:
                samples.append((rel, tag))
                tag_counts[tag] += 1
        samples = list(dict.fromkeys(samples))

    tags = sorted(t for t, n in tag_counts.items() if n >= MIN_SAMPLES_PER_TAG)
    tag_idx = {t: i for i, t in enumerate(tags)}
    kept = [(rel, t) for rel, t in samples if t in tag_idx]
    print(f"style training set: {len(kept)} images, {len(tags)} tags "
          f"(dropped {len(tag_counts) - len(tags)} tags under {MIN_SAMPLES_PER_TAG} samples)")

    rng = np.random.default_rng(SEED)
    order = rng.permutation(len(kept))
    kept = [kept[i] for i in order]
    n_val = max(1, int(len(kept) * 0.15))
    val, train = kept[:n_val], kept[n_val:]

    def tensors(pairs):
        X = np.stack([cache[rel] for rel, _ in pairs])
        Y = np.zeros((len(pairs), len(tags)), dtype=np.float32)
        for i, (_, t) in enumerate(pairs):
            Y[i, tag_idx[t]] = 1.0
        return torch.from_numpy(X), torch.from_numpy(Y)

    Xtr, Ytr = tensors(train)
    Xva, Yva = tensors(val)

    torch.manual_seed(SEED)
    head = torch.nn.Sequential(
        torch.nn.Linear(Xtr.shape[1], 256),
        torch.nn.ReLU(),
        torch.nn.Dropout(0.2),
        torch.nn.Linear(256, len(tags)),
    )
    opt = torch.optim.AdamW(head.parameters(), lr=3e-3, weight_decay=1e-4)
    # Per-tag positive weighting keeps rare tags (thuluth) trainable next to
    # common ones (arabic).
    pos = Ytr.sum(0)
    pos_weight = ((len(train) - pos) / pos.clamp(min=1)).clamp(max=30)
    loss_fn = torch.nn.BCEWithLogitsLoss(pos_weight=pos_weight)

    best_state, best_top1 = None, 0.0
    for epoch in range(300):
        head.train()
        opt.zero_grad()
        loss = loss_fn(head(Xtr), Ytr)
        loss.backward()
        opt.step()
        if (epoch + 1) % 20 == 0:
            head.eval()
            with torch.no_grad():
                logits = head(Xva)
            # top-1 accuracy: does the highest-scoring tag match the source tag?
            top1 = (logits.argmax(1) == Yva.argmax(1)).float().mean().item()
            if top1 > best_top1:
                best_top1, best_state = top1, {k: v.clone() for k, v in head.state_dict().items()}
            print(f"epoch {epoch + 1:3d} loss {loss.item():.4f} val top-1 {top1:.3f}")

    head.load_state_dict(best_state)
    head.eval()
    with torch.no_grad():
        logits = head(Xva)
        top1 = (logits.argmax(1) == Yva.argmax(1)).float().mean().item()
        top3 = (
            (torch.topk(logits, k=min(3, len(tags)), dim=1).indices == Yva.argmax(1, keepdim=True))
            .any(1).float().mean().item()
        )
    print(f"\n=== style head — top-1 {top1:.1%} · top-3 {top3:.1%} on {len(val)} held-out")

    MODELS.mkdir(exist_ok=True)
    np.savez(
        MODELS / "style_v1.npz",
        W1=head[0].weight.detach().numpy().astype(np.float32),
        b1=head[0].bias.detach().numpy().astype(np.float32),
        W2=head[3].weight.detach().numpy().astype(np.float32),
        b2=head[3].bias.detach().numpy().astype(np.float32),
        tags=np.array(tags),
    )
    (MODELS / "style_v1.json").write_text(json.dumps({
        "tags": tags,
        "top1": round(top1, 4),
        "top3": round(top3, 4),
        "train_size": len(train),
        "val_size": len(val),
        "per_tag_counts": {t: int(tag_counts[t]) for t in tags},
    }, indent=1, ensure_ascii=False))
    print(f"saved models/style_v1.npz ({len(tags)} tags)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
