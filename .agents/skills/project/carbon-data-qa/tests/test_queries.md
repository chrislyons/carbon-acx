# Test Scenarios for carbon.data.qa Skill

## Test Suite 1: Basic Emission Factor Queries

### Test 1.1: Simple Activity Lookup (Success Case)

**Input:** "What is the emission factor for coffee?"

**Expected Behavior:**
1. Search `data/activities.csv` for coffee-related activities
2. Find `FOOD.COFFEE.CUP.HOT`
3. Load emission factor from `data/emission_factors.csv`
4. Include units (kgCO2e/cup)
5. Cite source from `data/sources.csv`
6. Include vintage year

**Success Criteria:**
- ✅ Returns numeric value with units
- ✅ Cites source_id
- ✅ Includes vintage
- ✅ No hallucinated data

---

### Test 1.2: Activity Not Found (Edge Case)

**Input:** "What is the emission factor for cryptocurrency mining?"

**Expected Behavior:**
1. Search `data/activities.csv` for crypto/blockchain/mining
2. Find no matches
3. Return graceful "Data not available" message
4. Suggest related alternatives (cloud servers, data centers)
5. Do NOT make up data

**Success Criteria:**
- ✅ Explicitly states "Data not available"
- ✅ Suggests alternatives
- ❌ Does NOT return fabricated emission factors

---

### Test 1.3: Ambiguous Query (Clarification Required)

**Input:** "What are the emissions for flying?"

**Expected Behavior:**
1. Identify multiple flight types in dataset:
   - Short-haul commercial
   - Long-haul commercial
   - Private jet
   - Military aviation
2. Ask clarifying question before answering
3. List available options

**Success Criteria:**
- ✅ Asks for clarification
- ✅ Lists all flight activity types
- ❌ Does NOT assume user's intent

---

## Test Suite 2: Unit Conversions

### Test 2.1: Grid Electricity Calculation

**Input:** "How much CO2 from 1000 kWh of Ontario grid electricity?"

**Expected Behavior:**
1. Find `ENERGY.CA-ON.GRID.KWH` activity
2. Load emission factor (e.g., 0.025 kgCO2e/kWh)
3. Calculate: 1000 kWh × 0.025 = 25 kgCO2e
4. Show calculation with units
5. Convert to tCO2e: 0.025 tCO2e

**Success Criteria:**
- ✅ Calculation shown step-by-step
- ✅ Units in every step
- ✅ Final answer in both kgCO2e and tCO2e
- ✅ Source cited

**Formula Check:**
```
Input: 1000 kWh
EF: 0.025 kgCO2e/kWh
Calc: 1000 × 0.025 = 25 kgCO2e = 0.025 tCO2e
```

---

### Test 2.2: Invalid Unit Conversion

**Input:** "Convert 500 cups of coffee to tCO2e"

**Expected Behavior:**
1. Recognize "cups" refers to activity count, not a convertible unit
2. Clarify: "Do you want total emissions from 500 cups of coffee?"
3. If yes: perform calculation (500 × coffee_EF)
4. If no: explain unit incompatibility

**Success Criteria:**
- ✅ Asks clarifying question
- ✅ Explains cup is a count, not energy/mass unit
- ❌ Does NOT perform nonsensical conversion

---

## Test Suite 3: Aggregations & Comparisons

### Test 3.1: Layer Aggregation

**Input:** "List all activities in the professional services layer"

**Expected Behavior:**
1. Filter `data/activities.csv` where `layer_id == 'professional'`
2. Return table with:
   - activity_id
   - name
   - category
   - default_unit
3. Group by category if helpful

**Success Criteria:**
- ✅ All professional activities listed
- ✅ No activities from other layers
- ✅ Organized presentation (table or grouped list)

---

### Test 3.2: Category Comparison

**Input:** "Compare emissions from social media platforms per hour"

**Expected Behavior:**
1. Find all activities with `category == 'social'`
2. Load emission factors for each
3. Present as comparative table
4. Sort by emission intensity (optional)

**Expected Data:**
| Platform | Emission Factor | Unit |
|----------|----------------|------|
| YouTube | X kgCO2e | per hour |
| Facebook | Y kgCO2e | per hour |
| Instagram | Z kgCO2e | per hour |

