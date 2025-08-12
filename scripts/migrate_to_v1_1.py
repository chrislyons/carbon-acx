#!/usr/bin/env python3
"""Migrate demo CSVs to the v1.1 schema.

The script reads the CSV files in ``data/`` and, when they appear to be in
an older demo format, emits new files matching the v1.1 headers.  If files
already conform to v1.1 they are rewritten unchanged, keeping the migration
idempotent.  A short summary of row counts is printed for each file.
"""
from __future__ import annotations

import csv
from pathlib import Path
from typing import Iterable, Dict

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def _read(path: Path):
    if not path.exists():
        return [], []
    with path.open(newline="") as f:
        r = csv.DictReader(f)
        return list(r), r.fieldnames or []


def _write(path: Path, header: Iterable[str], rows):
    with path.open("w", newline="") as f:
        w = csv.DictWriter(f, header)
        w.writeheader()
        w.writerows(rows)


def migrate_activities() -> int:
    rows, header = _read(DATA_DIR / "activities.csv")
    new_header = ["activity_id","category","name","default_unit","description","unit_definition","notes"]
    if header == new_header:
        _write(DATA_DIR / "activities.csv", new_header, rows)
        return len(rows)
    out = []
    for r in rows:
        aid = r.get("activity_id")
        if aid == "coffee":
            out.append({
                "activity_id":"FOOD.COFFEE.CUP.HOT",
                "category":"food",
                "name":"Coffee—12 oz hot",
                "default_unit":"cup",
                "description":"Cup of coffee",
                "unit_definition":"",
                "notes":"",
            })
        else:
            out.append({
                "activity_id":aid or "",
                "category":"",
                "name":aid or "",
                "default_unit":"",
                "description":r.get("description",""),
                "unit_definition":"",
                "notes":"",
            })
    _write(DATA_DIR / "activities.csv", new_header, out)
    return len(out)


def migrate_emission_factors() -> int:
    rows, header = _read(DATA_DIR / "emission_factors.csv")
    new_header = ["ef_id","activity_id","unit","value_g_per_unit","is_grid_indexed","electricity_kwh_per_unit","electricity_kwh_per_unit_low","electricity_kwh_per_unit_high","region","scope_boundary","gwp_horizon","vintage_year","source_id","method_notes","uncert_low_g_per_unit","uncert_high_g_per_unit"]
    if header == new_header:
        _write(DATA_DIR / "emission_factors.csv", new_header, rows)
        return len(rows)
    out = []
    for r in rows:
        aid = r.get("activity_id")
        if aid == "coffee":
            out.append({
                "ef_id":"EF.DEMO.COFFEE.FIXED",
                "activity_id":"FOOD.COFFEE.CUP.HOT",
                "unit":"cup",
                "value_g_per_unit":r.get("value_g_per_unit",""),
                "is_grid_indexed":"",
                "electricity_kwh_per_unit":"",
                "electricity_kwh_per_unit_low":"",
                "electricity_kwh_per_unit_high":"",
                "region":"",
                "scope_boundary":"cradle-to-grave",
                "gwp_horizon":"GWP100 (AR6)",
                "vintage_year":"2025",
                "source_id":"SRC.DEMO",
                "method_notes":"",
                "uncert_low_g_per_unit":"",
                "uncert_high_g_per_unit":"",
            })
        else:
            out.append({
                "ef_id":f"EF.DEMO.{(aid or '').upper()}",
                "activity_id":aid or "",
                "unit":"",
                "value_g_per_unit":r.get("value_g_per_unit",""),
                "is_grid_indexed":r.get("is_grid_indexed",""),
                "electricity_kwh_per_unit":r.get("electricity_kwh_per_unit",""),
                "electricity_kwh_per_unit_low":"",
                "electricity_kwh_per_unit_high":"",
                "region":"",
                "scope_boundary":"",
                "gwp_horizon":"",
                "vintage_year":"",
                "source_id":"",
                "method_notes":"",
                "uncert_low_g_per_unit":"",
                "uncert_high_g_per_unit":"",
            })
    _write(DATA_DIR / "emission_factors.csv", new_header, out)
    return len(out)


def migrate_profiles() -> int:
    rows, header = _read(DATA_DIR / "profiles.csv")
    new_header = ["profile_id","name","region_code_default","grid_strategy","grid_mix_json","cohort_id","office_days_per_week","assumption_notes"]
    if header == new_header:
        ids = {r["profile_id"] for r in rows}
        if "PRO.TO.40_56.HYBRID.2025" not in ids:
            rows.append({
                "profile_id":"PRO.TO.40_56.HYBRID.2025",
                "name":"Toronto Pros 40–56 — Hybrid (2025)",
                "region_code_default":"CA-ON",
                "grid_strategy":"region_default",
                "grid_mix_json":"",
                "cohort_id":"",
                "office_days_per_week":"3",
                "assumption_notes":"",
            })
        _write(DATA_DIR / "profiles.csv", new_header, rows)
        return len(rows)
    out = []
    for r in rows:
        if r.get("profile_id") == "p1":
            out.append({
                "profile_id":"PRO.TO.24_39.HYBRID.2025",
                "name":"Toronto Pros 24–39 — Hybrid (2025)",
                "region_code_default":"CA-ON",
                "grid_strategy":"region_default",
                "grid_mix_json":"",
                "cohort_id":"",
                "office_days_per_week":r.get("office_days_per_week",""),
                "assumption_notes":"",
            })
    out.append({
        "profile_id":"PRO.TO.40_56.HYBRID.2025",
        "name":"Toronto Pros 40–56 — Hybrid (2025)",
        "region_code_default":"CA-ON",
        "grid_strategy":"region_default",
        "grid_mix_json":"",
        "cohort_id":"",
        "office_days_per_week":"3",
        "assumption_notes":"",
    })
    _write(DATA_DIR / "profiles.csv", new_header, out)
    return len(out)


