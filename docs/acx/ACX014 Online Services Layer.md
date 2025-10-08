# Online services layer (LLMs/AI, social, OTT, e-commerce): scope, units, sources, and how to bolt it on without bloat

## 1) Scope and separation

Create a new profile family (kept independent of the “professional 25–50” layer): `ONLINE.TO.CONSUMER.2025`. This layer captures **service-type activities** rather than “generic device time.” It models the *digital* side only; any **physical fulfillment** (e.g., e-commerce delivery) stays in logistics so we don’t double-count.

## 2) Functional units (what we will actually measure)

Use units that align with defensible factors and let us switch assumptions without schema churn. Keep the five-table core you approved; encode variants (device/resolution) in the `activity_id` slug and `description` instead of adding new tables.

|  Service family                  |  Activity (short label)                         |  Functional unit (per …)                                     |  Notes on what EF will capture                                                                                                                                                                                                                |
| --- | --- | --- | --- |
|  **OTT video**                   |  Streaming—SD/HD/4K on **TV / laptop / phone**  |  **hour**                                                    |  Follows DIMPACT/Carbon Trust framing with strong emphasis on *device draw*; include data centre and network shares; Ontario grid for electricity [1], [10], [12].                                                                         |
|  **Music / podcasts**            |  Audio streaming—mobile vs Wi-Fi                |  **hour**                                                    |  Device very low, network + DC small; use intensity/GB where needed; Ontario grid [10], [12], [13].                                                                                                                                        |
|  **Short-video / social feeds**  |  Infinite scroll (IG/TikTok/X)—mobile vs Wi-Fi  |  **hour**                                                    |  Treat as low-bitrate video mix; per-GB approach acceptable here; note IEA cautions about using kWh/GB for *high-bitrate* apps [12].                                                                                                         |
|  **Videoconferencing**           |  1:1 / small group / large meeting—SD/HD        |  **participant-hour**                                        |  Device draw + access network + DC; resolution and participants scale traffic; Ontario grid [10], [12].                                                                                                                                     |
|  **Cloud gaming**                |  Cloud gaming stream—1080p/4K                   |  **hour**                                                    |  High DC workload + high network + device; model like OTT but with higher DC share [12].                                                                                                                                                     |
|  **Downloads / updates**         |  Software/game download                         |  **GB transferred**                                          |  Use per-GB intensity with device idle draw ignored or added separately; Ontario grid [11], [13].                                                                                                                                           |
|  **General browsing**            |  Web page views (content sites, news)           |  **GB transferred** *or* **1,000 pageviews** (mapped to GB)  |  Use measured data transfer × (DC + network + device per-GB); sustainable-web methodology is acceptable with caveats [11], [13].                                                                                                            |
|  **E-commerce (digital only)**   |  Session incl. search, product views, checkout  |  **session** mapped to **GB**                                |  Keep *fulfilment/shipping* out of this layer; digital use only [11], [13].                                                                                                                                                                 |
|  **Cloud storage**               |  Upload/download/sync                           |  **GB transferred**                                          |  Per-GB with Ontario grid; optional device idle draw [10], [11], [13].                                                                                                                                                                     |
|  **LLM chat**                    |  LLM inference—general-purpose chat             |  **1,000 tokens**                                            |  Provider/model-class-specific EF where available; otherwise publish range and method with hardware mix assumptions; Ontario grid where inference runs is unknown → keep as average grid unless provider discloses location [5], [7]–[9].  |
|  **AI image generation**         |  Text→image (e.g., 512–1024 px)                 |  **image**                                                   |  Model- and hardware-dependent; treat like “inference batch” with per-image kWh estimates if disclosed; otherwise range with method notes [5], [7], [8].                                                                                   |
|  **AI GPU time (expert mode)**   |  Inference/training compute                     |  **GPU-hour** (classed H100/A100/L40S, etc.)                 |  Backstop unit when provider gives GPU-hours; multiply by PUE and grid intensity; separates training/fine-tune from consumer use [6], [8], [9], [14], [15].                                                                              |

**Why these units?**

