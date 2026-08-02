from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


def _load_dotenv_into_environ() -> None:
    """Load .env into os.environ for non-prefixed vars (ANTHROPIC_API_KEY).

    pydantic-settings only maps BRAND_VISION_* fields; the Anthropic SDK reads
    ANTHROPIC_API_KEY straight from the environment. Existing env vars win.
    """
    for candidate in (Path.cwd() / ".env", Path(__file__).parents[2] / ".env"):
        if not candidate.is_file():
            continue
        for line in candidate.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            key, value = key.strip(), value.strip().strip("'\"")
            if key and value and key not in os.environ:
                os.environ[key] = value
        break


_load_dotenv_into_environ()


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="BRAND_VISION_", env_file=".env", extra="ignore"
    )

    claude_model: str = "claude-opus-5"
    cors_origins: str = "http://localhost:8080,http://localhost:5173"
    max_edge: int = 1536
    max_upload_mb: int = 15
    port: int = 8300

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
