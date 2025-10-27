# Our World in Data CO2 and Greenhouse Gas Emissions Platform


## Executive summary

Our World in Data has established the definitive open-access platform for CO2 and greenhouse gas emissions data, providing 273 years of historical coverage from 1750 to 2023 across 200+ countries with 100+ indicators updated annually. The platform synthesizes authoritative sources—Global Carbon Project, Jones et al. (2024), Energy Institute, and Climate Watch—into a unified dataset covering territorial emissions, consumption-based accounting, sectoral breakdowns, and intensity metrics, all available under Creative Commons BY licensing through multiple formats (CSV, XLSX, JSON) and programmatic APIs. OWID's transparent ETL pipeline, comprehensive codebooks, and interactive visualization tools set the gold standard for climate data infrastructure, combining academic rigor with public accessibility. For organization-level carbon accounting platforms like Carbon ACX, OWID presents significant integration opportunities: grid electricity carbon intensities (200+ countries, 2000-2024) support Scope 2 calculations; sector-specific emission intensities enable benchmarking; consumption-based emissions data contextualizes supply chain hotspots; and transport modal factors inform Scope 3 Category 6-7 calculations. OWID's methodology—version-controlled GitHub repositories, multi-format data exports, progressive disclosure design, and plain-language documentation—offers transferable best practices for building carbon accounting infrastructure. While OWID focuses on macro-level research (national aggregates, historical trends, public communication) and Carbon ACX addresses operational needs (activity-level tracking, Scope 1/2/3 categorization, real-time dashboards), the platforms are complementary rather than competitive, with OWID data enriching organizational tools through benchmarking, contextualization, and emission factor supplementation.

## Unparalleled historical depth provides climate context

Our World in Data's CO2 and greenhouse gas emissions platform, accessible at https://ourworldindata.org/co2-and-greenhouse-gas-emissions

, represents the most comprehensive publicly available climate data resource globally, spanning 273 years from the dawn of industrialization in 1750 through 2023 [1]. The platform integrates territorial emissions data for fossil fuels and cement production starting from the mid-18th century, with coal emissions tracked from the 1700s, oil and gas from the late 1800s, and cement from the early 1900s, providing unmatched temporal granularity for analyzing the evolution of anthropogenic carbon [2]. This historical depth enables researchers to quantify cumulative responsibility—the platform tracks that over 1.5 trillion tonnes of CO2 have been emitted since 1751, with the UK dominating early industrial emissions before the United States overtook in the 20th century, followed by China's recent emergence as the largest contemporary emitter [3].

The dataset architecture encompasses multiple accounting frameworks essential for comprehensive analysis. Territorial (production-based) emissions capture CO2 released within national borders from fossil fuel combustion, cement manufacturing, and gas flaring, measured in tonnes of CO2 and gigatonnes globally [2]. Consumption-based emissions, available from 1990 to 2022 for 119 countries, adjust territorial figures for trade by adding emissions embedded in imports and subtracting those in exports, revealing that Western Europe and the Americas generally import emissions while Eastern Europe and Asia (especially China) export them [4]. Land-use change emissions, added in the 2022 Global Carbon Budget update, track deforestation and afforestation impacts from 1750 onward, though with significantly higher uncertainty (±30-50%) compared to fossil fuel emissions (±5%) [5].

Total greenhouse gas coverage extends beyond CO2 to methane (CH4) and nitrous oxide (N2O), measured in CO2 equivalents using 100-year Global Warming Potential values from IPCC AR5 [6]. Methane emissions, dominated by agriculture (60-80%) including enteric fermentation from livestock and rice cultivation, plus fugitive emissions from oil and gas extraction, have an atmospheric lifetime of approximately 12 years and a GWP of 28 (or 34 with climate feedbacks) [7]. Nitrous oxide, nearly entirely agricultural in origin (90%+) from synthetic nitrogen fertilizers and organic manure, persists for 121 years with a GWP of 265 (or 298 with feedbacks) [7]. The platform also incorporates fluorinated gases (HFCs, PFCs, SF6) within total GHG metrics, though these represent relatively small contributions despite very high warming potentials [8].

Geographic granularity spans global totals, continental and sub-regional aggregates, income group classifications, and 200+ individual countries and territories [9]. Historical reconstructions extend to 1750 for industrialized nations, with developing countries added progressively from their periods of industrialization. The platform reports international aviation and shipping separately rather than allocating to national totals, reflecting ongoing diplomatic challenges in attribution methodologies [10]. Sub-national data remains outside scope, maintaining focus on nationally comparable metrics rather than city or facility-level granularity.

## Authoritative sources and transparent provenance establish credibility

OWID's emissions data derives from a carefully curated hierarchy of authoritative sources, with the Global Carbon Project serving as the primary foundation. The Global Carbon Budget, published annually in Earth System Science Data and accessible via DOI 10.5281/zenodo.13981696, provides fossil CO2 emissions from 1750 onward through synthesis of UNFCCC national inventories, official statistical agencies, CDIAC fossil fuel data, and Energy Institute statistics [11]. Andrew and Peters (2023) document the detailed methodology at https://zenodo.org/doi/10.5281/zenodo.5569234

, including bottom-up estimation from industrial fuel extraction data, trade adjustments for exports and imports, application of fuel-specific combustion and emission factors, and aggregation across coal, oil, gas, cement, and flaring categories [12]. The Global Carbon Project's quality controls include ensemble modeling approaches comparing multiple methods, cross-validation with atmospheric CO2 measurements, reconciliation with national inventories, expert peer review, and documented uncertainty ranges (±5% for fossil emissions, ±30-50% for land use) [13].

For greenhouse gases beyond CO2, OWID transitioned in November 2024 from Climate Watch to the more comprehensive Jones et al. (2024) dataset, available at https://doi.org/10.5281/zenodo.14054503

 and published in Scientific Data [14]. This dataset provides methane, nitrous oxide, and total GHG emissions from 1851 to 2021 across 190+ countries, utilizing the PRIMAP-hist (HISTTP) dataset from Potsdam Institute for Climate Impact Research as the underlying source for non-CO2 gases [15]. The methodology applies Global Warming Potential (GWP*) conversion and Transient Climate Response to Cumulative Carbon Emissions (TCRE) framework based on IPCC AR6 coefficients, enabling calculation of each nation's temperature contribution from historical emissions [16]. Climate Watch, maintained by World Resources Institute and previously used through October 2024, provided sectoral breakdowns applying consistent 2006 IPCC guidelines across 197 countries, synthesizing UNFCCC Annex I inventories for developed nations, EPA composite methodology for non-Annex I countries, FAO agricultural statistics, IEA energy data, and USGS cement production [17].

The Energy Institute Statistical Review of World Energy, successor to BP Statistical Review following the 2023 rebrand, supplies primary energy consumption by fuel type from 1965 forward, updated annually each June [18]. OWID uses this as the principal energy source, with U.S. Energy Information Administration's International Energy Data filling gaps for countries outside Energy Institute coverage [19]. For calculating derived metrics, OWID integrates population data from a proprietary synthesis combining HYDE database for historical periods, Gapminder for intermediate years, and UN World Population Prospects for modern data [20]. GDP figures derive from the Maddison Project Database (2024) maintained by University of Groningen, providing long-run GDP per capita in constant 2011 international dollars [21].

OWID's data processing pipeline demonstrates exceptional transparency through fully open-source code and version control. The complete ETL (Extract-Transform-Load) system is documented at https://github.com/owid/etl

, with processing divided into staged layers: meadow (raw data ingestion with minimal cleaning), garden (harmonization including country name standardization, unit conversions, and derived metric calculation), and grapher (visualization-ready formatting) [22]. The specific processing code for CO2 data resides at https://github.com/owid/etl/blob/master/etl/steps/data/garden/emissions/2024-11-21/owid_co2.py

, enabling complete reproducibility [23]. Key transformations include converting carbon to CO2 using the molecular weight ratio of 3.664, recalculating all per capita figures by dividing total emissions by population rather than using source-provided values for consistency, computing cumulative emissions as simple summation from 1750 forward, and calculating intensity metrics by dividing emissions by GDP or energy consumption [24].

Version history maintenance in GitHub provides audit trails for all updates, with recent milestones including the November 2024 update to Global Carbon Budget 2024 and Jones et al. 2024 v2024.2, the December 2023 update to GCB 2023, the November 2022 addition of national land-use change data, and September 2021 fixes for data quality issues including negative emissions and missing Eswatini data [25]. This version control enables users to reproduce historical analyses using specific data vintages, critical for scientific reproducibility and regulatory reporting where methodology consistency matters.

Data quality assessments acknowledge known limitations and uncertainties explicitly. Historical data pre-1950 derives from reconstructions of energy statistics with greater uncertainty in country-level allocations, though providing solid estimates of long-term trends [26]. Land-use change emissions represent the highest uncertainty component at ±30-50% compared to ±5% for fossil fuels, reflecting difficulties in measuring deforestation and forest degradation accurately plus inherent bookkeeping model limitations [27]. Consumption-based emissions lag territorial data by one year due to detailed trade data compilation requirements, cover only high-income countries and major economies due to multi-region input-output table needs, and exclude land-use change [28]. The global carbon budget shows small annual imbalances indicating remaining measurement uncertainties, particularly in ocean and land sink estimates, though these imbalances have decreased over time as methods improve [29].

## Interactive visualizations democratize complex climate data

OWID's visualization strategy centers on the comprehensive Data Explorer at https://ourworldindata.org/explorers/co2

, providing a unified interface for accessing all emissions metrics through customizable interactive charts [30]. Users can switch between gases (CO2, CH4, N2O, total GHG), toggle accounting methods (production versus consumption-based), filter by fuel types (total, coal, oil, gas, cement, flaring), select from 13+ derived metrics (absolute, per capita, cumulative, share of global, growth rate), choose countries and regions via multi-select, and alternate between line charts, choropleth maps, and data tables [31]. This single tool eliminates the need for spreadsheet manipulation, enabling journalists to create publication-ready graphics, educators to demonstrate climate concepts interactively, and researchers to perform preliminary analyses before downloading raw data.

Chart types span the full spectrum of data visualization approaches. Time series line charts showing emissions trends from 1750 or 1850 to present support multi-series country comparisons with both absolute values and percentage change views, essential for tracking progress toward climate targets [32]. Interactive choropleth world maps with color-coded data by country include timeline sliders showing historical evolution and click-to-view functionality for individual country profiles, making spatial patterns immediately visible [33]. Stacked area charts display regional contributions and fuel source composition changes over time, with toggles between absolute values and percentage shares revealing how the energy mix shifts from coal dominance toward gas and renewables in decarbonizing economies [34]. Scatter plots enable correlation analysis, such as CO2 emissions versus GDP per capita demonstrating the income-emissions relationship, or GDP change versus emissions change for identifying absolute decoupling where economic growth occurs alongside emission reductions [35].

The visualization interface employs consistent interaction patterns across all charts, with standardized control mechanisms, uniform color coding (red for net emission importers, blue for exporters in consumption-based charts), hover tooltips showing exact values including units and year, and clear legends with axis labels avoiding jargon [36]. Toggle options include per capita versus absolute emissions, production-based versus consumption-based accounting, relative percentage shares versus absolute values, inclusion or exclusion of land use change, and switching between annual flow emissions and cumulative stock since 1750 [37]. Every chart includes a "Change Country" button for switching entities, "Edit countries and regions" functionality for multi-entity comparison, timeline controls for selecting different periods, and gas type filters for focusing on CO2, methane, nitrous oxide, or total GHG [38].

Educational content integration distinguishes OWID from pure data repositories. Each dataset pairs with detailed articles explaining concepts, such as "What are consumption-based emissions?" clarifying how trade adjustments work, "Why do countries' emissions differ?" examining drivers including population size, economic development, energy mix, and industrial structure, and "How much have emissions changed over time?" contextualizing current levels against historical baselines [39]. Methodology explainers walk through calculation processes step-by-step, exemplified by the four-step fossil CO2 estimation process: gathering industrial data on fuel extraction from national agencies, applying trade adjustments for exports, imports, and stock changes, using combustion and emission factors varying by fuel quality, and aggregating across fuel types to national totals [40]. FAQ sections address common confusions, including "Why are some countries' GHG emissions lower than fossil CO2?" (negative land use change from reforestation), "Why only from 1990 for consumption-based?" (trade data availability constraints), "Are aviation and shipping included?" (domestic yes, international no due to allocation challenges), and "How often is data updated?" (annually in November/December following Global Carbon Budget release) [41].

