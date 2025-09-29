from __future__ import annotations

import io
from dataclasses import asdict
from pathlib import Path

import pandas as pd
import plotly.io as pio
import pytest
from PIL import Image

from app.components import bubble as bubble_component
from app.components import sankey as sankey_component
from app.components import stacked as stacked_component
from calc import figures

_CANONICAL_ROWS = [
    {
        "activity_id": "coffee_hot",
        "activity_name": "Coffee – hot cup",
        "activity_category": "Food",
        "layer_id": "professional",
        "annual_emissions_g": 1240.0,
        "annual_emissions_g_low": 980.0,
        "annual_emissions_g_high": 1500.0,
    },
    {
        "activity_id": "commute_bus",
        "activity_name": "Commute by bus",
        "activity_category": "Travel",
        "layer_id": "professional",
        "annual_emissions_g": 860.0,
        "annual_emissions_g_low": 740.0,
        "annual_emissions_g_high": 980.0,
    },
    {
        "activity_id": "stream_tv",
        "activity_name": "Stream HD TV",
        "activity_category": "Media",
        "layer_id": "online",
        "annual_emissions_g": 1815.0,
        "annual_emissions_g_low": 1650.0,
        "annual_emissions_g_high": 2050.0,
    },
]

_CITATION_KEYS = ["SRC.COFFEE", "SRC.BUS", "SRC.STREAM"]
_HASH_SIZE = 8
_HASH_TOLERANCE = 6
_EXPECTED_HASHES = {
    "stacked": 0xFF07878F8F8101FF,
    "bubble": 0xFFFC3E3F677FFFE6,
    "sankey": 0xFF80BD80BD8080FF,
}


def _reference_lookup() -> dict[str, int]:
    return {key: idx for idx, key in enumerate(_CITATION_KEYS, start=1)}


def _stacked_reference_map() -> dict[tuple[str | None, str], tuple[list[str], list[int]]]:
    return {
        ("professional", "Food"): (["SRC.COFFEE"], [1]),
        ("professional", "Travel"): (["SRC.BUS"], [2]),
        ("online", "Media"): (["SRC.STREAM"], [3]),
    }


def _bubble_reference_map() -> dict[tuple[str | None, str], tuple[list[str], list[int]]]:
    return {
        ("professional", "coffee_hot"): (["SRC.COFFEE"], [1]),
        ("professional", "commute_bus"): (["SRC.BUS"], [2]),
        ("online", "stream_tv"): (["SRC.STREAM"], [3]),
    }


def _sankey_reference_map() -> dict[tuple[str | None, str, str], tuple[list[str], list[int]]]:
    return {
        ("professional", "Food", "coffee_hot"): (["SRC.COFFEE"], [1]),
        ("professional", "Travel", "commute_bus"): (["SRC.BUS"], [2]),
        ("online", "Media", "stream_tv"): (["SRC.STREAM"], [3]),
    }


def _perceptual_hash(image_bytes: bytes, size: int = _HASH_SIZE) -> int:
    with Image.open(io.BytesIO(image_bytes)) as img:
        if hasattr(Image, "Resampling"):
            resample = Image.Resampling.LANCZOS
        else:  # pragma: no cover - Pillow < 9 compatibility
            resample = Image.LANCZOS
        resized = img.convert("L").resize((size, size), resample)
        pixels = list(resized.getdata())
    avg = sum(pixels) / len(pixels)
    digest = 0
    for value in pixels:
        digest = (digest << 1) | int(value >= avg)
    return digest


def _hamming_distance(lhs: int, rhs: int) -> int:
    return (lhs ^ rhs).bit_count()


def _render_and_hash(name: str, figure, out_dir: Path) -> tuple[Path, int]:
    out_dir.mkdir(parents=True, exist_ok=True)
    image_bytes = pio.to_image(
        figure, format="png", engine="kaleido", width=960, height=540, scale=1
    )
    output_path = out_dir / f"{name}.png"
    output_path.write_bytes(image_bytes)
    return output_path, _perceptual_hash(image_bytes)


@pytest.mark.parametrize(
    "name, builder",
    [
        ("stacked", stacked_component._build_figure),
        ("bubble", bubble_component._build_figure),
        ("sankey", sankey_component._build_figure),
    ],
)
def test_canonical_figures_render_within_hash_bounds(name: str, builder, tmp_path: Path) -> None:
    df = pd.DataFrame(_CANONICAL_ROWS)
    reference_lookup = _reference_lookup()

    stacked_payload = {"data": figures.slice_stacked(df, reference_map=_stacked_reference_map())}
    bubble_payload = {
        "data": [
            asdict(point)
            for point in figures.slice_bubble(df, reference_map=_bubble_reference_map())
        ]
    }
    sankey_payload = {"data": figures.slice_sankey(df, reference_map=_sankey_reference_map())}

    payloads = {
        "stacked": stacked_payload,
        "bubble": bubble_payload,
        "sankey": sankey_payload,
    }

    figure = builder(payloads[name], reference_lookup)
    output_dir = tmp_path / "visual"
    path, digest = _render_and_hash(name, figure, output_dir)

    assert path.exists()
    expected = _EXPECTED_HASHES[name]
    if expected == 0:
        pytest.fail(
            "Expected hash placeholder not updated. Capture the test output and set _EXPECTED_HASHES accordingly."
        )
    distance = _hamming_distance(digest, expected)
    assert (
        distance <= _HASH_TOLERANCE
    ), f"{name} visual hash deviated by {distance} bits (tolerance {_HASH_TOLERANCE})"
