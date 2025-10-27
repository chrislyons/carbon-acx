# ACX048 The Climate Data Deficit: Opportunity for Carbon ACX as Civic Literacy Infrastructure

## Executive Summary

Analysis of two leading carbon data platforms—Our World in Data's macro-level emissions research infrastructure and Albert's professional production-specific accounting system—reveals a systematic gap in climate data accessibility for civic engagement. OWID provides authoritative national-level emissions data spanning 273 years across 200+ countries but operates at abstraction levels unsuitable for organizational understanding [1]. Albert delivers production-specific carbon accounting with mandatory adoption by major UK broadcasters serving 3,003 annual productions but remains gatekept behind industry credentials requiring broadcaster commissioning relationships [2]. Neither platform addresses the democratic climate literacy deficit: ordinary citizens lack accessible tools to understand organizational-level emissions with systemic context, preventing informed participation in workplace sustainability, community climate action, and evidence-based advocacy.

This report identifies Carbon ACX's opportunity space as **civic climate literacy infrastructure**—positioned between individual consumer calculators (which assign guilt without systemic context) and enterprise platforms (which remain inaccessible to voting populations). The platform can serve five underserved user segments: community accountability groups calculating school district or municipal emissions for public oversight; student organizations analyzing university footprints for divestment campaigns; labor organizations understanding workplace emissions for collective bargaining; local journalists investigating corporate climate claims with calculation verification; and civic educators teaching carbon accounting methodology through hands-on organizational analysis. Carbon ACX's viability derives not from comprehensive emission factor coverage (where enterprise platforms excel) but from pedagogical design enabling methodology transparency, systemic contextualization via OWID data integration, and organizational calculation accessibility without professional credentials or commercial licensing barriers.

The analysis establishes three core design principles distinguishing Carbon ACX from existing platforms: **(1) Transparency as pedagogy**—exposing calculation methodologies through interactive interfaces where users understand how activity data transforms into emissions via emission factors rather than black-box outputs; **(2) Systemic contextualization**—embedding OWID macro-level data as contextual backdrop showing how organizational footprints relate to national trends, sectoral patterns, and grid decarbonization trajectories rather than isolated guilt-inducing numbers; **(3) Civic empowerment framing**—positioning carbon accounting as democratic participation tool revealing leverage points for collective action rather than individual consumer responsibility narratives. Implementation pathways include university curriculum integration for teaching GHG Protocol methodology, community foundation partnerships supporting local climate action groups, open-source extension frameworks enabling specialized factor library integration by users with domain expertise, and progressive disclosure interfaces serving both novice learners and technically sophisticated users within single platform architecture.

## The Democratic Climate Data Deficit

### OWID's Macro Research Paradigm: Strengths and Limitations

Our World in Data has established definitive open-access infrastructure for national-level emissions analysis, providing 273 years of historical coverage from 1750 through 2023 across 200+ countries with 79 indicators including territorial emissions, consumption-based accounting, sectoral breakdowns, and intensity metrics [1]. The platform synthesizes authoritative sources—Global Carbon Project publishing in *Earth System Science Data*, Jones et al. (2024) providing historical GHG contributions, Energy Institute Statistical Review, and Climate Watch sectoral data—into unified datasets accessible via Creative Commons BY licensing through CSV, XLSX, and JSON formats plus programmatic APIs [3][4][5]. OWID's transparent ETL pipeline with staged processing (meadow for raw ingestion, garden for harmonization, grapher for visualization) demonstrates exceptional methodology documentation enabling reproducibility across research, journalism, education, and policy applications [6].

The platform's interactive Data Explorer at https://ourworldindata.org/explorers/co2

 provides sophisticated visualization capabilities enabling users to switch between gases (CO2, CH4, N2O, total GHG), toggle accounting methods (production versus consumption-based), filter fuel types (coal, oil, gas, cement, flaring), select from 13+ derived metrics (absolute, per capita, cumulative, share of global, growth rate), and alternate between line charts, choropleth maps, and data tables [7]. Educational content integration distinguishes OWID from pure data repositories, with articles explaining consumption-based emissions methodology, drivers of inter-country differences, and historical trend contextualization [8]. Progressive disclosure design layers simple insights for general audiences ("China emits most absolutely, Qatar per capita") through detailed explanations for researchers to complete methodology documentation with source citations [9].

**Critical limitation for civic engagement**: OWID's abstraction level prevents organizational understanding. The platform answers "How much does the United Kingdom emit annually?" (37 billion tonnes CO2 in 2023 [10]) but cannot address "What does my university's 50,000 tonne footprint mean?", "How do I interpret whether my workplace's 2.5 tCO2e per employee is high or low?", or "What drives my city's municipal emissions composition?" National aggregates measured in gigatonnes prove too distant from lived experience for citizens attempting organizational accountability. A community group seeking to understand their school district's emissions finds OWID's country-level data valuable for macro context but operationally insufficient—they need facility-level calculation capabilities accepting activity inputs (electricity consumption in kWh, heating fuel in therms, bus fleet diesel in gallons) and producing scoped organizational footprints with methodological transparency.

Geographic granularity remains national with sub-national data outside scope [11]. While this focus enables internationally comparable metrics essential for research and policy, it prevents localized analysis. A journalist investigating emissions claims by their city's largest employer cannot use OWID to verify corporate disclosures—the platform provides national industrial sector averages but lacks organizational calculation infrastructure. The temporal resolution follows annual research publication cycles with Global Carbon Budget releases in November-December [12], appropriate for historical analysis but incompatible with real-time organizational tracking required for procurement decisions, facility management, or operational interventions.

**Audience analysis reveals mismatch with civic needs**: OWID explicitly serves researchers conducting climate studies, journalists creating data visualizations for mass media, educators developing curricula, and policymakers requiring comparative national statistics [13]. The platform's sophistication—79 indicators, consumption-based trade adjustments using multi-region input-output models, historical reconstructions requiring energy statistics reconciliation—reflects academic research priorities. Educational applications include integration throughout CORE Econ textbooks and university courses teaching macroeconomics and climate policy [14]. This positioning succeeds brilliantly for intended audiences but creates accessibility barrier for civic users without research training seeking organizational-level understanding.

### Albert's Professional Industry Paradigm: Gatekeeping and Specialization

Albert Carbon Calculator represents mature production-specific carbon accounting infrastructure serving global screen production industry with mandatory adoption by major UK broadcasters (BBC, ITV, Channel 4 requiring certification for television commissions) and 3,003 productions registered in 2023 achieving 82% certification rate (2,451 productions certified) [2]. The fifth-generation calculator (November 2023 release, methodology updated October 2024) features 309 international emission factors, multi-language support, and integrated certification delivering public recognition through three-tier star ratings validated by third-party Ramboll audit confirming WRI GHG Protocol Product Life Cycle Standard alignment [15].

Albert's technical sophistication addresses production-specific workflows. The platform implements GHG Protocol's fundamental equation (emissions = activity data × emission factor) through web-based interface accepting three data input modalities: actual consumption data (kWh, liters, kg, km) providing highest accuracy; financial spend data with spend-based emission factors when physical measurements unavailable; benchmark estimates derived from industry-validated proxies when neither actual nor financial data accessible [16][17]. Category architecture demonstrates production workflow specificity with filming spaces (studios, LED/Volume stages, galleries), non-filming spaces (production offices, working from home using EcoAct methodology assuming 240 days annually), post-production facilities (edit suites with empirical benchmarks from five facilities yielding 2.999 kWh per session), utilities, transport (air, road, rail, marine with breakdown by mode), accommodation, materials (paint, paper, timber, textiles, food differentiated by meat type), and disposal pathways (landfill, recycling, composting, incineration, donation) [18].

**Gatekeeping mechanisms prevent civic access**: Albert's operational model requires production company registration with broadcaster commissioning relationships or industry consortium membership. The platform serves sustainability coordinators within production hierarchies—typically employees assigned carbon accounting responsibilities through production management structures [19]. While registration is free eliminating cost barriers, access remains confined to credentialed production personnel. A university student interested in understanding film production emissions cannot simply "try Albert" to learn methodology or calculate hypothetical production footprints for educational purposes. A community activist investigating a production company's environmental claims lacks access to Albert's tools despite platform relevance to their accountability inquiry.

The certification workflow reinforces professional specialization. Productions submit draft footprints during pre-production, update with actual data throughout filming, submit for Albert team audit (10 working days), upload evidence for randomly selected 10+ actions (invoices, contracts, call sheets, kit lists, emails, photos), and receive certification rating or amendment requests [20]. This evidence-based verification addresses organizational accountability within industry governance but assumes professional sustainability management capacity—production coordinators managing multi-month documentation collection, production managers providing oversight, company administrators handling organizational access. The infrastructure reflects mature industry professionalization absent in contexts where citizens seek self-directed climate literacy rather than compliance certification.

**Audience specificity creates adoption ceiling**: Albert explicitly targets professional production entities: TV production companies (drama, factual, entertainment, sports, news), film production (features, documentaries, shorts), commercial/advertising production, animation studios, and broadcaster operations [21]. The 900+ UK production companies registered represent organizations with commercial revenue, employee rosters, and sustainability program budgets [22]. Content impact metrics—441 productions featuring positive environmental behaviors on-screen in 2021, 339 productions including sustainable living references—reflect industry-wide normalization where sustainability teams coordinate editorial integration [23]. This professionalization succeeds for intended industry transformation but excludes civic learners seeking methodology education without commercial production context.

### The Missing Civic Engagement Layer

Comparative analysis reveals systematic gap in carbon accounting accessibility for democratic participation. The existing platform landscape distributes as:

**Individual consumer calculators** (low organizational insight, high guilt framing):

