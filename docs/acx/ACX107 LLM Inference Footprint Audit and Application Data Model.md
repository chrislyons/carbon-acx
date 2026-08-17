# ACX107 LLM Inference Footprint Audit and Application Data Model

**Status:** Complete — independent review and application decision recorded  
**Date:** 2026-08-17  
**Branch:** `audit/dataflow-integrity`  
**Scope:** Operational and life-cycle footprint claims for text LLM inference, image generation, and video generation; current Carbon ACX records and web-calculator data flow.

---

## Executive decision

The published claim **“~280 gCO₂e per 1k GPT tokens” is not defensible as written and must be quarantined from the product data model.** The cited source does not establish that provider-specific value, the unit is not tied to a measured workload, and the value is inconsistent with the independently reviewed energy evidence by several orders of magnitude under ordinary grid-intensity conversions.

Do not replace it with one new universal token number. A credible application model must preserve the workload and boundary that generated each estimate:

- **Provider disclosures are prompt-level observations, not token emission factors.** A June 2025 personal blog post by OpenAI CEO Sam Altman reports an average ChatGPT query of about 0.34 Wh; Google reports a median Gemini Apps text prompt of 0.24 Wh and 0.03 gCO₂e total, comprising 0.023 g Scope 2 market-based emissions plus 0.010 g Scope 1 and 3 emissions. Neither disclosure supplies a token-normalized, model-independent factor [1], [2].
- **Model and generation mode matter.** A 2025 infrastructure-aware benchmark estimates mean energy for medium prompts (1k input + 1k output tokens) from 0.271 Wh for GPT-4.1 nano to 29.000 Wh for DeepSeek-R1; it estimates 5.683 Wh for Claude 3.7 Sonnet extended thinking versus 2.781 Wh for ordinary Claude 3.7 Sonnet [3]. The estimates infer deployment hardware and are not provider telemetry, but demonstrate why a provider-level factor is not appropriate.
- **Modality must be a separate dimension.** A measured open-model study reports mean energy of 0.047 Wh per short text-generation inference and 2.907 Wh per image-generation inference. A separate video study reports 90.5 Wh for its default WAN2.1-T2V-1.3B configuration (720 × 1280, 81 frames at 15 FPS, 50 denoising steps) and finds quadratic scaling with spatial and temporal dimensions and linear scaling with denoising steps [4], [6]. Video is not a tokenized text workload.
- **Boundary and accounting method must be explicit.** Google’s 0.24 Wh Gemini result is a comprehensive serving measure including active accelerators, host CPU/DRAM, provisioned idle capacity, and data-centre overhead; its 0.03 gCO₂e total also includes Scope 1 and 3 components. Mistral’s 1.14 gCO₂e for a 400-token Le Chat response is a lifecycle estimate that includes upstream emissions and excludes users’ terminals. Those numbers are not interchangeable [2], [5].

**Application decision:** represent AI records as source-backed **scenarios**, keyed by an immutable `scenarioId`, with modality, provider, service and model identity, generation mode, workload, functional unit, energy boundary, carbon accounting, vintage, and uncertainty. A calculator selection must resolve a scenario, not merely an activity. Do not expose a naked `1k_tokens` factor when the source measured a prompt, a fixed response, or another modality. Until a scenario has evidence at that granularity, retain it as research and mark it `unavailable` or `estimate`; never present it as a precise provider factor.

This audit commit records the finding and the required application contract. It intentionally does **not** silently substitute a new production factor: changing the value without first choosing a boundary and functional unit would repeat the audited error.

## 1. What was audited

### 1.1 Current records

The following records were present in the working tree at audit time:

