# **🪖 Military-Industrial Sprint (CDX054–CDX058)**

***

## **CDX054 — Military Fuel & Mobility**

**Title:** data(seed): add military aviation, naval, and ground fuel ops

**Intent:** Capture the core of warfighting emissions: aviation fuel, naval bunker fuel, armored vehicles.

**Do**

1. **Entities:**
    - ENTITY.DND.CA (Canadian Department of National Defence)
    - ENTITY.DOD.US (U.S. Department of Defense)
2. **Activities:**

```javascript
MIL.FLIGHT.PKM,"Military aviation (pkm)","Fuel use per person-km equivalent"
MIL.NAVAL.TONNEKM,"Naval shipping (tonne-km)","Fuel use per tonne-km moved"
MIL.VEHICLE.KM,"Military ground vehicles (km)","Armored fleet fuel use"
```

2. 
3. **FUs:**
    - reuse FU.PERSON_KM, FU.TONNEKM, and FU.KM.
4. **Emission Factors (citable):**
    - Military jet fuel: ~330–350 gCO₂e/pkm (Stockholm International Peace Research Institute, SIPRI).
    - Naval vessels: ~20–40 gCO₂e/tonne-km (NATO reporting).
    - Armored vehicles: ~1.2–2.0 kgCO₂e/km (Pentagon operational LCA studies).

**Acceptance:** intensity_matrix rows for military aviation/naval/ground fuel.

***

## **CDX055 — Weapons & Ordnance Production**

**Title:** data(seed): add arms manufacturing entities and embodied emission factors

**Intent:** Capture emissions of weapons and ammunition manufacturing.

**Do**

1. **Entities:** Lockheed Martin, Rheinmetall, BAE Systems.
2. **Activities:**

```javascript
MIL.MUNITIONS.TONNE,"Ammunition production (t)","Per tonne of munitions"
MIL.AIRCRAFT.UNIT,"Fighter aircraft production (unit)","Embodied emissions per aircraft"
MIL.TANK.UNIT,"Armored vehicle production (unit)","Embodied emissions per tank"
```

2. 
3. **FUs:** FU.TONNE, FU.UNIT.
4. **Emission Factors (based on SIPRI, peer-reviewed defense LCA):**
    - Munitions: ~2–3 tCO₂e/t produced.
    - Fighter aircraft: ~200–300 tCO₂e/unit (materials & assembly).
    - Tank: ~120–150 tCO₂e/unit.

**Acceptance:** embodied footprint visible for weapons production.

***

## **CDX056 — Bases & Infrastructure**

**Title:** data(seed): add military bases as energy-intensive facilities

**Intent:** Treat military bases as industrial facilities — massive building/energy footprints.

**Do**

1. **Entities:** NATO, Canadian Forces Base (Trenton).
2. **Activities:**

```javascript
MIL.BASE.M2.YEAR,"Military base (m2-year)","Operational footprint of base facilities"
MIL.DEPOT.M2.YEAR,"Munitions depot (m2-year)","Operational footprint of depot"
```

2. 
3. **FUs:** FU.M2YEAR.
4. **Emission Factors (U.S. DoD inventory, UK MoD reports):**
    - Military base: 120–180 kgCO₂e/m²-year.
    - Munitions depot: ~200–250 kgCO₂e/m²-year.

***

## **CDX057 — War & Conflict Operations (Modeled Events)**

**Title:** data(seed): add modeled scenarios for military campaigns

**Intent:** Enable “conflict scenario” profiles: e.g. a year of war in region X.

**Do**

1. **Activities:**

```javascript
MIL.CONFLICT.MONTH,"Armed conflict (month)","Average operational footprint per month of active war"
```

1. 
2. **FUs:** FU.MONTH.
3. **Emission Factors (UNEP / Conflict & Environment Observatory):**
    - ~1–2 MtCO₂e/month for high-intensity conflicts (Iraq War, Afghanistan).
4. **Schedules:**
    - PROFILE.WAR.UKRAINE.2022 — conflict activity rows spanning months.

**Acceptance:** intensity shows modeled conflict footprints, orders of magnitude larger than civilians.

***

## **CDX058 — Upstream Defense Supply Chains**

**Title:** data(seed): add steel, aluminum, explosives precursors used for defense

**Intent:** Expose indirect military emissions (supply chains).

**Do**