- OTT and conferencing are naturally **per hour**; social/audio often fits **per hour** too.
- Downloads/storage/browsing/e-commerce are best expressed **per GB** (low-to-moderate bitrate), acknowledging IEA’s warning that kWh/GB breaks for *high-bitrate* streaming—hence the explicit OTT per-hour modeling [12].
- AI gets **per-1k tokens / per image / per GPU-hour** to reflect how costs scale in practice [5], [7]–[9], [14], [15].

## 3) Minimal catalog to seed `activities` (examples; add as needed)

- `MEDIA.STREAM.HD.HOUR.TV`, `MEDIA.STREAM.HD.HOUR.LAPTOP`, `MEDIA.STREAM.4K.HOUR.TV`
- `SOCIAL.SHORTVIDEO.HOUR.MOBILE`, `SOCIAL.SCROLL.HOUR.MOBILE`
- `CONF.HD.PER_PARTICIPANT_HOUR`, `CONF.SD.PER_PARTICIPANT_HOUR`
- `AUDIO.STREAM.HOUR.MOBILE`, `AUDIO.STREAM.HOUR.WIFI`
- `CLOUD.DOWNLOAD.GB`, `CLOUD.UPLOAD.GB`
- `WEB.BROWSING.1000PAGEVIEWS`, `ECOM.SESSION.GB`
- `AI.LLM.INFER.1K_TOKENS.GENERIC`, `AI.IMAGE.GEN.1_IMAGE.GENERIC`
- `AI.GPU.H100.HOUR`, `AI.GPU.A100.HOUR` *(advanced users only)*

Keep **resolution**, **device class**, and **access (mobile vs Wi-Fi)** in the slug to avoid new join tables. If a parameter is unknown, use a generic slug and fill `description`/`notes`.

## 4) Emission-factor sourcing plan (credible, current, and Ontario-aware)

- **OTT video:** Use DIMPACT/Carbon Trust for *per-hour* streaming, making clear the *device dominates*; the 2021 white paper quotes ~**55 gCO₂e per streaming hour** (Europe, 2020 device mix). Treat this as a *starter* EF and re-scale to Ontario grid and your device assumptions; cite clearly that device is the largest lever [1], [2], [10], [12], [16].
- **Networks / per-GB:** Use IEA/EC/JRC literature for network electricity and note uncertainty; typical fixed vs mobile intensities cited around ~**0.03–0.14 kWh/GB** depending on access, vintage, and method. Use this only for **low-to-moderate bitrate** categories (browsing, downloads, social), not for OTT [11], [12], [17].
- **Devices:** Draws vary widely (phone 2–6 W; laptop 15–60 W; TV 80–200 W). Rather than hard-coding now, keep a **device-power assumption block** you can swap; then compute device-kWh = power × hours and apply Ontario grid intensity (from IESO) [10].
- **Data centres (aggregate context):** IEA and LBNL provide bounded ranges and trends for DC energy; use them as **sanity checks** and to justify method choices (not as direct per-unit EFs) [3], [4], [14], [15].
- **AI training/inference:** Combine (a) provider disclosures/best-practice papers (Patterson et al.), (b) model-specific studies (e.g., BLOOM training), and (c) macro energy assessments (de Vries) to frame **per-1k token** ranges and **GPU-hour** backstops. Lock all method notes and hardware assumptions in `emission_factors.method_notes` [5], [7]–[9], [14].

## 5) How we compute (without adding schema)

You can do all of this with the five tables you already approved:

- **Per-hour activities (OTT, conferencing, audio):**

  `EF_hour = (device_kWh_per_hour × grid_g/kWh) + (network_kWh_per_hour × grid_g/kWh) + (DC_kWh_per_hour × grid_g/kWh)`

  Save just the **final** gCO₂e/hour in `emission_factors.value_g_per_unit`, keep the decomposition and Ontario-grid assumption in `method_notes` + `vintage_year` + `source_id` list [1], [10]–[13], [16].

- **Per-GB activities (downloads, browsing, storage):**

  `EF_GB = (kWh/GB_DC + kWh/GB_network + kWh/GB_device) × grid_g/kWh`

  Note: for simple browsing you may omit device per-GB and handle device draw as **per-hour** if you prefer; both approaches are defensible if documented [11], [13].

