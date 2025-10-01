from __future__ import annotations

import csv
import re
from dataclasses import dataclass
from pathlib import Path
from functools import lru_cache
from typing import Iterable, Mapping, Sequence

import plotly.graph_objects as go
from dash import dcc, html

from calc.ui.theme import get_palette, get_plotly_template
from app.lib.plotly_theme import DENSE_LAYOUT

from ._plotly_settings import apply_figure_layout_defaults
from ._helpers import format_number, format_source_summary

_DEFAULT_REFERENCE_KEY = "__default__"
_MINUS_SIGN = "\u2212"


def _intensity_decimals(value: float | None) -> int:
    if value is None:
        return 0
    magnitude = abs(value)
    if magnitude >= 100:
        return 0
    if magnitude >= 10:
        return 1
    return 2


def _format_intensity_value(value: float) -> str:
    return format_number(value, decimals=_intensity_decimals(value))


def _format_delta(value: float | None) -> str | None:
    if value is None or value <= 0:
        return None
    decimals = 0 if value >= 10 else 1 if value >= 1 else 2
    return format_number(value, decimals=decimals)


def _format_bounds(mean: float, low: float | None, high: float | None) -> str | None:
    plus = (high - mean) if high is not None else None
    minus = (mean - low) if low is not None else None
    plus_text = _format_delta(plus)
    minus_text = _format_delta(minus)
    if plus_text and minus_text:
        if plus_text == minus_text:
            return f"±{plus_text}"
        return f"+{plus_text} / {_MINUS_SIGN}{minus_text}"
    if plus_text:
        return f"+{plus_text}"
    if minus_text:
        return f"{_MINUS_SIGN}{minus_text}"
    return None


def _format_scope_label(value: object) -> str | None:
    if value in (None, ""):
        return None
    text = str(value)
    if "." in text:
        text = text.split(".")[-1]
    text = text.replace("_", " ").replace("-", " ").strip()
    if not text:
        return None
    text = text.title()
    if text.lower().startswith("scope"):
        return text.replace("scope", "Scope", 1)
    return text


def _format_region_label(value: object) -> str | None:
    if value in (None, ""):
        return None
    text = str(value).strip()
    return text or None


def _parse_source_ids(value: object) -> list[str]:
    if value in (None, ""):
        return []
    if isinstance(value, (list, tuple, set)):
        return [str(item).strip() for item in value if str(item).strip()]
    return [part.strip() for part in str(value).split(",") if part.strip()]


@dataclass(slots=True)
class IntensityRecord:
    functional_unit_id: str
    alternative: str
    intensity: float | None
    low: float | None = None
    high: float | None = None
    alt_id: str | None = None
    record_type: str = "alternative"

    def to_json(self) -> dict[str, float | str | None]:
        return {
            "functional_unit_id": self.functional_unit_id,
            "alternative": self.alternative,
            "intensity": self.intensity,
            "low": self.low,
            "high": self.high,
            "alt_id": self.alt_id,
            "record_type": self.record_type,
        }


def _repo_root() -> Path:
    resolved = Path(__file__).resolve()
    return resolved.parent.parent.parent


def _artifact_directories() -> list[Path]:
    root = _repo_root()
    return [
        root / "dist" / "artifacts",
        Path("/carbon-acx/artifacts"),
    ]


def _find_artifact(relative_path: Path) -> Path | None:
    for directory in _artifact_directories():
        candidate = directory / relative_path
        if candidate.exists():
            return candidate
    return None


def _coerce_float(value: object) -> float | None:
    if value in (None, ""):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


@lru_cache(maxsize=None)
def load_intensity_records() -> list[dict[str, float | str | None]]:
    """Load intensity records from the packaged artifact if present."""

    path = _find_artifact(Path("intensity_matrix.csv"))
    if path is None:
        return []

    records: list[IntensityRecord] = []
    with path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            functional_unit = (
                row.get("functional_unit_id") or row.get("functional_unit") or row.get("fu")
            )
            alternative = (
                row.get("alternative")
                or row.get("activity")
                or row.get("operation")
                or row.get("name")
                or row.get("alt_id")
            )
            intensity = _coerce_float(row.get("intensity_g_per_fu") or row.get("intensity"))
            low = _coerce_float(
                row.get("intensity_low_g_per_fu") or row.get("low_g_per_fu") or row.get("low")
            )
            high = _coerce_float(
                row.get("intensity_high_g_per_fu") or row.get("high_g_per_fu") or row.get("high")
            )

            if not functional_unit or not alternative:
                continue

            record = IntensityRecord(
                functional_unit_id=str(functional_unit),
                alternative=str(alternative),
                intensity=float(intensity) if intensity is not None else None,
                low=low,
                high=high,
                alt_id=str(row.get("alt_id")) if row.get("alt_id") else None,
                record_type=str(row.get("record_type") or "alternative"),
            )
            records.append(record)

    return [record.to_json() for record in records]