def migrate_schedule() -> int:
    rows, header = _read(DATA_DIR / "activity_schedule.csv")
    new_header = ["profile_id","activity_id","freq_per_day","freq_per_week","office_days_only","region_override","schedule_notes"]
    if header == new_header:
        _write(DATA_DIR / "activity_schedule.csv", new_header, rows)
        return len(rows)
    out = []
    for r in rows:
        if r.get("profile_id") == "p1" and r.get("activity_id") == "coffee":
            out.append({
                "profile_id":"PRO.TO.24_39.HYBRID.2025",
                "activity_id":"FOOD.COFFEE.CUP.HOT",
                "freq_per_day":"",
                "freq_per_week":r.get("quantity_per_week",""),
                "office_days_only":str(r.get("office_only","" )).upper(),
                "region_override":"",
                "schedule_notes":"",
            })
        elif r.get("activity_id") in {"stream","streaming"}:
            out.append({
                "profile_id":"PRO.TO.24_39.HYBRID.2025",
                "activity_id":"MEDIA.STREAM.HD.HOUR.TV",
                "freq_per_day":"",
                "freq_per_week":r.get("quantity_per_week",""),
                "office_days_only":"",
                "region_override":"",
                "schedule_notes":"",
            })
    _write(DATA_DIR / "activity_schedule.csv", new_header, out)
    return len(out)


def migrate_sources() -> int:
    rows, header = _read(DATA_DIR / "sources.csv")
    new_header = ["source_id","ieee_citation","url","year","license"]
    if header != new_header:
        rows = [{"source_id":r.get("source_id",""),"ieee_citation":r.get("description",""),"url":"","year":"","license":""} for r in rows]
    ids = {r["source_id"] for r in rows}
    required = [
        ("SRC.DEMO","[1] Demo, “Demonstration placeholder reference,” 2025. Available: https://example.org/demo","https://example.org/demo","2025"),
        ("SRC.DIMPACT.2021","[2] Carbon Trust and DIMPACT, “The Carbon Impact of Video Streaming,” 2021. Available: https://dimpact.org/resources","https://dimpact.org/resources","2021"),
        ("SRC.IESO.2024","[3] Independent Electricity System Operator (IESO), “Emissions and Grid Intensity (Ontario)—Data and Reports,” 2024. Available: https://www.ieso.ca/en/Power-Data/Data-Directory","https://www.ieso.ca/en/Power-Data/Data-Directory","2024"),
    ]
    for sid,cit,url,year in required:
        if sid not in ids:
            rows.append({"source_id":sid,"ieee_citation":cit,"url":url,"year":year,"license":""})
    _write(DATA_DIR / "sources.csv", new_header, rows)
    return len(rows)


def migrate_grid() -> int:
    rows, header = _read(DATA_DIR / "grid_intensity.csv")
    new_header = ["region_code","vintage_year","g_per_kwh","g_per_kwh_low","g_per_kwh_high","source_id"]
    if header == new_header:
        _write(DATA_DIR / "grid_intensity.csv", new_header, rows)
        return len(rows)
    out = []
    for r in rows:
        if r.get("region_profile") == "CA-ON":
            out.append({"region_code":"CA-ON","vintage_year":"2024","g_per_kwh":r.get("g_per_kwh",""),"g_per_kwh_low":"","g_per_kwh_high":"","source_id":"SRC.IESO.2024"})
    out.append({"region_code":"CA","vintage_year":"","g_per_kwh":"","g_per_kwh_low":"","g_per_kwh_high":"","source_id":""})
    _write(DATA_DIR / "grid_intensity.csv", new_header, out)
    return len(out)


def write_units() -> int:
    header = ["unit_code","unit_type","si_conversion_factor","notes"]
    rows = [
        {"unit_code":"cup","unit_type":"volume","si_conversion_factor":"0.000236588","notes":""},
        {"unit_code":"hour","unit_type":"time","si_conversion_factor":"3600","notes":""},
        {"unit_code":"km","unit_type":"length","si_conversion_factor":"1000","notes":""},
        {"unit_code":"kWh","unit_type":"energy","si_conversion_factor":"3600000","notes":""},
        {"unit_code":"GB","unit_type":"data","si_conversion_factor":"1000000000","notes":""},
        {"unit_code":"L","unit_type":"volume","si_conversion_factor":"0.001","notes":""},
        {"unit_code":"participant-hour","unit_type":"participation","si_conversion_factor":"3600","notes":""},
        {"unit_code":"1k_tokens","unit_type":"data","si_conversion_factor":"1000","notes":""},
        {"unit_code":"image","unit_type":"count","si_conversion_factor":"1","notes":""},
    ]
    _write(DATA_DIR / "units.csv", header, rows)
    return len(rows)


def main():
    counts = {
        "activities": migrate_activities(),
        "emission_factors": migrate_emission_factors(),
        "profiles": migrate_profiles(),
        "activity_schedule": migrate_schedule(),
        "sources": migrate_sources(),
        "grid_intensity": migrate_grid(),
        "units": write_units(),
    }
    for name, n in counts.items():
        print(f"{name}.csv: {n} rows")


if __name__ == "__main__":
    main()
