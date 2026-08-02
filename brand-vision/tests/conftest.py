from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace

import pytest

FIXTURES = Path(__file__).parents[1] / "fixtures" / "synthetic"


@pytest.fixture(scope="session")
def fixtures_dir() -> Path:
    assert FIXTURES.exists(), (
        "Synthetic fixtures missing — run: uv run python scripts/gen_synthetic_fixtures.py"
    )
    return FIXTURES


@pytest.fixture()
def prepared(fixtures_dir):
    """Factory: load a synthetic fixture into a PreparedImage."""
    from brand_vision.preprocess import prepare_image

    def _load(name: str):
        path = fixtures_dir / name
        return prepare_image(path.read_bytes(), name)

    return _load


class FakeMessages:
    def __init__(self, responses):
        self._responses = list(responses)
        self.calls = []

    def parse(self, **kwargs):
        self.calls.append(kwargs)
        if not self._responses:
            raise AssertionError("FakeMessages exhausted")
        item = self._responses.pop(0)
        if isinstance(item, Exception):
            raise item
        return item


def fake_client(*responses):
    """A stand-in for anthropic.Anthropic exposing .messages.parse()."""
    return SimpleNamespace(messages=FakeMessages(responses))


def parse_response(parsed_output, stop_reason="end_turn"):
    return SimpleNamespace(stop_reason=stop_reason, parsed_output=parsed_output)
