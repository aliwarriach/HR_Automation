# app/core/file_storage.py
"""Local filesystem storage for downloaded resume PDFs."""
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path

from app.config import settings

PDF_MAGIC = b"%PDF-"


def is_valid_pdf(data: bytes) -> bool:
    return data[:5] == PDF_MAGIC


def _sanitize_filename(name: str) -> str:
    name = Path(name).name  # strip any path components
    return re.sub(r"[^A-Za-z0-9_.-]", "_", name) or "resume.pdf"


def save_pdf(data: bytes, original_filename: str) -> tuple[str, str]:
    """Persist PDF bytes under uploads/{date}/ with a unique filename.

    Returns (file_name, file_path); file_path is relative to the process cwd.
    """
    date_dir = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    target_dir = Path(settings.upload_dir) / date_dir
    target_dir.mkdir(parents=True, exist_ok=True)

    unique_name = f"{uuid.uuid4().hex}_{_sanitize_filename(original_filename)}"
    target_path = target_dir / unique_name
    target_path.write_bytes(data)

    return unique_name, str(target_path)
