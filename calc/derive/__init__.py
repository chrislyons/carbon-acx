"""Calculation kernels and dataset orchestrators.

This package is the split of the former ``calc/derive.py`` module along its
audited seams. Dependency direction (leaf → root):

- :mod:`calc.derive.formulas` — functional-unit formula evaluation and
  unit-variable extraction (schema types only).
- :mod:`calc.derive.emissions` — emission math, grid-intensity resolution.
- :mod:`calc.derive.layers` — layer-id resolution rules.
- :mod:`calc.derive.io` — stable serialisation, output guardrails, column
  contracts.
- :mod:`calc.derive.pipeline` — the ``export_view`` / ``build_intensity_matrix``
  orchestrators composing every kernel above.
- :mod:`calc.derive.cli` — ``python -m calc.derive`` entry point.

The public surface of the former module is preserved 1:1 via re-exports below.
"""

from __future__ import annotations

import datetime as _datetime_module

from .. import citations, figures
from .. import manifest as manifest_module
from ..citations import collect_activity_source_keys
from ..dal import DataStore, choose_backend
from ..figures_manifest import (
    FigureManifestArtifacts,
    build_collection_index,
    build_figure_manifest,
    bundle_manifest_artifacts,
)
from ..schema import (
    Activity,
    ActivityFunctionalUnitMap,
    ActivitySchedule,
    EmissionFactor,
    FunctionalUnit,
    GridIntensity,
    LayerId,
    Operation,
    Profile,
    RegionCode,
    load_activities as schema_load_activities,
    load_activity_dependencies,
    load_activity_fu_map,
    load_assets as schema_load_assets,
    load_entities as schema_load_entities,
    load_feedback_loops as schema_load_feedback_loops,
    load_functional_units,
    load_operations as schema_load_operations,
    load_sites as schema_load_sites,
)
from ..upstream import dependency_metadata
from ..utils.clock import GENERATED_AT_ENV, datetime, timezone
from .cli import main
from .emissions import EmissionDetails, compute_emission, compute_emission_details, get_grid_intensity
from .formulas import evaluate_functional_unit_formula
from .io import (
    ALLOW_OUTPUT_RM_ENV,
    ARTIFACT_ROOT,
    BUILD_HASH_RE,
    EXPORT_COLUMNS,
    FLOAT_QUANTISER,
    INTENSITY_COLUMNS,
    OUTPUT_ROOT_ENV,
    REPO_ROOT,
    is_safe_output_dir,
)
from .pipeline import build_intensity_matrix, export_view

__all__ = [
    "ALLOW_OUTPUT_RM_ENV",
    "ARTIFACT_ROOT",
    "Activity",
    "ActivityFunctionalUnitMap",
    "ActivitySchedule",
    "BUILD_HASH_RE",
    "DataStore",
    "EmissionDetails",
    "EXPORT_COLUMNS",
    "FLOAT_QUANTISER",
    "FigureManifestArtifacts",
    "GENERATED_AT_ENV",
    "INTENSITY_COLUMNS",
    "LayerId",
    "Operation",
    "OUTPUT_ROOT_ENV",
    "Profile",
    "REPO_ROOT",
    "RegionCode",
    "build_collection_index",
    "build_figure_manifest",
    "build_intensity_matrix",
    "bundle_manifest_artifacts",
    "citations",
    "collect_activity_source_keys",
    "compute_emission",
    "compute_emission_details",
    "datetime",
    "dependency_metadata",
    "evaluate_functional_unit_formula",
    "export_view",
    "figures",
    "get_grid_intensity",
    "is_safe_output_dir",
    "load_activity_dependencies",
    "load_activity_fu_map",
    "load_functional_units",
    "main",
    "manifest_module",
    "schema_load_activities",
    "schema_load_assets",
    "schema_load_entities",
    "schema_load_feedback_loops",
    "schema_load_operations",
    "schema_load_sites",
    "timezone",
]
