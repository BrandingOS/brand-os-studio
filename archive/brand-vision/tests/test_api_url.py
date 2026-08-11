from __future__ import annotations

from fastapi.testclient import TestClient

from brand_vision.server.app import app

client = TestClient(app)


def test_classify_requires_file_or_url():
    res = client.post("/classify", data={"engine": "heuristic"})
    assert res.status_code == 422


def test_classify_rejects_non_http_url():
    res = client.post("/classify", data={"engine": "heuristic", "url": "ftp://x/y.png"})
    assert res.status_code == 422
