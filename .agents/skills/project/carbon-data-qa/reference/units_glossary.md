# Carbon Accounting Units Glossary

## Core Carbon Units

### tCO2e (tonnes CO2 equivalent)

**Definition:** One metric tonne (1,000 kg) of carbon dioxide equivalent.

**Purpose:** Standard unit for reporting greenhouse gas emissions, accounting for different GHG potencies.

**Usage:**
- Corporate carbon footprints
- National emissions inventories
- Carbon offset credits
- Regulatory reporting

**Conversion:**
- 1 tCO2e = 1,000 kgCO2e
- 1 tCO2e = 1,000,000 gCO2e

**Example:** A transatlantic flight might produce 1.5 tCO2e per passenger.

---

### kgCO2e (kilograms CO2 equivalent)

**Definition:** One kilogram of carbon dioxide equivalent.

**Purpose:** Granular unit for activity-level emissions. Primary unit in Carbon ACX emission factors.

**Usage:**
- Per-activity emission factors
- Product carbon footprints
- Daily/hourly emissions tracking

**Conversion:**
- 1 kgCO2e = 0.001 tCO2e
- 1 kgCO2e = 1,000 gCO2e

**Example:** Streaming one hour of HD video produces ~0.055 kgCO2e.

---

### CO2e (Carbon Dioxide Equivalent)

**Definition:** A standardized measure that converts all greenhouse gases to the equivalent warming impact of CO2.

**GHG Potency (100-year GWP):**
- CO2: 1× (baseline)
- CH4 (methane): 28×
- N2O (nitrous oxide): 265×
- HFCs, PFCs, SF6: varies (hundreds to thousands)

**Purpose:** Allows aggregation of different GHGs into a single metric.

**Example:** 1 kg of methane = 28 kgCO2e

---

## Distance Units

### pkm (passenger-kilometre)

**Definition:** One passenger transported one kilometre.

**Usage:** Aviation, rail, bus, shared mobility emissions.

**Formula:** `passengers × distance_km = pkm`

**Example:**
- Flight with 200 passengers traveling 500 km = 100,000 pkm
- Solo car trip of 10 km = 10 pkm (1 passenger)

**Emission Factor Format:** kgCO2e per pkm

---

### tonne-km (tonne-kilometre)

**Definition:** One metric tonne of freight transported one kilometre.

**Usage:** Shipping, trucking, rail freight, air cargo.

**Formula:** `mass_tonnes × distance_km = tonne_km`

**Example:** Shipping container (20 tonnes) traveling 5,000 km = 100,000 tonne-km

**Emission Factor Format:** kgCO2e per tonne-km

---

### km (kilometre)

**Definition:** One kilometre of travel.

**Usage:** Vehicle travel (when passenger/cargo not specified), cycling, walking.

**Emission Factor Format:** kgCO2e per km

**Note:** For vehicles, assumes single occupant unless otherwise specified.

---

## Energy Units

### kWh (kilowatt-hour)

**Definition:** Energy consumed by one kilowatt of power over one hour.

**SI Conversion:** 1 kWh = 3,600,000 joules (3.6 MJ)

**Usage:**
- Grid electricity consumption
- Device energy use
- Battery capacity

**Emission Factor Format:** kgCO2e per kWh (grid-dependent)

**Example:** Ontario grid ~ 0.025 kgCO2e/kWh; coal grid ~ 0.9 kgCO2e/kWh

---

### mmbtu (Million British Thermal Units)

**Definition:** One million BTUs, commonly used for natural gas and industrial fuels.

**SI Conversion:** 1 mmbtu ≈ 1,055 MJ

**Usage:**
- Natural gas consumption
- Refinery operations
- Industrial process heat

**Emission Factor Format:** kgCO2e per mmbtu

---

## Time-Based Units

### hour

**Usage:** Streaming, conferencing, gaming, device operation

**Emission Factor Format:** kgCO2e per hour

