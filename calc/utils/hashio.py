"""Utility helpers for computing stable SHA-256 digests for ACX artefacts."""

from __future__ import annotations

from hashlib import sha256
from pathlib import Path
from typing import Iterable, Sequence

__all__ = [
    "sha256_bytes",
    "sha256_text",
    "sha256_file",
    "sha256_concat",
    "normalise_newlines",
]


def normalise_newlines(data: bytes) -> bytes:
    """Return ``data`` with CRLF sequences converted to LF."""

    if b"\r\n" not in data:
        return data
    return data.replace(b"\r\n", b"\n")


def _ensure_bytes(path: Path) -> bytes:
    raw = Path(path).read_bytes()
    return normalise_newlines(raw)


def sha256_bytes(data: bytes) -> str:
    """Return the SHA-256 hex digest for ``data``."""

    return sha256(data).hexdigest()


def sha256_text(text: str) -> str:
    """Return the SHA-256 hex digest for ``text`` encoded as UTF-8."""

    return sha256_bytes(text.encode("utf-8"))


def sha256_file(path: Path) -> str:
    """Return the SHA-256 digest for the contents of ``path``.

    The helper normalises Windows newlines to ensure consistent values across
    platforms.
    """

    return sha256_bytes(_ensure_bytes(path))


def sha256_concat(paths: Sequence[Path] | Iterable[Path]) -> str:
    """Return the SHA-256 digest for the concatenated payload of ``paths``.

    Files are processed in the provided order and newlines are normalised prior
    to hashing.
    """

    digest = sha256()
    for path in paths:
        digest.update(_ensure_bytes(Path(path)))
    return digest.hexdigest()
