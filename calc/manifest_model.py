from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

FIGURE_MANIFEST_SCHEMA_VERSION = "acx.figure-manifest/1-0-0"
MANIFEST_INDEX_SCHEMA_VERSION = "acx.figure-manifest-index/1-0-0"


class NumericInvariance(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    passed: bool
    tolerance_percent: float = Field(..., ge=0)


class ReferenceOrder(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    index: int = Field(..., ge=1)
    source_id: str = Field(..., min_length=1)


class ManifestReferences(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    path: str = Field(..., min_length=1)
    legacy_path: str = Field(..., min_length=1)
    sha256: str = Field(..., pattern=r"^[0-9a-f]{64}$")
    line_count: int = Field(..., ge=0)
    order: list[ReferenceOrder]

    @model_validator(mode="after")
    def _validate_order(self) -> "ManifestReferences":
        if len(self.order) != self.line_count:
            msg = "references.order length must equal references.line_count"
            raise ValueError(msg)
        return self


class FigureManifest(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    schema_version: Literal[FIGURE_MANIFEST_SCHEMA_VERSION] = FIGURE_MANIFEST_SCHEMA_VERSION
    figure_id: str = Field(..., min_length=1)
    figure_method: str = Field(..., min_length=1)
    generated_at: str = Field(..., min_length=1)
    hash_prefix: str = Field(..., pattern=r"^[0-9a-f]{8}$")
    figure_path: str = Field(..., min_length=1)
    legacy_figure_path: str = Field(..., min_length=1)
    figure_sha256: str = Field(..., pattern=r"^[0-9a-f]{64}$")
    citation_keys: list[str]
    references: ManifestReferences
    numeric_invariance: NumericInvariance


class ManifestIndexArtifact(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    path: str = Field(..., min_length=1)
    sha256: str = Field(..., pattern=r"^[0-9a-f]{64}$")
    preferred: bool = False


class ManifestIndexEntry(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    figure_id: str = Field(..., min_length=1)
    figure_method: str = Field(..., min_length=1)
    hash_prefix: str = Field(..., pattern=r"^[0-9a-f]{8}$")
    manifests: list[ManifestIndexArtifact]
    figures: list[ManifestIndexArtifact]
    references: list[ManifestIndexArtifact]


class DatasetManifestInfo(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    path: str = Field(..., min_length=1)
    sha256: str = Field(..., pattern=r"^[0-9a-f]{64}$")


class ManifestIndex(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    schema_version: Literal[MANIFEST_INDEX_SCHEMA_VERSION] = MANIFEST_INDEX_SCHEMA_VERSION
    generated_at: str = Field(..., min_length=1)
    build_hash: str | None = Field(default=None, pattern=r"^[0-9a-f]{12}$")
    dataset_version: str | None = None
    hashed_preferred: bool
    dataset_manifest: DatasetManifestInfo
    figures: list[ManifestIndexEntry]
