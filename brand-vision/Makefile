.PHONY: dev test fixtures report lint

dev:
	uv run python -m brand_vision serve --port 8300

test:
	uv run pytest

fixtures:
	uv run python scripts/gen_synthetic_fixtures.py

report:
	uv run python -m brand_vision report --engine all

live-test:
	BRAND_VISION_LIVE_TESTS=1 uv run pytest -m live
