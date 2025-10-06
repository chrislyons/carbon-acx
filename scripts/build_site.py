from __future__ import annotations

import argparse
import json
import shutil
from html import escape
from pathlib import Path
from typing import Mapping

import plotly.io as pio

from app.components import bubble as bubble_component
from app.components import sankey as sankey_component
from app.components import stacked as stacked_component
from app.components._helpers import extend_unique, has_na_sectors
from calc import citations
from calc.copy_blocks import disclosure_html, na_html
from ._artifact_paths import resolve_artifact_outputs

FIGURE_BUILDERS = {
    "stacked": stacked_component._build_figure,
    "bubble": bubble_component._build_figure,
    "sankey": sankey_component._build_figure,
}

FIGURE_TITLES = {
    "stacked": "Annual emissions by activity category",
    "bubble": "Activity bubble chart",
    "sankey": "Activity flow",
}

FIGURE_CLASSES = {
    "stacked": "chart-section chart-section--stacked",
    "bubble": "chart-section chart-section--bubble",
    "sankey": "chart-section chart-section--sankey",
}

FALLBACK_MESSAGES = {
    "stacked": "No category data available.",
    "bubble": "No activity data available.",
    "sankey": "No flow data available.",
}

PLOT_CONFIG = {"displayModeBar": False, "responsive": True}


def _load_json(path: Path) -> Mapping | None:
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def _artifact_reference_lookup(
    figures: dict[str, Mapping | None],
) -> tuple[dict[str, int], list[str]]:
    reference_keys: list[str] = []
    for payload in figures.values():
        if not payload:
            continue
        extend_unique(payload.get("citation_keys", []), reference_keys)

    lookup = {
        ref.key: idx for idx, ref in enumerate(citations.references_for(reference_keys), start=1)
    }
    references = [
        citations.format_ieee(ref.numbered(idx))
        for idx, ref in enumerate(citations.references_for(reference_keys), start=1)
    ]
    return lookup, references


def _copy_assets(destination: Path) -> None:
    project_root = Path(__file__).resolve().parent.parent
    css_source = project_root / "app" / "assets" / "styles.css"
    if css_source.exists():
        shutil.copy2(css_source, destination / "styles.css")
    site_assets = project_root / "site" / "assets"
    if site_assets.exists():
        for asset in site_assets.iterdir():
            if asset.is_file():
                shutil.copy2(asset, destination / asset.name)
    site_js = project_root / "site" / "js"
    if site_js.exists():
        js_target = destination / "js"
        js_target.mkdir(parents=True, exist_ok=True)
        for asset in site_js.iterdir():
            if asset.is_file():
                shutil.copy2(asset, js_target / asset.name)


def _copy_data_artifacts(artifact_dir: Path, destination: Path) -> None:
    if not artifact_dir.exists():
        return
    if destination.exists():
        shutil.rmtree(destination)
    shutil.copytree(artifact_dir, destination)


def _format_manifest_summary(manifest: Mapping | None) -> str:
    if not manifest:
        return ""

    generated_at = manifest.get("generated_at")
    regions = manifest.get("regions") or []
    vintages = manifest.get("vintages") or {}
    sources = manifest.get("sources") or []
    matrix_raw = manifest.get("vintage_matrix") or {}

    summary_items: list[str] = []
    if generated_at:
        summary_items.append(f"<li><strong>Generated at:</strong> {escape(str(generated_at))}</li>")
    if regions:
        joined_regions = ", ".join(str(region) for region in regions)
        summary_items.append(f"<li><strong>Regions:</strong> {escape(joined_regions)}</li>")
    if vintages:
        ef = vintages.get("emission_factors") or []
        grid = vintages.get("grid_intensity") or []
        if ef:
            summary_items.append(
                f"<li><strong>Emission factor vintages:</strong> {escape(', '.join(map(str, ef)))}"  # noqa: B950
                "</li>"
            )
        if grid:
            summary_items.append(
                f"<li><strong>Grid intensity vintages:</strong> {escape(', '.join(map(str, grid)))}"  # noqa: B950
                "</li>"
            )
    if sources:
        summary_items.append(f"<li><strong>Total sources:</strong> {len(sources)}</li>")

    if not summary_items:
        summary_items.append("<li>No manifest metadata available.</li>")

    matrix_entries: list[tuple[str, int]] = []
    if isinstance(matrix_raw, Mapping):
        for region, year in matrix_raw.items():
            if region is None or year is None:
                continue
            try:
                matrix_entries.append((str(region), int(year)))
            except (TypeError, ValueError):
                continue

    matrix_entries.sort(key=lambda item: item[0])

    sections: list[str] = []

    summary_html = (
        '<section class="sidebar-section manifest-panel">'
        "<h3>Dataset manifest</h3>"
        '<ul class="manifest-panel__list">' + "".join(summary_items) + "</ul>"
        "</section>"
    )
    sections.append(summary_html)

    if matrix_entries:
        rows = "".join(
            '<li><span class="vintages-panel__region">'
            + escape(region)
            + '</span><span class="vintages-panel__year">'
            + escape(str(year))
            + "</span></li>"
            for region, year in matrix_entries
        )
        matrix_html = (
            '<section class="sidebar-section vintages-panel">'
            "<h3>Grid vintages</h3>"
            '<p class="sidebar-section__description">Latest grid intensity vintage year per region.</p>'
            '<ul class="vintages-list">' + rows + "</ul>"
            "</section>"
        )
        sections.append(matrix_html)

    return "".join(sections)