| Layer | Record | Current value or behavior | Audit finding |
|---|---|---:|---|
| Activity source | `data/activities.csv` → `AI.USAGE.GPT.QUERY` | Unit `1k_tokens`; combined prompt + completion tokens | The activity has no provider/model identity, input/output vector, serving mode, or normalized boundary and carbon-accounting metadata. |
| Factor source | `data/emission_factors.csv` → `EF.LLM.GPT.TOKENK` | 280 gCO₂e/1k tokens; range 200–400 | Cites `SRC.LUCCIONI.2023`, whose registry citation and registered URL identify different works; neither establishes GPT API inference [9]. No reproducible token workload is recorded. |
| Factor source | `EF.LLM.ANTHROPIC.TOKENK` | 250 gCO₂e/1k tokens; range 180–350 | Uses the same unusable source record; no Anthropic model or workload is named. |
| Factor source | `EF.LLM.GOOGLE.TOKENK` | 200 gCO₂e/1k tokens; range 150–300 | Cites `SRC.PATTERSON.2022`, whose registered URL resolves to a 2021 model-training preprint, while its method note invokes `SRC.LUCCIONI.2023`; neither supports Gemini inference [10]. It also conflicts with Google’s later first-party prompt-level disclosure [2]. |
| Generic factor | `EF.ONLINE.AI.LLM.INFER.1K_TOKENS` | 0.003 kWh/1k output tokens, grid-indexed | With the current CA-ON 2025 row at 27 g/kWh, this resolves to 0.081 gCO₂e/1k output tokens. Its distinct token basis, and missing workload and accounting metadata, make it non-comparable with the fixed combined-token provider rows. |
| Generator | `scripts/generate_web_calculator_data.py` | Selects one factor per activity, preferring region and vintage | Selection has no `scenarioId`, provider, model, input/output split, reasoning mode, modality, resolution, frame count, step count, or carbon-accounting selector. |
| Web types | `apps/carbon-acx-web/src/lib/calculator.ts` | `Activity` carries one `emissionFactor` and generic evidence | The schema cannot distinguish a prompt average from a token factor or a lifecycle response estimate. |
| Calculator UI | `apps/carbon-acx-web/src/app/calculator/page.tsx` | Shows one factor per selected activity and accepts an annual quantity | There is no scenario/model/generation selector and no workload-specific evidence display. |
| Generated data | `apps/carbon-acx-web/src/generated/calculator-data.json` and `catalog-data.json` | Calculator payload curates GPT; catalog publishes the generic, image, Anthropic, Google, and GPT AI rows | The product surface can make incompatible AI records appear comparable. |

The generated payload is a consequence of the source records; editing generated JSON alone would not correct the data flow. The source activity, factor, evidence, generator, types, and UI contracts must agree before corrected values are published.

### 1.2 Source-to-claim traceability failure

The GPT and Anthropic fixed provider rows point to `SRC.LUCCIONI.2023`; the Google row points to `SRC.PATTERSON.2022`, although its method note also invokes `SRC.LUCCIONI.2023`. `data/sources.csv` describes `SRC.LUCCIONI.2023` as a Luccioni/Ligozat/Bengio carbon-footprint paper, but its registered URL resolves to Li et al.’s water-footprint paper [9]. That citation/URL mismatch independently invalidates the generated provenance. `SRC.PATTERSON.2022` resolves to a study of large-neural-network training, not Gemini inference [10]. No current provider row cites the reviewed *Power Hungry Processing: Watts Driving the Cost of AI Deployment?* study [4]. That 2024 FAccT paper measured controlled open-model inference on an eight-A100 AWS node; each query used one GPU sequentially without batching and included the idle power of the other GPUs. It reports mean energy of **0.047 kWh per 1,000 text-generation inferences** for a task producing 10 new tokens per input and **2.907 kWh per 1,000 image-generation inferences** (standard deviation 3.31 kWh) [4]. Those results are useful modality and order-of-magnitude evidence; they do not support assigning 200–280 gCO₂e to named commercial providers per 1k tokens.

The existing provider method notes also call the values “cloud” or “carbon-optimized TPU” estimates but do not record:

- a provider/model measurement;
- input and output token counts;
- reasoning or extended-thinking setting;
- batch size, throughput, or latency;
- accelerator type and utilization;
- PUE and idle-capacity treatment;
- location-based versus market-based electricity emissions;
- whether hardware manufacturing is included;
- a source claim locator; or
- a reproducible conversion from energy to grams CO₂e.

That is a provenance break, not merely a wide uncertainty interval. Widening the range around an unsupported point estimate does not repair the missing workload or boundary.

## 2. Independent evidence review

### 2.1 First-party provider disclosures

#### OpenAI

Sam Altman’s June 10, 2025 personal blog post reports that an average ChatGPT query uses about **0.34 Wh** and about **0.000085 gallons of water** [1]. It is an executive/provider statement, not an OpenAI technical disclosure: it provides no model mix, prompt and completion token counts, serving stack, region, PUE, idle-capacity allocation, carbon-intensity basis, or operational/lifecycle boundary. It is useful as a provider-reported prompt-level observation, not as a `gCO₂e/1k_tokens` factor.

