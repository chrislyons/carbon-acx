# How to “stage” the heavy-industrial layer without drowning in schema

## 1) Keep it inert by default

- **Namespace:** reserve `category=industrial_heavy` and `profile_id=IND.TO.HEAVY.2025`.
- **Guardrails:** all dashboards and exports must explicitly filter `category in (...)` or `profile_id in (...)`. Default views exclude `industrial_heavy` unless toggled on.
- **No placeholders with fake numbers.** Don’t insert `emission_factors` until you have real values; the core requires `value_g_per_unit`, so omit those rows entirely for now.

## 2) Add only safe stubs now (zero maintenance burden)

**activities.csv (append):**

```javascript
activity_id,category,name,default_unit,description,unit_definition,notes
IND.CEMENT.CLINKER,industrial_heavy,"Cement clinker kiln","t","Dry/preheater kiln; process + combustion","1 metric tonne clinker","Throughput-based; Ontario electricity when used"
IND.STEEL.EAF,industrial_heavy,"Steel—EAF melt","t","Scrap/DRI via EAF; electricity-dominant","1 metric tonne crude steel","Throughput-based"
IND.REFINERY.FIRED,industrial_heavy,"Refinery fired heaters/boilers","GJ","Fired equipment energy input","1 gigajoule fuel input","Fuel-based; NG default"
IND.MINING.HAULTRUCK,industrial_heavy,"Mining haul truck","L","Off-road diesel combustion","1 litre diesel","Fuel-based"
```

**profiles.csv (append):**

```javascript
profile_id,name,assumption_notes,office_days_per_week,season
IND.TO.HEAVY.2025,"Toronto—Heavy Industrial (screening)","Throughput/fuel/kWh factors to be added; excluded from totals by default",,all
```

**activity_schedule.csv (optional, only if you already know a throughput):**

```javascript
profile_id,activity_id,freq_per_day,freq_per_week,office_days_only,schedule_notes
IND.TO.HEAVY.2025,IND.CEMENT.CLINKER,, ,FALSE,"Leave NULL until throughput known"
```

Leave `freq_*` NULL if unknown; these rows will not compute and will not leak into totals.

## 3) Minimal contracts so the UI never breaks

- **Filter contract:** charts default to `category NOT LIKE 'industrial_heavy%'`. A UI toggle flips to `INCLUDE`.
- **Legend/labels:** if `industrial_heavy` is included, render it as a **separate group** (not stacked into “light ops”).
- **References block:** figure-specific References are built from `emission_factors.source_id` actually present in the trace. With no heavy-industry EFs, the References list remains unchanged.

## 4) When you’re ready to populate later

- Insert **actual** `emission_factors` rows (per unit: t, GJ, kWh, L).
- Add `activity_schedule` rows with **real** `freq_per_day` (throughput or energy).
- Your existing `derived_calcs` view will compute without any schema change; the layer becomes visible only when the UI toggle includes it.

## 5) Sanity checks (so it stays manageable)

- **Completeness gate:** don’t display any heavy-industry chart unless ≥1 activity has both an EF and a non-NULL frequency.
- **Prominence limit:** cap first release to **≤4 activities** (cement clinker, steel EAF, refinery fired heaters/boilers, mining haul trucks).
- **Null-first discipline:** uncertainty, regions, and scope are nullable; add them when you have sources. No guessed values.

This gives you a clean parking spot: recognizable IDs, hidden by default, zero fake numbers, and no downstream coupling. When priorities shift, you populate a handful of EF rows and frequencies, flip the toggle, and the layer comes online without refactoring.