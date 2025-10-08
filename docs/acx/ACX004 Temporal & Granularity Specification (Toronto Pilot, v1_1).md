# **ACX004 Temporal & Granularity Specification (Toronto Pilot, v1.1)**

**Purpose**

Define the temporal model for **carbon-acx**: reference year, time units, aggregation rules, uncertainty handling, telemetry integration, and output conventions. This specification governs how raw activities and emission factors (EFs) are transformed into daily/weekly/annual footprints for the Toronto/Ontario pilot and future national scaling.

***

## **1. Scope and Principles**

- **Reference year (pilot):** **2025**. All factors, schedules, and outputs are anchored to 2025 unless a row explicitly sets vintage_year.
- **Null-first discipline:** Unknown timing parameters are **NULL** (blank), never zero. Absence of data must not imply zero emissions.
- **Deterministic, idempotent builds:** Given the same CSVs, make build must produce identical outputs bit-for-bit.
- **Event semantics → daily core:** The core computational unit is **daily** per activity per profile. Event-level inputs are optional and, when present, roll up to daily before further aggregation.

***

## **2. Time Axes and Resolutions**

### **2.1 Canonical resolutions (allowed computational layers)**

- **Event:** Optional. A discrete occurrence of an activity (e.g., one commute trip, one conference call). Only used if telemetry or fine logs exist.
- **Daily (canonical):** Required. The minimal agreed unit for downstream aggregation and visualization.
- **Weekly:** Derived convenience view (7× daily), used for comparing to schedules expressed per week.
- **Monthly:** Optional; used for calendar storytelling and seasonality checks.
- **Annual:** Required; the primary reporting horizon for totals and comparisons.

### **2.2 Calendar conventions**

- **Timezone:** America/Toronto.
- **Leap day:** Treat 2025 as non-leap; general rule is days_in_year = 365 or 366 by actual calendar.
- **DST transitions:** Only relevant for **event** or **hourly** telemetry aggregation; daily totals ignore DST shifts.

***

## **3. Inputs That Carry Temporal Information**

- **activity_schedule.csv**
    - freq_per_day **xor** freq_per_week. If both present → validation error. If both NULL → row is inert.
    - office_days_only (bool): When TRUE, frequencies only apply to counted **office days** (see §4).
    - region_override (optional): Temporal aggregation may use a different grid series than the profile default (e.g., separate municipal supply or facility sub-meter data).
- **emission_factors.csv**
    - vintage_year (int, ≤ current year): Governs temporal applicability of the EF.
    - **Fixed EF path**: value_g_per_unit (central) with optional uncert_low_g_per_unit and uncert_high_g_per_unit.
    - **Grid-indexed EF path**: is_grid_indexed=True with electricity_kwh_per_unit (and optional low/high) multiplied by a grid intensity time series (see §5).
- **grid_intensity.csv**
    - Minimal requirement is **annual** values (g_per_kwh, optional low/high).
    - Implementation may support higher-resolution time series later (monthly, daily, hourly) without schema changes by precomputing mixes in derive.py.

***

## **4. Office-Day Weighting (Work Patterns)**

Some activities (commuting, office equipment, on-prem processes) depend on **office attendance**. The following rules apply:

- Each profile may define office_days_per_week (float, e.g., 3).
- If office_days_only=TRUE, an activity’s weekly volume is:
    - If defined **per day**: freq_per_day × office_days_per_week.
    - If defined **per week**: freq_per_week is assumed already office-weighted and is used as-is.
- Office-day totals roll up:
    - Daily view: distribute evenly across the counted office days in a week unless a schedule provides a calendar (future extension).
    - Annualization: multiply weekly values by **52.142857** (365 / 7; use 366/7 in leap years).

***

## **5. Grid-Indexed Calculations and Temporal Mixing**

When is_grid_indexed=True, the EF is computed as:

```javascript
EF_fixed(t)  = NULL
EF_grid(t)   = electricity_kwh_per_unit(t) × GI(t)
```

where GI(t) is the grid intensity at time resolution **t**.

**Resolution strategy (pilot):**

- **Annual GI:** For Ontario (CA-ON) in 2025, use **annual** g_per_kwh (and optional bounds) as the default temporal series.
- **Monthly/Daily/Hourly GI (future):** If provided for a region, derive.py can integrate those series by averaging at the daily layer:
    1. Compute kWh_per_day for the activity from schedule.
    2. Multiply by daily GI_d and sum across days.

**Precedence for regional selection:**

```javascript
region_override (row) 
> profile.grid_strategy mix (if implemented) 
> profile.region_code_default 
> CA (national average)
```

**Bounds propagation (grid-indexed):**

- If electricity_kwh_per_unit_low/high **or** g_per_kwh_low/high are present, compute daily low/mean/high by consistent pairing (low×low, mean×mean, high×high). Store low/mean/high at the daily layer and carry through to weekly/annual.

