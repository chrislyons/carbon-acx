"""Shared label normalisation for activity categories."""

from __future__ import annotations

from typing import Any

import pandas as pd

__all__ = ["normalise_category_label"]


def normalise_category_label(value: Any) -> str:
    """Return ``value`` as a non-empty category label.

    Missing (``None``/``NaN``) and empty values collapse to
    ``"uncategorized"`` so grouping keys stay stable across the derive and
    figures paths.
    """

    if value is None:
        return "uncategorized"
    try:
        if pd.isna(value):
            return "uncategorized"
    except TypeError:
        pass
    text = str(value)
    return text if text else "uncategorized"