**Examples:**
- Video streaming: kgCO2e/hour
- Data center server: kgCO2e/server_hour
- Conference call: kgCO2e/participant-hour

---

### month

**Typical Value:** 30.44 days (calendar month average)

**SI Conversion:** 2,628,000 seconds

**Usage:** Cloud storage, subscriptions, building operations

**Emission Factor Format:** kgCO2e per month

**Examples:**
- Cloud storage: kgCO2e/gb_month
- Rack colocation: kgCO2e/rack_month

---

### year

**SI Conversion:** 31,536,000 seconds (365 days)

**Usage:** Annual building energy, refrigerator operation, infrastructure

**Emission Factor Format:** kgCO2e per year or per m²-year

**Examples:**
- Office building: kgCO2e/m²-year
- Refrigerator operation: kgCO2e/year

---

## Data Units

### GB / gigabyte

**Definition:** One billion bytes (10^9 bytes).

**Usage:** Data transfer, cloud downloads, CDN delivery

**SI Conversion:** 1 GB = 1,000,000,000 bytes

**Emission Factor Format:** kgCO2e per GB transferred

**Example:** Downloading 50 GB game produces emissions from network + data center

---

### gb_month

**Definition:** One gigabyte stored for one month (30 days).

**Usage:** Cloud storage services (Google Drive, Dropbox, iCloud)

**Formula:** `storage_GB × months = gb_month`

**Emission Factor Format:** kgCO2e per gb_month

**Example:** Storing 100 GB for 6 months = 600 gb_month

---

### 1k_tokens

**Definition:** One thousand tokens processed by a language model.

**Usage:** LLM inference emissions (GPT, Claude, Gemini)

**Context:**
- Input tokens (prompt) + output tokens (completion)
- Typical conversation: 500-2000 tokens

**Emission Factor Format:** kgCO2e per 1k_tokens

---

## Mass Units

### kg (kilogram)

**Usage:** Food production throughput, waste processing, industrial materials

**Emission Factor Format:** kgCO2e per kg

**Examples:**
- Beef production: kgCO2e/kg
- Waste to landfill: kgCO2e/kg
- Coffee roasting: kgCO2e/kg

---

### tonne (metric tonne)

**Definition:** 1,000 kilograms

**Usage:** Heavy industrial production (steel, cement, chemicals)

**Emission Factor Format:** kgCO2e per tonne or tCO2e per tonne

**Examples:**
- Cement clinker: kgCO2e/tonne
- Steel slab: kgCO2e/tonne
- Freight shipping: kgCO2e/tonne-km

---

## Area & Volume Units

### m² (square metre)

**Usage:** Building footprint, land use

**Emission Factor Format:** kgCO2e per m² or per m²-year

---

### square_metre_year (m²-year)

**Definition:** One square metre of space maintained for one year.

**Usage:** Building operational emissions, military bases, warehouses

**Emission Factor Format:** kgCO2e per m²-year

---

### hectare (ha)

**Definition:** 10,000 square metres (100m × 100m)

**Usage:** Wildfire burned area, agricultural land, deforestation

**SI Conversion:** 1 ha = 10,000 m²

---

### m³ (cubic metre)

**Usage:** Natural gas consumption, water treatment, fluid discharge

**Emission Factor Format:** kgCO2e per m³

---

## Specialized Units

### serving

**Definition:** One serving of food (context-dependent portion size).

**Usage:** Meal emissions (150g beef serving, vegetarian plate)

**Emission Factor Format:** kgCO2e per serving

**Note:** Serving size should be defined in activity description.

---

### cup

**Definition:** Standard cup volume (236.6 mL for beverages).

**Usage:** Coffee, beverages

**SI Conversion:** 1 cup ≈ 0.0002366 m³

---

### unit

**Generic count for manufactured goods:**
- Electronics (smartphone, laptop, TV)
- Appliances (refrigerator, air conditioner)
- Military equipment (fighter aircraft, tank)

**Emission Factor Format:** kgCO2e per unit

---

### garment