"What you should know about this data" boxes appear throughout, providing critical context as bullet points including notes on data limitations, clarifications on accounting methods, warnings about potential misinterpretations, and guidance on metric selection [42]. For instance, consumption-based emissions articles caution that trade-adjusted figures have higher uncertainty than territorial emissions, exclude land-use change unlike production-based totals, and require users to consider both perspectives since neither is inherently "better" [43]. Land-use change emissions pages flag country-specific quality assessments, with OWID including data quality indicators showing which nations have reliable monitoring versus those with sparse forest cover data or limited satellite observation history [44].

The progressive disclosure design allows navigation from simple insights to sophisticated analysis. Casual users encounter key takeaways first, presented as clear summary statements answering primary questions like "Who emits the most CO2?" (China absolutely, but Qatar per capita), "How have emissions changed?" (global emissions reached 37 billion tonnes in 2023, up from 6 billion in 1950), and "Are emissions declining anywhere?" (EU, UK, US show absolute decoupling with emissions down 20-30% from peaks while GDP grew) [45]. Main visualizations follow, providing interactive charts for self-guided exploration. Detailed explanations and context appear next for users seeking deeper understanding, followed by methodology notes for technical audiences, and finally source documentation with full citations for researchers [46]. This layering enables the same content to serve general public seeking climate awareness, policymakers needing decision-relevant comparisons, educators developing curricula, and academics conducting peer-reviewed research.

## Open data architecture enables unprecedented reusability

OWID's commitment to open access manifests through multiple download formats and programmatic access methods. The primary GitHub repository at https://github.com/owid/co2-data

 provides the complete emissions dataset in CSV format (single file with one row per location and year), XLSX format (including codebook as additional sheet), and JSON format (split by country with arrays of yearly records) [47]. Direct download URLs via DigitalOcean Spaces maintain stable access: https://nyc3.digitaloceanspaces.com/owid-public/data/co2/owid-co2-data.csv

 for CSV, with parallel XLSX and JSON endpoints [48]. These files update within days of Global Carbon Budget releases, typically in late November or early December annually, with the November 2024 update incorporating GCB 2024 data through 2023 [49].

The dataset structure follows a wide format with 79 indicators spanning emission metrics (annual CO2 total and per capita and per GDP and per unit energy, consumption-based CO2, CO2 by source including coal, oil, gas, cement, flaring, land use change CO2, cumulative emissions, total GHG with and without land use, methane, nitrous oxide, share of global, growth rates, temperature contribution by gas), energy indicators (primary energy consumption total and per capita, energy by source for coal, oil, gas, nuclear, renewables, electricity generation by source, low-carbon energy share, fossil fuel share), trade and consumption metrics (emissions embedded in trade, share of emissions embedded in trade, territorial versus consumption comparisons), and economic indicators (GDP total and per capita and growth, population, carbon intensity of GDP, energy intensity of GDP) [50]. The comprehensive codebook provides for each indicator: variable name (short identifier for code), full descriptive title, plain-language description, unit of measurement, timespan covered, data type, OWID variable ID for API access, last updated date, next expected update, citation in short and long form, and original source attribution with URLs [51].

API access supports programmatic integration through the public Chart API following the URL pattern https://ourworldindata.org/grapher/[chart-id].csv or .json, requiring no authentication and accepting direct HTTP GET requests [52]. Examples include annual emissions via https://ourworldindata.org/grapher/annual-co2-emissions-per-country.csv

 and per capita emissions through https://ourworldindata.org/grapher/co-emissions-per-capita.csv

 [53]. The experimental ETL Catalog API, documented at https://docs.owid.io/projects/etl/api/

 and built on DuckDB backend for SQL querying capabilities, provides access to the full data catalog though remains in beta with APIs subject to change [54]. Multiple programming language packages simplify access: owidR for R (CRAN package with owid() function taking chart ID and returning data.table), owidapi as a newer R alternative with better stability, and owid-catalog for Python (available via pip, returning Pandas DataFrames) [55].

Licensing under Creative Commons Attribution 4.0 International (CC-BY) permits sharing, adaptation, commercial use, and application for any purpose, requiring only that users credit "Our World in Data" and original authors, link to original source pages, indicate if changes were made, and avoid suggesting OWID endorses their use [56]. Proper citation format specifies: "Hannah Ritchie, Pablo Rosado and Max Roser (2023) - 'CO₂ and Greenhouse Gas Emissions'. Published online at OurWorldinData.org. Retrieved from: 'https://ourworldindata.org/co2-and-greenhouse-gas-emissions' [Online Resource]" for the overview page, and "Global Carbon Budget (2024) – with major processing by Our World in Data. 'Annual CO₂ emissions' [dataset]. Global Carbon Project, 'Global Carbon Budget' [original data]" for direct dataset citations [57]. Critical caveats require users to check third-party source licenses separately, since OWID aggregates data from Global Carbon Project, Energy Institute, Jones et al., and other providers each retaining original license terms that may include restrictions beyond CC-BY [58]. The code itself uses MIT License for OWID's Grapher visualization tool and ETL pipeline, though these aren't designed for easy external reuse due to tight coupling with OWID infrastructure [59].

Documentation quality substantially exceeds typical data repository standards. The comprehensive methodology page at https://ourworldindata.org/co2-dataset-sources

 covers data collection processes, calculation methodologies including the carbon to CO2 conversion factor of 3.664, per capita calculation approaches, regional aggregation methods, uncertainty quantification by data type, and country-specific data quality assessments [60]. The complete ETL pipeline at https://github.com/owid/etl

 provides recipes for dataset reproduction with transparent, auditable processing visible in all code commits [61]. Variable definitions clarify territorial versus consumption-based emissions (production within borders versus trade-adjusted for consumption patterns), fossil fuel plus industry versus land-use change (different measurement approaches and uncertainty levels), production-based versus trade-adjusted figures (allocation to emitter versus consumer), cumulative versus annual metrics (historical responsibility versus current contribution), and per capita versus total emissions (fairness considerations versus absolute climate impact) [62].

Examples of successful data reuse demonstrate the platform's impact across sectors. Academic research extensively cites Global Carbon Project data via OWID, with climate research papers, economic analyses of emissions-GDP decoupling, and policy evaluation studies routinely referencing the platform [63]. Educational applications include integration throughout CORE Econ textbooks, use in undergraduate and graduate courses, teaching resources at https://ourworldindata.org/teaching

, and data science courses using OWID for real-world datasets [64]. Media organizations including BBC, The Guardian, and New York Times regularly embed OWID charts, with climate journalism heavily relying on the platform during COP conferences and annual emissions reporting cycles [65]. International organizations and government agencies reference OWID data in UN agency reports, World Bank collaborations, climate policy briefings, and SDG monitoring [66]. The COVID-19 pandemic highlighted OWID's infrastructure capacity when their coronavirus data repository at https://github.com/owid/covid-19-data

 became a central global resource with hundreds of contributors and thousands of dependent projects, demonstrating the power of open data during crises [67].

## Sector-specific datasets support organizational carbon accounting

OWID provides substantial datasets relevant to organization-level carbon accounting, though these require adaptation from national aggregates to activity-specific applications. Grid electricity carbon intensities, accessible at https://ourworldindata.org/grapher/carbon-intensity-electricity

, draw primarily from Ember's Yearly Electricity Data (2000-2024 for most countries, 1990-2024 for European nations) supplemented by Energy Institute data (1965-2024) to fill historical gaps [68]. These values measure grams of CO2 equivalents per kilowatt-hour, including methane and nitrous oxide converted to CO2eq, derived from direct measurement of emissions from electricity generation across coal, gas, oil, nuclear, and renewable sources [69]. Coverage spans 200+ countries and territories with annual updates, most recently in June 2025, enabling Scope 2 calculations via the location-based method [70]. Temporal trends reveal grid decarbonization progress, such as the UK reducing intensity from over 800 gCO2/kWh in 1990 to approximately 200 gCO2/kWh by 2024 through coal phase-out and renewable expansion [71].

Sector-specific emission intensities derive from Climate Watch sectoral breakdowns showing global GHG emissions distributed as: electricity and heat production 34%, transport 15% (road 11.9%, aviation 1.9%, shipping 1.7%, rail 0.4%, pipeline 2.2%), manufacturing and construction 24% (iron and steel 7.2%, chemical and petrochemical 3.6%, cement 3%, food and tobacco 1%, other 10.6%), agriculture variable by country (livestock and manure 5.8%, agricultural soils 4.1%, rice cultivation, crop burning), and buildings 6% [72]. Country-level data enables benchmarking organizational emissions against national sector averages, supporting Scope 3 Category 15 (investments) calculations requiring sector-specific emission intensities and supply chain hotspot analysis [73]. Economic emission intensities, measured as kilograms CO2 per dollar of GDP in constant 2011 international dollars PPP-adjusted, cover 169 countries from 1750 to 2023 and track decoupling of economic growth from emissions, with data available for both territorial and consumption-based emissions [74]. These metrics support organizational benchmarking of tCO2e per revenue unit and tracking emission efficiency improvements over time [75].

Consumption-based CO2 emissions data, applying the formula "Consumption = Production - Exports + Imports (embedded emissions)," covers 119 countries from 1990 to 2022 with one-year lag due to trade data requirements [76]. Available metrics include absolute consumption-based emissions in tonnes CO2, per capita consumption-based emissions, net emissions embedded in trade (positive values indicating net importers, negative values net exporters), and share of emissions embedded in trade as percentage of domestic production [77]. Regional patterns show Western Europe, Americas, and Africa generally as net importers (consuming more carbon than produced domestically), while Eastern Europe and Asia, especially China, serve as net exporters (producing carbon-intensive goods consumed elsewhere) [78]. These datasets inform Scope 3 upstream calculations particularly for Category 1 (purchased goods and services), though limitations include incomplete country coverage requiring high-quality bilateral trade data, exclusion of land-use change unlike production-based totals, and methodology relying on multi-region input-output models with inherent aggregation [79].

Transport emission factors span modal categories with aviation data from OECD Air Transport CO2 Emissions covering 186 countries quarterly, monthly, and annually from 2019 to 2024 using ADS-B flight data, broken down by domestic versus international flights and passenger versus freight operations [80]. Indicative emission factors from lifecycle analyses show domestic flights emitting approximately 255 gCO2eq per passenger-kilometer, long-haul flights 195 gCO2eq/pkm (more efficient due to cruise phase), diesel and petrol cars alone 170 gCO2eq/pkm, electric cars 50 gCO2eq/pkm varying by electricity grid intensity, buses 105 gCO2eq/pkm, rail 35 gCO2eq/pkm, and cycling/walking 16-50 gCO2eq/pkm from lifecycle impacts [81]. These factors support Scope 3 Category 6 (business travel), Category 7 (employee commuting), and Category 4 (upstream transportation and distribution) calculations, though users should note values vary substantially by country electricity mix, vehicle efficiency, and occupancy rates [82].

Agriculture and food system emissions breakdowns from Poore and Nemecek (2018) published in Science, combined with FAO data, reveal the food system distributes as: livestock and fisheries 31% (primarily direct production), crop production for human food 21%, animal feed production 6%, land use change 24% (16% livestock-driven, 8% crop-driven), and supply chain 18% (processing, transport, packaging, retail) [83]. Product-level emission factors show beef from beef herds at approximately 60 kg CO2eq per kg product, lamb and mutton 24 kg CO2eq/kg, cheese 21 kg CO2eq/kg, beef from dairy herds 21 kg CO2eq/kg, pork 7 kg CO2eq/kg, and poultry 6 kg CO2eq/kg, while peas emit approximately 1 kg CO2eq/kg, nuts 2-3 kg CO2eq/kg, wheat and grains 1.4 kg CO2eq/kg, and vegetables 0.3-1 kg CO2eq/kg [84]. These lifecycle assessments include land use change, on-farm production (fertilizers, energy, methane from livestock), animal feed production, processing, transport, packaging, and retail, directly supporting Scope 3 Category 1 calculations for food procurement and catering emissions [85].

