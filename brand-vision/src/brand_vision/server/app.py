from __future__ import annotations

from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from .. import __version__
from ..config import get_settings
from ..engines import DEFAULT_ENGINE, ENGINE_NAMES, classify_all, classify_with, get_engine, list_engines
from ..preprocess import fast_path_result, prepare_image
from ..schema import BatchItemResult

STATIC_DIR = Path(__file__).parent / "static"

app = FastAPI(title="BrandOS Brand Vision", version=__version__)

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "version": __version__,
        "engines": {e.name: e.available for e in list_engines()},
    }


@app.get("/engines")
def engines() -> list:
    return [e.model_dump() for e in list_engines()]


@app.post("/classify")
async def classify(
    file: Optional[UploadFile] = File(None),
    url: Optional[str] = Form(None),
    engine: str = Form(DEFAULT_ENGINE),
):
    _validate_engine(engine)
    if file is not None:
        data = await _read_upload(file)
        filename = file.filename or "upload"
        content_type = file.content_type
    elif url:
        data, filename, content_type = _fetch_url(url)
    else:
        raise HTTPException(status_code=422, detail="Provide a file or a url.")

    fast = fast_path_result(filename, content_type)
    if fast is not None:
        return {name: fast.model_dump() for name in _requested(engine)} if engine == "all" else fast.model_dump()

    try:
        img = prepare_image(data, filename, content_type)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Could not decode image: {exc}") from exc

    if engine == "all":
        return {name: r.model_dump() for name, r in classify_all(img).items()}
    eng = get_engine(engine)
    if not eng.available:
        raise HTTPException(status_code=409, detail=f"Engine '{engine}' is not available on this machine.")
    return classify_with(engine, img).model_dump()


def _fetch_url(url: str) -> tuple[bytes, str, Optional[str]]:
    import urllib.error
    import urllib.request
    from urllib.parse import urlparse

    parsed = urlparse(url)
    if parsed.scheme not in ("http", "https"):
        raise HTTPException(status_code=422, detail="Only http(s) URLs are supported.")
    limit = get_settings().max_upload_mb * 1024 * 1024
    req = urllib.request.Request(url, headers={"User-Agent": "brand-vision/0.1"})
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = resp.read(limit + 1)
            content_type = resp.headers.get_content_type()
    except urllib.error.URLError as exc:
        raise HTTPException(status_code=422, detail=f"Could not fetch URL: {exc}") from exc
    if len(data) > limit:
        raise HTTPException(status_code=413, detail=f"URL content exceeds {get_settings().max_upload_mb} MB limit.")
    filename = parsed.path.rsplit("/", 1)[-1] or "url-image"
    return data, filename, content_type


@app.post("/classify/batch")
async def classify_batch(files: list[UploadFile] = File(...), engine: str = Form(DEFAULT_ENGINE)):
    _validate_engine(engine)
    results: list[dict] = []
    for f in files:
        filename = f.filename or "upload"
        try:
            data = await _read_upload(f)
            fast = fast_path_result(filename, f.content_type)
            if fast is not None:
                results.append(BatchItemResult(filename=filename, ok=True, result=fast).model_dump())
                continue
            img = prepare_image(data, filename, f.content_type)
            if engine == "all":
                results.append(
                    BatchItemResult(filename=filename, ok=True, results=classify_all(img)).model_dump()
                )
            else:
                results.append(
                    BatchItemResult(filename=filename, ok=True, result=classify_with(engine, img)).model_dump()
                )
        except HTTPException as exc:
            results.append(BatchItemResult(filename=filename, ok=False, error=str(exc.detail)).model_dump())
        except Exception as exc:
            results.append(BatchItemResult(filename=filename, ok=False, error=str(exc)).model_dump())
    return results


def _validate_engine(engine: str) -> None:
    if engine != "all" and engine not in ENGINE_NAMES:
        raise HTTPException(
            status_code=422,
            detail=f"Unknown engine '{engine}'. Valid: {', '.join(ENGINE_NAMES)} or 'all'.",
        )


def _requested(engine: str) -> list[str]:
    return ENGINE_NAMES if engine == "all" else [engine]


async def _read_upload(file: UploadFile) -> bytes:
    data = await file.read()
    limit = get_settings().max_upload_mb * 1024 * 1024
    if len(data) > limit:
        raise HTTPException(status_code=413, detail=f"File exceeds {get_settings().max_upload_mb} MB limit.")
    return data
