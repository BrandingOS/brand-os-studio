from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from brand_vision.server.app import app

client = TestClient(app)


@pytest.fixture(scope="module")
def mark_png(request):
    from pathlib import Path

    path = Path(__file__).parents[1] / "fixtures" / "synthetic" / "logo_mark.png"
    return path.read_bytes()


def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert body["engines"]["heuristic"] is True


def test_engines_listing():
    res = client.get("/engines")
    assert res.status_code == 200
    names = {e["name"] for e in res.json()}
    assert names == {"heuristic", "custom", "local", "ollama", "claude", "hybrid"}


def test_classify_heuristic(mark_png):
    res = client.post(
        "/classify",
        files={"file": ("logo_mark.png", mark_png, "image/png")},
        data={"engine": "heuristic"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["category"] == "logo_mark"
    assert body["placement"] == "logos"
    assert body["engine"] == "heuristic"
    assert body["latency_ms"] >= 0


def test_unknown_engine(mark_png):
    res = client.post(
        "/classify",
        files={"file": ("x.png", mark_png, "image/png")},
        data={"engine": "quantum"},
    )
    assert res.status_code == 422


def test_font_fast_path():
    res = client.post(
        "/classify",
        files={"file": ("brand.woff2", b"\x00\x01fake", "font/woff2")},
        data={"engine": "heuristic"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["category"] == "font_specimen"
    assert body["placement"] == "fonts"
    assert body["engine"] == "fast-path"


def test_undecodable_image_422():
    res = client.post(
        "/classify",
        files={"file": ("broken.png", b"not an image", "image/png")},
        data={"engine": "heuristic"},
    )
    assert res.status_code == 422


def test_batch(mark_png):
    res = client.post(
        "/classify/batch",
        files=[
            ("files", ("a.png", mark_png, "image/png")),
            ("files", ("broken.png", b"nope", "image/png")),
        ],
        data={"engine": "heuristic"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body[0]["ok"] is True
    assert body[0]["result"]["category"] == "logo_mark"
    assert body[1]["ok"] is False