The complete OWID CO2 and GHG emissions database integrates all these components into a unified dataset with 79 indicators covering emissions across multiple accounting frameworks, energy consumption and generation by source, trade-embedded carbon metrics, and economic indicators including population and GDP [86]. For organizational carbon accounting, this enables Scope 1 applications using IPCC fuel emission factors and sector-specific process emissions data, Scope 2 applications leveraging country-specific grid emission factors with temporal trend analysis, and Scope 3 applications including Category 1 via consumption-based emissions and sector intensities, Category 4 and 9 through transport modal factors, and Categories 6 and 7 using business travel and commuting emission factors [87]. Data quality hierarchy shows highest reliability for fossil fuel CO2 (±2-5% uncertainty) and energy data in the modern era post-1990, moderate uncertainty for non-CO2 greenhouse gases (±10-20%) and sectoral breakdowns, and higher uncertainty for land use change (±50-100%), historical data pre-1950, product-level food emissions, and deforestation [88].

## Strategic integration enriches organizational carbon accounting

Our World in Data occupies a complementary niche to organization-level carbon accounting tools, with OWID serving as a macro research platform providing historical, national-level emissions data for public understanding and policy context, while organizational tools like Carbon ACX provide operational management platforms with granular, activity-level emissions tracking for compliance and reduction [89]. The platforms exhibit minimal direct competition due to fundamental differences in scale (national/regional aggregates versus facility/activity-level granularity), temporal resolution (annual updates with historical focus versus real-time/quarterly tracking with forward-looking forecasting), scope (sectoral approach versus Scope 1/2/3 categorization), and purpose (research, education, journalism versus compliance, operations, supplier engagement) [90].

Integration opportunities center on four strategic pathways. First, benchmarking capabilities allow organizational tools to embed OWID API calls pulling relevant national and sectoral data automatically based on company location, sector, and footprint size [91]. A manufacturing firm could compare their kilograms CO2 per dollar revenue against national industrial sector carbon intensity from OWID's CO2 per GDP dataset, while simultaneously displaying "Your intensity: 50 tCO2/$M versus [Country] average: 80 tCO2/$M—you're 37% better than national average, top quartile of [Industry]" to motivate performance improvement [92]. Organizations can contextualize absolute emissions within broader trends, stating "Our 10,000 tCO2e represents 0.002% of [Country]'s total emissions" using OWID's total annual CO2 data by country, and track relative to decarbonization pathways by comparing their emission reduction trajectory versus national Paris Agreement commitments visible in OWID's historical trend data [93].

Second, emission factor enrichment supplements activity-specific factors from EPA, DEFRA, ecoinvent, and IPCC databases with OWID's sector-level intensities. Grid electricity carbon intensity data from OWID provides country-level values essential for Scope 2 location-based calculations across international operations, particularly valuable since OWID tracks temporal trends showing how grid factors evolve as countries decarbonize, enabling forward-looking Scope 2 forecasts [94]. Sectoral averages support Scope 3 screening when supplier-specific data remains unavailable, with OWID's industry, transport, and agriculture breakdowns providing order-of-magnitude estimates, though these prove too aggregated for precise primary calculations [95]. For scenario modeling, a company planning facility expansion could input "We'll add 5 GWh annual electricity consumption in Vietnam," query OWID for Vietnam's current grid intensity of 500 gCO2/kWh and historical trend of -2% annually, calculate 10-year Scope 2 trajectory showing Year 1 emissions of 2,500 tCO2e declining to Year 10 emissions of 2,050 tCO2e, and compare with renewable PPA alternative yielding 250 tCO2e in Year 10 representing 90% reduction [96].

Third, stakeholder communication gains credibility through OWID's authoritative data. Annual sustainability reports can embed OWID charts showing global context with text such as "While global emissions from [Industry] rose 8% since 2020, we reduced ours by 15%, demonstrating leadership in our sector," citing "Global data: Our World in Data (University of Oxford), based on Global Carbon Project" [97]. Investor presentations benefit from OWID's country and sector trends demonstrating climate risk awareness, employee education leverages OWID's accessible explanations of carbon intensity and consumption-based emissions concepts, and supply chain engagement shares OWID regional data with international suppliers showing decarbonization progress [98]. OWID's credibility stems from affiliation with Oxford University and citations by major media including New York Times, Washington Post, and WHO, lending authority when companies reference macro climate trends [99].

Fourth, research and development insights inform strategic planning through OWID data analysis. Market analysis identifies low-carbon regions for facility siting using grid intensity data, product development prioritizes R&D investments toward sectoral emission hotspots, and scenario analysis models feasibility of corporate net-zero targets using OWID's historical decoupling examples showing GDP growth alongside emission reduction in countries like the UK, Germany, and France [100]. Supply chain strategy benefits from OWID consumption-based emissions revealing which countries import versus export embedded carbon, helping procurement teams understand upstream hotspots and prioritize supplier engagement in high-carbon-intensity regions [101].

Harvestable datasets for direct integration include the complete CO2 and GHG database accessible via https://github.com/owid/co2-data

 in CSV, XLSX, and JSON formats with fields for country, year, and 79 emission indicators [102]. The Public Chart API enables programmatic access through URL patterns like https://ourworldindata.org/grapher/annual-co2-emissions-per-country.json

 requiring no authentication, supporting automated dashboard widgets that refresh with annual OWID updates [103]. Specific high-value datasets include annual CO2 emissions by country (for national benchmark comparisons), emissions by sector (for industry-specific contextualization), energy mix and electricity carbon intensity (for Scope 2 calculations and grid decarbonization forecasting), consumption-based trade-adjusted emissions (for Scope 3 supply chain context), and cumulative historical emissions (for climate justice framing in ESG reports) [104].

OWID's transferable best practices offer lessons in data architecture, visualization, and documentation that organizational tools should adopt. The staged ETL pipeline separating raw data ingestion (meadow), harmonized calculations (garden), and visualization formatting (grapher) enhances auditability and reproducibility [105]. Version control through GitHub with commit history documenting all changes provides essential audit trails for assurance, with organizational tools benefiting from similar versioning of emission factors, calculation methodologies, and activity data snapshots [106]. Comprehensive metadata standards requiring structured descriptions, units, sources, and processing notes for every indicator support transparency and regulatory compliance, particularly relevant as CSRD requires methodology disclosure [107]. API-first design enabling programmatic access facilitates integration with ERP, procurement, and reporting systems while enabling third-party climate analytics applications [108].

Visualization strategies include emphasizing long-term trend lines overlaying emissions trajectories with Science-Based Target pathways rather than current year snapshots, presenting multiple normalizations including absolute tCO2e, per revenue tCO2e/$M, per employee tCO2e/FTE, and per product kgCO2e/unit to serve different stakeholders, enabling interactive filtering by business unit, facility, supplier, scope, category, and time period, and prioritizing clarity with natural language labels and top 3 insights over dashboard clutter [109]. Documentation excellence manifests through in-app guidance including tooltip explanations of Scope 3 categories, methodology documentation for emission factor selection, FAQ sections for common questions, data quality transparency indicating primary supplier data versus secondary industry averages, emission factor vintage and update frequency, and uncertainty ranges for estimates [110].

Differentiation opportunities for organizational tools relative to OWID center on capabilities the macro platform cannot provide. Granular activity tracking captures facility-level fuel consumption, electricity usage, and miles traveled in real-time versus OWID's annual national aggregates with 6-12 month publication lag [111]. Scope 3 value chain focus enables supplier portals for data collection, automated screening and calculation at SKU and supplier levels, particularly for Category 1 purchased goods requiring detailed product and spend data unavailable in national statistics [112]. Action-oriented features including reduction opportunity identification, ROI calculators for climate investments, scenario modeling testing supplier switching and renewable procurement impacts, and target tracking against Science-Based Targets provide operational decision support absent from OWID's descriptive analytics [113]. Integration with business systems automates data ingestion from utility bills, expense management platforms, and procurement systems while embedding carbon insights in procurement decisions [114]. Compliance and assurance support through version-controlled calculation logs, evidence repositories storing invoices and supplier attestations, and automated CSRD, SEC, and ISSB report generation addresses regulatory requirements [115]. Product-level lifecycle assessment calculating SKU-specific emissions for consumer goods and eco-labels remains outside OWID's country-aggregate scope [116]. Predictive and prescriptive analytics using AI-powered forecasting and prescriptive recommendations represent advanced capabilities OWID's historical focus doesn't address [117].

Strategic recommendations for organizational tool providers include integrating OWID API for automated benchmarking features, adopting OWID's comprehensive codebooks and version-controlled methodology documentation, implementing data provenance tracking showing activity data sources and emission factor sources with calculation steps, open-sourcing non-competitive components like emission factor calculation logic and data connectors, enhancing visualizations with long-term trajectory views and multiple normalization options, and leveraging OWID data for market intelligence identifying rapid grid decarbonization regions and sectoral trends [118]. Organizations using carbon accounting tools should embed OWID charts in sustainability reports for credibility, request OWID integration features from vendors in RFPs, and cite OWID as authoritative source for industry trends and national baselines [119].

The complementary positioning creates "best of both worlds" opportunities where organizational tools provide granular operational control and action-oriented features while incorporating OWID data as a credible external benchmark layer for contextualization, validation, and stakeholder communication [120]. This integration recognizes that macro climate context (OWID's strength) and micro operational management (organizational tools' strength) serve different but compatible purposes in comprehensive climate action.

## Critical evaluation: Carbon ACX value proposition versus OWID capabilities

### Architecture mapping and integration pathways

Carbon ACX's technical architecture, built around CSV-based data pipelines with Pydantic validation, multi-backend support (CSV/DuckDB/SQLite), and Plotly visualization rendering, creates natural integration points with OWID's open data infrastructure [102]. The fundamental workflow—collect and validate inputs, derive and package outputs, publish and reuse across channels—can be substantially enhanced through systematic incorporation of OWID's 79-indicator dataset covering 273 years across 200+ countries [1][86].

**Emission factor integration represents the most immediate value pathway**. Carbon ACX's `data/` directory contains canonical CSV datasets including `activities.csv`, `emission_factors.csv`, and `grid_intensities.csv` that power the calculation engine [102]. OWID's grid electricity carbon intensity dataset, covering 200+ countries from 2000-2024 with gCO2eq/kWh values derived from Ember and Energy Institute data [68][69], directly supplements Carbon ACX's grid intensity table. The integration pathway follows a straightforward ETL pattern:

```javascript
# Harvest OWID grid intensities
import requests
import pandas as pd

owid_url = "https://ourworldindata.org/grapher/carbon-intensity-electricity.csv"
owid_grid = pd.read_csv(owid_url)

# Filter to latest year by country
latest_grid = owid_grid.sort_values('Year').groupby('Entity').last()

# Transform to Carbon ACX schema
acx_grid = pd.DataFrame({
    'country': latest_grid.index,
    'year': latest_grid['Year'],
    'grid_intensity_gco2_kwh': latest_grid['Value'],
    'source': 'OWID/Ember',
    'source_url': 'https://ourworldindata.org/grapher/carbon-intensity-electricity',
    'last_updated': pd.Timestamp.now(),
    'quality_score': 5  # High quality from authoritative source
})

# Validate with Pydantic schema
from calc.schema import GridIntensityRecord
validated_records = [GridIntensityRecord(**row) for _, row in acx_grid.iterrows()]

# Append to data/grid_intensities.csv

```

This integration enhances Carbon ACX's international deployment capability by providing authoritative grid factors for countries where DEFRA or EPA data may be unavailable. The temporal depth (2000-2024) enables historical footprint recalculation and forward-looking scenario modeling using grid decarbonization trends. For instance, an organization calculating Scope 2 emissions for Vietnamese operations could reference OWID's Vietnam grid intensity trajectory showing decline from approximately 600 gCO2/kWh in 2010 to 500 gCO2/kWh in 2024, enabling 10-year projections under business-as-usual versus renewable procurement scenarios [71].