- CoolClimate Calculator (UC Berkeley), EPA Household Carbon Footprint Calculator, Carbon Footprint Ltd calculator focus on personal consumption choices (home energy, vehicle miles, air travel, diet, shopping) [24][25]
- Framing emphasizes individual responsibility: "Your household emits 16 tonnes CO2/year, 28% above national average—reduce by flying less, driving less, eating less meat"
- Lacks systemic context: no organizational access, no workplace emission understanding, no connection to industrial/commercial emissions representing 70%+ of national totals
- Pedagogical failure: users learn their personal number but not carbon accounting methodology, emission factor application, or organizational boundary setting

**Enterprise carbon accounting platforms** (high sophistication, gatekept access):

- Watershed, Persefoni, Plan A, Sweep, Carbonhound serve corporate sustainability departments with $20,000-$50,000 annual subscription fees requiring enterprise sales cycles [26]
- Comprehensive Scope 1/2/3 coverage with supplier collaboration portals, regulatory compliance automation (CSRD, SEC disclosure), scenario modeling, and AI-powered reduction recommendations [27]
- Professional specialization: platforms assume users possess sustainability expertise, corporate data access (ERP systems, procurement platforms, utility accounts), and organizational authority (budget for interventions, executive reporting relationships)
- Accessibility barrier: ordinary citizens cannot purchase enterprise subscriptions to learn methodology or analyze their workplace absent employer sponsorship

**Macro research platforms** (OWID, Global Carbon Project, national inventories):

- Academic research infrastructure providing national aggregates, historical trends, sectoral analyses essential for policy and scientific understanding [1][3]
- Abstraction prevents organizational application: country-level gigatonnes don't help community groups calculate school emissions or workers understand factory footprints
- Audience mismatch: platforms serve researchers, journalists, policymakers—not citizens seeking organizational literacy

**Industry-specific tools** (Albert, Green Production Guide, Ecoprod):

- Sector-optimized calculators addressing workflow-specific needs (production scheduling, equipment tracking, location logistics) [2][28]
- Gatekeeping through industry membership: access requires professional credentials demonstrating legitimate sector participation
- Domain specialization limits transferability: production-specific categories (filming spaces, LED stages, edit suites) don't map to schools, small businesses, municipal operations

The systematic absence across this landscape: **accessible organizational carbon accounting for civic engagement**. No platform enables:

- **Community accountability groups** calculating local government or school district emissions without professional consultants or enterprise software
- **Student organizations** analyzing university operational footprints to inform divestment campaigns or sustainability policy advocacy
- **Labor unions** understanding workplace emissions as collective bargaining input for just transition planning
- **Local journalists** investigating corporate climate claims through independent calculation verification rather than relying on company-provided disclosures
- **Civic educators** teaching carbon accounting methodology via hands-on organizational analysis rather than abstract textbook concepts
- **Grassroots activists** comparing organizational performance against sectoral benchmarks to identify high-impact intervention opportunities

### Defining the Civic Climate Literacy Deficit

Civic climate literacy encompasses three interconnected capabilities currently absent from accessible tooling:

**(1) Methodological understanding**: Citizens comprehending how organizational carbon footprints are calculated—the relationship between activity data and emission factors, Scope 1/2/3 boundary definitions, data quality hierarchies distinguishing primary from secondary data, uncertainty quantification, and allocation methodologies for shared resources. Existing platforms either hide methodology in black boxes (individual calculators, enterprise platforms) or present it at abstraction levels requiring technical expertise (academic literature, GHG Protocol standards). The literacy deficit means citizens participate in climate discourse without understanding how numbers are made, leaving them vulnerable to greenwashing, unable to evaluate corporate claims, and disempowered from evidence-based advocacy.

**(2) Systemic contextualization**: Citizens interpreting organizational footprints within broader emissions patterns—how workplace emissions relate to national sectoral averages, grid decarbonization trajectories, supply chain trade flows, and economic intensity trends. Individual calculators provide isolated numbers without context ("Your emissions: 16 tonnes/year—feel bad"). OWID provides macro context without organizational connection (national statistics don't explain your employer's footprint). The literacy deficit manifests as citizens unable to distinguish systemic drivers (coal-heavy electricity grid, distant supply chains requiring freight, fossil fuel heating infrastructure) from individual choices, leading to misallocation of attention toward consumer behavior changes with minimal impact versus collective action targeting structural emissions sources.

**(3) Democratic participation capacity**: Citizens deploying carbon accounting as civic engagement tool—holding organizations accountable through evidence-based claims, informing collective decision-making with quantitative analysis, identifying leverage points for policy intervention, and participating in climate governance beyond symbolic gestures. The literacy deficit means climate action remains confined to individual consumption choices (recycling, diet changes, flight reduction) or abstract policy advocacy ("support climate legislation") without intermediate organizational layer where citizens have actual influence through workplace organizing, school board activism, municipal engagement, or shareholder resolutions.

Research on climate communication identifies systemic barriers to civic engagement. Maibach et al. (2008) analyzing audience segmentation for climate change communication found that while 33% of Americans are "Alarmed" about climate change demonstrating highest concern and motivation, only 18% report taking action beyond individual behavior changes [29]. Swim et al. (2011) reviewing psychological barriers to climate action identify "attribution failures" where individuals struggle to connect abstract global problems to local organizational contexts and "efficacy gaps" where people lack confidence in ability to influence collective outcomes [30]. Lorenzoni et al. (2007) in systematic review of barriers to engagement note "lack of knowledge" not about climate science existence but about "what to do, both individually and collectively" [31]. The civic literacy deficit operates at this knowledge-to-action gap: people understand climate change is real and concerning but lack accessible tools translating concern into organizational-level understanding and evidence-based intervention.

## Opportunity Space Analysis for Carbon ACX

### User Segments Underserved by Existing Platforms

Carbon ACX's viable market consists of five primary user segments systematically excluded from current carbon accounting infrastructure:

#### 1. Community Accountability Organizations

**Profile**: Nonprofit advocacy groups, neighborhood associations, parent-teacher organizations, civic leagues, and grassroots coalitions seeking to hold local institutions accountable for climate commitments through quantitative emissions monitoring.

**Use case examples**:

- Parent-teacher association calculating elementary school district emissions to evaluate superintendent's "carbon neutral by 2030" claim, identifying highest-impact categories (bus fleet diesel, building natural gas heating, cafeteria food sourcing), comparing performance against neighboring districts using OWID-derived state-level benchmarks
- Neighborhood environmental group analyzing municipal government operational footprint (city hall, public works facilities, vehicle fleet, streetlighting, wastewater treatment) to inform city council budget priorities for electrification investments versus carbon offset purchases
- Faith-based climate justice coalition assessing religious institution portfolios (church buildings, parish operations, diocesan investments) to support denomination-wide divestment campaign with institutional-specific emissions data

**Barriers with existing platforms**:

- Enterprise platforms: Cannot access Watershed or Persefoni without organizational subscription; community groups lack $20k-50k annual budgets for commercial carbon accounting software
- OWID: National aggregates don't provide school district or municipal calculation capabilities; no organizational boundary setting, activity data input, or scoped categorization
- Individual calculators: Designed for households, not multi-building institutions; lack organizational categories like bus fleets, industrial kitchens, or wastewater treatment
- Professional consultants: Community groups cannot afford $10,000-$50,000 carbon audit services typical for organizational assessments

**Carbon ACX value proposition**: Free, accessible organizational calculator with educational scaffolding teaching GHG Protocol methodology through hands-on application, OWID integration providing state/national benchmarks for comparative context, open-source transparency enabling community validation of methodology choices, and export capabilities generating evidence packages for city council or school board presentations.

#### 2. Student Climate Organizations

**Profile**: University sustainability committees, campus divestment campaigns, high school environmental clubs, and student government sustainability initiatives seeking data-driven institutional advocacy rather than symbolic activism.

**Use case examples**:

- Undergraduate divest-from-fossil-fuels campaign calculating university operational footprint (campus buildings, research facilities, student housing, dining services, campus fleet, faculty/staff commuting) plus endowment-embedded emissions using OWID consumption-based data showing investment portfolio carbon intensity, supporting board of trustees presentation quantifying emissions reductions from proposed divestment versus operational efficiency gains
- Graduate student union analyzing department-level research footprints (laboratory energy consumption, computing clusters, fieldwork travel, conference attendance) to negotiate sustainability requirements in collective bargaining agreement covering lab purchasing policies and travel budget carbon caps
- High school climate club tracking school energy consumption monthly using utility bill data, creating time-series visualizations showing seasonal patterns and year-over-year trends, presenting findings to administration with specific solar panel installation ROI calculations derived from OWID electricity grid intensity projections

**Barriers with existing platforms**:

- Enterprise platforms: Universities purchasing Watershed for official reporting deny student access to platform data citing administrative privilege; students lack purchasing authority for independent subscriptions
- OWID: Provides national higher education sector emissions averages but no campus-specific calculation capability; students cannot input university activity data to generate institutional footprints
- Albert: Production-specific categories (filming spaces, edit suites) don't map to university operations; gatekept to screen production industry

**Carbon ACX value proposition**: Openly accessible calculation engine enabling students to independently analyze institutional footprints without administrative permission, educational documentation teaching Scope 1/2/3 methodology suitable for undergraduate research projects or master's theses, peer-reviewed methodology transparency allowing academic scrutiny of calculation choices, and export formats supporting academic conference presentations and peer-reviewed publication.

#### 3. Labor Union Sustainability Committees

**Profile**: Union locals, worker cooperatives, labor federations, and employee resource groups analyzing workplace emissions as input to collective bargaining, just transition planning, and occupational health advocacy.

**Use case examples**:

