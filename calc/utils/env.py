"""Environment-flag helpers with conservative, default-deny semantics."""

from __future__ import annotations

import os

TRUE_VALUES = frozenset({"1", "true", "yes", "on"})

__all__ = ["env_flag"]


def env_flag(name: str) -> bool:
    """Return ``True`` only when ``name`` is set to an affirmative value.

    Unset variables and every value outside :data:`TRUE_VALUES` resolve to
    ``False`` — callers such as the output-deletion guardrail rely on this
    default-deny behaviour.
    """

    value = os.getenv(name)
    if value is None:
        return False
    return value.strip().lower() in TRUE_VALUES
