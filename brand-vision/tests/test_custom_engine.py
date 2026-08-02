from __future__ import annotations

from pathlib import Path

import numpy as np
import pytest

from brand_vision.engines.custom import CustomEngine
from brand_vision.schema import Category


def test_unavailable_without_weights(tmp_path):
    eng = CustomEngine(weights_path=tmp_path / "missing.npz")
    assert eng.available is False


class FakeClip:
    available = True

    def embed(self, pil):
        import torch

        return torch.ones(1, 4) / 2.0


def make_weights(tmp_path: Path) -> Path:
    classes = ["logo_mark", "photo"]
    W = np.array([[1.0, 1.0, 1.0, 1.0], [-1.0, -1.0, -1.0, -1.0]], dtype=np.float32)
    b = np.zeros(2, dtype=np.float32)
    path = tmp_path / "head.npz"
    np.savez(path, W=W, b=b, classes=np.array(classes))
    return path


def test_classifies_with_trained_head(prepared, tmp_path):
    torch = pytest.importorskip("torch")  # noqa: F841
    eng = CustomEngine(clip=FakeClip(), weights_path=make_weights(tmp_path))
    result = eng.classify(prepared("logo_mark.png"))
    assert result.category is Category.logo_mark
    assert result.engine == "custom"
    assert result.placement == "logos"
    assert result.logo_slot == "mark"
    assert 0.0 <= result.confidence <= 1.0