- Manufacturing union local calculating facility-level emissions (production floor electricity, heating fuel, industrial process emissions, material inputs, worker commuting) to propose "green jobs" contract language requiring employer investments in electrification and energy efficiency with retraining provisions for workers displaced by automation, using OWID national manufacturing sector data to demonstrate facility's above-average carbon intensity justifying priority intervention
- Healthcare workers union assessing hospital operational footprint (medical equipment, sterilization processes, pharmaceutical supply chains, medical waste disposal, emergency generator testing) to negotiate sustainability committee with management representation, identifying emission reduction opportunities improving occupational health through indoor air quality and reducing toxic exposure
- Transportation union analyzing municipal transit agency emissions (bus fleet, maintenance facilities, fare collection infrastructure) to advocate for electric bus deployment with battery safety training, using OWID transport modal factors comparing diesel bus emissions intensity against electric alternatives plus grid decarbonization scenarios

**Barriers with existing platforms**:

- Enterprise platforms: Management controls Persefoni access restricting worker visibility into footprint data; unions cannot independently verify employer climate claims without purchasing separate subscriptions
- OWID: No facility-level calculation capabilities; national transport or manufacturing averages insufficient for workplace-specific bargaining proposals
- Individual calculators: Employee commuting components but no industrial facility categories, process emissions, or supply chain inputs

**Carbon ACX value proposition**: Independent calculation capability enabling unions to verify management climate claims without relying on employer-controlled data platforms, occupational health framing connecting emissions sources to workplace safety concerns (combustion byproducts, refrigerant exposure, toxic material handling), transparency supporting grievance procedures where environmental commitments disputed, and export features generating contract proposal attachments with detailed emission reduction scenarios and job impact estimates.

#### 4. Local Investigative Journalists

**Profile**: Community newspaper reporters, regional TV news sustainability correspondents, nonprofit journalism organizations, and freelance environmental reporters seeking to verify corporate climate claims, investigate municipal environmental programs, and provide accountability reporting on institutional emissions performance.

**Use case examples**:

- Regional newspaper investigating city's "carbon neutral by 2025" claim by reconstructing municipal footprint from public records (utility bills via FOIA requests, vehicle registration data, building square footage from assessor database, waste tonnage from contractor reports), comparing journalist-calculated emissions against city's official reporting to identify accounting omissions like Scope 3 employee commuting or construction emissions
- Environmental justice reporter documenting industrial facility emissions impact on environmental justice community by calculating manufacturer's footprint from EPA Toxic Release Inventory data, air permit applications, electricity usage disclosure in sustainability report, and supply chain transportation patterns, contextualizing facility emissions as percentage of county total using OWID state-level data
- Television news sustainability segment tracking regional corporate climate commitments over multi-year period, independently calculating company footprints from disclosed activity data in CSR reports then comparing against company-claimed reductions to verify authenticity versus greenwashing

**Barriers with existing platforms**:

- Enterprise platforms: Journalists cannot access corporate Watershed or Persefoni platforms; companies control disclosure refusing data access for investigative reporting
- OWID: National aggregates don't enable facility-specific or company-specific calculations; no organizational boundary setting for corporate footprint reconstruction
- Professional consultants: Newsroom budgets cannot afford $10,000 carbon audits per investigation; journalistic independence requires independently reproducible methodology not outsourced to consultants

**Carbon ACX value proposition**: Methodology transparency enabling journalistic verification and replication of calculations, open-source code allowing public scrutiny of reporting methodology (critical for investigative journalism credibility), OWID integration providing contextual benchmarks for "X company emits Y% of state total" comparative framing, export features generating publication-ready visualizations and data tables for articles, and comprehensive calculation provenance enabling editor review and source citation meeting journalistic standards.

#### 5. Civic Climate Educators

**Profile**: Adult education instructors, community college professors, nonprofit workshop facilitators, library program coordinators, and workforce development trainers teaching carbon accounting methodology, climate data literacy, and sustainability career skills to non-specialist audiences.

**Use case examples**:

- Community college sustainability certificate program teaching GHG Protocol methodology through hands-on student projects calculating organizational footprints for local businesses, nonprofits, or municipal departments, with Carbon ACX providing accessible interface for methodology learning without requiring enterprise software subscriptions or complex spreadsheet modeling
- Public library system hosting "Climate Data Literacy" workshop series using Carbon ACX to demonstrate organizational carbon accounting through example calculations (local school, library branch, community center), teaching participants how to interpret emissions data, understand Scope 1/2/3 boundaries, evaluate data quality, and contextualize organizational footprints using OWID national statistics
- Workforce development program preparing students for emerging green economy careers (sustainability coordinators, energy auditors, climate analysts) using Carbon ACX as free training platform teaching calculation methodologies, emission factor application, data validation, and report generation without requiring students to purchase enterprise software licenses

**Barriers with existing platforms**:

- Enterprise platforms: Educational institutions cannot afford Watershed licenses for all students; platforms designed for corporate sustainability professionals assume significant prior knowledge unsuitable for introductory learning
- OWID: Provides data for analysis but no calculation engine teaching methodology application; students learn about national emissions but not how to calculate organizational footprints
- Albert: Industry-specific tool inappropriate for general climate education; production workflow categories don't teach generalizable GHG Protocol principles

**Carbon ACX value proposition**: Free accessibility enabling universal student access without licensing barriers, pedagogical design with progressive disclosure serving novice learners (guided tutorials, tooltip explanations, example datasets) through advanced users (custom emission factor integration, API access for programmatic analysis), open-source transparency supporting instructor modification for curriculum-specific needs, export capabilities generating student assignments and portfolio artifacts for job applications, and methodology documentation suitable as course textbook replacement or supplement.

### Use Cases Both Existing Platforms Cannot Address

Cross-cutting analysis identifies five organizational carbon accounting scenarios systematically unaddressed by current platform landscape, representing Carbon ACX's core opportunity space:

#### Use Case 1: Participatory Organizational Footprinting

**Scenario**: Multi-stakeholder group with diverse technical capabilities collaboratively calculating shared organizational footprint requiring both methodological transparency for consensus-building and sufficient simplification for non-expert participation.

**Example implementation**: Church environmental stewardship committee comprising congregation members (varied professional backgrounds: accountant, teacher, retiree, student) analyzing parish operational footprint. Process requires: (1) collective data gathering from utility bills, vehicle logs, maintenance records; (2) collaborative decision-making on boundary setting (include or exclude priest residence? allocate shared building usage between worship, office, community events?); (3) transparent methodology visible to all participants enabling trust in final numbers; (4) contextual interpretation connecting parish emissions to local/regional patterns; (5) actionable insights identifying reduction opportunities accessible to volunteer-driven implementation (LED retrofits, thermostat schedules, carpool coordination).

**Why existing platforms fail**:

- Enterprise platforms: Designed for single corporate sustainability manager, not collaborative multi-stakeholder process; methodology hidden in black box preventing consensus-building; cost barrier prevents volunteer organizations from access
- OWID: No organizational calculation capability; provides context but not tools for participatory footprinting
- Individual calculators: Household focus inappropriate for institutional analysis; lack collaborative features enabling shared data input and interpretation

**Carbon ACX requirements**: Transparent calculation display showing how inputs transform to outputs enabling group understanding, collaborative data input allowing multiple contributors without single-user bottleneck, progressive disclosure serving mixed-expertise groups (simplified view for lay participants, detailed methodology for technically inclined members), export features generating reports suitable for congregational presentation, and OWID integration contextualizing parish footprint ("Our 150 tCO2e represents 0.0003% of county total; parish buildings less efficient than commercial sector average per OWID data suggesting weatherization opportunity").

#### Use Case 2: Longitudinal Organizational Tracking for Non-Professionals

**Scenario**: Non-specialist individual or small team monitoring organizational emissions over multi-year period to evaluate intervention effectiveness, track progress toward self-set targets, and maintain institutional memory across leadership transitions.

**Example implementation**: Elementary school sustainability coordinator (part-time teacher with additional sustainability responsibilities, no formal carbon accounting training) tracking school emissions quarterly across five-year period. Requirements: (1) simple data entry accepting quarterly utility bills, fuel deliveries, and bus mileage without complex data transformations; (2) automated time-series visualization showing seasonal patterns and year-over-year trends; (3) methodology consistency enabling fair comparison across periods despite staff turnover; (4) benchmark comparison showing school performance versus district average and state trends using OWID education sector data; (5) actionable feedback identifying highest-impact categories and emerging trends requiring attention.

**Why existing platforms fail**:

- Enterprise platforms: Designed for professional sustainability teams with technical training; complexity inappropriate for part-time coordinator with teaching responsibilities; annual subscription costs misaligned with school discretionary budgets
- OWID: No longitudinal organizational tracking capabilities; provides state-level trends but cannot ingest school-specific activity data
- Albert: Production-specific workflows unsuitable for educational institutions; certification focus rather than continuous improvement tracking

**Carbon ACX requirements**: Simplified data entry templates matching common document formats (utility bills, maintenance logs), automated calculation persistence enabling multi-year comparison without methodology changes, time-series visualization highlighting trends and anomalies, benchmark integration comparing organizational trajectory against OWID state/national patterns, and downloadable datasets enabling coordinator transition without losing institutional knowledge.

#### Use Case 3: Rapid Hypothesis Testing for Advocacy Planning

**Scenario**: Activist organization or student group quickly modeling emissions scenarios to identify highest-impact advocacy targets, compare intervention options, and generate evidence supporting specific policy proposals—requiring fast turnaround incompatible with consultant engagement.

**Example implementation**: University divestment campaign calculating endowment-embedded emissions under three scenarios: (1) status quo portfolio; (2) divest from top 200 fossil fuel companies; (3) divest plus reinvest in renewable energy. Analysis required in two-week timeframe before board of trustees meeting. Process: (1) obtain endowment allocation percentages from public financial reports; (2) apply OWID consumption-based emission factors to portfolio sectors; (3) model divestment scenarios using emission intensity differentials between fossil and renewable investments; (4) generate comparative visualizations showing emissions reduction under each scenario; (5) calculate equivalencies ("divesting equals removing X cars from road annually") for presentation accessibility.