#### Google

Elsworth et al. report first-party production instrumentation of Gemini Apps serving at Google scale [2]. For the median Gemini Apps text prompt in May 2025:

- comprehensive serving energy: **0.24 Wh/prompt**;
- active AI accelerators: 0.14 Wh;
- active CPU and DRAM: 0.06 Wh;
- provisioned idle machines: 0.02 Wh;
- data-centre overhead: 0.02 Wh;
- comprehensive emissions: **0.03 gCO₂e/prompt** total (0.023 g Scope 2 market-based plus 0.010 g Scope 1 and 3);
- water consumption: **0.26 mL/prompt**.

The narrower accelerator-only Existing Approach is 0.10 Wh/prompt, sampled from the top 10% most energy-efficient data centres. The comprehensive result includes host, idle capacity, and PUE overhead, and its median is a prompt-distribution statistic rather than a fixed cost for every request. Google reports a 33× energy reduction for the median prompt from May 2024 to May 2025, showing that vintage and serving software are material variables [2].

#### Anthropic

The reviewed Anthropic Claude 3 announcement distinguishes Opus, Sonnet, and Haiku by capability, speed, context, and price, but no per-query energy or carbon metric appears on that page [8]. This limited review does not establish that Anthropic has made no disclosure elsewhere; it establishes that this page cannot support an Anthropic-specific published factor. A provider row should remain unavailable unless a model- and workload-specific source is added.

### 2.2 Independent LLM benchmark

Jegham et al. estimate operational production-style energy by combining public API latency/throughput observations with inferred hardware power, utilization, PUE, and regional environmental multipliers [3]. Scope 3 embodied impacts are excluded. This is not first-party telemetry, so it must be labelled as an estimate. The table lists estimated means; a scenario using this source must retain its source-supplied uncertainty rather than recasting the means as provider factors. It is useful evidence for model and generation variability because it holds three workload shapes constant:

| Workload (estimated mean Wh) | GPT-4.1 | GPT-4.1 nano | o3 | DeepSeek-R1 | Claude 3.7 Sonnet | Claude 3.7 Sonnet ET |
|---|---:|---:|---:|---:|---:|---:|
| 100 input + 300 output tokens | 0.918 Wh | 0.103 Wh | 7.026 Wh | 23.815 Wh | 0.836 Wh | 3.490 Wh |
| 1k input + 1k output tokens | 2.513 Wh | 0.271 Wh | 21.414 Wh | 29.000 Wh | 2.781 Wh | 5.683 Wh |
| 10k input + 1.5k output tokens | 4.233 Wh | 0.454 Wh | 39.223 Wh | 33.634 Wh | 5.518 Wh | 17.045 Wh |

For the medium workload, the source reports standard deviations (Wh) of 1.286 (GPT-4.1), 0.087 (GPT-4.1 nano), 14.273 (o3), 3.069 (DeepSeek-R1), 0.277 (Claude 3.7 Sonnet), and 0.508 (Claude 3.7 Sonnet ET). Multiplying each mean by `1,000 / 2,000` yields an illustrative arithmetic normalization of approximately **0.136 Wh/1k combined tokens** for GPT-4.1 nano, **1.257 Wh/1k** for GPT-4.1, **10.707 Wh/1k** for o3, **14.500 Wh/1k** for DeepSeek-R1, and **1.391 Wh/1k** for ordinary Claude 3.7 Sonnet. These calculations are for comparison only, not product factors: the source estimates operational infrastructure under a fixed workload and carbon/accounting setup. The benchmark scenario itself must remain a `1k_input + 1k_output` request unless a source-supported model justifies a different workload.

The benchmark demonstrates four application requirements:

1. token count alone is not enough; input and output lengths change the result;
2. smaller model names do not guarantee lower energy because deployment hardware and serving efficiency can dominate;
3. reasoning/extended-thinking mode needs its own scenario; and
4. the arithmetic mean and uncertainty range are workload-dependent, not provider constants.

### 2.3 Text versus image

Luccioni et al. measured 88 models over 10 tasks on an eight-NVIDIA-A100-SXM4-80GB AWS node [4]. Each inference used one GPU sequentially without batching, while the idle power of the other GPUs was included. Their mean energy per 1,000 inferences was:

| Task | Mean (SD) energy per 1,000 inferences | Mean per inference |
|---|---:|---:|
| Text generation | 0.047 kWh (0.03 kWh) | 0.047 Wh |
| Image generation | 2.907 kWh (3.31 kWh) | 2.907 Wh |

