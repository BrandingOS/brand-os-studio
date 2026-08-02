from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol, runtime_checkable

from PIL import Image

from ..schema import ClassificationResult, Signals


@dataclass
class PreparedImage:
    pil: Image.Image        # RGBA, downscaled to the configured max edge
    png_bytes: bytes        # what the Claude engine receives
    signals: Signals        # computed ONCE, shared by all engines
    filename: str


@runtime_checkable
class Engine(Protocol):
    name: str

    @property
    def available(self) -> bool: ...

    def classify(self, img: PreparedImage) -> ClassificationResult: ...