- Link to **Materials sector (CDX037)**: steel, aluminum.
- Add **chemicals**: TNT, RDX, ammonium nitrate.
- Activities:

```javascript
CHEM.TNT.TONNE,"TNT explosive production (t)"
CHEM.RDX.TONNE,"RDX explosive production (t)"
```

- 
- Emission factors: explosives ~5–7 tCO₂e/t produced.

**Acceptance:** dependency map shows munitions ops drawing on steel, aluminum, explosives production.

***

Right — makes sense. If the prism is going to compare **agency budgets**, then even the “micro-military” (private guards, security details, gated communities) belongs in there as a **layer**, not just a footnote. That way you can show how *“1 private security convoy”* scales against *“1 family commute”* or *“1 hospital floor’s electricity.”*

Here’s how I’d structure it:

***

## **CDX059 — Personal Security Details Layer**

**Title:** data(seed): add personal/private security entities, ops, and emission factors

**Intent:** Capture the footprint of private security and protective services — armored SUVs, armed guards, surveillance gear — as a distinct **layer**. Civilian choice here is almost nil; it’s driven by wealth concentration, corporate policy, and state outsourcing.

***

### **1. Entities**

- ENTITY.BLACKWATER.US (as archetype / private military contractor)
- ENTITY.GARDA.CA (Canadian armored transport/security)
- ENTITY.PRIVSEC.ELITE (placeholder for high-net-worth personal security services)

***

### **2. Sites / Assets / Operations**

Examples:

```javascript
SITE.GARDA.TO,ENTITY.GARDA.CA,Toronto Armored Fleet,CA-ON,,,
ASSET.GARDA.ARMORED.SUV,SITE.GARDA.TO,armored_suv,Armored SUV fleet,2024,,diesel,
OP.GARDA.CONVOY2025,ASSET.GARDA.ARMORED.SUV,SEC.CONVOY.KM,FU.KM,modeled,2025-01-01,2025-12-31,,,

SITE.PRIVSEC.ELITE.BASE,ENTITY.PRIVSEC.ELITE,Elite Security Ops Base,CA-ON,,,
ASSET.PRIVSEC.HELICOPTER,SITE.PRIVSEC.ELITE.BASE,helicopter,Private helicopter,2024,,jet_fuel,
OP.PRIVSEC.HELI2025,ASSET.PRIVSEC.HELICOPTER,SEC.HELI.HOUR,FU.HOUR,modeled,2025-01-01,2025-12-31,,,
```

***

### **3. Activities**

```javascript
SEC.CONVOY.KM,"Private security convoy (km)","Armored SUVs in convoy"
SEC.GUARD.HOUR,"Security guard presence (hour)","On-site armed guard service"
SEC.HELI.HOUR,"Security helicopter (hour)","Private rotorcraft protection flight"
```

***

### **4. Functional Units**

- FU.KM (already present)
- FU.HOUR (time-based service unit)

***

### **5. Emission Factors (citable ranges)**

- Armored SUV convoy: ~500–700 gCO₂e/km per vehicle × 2–3 vehicles (NRCAN light truck + armor penalty).
- Security guard service: ~2–3 kgCO₂e/hour (uniform + arms supply amortized, plus building electricity).
- Helicopter patrol: ~250–400 kgCO₂e/hour (jet fuel burn, IEA aviation factors).

Sources:

- IPCC 2019 Refinement (vehicle intensity).
- NRCAN vehicle energy intensity survey.
- ICAO helicopter emissions factors.
- CEOBS reports on private military carbon impacts.

***

### **6. Profiles / Presets**

Examples to seed activity_schedule.csv:

```javascript
PROFILE.ELITE.SECURITY.2025,SEC.CONVOY.KM,50,,,"50 km convoy daily"
PROFILE.ELITE.SECURITY.2025,SEC.GUARD.HOUR,24,,,"24/7 guard coverage"
PROFILE.ELITE.SECURITY.2025,SEC.HELI.HOUR,2,,,"2 hours/week private helicopter patrol"
```

***

### **7. Acceptance**

- intensity_matrix.csv contains rows for SEC.CONVOY.KM, SEC.GUARD.HOUR, SEC.HELI.HOUR.
- **Personal Security layer** visible as a selectable industry/civilian hybrid layer.
- References panel shows all cited sources.

***

### **Commit message**

```javascript
data(seed): add personal/private security details layer (convoys, guards, helicopters) with citable EFs (CDX059)
```

***