The study reports large within-task variation and identifies task structure as a stronger driver than parameter count in many comparisons. These are node/device measurements, not full hosted-service energy or lifecycle results. Its text-generation setup generated 10 new tokens, so the result cannot be generalized to a modern long-context chat response. Its image result predates current diffusion architectures and should be treated as a historical benchmark, not a current provider factor.

### 2.4 Video inference

Delavande et al. characterize open text-to-video models on one NVIDIA H100 SXM (80 GB) [6]. GPU and CPU energy are measured through CodeCarbon; RAM energy uses CodeCarbon’s default heuristic. The reported figures are GPU + CPU + RAM device-boundary means, without data-centre PUE, idle-capacity, or lifecycle allocation. Under their default configuration—720 × 1280, 81 frames at 15 FPS, and 50 denoising steps—the mean full-component totals are:

- WAN2.1-T2V-1.3B: 78.8 + 7.4 + 4.3 = **90.5 Wh/video**;
- WAN2.1-T2V-14B: 359.7 + 35.6 + 19.8 = **415.1 Wh/video**.

These are not universal “video prompt” values. The controlled WAN2.1 scaling experiments measure GPU energy only and find:

- approximately quadratic growth in spatial resolution;
- approximately quadratic growth in frame count;
- linear growth in denoising steps; and
- GPU energy above 80% of total in the cross-model runs [6].

A 2026 arXiv preprint extends the framework to proprietary APIs and estimates, rather than directly measures, **Veo 3 at 19.8–43.4 Wh for an 8-second 720p video** and **Sora 2.0 Pro at a mean 1,313 Wh for a 12-second 1080p video** [7]. The proprietary estimates use Fal.ai API latency, assumed hardware and device/node power, and Monte Carlo simulation; they are not provider telemetry and do not add PUE or lifecycle allocation. The reported native-audio runs include audio. They are useful warning signals about closed-model variability, but are not ACX production factors without corroboration.

### 2.5 Life-cycle disclosure

Mistral’s first-party LCA disclosure reports marginal impacts for a **400-token Le Chat response**, excluding users’ terminals [5]:

- 1.14 gCO₂e;
- 45 mL water; and
- 0.16 mg Sb-equivalent resource depletion.

The reported figures include upstream emissions, for example server manufacturing, rather than only operational energy. Mistral calls the study a first approximation and notes that GPU life-cycle inventories are uncertain. This is a workload-specific lifecycle estimate—the cited inference bullet does not identify the serving model—and must not be mixed with Google’s comprehensive serving-emissions total or with a GPU-only Wh benchmark.

## 3. Why the existing 280 g figure fails an arithmetic audit

The current GPT record states 280 gCO₂e per 1k combined tokens. Converting that carbon claim back to implied electricity gives:

| Assumed electricity intensity | Implied electricity for 280 g |
|---:|---:|
| 27 g/kWh (current CA-ON 2025 row) | 10.37 kWh per 1k tokens |
| 135 g/kWh (Google 2023 net market-based factor; hypothetical comparison, not the 2024 factor used for the 2025 prompt result) | 2.07 kWh per 1k tokens |
| 352.8 g/kWh (Jegham et al.’s assumed GPT-4.1 carbon-intensity factor) | 0.794 kWh per 1k tokens |

No workload, model, or boundary in the current record explains such an implied energy demand. The comparison is not a claim that every source must agree: Google’s prompt median, OpenAI’s average query, the independent benchmark, and Mistral’s LCA use different populations and boundaries. It is a unit-and-provenance check showing that **280 g cannot be presented as a measured ordinary 1k-token operational factor without additional evidence**.

There is also an internal unit-and-metadata inconsistency. The generic factor specifies **0.003 kWh per 1k output tokens**; with the current 27 g/kWh CA-ON grid row, that resolves to **0.081 gCO₂e per 1k output tokens**. The fixed GPT, Anthropic, and Google rows instead define 1k as combined prompt and completion tokens, and are 2,469–3,457 times higher than the generic result. That apparent ratio is not like-for-like until token basis, workload, boundary, and accounting method are aligned; the current free-text records do not supply the information needed to do so.

## 4. Defensible ACX calculation contract

### 4.1 Keep energy and carbon separate

For an operational scenario, the primary physical estimate should be energy, with carbon derived only when the electricity basis is known:

```text
operational_gCO2e = energy_Wh / 1000 × grid_intensity_g_per_kWh
```

When a source directly discloses carbon without energy, such as a lifecycle result, retain it as direct source-disclosed carbon; do not invent energy. If the source already reports full-stack energy, do not apply PUE a second time. If the source reports accelerator-only energy, a PUE or serving-overhead multiplier may be applied only when its value, source, and resulting boundary are recorded. If embodied hardware or upstream life-cycle impacts are included, retain them as explicit components or mark the result lifecycle; do not merge them into an operational factor without a declared allocation method.

Every carbon result needs:

- `carbonAccounting.method`: `derived-grid`, `direct-disclosure`, or `lifecycle-assessment`;
- `carbonAccounting.components`: each component’s value, included process, and, where applicable, `location-based` or `market-based` electricity basis;
- `gridIntensityGPerKwh`, grid-region identity, and grid source when carbon is derived;
- `scopeBoundary`, `pueTreatment`, and any PUE value/source;
- `vintageYear` and `retrievedAt`; and
- uncertainty bounds with their source or a documented sensitivity model.

### 4.2 Use workload vectors, not a naked token scalar

A text scenario should retain at least:

```text
scenarioId, activityId,
providerId, serviceId, modelId, modelVersion, modelGeneration, generationMode,
modality, functionalUnit, tokenBasis, workloadProfileId,
inputTokens, outputTokens, reasoningTokens, hiddenReasoningDisclosure,
batchSize, servingContext,
energyWh, energyWhLow, energyWhHigh, scopeBoundary, pueTreatment,
carbonAccounting, serviceRegion, gridRegion, gridVintageYear,
vintageYear, retrievedAt,
sourceRefs[{sourceId, role, locator, retrievedAt}],
uncertainty, publicationStatus
```

`reasoningTokens` may be null when the provider does not expose them, but `hiddenReasoningDisclosure` must say so. `serviceRegion` and `gridRegion` are distinct: provider routing does not identify the electricity system. A provider-average prompt can use `functionalUnit = prompt`, but it must not be relabelled `1k_tokens` unless the source measured or modelled that token workload. Likewise, do not turn a fixed `1k_input + 1k_output` scenario into a generic `1k_combined_tokens` factor unless a documented model supports that conversion.

An image scenario needs a separate functional unit and typed image parameters: width, height, steps, sampler/model family, batch size, and disclosure flags for unavailable parameters. A video scenario needs duration or frame count, width, height, FPS, denoising steps, audio flag, model, hardware/serving boundary, and equivalent disclosure flags. A video clip must never be priced by borrowing a text-token factor.

### 4.3 Represent modes and generations explicitly

At minimum, the application should distinguish:

- ordinary text generation;
- long-context text generation;
- reasoning or extended-thinking generation;
- image generation;
- video generation; and
- multimodal requests when image/audio input materially changes compute.

Model generation is a provenance field, not a cosmetic label. Provider averages such as OpenAI’s 0.34 Wh statement and Google’s 0.24 Wh median can change as routing, models, quantization, batching, and serving software change. The record must preserve the measurement vintage and avoid implying that a 2025 prompt value is timeless.

### 4.4 Application display contract

The calculator’s evidence panel should show, in the same view as the result:

1. provider, service, exact model/version, or `not disclosed`;
2. model generation and generation mode;
3. functional unit and typed workload parameters;
4. energy value and uncertainty, when available;
5. carbon-accounting method, components, and grid/source intensity;
6. operational, comprehensive-serving, or lifecycle boundary and PUE treatment;
7. vintage and retrieval date; and
8. source citation, URL, source role, and claim locator.

The UI must distinguish `published`, `estimate`, and `unavailable`. A record missing a required field may remain in the research catalog, but the calculator must show it as unavailable rather than emit a precise number with a generic “representative” note.

### 4.5 Selection contract

`activityId` classifies a calculator activity; it is not a factor-selection key. The calculator must select an explicit `scenarioId`, or resolve exactly one scenario from a fully specified key covering provider/service, model version/generation, modality, generation mode, functional unit, workload profile, carbon-accounting method, and vintage. It must never choose the “closest” record across those dimensions. When a user workload does not equal a measured scenario, show an eligible labelled estimate only when its model is documented; otherwise return `unavailable`.

## 5. Minimal implementation plan

