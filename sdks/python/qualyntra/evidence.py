"""
File: sdks/python/qualyntra/evidence.py
Purpose: Creates normalized evidence records with SHA-256 integrity metadata for Python-produced files without requiring automation-vendor SDKs.
Author: Raushan Raj
"""
from __future__ import annotations

from datetime import datetime, timezone
import hashlib
import mimetypes
from pathlib import Path
from uuid import uuid4

from .contracts import EvidenceRecord


def file_evidence(run_id: str, kind: str, path: str | Path, *, name: str | None = None) -> EvidenceRecord:
    source = Path(path)
    digest = hashlib.sha256(source.read_bytes()).hexdigest()
    content_type = mimetypes.guess_type(source.name)[0] or "application/octet-stream"
    created_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    return EvidenceRecord(
        id=f"evidence_{uuid4().hex}",
        run_id=run_id,
        kind=kind,
        name=name or source.name,
        content_type=content_type,
        created_at=created_at,
        path=str(source),
        sha256=digest,
        redacted=False,
    )
