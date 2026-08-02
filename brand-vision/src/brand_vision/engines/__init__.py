"""Engine registry + orchestration (latency timing, engine="all" fan-out)."""
from __future__ import annotations

import time
from functools import lru_cache

from ..config import get_settings
from ..schema import ClassificationResult, EngineInfo
from .base import Engine, PreparedImage
from .claude import ClaudeEngine
from .custom import TRAIN_HINT, CustomEngine
from .heuristic import HeuristicEngine
from .hybrid import HybridEngine
from .local_clip import INSTALL_HINT, LocalClipEngine
from .ollama_vlm import INSTALL_HINT as OLLAMA_HINT
from .ollama_vlm import OllamaEngine

ENGINE_NAMES = ["heuristic", "custom", "local", "ollama", "claude", "hybrid"]
DEFAULT_ENGINE = "hybrid"
# Engines omitted from engine="all" fan-out for speed can still be called directly.


@lru_cache
def _registry() -> dict[str, Engine]:
    claude = ClaudeEngine()
    heuristic = HeuristicEngine()
    ollama = OllamaEngine()
    clip = LocalClipEngine()
    return {
        "heuristic": heuristic,
        "custom": CustomEngine(clip=clip),
        "local": clip,
        "ollama": ollama,
        "claude": claude,
        "hybrid": HybridEngine(claude=claude, heuristic=heuristic, fallback_vision=ollama),
    }


def get_engine(name: str) -> Engine:
    reg = _registry()
    if name not in reg:
        raise KeyError(f"Unknown engine '{name}'. Valid: {', '.join(ENGINE_NAMES)} or 'all'.")
    return reg[name]


def list_engines() -> list[EngineInfo]:
    settings = get_settings()
    infos = []
    for name, engine in _registry().items():
        hint = None
        model = None
        if name == "local" and not engine.available:
            hint = INSTALL_HINT
        if name == "custom":
            model = "custom_v1"
            if not engine.available:
                hint = TRAIN_HINT
        if name == "ollama":
            model = engine.model
            if not engine.available:
                hint = OLLAMA_HINT
        if name == "claude":
            model = settings.claude_model
            if not engine.available:
                hint = "Set ANTHROPIC_API_KEY to enable this engine."
        if name == "hybrid":
            model = settings.claude_model
            if not engine.available:
                hint = "Needs ANTHROPIC_API_KEY, or a running Ollama vision model as free fallback."
        infos.append(EngineInfo(name=name, available=engine.available, model=model, hint=hint))
    return infos


def classify_with(name: str, img: PreparedImage) -> ClassificationResult:
    engine = get_engine(name)
    start = time.perf_counter()
    result = engine.classify(img)
    result.latency_ms = int((time.perf_counter() - start) * 1000)
    return result


def classify_all(img: PreparedImage) -> dict[str, ClassificationResult]:
    out: dict[str, ClassificationResult] = {}
    for name in ENGINE_NAMES:
        engine = get_engine(name)
        if not engine.available:
            continue
        out[name] = classify_with(name, img)
    return out