This is the minimal correct cutover from an activity-level AI factor to a scenario-level AI calculation:

1. **Create a dedicated AI-scenario source dataset and generated schema.** Keep activities as calculator categories, but make `scenarioId` the immutable, source-backed calculation record; do not overload the generic emission-factor row.
2. **Use typed functional units and workload profiles.** `prompt`, `response`, `1k_input + 1k_output`, `image`, and `video_clip` are not interchangeable. A source record may use only the unit and workload it supports.
3. **Quarantine every current published AI record until it is enriched or replaced.** This includes the three fixed provider-token rows, the generic 0.003 kWh row, and `EF.AI.IMAGE.GEN`; none carries the required scenario, workload, normalized boundary, PUE, carbon-accounting, and source-locator metadata. Do not map the generic row to a provider claim.
4. **Create source-specific scenarios only at their measured granularity.** Google’s median Gemini prompt, Altman’s ChatGPT-query statement, Mistral’s 400-token lifecycle estimate, and the independent benchmark must remain distinct scenarios with their distinct evidence quality and boundaries. The independent benchmark is an `estimate`, not provider telemetry.
5. **Render and select scenario metadata in the calculator.** Annual quantity must multiply the selected scenario unit; it must not silently imply that an annual “1k tokens” number is provider-independent.
6. **Add validation gates** that:
   - require a unique `scenarioId` and reject ambiguous selection keys;
   - require a functional unit and modality-specific typed workload fields;
   - reject a provider/model token factor whose source supports only an unqualified prompt average;
   - reject a fixed `gCO₂e/1k_tokens` factor without input/output workload, boundary, and carbon-accounting metadata;
   - reject a video record without duration or frames, resolution, FPS, and step fields;
   - permit grid conversion only for operational energy, preserve direct lifecycle disclosures, and prevent PUE from being applied twice;
   - require ordered uncertainty bounds and evidence references with source role and claim locator; and
   - reject aggregation of operational, comprehensive-serving, or lifecycle totals when components overlap; show separate subtotals unless every component is explicitly non-overlapping and uses a compatible accounting method.
7. **Keep unresolved values unavailable.** Lack of disclosure is evidence of uncertainty, not permission to reuse another provider’s factor.

## 6. Acceptance criteria for the follow-on application change

The data/model change is ready for human review when all of the following are true:

- no published calculator or catalog row contains the current 200–400 g provider-token factors, generic 0.003 kWh token factor, or 350 g image factor without a complete scenario record;
- every published or estimated AI result identifies `scenarioId`, functional unit, modality, provider/service/model status, workload, boundary, PUE treatment, carbon accounting, vintage, retrieval date, and source locator;
- calculator selection resolves exactly one compatible scenario and never falls back across provider, model generation, mode, modality, functional unit, workload, or accounting method;
- a source cannot be used to claim both a prompt average and a token factor without a documented conversion;
- model/generation choices alter the selected scenario rather than merely explanatory text;
- video calculations use typed video parameters and never a text-token conversion;
- source and generated payload hashes remain aligned through the existing dataflow release checks; and
- tests cover scenario selection, unit conversion, scope separation, missing metadata, estimate/unavailable display, and long-context, reasoning, image, and video boundary cases.

## 7. Human review and release gate

This document is an AI-assisted independent review and requires human review before any factor is changed or marked publishable. In particular, human approval is required for:

- selecting a production baseline from competing operational and life-cycle sources;
- deciding whether the calculator defaults to location-based or market-based carbon;
- approving any regional adaptation of a provider’s global prompt disclosure;
- adding new provider/model sources to the registry; and
- publishing estimates for closed video systems.

No secrets or production data were used. This document adds no dependency and no binary artifact.

## 8. Source list

### External sources

