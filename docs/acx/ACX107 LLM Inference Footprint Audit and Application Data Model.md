# ACX107 LLM Inference Footprint Audit and Application Data Model

**Status:** Complete — independent review and application decision recorded  
**Date:** 2026-08-17  
**Branch:** `audit/dataflow-integrity`  
**Scope:** Operational and life-cycle footprint claims for text LLM inference, image generation, and video generation; current Carbon ACX records and web-calculator data flow.

---

## Executive decision

The published claim **“~280 gCO₂e per 1k GPT tokens” is not defensible as written and must be quarantined from the product data model.** The cited source does not establish that provider-specific value, the unit is not tied to a measured workload, and the value is inconsistent with the independently reviewed energy evidence by several orders of magnitude under ordinary grid-intensity conversions.

Do not replace it with one new universal token number. A credible application model must preserve the workload and boundary that generated each estimate:

- **Provider averages are prompt-level observations, not token emission factors.** OpenAI reports an average ChatGPT query of about 0.34 Wh, while Google reports a median Gemini Apps text prompt of 0.24 Wh and 0.03 gCO₂e. Neither disclosure supplies a token-normalized, model-independent factor [1], [2].
- **Model and generation mode matter.** A 2025 infrastructure-aware benchmark reports medium prompts (1k input + 1k output tokens) ranging from 0.271 Wh for GPT-4.1 nano to 29.000 Wh for DeepSeek-R1; the same study reports 5.683 Wh for Claude 3.7 Sonnet extended thinking versus 2.781 Wh for the ordinary Claude 3.7 Sonnet scenario [3]. These are estimates with inferred deployment hardware, not provider telemetry, but they demonstrate why one provider-level factor is not appropriate.
- **Modality must be a separate dimension.** A measured open-model study reports mean energy of 0.047 Wh per short text-generation inference, 2.907 Wh per image-generation inference, and roughly 90.5 Wh for the tested WAN2.1-T2V-1.3B video configuration. The video study finds quadratic scaling with spatial and temporal dimensions and linear scaling with denoising steps [4], [6]. Video is not a tokenized text workload.
- **Boundary and accounting basis must be explicit.** Google’s 0.24 Wh Gemini figure is a comprehensive serving measure including active accelerators, host CPU/DRAM, provisioned idle capacity, and data-centre overhead. Mistral’s 1.14 gCO₂e for a 400-token Le Chat response is a life-cycle disclosure that includes upstream server impacts and excludes the user terminal. Those numbers are not interchangeable [2], [5].

**Application decision:** represent AI records as source-backed **scenarios** with a modality, provider, model, generation mode, workload, functional unit, energy boundary, carbon basis, vintage, and uncertainty. Do not expose a naked `1k_tokens` factor when the source measured a prompt, a fixed response, or a different modality. Until a scenario has evidence at that granularity, publish it as unavailable or as a clearly labelled estimate rather than presenting a precise provider factor.

This audit commit records the finding and the required application contract. It intentionally does **not** silently substitute a new production factor: changing the value without first choosing a boundary and functional unit would repeat the audited error.

## 1. What was audited

### 1.1 Current records

The following records were present in the working tree at audit time:

