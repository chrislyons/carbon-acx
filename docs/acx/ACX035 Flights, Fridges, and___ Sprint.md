---
related:
  - ACX
---

Excellent — here’s the **“Flights, Fridges, and …” sprint**. I’ve broken it into clean Codex Cloud prompts (CDX049–CDX053). Each is scoped to seed overlooked systemic sectors with **entities → sites → assets → operations**, plus **activities, FUs, and citable emission factors**. This way, they plug straight into your industry-first backbone (CDX036 onward).

***

# **✈️🧊🪡🚢🏢** 

# **Flights, Fridges, Fabrics, Freight, Facilities Sprint**

***

## **CDX049 — Flights (Passenger Aviation)**

**Title:** data(seed): add passenger aviation entities, ops, and emission factors

**Intent:** Capture air travel as a structural industry, not just a personal “choice.”

**Do**

1. **Entities:**
    - ENTITY.AIRCANADA.CA
    - ENTITY.WESTJET.CA
2. **Sites/Assets/Operations:**

```javascript
SITE.AIRCANADA.PEARSON,ENTITY.AIRCANADA.CA,Toronto hub,CA-ON,,,
ASSET.AIRCANADA.A320,SITE.AIRCANADA.PEARSON,aircraft,A320 fleet,2024,,jet_fuel,
OP.AIRCANADA.SHORTHAUL2025,ASSET.AIRCANADA.A320,TRAN.FLIGHT.SHORTHAUL.PKM,FU.PERSON_KM,metered,2025-01-01,2025-12-31,,,
```

2. 
3. **Activities:**

```javascript
TRAN.FLIGHT.SHORTHAUL.PKM,"Short-haul passenger flight (pkm)","Domestic/regional flight <1500 km"
TRAN.FLIGHT.LONGHAUL.PKM,"Long-haul passenger flight (pkm)","International flight >1500 km"
TRAN.FLIGHT.PRIVATE.PKM,"Private jet flight (pkm)","Business aviation"
```

3. 
4. **FUs:** reuse FU.PERSON_KM.
5. **Emission factors (ICAO/DEFRA):**
    - Short-haul: ~250 gCO₂e/pkm.
    - Long-haul: ~190 gCO₂e/pkm.
    - Private jet: ~600–1200 gCO₂e/pkm.

**Acceptance:** intensity_matrix shows aviation rows with citable sources (ICAO, DEFRA, IEA).

***

## **CDX050 — Fridges (Appliances & Cold Chain)**

**Title:** data(seed): add appliance & cold chain ops with embodied + operational EFs

**Intent:** Cover refrigerators/freezers as household + industrial emitters, including refrigerant leakage.

**Do**

1. **Entities:** Whirlpool, Carrier, Walmart (cold chain).
2. **Sites/Assets/Operations:**
    - Appliance factory → OP.WHIRLPOOL.FRIDGE2025.
    - Supermarket cold storage → OP.WALMART.COLDCHAIN2025.
3. **Activities:**

```javascript
APPL.FRIDGE.UNIT,"Refrigerator unit produced","Embodied emissions per fridge"
APPL.FRIDGE.OP.YEAR,"Refrigerator operation (year)","Annual electricity use + leakage"
COLDCHAIN.SUPERMARKET.KG,"Cold storage (kg food-year)","Refrigerated warehouse throughput"
```

3. 
4. **FUs:**
    - FU.UNIT (device produced).
    - FU.YEAR (annual operation).
    - FU.KG_FOODYEAR (kg refrigerated per year).
5. **Emission Factors:**
    - Embodied fridge: ~400 kgCO₂e/unit (WRAP).
    - Annual fridge op: ~150 kgCO₂e/yr (grid-dependent).
    - Cold chain storage: ~0.5 kgCO₂e/kg food-year (FAO/IEA).

***

## **CDX051 — Fabrics (Devices & Consumer Goods Embodied Emissions)**

**Title:** data(seed): add smartphones, laptops, TVs as industrial device categories

**Intent:** Capture **embodied emissions of electronics** that power digital habits.

**Do**

1. **Entities:** Apple, Samsung, Dell.
2. **Activities:**

```javascript
DEVICE.SMARTPHONE.UNIT,"Smartphone unit produced","Embodied footprint per phone"
DEVICE.LAPTOP.UNIT,"Laptop unit produced","Embodied footprint per laptop"
DEVICE.TV.UNIT,"Television unit produced","Embodied footprint per TV"
```

2. 
3. **FUs:** reuse FU.UNIT.
4. **Emission Factors (Apple ESG reports, Malmodin & Lunden 2018):**
    - Smartphone: ~70 kgCO₂e/unit.
    - Laptop: ~200 kgCO₂e/unit.
    - TV: ~300 kgCO₂e/unit.

**Acceptance:** device production footprints visible in intensity leaderboard; citations in references.

***

## **CDX052 — Freight (Maritime Shipping)**

**Title:** data(seed): add global shipping entities, tonne-km ops, and EFs

**Intent:** Cover the maritime backbone of global trade — invisible but massive.

**Do**

1. **Entities:** Maersk, Hapag-Lloyd.
2. **Activities:**

```javascript
LOGI.SHIPPING.CONTAINER.TONNEKM,"Container ship freight (tonne-km)","TEU shipping work"
LOGI.SHIPPING.BULK.TONNEKM,"Bulk carrier freight (tonne-km)","Dry/bulk freight work"
```

2. 
3. **FUs:** reuse FU.TONNEKM.
4. **Emission Factors (IMO 2020, ICCT):**
    - Container shipping: ~10–15 gCO₂e/tonne-km.
    - Bulk: ~5–8 gCO₂e/tonne-km.

**Acceptance:** shipping intensity rows exist and are citable.

***

## **CDX053 — Facilities (Buildings & Care)**

**Title:** data(seed): add buildings sector ops (heating/cooling, hospitals)

**Intent:** Show operational emissions from buildings, especially care/health.

**Do**

1. **Entities:** Toronto General Hospital, Oxford Properties.
2. **Activities:**

```javascript
BUILDING.OFFICE.M2.YEAR,"Office building energy use (m2-year)","Operational footprint per square metre"
BUILDING.HOSPITAL.M2.YEAR,"Hospital energy use (m2-year)","Operational footprint per square metre"
BUILDING.RESIDENTIAL.M2.YEAR,"Residential building (m2-year)","Operational footprint"
```

2. 
3. **FUs:**
    - FU.M2YEAR (floor area-year).
4. **Emission Factors (IEA Buildings, NRCan):**
    - Office: ~80 kgCO₂e/m²-year.
    - Hospital: ~250 kgCO₂e/m²-year.
    - Residential: ~50 kgCO₂e/m²-year.

**Acceptance:** building operational intensities seeded; references included.

***

# **✅ Sprint Summary**

- **CDX049 Flights:** passenger aviation (short/long-haul, private).
- **CDX050 Fridges:** appliances & cold chain.
- **CDX051 Fabrics:** embodied electronics/devices.
- **CDX052 Freight:** maritime shipping.
- **CDX053 Facilities:** building operations & healthcare.

Together these capture the **overlooked systems** that consumers can’t directly control but that dominate emissions. They’ll slot cleanly into your industry-first backbone, with civilian habits later mapped to them (e.g., “own a smartphone” → DEVICE.SMARTPHONE.UNIT, “fly to New York” → TRAN.FLIGHT.SHORTHAUL.PKM).

***

👉 Do you want me to also draft a **CDX054** for a *unified “Overlooked Systems” tab* in the UI (Flights, Fridges, Fabrics, Freight, Facilities grouped under one toggle), or should these just blend into their industry categories for now?