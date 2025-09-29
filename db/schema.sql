PRAGMA foreign_keys = ON;

CREATE TABLE sources (
    source_id TEXT PRIMARY KEY,
    ieee_citation TEXT,
    url TEXT,
    year INTEGER,
    license TEXT
);

CREATE TABLE units (
    unit_code TEXT PRIMARY KEY,
    unit_type TEXT,
    si_conversion_factor REAL,
    notes TEXT
);

CREATE TABLE activities (
    activity_id TEXT PRIMARY KEY,
    layer_id TEXT NOT NULL,
    category TEXT,
    name TEXT,
    default_unit TEXT,
    description TEXT,
    unit_definition TEXT,
    notes TEXT,
    FOREIGN KEY (default_unit) REFERENCES units(unit_code)
);

CREATE TABLE profiles (
    profile_id TEXT PRIMARY KEY,
    layer_id TEXT NOT NULL,
    name TEXT,
    region_code_default TEXT,
    grid_strategy TEXT,
    grid_mix_json TEXT,
    cohort_id TEXT,
    office_days_per_week REAL,
    assumption_notes TEXT,
    CHECK (
        region_code_default IS NULL
        OR (
            substr(region_code_default, 1, 2) = 'CA'
            AND (
                length(region_code_default) = 2
                OR (
                    length(region_code_default) = 5
                    AND substr(region_code_default, 3, 1) = '-'
                    AND substr(region_code_default, 4, 1) BETWEEN 'A' AND 'Z'
                    AND substr(region_code_default, 5, 1) BETWEEN 'A' AND 'Z'
                )
            )
        )
    )
);

CREATE TABLE emission_factors (
    ef_id TEXT PRIMARY KEY,
    activity_id TEXT NOT NULL,
    unit TEXT,
    value_g_per_unit REAL,
    is_grid_indexed INTEGER,
    electricity_kwh_per_unit REAL,
    electricity_kwh_per_unit_low REAL,
    electricity_kwh_per_unit_high REAL,
    region TEXT,
    scope_boundary TEXT,
    gwp_horizon TEXT,
    vintage_year INTEGER,
    source_id TEXT,
    method_notes TEXT,
    uncert_low_g_per_unit REAL,
    uncert_high_g_per_unit REAL,
    FOREIGN KEY (activity_id) REFERENCES activities(activity_id),
    FOREIGN KEY (unit) REFERENCES units(unit_code),
    FOREIGN KEY (source_id) REFERENCES sources(source_id),
    CHECK (is_grid_indexed IN (0, 1) OR is_grid_indexed IS NULL),
    CHECK (
        (
            value_g_per_unit IS NOT NULL
            AND (is_grid_indexed IS NULL OR is_grid_indexed = 0)
            AND electricity_kwh_per_unit IS NULL
        )
        OR (
            value_g_per_unit IS NULL
            AND is_grid_indexed = 1
            AND electricity_kwh_per_unit IS NOT NULL
            AND electricity_kwh_per_unit > 0
        )
    ),
    CHECK (electricity_kwh_per_unit_low IS NULL OR electricity_kwh_per_unit_low > 0),
    CHECK (electricity_kwh_per_unit_high IS NULL OR electricity_kwh_per_unit_high > 0),
    CHECK (
        electricity_kwh_per_unit_low IS NULL
        OR electricity_kwh_per_unit_high IS NULL
        OR electricity_kwh_per_unit_low <= electricity_kwh_per_unit_high
    ),
    CHECK (
        region IS NULL
        OR (
            substr(region, 1, 2) = 'CA'
            AND (
                length(region) = 2
                OR (
                    length(region) = 5
                    AND substr(region, 3, 1) = '-'
                    AND substr(region, 4, 1) BETWEEN 'A' AND 'Z'
                    AND substr(region, 5, 1) BETWEEN 'A' AND 'Z'
                )
            )
        )
    )
    CHECK (
        uncert_low_g_per_unit IS NULL
        OR uncert_high_g_per_unit IS NULL
        OR uncert_low_g_per_unit <= uncert_high_g_per_unit
    )
);