@lru_cache(maxsize=None)
def load_functional_unit_labels() -> dict[str, str]:
    """Return a mapping of functional unit identifiers to display labels."""

    path = _repo_root() / "data" / "functional_units.csv"
    if not path.exists():
        return {}

    labels: dict[str, str] = {}
    with path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            identifier = row.get("functional_unit_id") or row.get("id")
            name = row.get("name") or identifier
            if not identifier:
                continue
            key = str(identifier)
            label = str(name).strip() if name else key
            labels[key] = label or key
    return labels


_heading_patterns = (
    re.compile(r"^\s*##\s*(?P<key>.+?)\s*$"),
    re.compile(r"^\s*#\s*(?P<key>.+?)\s*$"),
    re.compile(r"^\s*\[(?P<key>[^\]]+)\]\s*$"),
)


def _normalise_key(value: str | None) -> str:
    if not value:
        return _DEFAULT_REFERENCE_KEY
    text = str(value).strip()
    if not text:
        return _DEFAULT_REFERENCE_KEY
    return text.casefold()


def _split_paragraphs(lines: Iterable[str]) -> list[str]:
    paragraphs: list[str] = []
    buffer: list[str] = []
    for line in lines:
        if line.strip():
            buffer.append(line.rstrip())
            continue
        if buffer:
            paragraphs.append(" ".join(buffer).strip())
            buffer = []
    if buffer:
        paragraphs.append(" ".join(buffer).strip())
    return [paragraph for paragraph in paragraphs if paragraph]


def load_reference_sections() -> dict[str, dict[str, object]]:
    """Load reference text grouped by optional headings from the artifact."""

    path = _find_artifact(Path("references") / "intensity_refs.txt")
    if path is None or not path.exists():
        return {}

    sections: dict[str, dict[str, object]] = {}
    current_key = _DEFAULT_REFERENCE_KEY
    collected_lines: list[str] = []

    def _flush(buffer_key: str, buffer: list[str]) -> None:
        if not buffer:
            return
        paragraphs = _split_paragraphs(buffer)
        existing = sections.setdefault(
            buffer_key,
            {
                "title": buffer_key if buffer_key != _DEFAULT_REFERENCE_KEY else "References",
                "paragraphs": [],
            },
        )
        existing_paragraphs = existing.setdefault("paragraphs", [])
        existing_paragraphs.extend(paragraphs)

    with path.open("r", encoding="utf-8") as handle:
        for raw_line in handle:
            line = raw_line.rstrip("\n")
            heading_match = next(
                (match for pattern in _heading_patterns if (match := pattern.match(line))),
                None,
            )
            if heading_match:
                _flush(current_key, collected_lines)
                collected_lines = []
                heading_key = heading_match.group("key")
                current_key = _normalise_key(heading_key)
                sections.setdefault(
                    current_key,
                    {"title": heading_key.strip(), "paragraphs": []},
                )
                continue
            collected_lines.append(line)

    _flush(current_key, collected_lines)

    if _DEFAULT_REFERENCE_KEY not in sections:
        sections[_DEFAULT_REFERENCE_KEY] = {"title": "References", "paragraphs": []}

    return sections


def functional_unit_options(
    records: Sequence[Mapping[str, object]], labels: Mapping[str, str]
) -> list[dict[str, object]]:
    """Return dropdown options based on the available intensity records."""

    seen: set[str] = set()
    options: list[dict[str, object]] = []
    for record in sorted(
        records, key=lambda item: labels.get(str(item.get("functional_unit_id")), "")
    ):
        fu_id = str(record.get("functional_unit_id"))
        if not fu_id or fu_id in seen:
            continue
        seen.add(fu_id)
        options.append({"label": labels.get(fu_id, fu_id), "value": fu_id})
    return options


