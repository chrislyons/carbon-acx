from __future__ import annotations

from pathlib import Path

import pandas as pd
import yaml

from . import figures, citations, schema


def load_config(path: Path) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


def grid_intensity_value(
    profile_id: str, profiles: pd.DataFrame, grid: pd.DataFrame
) -> float | None:
    profile = profiles.set_index("id").loc[profile_id]
    row = grid[grid["profile_id"] == profile_id]
    region = row["region_override"].iloc[0] if not row.empty else None
    mix = row["mix_weighted"].iloc[0] if not row.empty else None
    canada = row["canada_average"].iloc[0] if not row.empty else None
    for val in [region, mix, canada, profile.get("default_grid_intensity_g_per_kwh")]:
        if val not in (None, ""):
            return float(val)
    return None


def compute_export_view(data_dir: Path, outputs_dir: Path, config_path: Path) -> pd.DataFrame:
    cfg = load_config(config_path)
    emission_factors = schema.load_emission_factors(data_dir / "emission_factors.csv")
    profiles = schema.load_profiles(data_dir / "profiles.csv")
    schedule = schema.load_activity_schedule(data_dir / "activity_schedule.csv")
    schema.load_sources(data_dir / "sources.csv")
    grid = schema.load_grid_intensity(data_dir / "grid_intensity.csv")

    merged = schedule.merge(emission_factors, on="activity_id", how="left", suffixes=("", "_ef"))
    merged = merged.merge(profiles, left_on="profile_id", right_on="id", how="left")

    weeks_per_year = cfg["weeks_per_year"]
    merged["annual_frequency"] = merged.apply(
        lambda r: r["frequency_per_day"]
        * (r["office_days_per_week"] * weeks_per_year if r["is_office_day"] else 365),
        axis=1,
    )

    def calc_row(r):
        if r["value_g_per_unit"] is not None:
            return r["annual_frequency"] * r["units_per_activity"] * r["value_g_per_unit"]
        if r["is_grid_indexed"]:
            intensity = grid_intensity_value(r["profile_id"], profiles, grid)
            if intensity is None or r["electricity_kwh_per_unit"] is None:
                return None
            return (
                r["annual_frequency"]
                * r["units_per_activity"]
                * r["electricity_kwh_per_unit"]
                * intensity
            )
        return None

    merged["annual_emission_g"] = merged.apply(calc_row, axis=1)
    merged["annual_emission_g"] = (
        merged["annual_emission_g"]
        .astype(object)
        .where(pd.notnull(merged["annual_emission_g"]), None)
    )

    export_view = merged[["profile_id", "activity_id", "annual_frequency", "annual_emission_g"]]
    outputs_dir.mkdir(parents=True, exist_ok=True)
    export_view.to_csv(outputs_dir / "export_view.csv", index=False)
    export_view.to_json(outputs_dir / "export_view.json", orient="records")

    figs_dir = outputs_dir / "figures"
    figs_dir.mkdir(exist_ok=True)
    fig_data = {
        "stacked": figures.stacked(export_view),
        "bubble": figures.bubble(export_view),
        "sankey": figures.sankey(export_view),
    }
    for name, df in fig_data.items():
        df.to_csv(figs_dir / f"{name}.csv", index=False)
        df.to_json(figs_dir / f"{name}.json", orient="records")

    citations_dir = outputs_dir / "references"
    citations.create_citations(citations_dir, cfg.get("citations", {}))

    return export_view


def run() -> None:
    base = Path(__file__).resolve().parent
    data_dir = base.parent / "data"
    outputs_dir = base / "outputs"
    config_path = base / "config.yaml"
    compute_export_view(data_dir, outputs_dir, config_path)


if __name__ == "__main__":
    run()