**Definition:** One finished clothing item.

**Usage:** Fashion and textile carbon footprints.

**Emission Factor Format:** kgCO2e per garment

---

### event

**Definition:** One discrete occurrence (wildfire, munitions detonation, conflict month).

**Usage:** Scenario modeling, episodic events

**Emission Factor Format:** kgCO2e per event or tCO2e per event

---

## Composite Units

### participant-hour

**Definition:** One participant in an activity for one hour.

**Usage:** Video conferences, online meetings

**Emission Factor Format:** kgCO2e per participant-hour

---

### server_hour

**Definition:** One server operating under load for one hour.

**Usage:** Cloud computing, data centers

**Emission Factor Format:** kgCO2e per server_hour

---

### rack_month

**Definition:** One server rack (42U) maintained for one month.

**Usage:** Colocation, data center capacity

**Emission Factor Format:** kgCO2e per rack_month

---

### site_day

**Definition:** One active construction site operating for one workday (8-10 hours).

**Usage:** Light-industrial construction projects

**SI Conversion:** 28,800 seconds (8-hour shift)

---

## Carbon Accounting Terminology

### Scope 1, 2, 3 Emissions

**Scope 1:** Direct emissions from owned/controlled sources (fuel combustion, fleet vehicles)

**Scope 2:** Indirect emissions from purchased electricity, heat, cooling

**Scope 3:** All other indirect emissions in value chain (supply chain, business travel, employee commuting, product use)

**ACX Context:** Emission factors may span multiple scopes. Activity descriptions clarify boundaries.

---

### Vintage

**Definition:** The year of data collection or publication for an emission factor.

**Purpose:** Emission factors change over time as grids decarbonize, technologies improve, and methodologies update.

**Example:**
- Ontario grid kgCO2e/kWh (vintage 2020): 0.030
- Ontario grid kgCO2e/kWh (vintage 2024): 0.025

**Best Practice:** Always cite vintage year with emission factors.

---

### Boundary / System Boundary

**Definition:** What stages of a product/activity lifecycle are included in the emission factor.

**Common Boundaries:**
- **Cradle-to-gate:** Production up to factory exit
- **Cradle-to-grave:** Full lifecycle including use and disposal
- **Gate-to-gate:** Single process step
- **Well-to-wheel:** Fuel extraction through vehicle use

**ACX Context:** Activity descriptions specify boundary (e.g., "includes device playback + network delivery").

---

### Lifecycle Assessment (LCA)

**Definition:** Comprehensive analysis of environmental impacts across a product's full lifecycle.

**Phases:**
1. Raw material extraction
2. Manufacturing
3. Distribution
4. Use
5. End-of-life (recycling/disposal)

**ACX Usage:** Many emission factors derived from LCA studies.

---

### Grid Intensity

**Definition:** Carbon intensity of electrical grid (kgCO2e per kWh).

**Variation:**
- By region: Ontario ~0.025, Alberta ~0.6, coal grid ~0.9
- By time: Hourly, daily, seasonal variation
- By source mix: Renewables vs fossil fuels

**ACX Data:** `data/grid_intensity.csv` contains regional factors.

---

## Unit Conversion Helpers

### Energy
- 1 kWh = 3.6 MJ
- 1 mmbtu = 1,055 MJ
- 1 L gasoline ≈ 34 MJ

### Distance
- 1 km = 1,000 m
- 1 pkm = 1 passenger × 1 km

### Mass
- 1 tonne = 1,000 kg
- 1 kg = 1,000 g

### Volume
- 1 m³ = 1,000 L
- 1 L = 0.001 m³
- 1 cup = 0.237 L

### Area
- 1 hectare = 10,000 m²
- 1 km² = 1,000,000 m² = 100 hectares

---

## References

- IPCC AR6 GWP values for greenhouse gases
- ISO 14064 / ISO 14067 carbon accounting standards
- GHG Protocol Corporate Standard
- Carbon ACX `data/units.csv` for SI conversions
