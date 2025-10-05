from __future__ import annotations

from pathlib import Path

import pytest


@pytest.mark.skipif(
    not (Path("tests") / "fixtures" / "legacy_artifacts").exists(),
    reason="Legacy fixture not present; manifests enforced for new builds",
)
def test_legacy_artifacts_skip_when_missing() -> None:
    pytest.skip("Legacy fixtures rely on pre-manifest outputs and are intentionally skipped")
