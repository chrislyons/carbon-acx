"""Canonical generated-at resolution shared across the calc pipeline."""

from __future__ import annotations

import datetime as _datetime_module
import os

GENERATED_AT_ENV = "ACX_GENERATED_AT"

datetime = _datetime_module.datetime
timezone = _datetime_module.timezone

__all__ = ["GENERATED_AT_ENV", "resolve_generated_at"]


def resolve_generated_at(value: str | None = None) -> str:
    """Return the canonical UTC ISO-8601 generation timestamp.

    Resolution order: an explicit ``value`` wins, then the
    ``ACX_GENERATED_AT`` environment variable (passed through verbatim so
    pinned builds stay byte-identical), otherwise the current UTC time.
    Timestamps generated here carry seconds precision — microseconds are
    stripped — while explicitly provided or pinned values are never rewritten.
    """

    if value:
        return value
    env_value = os.getenv(GENERATED_AT_ENV)
    if env_value:
        return env_value
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()