[1] S. Altman, “The Gentle Singularity,” personal blog post, June 10, 2025. OpenAI CEO statement of approximately 0.34 Wh per average ChatGPT query; not a technical methodology disclosure. Available: [https://blog.samaltman.com/the-gentle-singularity](https://blog.samaltman.com/the-gentle-singularity). Accessed: 2026-08-17.

[2] C. Elsworth, K. Huang, D. Patterson, I. Schneider, R. Sedivy, S. Goodman, B. Townsend, P. Ranganathan, J. Dean, A. Vahdat, B. Gomes, and J. Manyika, “Measuring the environmental impact of delivering AI at Google Scale,” arXiv:2508.15734v1, August 21, 2025. Available: [https://arxiv.org/html/2508.15734v1](https://arxiv.org/html/2508.15734v1). Accessed: 2026-08-17.

[3] N. Jegham, M. Abdelatti, L. Elmoubarki, and A. Hendawi, “How Hungry is AI? Benchmarking Energy, Water, and Carbon Footprint of LLM Inference,” arXiv:2505.09598v1, May 14, 2025. Available: [https://arxiv.org/html/2505.09598v1](https://arxiv.org/html/2505.09598v1). Accessed: 2026-08-17.

[4] A. S. Luccioni, Y. Jernite, and E. Strubell, “Power Hungry Processing: Watts Driving the Cost of AI Deployment?,” *ACM Conference on Fairness, Accountability, and Transparency (FAccT ’24)*, 2024, arXiv:2311.16863v3, October 15, 2024. DOI: 10.1145/3630106.3658542. Available: [https://arxiv.org/html/2311.16863](https://arxiv.org/html/2311.16863). Accessed: 2026-08-17.

[5] Mistral AI, “Our contribution to a global environmental standard for AI,” July 22, 2025. Available: [https://mistral.ai/news/our-contribution-to-a-global-environmental-standard-for-ai/](https://mistral.ai/news/our-contribution-to-a-global-environmental-standard-for-ai/). Accessed: 2026-08-17.

[6] J. Delavande, R. Pierrard, and S. Luccioni, “Video Killed the Energy Budget: Characterizing the Latency and Power Regimes of Open Text-to-Video Models,” arXiv:2509.19222v1, September 23, 2025. Available: [https://arxiv.org/html/2509.19222](https://arxiv.org/html/2509.19222). Accessed: 2026-08-17.

[7] N. Jegham, B. Gamazaychikov, and S. Luccioni, “Lights, Camera, Carbon: Architectural Scaling Laws for Video Generation Energy Consumption,” arXiv:2607.04553v1, July 5, 2026. ArXiv preprint; proprietary API values are latency-based estimates rather than direct measurement. Available: [https://arxiv.org/html/2607.04553v1](https://arxiv.org/html/2607.04553v1). Accessed: 2026-08-17.

[8] Anthropic, “Introducing the next generation of Claude,” March 4, 2024. Model-family information reviewed for provider/model distinctions; the page contains no per-query energy factor. Available: [https://www.anthropic.com/news/claude-3-family](https://www.anthropic.com/news/claude-3-family). Accessed: 2026-08-17.

[9] P. Li, J. Yang, M. A. Islam, and S. Ren, “Making AI Less ‘Thirsty’: Uncovering and Addressing the Secret Water Footprint of AI Models,” arXiv:2304.03271, April 6, 2023. This is the work resolved by the current `SRC.LUCCIONI.2023` URL, despite that source record’s conflicting citation text. Available: [https://arxiv.org/abs/2304.03271](https://arxiv.org/abs/2304.03271). Accessed: 2026-08-17.

[10] D. Patterson, J. Gonzalez, Q. Le, C. Liang, L.-M. Munguia, D. Rothchild, D. So, M. Texier, and J. Dean, “Carbon Emissions and Large Neural Network Training,” arXiv:2104.10350, 2021. This is the work resolved by the current `SRC.PATTERSON.2022` URL. Available: [https://arxiv.org/abs/2104.10350](https://arxiv.org/abs/2104.10350). Accessed: 2026-08-17.

### Internal records reviewed

- `data/activities.csv` — AI activity units and descriptions.
- `data/emission_factors.csv` — `EF.LLM.GPT.TOKENK`, `EF.LLM.ANTHROPIC.TOKENK`, `EF.LLM.GOOGLE.TOKENK`, `EF.ONLINE.AI.LLM.INFER.1K_TOKENS`, and `EF.AI.IMAGE.GEN`.
- `data/grid_intensity.csv` — current CA-ON 2025 operational intensity row.
- `data/sources.csv` — source-identifier, citation-text, and URL mappings for the AI rows.
- `scripts/generate_web_calculator_data.py` — factor selection and evidence generation.
- `apps/carbon-acx-web/src/lib/calculator.ts` — generated activity/evidence types.
- `apps/carbon-acx-web/src/app/calculator/page.tsx` — factor display and annual quantity UI.
- `apps/carbon-acx-web/src/generated/calculator-data.json` and `catalog-data.json` — generated calculator and catalog payloads.