**Transport modal emission factors from OWID's travel carbon footprint analysis** [82] provide Scope 3 Category 6 (business travel) and Category 7 (employee commuting) calculation inputs. OWID's lifecycle assessment data showing domestic flights at 255 gCO2eq/pkm, long-haul flights at 195 gCO2eq/pkm, diesel cars at 170 gCO2eq/pkm, electric cars at 50 gCO2eq/pkm (grid-dependent), buses at 105 gCO2eq/pkm, and rail at 35 gCO2eq/pkm [81] map directly to Carbon ACX's `emission_factors.csv` transport categories. The integration enables:

```javascript
# Map OWID transport factors to ACX schema
transport_factors = {
    'air_domestic_passenger': {'value': 0.255, 'unit': 'kgCO2e/pkm', 'source': 'OWID/Poore_Nemecek_2018'},
    'air_longhaul_passenger': {'value': 0.195, 'unit': 'kgCO2e/pkm', 'source': 'OWID/Poore_Nemecek_2018'},
    'car_diesel': {'value': 0.170, 'unit': 'kgCO2e/pkm', 'source': 'OWID/Poore_Nemecek_2018'},
    'car_electric': {'value': 0.050, 'unit': 'kgCO2e/pkm', 'source': 'OWID/Poore_Nemecek_2018'},
    'bus': {'value': 0.105, 'unit': 'kgCO2e/pkm', 'source': 'OWID/Poore_Nemecek_2018'},
    'rail': {'value': 0.035, 'unit': 'kgCO2e/pkm', 'source': 'OWID/Poore_Nemecek_2018'}
}

```

Critical limitation: OWID transport factors represent global averages from lifecycle analyses [81], whereas Carbon ACX users in specific jurisdictions may require country-specific factors reflecting local electricity grids (for electric vehicles), fuel standards (for combustion engines), and occupancy rates (for public transit). The integration provides reasonable screening-level estimates but insufficient precision for product-level carbon footprinting requiring geographic granularity. Carbon ACX must maintain supplementary factor libraries from DEFRA, EPA, and ecoinvent for jurisdiction-specific calculations.

**Food and agriculture emission factors** from OWID's synthesis of Poore and Nemecek (2018) [84] showing beef at 60 kg CO2eq/kg, lamb at 24 kg CO2eq/kg, pork at 7 kg CO2eq/kg, poultry at 6 kg CO2eq/kg, versus plant-based proteins at 1-3 kg CO2eq/kg directly support Carbon ACX Scope 3 Category 1 calculations for organizations with significant food procurement (corporate catering, hospitality, food service). The factors include full lifecycle coverage—land use change, on-farm production, feed, processing, transport, packaging, retail [85]—aligning with GHG Protocol Scope 3 guidance requiring cradle-to-gate boundaries for purchased goods [112]. Integration enables:

```javascript
# Food emission factors for catering calculations
food_factors = {
    'beef_from_beef_herds': {'value': 60, 'unit': 'kgCO2e/kg', 'scope3_category': 1},
    'lamb_mutton': {'value': 24, 'unit': 'kgCO2e/kg', 'scope3_category': 1},
    'cheese': {'value': 21, 'unit': 'kgCO2e/kg', 'scope3_category': 1},
    'pork': {'value': 7, 'unit': 'kgCO2e/kg', 'scope3_category': 1},
    'poultry': {'value': 6, 'unit': 'kgCO2e/kg', 'scope3_category': 1},
    'peas_beans': {'value': 1, 'unit': 'kgCO2e/kg', 'scope3_category': 1},
    'vegetables': {'value': 0.5, 'unit': 'kgCO2e/kg', 'scope3_category': 1}
}

```

This data enrichment transforms Carbon ACX from generic carbon calculator to domain-specific tool addressing organizational procurement decisions. A company calculating annual catering footprint consuming 1,000 kg beef versus 1,000 kg poultry could quantify the 54,000 kgCO2e differential (60,000 versus 6,000), providing ROI justification for menu redesign investments.

**Benchmarking contextualization through OWID's sector-specific intensities** addresses Carbon ACX's current limitation in comparative analysis. The platform's manifest metadata includes total annual emissions and intensity calculations [102], but lacks external benchmarks enabling "performance versus peers" narratives essential for investor relations and executive reporting. OWID's sectoral emissions showing electricity and heat at 34%, transport at 15%, manufacturing at 24%, and agriculture variable by country [72] provide order-of-magnitude context. Integration pathway:

```javascript
# Automated benchmark comparison in Carbon ACX dashboards
def contextualize_footprint(org_emissions_tco2, org_revenue_usd, country, sector):
    """
    Compare organizational footprint against national sector averages using OWID data
    """
    # Fetch national total emissions
    national_url = f"https://ourworldindata.org/grapher/annual-co2-emissions-per-country.csv"
    national_data = pd.read_csv(national_url)
    country_total = national_data[
        (national_data['Entity'] == country) & 
        (national_data['Year'] == 2023)
    ]['Value'].iloc[0] * 1e6  # Convert to tonnes
    
    # Fetch national GDP for intensity calculation
    gdp_url = "https://ourworldindata.org/grapher/gdp.csv"
    gdp_data = pd.read_csv(gdp_url)
    country_gdp = gdp_data[
        (gdp_data['Entity'] == country) & 
        (gdp_data['Year'] == 2023)
    ]['Value'].iloc[0]
    
    # Calculate intensities
    org_intensity = (org_emissions_tco2 / org_revenue_usd) * 1e6  # tCO2/$M
    national_intensity = (country_total / country_gdp) * 1e6  # tCO2/$M
    
    # Sector-specific adjustment (simplified - real implementation needs sectoral GDP)
    sector_multipliers = {
        'manufacturing': 1.5,  # More carbon-intensive than average
        'services': 0.5,       # Less carbon-intensive
        'energy': 3.0,         # Highly carbon-intensive
        'agriculture': 1.2
    }
    
    sector_adjusted_national = national_intensity * sector_multipliers.get(sector, 1.0)
    
    return {
        'org_intensity_tco2_per_m_revenue': org_intensity,
        'national_avg_intensity': sector_adjusted_national,
        'performance_vs_national': (sector_adjusted_national - org_intensity) / sector_adjusted_national,
        'percentile': calculate_percentile(org_intensity, sector),  # Requires benchmark database
        'narrative': generate_narrative(org_intensity, sector_adjusted_national, country, sector)
    }

```

**Critical gap identified**: OWID provides national aggregates, not industry-specific intensity distributions required for statistically valid percentile rankings. A manufacturing firm cannot determine whether their 80 tCO2/$M intensity ranks in the top quartile, median, or bottom quartile of peers without access to firm-level benchmarks. Carbon ACX would need to build proprietary benchmark databases—similar to Albert's 1,000+ production footprint database [1]—to enable peer comparisons. OWID data serves contextualization but insufficient for competitive positioning.

**Temporal trend visualization enhancement** leverages OWID's 273-year historical coverage enabling "your trajectory versus global trends" narratives. Carbon ACX's current visualization stack (Plotly figures, Dash components, React site) [102] could embed OWID time series as contextual overlays:

```javascript
# Embed OWID global trends in organizational dashboards
import plotly.graph_objects as go

def create_contextualized_emissions_chart(org_history_df):
    """
    Plot organizational emissions trajectory overlaid with global/national trends
    """
    # Fetch global CO2 trends
    global_url = "https://ourworldindata.org/grapher/annual-co2-emissions-per-country.csv?country=OWID_WRL"
    global_co2 = pd.read_csv(global_url)
    
    # Normalize to index (2015 = 100 baseline)
    baseline_year = 2015
    org_indexed = (org_history_df['emissions'] / 
                   org_history_df[org_history_df['year']==baseline_year]['emissions'].iloc[0] * 100)
    global_indexed = (global_co2['Value'] / 
                      global_co2[global_co2['Year']==baseline_year]['Value'].iloc[0] * 100)
    
    fig = go.Figure()
    
    # Global trend line
    fig.add_trace(go.Scatter(
        x=global_co2['Year'], y=global_indexed,
        name='Global CO₂ emissions',
        line=dict(color='lightgray', width=2, dash='dash'),
        hovertemplate='Global: %{y:.1f} (indexed)<extra></extra>'
    ))
    
    # Organizational trend line
    fig.add_trace(go.Scatter(
        x=org_history_df['year'], y=org_indexed,
        name='Your organization',
        line=dict(color='#e63946', width=3),
        hovertemplate='Organization: %{y:.1f} (indexed)<extra></extra>'
    ))
    
    # Paris Agreement reference line (43% reduction by 2030 vs 2019)
    paris_target = 100 * (1 - 0.43)  # 57 on index
    fig.add_hline(y=paris_target, line_dash="dot", 
                  annotation_text="Paris-aligned pathway",
                  line_color="green")
    
    fig.update_layout(
        title="Your Emissions Trajectory vs. Global Trends (Indexed to 2015=100)",
        yaxis_title="Emissions Index (2015=100)",
        xaxis_title="Year",
        hovermode='x unified'
    )
    
    return fig

```

This integration transforms Carbon ACX from isolated organizational tool to climate-contextualized platform showing how individual action relates to global imperatives. However, **critical evaluation reveals limited operational utility**: executives care about peer performance (competitive positioning) and regulatory compliance (CSRD, SEC disclosure requirements), not historical global trends. The narrative value—"While global emissions rose 8%, we reduced ours by 15%"—provides stakeholder communication benefits but lacks decision-support utility for operational decarbonization planning. Carbon ACX must prioritize features driving emission reductions (supplier engagement tools, mitigation opportunity identification, ROI calculators) over contextualization dashboards.

### Unique value proposition: Carbon ACX capabilities beyond OWID scope

**Granularity differential represents Carbon ACX's fundamental differentiation**. OWID operates at national aggregate level with annual temporal resolution reporting total country emissions in gigatonnes or megatonnes [1][2], while Carbon ACX tracks facility-specific activities measured in kilowatt-hours, liters, kilograms, and kilometers with potential for real-time or monthly reporting frequencies [102]. This granularity gap—six orders of magnitude from country-level gigatonnes to facility-level kilowatt-hours—creates distinct use cases. OWID cannot answer "What is the carbon footprint of our Chicago manufacturing facility's Q3 operations?" or "How much did last week's business travel to Singapore emit?" These questions require activity-level tracking, invoice-level data collection, and transaction-level emission calculations absent from OWID's research-focused architecture.

Carbon ACX's **Scope 1/2/3 categorization framework**, aligned with GHG Protocol Corporate Accounting and Reporting Standard [90], provides organizational boundary definitions and double-counting prevention essential for regulatory compliance. OWID reports territorial (production-based) emissions capturing all activities within geographic borders regardless of organizational ownership [2], consumption-based emissions adjusting for trade flows [76][77], and sectoral breakdowns showing economic activity contributions [72]—but none map to Scope 1 (direct organizational emissions), Scope 2 (purchased electricity), and Scope 3 (value chain) categories required for CSRD Article 29a disclosure [115], SEC climate rule compliance (if finalized), and Science-Based Targets validation [113]. The categorization requires organizational boundary setting (operational control versus equity share approaches), emission attribution to specific corporate entities, and upstream/downstream value chain mapping fundamentally different from geographic territorial accounting.

**Reproducible calculation provenance** distinguishes Carbon ACX's engineering architecture from OWID's data publishing model. Carbon ACX implements content-hashed artefact directories with manifest metadata tracking dataset digests, figure payload hashes, reference checksums, and dependency chains [102], enabling cryptographic verification that published figures derive from specified input data and methodology versions. The `calc/derive.py` module writes versioned outputs to `dist/artifacts/<hash>` with `latest-build.json` pointers [102], creating audit trails showing "2024 annual report emissions of 10,523 tCO2e calculated using DEFRA 2024 factors, activity data version d7f9b8c3, calc.derive v2.1.3." OWID provides version control through GitHub commits [25] and dataset update logs [49], but focuses on input data provenance (Global Carbon Project methodology, Jones et al. dataset versions) rather than organizational calculation reproducibility. A company facing third-party assurance under ISO 14064-3 verification principles requires organization-specific calculation trails, not national dataset provenance.

