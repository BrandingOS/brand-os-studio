"""CLI: classify / report / serve."""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from .engines import DEFAULT_ENGINE, ENGINE_NAMES, classify_all, classify_with, get_engine
from .preprocess import fast_path_result, prepare_image
from .schema import ClassificationResult


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="brand_vision")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_classify = sub.add_parser("classify", help="Classify image files")
    p_classify.add_argument("paths", nargs="+", type=Path)
    p_classify.add_argument("--engine", default=DEFAULT_ENGINE, choices=[*ENGINE_NAMES, "all"])
    p_classify.add_argument("--json", action="store_true", dest="as_json")

    p_report = sub.add_parser("report", help="Accuracy report over fixtures/labels.json")
    p_report.add_argument("--engine", default="all", choices=[*ENGINE_NAMES, "all"])
    p_report.add_argument("--fixtures", type=Path, default=Path(__file__).parents[2] / "fixtures")
    p_report.add_argument("--fail-under", type=float, default=None)

    p_serve = sub.add_parser("serve", help="Run the FastAPI test server")
    p_serve.add_argument("--port", type=int, default=8300)
    p_serve.add_argument("--host", default="127.0.0.1")

    args = parser.parse_args(argv)

    if args.cmd == "classify":
        return _cmd_classify(args)
    if args.cmd == "report":
        return _cmd_report(args)
    if args.cmd == "serve":
        import uvicorn

        uvicorn.run("brand_vision.server.app:app", host=args.host, port=args.port)
        return 0
    return 1


def _classify_path(path: Path, engine: str):
    data = path.read_bytes()
    fast = fast_path_result(path.name)
    if fast is not None:
        return {engine: fast} if engine != "all" else {"fast-path": fast}
    img = prepare_image(data, path.name)
    if engine == "all":
        return classify_all(img)
    return {engine: classify_with(engine, img)}


def _cmd_classify(args) -> int:
    for path in args.paths:
        if not path.exists():
            print(f"!! {path}: not found", file=sys.stderr)
            continue
        try:
            results = _classify_path(path, args.engine)
        except Exception as exc:
            print(f"!! {path}: {exc}", file=sys.stderr)
            continue
        if args.as_json:
            print(json.dumps(
                {"file": str(path), **{k: v.model_dump() for k, v in results.items()}},
                ensure_ascii=False,
            ))
        else:
            for eng, r in results.items():
                slot = f" slot={r.logo_slot}" if r.logo_slot else ""
                flag = "  ⚑ review" if r.needs_review else ""
                print(
                    f"{path.name:40s} [{eng:9s}] {r.category.value:15s} "
                    f"{r.confidence:.2f} → {r.placement}{slot} ({r.latency_ms} ms){flag}"
                )
    return 0


def _cmd_report(args) -> int:
    labels_file = args.fixtures / "labels.json"
    if not labels_file.exists():
        print(f"No labels file at {labels_file}", file=sys.stderr)
        return 1
    labels: dict[str, dict] = json.loads(labels_file.read_text())
    if not labels:
        print("labels.json is empty", file=sys.stderr)
        return 1

    engines = ENGINE_NAMES if args.engine == "all" else [args.engine]
    engines = [e for e in engines if get_engine(e).available]

    overall_ok = True
    for eng in engines:
        stats = _run_engine_report(eng, labels, args.fixtures)
        if args.fail_under is not None and stats < args.fail_under:
            overall_ok = False
    return 0 if overall_ok else 2


def _run_engine_report(engine: str, labels: dict[str, dict], fixtures: Path) -> float:
    from collections import Counter, defaultdict

    confusion: dict[str, Counter] = defaultdict(Counter)
    correct = total = slot_correct = slot_total = 0
    per_class_total: Counter = Counter()
    per_class_hit: Counter = Counter()

    for rel, expected in labels.items():
        path = fixtures / rel
        if not path.exists():
            continue
        try:
            result = _classify_path(path, engine)[engine]
        except Exception as exc:
            print(f"!! {rel}: {exc}", file=sys.stderr)
            continue
        exp_cat = expected["category"]
        got_cat = result.category.value
        total += 1
        per_class_total[exp_cat] += 1
        confusion[exp_cat][got_cat] += 1
        if got_cat == exp_cat:
            correct += 1
            per_class_hit[exp_cat] += 1
        if "logo_slot" in expected and expected["logo_slot"]:
            slot_total += 1
            if result.logo_slot == expected["logo_slot"]:
                slot_correct += 1

    if total == 0:
        print(f"[{engine}] no fixture files found")
        return 0.0

    acc = correct / total
    print(f"\n=== {engine} — accuracy {correct}/{total} = {acc:.1%}"
          + (f" · slots {slot_correct}/{slot_total} = {slot_correct / slot_total:.1%}" if slot_total else ""))

    cats = sorted({*per_class_total, *(g for c in confusion.values() for g in c)})
    header = "actual \\ predicted".ljust(20) + "".join(c[:10].rjust(11) for c in cats)
    print(header)
    for actual in cats:
        if per_class_total[actual] == 0:
            continue
        row = actual[:18].ljust(20)
        for pred in cats:
            n = confusion[actual][pred]
            row += (str(n) if n else "·").rjust(11)
        print(row)
    for cat in sorted(per_class_total):
        n, h = per_class_total[cat], per_class_hit[cat]
        print(f"  {cat:15s} recall {h}/{n} = {h / n:.0%}")
    return acc


if __name__ == "__main__":
    raise SystemExit(main())