def build_figure(
    records: Sequence[Mapping[str, object]],
    functional_unit_id: str | None,
    *,
    dark: bool = False,
    include_operations: bool = False,
) -> go.Figure:
    """Build the Plotly figure for the intensity leaderboard."""

    figure = apply_figure_layout_defaults(go.Figure())
    if not records:
        figure.update_layout(
            template=get_plotly_template(dark=dark),
            xaxis=dict(title="Alternative", type="category"),
            yaxis=dict(title="g/FU", rangemode="tozero"),
            showlegend=False,
        )
        figure.update_layout(**DENSE_LAYOUT)
        return figure

    visible_records = [
        record
        for record in records
        if include_operations or str(record.get("record_type") or "").lower() != "operation"
    ]

    if not visible_records:
        figure.update_layout(
            template=get_plotly_template(dark=dark),
            xaxis=dict(title="Alternative", type="category"),
            yaxis=dict(title="g/FU", rangemode="tozero"),
            showlegend=False,
        )
        figure.update_layout(**DENSE_LAYOUT)
        return figure

    if functional_unit_id:
        filtered = [
            record
            for record in visible_records
            if str(record.get("functional_unit_id")) == functional_unit_id
        ]
    else:
        filtered = list(visible_records)

    if not filtered:
        return build_figure(visible_records, None, dark=dark, include_operations=include_operations)

    filtered.sort(key=lambda item: _coerce_float(item.get("intensity")) or 0)

    plotted: list[Mapping[str, object]] = []
    intensities: list[float] = []
    reference_indices: list[list[int]] = []
    for record in filtered:
        value = _coerce_float(record.get("intensity"))
        if value is None:
            continue
        plotted.append(record)
        intensities.append(float(value))
        raw_indices = record.get("hover_reference_indices") or record.get("reference_indices")
        indices: list[int] = []
        if isinstance(raw_indices, Sequence):
            for entry in raw_indices:
                try:
                    number = int(entry)
                except (TypeError, ValueError):
                    continue
                if number not in indices:
                    indices.append(number)
        reference_indices.append(indices)

    if not plotted:
        figure.update_layout(
            template=get_plotly_template(dark=dark),
            xaxis=dict(title="Alternative", type="category"),
            yaxis=dict(title="g/FU", rangemode="tozero"),
            showlegend=False,
        )
        figure.update_layout(**DENSE_LAYOUT)
        return figure

    alternatives = [str(item.get("alternative")) for item in plotted]
    lows = [_coerce_float(item.get("low")) for item in plotted]
    highs = [_coerce_float(item.get("high")) for item in plotted]

    palette = get_palette(dark=dark)
    error_kwargs = None
    if any(low is not None for low in lows) or any(high is not None for high in highs):
        plus: list[float] = []
        minus: list[float] = []
        for intensity_value, low_value, high_value in zip(intensities, lows, highs):
            high_delta = 0.0
            if high_value is not None:
                high_delta = max(high_value - intensity_value, 0.0)
            low_delta = 0.0
            if low_value is not None:
                low_delta = max(intensity_value - low_value, 0.0)
            plus.append(high_delta)
            minus.append(low_delta)
        error_kwargs = dict(
            type="data",
            array=plus,
            arrayminus=minus,
            symmetric=False,
            color=palette.get("accent_strong", palette.get("positive")),
        )

    customdata: list[list[str]] = []
    for alternative, mean, low, high, indices, record in zip(
        alternatives, intensities, lows, highs, reference_indices, plotted
    ):
        value_text = _format_intensity_value(mean)
        intensity_line = f"Intensity: {value_text} g/FU"
        bounds = _format_bounds(mean, low, high)
        if bounds:
            intensity_line = f"{intensity_line} ({bounds})"
        scope_label = _format_scope_label(record.get("scope_boundary"))
        scope_line = f"<br>Scope: {scope_label}" if scope_label else ""
        region_label = _format_region_label(record.get("region"))
        region_line = f"<br>Region: {region_label}" if region_label else ""
        source_ids = _parse_source_ids(record.get("source_ids_csv"))
        source_line = format_source_summary(source_ids, indices)
        customdata.append(
            [
                alternative,
                intensity_line,
                scope_line,
                region_line,
                source_line,
            ]
        )

    custom_idx = ["[" + str(i) + "]" for i in range(5)]
    idx0, idx1, idx2, idx3, idx4 = custom_idx
    hover_template = (
        f"<b>%{{customdata{idx0}}}</b>"
        f"<br>%{{customdata{idx1}}}"
        f"%{{customdata{idx2}}}"
        f"%{{customdata{idx3}}}"
        f"<br>%{{customdata{idx4}}}"
        "<extra></extra>"
    )

    figure.add_trace(
        go.Bar(
            x=alternatives,
            y=intensities,
            marker=dict(color=palette.get("positive", "#2ca02c")),
            error_y=error_kwargs,
            hovertemplate=hover_template,
            customdata=customdata,
        )
    )

    figure.update_layout(
        template=get_plotly_template(dark=dark),
        xaxis=dict(title="Alternative", type="category", tickangle=-20, automargin=True),
        yaxis=dict(title="g/FU", rangemode="tozero"),
        showlegend=False,
    )
    figure.update_layout(**DENSE_LAYOUT)

    return figure