**Why existing platforms fail**:

- Enterprise platforms: University administration controls platform access preventing student independent analysis; consultant engagement requires $10,000+ and 3-6 month timeline incompatible with advocacy deadlines
- OWID: Provides sectoral emission intensities but no portfolio calculation tools accepting investment allocations and generating scenario comparisons
- Investment-specific tools: Focus on financial risk analysis (stranded assets, transition risk) rather than absolute emissions quantification for advocacy framing

**Carbon ACX requirements**: Rapid scenario modeling accepting simplified inputs and generating comparative outputs within hours, OWID sectoral intensity integration enabling portfolio emission estimation without granular company-level data, export formats supporting advocacy presentations (slide-ready charts, talking points, equivalency calculators), methodology documentation enabling trustee scrutiny of calculation validity, and uncertainty quantification acknowledging estimation limitations while maintaining decision relevance.

#### Use Case 4: Methodological Learning Through Organizational Case Studies

**Scenario**: Educational setting where students learn carbon accounting principles through applying methodology to real organizational examples rather than abstract textbook problems—requiring pedagogically structured calculation interface explicitly teaching concepts through hands-on application.

**Example implementation**: Community college Environmental Science course module on carbon accounting where students calculate footprints for five organizational types (retail store, restaurant, office building, light manufacturing, school) to understand how boundary definitions, activity data categories, and emission factors vary by operational characteristics. Learning objectives: (1) understand Scope 1/2/3 boundary distinctions through comparing organizational types; (2) apply emission factor selection logic based on data availability (actual vs. secondary); (3) interpret data quality scores and uncertainty ranges; (4) contextualize organizational footprints using OWID benchmarks; (5) identify highest-impact categories and propose evidence-based reduction strategies.

**Why existing platforms fail**:

- Enterprise platforms: Pedagogically inappropriate—designed for efficient professional use not learning scaffolding; licensing costs prevent universal student access; complexity overwhelming for introductory courses
- OWID: Provides contextual data but no calculation engine; students analyze trends but don't learn methodology application
- Individual calculators: Household focus inappropriate for teaching organizational boundaries; lack pedagogical features explaining calculation logic

**Carbon ACX requirements**: Pedagogical interface with progressive disclosure revealing calculation steps explicitly (show activity data × emission factor = emissions with each component explained), example datasets representing diverse organizational types enabling comparative analysis, integrated explanatory content teaching GHG Protocol concepts in context of calculations, assessment features enabling instructors to verify student understanding (quiz questions, calculation challenges), and methodology documentation suitable as course readings without requiring GHG Protocol standards purchase.

#### Use Case 5: Grassroots Evidence Generation for Policy Advocacy

**Scenario**: Community coalition generating independently verifiable emissions data to support specific policy proposals in local government contexts where official data limited, outdated, or credibility contested—requiring transparent methodology acceptable to diverse stakeholders including opposition.

**Example implementation**: Environmental justice coalition advocating for city climate action plan improvement by calculating comprehensive municipal operational footprint including categories omitted from official reporting. Analysis reveals city's official "carbon neutral" claim excludes Scope 3 categories (employee commuting, contracted services, waste disposal, construction emissions) representing 60% of actual footprint. Coalition presents city council with: (1) detailed methodology documentation enabling official verification; (2) OWID-derived comparisons showing peer city performance; (3) category-specific reduction scenarios with cost-benefit analyses; (4) equity analysis showing emission distribution across neighborhoods. Transparent methodology critical for coalition credibility and official acceptance.

**Why existing platforms fail**:

- Enterprise platforms: City administration controls platform access; coalition cannot independently verify official claims without separate subscription; methodology opacity prevents stakeholder consensus-building
- OWID: National/state data don't enable municipal calculation; no tools for reconstructing organizational footprints from public records
- Consultants: $25,000+ municipal carbon audit costs exceed coalition budgets; outsourced analysis lacks community ownership and activist credibility

**Carbon ACX requirements**: Methodology transparency enabling official verification and opposition scrutiny, comprehensive documentation supporting peer review by city technical staff, OWID integration providing authoritative benchmarks for comparative claims, export features generating city council presentation materials, version control maintaining calculation audit trail for accountability, and open-source code allowing replication by other municipalities or coalitions.

### Technical Requirements for Accessibility

Carbon ACX's civic literacy mission necessitates specific architectural and interface design requirements distinguishing it from professional platforms:

#### Accessibility Requirement 1: Zero-Cost, Zero-Credential Access

**Specification**: Platform available without financial payment, organizational affiliation verification, professional credential confirmation, or institutional email requirement—enabling universal access limited only by internet connectivity and device availability.

**Implementation approach**:

- Web-based application requiring only browser (no software installation, operating system requirements, or administrative permissions)
- No authentication for basic calculation functionality (users can perform calculations, generate visualizations, export data without creating accounts)
- Optional account creation for saving projects, accessing extended features (API access, bulk exports), but never required for core calculation capabilities
- Open-source codebase enabling self-hosting by institutions (universities, libraries, community organizations) wanting local control
- Offline capability enabling calculation in contexts with limited internet connectivity (downloadable calculation engine, embedded emission factor libraries)

**Rationale**: Financial barriers exclude low-income communities and global South populations disproportionately impacted by climate change; credential requirements prevent grassroots activists, citizen scientists, and investigative journalists from accountability work; authentication friction reduces educational adoption and spontaneous learning opportunities.

#### Accessibility Requirement 2: Progressive Disclosure Serving Mixed Expertise

**Specification**: Interface architecture presenting information at appropriate complexity levels for user sophistication—enabling novice learners to complete calculations without overwhelming detail while allowing technically sophisticated users to access full methodological depth within same platform.

**Implementation approach**:

- Default "Guided Mode" with simplified interface using natural language categories ("How much electricity did your organization use?"), preset choices for common scenarios (office building, retail store, school), tooltips explaining concepts inline, and automated calculation with minimal user decision-making
- "Advanced Mode" exposing detailed methodology including emission factor selection dropdowns, data quality scoring, uncertainty quantification, custom categorization, allocation methodology choices, and calculation formula visibility
- Progressive revelation within single interface using expandable sections, "Show details" buttons, "Why this matters" explanatory panels, and contextual help without requiring mode switching
- Adaptive scaffolding adjusting interface complexity based on user behavior (number of completed calculations, detail level accessed, custom factor uploads indicating expertise)
- Example datasets at varying complexity levels (simple: small office calculation; intermediate: multi-building school district; advanced: manufacturing facility with process emissions)

**Rationale**: Single-expertise-level interfaces fail mixed-capability user groups (community organizations, student teams); oversimplification prevents learning; excessive complexity creates abandonment; professional platforms optimize for expert efficiency rather than learning scaffolding.

#### Accessibility Requirement 3: Pedagogical Transparency in Calculation Logic

**Specification**: Platform exposes calculation methodologies explicitly as educational content rather than hiding in black boxes—enabling users to understand how inputs transform to outputs, learn GHG Protocol principles through application, and develop transferable carbon accounting literacy.

**Implementation approach**:

- Calculation display showing explicit formula: "Emissions = Activity Data × Emission Factor" with actual values visible ("1,000 kWh × 0.5 kgCO2/kWh = 500 kgCO2")
- Emission factor provenance visible for each calculation line item (source: DEFRA 2024, geographic scope: United Kingdom, data quality score: 5/5, last updated: July 2024)
- Scope categorization explanations embedded contextually ("This electricity consumption is Scope 2 because it's purchased energy, not directly combusted by your organization")
- Boundary setting decisions made explicit with reasoning ("We included employee commuting in Scope 3 because GHG Protocol Category 7 recommends organizational responsibility for commute-related emissions")
- Uncertainty ranges displayed with interpretation guidance ("±15% uncertainty reflects emission factor variability and activity data estimation—your footprint is between 850-1,150 tCO2 with 95% confidence")
- Downloadable methodology documentation generated automatically from actual calculation choices made by user (creating custom "Methods" section suitable for reports or academic papers)

**Rationale**: Black-box calculations fail educational mission; users finish with number but no methodology understanding; professional platforms optimize for efficiency requiring users already understand concepts; transparency enables peer review, verification, and transferable learning.

#### Accessibility Requirement 4: Contextual Integration of Macro Data

**Specification**: Platform embeds OWID national/sectoral/temporal data as interpretive backdrop for organizational footprints rather than requiring users to separately access macro statistics—enabling systemic contextualization within single user experience.

**Implementation approach**:

- Automated benchmark comparison pulling OWID data based on user inputs (organization location, sector, year) without requiring manual OWID navigation
- Contextual visualization overlaying organizational footprint on national sectoral distribution ("Your manufacturing facility's emissions are 73% electricity—national manufacturing average is 65% electricity suggesting your facility is slightly more grid-dependent")
- Temporal contextualization showing organizational trajectory against regional decarbonization trends ("Your emissions declined 8% over three years while state electricity grid intensity declined 12%—your reduction is slower than grid improvements suggest additional organizational opportunities")
- Per-capita and intensity normalization enabling organizational comparison against OWID metrics ("Your university emits 5 tCO2 per student, compared to national higher education average of 7 tCO2 per student per OWID education sector data")
- Equivalency calculators connecting organizational emissions to tangible concepts using OWID reference data ("Your organization's 5,000 tCO2 equals 0.001% of state total, equivalent to 1,087 cars driven for one year")

**Rationale**: Separate tools requiring users to manually connect organizational calculations with OWID macro data creates friction preventing systemic understanding; isolated numbers without context fail civic literacy goals; integrated contextualization teaches relationship between individual organizations and collective patterns.