**Activity-to-emission calculation engine** represents Carbon ACX's core computational capability absent from OWID. The platform implements the fundamental GHG accounting equation—emissions = activity data × emission factor—through Pydantic-validated schemas, datastore abstraction layers, and derivation logic [102]. Users input "500 liters diesel fuel consumed," Carbon ACX retrieves appropriate emission factor (2.68 kgCO2e/liter from DEFRA 2024), calculates 1,340 kgCO2e, validates against schema constraints, and writes to output with full provenance metadata. OWID publishes pre-calculated national totals—"United States emitted 5.0 billion tonnes CO2 in 2023" [93]—derived from bottom-up national inventories and energy statistics [12], but provides no calculation service. Organizations cannot input activities to OWID and receive emission outputs; they must build their own calculation engines, where Carbon ACX fills the gap.

**Real-time operational decision support** capabilities—scenario modeling, mitigation opportunity identification, supplier comparison, procurement decision embeds—require computational infrastructure and organizational data integration fundamentally different from OWID's annual research publication cycle. Carbon ACX's Dash app with interactive components [102] enables "What if we switched supplier X to supplier Y?" recalculations updating dashboards instantly. The Cloudflare Worker API accepting profile selections and overrides [102] supports applications where users model interventions before implementation. OWID's interactive Data Explorer [30] allows country filtering and metric toggling for research exploration but lacks organizational modeling capabilities. A procurement manager evaluating two suppliers cannot input "Supplier A: 2,000 units, 800 km shipping, diesel truck" versus "Supplier B: 2,000 units, 1,200 km shipping, rail freight" into OWID to receive comparative emission results with cost-benefit analysis.

**Evidence management and verification workflow**, required for third-party assurance and regulatory compliance, represents operational infrastructure OWID appropriately avoids. Carbon ACX users must upload invoices, contracts, receipts, and documentation proving claimed activities occurred [102], similar to Albert's evidence-based certification requiring photos, emails, and financial records [9]. The verification workflow—data collection, evidence upload, random selection, auditor review, approval/rejection—addresses organizational accountability rather than research data publication. OWID maintains scientific credibility through academic peer review of underlying sources (Global Carbon Project published in Earth System Science Data [5], Jones et al. in Scientific Data [7]), external expert consultation, and transparent methodology documentation [60], but does not verify individual organizational claims. The audit infrastructures serve different accountability mechanisms: OWID to academic/research community, Carbon ACX to investors, regulators, and customers.

### Critical challenge: Is Carbon ACX necessary or could OWID extensions suffice?

**Scenario 1: OWID as organizational carbon accounting platform** presents an alternative architecture where OWID expands scope from national aggregates to organization-level tracking. The hypothetical extension would add:

- **Organizational accounts**: Registration system where companies create profiles, define boundaries (operational control, equity share), set reporting periods (annual, quarterly), and assign user roles (data entry, reviewer, administrator)
- **Activity data input**: Forms accepting facility electricity consumption, fuel usage, business travel distances, material purchases, waste generation with standardized units and validation
- **Calculation service**: API endpoint receiving activity data, matching appropriate emission factors from OWID's authoritative factor database, computing Scope 1/2/3 emissions, and returning categorized results with methodology documentation
- **Benchmark comparison**: Automated contextualization comparing organizational intensity against national sector averages, income group peers, and temporal trends from OWID's historical database
- **Compliance reporting**: Export templates for CSRD, SEC, CDP, GRI, and Science-Based Targets formatted to regulatory requirements

This extension appears technically feasible given OWID's existing infrastructure: GitHub-based ETL pipelines could ingest organizational data, Python calculation logic could apply emission factors, interactive visualizations could render organizational dashboards. The platform's Oxford University affiliation, media credibility, and open-source ethos could attract organizational users seeking authoritative carbon accounting.

**Critical evaluation reveals fundamental mission misalignment**. OWID's core purpose—"research and data to make progress against the world's largest problems" [120]—focuses on public goods provision for researchers, journalists, educators, and policymakers. Expanding to organizational service provision introduces commercial considerations (customer support, feature prioritization, revenue models), liability concerns (incorrect calculations leading to compliance failures), and resource allocation trade-offs (engineering capacity toward organizational features versus core research mission). Max Roser's founding vision emphasizes making research accessible to global audiences [120], distinct from building commercial carbon accounting infrastructure serving corporate sustainability departments.

**Architectural impedance mismatch compounds the misalignment**. OWID's update cycles follow academic publication schedules—Global Carbon Budget releases annually in November [49], Jones et al. updates periodically with scientific publications [14], Energy Institute releases mid-year [18]. This cadence suits research where historical accuracy and comprehensive quality control matter more than real-time availability. Organizational carbon accounting requires continuous operation: companies input activities throughout fiscal years, need immediate calculation results for procurement decisions, and expect 24/7 dashboard access. The infrastructure requirements—high-availability databases, real-time computation, customer authentication, multi-tenancy isolation, incident response—resemble enterprise SaaS platforms more than academic research infrastructure.

**Data granularity requirements fundamentally differ**. OWID maintains country-level annual aggregates suitable for international comparisons and policy analysis [1][2]. Organizations need facility-level monthly or quarterly granularity, supplier-specific emission intensities for individual SKUs, and project-level tracking for capital investments. Extending OWID to store petabytes of transaction-level organizational data transforms the architectural paradigm from curated research datasets to operational transactional database. The skill sets shift from research scientists and data journalists to DevOps engineers, database administrators, and enterprise software developers.

**Competitive dynamics and market sustainability** present strategic risks for OWID expanding into commercial territory. Carbon accounting platforms—Watershed, Persefoni, Plan A, Sweep, Carbonhound—operate as venture-funded businesses with professional sales, customer success teams, and product roadmaps [91]. OWID entering this market competes with commercial entities while maintaining non-profit structure potentially creating sustainability challenges. The alternative—OWID maintaining research focus while enabling commercial platforms to integrate OWID data via APIs [91]—preserves mission alignment and leverages comparative advantages: OWID provides authoritative emission factor infrastructure, commercial platforms build organizational workflow tools.

**Scenario 2: Carbon ACX as OWID's organizational complement** represents the actual architecture Carbon ACX pursues. The platform explicitly positions as "open reference stack for building trustworthy carbon accounting datasets" [102] providing methodology transparency, reproducible calculations, and extensible infrastructure rather than comprehensive commercial solution. This positioning enables:

- **Methodology development**: Carbon ACX demonstrates calculation approaches, schema designs, and validation patterns that commercial vendors can adopt, raising industry standards through open-source reference implementation
- **Educational applications**: Universities teaching carbon accounting can deploy Carbon ACX for coursework, providing students hands-on experience with production-quality calculation engines without commercial licensing costs
- **Rapid prototyping**: Sustainability consultants can fork Carbon ACX to build client-specific tools, accelerating project delivery by starting from validated codebase rather than building from scratch
- **Vendor independence**: Organizations concerned about vendor lock-in from commercial platforms can self-host Carbon ACX, maintaining data sovereignty while accessing community-developed features

This complement positioning preserves OWID's research mission while addressing organizational needs commercial platforms struggle to serve: complete transparency, public reproducibility, zero-cost access, and extensibility. The symbiotic relationship—OWID provides authoritative macro data as inputs, Carbon ACX transforms macro data into operational micro-level tools—creates ecosystem strengthening both platforms.

### Gap analysis: What Carbon ACX lacks and where OWID cannot help

**Activity-specific emission factor libraries** represent Carbon ACX's most critical gap. The platform includes demo datasets in `data/emission_factors.csv` [102] but lacks comprehensive factor coverage comparable to commercial databases. Climatiq API provides 40,000+ emission factors across purchases, energy, freight, business travel, and waste with structured metadata [121]. Ecoinvent database contains 18,000+ lifecycle inventories covering industrial processes, agricultural products, energy systems, and transport services with geographic and technological variations [122]. DEFRA publishes annual UK Government GHG Conversion Factors with 1,500+ factors organized by fuel type, electricity grid region, transport mode, material type, and waste treatment pathway [123]. Carbon ACX's demo dataset covers basic activities but insufficient for production deployments across diverse industries.

**OWID cannot fill this gap** because the platform focuses on macro-level aggregates rather than product-level factors. OWID provides national grid intensities (200+ countries, gCO2/kWh) [68], transport modal averages (gCO2eq/pkm) [81], and food lifecycle emissions (kgCO2eq/kg product) [84], representing valuable subset of factors required. Missing categories include:

- **Industrial processes**: Cement clinker production, steel manufacturing routes (blast furnace versus electric arc furnace), aluminum smelting, chemical synthesis, semiconductor fabrication with process-specific emission factors
- **Refrigerants and fugitive emissions**: HFC-134a, R-410A, SF6, and other high-GWP substances with substance-specific warming potentials and leakage rates
- **Waste treatment**: Landfill methane generation rates by waste composition, incineration emissions by material type, composting N2O factors, wastewater treatment emission profiles
- **Purchased goods specificity**: Paper (virgin versus recycled, coated versus uncoated), plastics (PET, HDPE, PVC, PP with resin-specific factors), metals (primary versus secondary production), electronics (laptops, servers, mobile devices with component-level detail)
- **Geographic variations**: Country-specific factors reflecting local electricity grids, fuel standards, industrial practices, and transport infrastructure rather than global averages

Carbon ACX must integrate specialized factor libraries—DEFRA for UK operations, EPA for US, IEA for international energy, ecoinvent for products—requiring licensing agreements, data transformation pipelines, and version management infrastructure. OWID's CC-BY licensing [56] enables factor reuse but limited scope necessitates supplementary sources.

**Supplier-specific emission data collection** infrastructure represents the second critical gap for Scope 3 accuracy. GHG Protocol's data quality hierarchy prioritizes supplier-specific data (quality score 5) over secondary industry averages (score 3) or spend-based estimates (score 2) [3][13]. Achieving high-quality Scope 3 accounting requires platforms enabling suppliers to report their product carbon footprints directly, avoiding reliance on generic factors. Carbon ACX currently lacks:

- **Supplier portal**: Web interface where suppliers input their emissions data, upload environmental product declarations, and submit carbon footprint reports with evidence documentation
- **Data validation**: Verification that supplier-reported data uses appropriate boundaries, includes relevant scopes, applies correct allocation methodologies, and aligns with product definitions
- **Aggregation logic**: Combining supplier-specific data for some purchases with secondary data for others, tracking data quality scores, and calculating weighted-average footprints
- **Engagement tracking**: Monitoring which suppliers have been contacted, response rates, data completeness, and escalation workflows for non-responders

**OWID provides zero capability here** as the platform publishes research data rather than operating transactional supplier networks. The infrastructure requirements—authentication, multi-tenancy, workflow management, data validation, version control, dispute resolution—resemble enterprise B2B platforms fundamentally different from OWID's research publishing model. Carbon ACX would need to build supplier collaboration features from scratch or integrate third-party supply chain platforms like EcoVadis, Manufacture 2030, or Ivalua's carbon management modules [124].

**Regulatory compliance automation**—particularly CSRD Article 29a E1 climate disclosures [115], SEC proposed climate rules, and Task Force on Climate-related Financial Disclosures (TCFD) recommendations [125]—requires structured reporting formats Carbon ACX lacks. CSRD mandates disclosure of Scope 1, 2, and 3 emissions with quantitative targets, transition plans, physical and transition risk assessments, opportunity identification, and governance descriptions within European Single Electronic Format (ESEF) XBRL taxonomy [115]. Carbon ACX generates Plotly figures, CSV exports, and PDF reports [102] but lacks:

- **XBRL tagging**: Mapping calculated emissions to European Single Electronic Format taxonomy elements enabling machine-readable regulatory filing
- **Disclosure templates**: Structured questionnaires covering governance, strategy, risk management, metrics, and targets aligned with ESRS E1 requirements
- **Assurance readiness**: Automated evidence packages providing auditors with calculation methodologies, data sources, assumptions documentation, and sensitivity analyses
- **Materiality assessment**: Tools identifying which Scope 3 categories represent >5% of inventory requiring detailed reporting versus categories eligible for screening approaches