CREATE TABLE activity_schedule (
    profile_id TEXT NOT NULL,
    activity_id TEXT NOT NULL,
    layer_id TEXT NOT NULL,
    freq_per_day REAL,
    freq_per_week REAL,
    office_days_only INTEGER,
    region_override TEXT,
    schedule_notes TEXT,
    PRIMARY KEY (profile_id, activity_id),
    FOREIGN KEY (profile_id) REFERENCES profiles(profile_id),
    FOREIGN KEY (activity_id) REFERENCES activities(activity_id),
    CHECK (office_days_only IN (0, 1) OR office_days_only IS NULL),
    CHECK (
        region_override IS NULL
        OR (
            substr(region_override, 1, 2) = 'CA'
            AND (
                length(region_override) = 2
                OR (
                    length(region_override) = 5
                    AND substr(region_override, 3, 1) = '-'
                    AND substr(region_override, 4, 1) BETWEEN 'A' AND 'Z'
                    AND substr(region_override, 5, 1) BETWEEN 'A' AND 'Z'
                )
            )
        )
    ),
    CHECK (
        NOT (
            freq_per_day IS NOT NULL
            AND freq_per_week IS NOT NULL
        )
    )
);

CREATE TABLE grid_intensity (
    region_code TEXT NOT NULL,
    vintage_year INTEGER NOT NULL,
    g_per_kwh REAL,
    g_per_kwh_low REAL,
    g_per_kwh_high REAL,
    source_id TEXT,
    PRIMARY KEY (region_code, vintage_year),
    FOREIGN KEY (source_id) REFERENCES sources(source_id),
    CHECK (
        substr(region_code, 1, 2) = 'CA'
        AND (
            length(region_code) = 2
            OR (
                length(region_code) = 5
                AND substr(region_code, 3, 1) = '-'
                AND substr(region_code, 4, 1) BETWEEN 'A' AND 'Z'
                AND substr(region_code, 5, 1) BETWEEN 'A' AND 'Z'
            )
        )
    )
);

CREATE TRIGGER sources_year_check_insert
BEFORE INSERT ON sources
FOR EACH ROW
BEGIN
    SELECT CASE
        WHEN NEW.year IS NOT NULL AND NEW.year > CAST(strftime('%Y', 'now') AS INTEGER)
            THEN RAISE(ABORT, 'year cannot exceed current year')
    END;
END;

CREATE TRIGGER sources_year_check_update
BEFORE UPDATE ON sources
FOR EACH ROW
BEGIN
    SELECT CASE
        WHEN NEW.year IS NOT NULL AND NEW.year > CAST(strftime('%Y', 'now') AS INTEGER)
            THEN RAISE(ABORT, 'year cannot exceed current year')
    END;
END;

CREATE TRIGGER emission_factors_vintage_check_insert
BEFORE INSERT ON emission_factors
FOR EACH ROW
BEGIN
    SELECT CASE
        WHEN NEW.vintage_year IS NOT NULL AND NEW.vintage_year > CAST(strftime('%Y', 'now') AS INTEGER)
            THEN RAISE(ABORT, 'vintage_year cannot exceed current year')
    END;
END;

CREATE TRIGGER emission_factors_vintage_check_update
BEFORE UPDATE ON emission_factors
FOR EACH ROW
BEGIN
    SELECT CASE
        WHEN NEW.vintage_year IS NOT NULL AND NEW.vintage_year > CAST(strftime('%Y', 'now') AS INTEGER)
            THEN RAISE(ABORT, 'vintage_year cannot exceed current year')
    END;
END;

CREATE TRIGGER grid_intensity_vintage_check_insert
BEFORE INSERT ON grid_intensity
FOR EACH ROW
BEGIN
    SELECT CASE
        WHEN NEW.vintage_year IS NOT NULL AND NEW.vintage_year > CAST(strftime('%Y', 'now') AS INTEGER)
            THEN RAISE(ABORT, 'vintage_year cannot exceed current year')
    END;
END;

CREATE TRIGGER grid_intensity_vintage_check_update
BEFORE UPDATE ON grid_intensity
FOR EACH ROW
BEGIN
    SELECT CASE
        WHEN NEW.vintage_year IS NOT NULL AND NEW.vintage_year > CAST(strftime('%Y', 'now') AS INTEGER)
            THEN RAISE(ABORT, 'vintage_year cannot exceed current year')
    END;
END;