| Layer | Record | Current value or behavior | Audit finding |
|---|---|---:|---|
| Activity source | `data/activities.csv` → `AI.USAGE.GPT.QUERY` | Unit `1k_tokens`; combined prompt + completion tokens | The activity presents a token unit without documenting a model, token split, serving mode, or measurement boundary. |
| Factor source | `data/emission_factors.csv` → `EF.LLM.GPT.TOKENK` | 280 gCO₂e/1k tokens; range 200–400 | Provider/model-specific number is attributed to `SRC.LUCCIONI.2023`, which does not measure GPT API inference. No reproducible token workload is recorded. |
| Factor source | `EF.LLM.ANTHROPIC.TOKENK` | 250 gCO₂e/1k tokens; range 180–350 | Same unsupported provider-to-source mapping; no Anthropic model or workload is named. |
| Factor source | `EF.LLM.GOOGLE.TOKENK` | 200 gCO₂e/1k tokens; range 150–300 | Same unsupported provider-to-source mapping; conflicts with Google’s later first-party prompt-level disclosure [2]. |
| Generic factor | `EF.ONLINE.AI.LLM.INFER.1K_TOKENS` | 0.003 kWh/1k tokens, grid-indexed | With the current CA-ON 2025 row at 27 g/kWh, this resolves to 0.081 gCO₂e/1k tokens. It is internally incompatible with the fixed 200–280 g provider rows unless they represent entirely different, undocumented boundaries. |
| Generator | `scripts/generate_web_calculator_data.py` | Selects one factor per activity, preferring region and vintage | The selection contract has no provider, model, input/output split, reasoning mode, modality, resolution, frame count, or step count. |
| Web types | `apps/carbon-acx-web/src/lib/calculator.ts` | `Activity` carries one `emissionFactor` and generic evidence | The schema cannot distinguish a prompt average from a token factor or a life-cycle response factor. |
| Calculator UI | `apps/carbon-acx-web/src/app/calculator/page.tsx` | Shows one factor per selected activity and accepts an annual quantity | There is no scenario/model/generation selector and no workload-specific evidence display. |
| Generated data | `apps/carbon-acx-web/src/generated/calculator-data.json` and `catalog-data.json` | Calculator payload currently curates GPT; catalog carries the Anthropic and Google rows | The product surface can make the provider rows look comparable even though their evidence and units are not comparable. |

The generated payload is a consequence of the source records; editing generated JSON alone would not correct the data flow. The source activity, factor, evidence, generator, types, and UI contracts must agree before corrected values are published.

### 1.2 Source-to-claim traceability failure

All three fixed provider rows point to `SRC.LUCCIONI.2023`. The reviewed primary study is *Power Hungry Processing: Watts Driving the Cost of AI Deployment?* [4], a 2024 FAccT paper (arXiv v3 dated 2024-10-15), not a measurement of OpenAI, Anthropic, or Google hosted APIs. It ran controlled inference experiments on an AWS A100 system across task-specific and multi-purpose open models. Its text-generation result is a mean **0.047 kWh per 1,000 inferences** for a task producing 10 new tokens per input, and its image-generation result is **2.907 kWh per 1,000 inferences** with a standard deviation of 3.31 kWh [4]. Those results are useful modality and order-of-magnitude evidence; they do not support assigning 200–280 gCO₂e to named commercial providers per 1,000 combined tokens.

The existing provider method notes also call the values “cloud” or “carbon-optimized TPU” estimates but do not record:

- a provider/model measurement;
- input and output token counts;
- reasoning or extended-thinking setting;
- batch size, throughput, or latency;
- accelerator type and utilization;
- PUE and idle-capacity treatment;
- location-based versus market-based electricity emissions;
- whether hardware manufacturing is included; or
- a reproducible conversion from energy to grams CO₂e.

That is a provenance break, not merely a wide uncertainty interval. Widening the range around an unsupported point estimate does not repair the missing workload or boundary.

## 2. Independent evidence review

### 2.1 First-party provider disclosures

#### OpenAI

Sam Altman’s first-party post reports that an average ChatGPT query uses about **0.34 Wh** and about **0.000085 gallons of water** [1]. The post does not disclose the model mix, prompt and completion token counts, serving stack, region, PUE, idle-capacity allocation, carbon-intensity basis, or whether the value is operational or life-cycle. It is therefore useful as a provider-reported prompt-level observation, not as a `gCO₂e/1k_tokens` factor.

#### Google

Elsworth et al. report first-party instrumentation of Gemini Apps serving at Google scale [2]. For the median Gemini Apps text prompt in May 2025:

- comprehensive serving energy: **0.24 Wh/prompt**;
- active AI accelerators: 0.14 Wh;
- active CPU and DRAM: 0.06 Wh;
- provisioned idle machines: 0.02 Wh;
- data-centre overhead: 0.02 Wh;
- market-based emissions: **0.03 gCO₂e/prompt**;
- water consumption: **0.26 mL/prompt**.

The narrower accelerator-only comparison is 0.10 Wh/prompt. The paper explicitly states that the comprehensive result includes the host, idle capacity, and PUE overhead, and that the median is a prompt-distribution statistic rather than a fixed cost for every request. Google also reports a 33x reduction in energy per median prompt over the measured year, showing that generation/vintage and serving software are material variables [2].

#### Anthropic

The reviewed Anthropic Claude 3 announcement distinguishes Opus, Sonnet, and Haiku by capability, speed, context, and price, but does not provide a per-query energy or carbon value [8]. The public information reviewed here is insufficient for an Anthropic-specific published factor. A provider row should remain unavailable unless a model- and workload-specific source is added.

### 2.2 Independent LLM benchmark

Jegham et al. estimate production-style energy by combining public API latency/throughput observations with inferred hardware power, utilization, PUE, and regional environmental multipliers [3]. This is not first-party telemetry, so it must be labelled as an estimate. It is nevertheless the most useful reviewed evidence for model and generation variability because it holds three workload shapes constant:

| Workload | GPT-4.1 | GPT-4.1 nano | o3 | DeepSeek-R1 | Claude 3.7 Sonnet | Claude 3.7 Sonnet ET |
|---|---:|---:|---:|---:|---:|---:|
| 100 input + 300 output tokens | 0.918 Wh | 0.103 Wh | 7.026 Wh | 23.815 Wh | 0.836 Wh | 3.490 Wh |
| 1k input + 1k output tokens | 2.513 Wh | 0.271 Wh | 21.414 Wh | 29.000 Wh | 2.781 Wh | 5.683 Wh |
| 10k input + 1.5k output tokens | 4.233 Wh | 0.454 Wh | 39.223 Wh | 33.634 Wh | 5.518 Wh | 17.045 Wh |

The medium workload is 2,000 combined tokens. Dividing only that benchmark’s energy result by 2,000 gives an illustrative range of approximately **0.136 Wh/1k combined tokens** for GPT-4.1 nano, **1.257 Wh/1k** for GPT-4.1, **10.707 Wh/1k** for o3, **14.500 Wh/1k** for DeepSeek-R1, and **1.391 Wh/1k** for ordinary Claude 3.7 Sonnet. These are normalization calculations for comparison, not recommended product factors: the source estimates infrastructure and uses a specific carbon/accounting setup.

The benchmark demonstrates four application requirements:

1. token count alone is not enough; input and output lengths change the result;
2. smaller model names do not guarantee lower energy because deployment hardware and serving efficiency can dominate;
3. reasoning/extended-thinking mode needs its own scenario; and
4. the arithmetic mean and uncertainty range are workload-dependent, not provider constants.

### 2.3 Text versus image

Luccioni et al. measured 88 models over 10 tasks on a fixed AWS A100 environment [4]. Their mean energy per 1,000 inferences was:

| Task | Mean energy per 1,000 inferences | Mean per inference |
|---|---:|---:|
| Text generation | 0.047 kWh | 0.047 Wh |
| Image generation | 2.907 kWh | 2.907 Wh |

The study reports large within-task variation and identifies task structure as a stronger driver than parameter count in many comparisons. Its text-generation setup generated 10 new tokens, so the result cannot be generalized to a modern long-context chat response. Its image result also predates current diffusion architectures and should be treated as a historical benchmark, not a current provider factor.

### 2.4 Video inference

Delavande et al. measure open text-to-video models on one NVIDIA H100 using GPU, CPU, and RAM energy [6]. Under the default settings in their table, the totals are:

- WAN2.1-T2V-1.3B: 78.8 + 7.4 + 4.3 = **90.5 Wh/video**;
- WAN2.1-T2V-14B: 359.7 + 35.6 + 19.8 = **415.1 Wh/video**.

These are not universal “video prompt” values. The configurations differ in resolution, frame count, FPS, and denoising steps. The controlled WAN2.1 experiments find:

- approximately quadratic growth in spatial resolution;
- approximately quadratic growth in frame count;
- linear growth in denoising steps; and
- GPU energy above 80% of total in the cross-model runs [6].

A later 2026 working paper extends the framework to proprietary APIs and estimates, rather than directly measures, **Veo 3 at 19.8–43.4 Wh for an 8-second 720p video** and **Sora 2.0 Pro at a mean 1,313 Wh for a 12-second 1080p video** [7]. Those figures are useful warning signals about closed-model variability, but the API-latency-based estimation and non-peer-reviewed status make them unsuitable as ACX production factors without corroboration.

### 2.5 Life-cycle disclosure

Mistral’s first-party LCA disclosure reports marginal impacts for a **400-token Le Chat response**, excluding the user terminal [5]:

- 1.14 gCO₂e;
- 45 mL water; and
- 0.16 mg Sb-equivalent resource depletion.

The disclosure includes upstream impacts such as server manufacturing, not only operational electricity. Mistral also states that the study is a first approximation and that GPU life-cycle inventories are uncertain. The number is valuable because it demonstrates that a provider can publish a model/workload-specific LCA, but it must not be mixed with Google’s operational market-based gCO₂e/prompt or with a GPU-only Wh benchmark.

## 3. Why the existing 280 g figure fails an arithmetic audit

The current GPT record states 280 gCO₂e per 1k combined tokens. Converting that carbon claim back to implied electricity gives:

| Assumed electricity intensity | Implied electricity for 280 g |
|---:|---:|
| 27 g/kWh (current CA-ON 2025 row) | 10.37 kWh per 1k tokens |
| 135 g/kWh (Google 2023 market-based factor) | 2.07 kWh per 1k tokens |
| 352.8 g/kWh (the independent benchmark’s GPT-4.1 factor) | 0.794 kWh per 1k tokens |

No workload, model, or boundary in the current record explains such an implied energy demand. The comparison is not a claim that every source must agree: Google’s prompt median, OpenAI’s average query, the independent benchmark, and Mistral’s LCA use different populations and boundaries. It is a unit-and-provenance check showing that **280 g cannot be presented as a measured ordinary 1k-token operational factor without additional evidence**.

There is also a direct internal contradiction. The generic factor specifies **0.003 kWh per 1k tokens**. With the current 27 g/kWh CA-ON grid row, that is **0.081 gCO₂e per 1k tokens**. The fixed GPT, Anthropic, and Google rows are 2,469–3,457 times higher than that resolved generic record, while all four are described as ordinary cloud LLM inference. Different boundaries could explain a difference, but the data contains no boundary or workload metadata that would do so.

## 4. Defensible ACX calculation contract

### 4.1 Keep energy and carbon separate

The primary physical estimate should be energy, with carbon derived only when the electricity basis is known:

```text
operational_gCO2e = energy_Wh / 1000 × grid_intensity_g_per_kWh
```

If the source already reports full-stack energy, do not apply PUE a second time. If the source reports accelerator-only energy, a PUE or serving-overhead multiplier may be applied only when the multiplier is explicitly sourced and the resulting boundary is labelled. If embodied hardware or upstream life-cycle impacts are included, store them as a separate component or mark the record `lifecycle`; do not merge them into an operational factor without a declared allocation method.

Every carbon result needs:

- `basis`: `location-based`, `market-based`, or `lifecycle`;
- `gridIntensityGPerKwh` or the source’s direct carbon method;
- `scopeBoundary`: for example `gpu-only`, `full-stack-serving`, or `lifecycle`;
- `vintageYear` and retrieval date; and
- uncertainty bounds that come from the source or a documented sensitivity model.