#### Accessibility Requirement 5: Multi-Format Knowledge Outputs

**Specification**: Platform generates diverse output formats serving different civic engagement contexts—from presentation slides for city council meetings to academic papers for student research to social media graphics for public communication.

**Implementation approach**:

- Interactive dashboard for exploratory analysis (Plotly visualizations enabling filtering, zooming, hover tooltips, recalculation)
- Slide-ready charts exported as PNG/SVG with clean backgrounds, readable fonts, and appropriate sizing for presentations
- Data tables exported as CSV enabling Excel manipulation, database imports, and custom analysis
- Methodology documentation exported as formatted text (Word, PDF, Markdown) suitable for report appendices or academic papers
- Summary infographics auto-generated with key findings, visualizations, and equivalency comparisons suitable for non-technical audiences
- Social media cards optimized for Twitter/Facebook/Instagram with attention-grabbing statistics and visual appeal
- API access enabling programmatic data retrieval for developers building custom applications or integrating with organizational websites

**Rationale**: Single output format limits platform utility across diverse civic contexts; academics need methodology documentation for papers; activists need presentation graphics for public meetings; journalists need data tables for analysis; diverse formats maximize reach and utility.

## Pedagogical Framework: Teaching Without Guilting

### The Consumer Guilt Problem in Existing Tools

Individual carbon calculators systematically frame emissions as personal moral failing requiring individual behavioral correction [24][25]. EPA's Household Carbon Footprint Calculator concludes calculations with reduction recommendations: "You can reduce your carbon footprint by: driving less, flying less, eating less meat, using less electricity" [32]. CoolClimate Calculator presents "Personal Emissions Actions" ranked by potential reduction (dietary change, vehicle replacement, air travel elimination) [33]. This framing creates three pedagogical failures:

**(1) Misallocated attention**: Individual consumption represents 20-30% of national emissions with industrial processes, electricity generation, agriculture, and freight transport dominating emissions profiles [34]. Calculators directing attention toward personal behavior changes (cycling instead of driving, vegetarian diet adoption) while ignoring organizational and systemic emissions sources where individuals have actual collective leverage (workplace energy procurement, school board facilities decisions, municipal transit investments) systematically misdirects climate action energy.

**(2) Efficacy undermining**: Focusing on behaviors individuals cannot easily change or lack authority to influence creates learned helplessness. Swim et al. (2011) identify "efficacy gaps" as major psychological barrier to climate action—people believe their actions cannot meaningfully impact outcomes [30]. Telling someone "fly less" when occupational requirements mandate travel, or "drive less" when public transit unavailable, or "eat less meat" when cultural/religious dietary practices important generates guilt without pathway to action, potentially causing disengagement rather than motivation.

**(3) Systemic erasure**: Individual framing obscures structural emissions drivers—fossil fuel subsidies, zoning laws mandating car dependence, agricultural policy favoring industrial livestock production, electricity market regulations preventing renewable procurement. Shove (2010) analyzing sustainable consumption critique argues framing climate change as collection of individual choices rather than outcome of infrastructural and institutional arrangements fundamentally misdiagnoses problem and misdirects solutions [35].

### Carbon ACX's Alternative Pedagogical Approach

Carbon ACX must implement **systemic contextualization pedagogy** teaching users to interpret organizational emissions as outcomes of structural conditions rather than individual moral failings, while identifying collective leverage points for meaningful intervention.

#### Pedagogical Principle 1: Structural Attribution of Emissions Sources

**Implementation**: Every emission calculation explicitly identifies structural driver alongside quantification.

**Example execution**: Manufacturing facility calculation showing:

- "Electricity: 3,500 tCO2 (70% of total)
    - **Structural driver**: Your regional electricity grid generates 65% of electricity from coal (national average: 35% coal per OWID data). Grid decarbonization represents primary reduction opportunity.
    - **Organizational levers**: Advocate for utility green tariff offerings, investigate on-site solar feasibility, join corporate clean energy buyer consortium pressuring grid operator.
    - **Individual behavior relevance**: Minimal—switching off unused equipment saves 2-5% annually, insignificant compared to grid composition."

This framing teaches three concepts: (1) emission drivers often external to organizational control requiring collective action; (2) organizational interventions exist but require group coordination (worker pressure on management, supplier collaboration); (3) individual behavior changes within organizations carry minimal impact compared to structural shifts.

#### Pedagogical Principle 2: Collective Action Framing

**Implementation**: Platform suggests interventions requiring group coordination rather than individual behavior change.

**Example execution**: University footprint calculation concluding with:

- "Highest-impact reduction opportunities requiring collective action:
    1. **Student government resolution** mandating renewable electricity procurement (reduces Scope 2 by 60%, requires board of trustees vote achievable through sustained campaign)
    2. **Faculty senate proposal** establishing conference travel emissions cap for departments with video alternative requirement (reduces Scope 3 Category 6 by 35%, requires curriculum committee approval and department buy-in)
    3. **Campus sustainability committee** negotiating electric bus fleet replacement plan with administration (reduces Scope 3 Category 7 by 25%, requires capital budget reallocation and phased implementation over 5 years)"

This framing identifies specific governance mechanisms, decision-making bodies, approval processes, and coalition-building strategies—teaching civic engagement rather than consumerism.

#### Pedagogical Principle 3: Leverage Point Identification

**Implementation**: Platform highlights emissions sources where users have actual influence versus those requiring broader systemic change.

**Example execution**: School district footprint showing:

- "Emissions by sphere of influence:
    - **Direct community control (55% of footprint)**: Building energy efficiency upgrades, bus fleet procurement, cafeteria sourcing policies. Actionable through school board resolutions, PTA fundraising, and administrative policy changes.
    - **Shared control requiring coalition (30% of footprint)**: Electricity grid composition, district-wide construction standards, regional transportation planning. Requires coordinated advocacy with neighboring districts, utility engagement, and regional planning participation.
    - **External structural factors (15% of footprint)**: State energy policy, federal vehicle emissions standards, agricultural system carbon intensity. Requires state/federal policy advocacy, voting, and broader climate movement participation."

This categorization teaches realistic assessment of agency—where communities can act directly, where they need coalitions, where they face structural constraints requiring political change.

#### Pedagogical Principle 4: Temporal Contextualization

**Implementation**: Platform shows organizational emissions trajectories alongside broader decarbonization trends revealing whether organizations are improving faster or slower than structural changes.

**Example execution**: Municipality five-year emissions tracking:

- "Your city's emissions declined 15% from 2019-2024.
    - **Grid decarbonization** contributed 10 percentage points of reduction (state electricity grid shifted from 60% coal to 40% coal over period per OWID data—passive reduction requiring no city action).
    - **Organizational interventions** contributed 5 percentage points (LED streetlight conversion, electric vehicle fleet replacement, building weatherization programs—active reductions from city decisions).
    - **Peer comparison**: Similar-sized cities in region averaged 18% reduction (12% grid, 6% organizational), suggesting your city is slightly behind peers in active intervention despite similar passive grid benefits."

This contextualization teaches: (1) distinguish passive reductions from active interventions; (2) evaluate organizational performance against comparable entities; (3) understand that "we reduced emissions 15%" claims may primarily reflect external factors rather than organizational commitment.

#### Pedagogical Principle 5: Equity-Informed Interpretation

**Implementation**: Platform integrates equity analysis preventing blame allocation to populations with limited alternatives.

**Example execution**: Employee commuting footprint analysis:

- "Scope 3 Category 7 (employee commuting): 450 tCO2 (15% of organizational footprint)
    - **Equity consideration**: 60% of employees live >15 miles from workplace where public transit unavailable—commuting by car is necessity not choice given organizational location decision and regional transportation infrastructure.
    - **Organizational responsibility framing**: Your organization chose suburban office park location optimizing executive commute times while creating car dependency for workforce. Employee commuting emissions result from organizational site selection, not employee environmental irresponsibility.
    - **Equitable interventions**: Employer shuttle from transit hub, remote work policy expansion, compressed work week reducing commute days, or future facility relocation closer to transit when lease expires—not individual employee blame for 'choosing' to drive."

This framing prevents carbon accounting from reinforcing existing inequities where low-income workers lacking housing/transportation alternatives blamed for structural outcomes.

### Balancing Empowerment and Overwhelm

Critical pedagogical challenge: providing systemic context risks inducing paralysis ("everything requires systemic change, nothing I do matters") rather than empowerment. Carbon ACX must implement **actionable systems thinking**—showing structural drivers while identifying specific intervention points accessible to user's context.

**Intervention point matrix implementation**:

| Timeframe | Individual capacity | Organizational collective | Policy/systemic advocacy |
| --- | --- | --- | --- |
| **Immediate (<6 months)** | Personal consumption audit, workplace behavior changes | Organizational policy proposals, committee formation | Contact elected officials, sign petitions |
| **Short-term (6-24 months)** | Skill development, career alignment | Sustained campaigns, budget advocacy | Coalition building, local ordinances |
| **Medium-term (2-5 years)** | Career transitions, investment shifts | Institutional policy changes, capital investments | State/regional policy, ballot initiatives |
| **Long-term (5-10 years)** | Lifestyle restructuring, relocation | Organizational transformation | Federal policy, international agreements |

Platform generates customized intervention recommendations mapping to user context (community activist, student, employee, journalist) and organizational characteristics (budget size, decision-making structure, political context).

## Carbon ACX Design Principles Synthesizing Platform Learnings

### Design Principle 1: Methodology Transparency as Core Feature (from OWID)

**OWID lesson**: Platform's credibility derives from complete methodology transparency—open-source ETL pipeline with GitHub-hosted processing code, comprehensive documentation explaining every calculation step, version control providing audit trails, and explicit acknowledgment of data quality limitations [6]. This transparency enables academic scrutiny, journalistic verification, policy trust, and educational reuse.

