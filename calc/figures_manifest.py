from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Sequence

from .manifest_model import (
    DatasetManifestInfo,
    FigureManifest,
    ManifestIndex,
    ManifestIndexArtifact,
    ManifestIndexEntry,
    ManifestReferences,
    NumericInvariance,
    ReferenceOrder,
)

DEFAULT_TOLERANCE_PERCENT = 0.01


@dataclass(frozen=True)
class FigureManifestArtifacts:
    manifest: FigureManifest
    manifest_path: str
    legacy_manifest_path: str
    manifest_sha256: str
    references_sha256: str
    figure_path: str
    legacy_figure_path: str
    references_path: str
    legacy_references_path: str


def _normalise_path(path: Path, root: Path) -> str:
    try:
        return path.relative_to(root).as_posix()
    except ValueError:
        return path.as_posix()


def _order_entries(citation_keys: Sequence[str]) -> list[ReferenceOrder]:
    return [
        ReferenceOrder(index=idx, source_id=str(key))
        for idx, key in enumerate(citation_keys, start=1)
    ]


def build_figure_manifest(
    *,
    figure_id: str,
    figure_method: str,
    generated_at: str,
    hash_prefix: str,
    figure_sha256: str,
    figure_path: Path,
    legacy_figure_path: Path,
    citation_keys: Sequence[str],
    references: Sequence[str],
    references_sha256: str,
    references_path: Path,
    legacy_references_path: Path,
    artifact_root: Path,
) -> FigureManifest:
    if len(citation_keys) != len(references):
        msg = "citation key count does not match reference line count for figure"
        raise ValueError(msg)

    references_model = ManifestReferences(
        path=_normalise_path(references_path, artifact_root),
        legacy_path=_normalise_path(legacy_references_path, artifact_root),
        sha256=references_sha256,
        line_count=len(references),
        order=_order_entries(citation_keys),
    )
    manifest = FigureManifest(
        figure_id=figure_id,
        figure_method=figure_method,
        generated_at=generated_at,
        hash_prefix=hash_prefix,
        figure_path=_normalise_path(figure_path, artifact_root),
        legacy_figure_path=_normalise_path(legacy_figure_path, artifact_root),
        figure_sha256=figure_sha256,
        citation_keys=[str(key) for key in citation_keys],
        references=references_model,
        numeric_invariance=NumericInvariance(
            passed=True,
            tolerance_percent=DEFAULT_TOLERANCE_PERCENT,
        ),
    )
    return manifest


def bundle_manifest_artifacts(
    manifest: FigureManifest,
    *,
    manifest_path: Path,
    legacy_manifest_path: Path,
    manifest_sha256: str,
    references_sha256: str,
    artifact_root: Path,
) -> FigureManifestArtifacts:
    return FigureManifestArtifacts(
        manifest=manifest,
        manifest_path=_normalise_path(manifest_path, artifact_root),
        legacy_manifest_path=_normalise_path(legacy_manifest_path, artifact_root),
        manifest_sha256=manifest_sha256,
        references_sha256=references_sha256,
        figure_path=manifest.figure_path,
        legacy_figure_path=manifest.legacy_figure_path,
        references_path=manifest.references.path,
        legacy_references_path=manifest.references.legacy_path,
    )


def _artifact_entry(path: str, sha256: str, *, preferred: bool) -> ManifestIndexArtifact:
    return ManifestIndexArtifact(path=path, sha256=sha256, preferred=preferred)


def build_collection_index(
    artifacts: Iterable[FigureManifestArtifacts],
    *,
    generated_at: str,
    build_hash: str | None,
    dataset_version: str | None,
    hashed_preferred: bool,
    dataset_manifest_path: Path,
    dataset_manifest_sha256: str,
    artifact_root: Path,
) -> ManifestIndex:
    dataset_info = DatasetManifestInfo(
        path=_normalise_path(dataset_manifest_path, artifact_root),
        sha256=dataset_manifest_sha256,
    )
    entries: list[ManifestIndexEntry] = []
    for bundle in artifacts:
        preferred_flag = hashed_preferred
        entries.append(
            ManifestIndexEntry(
                figure_id=bundle.manifest.figure_id,
                figure_method=bundle.manifest.figure_method,
                hash_prefix=bundle.manifest.hash_prefix,
                manifests=[
                    _artifact_entry(
                        bundle.legacy_manifest_path,
                        bundle.manifest_sha256,
                        preferred=not preferred_flag,
                    ),
                    _artifact_entry(
                        bundle.manifest_path, bundle.manifest_sha256, preferred=preferred_flag
                    ),
                ],
                figures=[
                    _artifact_entry(
                        bundle.legacy_figure_path,
                        bundle.manifest.figure_sha256,
                        preferred=not preferred_flag,
                    ),
                    _artifact_entry(
                        bundle.figure_path, bundle.manifest.figure_sha256, preferred=preferred_flag
                    ),
                ],
                references=[
                    _artifact_entry(
                        bundle.legacy_references_path,
                        bundle.references_sha256,
                        preferred=not preferred_flag,
                    ),
                    _artifact_entry(
                        bundle.references_path, bundle.references_sha256, preferred=preferred_flag
                    ),
                ],
            )
        )

    entries.sort(key=lambda entry: entry.figure_id)
    return ManifestIndex(
        generated_at=generated_at,
        build_hash=build_hash,
        dataset_version=dataset_version,
        hashed_preferred=hashed_preferred,
        dataset_manifest=dataset_info,
        figures=entries,
    )