### 4.2 Use workload vectors, not a naked token scalar

A text scenario should retain at least:

```text
provider, model, generationMode,
inputTokens, outputTokens, reasoningTokens,
batchSize or servingContext,
energyWh, energyWhLow, energyWhHigh,
carbonBasis, scopeBoundary, vintageYear, sourceIds
```

`reasoningTokens` may be null when the provider does not expose them, but the scenario must then say that hidden reasoning is unobserved. A provider-average prompt can use `functionalUnit = prompt`, but it must not be relabelled `1k_tokens` unless the source actually measured or modelled that token workload.

An image scenario needs a separate functional unit and image parameters such as resolution, steps, sampler/model family, and batch size. A video scenario needs duration or frame count, width, height, FPS, denoising steps, audio flag, model, and hardware/serving boundary. A video clip should never be priced by borrowing a text token factor.

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

1. provider and exact model, or `provider/model not disclosed`;
2. generation mode;
3. functional unit and input/output workload;
4. energy value and uncertainty, when available;
5. carbon basis and grid/source intensity;
6. operational versus life-cycle boundary;
7. vintage and retrieval date; and
8. source citation and URL.

When any required field is absent, the catalog may retain the record for research but the calculator should display it as unavailable or as an explicitly labelled estimate. Do not show a precise number with a generic “representative” note.

## 5. Minimal implementation plan

This is the smallest clean cutover that preserves existing calculator behavior while removing the unsupported abstraction:

1. **Add a scenario record shape** to the source and generated schemas. Keep the existing activity identity, but add modality, provider, model, generation mode, workload parameters, energy, carbon basis, and boundary metadata.
2. **Separate functional units**: `prompt`, `response`, `1k_combined_tokens`, `image`, and `video_clip` are different units. A source record may use only the unit it supports.
3. **Quarantine the three fixed provider token rows** until each has a source that measures the named provider/model workload. Do not map the generic 0.003 kWh row to a provider claim.
4. **Create scenario-specific published rows** only for evidence reviewed at that exact granularity. Google’s median Gemini prompt, OpenAI’s average ChatGPT query, Mistral’s 400-token LCA response, and the independent model benchmark should remain distinct scenarios with distinct boundaries.
5. **Render evidence metadata** in the calculator. Annual quantity must multiply a scenario unit, not silently imply that an annual “1k tokens” number is a provider-independent fact.
6. **Add validation gates**:
   - reject a provider/model factor whose source functional unit is only an unqualified prompt average;
   - reject a fixed `gCO₂e/1k_tokens` factor without input/output workload and boundary metadata;
   - reject a video record without duration/frame and resolution fields;
   - prevent PUE from being applied twice; and
   - prevent operational and life-cycle rows from being aggregated without an explicit scope label.
7. **Keep unresolved provider values unavailable.** Lack of disclosure is evidence of uncertainty, not permission to reuse another provider’s factor.

## 6. Acceptance criteria for the follow-on application change

The data/model change is ready for human review when all of the following are true:

- no published calculator or catalog row contains the current 200–400 g provider-token factors;
- every published AI result identifies its functional unit, modality, model/provider status, workload, boundary, carbon basis, vintage, and source;
- the same source cannot be used to claim both a prompt average and a token factor without a documented conversion;
- model/generation choices alter the selected scenario rather than merely changing explanatory text;
- video calculations use video parameters and never a text-token conversion;
- source and generated payload hashes remain aligned through the existing dataflow release checks; and
- tests cover unit conversion, scope separation, missing metadata, unavailable records, and at least one boundary case for long-context/reasoning/video scenarios.

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