**Carbon ACX implementation**: Adopt OWID's transparency architecture for organizational carbon accounting:

**(A) Calculation provenance tracking**: Every emission value in output reports links to: (1) source activity data with row number in input CSV; (2) emission factor with citation (source, year, geographic scope, data quality score, DOI); (3) calculation formula showing explicit multiplication; (4) validation checks passed; (5) alternative methodologies considered and rationale for choice made.

**Code example**:

```javascript
# Calculation provenance schema
{
  "emission_line_item": {
    "description": "Office electricity consumption",
    "scope": 2,
    "activity_data": {
      "value": 50000,
      "unit": "kWh",
      "source_file": "activities.csv",
      "source_row": 15,
      "data_quality": 5,  # Primary metered data
      "date_collected": "2024-12-31"
    },
    "emission_factor": {
      "value": 0.233,
      "unit": "kgCO2e/kWh",
      "source": "UK DEFRA GHG Conversion Factors 2024",
      "source_url": "https://www.gov.uk/...",
      "geographic_scope": "United Kingdom",
      "year": 2024,
      "includes_gases": ["CO2", "CH4", "N2O"],
      "lifecycle_stages": ["generation", "transmission", "distribution"],
      "data_quality": 5,
      "last_updated": "2024-07-15"
    },
    "calculation": {
      "formula": "activity_data × emission_factor",
      "result": 11650,
      "result_unit": "kgCO2e",
      "alternative_methods_considered": [
        "Market-based method using supplier-specific factor: insufficient data",
        "Location-based method using regional grid factor: selected (most conservative)"
      ]
    },
    "validation": {
      "range_check": "PASS: 50,000 kWh reasonable for office size (100-200 kWh/m²/year typical)",
      "temporal_consistency": "PASS: Similar to previous year ±10%",
      "peer_comparison": "PASS: Within 20% of OWID national office sector intensity"
    }
  }
}

```

This provenance enables:

- **Academic verification**: Researchers can reproduce calculations from methodology documentation
- **Journalistic fact-checking**: Reporters can verify organizational climate claims by checking calculation validity
- **Peer review**: Community members can scrutinize methodology choices in public meetings
- **Educational learning**: Students understand calculation logic by examining worked examples

**(B) Version-controlled methodology releases**: Following OWID's semantic versioning approach [6], Carbon ACX publishes methodology versions with changelogs documenting emission factor updates, calculation formula modifications, validation rule additions, and benchmark data refreshes. Organizations pin methodology versions for regulatory compliance while enabling upgrades.

**Changelog example**:

```javascript
# Carbon ACX Methodology v2.1.0 (2024-12-01)

## Emission Factor Updates
- Updated UK DEFRA factors to 2024 release (274 factors changed)
- Added OWID 2024 grid intensities (15 countries updated)
- Revised EPA refrigerant GWP values per IPCC AR6

## Calculation Changes
- Modified Scope 3 Category 1 spend-based methodology to use EEIO factors with regional variation
- Added uncertainty quantification via Monte Carlo simulation (10,000 iterations)
- Improved allocation methodology for shared facilities using floor area ratios

## Validation Rules
- Added outlier detection for electricity consumption (flags values >3 std deviations from sector mean)
- Enhanced temporal consistency checks comparing month-over-month changes
- Implemented cross-scope consistency validation (Scope 2 electricity should approximately match Scope 1 natural gas for typical buildings)

## Breaking Changes
- None (fully backward compatible with v2.0.x data files)

## Migration Guide
- No action required for existing users
- Optional: Regenerate footprints with updated factors for improved accuracy

```

This approach enables regulatory compliance (auditors can verify specific methodology version used) while supporting continuous improvement.

### Design Principle 2: Production-Specific Categories Where Appropriate (from Albert)

**Albert lesson**: Generic carbon calculators fail domain-specific needs because activity categories don't map to actual workflows [16]. Albert's success derives from production-specific categories (filming spaces, LED volume stages, edit suites, hired equipment) reflecting how production coordinators actually think about activities rather than forcing translation to generic categories [18].

**Carbon ACX implementation**: Provide organizational type templates with domain-specific categories while maintaining underlying GHG Protocol structure:

**(A) Organizational type templates**: Pre-configured category structures for common organization types eliminating translation burden:

**Educational institution template**:

- Scope 1: Campus building natural gas heating, fleet vehicles (maintenance trucks, security vehicles, shuttle buses), emergency generators, science lab fuel consumption
- Scope 2: Academic building electricity, residence hall electricity, athletic facilities electricity, purchased steam/chilled water from central plant
- Scope 3: Student commuting, faculty/staff commuting, university business travel (conferences, recruiting, athletics), study abroad flights, purchased goods (lab supplies, office materials, library acquisitions, IT equipment), food services, waste disposal, construction projects, outsourced services (janitorial, landscaping, food service contractors)

**Small business template (office-based)**:

- Scope 1: Space heating fuel (natural gas, oil, propane), company vehicle fleet
- Scope 2: Office electricity, electricity for server room/data center
- Scope 3: Employee commuting, business travel (flights, rental cars, hotels), purchased office supplies, IT equipment, furniture, waste disposal, third-party services (cleaning, security, deliveries), work-from-home employee electricity

**Manufacturing template**:

- Scope 1: Industrial process emissions, on-site fuel combustion (boilers, furnaces, kilns), company vehicle fleet, fugitive emissions (refrigerants, welding gases)
- Scope 2: Production floor electricity, HVAC electricity, facility lighting
- Scope 3: Purchased raw materials, components and parts, packaging materials, upstream transportation (freight-in), downstream transportation (freight-out), employee commuting, business travel, waste disposal, capital goods (machinery, equipment)

**Municipal government template**:

- Scope 1: Municipal building heating fuel, vehicle fleet (police, fire, public works, transit), wastewater treatment facility emissions, landfill methane
- Scope 2: Municipal building electricity, streetlight electricity, traffic signal electricity, water/wastewater treatment electricity
- Scope 3: Employee commuting, solid waste transport and disposal, contracted services (refuse collection, school bus operations, facilities management), construction projects, purchased goods

Templates accelerate data collection (categories match how organizations track activities) while teaching GHG Protocol structure (templates explicitly label scopes and include explanations).

**(B) Custom category creation**: Advanced users can define organization-specific categories mapping to their workflows while maintaining Scope 1/2/3 classifications:

**Interface mockup**:

```javascript
Create Custom Category
Name: LED Volume Stage Electricity
Scope: 2 (Purchased Electricity)
Parent Category: Production Facilities
Emission Factor: [Select from library or upload custom]
Activity Data Unit: kWh
Notes: Virtual production soundstage electricity consumption separate from traditional studio spaces due to higher power requirements for LED walls and real-time rendering servers

```

This flexibility enables domain specialists (e.g., sustainability coordinator for screen production company) to create Albert-like specificity within Carbon ACX while maintaining GHG Protocol compliance.

### Design Principle 3: Interactive Visualization for Exploration (from OWID)

**OWID lesson**: Static reports fail to support exploratory analysis essential for understanding complex emissions patterns. Interactive visualizations enabling filtering, comparison, and drill-down transform users from passive report consumers to active data explorers [7].

**Carbon ACX implementation**: Plotly-based interactive dashboards with filtering, hover tooltips, temporal animation, and comparative overlays:

**(A) Scope drill-down visualization**: Stacked bar chart showing organizational footprint with click-to-expand revealing category details:

```javascript
Total Emissions: 5,000 tCO2e
├─ Scope 1 (20%): 1,000 tCO2e [click to expand]
│  ├─ Natural gas heating: 800 tCO2e
│  ├─ Fleet vehicles: 180 tCO2e
│  └─ Emergency generators: 20 tCO2e
├─ Scope 2 (50%): 2,500 tCO2e [click to expand]
│  ├─ Building electricity: 2,200 tCO2e
│  └─ Purchased steam: 300 tCO2e
└─ Scope 3 (30%): 1,500 tCO2e [click to expand]
   ├─ Business travel: 600 tCO2e
   ├─ Employee commuting: 450 tCO2e
   ├─ Purchased goods: 300 tCO2e
   └─ Waste disposal: 150 tCO2e

```

Hover tooltips show: emission value, percentage of scope, percentage of total, comparison to benchmark ("35% above sector average"), data quality score, emission factor source, and "What drives this?" explanation.

**(B) Temporal trend animation**: Time-series showing emissions trajectory with OWID benchmark overlay:

- Animated line chart showing organizational emissions by year (2019-2024)
- Overlay showing OWID national sectoral average trajectory
- Playback controls enabling year-by-year progression
- Annotation markers flagging major interventions ("Solar installation 2021", "Electric vehicle fleet 2023")
- Scenario projections showing "business as usual" versus "planned interventions" versus "Paris-aligned pathway"

**(C) Comparative benchmarking matrix**: Scatter plot positioning organization against peers using OWID data:

- X-axis: Emission intensity (tCO2e per revenue, per student, per employee—unit varies by sector)
- Y-axis: Absolute emissions (tCO2e)
- Bubble size: Organization size (revenue, enrollment, headcount)
- Color: Geographic region or sub-sector
- Hover: Organization name, specific metrics, percentile ranking
- Reference lines: Sector median, sector top quartile, Paris-aligned pathway

This visualization enables rapid identification: "We're high-intensity despite small size" or "We're average intensity but large scale creates big absolute impact."

### Design Principle 4: Progressive Disclosure Serving Mixed Audiences (Synthesis)

**Combined lesson**: Both platforms serve specialist audiences—OWID for researchers [13], Albert for production professionals [19]—excluding general audiences. Carbon ACX must serve novices through experts within single interface.

**Implementation architecture**:

**(A) Three interface complexity levels with seamless transitions**:

**Level 1: Guided Wizard (Novices)**

- Natural language questions: "What type of organization are you analyzing?"
- Preset templates: "Select: School / Office / Store / Restaurant / Factory / Other"
- Automated defaults: Emission factors pre-selected based on organization location and type
- Minimal technical terminology: "Energy use" instead of "Scope 2 purchased electricity"
- Progress indication: "Step 3 of 8: Enter transportation data"

**Level 2: Structured Form (Intermediate)**

- Category-organized data entry: Scope 1 / Scope 2 / Scope 3 sections with explanatory headers
- Emission factor selection dropdowns: Multiple options with guidance ("DEFRA recommended for UK operations")
- Data quality indicators: Users rate data quality (measured/estimated/calculated) affecting uncertainty
- Inline help: Expandable "What is this?" explanations without leaving form
- Validation feedback: Real-time warnings for unusual values ("This electricity consumption is 3× typical for organization size—verify")

**Level 3: Advanced API (Experts)**

- Direct CSV upload: Bulk import of activity data in standardized schema
- Custom emission factor library: Users upload organization-specific factors (supplier EPDs, LCA databases, proprietary research)
- Programmatic access: REST API accepting JSON requests, returning calculation results with full provenance
- Calculation engine exposure: Direct access to Python calculation functions for integration with organizational systems
- Version pinning: API endpoints supporting methodology version specification for reproducibility

**Transition mechanism**: Interface adapts based on user behavior—clicking "Show advanced options" expands current level revealing additional controls, "Customize" buttons enable factor selection overrides, "API documentation" links appear after multiple calculations suggesting power users may benefit from automation.

**(B) Contextual help system**:

- Tooltip explanations: Hover over terms reveals definitions ("Scope 2: Emissions from purchased electricity, steam, heating, and cooling")
- Video tutorials: Embedded 2-3 minute screencasts demonstrating common tasks
- Example datasets: Pre-loaded organizational footprints users can explore ("See how we calculated this school district's emissions")
- FAQ integration: Common questions answered inline ("Why isn't my employee commuting in Scope 1?")
- Methodology library: Detailed technical documentation for users wanting deep understanding

### Design Principle 5: Quality Assurance Without Gatekeeping (from Albert)

**Albert lesson**: Evidence-based verification with random action selection, photographic documentation requirements, and 10-day audit review ensures data quality preventing greenwashing [20]. However, professional sustainability coordinator requirements and mandatory certification workflow create accessibility barriers.

**Carbon ACX adaptation**: Implement validation without gatekeeping:

**(A) Automated validation rules (no human review required)**:

- Range checking: Flag values outside typical ranges for organization type/size ("Electricity consumption 500 kWh/m²/year exceeds typical office range 100-300 kWh/m²/year—verify data")
- Temporal consistency: Compare current period against previous periods ("40% increase from last quarter—confirm not data entry error")
- Cross-category consistency: Check logical relationships ("Scope 2 electricity very high but Scope 1 fuel very low—is heating electrified or data missing?")
- Benchmark comparison: Flag outliers versus OWID sector averages ("Your emission intensity 3× sector median—verify categorization and data completeness")
- Uncertainty quantification: Calculate confidence intervals from data quality scores ("Based on 60% estimated data, your footprint is 4,200-5,800 tCO2e with 90% confidence")

Validation occurs automatically during calculation, providing immediate feedback without review delays.

**(B) Peer review option (community verification)**:

- Organizations can optionally publish calculations for community review (methodology, data sources, assumptions visible)
- Other Carbon ACX users can comment, suggest improvements, flag concerns
- Original submitter can respond, update calculation, or accept peer validation
- Verified badge for calculations receiving peer confirmation from multiple reviewers
- Reputation system incentivizing quality reviews (reviewers gain credibility scores)

This distributed verification scales without centralized gatekeeping—community provides quality assurance through transparent peer review rather than authority-based certification.

**(C) Professional assurance integration**:

For organizations requiring formal third-party verification (regulatory compliance, investor requirements), Carbon ACX enables:

- Export package containing: activity data with sources, emission factors with citations, calculation methodology, validation results, uncertainty analysis
- Standardized format accepted by ISO 14064-3 accredited verifiers
- Assurance provider upload section: Verifiers can attach verification statements, limited assurance reports, or reasonable assurance opinions
- Verification badge display: Organizations with professional assurance display verifier logo and statement date

This approach provides assurance pathway for organizations requiring it without making verification mandatory barrier for civic users.

## Implementation Pathways

### University Curriculum Integration

**Target**: Undergraduate environmental science, graduate sustainability programs, community college vocational training, and MBA sustainability concentrations seeking hands-on carbon accounting instruction.

**Value proposition**: Free accessible platform teaching GHG Protocol methodology through applied organizational case studies, eliminating need for expensive enterprise software licenses or static textbook problems.

**Implementation model**:

1. **Curriculum module development**: Create structured learning sequences with progressive complexity (Week 1: Scope definitions, Week 2: Emission factor application, Week 3: Organizational boundaries, Week 4: Data quality assessment, Week 5: Reduction scenario modeling)
2. **Assessment integration**: Provide instructor dashboard showing student calculation submissions, methodology choices, and interpretation quality enabling graded assignments
3. **Example dataset library**: Curate diverse organizational types representing different sectors, sizes, and geographic contexts for comparative analysis assignments
4. **Academic publication support**: Enable students to export methodology documentation and calculation results formatted for undergraduate research papers or graduate theses
5. **Faculty training workshops**: Offer professional development sessions teaching instructors how to integrate Carbon ACX into existing courses

**Success metrics**: Number of universities adopting platform, student enrollment in courses using Carbon ACX, instructor satisfaction ratings, student learning outcome improvements (pre/post testing on GHG Protocol knowledge).

### Community Foundation Partnerships

**Target**: Local and regional foundations supporting climate action, civic engagement, environmental justice, and community development seeking to fund climate literacy infrastructure.

**Value proposition**: Platform enables foundation grantees (community organizations, grassroots coalitions, neighborhood groups) to conduct organizational carbon accounting supporting local climate action planning without requiring expensive consultants.

**Implementation model**:

1. **Foundation-sponsored accounts**: Foundations provide branded Carbon ACX access to grantees with technical support, training workshops, and calculation coaching
2. **Grantee cohort programs**: Foundations convene cohorts of grantees calculating organizational footprints simultaneously, facilitating peer learning and comparative analysis
3. **Impact measurement integration**: Foundations use Carbon ACX to track portfolio-level emissions reductions across grantees, demonstrating climate impact of community development investments
4. **Public reporting**: Foundations publish aggregate findings from grantee calculations showing community climate action progress, benchmarks, and priority needs
5. **Technical assistance grants**: Foundations fund community organization staff time for data collection, calculation, and interpretation rather than external consultant fees

**Success metrics**: Number of foundation partnerships, grantee organizations using platform, documented policy changes resulting from community calculations (municipal resolutions, school board decisions, etc.).

### Open-Source Extension Framework

**Target**: Domain specialists (researchers, consultants, industry associations) wanting to contribute specialized emission factor libraries, calculation methodologies, or organizational type templates to Carbon ACX ecosystem.

**Value proposition**: Open-source architecture enables community contributions expanding platform capabilities without core development team resources, while maintaining methodology transparency and quality standards.

**Implementation model**:

1. **Plugin architecture**: Design extension system where contributors package emission factor libraries, calculation modules, or organizational templates as plugins installable by users
2. **Contribution guidelines**: Publish standards for extensions including metadata requirements (factor sources, data quality, geographic scope, update frequency), testing protocols, and documentation expectations
3. **Extension marketplace**: Curate contributed extensions with quality ratings, user reviews, download counts, and active maintenance indicators
4. **Integration with licensed databases**: Enable users possessing ecoinvent, GaBi, or other commercial database licenses to integrate their legally-obtained factors into Carbon ACX via plugins (users responsible for licensing compliance)
5. **Academic collaboration**: Partner with university research groups contributing specialized methodologies (agricultural emissions, industrial processes, refrigerant management) as validated extensions

**Success metrics**: Number of contributed extensions, diversity of emission factor coverage, user adoption of extensions, academic papers using Carbon ACX with community-contributed methodologies.

### Progressive Disclosure Interface Prototyping

**Target**: Diverse user segments requiring different interface complexity levels within single platform experience.

**Value proposition**: Adaptive interface serving both novice community activists and technically sophisticated researchers eliminates need for separate platforms, enabling users to grow expertise while staying within familiar Carbon ACX environment.

**Implementation model**:

1. **User experience research**: Conduct usability testing with representative users from each target segment (community organizers, students, journalists, educators) identifying optimal complexity levels
2. **Interface personalization**: Develop adaptive interface adjusting based on user behavior (feature discovery, calculation count, advanced feature usage, API access)
3. **Learning pathway design**: Create structured progression from guided wizard through structured form to API access with achievements, skill badges, and next-step recommendations
4. **Accessibility compliance**: Ensure WCAG 2.1 AA compliance for users with disabilities, supporting screen readers, keyboard navigation, color-blind friendly palettes, and readable typography
5. **Multi-language support**: Prioritize interface translation to Spanish, Mandarin, French, Arabic reflecting global user base and climate justice priorities

**Success metrics**: User retention across experience levels, progression rates from novice to advanced features, accessibility audit scores, user satisfaction by segment.

## Conclusions and Strategic Implications

Analysis of Our World in Data's macro research platform and Albert's professional industry calculator reveals systematic gap in carbon accounting accessibility for civic engagement. OWID provides authoritative national emissions data serving researchers, journalists, and policymakers but operates at abstraction levels preventing organizational understanding—citizens cannot calculate school district footprints or workplace emissions using country-level gigatonne aggregates. Albert delivers production-specific accounting with methodological sophistication and certification rigor but gatekeeps access behind broadcaster relationships and professional credentials—community activists, students, and citizens lack platform entry points despite relevance to their accountability needs.