def build_site(artifact_dir: Path, output_dir: Path) -> Path:
    artifact_dir = resolve_artifact_outputs(artifact_dir)

    output_dir.mkdir(parents=True, exist_ok=True)
    _copy_assets(output_dir)
    _copy_data_artifacts(artifact_dir, output_dir / "data")

    figures: dict[str, Mapping | None] = {}
    for name in FIGURE_BUILDERS:
        figures[name] = _load_json(artifact_dir / "figures" / f"{name}.json")

    reference_lookup, references = _artifact_reference_lookup(figures)
    manifest = _load_json(artifact_dir / "manifest.json")

    sections: list[str] = []
    include_plotlyjs = True
    figure_download_dir = output_dir / "figures"
    reference_download_dir = output_dir / "references"
    for name, builder in FIGURE_BUILDERS.items():
        payload = figures.get(name) or {}
        figure = builder(payload, reference_lookup)  # type: ignore[arg-type]
        if getattr(figure, "data", None):
            graph_html = pio.to_html(
                figure,
                include_plotlyjs="cdn" if include_plotlyjs else False,
                full_html=False,
                config=PLOT_CONFIG,
            )
            include_plotlyjs = False
        else:
            message = FALLBACK_MESSAGES.get(name, "No data available.")
            graph_html = f"<p>{escape(message)}</p>"
        footnotes: list[str] = []
        if has_na_sectors(payload):
            footnotes.append(na_html())

        downloads: list[str] = []
        figure_src = artifact_dir / "figures" / f"{name}.json"
        if figure_src.exists():
            figure_download_dir.mkdir(parents=True, exist_ok=True)
            figure_dest = figure_download_dir / figure_src.name
            shutil.copy2(figure_src, figure_dest)
            downloads.append(
                f'<a class="chart-downloads__button" download href="figures/{figure_src.name}">Download figure JSON</a>'
            )
        reference_src = artifact_dir / "references" / f"{name}_refs.txt"
        if reference_src.exists():
            reference_download_dir.mkdir(parents=True, exist_ok=True)
            reference_dest = reference_download_dir / reference_src.name
            shutil.copy2(reference_src, reference_dest)
            downloads.append(
                f'<a class="chart-downloads__button" download href="references/{reference_src.name}">Download references</a>'
            )
        downloads_html = (
            '<div class="chart-downloads">' + "".join(downloads) + "</div>" if downloads else ""
        )

        section_parts = [
            f'<section class="{FIGURE_CLASSES[name]} card" data-loading="false">',
            '<div class="skeleton skeleton--chart" aria-hidden="true"></div>',
            '<div class="card__content">',
            f"<h2>{escape(FIGURE_TITLES[name])}</h2>",
        ]
        if downloads_html:
            section_parts.append(downloads_html)
        section_parts.append(f'<div class="chart-section__figure">{graph_html}</div>')
        section_parts.extend(footnotes)
        section_parts.append("</div></section>")
        sections.append("".join(section_parts))

    if references:
        reference_items = "".join(
            f'<li data-reference-index="{idx}">{escape(text)}</li>'
            for idx, text in enumerate(references, start=1)
        )
    else:
        reference_items = "<li>No references available.</li>"

    manifest_section = _format_manifest_summary(manifest)

    hero_subtitle = (
        "Figures sourced from precomputed artifacts. Hover a chart to see supporting references."
    )
    brand_block = (
        '<div class="page-header__brand">'
        '<span class="brand-mark" aria-hidden="true">CA</span>'
        '<div class="page-header__titles">'
        '<p class="page-eyebrow">Carbon ACX</p>'
        "<h1>Carbon ACX emissions overview</h1>"
        f'<p class="page-subtitle">{hero_subtitle}</p>'
        "</div>"
        "</div>"
    )
    generated_meta = ""
    if manifest and manifest.get("generated_at"):
        generated_meta = f"<p class=\"page-meta generated-at\">Last generated: {escape(str(manifest['generated_at']))}</p>"

    header_html = (
        '<header class="page-header card">'
        '<div class="card__content">'
        + brand_block
        + disclosure_html(manifest)
        + generated_meta
        + "</div></header>"
    )

    html = (
        "<!DOCTYPE html>"
        '<html lang="en">'
        "<head>"
        '<meta charset="utf-8" />'
        '<meta name="viewport" content="width=device-width, initial-scale=1" />'
        '<base href="./" />'
        "<title>Carbon ACX emissions overview</title>"
        '<link rel="stylesheet" href="fonts.css" />'
        '<link rel="stylesheet" href="styles.css" />'
        '<script src="js/app.js" defer></script>'
        "</head>"
        "<body>"
        '<div class="page-shell">' + header_html + '<div class="layout-grid">'
        '<main class="main-column chart-column">' + "".join(sections) + "</main>"
        '<div class="sidebar">'
        '<aside class="references-panel card sticky" data-loading="false">'
        '<div class="skeleton skeleton--panel" aria-hidden="true"></div>'
        '<div class="card__content">'
        "<h2>References</h2>"
        '<ol class="references-list">'
        + reference_items
        + "</ol>"
        + manifest_section
        + "</div></aside></div></div>"
        "</body>"
        "</html>"
    )

    index_path = output_dir / "index.html"
    index_path.write_text(html, encoding="utf-8")

    fallback_path = output_dir / "200.html"
    fallback_path.write_text(html, encoding="utf-8")

    return index_path


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Build a static site for Cloudflare Pages deployment."
    )
    parser.add_argument(
        "--artifacts",
        default="dist/artifacts",
        type=Path,
        help="Path to derived artifact directory",
    )
    parser.add_argument(
        "--output", default="build/site", type=Path, help="Output directory for the static site"
    )
    args = parser.parse_args()

    index_path = build_site(args.artifacts, args.output)
    print(f"Wrote static site to {index_path}")


if __name__ == "__main__":
    main()
