"""Signing helpers for generated SQLite packs."""

from __future__ import annotations

import base64
from dataclasses import dataclass
from pathlib import Path

try:  # pragma: no cover - handled in tests
    from nacl import signing
except ImportError as exc:  # pragma: no cover - dependency guard
    raise RuntimeError(
        "PyNaCl is required for signing support. Ensure the dependency is installed."
    ) from exc


@dataclass(frozen=True)
class SigningResult:
    """Container for Ed25519 signing material."""

    signature: str
    public_key: str

    def as_dict(self) -> dict[str, str]:
        return {
            "algorithm": "ed25519",
            "signature": self.signature,
            "public_key": self.public_key,
        }


def _decode_private_key(data: str) -> bytes:
    text = data.strip()
    if not text:
        raise ValueError("Signing key material is empty")
    try:
        return bytes.fromhex(text)
    except ValueError:
        try:
            return base64.b64decode(text)
        except Exception as exc:  # pragma: no cover - defensive guard
            raise ValueError("Signing key material must be hex or base64 encoded") from exc


def load_signing_key(path: Path) -> "signing.SigningKey":
    """Load an Ed25519 signing key from ``path``.

    The loader accepts either hexadecimal or base64 encoded key material.
    """

    payload = Path(path).read_text(encoding="utf-8")
    return signing.SigningKey(_decode_private_key(payload))


def sign_path(path: Path, key: "signing.SigningKey") -> SigningResult:
    """Return the Ed25519 signature for ``path`` using ``key``."""

    blob = Path(path).read_bytes()
    signed = key.sign(blob)
    signature = base64.b64encode(signed.signature).decode("ascii")
    public_key = base64.b64encode(key.verify_key.encode()).decode("ascii")
    return SigningResult(signature=signature, public_key=public_key)