The democratic climate data deficit manifests as five underserved user segments: community accountability organizations calculating local institutional emissions for public oversight; student climate campaigns analyzing university footprints for evidence-based advocacy; labor unions understanding workplace emissions for collective bargaining; local journalists investigating corporate climate claims through independent verification; and civic educators teaching carbon accounting methodology via hands-on organizational analysis. These segments share characteristics distinguishing them from existing platform audiences: they lack professional sustainability credentials, cannot afford enterprise software subscriptions, require methodology transparency for stakeholder consensus-building, need systemic contextualization preventing consumer guilt framings, and seek civic empowerment rather than regulatory compliance.

Carbon ACX's opportunity space exists as civic climate literacy infrastructure positioned between individual calculators (which assign guilt without systemic context) and enterprise platforms (which remain inaccessible to voting populations). Viability derives from differentiated value proposition: not comprehensive emission factor coverage (where enterprise platforms excel and OWID supplements) but pedagogical design enabling methodology transparency, systemic contextualization via OWID data integration, and organizational calculation accessibility without professional gatekeeping. Technical requirements include zero-cost zero-credential access, progressive disclosure serving mixed expertise, pedagogical transparency in calculation logic, contextual integration of macro data, and multi-format knowledge outputs.

Pedagogical framework must teach systemic contextualization avoiding consumer guilt—implementing structural attribution identifying emissions drivers external to individual control, collective action framing suggesting group coordination interventions, leverage point identification showing realistic agency spheres, temporal contextualization distinguishing passive from active reductions, and equity-informed interpretation preventing blame allocation to populations with limited alternatives. This approach addresses research-documented barriers: attribution failures where individuals struggle connecting global problems to local organizations, efficacy gaps where people doubt action impact, and knowledge-to-action failures where concern doesn't translate to evidence-based intervention.

Strategic implementation pathways include university curriculum integration providing free accessible platform teaching GHG Protocol methodology eliminating enterprise software barriers, community foundation partnerships enabling grantee organizational accounting without consultant fees, open-source extension framework allowing domain specialists to contribute specialized factor libraries, and progressive disclosure interface prototyping serving novice through expert users within adaptive architecture. Success metrics span user adoption across target segments, documented policy changes from community calculations, academic curriculum integration rates, and learning outcome improvements.

The synthesis of OWID and Albert learnings establishes Carbon ACX design principles: methodology transparency as core feature adapting OWID's open-source ETL and GitHub-hosted provenance; production-specific categories where appropriate borrowing Albert's domain-optimized templates while maintaining GHG Protocol structure; interactive visualization for exploration implementing OWID's Plotly dashboards with drill-down, filtering, and comparative overlays; progressive disclosure serving mixed audiences through three-level interface complexity with seamless transitions; and quality assurance without gatekeeping using automated validation plus optional peer review rather than mandatory professional certification.

Carbon ACX addresses legitimate climate literacy gap neither existing platform serves. The mission—making carbon accounting as accessible as OWID's visualizations, enabling ordinary citizens to understand organizational footprints with systemic context, supporting evidence-based civic engagement in climate action—represents defensible positioning with technical feasibility, pedagogical framework, and user need validation. Implementation risks include audience size uncertainty (requiring user research confirming demand), pedagogical execution challenge (balancing simplification with learning integrity), systemic framing effectiveness (avoiding paralysis through actionable systems thinking), and sustainability model dependence on philanthropic funding. However, the opportunity space exists, differentiation is clear, and societal need is genuine. Democratic climate literacy remains prerequisite for effective climate governance—Carbon ACX can provide infrastructure making that literacy accessible.

## References

[1] Our World in Data, "CO₂ and Greenhouse Gas Emissions," 2024. [Online]. Available: https://ourworldindata.org/co2-and-greenhouse-gas-emissions

[2] BAFTA albert, "About albert," 2025. [Online]. Available: https://wearealbert.org/about/

[3] Global Carbon Project, "Global Carbon Budget 2024 Data," Zenodo, 2024. [Online]. Available: https://doi.org/10.5281/zenodo.13981696

[4] M. W. Jones et al., "National contributions to climate change dataset version 2024.2," Zenodo, 2024. [Online]. Available: https://doi.org/10.5281/zenodo.14054503

[5] Climate Watch, "Historical GHG Emissions," World Resources Institute, 2024. [Online]. Available: https://www.climatewatchdata.org/

[6] Our World in Data, "ETL Documentation," 2024. [Online]. Available: https://docs.owid.io/projects/etl/

[7] Our World in Data, "CO2 Data Explorer," 2024. [Online]. Available: https://ourworldindata.org/explorers/co2

[8] Our World in Data, "CO2 emissions articles," 2024. [Online]. Available: https://ourworldindata.org/co2-emissions

[9] Our World in Data, "Information architecture," 2024. [Online]. Available: https://ourworldindata.org/about

[10] P. Friedlingstein et al., "Global Carbon Budget 2024," *Earth System Science Data*, vol. 16, 2024. [Online]. Available: https://doi.org/10.5194/essd-2024-519

[11] Our World in Data, "CO₂ and Greenhouse Gas Emissions - Data Sources," 2024. [Online]. Available: https://ourworldindata.org/co2-dataset-sources

[12] Our World in Data, "Data update log," GitHub, 2024. [Online]. Available: https://github.com/owid/co2-data/commits/master

[13] Our World in Data, "About Our World in Data," 2024. [Online]. Available: https://ourworldindata.org/about

[14] Our World in Data, "Teaching Hub," 2024. [Online]. Available: https://ourworldindata.org/teaching

[15] BAFTA albert, "albert Carbon Calculator Methodology Paper," Feb. 2025. [Online]. Available: https://wearealbert.org/wp-content/uploads/2025/02/albert-Carbon-Calculator-Methodology-paper-2025.pdf

[16] BAFTA albert, "Carbon Factors - What are they and why do they matter?," Oct. 2022. [Online]. Available: https://wearealbert.org/2022/10/06/carbon-factors-what-are-they-and-why-do-they-matter/

[17] BAFTA albert, "albert Carbon Calculator Quick Start Guide," 2021. [Online]. Available: https://wearealbert.org/wp-content/uploads/2021/05/calculator-quick-start-guide-2021-compressed-compressed-1.pdf

[18] BAFTA albert, "Getting Started with the albert Toolkit," Feb. 2021. [Online]. Available: https://wearealbert.org/2021/02/10/getting-started-with-the-albert-toolkit/

[19] Channel 4, "Albert Certification Guide 2025," Jan. 2025. [Online]. Available: https://assets-corporate.channel4.com/_flysystem/s3/documents/2025-01/Channel%204%20albert%20Certification%20Guide%202025_0.pdf

[20] On Tourne Vert, "Albert Calculator User Guide," 2024. [Online]. Available: https://ontournevert.com/en/albert-calculator-guide/

[21] BAFTA albert, "Spotlight on ITV Creative," Jun. 2019. [Online]. Available: https://wearealbert.org/2019/06/13/spotlight-on-itv-creative/

[22] BAFTA albert, "A Global Carbon Calculator is coming!," Jan. 2020. [Online]. Available: https://wearealbert.org/2020/01/24/a-global-carbon-calculator-is-coming/

[23] BAFTA albert, "Annual Sustainability Report 2021," 2021. [Online]. Available: https://wearealbert.org/wp-content/uploads/2022/01/albert-Annual-Report-2021.pdf

[24] U.S. EPA, "Household Carbon Footprint Calculator," 2024. [Online]. Available: https://www3.epa.gov/carbon-footprint-calculator/

[25] UC Berkeley CoolClimate Network, "CoolClimate Calculator," 2024. [Online]. Available: https://coolclimate.berkeley.edu/calculator

[26] Watershed, "Climate Platform Features," 2024. [Online]. Available: https://watershed.com/platform

[27] Persefoni, "AI-Powered Carbon Management," 2024. [Online]. Available: https://persefoni.com/platform

[28] Sustainable Production Alliance, "Green Production Guide," 2024. [Online]. Available: https://www.greenproductionguide.com/

[29] E. Maibach, C. Roser-Renouf, and A. Leiserowitz, "Global Warming's Six Americas 2009: An Audience Segmentation Analysis," George Mason University Center for Climate Change Communication, 2009. [Online]. Available: https://climatecommunication.yale.edu/publications/global-warmings-six-americas-2009/

[30] J. Swim et al., "Psychology and Global Climate Change: Addressing a Multi-faceted Phenomenon and Set of Challenges," American Psychological Association, 2011. [Online]. Available: https://www.apa.org/science/about/publications/climate-change

[31] I. Lorenzoni, S. Nicholson-Cole, and L. Whitmarsh, "Barriers perceived to engaging with climate change among the UK public and their policy implications," *Global Environmental Change*, vol. 17, no. 3-4, pp. 445-459, 2007. [Online]. Available: https://doi.org/10.1016/j.gloenvcha.2007.01.004

[32] U.S. EPA, "What You Can Do to Reduce Emissions," 2024. [Online]. Available: https://www.epa.gov/ghgemissions/what-you-can-do

[33] UC Berkeley CoolClimate Network, "Take Action," 2024. [Online]. Available: https://coolclimate.berkeley.edu/take-action

[34] Our World in Data, "Emissions by sector," 2024. [Online]. Available: https://ourworldindata.org/emissions-by-sector

[35] E. Shove, "Beyond the ABC: climate change policy and theories of social change," *Environment and Planning A*, vol. 42, no. 6, pp. 1273-1285, 2010. [Online]. Available: https://doi.org/10.1068/a42282