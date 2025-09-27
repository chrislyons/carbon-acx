from __future__ import annotations

import sys
import os
import shutil
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


@pytest.fixture(autouse=True)
def _set_output_root(tmp_path, monkeypatch):
    output_root = tmp_path / "derived"
    monkeypatch.setenv("ACX_OUTPUT_ROOT", str(output_root))
    return output_root


@pytest.fixture
def derived_output_root():
    return Path(os.environ["ACX_OUTPUT_ROOT"])  # type: ignore[arg-type]


@pytest.fixture
def derived_output_dir(derived_output_root):
    path = derived_output_root / "calc" / "outputs"
    if path.exists():
        shutil.rmtree(path)
    path.mkdir(parents=True, exist_ok=True)
    return path
