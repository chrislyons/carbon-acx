import sourcesJson from '@/generated/sources.json'
import {
  ACTIVITIES,
  CATALOG_ACTIVITIES,
  CATALOG_DATASET,
  type Activity,
  type AiScenario,
  type CatalogActivity,
} from '@/lib/calculator'

export interface SourceRegistryInputSource {
  source_id: string
  ieee_citation: string
  url: string
  year: string
  license: string
  review_due_at: string
}

export interface SourceRegistryInputs {
  sources: readonly SourceRegistryInputSource[]
  calculatorActivities: readonly Activity[]
  atlasActivities: readonly CatalogActivity[]
  scenarios: readonly AiScenario[]
}

export interface SourceRegistryEntry {
  sourceId: string
  citation: string
  url: string | null
  year: string | null
  license: string | null
  reviewDueAt: string | null
  calculatorRecordCount: number
  atlasRecordCount: number
  aiScenarioCount: number
}

export interface SourceRegistrySummary {
  registeredCount: number
  calculatorReferencedSourceCount: number
  atlasReferencedSourceCount: number
  scenarioReferencedSourceCount: number
}

interface SourceRegistryEnvelope {
  sources: readonly SourceRegistryInputSource[]
}

const GENERATED_SOURCES = sourcesJson as SourceRegistryEnvelope

function optionalText(value: string): string | null {
  const normalized = value.trim()
  return normalized || null
}

function addReferences(
  references: readonly string[],
  recordId: string,
  knownSourceIds: ReadonlySet<string>,
  usage: Map<string, Set<string>>,
): void {
  for (const rawSourceId of new Set(references)) {
    const sourceId = rawSourceId.trim()
    if (!knownSourceIds.has(sourceId)) throw new Error(`Unregistered source reference: ${sourceId}`)
    const records = usage.get(sourceId) ?? new Set<string>()
    records.add(recordId)
    usage.set(sourceId, records)
  }
}

export function buildSourceRegistry(
  inputs: SourceRegistryInputs = {
    sources: GENERATED_SOURCES.sources,
    calculatorActivities: ACTIVITIES,
    atlasActivities: CATALOG_ACTIVITIES,
    scenarios: CATALOG_DATASET.aiScenarios.records,
  },
): { entries: SourceRegistryEntry[]; summary: SourceRegistrySummary } {
  const registered = inputs.sources.map((source) => ({
    sourceId: source.source_id.trim(),
    citation: source.ieee_citation.trim(),
    url: optionalText(source.url),
    year: optionalText(source.year),
    license: optionalText(source.license),
    reviewDueAt: optionalText(source.review_due_at),
  }))
  const knownSourceIds = new Set<string>()
  for (const source of registered) {
    if (knownSourceIds.has(source.sourceId)) throw new Error(`Duplicate source ID: ${source.sourceId}`)
    knownSourceIds.add(source.sourceId)
  }

  const calculatorUsage = new Map<string, Set<string>>()
  const atlasUsage = new Map<string, Set<string>>()
  const scenarioUsage = new Map<string, Set<string>>()
  for (const activity of inputs.calculatorActivities) {
    addReferences(activity.evidence.sourceIds, activity.id, knownSourceIds, calculatorUsage)
  }
  for (const activity of inputs.atlasActivities) {
    addReferences(activity.evidence.sourceIds, activity.id, knownSourceIds, atlasUsage)
  }
  for (const scenario of inputs.scenarios) {
    addReferences(scenario.sourceRefs.map((reference) => reference.sourceId), scenario.scenarioId, knownSourceIds, scenarioUsage)
  }

  const entries = registered.map((source) => ({
    ...source,
    calculatorRecordCount: calculatorUsage.get(source.sourceId)?.size ?? 0,
    atlasRecordCount: atlasUsage.get(source.sourceId)?.size ?? 0,
    aiScenarioCount: scenarioUsage.get(source.sourceId)?.size ?? 0,
  }))
  return {
    entries,
    summary: {
      registeredCount: entries.length,
      calculatorReferencedSourceCount: calculatorUsage.size,
      atlasReferencedSourceCount: atlasUsage.size,
      scenarioReferencedSourceCount: scenarioUsage.size,
    },
  }
}