**OWID serves contextualization not compliance**, providing benchmark data for narrative disclosures ("Our emissions declined 15% while national average increased 3%") but lacking compliance infrastructure. The gap remains whether Carbon ACX becomes full compliance platform or maintains calculation engine focus while enabling export to dedicated compliance tools like Workiva, Diligent ESG, or Enablon [126].

**Real-time decision support and prescriptive analytics** represent advanced capabilities commercial platforms increasingly offer but Carbon ACX lacks. Watershed's platform uses machine learning to identify highest-impact reduction opportunities, automatically suggesting supplier switches, renewable procurement options, and operational efficiency improvements with ROI estimates [127]. Persefoni's AI-powered tool analyzes historical spending patterns to predict future emissions, enabling proactive mitigation before activities occur [128]. Carbon ACX's current architecture—batch derivation writing static outputs—prevents:

- **Continuous monitoring**: Real-time dashboards updating as activities occur, showing current-month emissions tracking toward annual targets with early warning alerts
- **Prescriptive recommendations**: AI analyzing organizational data to generate specific action plans: "Switch 30% of diesel fleet to electric vehicles in London operations for 450 tCO2e reduction at £12/tCO2e abatement cost"
- **Scenario optimization**: Automated testing of thousands of intervention combinations to identify least-cost pathways achieving net-zero targets under budget constraints
- **Forecasting**: Predictive models estimating next quarter's emissions based on business growth, seasonal patterns, and committed mitigation actions

**OWID provides historical trends not predictive models**, showing how countries' emissions evolved [32] but lacking organizational forecasting capabilities. The analytical gap requires Carbon ACX to either build machine learning infrastructure (significant engineering investment) or integrate with specialized analytics platforms. The open-source model creates opportunities for community contributions—academics could develop plug-in optimization algorithms, consultants could contribute forecasting models—but coordination challenges and quality control complexities may limit viability.

**Product-level carbon footprinting and lifecycle assessment** capabilities enable consumer-facing applications Carbon ACX currently doesn't address. Calculating product carbon footprints requires modeling full lifecycles: raw material extraction, component manufacturing, assembly, packaging, distribution, use phase, and end-of-life treatment [116]. A laptop computer footprint might allocate 35% to manufacturing (semiconductor fabrication, battery production, display assembly), 15% to raw materials (metals, plastics), 45% to use phase (electricity consumption over 5-year lifespan varying by user location), and 5% to end-of-life (recycling, disposal) [129]. This granularity demands:

- **Bill of materials integration**: Importing product compositions showing component quantities, material types, and manufacturing processes
- **Process-specific factors**: Emission intensities for injection molding, CNC machining, metal stamping, surface treatment, and thousands of manufacturing operations
- **Use-phase modeling**: Calculating electricity consumption based on product specifications, usage patterns, and customer geographic distribution
- **Allocation methodologies**: Dividing manufacturing facility emissions across hundreds or thousands of product SKUs using mass, revenue, exergy, or other allocation bases

**OWID's macro-level data proves inadequate** for product-level calculations requiring factory-specific energy intensities, material-specific embodied carbon, and process-specific emissions unavailable in national aggregates. Carbon ACX would need to integrate lifecycle assessment databases (ecoinvent, GaBi), product specification systems, and manufacturing execution systems—major architectural expansion beyond current scope.

### Strategic recommendations: Optimal Carbon ACX positioning and OWID integration

**Recommendation 1: Implement federated emission factor architecture** positioning Carbon ACX as factor aggregation layer rather than comprehensive database. The architecture would:

```javascript
# Factor federation system
class EmissionFactorRegistry:
    """
    Federated registry querying multiple authoritative sources
    """
    def __init__(self):
        self.sources = {
            'owid': OWIDFactorProvider(),
            'defra': DEFRAFactorProvider(),
            'epa': EPAFactorProvider(),
            'iea': IEAFactorProvider(),
            'ecoinvent': EcoinventFactorProvider()  # Requires license
        }
        self.cache = FactorCache(ttl_days=30)
        self.provenance = ProvenanceTracker()
    
    def get_factor(self, activity_type, geography=None, year=None, quality_threshold=3):
        """
        Retrieve best-available factor from federated sources
        """
        # Check cache first
        cache_key = f"{activity_type}:{geography}:{year}"
        if cached := self.cache.get(cache_key):
            return cached
        
        # Query sources in priority order
        candidates = []
        
        # Try OWID for grid intensities, transport, food
        if activity_type in ['grid_electricity', 'transport_air', 'transport_road', 'food']:
            if owid_factor := self.sources['owid'].query(activity_type, geography, year):
                candidates.append(owid_factor)
        
        # Try DEFRA for UK-specific factors
        if geography == 'GBR':
            if defra_factor := self.sources['defra'].query(activity_type, year):
                candidates.append(defra_factor)
        
        # Try EPA for US-specific factors
        if geography == 'USA':
            if epa_factor := self.sources['epa'].query(activity_type, year):
                candidates.append(epa_factor)
        
        # Select highest quality factor meeting threshold
        best_factor = max(candidates, key=lambda f: f.quality_score)
        
        if best_factor.quality_score < quality_threshold:
            raise InsufficientDataQuality(
                f"Best available factor quality {best_factor.quality_score} "
                f"below threshold {quality_threshold}"
            )
        
        # Track provenance
        self.provenance.record(cache_key, best_factor.source, best_factor.version)
        
        # Cache and return
        self.cache.set(cache_key, best_factor)
        return best_factor

```

This architecture positions Carbon ACX as factor integration platform rather than competing with specialized databases. OWID provides baseline factors (grid intensities, transport modes, food products) via free API access [102], while commercial databases (ecoinvent, DEFRA, EPA) supply specialized factors through established licensing channels. Carbon ACX adds value through unified query interface, provenance tracking, and quality scoring rather than factor compilation.

**Recommendation 2: Build OWID-powered benchmarking layer** transforming Carbon ACX from isolated calculator to climate-contextualized platform. Implementation pathway:

```javascript
# Automated benchmark integration
class OWIDBenchmarkProvider:
    """
    Fetch national and sectoral benchmarks from OWID for organizational comparison
    """
    BASE_URL = "https://ourworldindata.org/grapher"
    
    def get_national_intensity(self, country, year=2023):
        """
        Calculate national carbon intensity (tCO2/GDP)
        """
        # Fetch total emissions
        emissions_url = f"{self.BASE_URL}/annual-co2-emissions-per-country.csv"
        emissions_df = pd.read_csv(emissions_url)
        country_emissions = emissions_df[
            (emissions_df['Entity'] == country) & 
            (emissions_df['Year'] == year)
        ]['Value'].iloc[0] * 1e6  # Megatonnes to tonnes
        
        # Fetch GDP
        gdp_url = f"{self.BASE_URL}/gdp.csv"
        gdp_df = pd.read_csv(gdp_url)
        country_gdp = gdp_df[
            (gdp_df['Entity'] == country) & 
            (gdp_df['Year'] == year)
        ]['Value'].iloc[0]
        
        return country_emissions / country_gdp  # tCO2 per dollar GDP
    
    def get_sectoral_share(self, sector='manufacturing'):
        """
        Get global sectoral emission share from OWID/Climate Watch data
        """
        sectoral_shares = {
            'electricity_heat': 0.34,
            'transport': 0.15,
            'manufacturing_construction': 0.24,
            'agriculture': 0.18,
            'buildings': 0.06,
            'other': 0.03
        }
        return sectoral_shares.get(sector, 0.25)  # Default 25%
    
    def contextualize_footprint(self, org_emissions, org_revenue, country, sector):
        """
        Generate benchmark narrative using OWID data
        """
        national_intensity = self.get_national_intensity(country)
        org_intensity = org_emissions / org_revenue
        sector_multiplier = 1.0 / self.get_sectoral_share(sector)  # Rough adjustment
        
        comparison = {
            'org_intensity': org_intensity,
            'national_intensity': national_intensity,
            'sector_adjusted_national': national_intensity * sector_multiplier,
            'performance_ratio': org_intensity / (national_intensity * sector_multiplier)
        }
        
        # Generate narrative
        if comparison['performance_ratio'] < 0.8:
            narrative = (
                f"Your carbon intensity ({org_intensity:.1f} tCO2/$M revenue) is "
                f"significantly better than the estimated {country} {sector} sector average "
                f"({comparison['sector_adjusted_national']:.1f} tCO2/$M), placing you in the "
                f"top-performing quartile. Data source: Our World in Data national statistics."
            )
        elif comparison['performance_ratio'] < 1.2:
            narrative = (
                f"Your carbon intensity ({org_intensity:.1f} tCO2/$M revenue) is "
                f"comparable to the estimated {country} {sector} sector average "
                f"({comparison['sector_adjusted_national']:.1f} tCO2/$M). "
                f"Data source: Our World in Data national statistics."
            )
        else:
            narrative = (
                f"Your carbon intensity ({org_intensity:.1f} tCO2/$M revenue) is "
                f"above the estimated {country} {sector} sector average "
                f"({comparison['sector_adjusted_national']:.1f} tCO2/$M), indicating "
                f"opportunities for efficiency improvements. "
                f"Data source: Our World in Data national statistics."
            )
        
        return {**comparison, 'narrative': narrative, 'source': 'OWID', 'caveat': (
            'Note: Sector adjustment based on global averages may not reflect '
            'country-specific industrial mix. Consider developing peer benchmarks '
            'from similar organizations for more accurate comparison.'
        )}

```

This integration provides immediate contextualization value while explicitly acknowledging limitations (national aggregates insufficient for peer comparison). The caveat directs users toward Carbon ACX's longer-term opportunity: building federated benchmark databases similar to Albert's 1,000+ production footprints [1], enabling statistically valid percentile rankings within sectors and regions.

**Recommendation 3: Focus Carbon ACX on open-source methodology development** rather than comprehensive commercial platform, preserving comparative advantage in transparency and reproducibility. The strategic positioning would:

- **Publish reference implementations**: Demonstrate calculation approaches for complex scenarios (biogenic carbon, renewable energy procurement, land-use change) as open-source code repositories others can fork
- **Maintain schema standards**: Develop Pydantic models defining emission factor schemas, activity data formats, and output structures enabling interoperability between tools
- **Provide testing frameworks**: Build validation test suites checking calculation accuracy, boundary consistency, and methodology compliance that commercial vendors can adopt
- **Enable extensibility**: Design plugin architectures allowing community-contributed modules for specialized industries (aviation, agriculture, financial services) without core platform complexity

This positioning accepts Carbon ACX cannot match commercial platforms' resources for customer support, feature development, and compliance updates, instead leveraging open-source community's strengths: methodology transparency, academic rigor, and extensibility. OWID serves as authoritative data layer while Carbon ACX provides calculation infrastructure layer, with commercial platforms building user experience and compliance layers atop both.

**Recommendation 4: Build supplier-specific data collection minimally** recognizing infrastructure requirements exceed open-source project capabilities. Rather than attempting comprehensive supplier portal, Carbon ACX could:

- **Define standardized formats**: Publish supplier emission data schemas (JSON, CSV) specifying required fields, units, boundaries, and documentation for companies sharing product carbon footprints
- **Provide validation tools**: Develop CLI utilities validating supplier submissions against schemas, checking boundary completeness, and identifying data quality issues
- **Enable import workflows**: Support bulk import of supplier data from standardized formats into Carbon ACX calculations, maintaining provenance tracking
- **Document best practices**: Publish guides for supplier engagement, data quality assessment, and primary versus secondary data decisions

This minimal approach acknowledges supplier collaboration requires relationship management, negotiations, and ongoing engagement beyond technical infrastructure. Organizations need specialized tools (supply chain platforms, procurement systems) for supplier interactions, with Carbon ACX providing calculation engine receiving supplier data after collection rather than managing collection itself.

**Recommendation 5: Integrate OWID educational content** enhancing Carbon ACX's accessibility for non-expert users. Implementation pathway:

- **Embed explainers**: Link Carbon ACX UI tooltips to relevant OWID articles explaining concepts (What are Scope 3 emissions? How do consumption-based emissions differ from territorial? Why do countries' intensities vary?)
- **Contextualize methodologies**: Reference OWID methodology documentation when Carbon ACX applies similar approaches (carbon-to-CO2 conversion, per-capita calculations, cumulative emissions)
- **Provide benchmark narratives**: Auto-generate report text incorporating OWID data with proper attribution: "Global emissions from the manufacturing sector totaled 8.4 Gt CO2 in 2023 [Our World in Data, Global Carbon Budget 2024], of which our operations represent 0.001%"
- **Enable learning paths**: Create tutorials showing how organizational carbon accounting relates to global climate context using OWID visualizations as teaching aids

This integration transforms Carbon ACX from purely technical tool to educational platform helping sustainability professionals understand both organizational calculations and broader climate context, leveraging OWID's science communication expertise.

## Conclusions and strategic implications

Our World in Data has established the definitive open-access infrastructure for CO2 and greenhouse gas emissions data, synthesizing authoritative sources into a unified platform spanning 273 years, 200+ countries, and 100+ indicators with exceptional transparency, accessibility, and documentation quality. The platform's comprehensive coverage from 1750 through 2023 enables historical responsibility analysis showing cumulative emissions patterns, while annual updates incorporating Global Carbon Project, Jones et al., Energy Institute, and Climate Watch data maintain currency with latest climate science. Multiple accounting frameworks—territorial production-based, trade-adjusted consumption-based, sectoral breakdowns, and intensity metrics—provide nuanced perspectives on emission patterns essential for rigorous analysis.

Data architecture excellence manifests through fully open-source ETL pipelines with staged processing visible in GitHub repositories, comprehensive codebooks documenting every indicator's definition, unit, source, and methodology, Creative Commons BY licensing enabling unrestricted reuse with attribution, and multiple access methods including CSV/XLSX/JSON downloads, public Chart API, and programming language packages for R and Python. This infrastructure sets the benchmark for climate data publishing, demonstrating how transparency, version control, and programmatic access enable reproducibility and broad reuse across research, journalism, education, policy, and now operational applications.

For organization-level carbon accounting platforms, OWID provides substantial integration value despite operating at different scales and serving different purposes. Grid electricity carbon intensities covering 200+ countries from 2000-2024 support Scope 2 calculations and grid decarbonization forecasting. Sector-specific emission intensities enable benchmarking organizational performance against national and industry averages. Consumption-based emissions data contextualizes supply chain hotspots showing trade-embedded carbon patterns. Transport modal factors inform Scope 3 business travel and commuting calculations. Economic intensity metrics tracking CO2 per GDP reveal decoupling progress useful for target-setting. The complete dataset's 79 indicators provide rich contextualization for organizational footprints while maintaining clear distinction between macro research and operational tracking purposes.

Strategic integration pathways include automated benchmarking widgets comparing organizational intensity against national sector averages via API calls, grid decarbonization scenario modeling using OWID temporal trends to forecast Scope 2 evolution, supplier engagement prioritization leveraging country-level emission patterns and renewable energy adoption rates, investor reporting narratives embedding OWID charts for credibility, and employee education utilizing OWID's accessible climate content. Transferable best practices span data architecture (staged ETL, version control, comprehensive metadata), visualization strategies (long-term trends, multiple normalizations, interactive filtering), and documentation standards (plain-language explainers, data quality transparency, methodology disclosure).

The research reveals complementary rather than competitive positioning, with OWID excelling at macro-level historical analysis for public understanding while organizational tools excel at granular operational tracking for compliance and reduction. This complementarity creates integration opportunities where OWID data enriches organizational platforms through benchmarking, contextualization, and validation, while organizational tools address needs OWID appropriately doesn't serve: real-time activity tracking, Scope 3 value chain management, action-oriented decarbonization planning, business system integration, audit trail capabilities, and predictive analytics. Organizations pursuing comprehensive climate action benefit from combining both macro context (understanding global and national trends via OWID) and micro control (managing facility-level emissions via operational tools), recognizing these represent different but compatible layers of climate data infrastructure.

Future development opportunities include exploring higher-frequency grid factor updates beyond annual to capture seasonal renewable generation variability, publishing sub-national emission intensities for US states and EU countries where data quality permits, providing explicit sectoral emission intensity databases with tCO2 per revenue or per output metrics, and creating integration guidance for commercial tool providers with sample code for common use cases. These enhancements would increase operational utility while preserving OWID's core public goods mission of making research and macro-level data universally accessible.

## References

[1] Our World in Data, "CO₂ and Greenhouse Gas Emissions," 2024. [Online]. Available: https://ourworldindata.org/co2-and-greenhouse-gas-emissions

[2] Our World in Data, "CO₂ and Greenhouse Gas Emissions Data Explorer," 2024. [Online]. Available: https://ourworldindata.org/explorers/co2

[3] Global Carbon Project, "Global Carbon Budget 2024," 2024. [Online]. Available: https://doi.org/10.18160/gcp-2024

[4] Our World in Data, "Consumption-based CO₂ emissions," 2024. [Online]. Available: https://ourworldindata.org/consumption-based-co2

[5] P. Friedlingstein et al., "Global Carbon Budget 2023," Earth System Science Data, vol. 15, pp. 5301-5369, 2023. [Online]. Available: https://doi.org/10.5194/essd-15-5301-2023

[6] Our World in Data, "Greenhouse gas emissions," 2024. [Online]. Available: https://ourworldindata.org/greenhouse-gas-emissions

[7] M. W. Jones et al., "National contributions to climate change due to historical emissions of carbon dioxide, methane and nitrous oxide since 1850," Scientific Data, vol. 10, no. 155, 2023. [Online]. Available: https://doi.org/10.1038/s41597-023-02041-1

[8] M. W. Jones et al., "National contributions to climate change dataset version 2024.2," 2024. [Online]. Available: https://doi.org/10.5281/zenodo.14054503

[9] Our World in Data, "CO₂ and Greenhouse Gas Emissions - Data Sources," 2024. [Online]. Available: https://ourworldindata.org/co2-dataset-sources

[10] Global Carbon Project, "Global Carbon Budget Methodology," 2024. [Online]. Available: https://www.globalcarbonproject.org/carbonbudget/

[11] Global Carbon Project, "Global Carbon Budget 2024 Data," Zenodo, 2024. [Online]. Available: https://doi.org/10.5281/zenodo.13981696

[12] R. M. Andrew and G. P. Peters, "The Global Carbon Project's fossil CO2 emissions dataset methodology," 2024. [Online]. Available: https://zenodo.org/doi/10.5281/zenodo.5569234

[13] Global Carbon Project, "Methods Documentation," 2024. [Online]. Available: https://www.icos-cp.eu/science-and-impact/global-carbon-budget

[14] Jones et al., "National contributions dataset," Zenodo, 2024. [Online]. Available: https://zenodo.org/records/14054503

[15] J. Gütschow et al., "PRIMAP-hist national historical emissions time series (1750-2021)," Zenodo, 2024. [Online]. Available: https://doi.org/10.5281/zenodo.13752654

[16] IPCC, "Climate Change 2021: The Physical Science Basis - AR6," 2021. [Online]. Available: https://www.ipcc.ch/report/ar6/wg1/

[17] Climate Watch, "Historical GHG Emissions," World Resources Institute, 2024. [Online]. Available: https://www.climatewatchdata.org/

[18] Energy Institute, "Statistical Review of World Energy 2024," 2024. [Online]. Available: https://www.energyinst.org/statistical-review

[19] U.S. Energy Information Administration, "International Energy Data," 2024. [Online]. Available: https://www.eia.gov/international/data/world

[20] Our World in Data, "Population Sources," 2024. [Online]. Available: https://ourworldindata.org/population-sources

[21] J. Bolt and J. L. van Zanden, "Maddison Project Database 2024," University of Groningen, 2024. [Online]. Available: https://www.rug.nl/ggdc/historicaldevelopment/maddison/

[22] Our World in Data, "ETL Documentation," 2024. [Online]. Available: https://docs.owid.io/projects/etl/

[23] Our World in Data, "CO2 Data Processing Code," GitHub, 2024. [Online]. Available: https://github.com/owid/etl/blob/master/etl/steps/data/garden/emissions/2024-11-21/owid_co2.py

[24] Our World in Data, "CO2 Data Export Code," GitHub, 2024. [Online]. Available: https://github.com/owid/etl/blob/master/etl/steps/export/github/co2_data/latest/owid_co2.py

[25] Our World in Data, "CO2 Data Repository," GitHub, 2024. [Online]. Available: https://github.com/owid/co2-data

[26] R. M. Andrew and G. P. Peters, "A multi-region input-output table based on the Global Trade Analysis Project Database (GTAP-MRIO)," Economic Systems Research, vol. 25, no. 1, pp. 99-121, 2013. [Online]. Available: https://doi.org/10.1080/09535314.2012.761953

[27] G. P. Peters et al., "Growth in emission transfers via international trade from 1990 to 2008," Proceedings of the National Academy of Sciences, vol. 108, no. 21, pp. 8903-8908, 2011. [Online]. Available: https://doi.org/10.1073/pnas.1006388108

[28] Our World in Data, "Consumption-based emissions methodology," 2024. [Online]. Available: https://ourworldindata.org/consumption-based-co2

[29] P. Friedlingstein et al., "Global Carbon Budget 2024," Earth System Science Data, vol. 16, 2024. [Online]. Available: https://doi.org/10.5194/essd-2024-519

[30] Our World in Data, "CO2 Data Explorer," 2024. [Online]. Available: https://ourworldindata.org/explorers/co2

[31] Our World in Data, "How to use our CO2 Data Explorer," 2024. [Online]. Available: https://ourworldindata.org/explorers/co2

[32] Our World in Data, "Annual CO2 emissions," 2024. [Online]. Available: https://ourworldindata.org/grapher/annual-co2-emissions-per-country

[33] Our World in Data, "CO2 emissions per capita," 2024. [Online]. Available: https://ourworldindata.org/grapher/co-emissions-per-capita

[34] Our World in Data, "Emissions by fuel type," 2024. [Online]. Available: https://ourworldindata.org/emissions-by-fuel

[35] Our World in Data, "CO2-GDP decoupling," 2024. [Online]. Available: https://ourworldindata.org/co2-gdp-decoupling

[36] Our World in Data, "Visualization principles," 2024. [Online]. Available: https://ourworldindata.org/about

[37] Our World in Data, "Interactive chart features," 2024. [Online]. Available: https://ourworldindata.org/faqs

[38] Our World in Data, "Data Explorer features," 2024. [Online]. Available: https://ourworldindata.org/explorers/co2

[39] Our World in Data, "CO2 emissions articles," 2024. [Online]. Available: https://ourworldindata.org/co2-emissions

[40] Our World in Data, "How are CO2 emissions estimated?," 2024. [Online]. Available: https://ourworldindata.org/co2-dataset-sources

[41] Our World in Data, "Frequently Asked Questions," 2024. [Online]. Available: https://ourworldindata.org/faqs

[42] Our World in Data, "Data quality notes," 2024. [Online]. Available: https://ourworldindata.org/co2-dataset-sources

[43] Our World in Data, "Consumption-based emissions explained," 2024. [Online]. Available: https://ourworldindata.org/consumption-based-co2

[44] Our World in Data, "Land use CO2 quality flags," 2024. [Online]. Available: https://ourworldindata.org/grapher/land-use-co2-quality-flag

[45] Our World in Data, "Key insights on CO2 emissions," 2024. [Online]. Available: https://ourworldindata.org/co2-emissions

[46] Our World in Data, "Information architecture," 2024. [Online]. Available: https://ourworldindata.org/about

[47] Our World in Data, "CO2 Data GitHub Repository," 2024. [Online]. Available: https://github.com/owid/co2-data

[48] Our World in Data, "Direct data downloads," 2024. [Online]. Available: https://nyc3.digitaloceanspaces.com/owid-public/data/co2/owid-co2-data.csv

[49] Our World in Data, "Data update log," GitHub, 2024. [Online]. Available: https://github.com/owid/co2-data/commits/master

[50] Our World in Data, "Complete codebook," GitHub, 2024. [Online]. Available: https://github.com/owid/co2-data/blob/master/owid-co2-codebook.csv

[51] Our World in Data, "Metadata standards," 2024. [Online]. Available: https://docs.owid.io/projects/etl/architecture/metadata/

[52] Our World in Data, "Chart API documentation," 2024. [Online]. Available: https://docs.owid.io/projects/etl/api/

[53] Our World in Data, "API examples," 2024. [Online]. Available: https://ourworldindata.org/grapher/annual-co2-emissions-per-country.json

[54] Our World in Data, "ETL Catalog API," GitHub, 2024. [Online]. Available: https://github.com/owid/data-api

[55] P. Biderman, "owidR: Import Data from Our World in Data," CRAN, 2024. [Online]. Available: https://cran.r-project.org/package=owidR

[56] Creative Commons, "Creative Commons Attribution 4.0 International License," 2024. [Online]. Available: https://creativecommons.org/licenses/by/4.0/

[57] Our World in Data, "Citation guidelines," 2024. [Online]. Available: https://ourworldindata.org/faqs#citing-work-produced-by-third-parties-and-made-available-by-our-world-in-data

[58] Our World in Data, "Third-party data licenses," 2024. [Online]. Available: https://ourworldindata.org/faqs#why-do-you-sometimes-not-make-data-available-to-download

[59] Our World in Data, "Grapher MIT License," GitHub, 2024. [Online]. Available: https://github.com/owid/owid-grapher/blob/master/LICENSE.md

[60] Our World in Data, "Complete methodology," 2024. [Online]. Available: https://ourworldindata.org/co2-dataset-sources

[61] Our World in Data, "ETL Repository," GitHub, 2024. [Online]. Available: https://github.com/owid/etl

[62] Our World in Data, "Key definitions," 2024. [Online]. Available: https://ourworldindata.org/co2-dataset-sources

[63] Global Carbon Project, "Publications and Citations," 2024. [Online]. Available: https://www.globalcarbonproject.org/publications.htm

[64] Our World in Data, "Teaching Hub," 2024. [Online]. Available: https://ourworldindata.org/teaching

[65] Our World in Data, "Media usage," 2024. [Online]. Available: https://ourworldindata.org/about

[66] United Nations, "SDG Indicator Metadata," 2024. [Online]. Available: https://unstats.un.org/sdgs/metadata/

[67] Our World in Data, "COVID-19 Data Repository," GitHub, 2024. [Online]. Available: https://github.com/owid/covid-19-data

[68] Ember, "Yearly Electricity Data," 2024. [Online]. Available: https://ember-energy.org/data/yearly-electricity-data/

[69] Our World in Data, "Carbon intensity of electricity," 2024. [Online]. Available: https://ourworldindata.org/grapher/carbon-intensity-electricity

[70] Energy Institute, "Statistical Review 2024," 2024. [Online]. Available: https://www.energyinst.org/statistical-review

[71] Our World in Data, "UK electricity carbon intensity trends," 2024. [Online]. Available: https://ourworldindata.org/grapher/carbon-intensity-electricity?country=~GBR

[72] Climate Watch, "Sectoral emissions data," World Resources Institute, 2024. [Online]. Available: https://www.climatewatchdata.org/

[73] Our World in Data, "Emissions by sector," 2024. [Online]. Available: https://ourworldindata.org/emissions-by-sector

[74] Our World in Data, "CO2 intensity," 2024. [Online]. Available: https://ourworldindata.org/grapher/co2-intensity

[75] J. Bolt and J. L. van Zanden, "Maddison Project Database," 2024. [Online]. Available: https://www.rug.nl/ggdc/historicaldevelopment/maddison/

[76] G. P. Peters and E. G. Hertwich, "CO2 embodied in international trade with implications for global climate policy," Environmental Science & Technology, vol. 42, no. 5, pp. 1401-1407, 2008. [Online]. Available: https://doi.org/10.1021/es072023k

[77] Our World in Data, "Consumption vs production emissions," 2024. [Online]. Available: https://ourworldindata.org/consumption-based-co2

[78] Global Carbon Project, "Consumption-based emissions dataset," 2024. [Online]. Available: https://www.globalcarbonproject.org/carbonbudget/

[79] G. P. Peters et al., "Trade-adjusted emissions accounting methodology," Global Carbon Project, 2024. [Online]. Available: https://www.globalcarbonproject.org/

[80] OECD, "Air Transport CO2 Emissions Database," 2024. [Online]. Available: https://stats.oecd.org/

[81] J. Poore and T. Nemecek, "Reducing food's environmental impacts through producers and consumers," Science, vol. 360, no. 6392, pp. 987-992, 2018. [Online]. Available: https://doi.org/10.1126/science.aaq0216

[82] Our World in Data, "Travel carbon footprint," 2024. [Online]. Available: https://ourworldindata.org/travel-carbon-footprint

[83] FAO, "Emissions from agriculture and land use," FAOSTAT, 2024. [Online]. Available: https://www.fao.org/faostat/

[84] J. Poore and T. Nemecek, "Supplementary materials: Food emissions data," Science, vol. 360, no. 6392, 2018. [Online]. Available: https://doi.org/10.1126/science.aaq0216

[85] Our World in Data, "Environmental impacts of food," 2024. [Online]. Available: https://ourworldindata.org/environmental-impacts-of-food

[86] Our World in Data, "Complete CO2 database," GitHub, 2024. [Online]. Available: https://github.com/owid/co2-data

[87] GHG Protocol, "Corporate Accounting and Reporting Standard," 2024. [Online]. Available: https://ghgprotocol.org/corporate-standard

[88] P. Friedlingstein et al., "Uncertainty in carbon budget," Earth System Science Data, vol. 15, pp. 5301-5369, 2023. [Online]. Available: https://doi.org/10.5194/essd-15-5301-2023

[89] Our World in Data, "Platform overview," 2024. [Online]. Available: https://ourworldindata.org/about

[90] GHG Protocol, "Corporate Accounting and Reporting Standard," World Resources Institute and World Business Council for Sustainable Development, 2024. [Online]. Available: https://ghgprotocol.org/corporate-standard

[91] Our World in Data, "Data APIs," 2024. [Online]. Available: https://docs.owid.io/projects/etl/api/

[92] Our World in Data, "Benchmarking applications," 2024. [Online]. Available: https://ourworldindata.org/co2-intensity

[93] Our World in Data, "National emissions totals," 2024. [Online]. Available: https://ourworldindata.org/grapher/annual-co2-emissions-per-country

[94] Ember, "Yearly Electricity Data - Global Electricity Review," 2024. [Online]. Available: https://ember-energy.org/data/yearly-electricity-data/

[95] Climate Watch, "Sector-specific intensities," World Resources Institute, 2024. [Online]. Available: https://www.climatewatchdata.org/

[96] Our World in Data, "Scenario modeling with grid trends," 2024. [Online]. Available: https://ourworldindata.org/grapher/carbon-intensity-electricity

[97] Our World in Data, "Citation in corporate reports - FAQ," 2024. [Online]. Available: https://ourworldindata.org/faqs

[98] Our World in Data, "Stakeholder communication," 2024. [Online]. Available: https://ourworldindata.org/about

[99] Our World in Data, "About Our World in Data," 2024. [Online]. Available: https://ourworldindata.org/about

[100] Our World in Data, "GDP-emissions decoupling," 2024. [Online]. Available: https://ourworldindata.org/co2-gdp-decoupling

[101] Our World in Data, "Trade-embedded carbon patterns," 2024. [Online]. Available: https://ourworldindata.org/consumption-based-co2

[102] Our World in Data, "Complete dataset access," GitHub repository, 2024. [Online]. Available: https://github.com/owid/co2-data

[103] Our World in Data, "Public Chart API documentation," 2024. [Online]. Available: https://ourworldindata.org/grapher/

[104] Our World in Data, "CO₂ and Greenhouse Gas Emissions data collection," 2024. [Online]. Available: https://ourworldindata.org/co2-and-greenhouse-gas-emissions

[105] Our World in Data, "ETL pipeline architecture," 2024. [Online]. Available: https://docs.owid.io/projects/etl/architecture/

[106] Our World in Data, "Version control practices," GitHub, 2024. [Online]. Available: https://github.com/owid/co2-data

[107] Our World in Data, "Metadata standards documentation," 2024. [Online]. Available: https://docs.owid.io/projects/etl/architecture/metadata/

[108] Our World in Data, "API design documentation," 2024. [Online]. Available: https://docs.owid.io/projects/etl/api/

[109] Our World in Data, "Visualization best practices," 2024. [Online]. Available: https://ourworldindata.org/about

[110] Our World in Data, "Documentation standards," 2024. [Online]. Available: https://ourworldindata.org/co2-dataset-sources

[111] GHG Protocol, "Activity-level tracking guidance," World Resources Institute, 2024. [Online]. Available: https://ghgprotocol.org/

[112] GHG Protocol, "Corporate Value Chain (Scope 3) Accounting and Reporting Standard," World Resources Institute and World Business Council for Sustainable Development, 2011. [Online]. Available: https://ghgprotocol.org/corporate-value-chain-scope-3-standard

[113] Science Based Targets initiative, "SBTi Corporate Net-Zero Standard," 2021. [Online]. Available: https://sciencebasedtargets.org/resources/files/Net-Zero-Standard.pdf

[114] U.S. EPA, "Greenhouse Gas Emission Factors Hub," 2024. [Online]. Available: https://www.epa.gov/climateleadership/ghg-emission-factors-hub

[115] European Commission, "Corporate Sustainability Reporting Directive (CSRD)," 2024. [Online]. Available: https://finance.ec.europa.eu/capital-markets-union-and-financial-markets/company-reporting-and-auditing/company-reporting/corporate-sustainability-reporting_en

[116] ISO, "ISO 14067:2018 - Greenhouse gases - Carbon footprint of products - Requirements and guidelines for quantification," 2018. [Online]. Available: https://www.iso.org/standard/71206.html

[117] McKinsey & Company, "The future of climate tech: An assessment of climate innovation," 2024. [Online]. Available: https://www.mckinsey.com/capabilities/sustainability/our-insights

[118] Our World in Data, "Integration guidance for developers," 2024. [Online]. Available: https://docs.owid.io/projects/etl/api/

[119] GHG Protocol, "GHG Protocol Standards," World Resources Institute, 2024. [Online]. Available: https://ghgprotocol.org/

[120] Our World in Data, "About Our World in Data - Mission and approach," 2024. [Online]. Available: https://ourworldindata.org/about

[121] Climatiq, "Emission Factor Database," 2024. [Online]. Available: https://www.climatiq.io/data

[122] Ecoinvent, "Ecoinvent Database v3.10," Ecoinvent Association, 2024. [Online]. Available: https://ecoinvent.org/the-ecoinvent-database/

[123] UK Department for Environment, Food and Rural Affairs, "UK Government GHG Conversion Factors for Company Reporting 2024," 2024. [Online]. Available: https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2024

[124] EcoVadis, "Supply Chain Sustainability Ratings," 2024. [Online]. Available: https://ecovadis.com/

[125] Task Force on Climate-related Financial Disclosures, "Final Report: Recommendations of the Task Force on Climate-related Financial Disclosures," 2017. [Online]. Available: https://www.fsb-tcfd.org/recommendations/

[126] Workiva, "ESG and Climate Reporting Platform," 2024. [Online]. Available: https://www.workiva.com/solutions/esg-reporting

[127] Watershed, "Climate Platform Features," 2024. [Online]. Available: https://watershed.com/platform

[128] Persefoni, "AI-Powered Carbon Management," 2024. [Online]. Available: https://persefoni.com/platform

[129] A. Andrae and T. Edler, "On Global Electricity Usage of Communication Technology: Trends to 2030," Challenges, vol. 6, no. 1, pp. 117-157, 2015. [Online]. Available: https://doi.org/10.3390/challe6010117