[1] S. Altman, “The Gentle Singularity,” Sam Altman blog, 2025. First-party disclosure of approximately 0.34 Wh per average ChatGPT query. Available: [https://blog.samaltman.com/the-gentle-singularity](https://blog.samaltman.com/the-gentle-singularity). Accessed: 2026-08-17.

[2] C. Elsworth, K. Huang, D. Patterson, I. Schneider, R. Sedivy, S. Goodman, B. Townsend, P. Ranganathan, J. Dean, A. Vahdat, B. Gomes, and J. Manyika, “Measuring the environmental impact of delivering AI at Google Scale,” arXiv:2508.15734v1, 2025. Available: [https://arxiv.org/html/2508.15734](https://arxiv.org/html/2508.15734). Accessed: 2026-08-17.

[3] N. Jegham, M. Abdelatti, L. Elmoubarki, and A. Hendawi, “How Hungry is AI? Benchmarking Energy, Water, and Carbon Footprint of LLM Inference,” arXiv:2505.09598v1, 2025. Available: [https://arxiv.org/html/2505.09598v1](https://arxiv.org/html/2505.09598v1). Accessed: 2026-08-17.

[4] A. S. Luccioni, Y. Jernite, and E. Strubell, “Power Hungry Processing: Watts Driving the Cost of AI Deployment?,” *ACM Conference on Fairness, Accountability, and Transparency (FAccT ’24)*, 2024, arXiv:2311.16863v3. DOI: 10.1145/3630106.3658542. Available: [https://arxiv.org/html/2311.16863](https://arxiv.org/html/2311.16863). Accessed: 2026-08-17.

[5] Mistral AI, “Our contribution to a global environmental standard for AI,” 2025. Available: [https://mistral.ai/news/our-contribution-to-a-global-environmental-standard-for-ai/](https://mistral.ai/news/our-contribution-to-a-global-environmental-standard-for-ai/). Accessed: 2026-08-17.

[6] J. Delavande, R. Pierrard, and S. Luccioni, “Video Killed the Energy Budget: Characterizing the Latency and Power Regimes of Open Text-to-Video Models,” arXiv:2509.19222v1, 2025. Available: [https://arxiv.org/html/2509.19222](https://arxiv.org/html/2509.19222). Accessed: 2026-08-17.

[7] N. Jegham, B. Gamazaychikov, and S. Luccioni, “Lights, Camera, Carbon: Architectural Scaling Laws for Video Generation Energy Consumption,” arXiv:2607.04553v1, 2026. Use limited to provisional closed-model estimates; direct measurement is not available for the proprietary APIs. Available: [https://arxiv.org/html/2607.04553v1](https://arxiv.org/html/2607.04553v1). Accessed: 2026-08-17.

[8] Anthropic, “Introducing the next generation of Claude,” 2024. Model-family information reviewed for provider/model distinctions; no per-query energy factor was disclosed on the page. Available: [https://www.anthropic.com/news/claude-3-family](https://www.anthropic.com/news/claude-3-family). Accessed: 2026-08-17.

### Internal records reviewed

- `data/activities.csv` — AI activity units and descriptions.
- `data/emission_factors.csv` — `EF.LLM.GPT.TOKENK`, `EF.LLM.ANTHROPIC.TOKENK`, `EF.LLM.GOOGLE.TOKENK`, and `EF.ONLINE.AI.LLM.INFER.1K_TOKENS`.
- `data/grid_intensity.csv` — current CA-ON 2025 operational intensity row.
- `data/sources.csv` — provider rows’ shared `SRC.LUCCIONI.2023` mapping.
- `scripts/generate_web_calculator_data.py` — factor selection and evidence generation.
- `apps/carbon-acx-web/src/lib/calculator.ts` — generated activity/evidence types.
- `apps/carbon-acx-web/src/app/calculator/page.tsx` — factor display and annual quantity UI.
- `apps/carbon-acx-web/src/generated/calculator-data.json` and `catalog-data.json` — generated calculator and catalog payloads.