- **AI LLM inference:**

  Start with a **range** per 1k tokens for a generic model class, with a path to override per provider/model when disclosed; backstop with **GPU-hour** multipliers when you have inference GPU seconds per 1k tokens [5], [7]–[9], [14], [15].

- **Nullability:**

  If you lack any component, leave uncertainty bounds **NULL** and proceed with a central estimate. If the whole EF is unknown, leave it **NULL**; the calc view will exclude the row.

## 6) Example export rows (placeholders; EFs to be populated from sources)

*(Illustrative only—values left blank to avoid inventing numbers.)*

|  Category           |  Activity                        |              Unit  |  Freq/day  |            EF (g CO₂e/unit) [n]  |  Daily (g)  |  Weekly (g)  |  Annual (kg)  |  Scope            |  Region      |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
|  media\_online      |  Streaming—HD on TV              |              hour  |       1.2  |                     — [1], [2]  |          —  |           —  |            —  |  Electricity LCA  |  CA-ON       |
|  social\_online     |  Short-video scroll (mobile)     |              hour  |       0.7  |            — [11], [12], [13]  |          —  |           —  |            —  |  Electricity LCA  |  CA-ON       |
|  conf\_online       |  Videoconf—HD (per participant)  |  participant-hour  |       0.8  |                   — [10], [12]  |          —  |           —  |            —  |  Electricity LCA  |  CA-ON       |
|  cloud              |  Download/update                 |                GB  |       2.0  |                   — [11], [12]  |          —  |           —  |            —  |  Electricity LCA  |  CA-ON       |
|  ai\_online         |  LLM chat (generic)              |      1,000 tokens  |        40  |  — [5], [7], [8], [9], [14]  |          —  |           —  |            —  |  DC electricity   |  global/avg  |
|  ecommerce\_online  |  E-commerce session (digital)    |                GB  |       0.2  |                   — [11], [13]  |          —  |           —  |            —  |  Electricity LCA  |  CA-ON       |

## 7) Visuals (Plotly) and citation handling

- **Controls:** toggles for **device** (TV/laptop/phone), **access** (Wi-Fi/mobile), **resolution** (SD/HD/4K), and **provider-disclosed AI model** (when available).
- **Charts:**

1. **Stacked bars** (daily → annual) by service family.
2. **Bubble plot**: X = frequency; Y = EF per unit; size = annual kg; hover shows method and **[n]**.
3. **What-if panel**: device power sliders and resolution selectors; recompute live.

- **Citations:**

- Hover text embeds IEEE numbers (e.g., “EF: 55 g/h baseline [1]”).
- A fixed **References** block under each figure prints full IEEE entries, in the order of first appearance.
- The figure JSON stores the **citation order** to make exports deterministic.

## 8) Manageability rules (so this doesn’t explode)

- Keep the *first* release to **≤10 activities** (two per family).
- Use **Ontario grid** as default; store the year (`vintage_year`) and adjust later if you want real-time intensity.
- Do **not** mix e-commerce logistics here; that stays in your light-industrial/logistics layer.

***

## References