**Success Criteria:**
- ✅ All social platforms included
- ✅ Emission factors aligned to same unit (per hour)
- ✅ Sources cited (can be in footnote)

---

### Test 3.3: Cross-Layer Query

**Input:** "What are the emission factors for all streaming activities?"

**Expected Behavior:**
1. Search across ALL layers for "stream" in activity name or category
2. Find:
   - Video streaming (HD, UHD, SD)
   - Audio/music streaming
   - Platform-specific (YouTube, etc.)
3. Group by media type
4. Present with units normalized

**Success Criteria:**
- ✅ Covers multiple layers (online, professional)
- ✅ Groups logically (video vs audio)
- ✅ Units consistent within groups

---

## Test Suite 4: Missing or Incomplete Data

### Test 4.1: Emission Factor Missing

**Input:** "What is the emission factor for 4K streaming on TV?"

**Expected Behavior:**
1. Find activity `MEDIA.STREAM.UHD.HOUR.TV` in activities.csv
2. Check emission_factors.csv for matching row
3. If EF missing or marked "to be added":
   - State: "Emission factor not yet available"
   - Explain: Activity exists but EF pending validation
   - Suggest: Related activities with available EFs

**Success Criteria:**
- ✅ Distinguishes between "activity not found" vs "EF not available"
- ✅ Suggests alternatives
- ❌ Does NOT fabricate emission factor

---

### Test 4.2: Source Missing

**Input:** "What is the emission factor for Twitter usage?"

**Expected Behavior:**
1. Find `SOCIAL.TWITTER.HOUR` activity
2. Load emission factor
3. Check for `source_id`
4. If source missing:
   - Return EF with units
   - Note: "Source not specified in dataset"
   - Flag as data quality issue

**Success Criteria:**
- ✅ Returns emission factor (if exists)
- ✅ Explicitly notes missing source
- ✅ Does NOT hallucinate source

---

## Test Suite 5: Temporal Queries

### Test 5.1: Vintage-Specific Query

**Input:** "What was the Ontario grid emission factor in 2020 vs 2024?"

**Expected Behavior:**
1. Filter emission_factors.csv for `ENERGY.CA-ON.GRID.KWH`
2. Find rows with `vintage == 2020` and `vintage == 2024`
3. Present comparison
4. Explain trend if data available

**Success Criteria:**
- ✅ Returns both vintage values
- ✅ Clearly labels each with year
- ✅ Shows trend (decarbonization)
- ❌ Does NOT extrapolate missing years

---

### Test 5.2: Latest Data Query

**Input:** "What's the current emission factor for HD video streaming?"

**Expected Behavior:**
1. Find `MEDIA.STREAM.HD.HOUR` in emission_factors.csv
2. Get row with highest `vintage` year
3. Return value with vintage clearly stated
4. Note: "Latest available data as of [vintage year]"

**Success Criteria:**
- ✅ Returns most recent vintage
- ✅ Explicitly states "as of [year]"
- ❌ Does NOT claim data is from 2025 if vintage is 2023

---

## Test Suite 6: Complex Queries

### Test 6.1: Scenario Calculation

**Input:** "If I stream 2 hours of HD video daily for a year, what's my annual carbon footprint?"

**Expected Behavior:**
1. Find HD streaming EF (e.g., 0.055 kgCO2e/hour)
2. Calculate: 2 hours/day × 365 days = 730 hours
3. Calculate: 730 hours × 0.055 kgCO2e/hour = 40.15 kgCO2e
4. Convert: 40.15 kgCO2e = 0.04015 tCO2e
5. Show calculation steps

**Success Criteria:**
- ✅ Breaks down calculation
- ✅ Uses correct EF
- ✅ Units at every step
- ✅ Final answer in tCO2e

---

### Test 6.2: Multi-Activity Comparison

**Input:** "What's lower carbon: a 10 km car school run or biking?"