***

## **6. From Schedules to Daily, Weekly, Annual**

Let:

- U = activity unit (e.g., km, hour, cup).
- F_d = freq_per_day (if present).
- F_w = freq_per_week (if present).
- OD = office_days_per_week (profile-level, may be NULL).
- O = office_days_only (bool).

**Step A — Normalize to weekly units**

- If F_d present:
    - If O=TRUE: W = F_d × OD
    - Else:         W = F_d × 7
- Else if F_w present: W = F_w
- Else: row inert.

**Step B — Daily core**

- If O=TRUE and OD known:
    - D = W / OD on office days; zero on non-office days.
    - For daily exports without calendar, store **average office-day daily** and set non-office days as NULL (not zero).
- Else:
    - D = W / 7 uniformly.

**Step C — Annualization**

- Annual total A = W × 52.142857 (non-leap).
- Bounds (low, high) scale identically to the central estimate.

***

## **7. Uncertainty Scheduling and Propagation**

At any layer (fixed EF or grid-indexed), if bounds exist:

- **Addition** (summing activities): add low to low, mean to mean, high to high.
- **Scalar multiply** (frequency or kWh factor): multiply each of low/mean/high by the scalar.
- **Rounding for display:** Apply rounding only at the **final presentation** layer; keep full precision in intermediate CSV/JSON.

***

## **8. Telemetry / Metered Data (Optional in Pilot)**

The pipeline supports **Modeled** and **Metered** data without schema changes:

- Tag rows via method note conventions (e.g., “metered interval [start,end]”).
- Metered series (e.g., kWh by day) override scheduled estimates for the same activity/profile/period.
- When telemetry is partial (e.g., selected weeks), model fills gaps; reports must disclose coverage in the References pane.

Metered integration requires consistent units and the same **daily core layer** for aggregation.

***

## **9. Output Contracts (per build)**

- **Daily CSV/JSON** for each profile/activity with fields:
    - profile_id, activity_id, date, unit, value, value_low, value_high, method (Modeled/Metered), region_effective, notes
- **Weekly/Annual summaries** derived from the daily core; identical field names but with period instead of date.
- **Metadata:** prepend to CSV and embed in JSON:
    - generated_at (ISO 8601 UTC), method=v1.1, reference_year=2025.
- **References per figure** remain in calc/outputs/references/ with strict ordering [1]..[n].

***

## **10. Worked Examples (Pilot Defaults)**

### **10.1 Commute by subway (office-day only)**

- Schedule: freq_per_day=10 km, office_days_only=TRUE, profile OD=3.
- Weekly distance: W = 10 × 3 = 30 km/week.
- Daily (office days): D = 10 km/day on 3 days; NULL on others.
- Annual distance: A ≈ 30 × 52.142857 = 1564.29 km/year.
- If EF is fixed g_per_km, multiply at any layer; if grid-indexed (kWh/km), multiply by GI at that layer.

### **10.2 Streaming HD on TV (daily)**

- Schedule: freq_per_day=1.2 hours, not office-restricted.
- Weekly: W = 1.2 × 7 = 8.4 h/week.
- Daily: D = 1.2 h/day each day.
- Annual: A ≈ 8.4 × 52.142857 = 438 h/year.
- Grid-indexed EF: kWh/h × g/kWh → g/h; multiply at daily or annual consistently.

***

## **11. Edge Cases**

- **Both freq_per_day and freq_per_week present:** validation error; row rejected.
- **office_days_only=TRUE but OD is NULL:** treat as **invalid** for rows relying on office weighting; either supply OD in profile or set office_days_only=FALSE.
- **Mixed calendar lengths (leap years):** Use actual year length for the target reference_year.
- **Region override absent / unknown region:** fall back to profile default; if that’s also unknown, fall back to CA (national average) when available; else the row remains computed with **EF only** if fixed, or is **inert** if grid-indexed and no GI exists.

***

## **12. Implementation Notes**

- derive.py performs normalization in the exact order: **Schedule → Daily → (apply EF) → Weekly/Annual aggregation**.
- GI resolution is chosen **before** EF multiplication; mixing different GI resolutions across the same activity/profile in one run is prohibited.
- All calculations must remain **pure**; the DAL (CSV now, DB later) is the only I/O boundary.
- Tests must assert:
    - Schedule exclusivity.
    - Office-day weighting math.
    - Grid precedence chain.
    - Uncertainty propagation invariants.

***

## **13. Deliverables Produced by This Spec**

- Consistent daily/weekly/annual exports for the pilot year.
- Reusable normalization routines independent of data source (thanks to DAL).
- Deterministic outputs that can be compared across branches/PRs.

***

## **14. Change Log**

- **v1.1 (pilot):** Introduced daily core layer; clarified office-day weighting; formalized GI precedence; mandated deterministic annualization constants; defined telemetry override behavior.

***

*End of ACX004.*