import { describe, expect, it } from 'vitest'

import { ACTIVITIES, CATALOG_ACTIVITIES, CATALOG_DATASET } from '@/lib/calculator'
import { buildSourceRegistry, type SourceRegistryInputs } from '@/lib/sources'

function fixtureInputs(): SourceRegistryInputs {
  const activity = ACTIVITIES[0]
  const atlasActivity = CATALOG_ACTIVITIES[0]
  const scenario = CATALOG_DATASET.aiScenarios.records[0]
  if (!activity || !atlasActivity || !scenario) throw new Error('Generated fixtures are incomplete')

  return {
    sources: [{
      source_id: ' SRC.TEST ',
      ieee_citation: ' Test citation ',
      url: ' ',
      year: '2025',
      license: '',
      review_due_at: ' ',
    }],
    calculatorActivities: [{
      ...activity,
      evidence: { ...activity.evidence, sourceIds: ['SRC.TEST', ' SRC.TEST '] },
    }],
    atlasActivities: [{
      ...atlasActivity,
      evidence: { ...atlasActivity.evidence, sourceIds: ['SRC.TEST'] },
    }],
    scenarios: [{
      ...scenario,
      sourceRefs: [{ ...scenario.sourceRefs[0], sourceId: 'SRC.TEST' }],
    }],
  }
}

describe('source registry adapter', () => {
  it('derives the current registered and referenced source sets', () => {
    const { entries, summary } = buildSourceRegistry()
    expect(entries).toHaveLength(63)
    expect(summary).toEqual({
      registeredCount: 63,
      calculatorReferencedSourceCount: 16,
      atlasReferencedSourceCount: 46,
      scenarioReferencedSourceCount: 8,
    })
  })

  it('preserves order, trims metadata, normalizes empty optionals, and counts distinct records', () => {
    const { entries, summary } = buildSourceRegistry(fixtureInputs())
    expect(entries).toEqual([{
      sourceId: 'SRC.TEST',
      citation: 'Test citation',
      url: null,
      year: '2025',
      license: null,
      reviewDueAt: null,
      calculatorRecordCount: 1,
      atlasRecordCount: 1,
      aiScenarioCount: 1,
    }])
    expect(summary).toEqual({
      registeredCount: 1,
      calculatorReferencedSourceCount: 1,
      atlasReferencedSourceCount: 1,
      scenarioReferencedSourceCount: 1,
    })
  })

  it('rejects duplicate source IDs and unregistered references', () => {
    const duplicate = fixtureInputs()
    duplicate.sources = [...duplicate.sources, { ...duplicate.sources[0], source_id: 'SRC.TEST' }]
    expect(() => buildSourceRegistry(duplicate)).toThrow('Duplicate source ID: SRC.TEST')

    const unregistered = fixtureInputs()
    unregistered.calculatorActivities = [{
      ...unregistered.calculatorActivities[0],
      evidence: { ...unregistered.calculatorActivities[0].evidence, sourceIds: ['SRC.MISSING'] },
    }]
    expect(() => buildSourceRegistry(unregistered)).toThrow('Unregistered source reference: SRC.MISSING')
  })
})