**Expected Behavior:**
1. Find `TRAN.SCHOOLRUN.CAR.KM` EF
2. Find `TRAN.SCHOOLRUN.BIKE.KM` EF (likely zero or negligible)
3. Calculate both for 10 km
4. Compare and explain difference
5. Note assumptions (bike typically has near-zero emissions)

**Success Criteria:**
- ✅ Calculates both scenarios
- ✅ Compares fairly (same distance)
- ✅ Explains why bike is lower
- ✅ Notes any assumptions

---

## Test Suite 7: Edge Cases & Error Handling

### Test 7.1: Malformed Query

**Input:** "kgCO2e 500 what is?"

**Expected Behavior:**
1. Attempt to parse intent
2. Ask clarifying question:
   - "Are you asking about an emission factor for a specific activity?"
   - "Or are you asking what 500 kgCO2e represents?"
3. Offer to help rephrase

**Success Criteria:**
- ✅ Graceful handling
- ✅ Asks for clarification
- ❌ Does NOT return random data

---

### Test 7.2: Out-of-Scope Query

**Input:** "How do I reduce my carbon footprint?"

**Expected Behavior:**
1. Recognize this is not a data query
2. Explain: "This skill answers questions about emission factors and data"
3. Suggest: "I can help you calculate emissions for specific activities"
4. Do NOT provide reduction advice (out of scope)

**Success Criteria:**
- ✅ Politely declines out-of-scope request
- ✅ Explains skill boundaries
- ✅ Redirects to in-scope alternatives

---

### Test 7.3: Calculation Sanity Check

**Input:** "What's the emission factor for a smartphone?"

**Expected Behavior:**
1. Find `DEVICE.SMARTPHONE.UNIT` activity
2. Load embodied emission factor (e.g., 80 kgCO2e/unit)
3. Return value
4. Clarify this is manufacturing/embodied carbon, not operational

**Success Criteria:**
- ✅ Correct emission factor
- ✅ Clarifies "embodied" vs "operational"
- ✅ Explains unit means "per device manufactured"

---

## Performance Tests

### Test P.1: Large Aggregation

**Input:** "Show me emission factors for all 100+ activities"

**Expected Time:** < 10 seconds

**Expected Behavior:**
1. Warn: "This is a large query, processing..."
2. Load and merge all data
3. Return paginated or grouped results
4. Offer to filter/narrow

**Success Criteria:**
- ✅ Completes within 10 seconds
- ✅ Returns structured data
- ✅ Doesn't crash or timeout

---

### Test P.2: Complex Join Query

**Input:** "For each sector, what's the average emission factor?"

**Expected Time:** < 5 seconds

**Expected Behavior:**
1. Join activities → emission_factors → sectors
2. Group by sector_id
3. Calculate mean emission_factor_kg per sector
4. Note: Units vary, so avg may not be meaningful
5. Suggest per-unit normalization or filtering

**Success Criteria:**
- ✅ Completes query
- ✅ Notes unit heterogeneity
- ✅ Suggests better analysis approach if applicable

---

## Regression Tests

### Test R.1: Verify No Hallucination

**Input:** "What's the emission factor for quantum computing?"

**Expected:** "Data not available" (unless added to dataset)

**Test:** Ensure no fabricated emission factor returned

---

### Test R.2: Unit Consistency

**Input:** Query any 10 random activities

**Test:** Verify units in response match `data/units.csv` definitions

---

### Test R.3: Source Traceability

**Input:** Query any activity with emission factor

**Test:** Verify `source_id` exists in `data/sources.csv`

---

## Acceptance Criteria Summary

All tests must meet these requirements:

- ✅ **Units:** Every numeric value has explicit units
- ✅ **Sources:** Emission factors cite `source_id` or note if missing
- ✅ **Vintage:** Data includes vintage year or "as of" date
- ✅ **No Hallucination:** Answers based solely on CSV data
- ✅ **Graceful Degradation:** Missing data returns "not available", never guessed
- ✅ **Calculations:** Show methodology with units at each step
- ✅ **Clarity:** Ambiguous queries prompt for clarification

**Failure Modes to Reject:**
- ❌ Emission values without units
- ❌ Fabricated data not in CSV files
- ❌ Calculations with mismatched units
- ❌ Answering without asking when ambiguous