[1] Carbon Trust and DIMPACT, “The Carbon Impact of Video Streaming,” 2021. Available: [https://dimpact.org/resources](https://dimpact.org/resources)

[2] Netflix, “2022 Environmental Social Governance Report,” 2023, p. 36. Available: [https://downloads.ctfassets.net/4cd45et68cgf/7rnC6zK537cM8zAGrXA90E/3c654a2d0023a4dac26a20b2fff39855/Netflix_2022-ESG-Report-FINAL.pdf](https://downloads.ctfassets.net/4cd45et68cgf/7rnC6zK537cM8zAGrXA90E/3c654a2d0023a4dac26a20b2fff39855/Netflix_2022-ESG-Report-FINAL.pdf)

[3] International Energy Agency (IEA), “Data Centres and Data Transmission Networks,” 2023. Available: [https://www.iea.org/energy-system/buildings/data-centres-and-data-transmission-networks](https://www.iea.org/energy-system/buildings/data-centres-and-data-transmission-networks)

[4] Lawrence Berkeley National Laboratory, “2024 United States Data Center Energy Usage Report,” 2024. Available: [https://eta-publications.lbl.gov/sites/default/files/2024-12/lbnl-2024-united-states-data-center-energy-usage-report_1.pdf](https://eta-publications.lbl.gov/sites/default/files/2024-12/lbnl-2024-united-states-data-center-energy-usage-report_1.pdf)

[5] A. de Vries, “The Growing Energy Footprint of Artificial Intelligence,” *Joule*, 2023. Available: [https://www.sciencedirect.com/science/article/pii/S2542435123003653](https://www.sciencedirect.com/science/article/pii/S2542435123003653)

[6] D. Patterson et al., “The Carbon Footprint of Machine Learning Training Will Plateau, Then Shrink,” 2022. Available: [https://arxiv.org/abs/2204.05149](https://arxiv.org/abs/2204.05149)

[7] A. S. Luccioni, S. Viguier, and A.-L. Ligozat, “Estimating the Carbon Footprint of BLOOM, a 176B Parameter Language Model,” *JMLR*, 2023. Available: [https://www.jmlr.org/papers/volume24/23-0069/23-0069.pdf](https://www.jmlr.org/papers/volume24/23-0069/23-0069.pdf)

[8] Google Research, “Good News About the Carbon Footprint of Machine Learning Training,” 2022. Available: [https://research.google/blog/good-news-about-the-carbon-footprint-of-machine-learning-training/](https://research.google/blog/good-news-about-the-carbon-footprint-of-machine-learning-training/)

[9] IEA, “Energy Demand from AI,” 2025. Available: [https://www.iea.org/reports/energy-and-ai/energy-demand-from-ai](https://www.iea.org/reports/energy-and-ai/energy-demand-from-ai)

[10] IESO, “Ontario Power Data—Emissions and Grid Intensity,” 2024–2025. Available: [https://www.ieso.ca/en/Power-Data/Data-Directory](https://www.ieso.ca/en/Power-Data/Data-Directory)

[11] Sustainable Web Design, “Estimating Digital Emissions (methodology),” 2023. Available: [https://sustainablewebdesign.org/estimating-digital-emissions/](https://sustainablewebdesign.org/estimating-digital-emissions/)

[12] IEA, “The Carbon Footprint of Streaming Video: Fact-Checking the Headlines,” 2020. Available: [https://www.iea.org/commentaries/the-carbon-footprint-of-streaming-video-fact-checking-the-headlines](https://www.iea.org/commentaries/the-carbon-footprint-of-streaming-video-fact-checking-the-headlines)

[13] Scope3, “Data Transfer—Methodology Notes,” 2024. Available: [https://methodology.scope3.com/data_transfer](https://methodology.scope3.com/data_transfer)

[14] IEA 4E, “Data Centre Energy Use: Critical Review of Models and Results,” 2025. Available: [https://www.iea-4e.org/wp-content/uploads/2025/05/Data-Centre-Energy-Use-Critical-Review-of-Models-and-Results.pdf](https://www.iea-4e.org/wp-content/uploads/2025/05/Data-Centre-Energy-Use-Critical-Review-of-Models-and-Results.pdf)

[15] A. Shehabi et al., “2024 United States Data Center Energy Usage Report,” LBNL, 2024. Available: [https://eta-publications.lbl.gov/sites/default/files/2024-12/lbnl-2024-united-states-data-center-energy-usage-report_1.pdf](https://eta-publications.lbl.gov/sites/default/files/2024-12/lbnl-2024-united-states-data-center-energy-usage-report_1.pdf)

[16] Netflix, “What the Latest Research on Streaming Emissions Tells Us,” 2023. Available: [https://about.netflix.com/news/what-the-latest-research-on-streaming-emissions-tells-us](https://about.netflix.com/news/what-the-latest-research-on-streaming-emissions-tells-us)

*(All rows remain consistent with your v1.1-core: no schema additions, nullable bounds where evidence is thin, and strict separation of digital-only use from physical fulfilment.)*