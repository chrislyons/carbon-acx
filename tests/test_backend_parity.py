from __future__ import annotations

from pathlib import Path

import pytest

from calc import derive


@pytest.mark.parametrize("backend", ["csv", "duckdb"])
def test_backend_parity(
    tmp_path_factory: pytest.TempPathFactory, monkeypatch: pytest.MonkeyPatch, backend: str
) -> None:
    monkeypatch.delenv("ACX_DATA_BACKEND", raising=False)
    monkeypatch.setenv("ACX_GENERATED_AT", "1970-01-01T00:00:00+00:00")

    outputs: dict[str, Path] = {}
    for name in ("csv", "duckdb"):
        if name == "duckdb":
            pytest.importorskip("duckdb")
        output_root = tmp_path_factory.mktemp(f"outputs-{backend}-{name}")
        monkeypatch.setenv("ACX_DATA_BACKEND", name)
        derive.export_view(output_root=output_root)
        outputs[name] = Path(output_root) / "calc" / "outputs"

    csv_root = outputs["csv"]
    duck_root = outputs["duckdb"]

    expected_files = [
        Path("export_view.csv"),
        Path("export_view.json"),
        Path("manifest.json"),
    ]

    for rel_path in expected_files:
        csv_path = csv_root / rel_path
        duck_path = duck_root / rel_path
        assert csv_path.exists(), f"missing {rel_path} for csv backend"
        assert duck_path.exists(), f"missing {rel_path} for duckdb backend"
        assert csv_path.read_bytes() == duck_path.read_bytes(), f"mismatch for {rel_path}"

    def _collect(directory: Path, pattern: str) -> list[str]:
        return sorted(path.name for path in directory.glob(pattern))

    figure_dir_csv = csv_root / "figures"
    figure_dir_duck = duck_root / "figures"
    figure_files = _collect(figure_dir_csv, "*.json")
    assert figure_files == _collect(figure_dir_duck, "*.json")
    for name in figure_files:
        assert (figure_dir_csv / name).read_bytes() == (figure_dir_duck / name).read_bytes()

    reference_dir_csv = csv_root / "references"
    reference_dir_duck = duck_root / "references"
    reference_files = _collect(reference_dir_csv, "*_refs.txt")
    assert reference_files == _collect(reference_dir_duck, "*_refs.txt")
    for name in reference_files:
        assert (reference_dir_csv / name).read_bytes() == (reference_dir_duck / name).read_bytes()