def status_message(
    records: Sequence[Mapping[str, object]],
    functional_unit_id: str | None,
    labels: Mapping[str, str],
    *,
    include_operations: bool = False,
) -> str:
    visible_records = [
        record
        for record in records
        if include_operations or str(record.get("record_type") or "").lower() != "operation"
    ]

    if not visible_records:
        return "No intensity data available."

    def _has_intensity(items: Sequence[Mapping[str, object]]) -> bool:
        return any(_coerce_float(item.get("intensity")) is not None for item in items)

    if functional_unit_id:
        relevant = [
            record
            for record in visible_records
            if str(record.get("functional_unit_id")) == functional_unit_id
        ]
        if not relevant or not _has_intensity(relevant):
            label = labels.get(functional_unit_id, functional_unit_id)
            return f"No intensity data available for {label}."
        return ""

    if not _has_intensity(visible_records):
        return "No intensity data available."

    return ""


def render_layout(
    options: Sequence[Mapping[str, object]],
    default_value: str | None,
    figure: go.Figure,
    references_children: Sequence[html.Component],
    *,
    status_text: str | None = None,
) -> html.Div:
    dropdown_kwargs = dict(
        id="intensity-functional-unit",
        options=list(options),
        placeholder="Select functional unit",
        clearable=False,
    )
    if default_value:
        dropdown_kwargs["value"] = default_value
    if not options:
        dropdown_kwargs["disabled"] = True

    return html.Div(
        className="intensity-view",
        children=[
            html.Section(
                className="chart-section chart-section--intensity",
                children=[
                    html.H2("Intensity leaderboard"),
                    html.Div(
                        className="chart-controls__group",
                        children=[
                            html.Label("Functional unit", htmlFor="intensity-functional-unit"),
                            dcc.Dropdown(**dropdown_kwargs),
                        ],
                    ),
                    html.Div(
                        className="chart-controls__group",
                        children=[
                            dcc.Checklist(
                                id="intensity-include-operations",
                                options=[
                                    {
                                        "label": "Include corporate operations",
                                        "value": "operations",
                                    }
                                ],
                                value=[],
                                inputStyle={"marginRight": "0.5rem"},
                                labelStyle={"display": "inline-flex", "alignItems": "center"},
                                className="chart-toggle",
                            ),
                        ],
                    ),
                    dcc.Graph(
                        id="intensity-figure",
                        figure=figure,
                        config={"displayModeBar": False, "responsive": True},
                        responsive=True,
                        style={"height": "420px"},
                        className="chart-figure",
                    ),
                    html.Div(
                        status_text or "",
                        id="intensity-status",
                        className="chart-status",
                    ),
                ],
            ),
            html.Aside(
                references_children,
                id="intensity-references",
                className="references-panel",
            ),
        ],
    )


def _candidate_reference_keys(
    functional_unit_id: str | None,
    labels: Mapping[str, str],
) -> Iterable[str]:
    if not functional_unit_id:
        return []
    label = labels.get(functional_unit_id)
    candidates = [functional_unit_id]
    if label:
        candidates.append(label)
    return candidates


def render_references_children(
    sections: Mapping[str, Mapping[str, object]] | None,
    functional_unit_id: str | None,
    labels: Mapping[str, str],
) -> list[html.Component]:
    if not sections:
        return [html.H2("References"), html.P("No references available.")]

    normalised_sections: dict[str, Mapping[str, object]] = {}
    for key, value in sections.items():
        if not isinstance(value, Mapping):
            continue
        normalised_sections[_normalise_key(key)] = value

    selected_section: Mapping[str, object] | None = None
    selected_key = _DEFAULT_REFERENCE_KEY

    for candidate in _candidate_reference_keys(functional_unit_id, labels):
        normalised = _normalise_key(candidate)
        if normalised in normalised_sections:
            selected_section = normalised_sections[normalised]
            selected_key = normalised
            break

    if selected_section is None:
        selected_section = normalised_sections.get(_DEFAULT_REFERENCE_KEY)
        selected_key = _DEFAULT_REFERENCE_KEY

    if selected_section is None:
        return [html.H2("References"), html.P("No references available.")]

    title = selected_section.get("title")
    if selected_key == _DEFAULT_REFERENCE_KEY:
        heading = "References"
    else:
        label = labels.get(functional_unit_id or "", "")
        if label:
            heading = f"References — {label}"
        elif isinstance(title, str) and title:
            heading = f"References — {title}"
        else:
            heading = "References"

    paragraphs = selected_section.get("paragraphs")
    if not isinstance(paragraphs, Sequence) or not paragraphs:
        return [html.H2(heading), html.P("No references available.")]

    items = [html.P(str(paragraph)) for paragraph in paragraphs]
    return [html.H2(heading), html.Div(items, className="references-list--plain")]


__all__ = [
    "build_figure",
    "functional_unit_options",
    "load_functional_unit_labels",
    "load_intensity_records",
    "load_reference_sections",
    "render_layout",
    "render_references_children",
    "status_message",
]
