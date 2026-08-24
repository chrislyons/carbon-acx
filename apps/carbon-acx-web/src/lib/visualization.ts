import {
  CATEGORY_INFO,
  type ActivityCategory,
  type CatalogActivity,
  type CalculatorSummary,
} from '@/lib/calculator'
import type { WorksheetResult, WorksheetSummary } from '@/lib/routines'

export interface ActivityImpactDatum {
  id: string
  name: string
  category: ActivityCategory
  quantity: number
  unitLabel: string
  emissions: number
  lowEmissions: number | null
  highEmissions: number | null
  uncertainty: 'bounded' | 'not-quantified'
}

export interface ImpactSummary {
  results: ActivityImpactDatum[]
  byCategory: Record<ActivityCategory, number>
}

export interface ImpactFlowNode {
  id: string
  kind: 'activity' | 'category' | 'total'
  label: string
  category: ActivityCategory | null
}

export interface ImpactFlowLink {
  id: string
  source: string
  target: string
  value: number
  category: ActivityCategory
}

export interface ImpactFlowData {
  nodes: ImpactFlowNode[]
  links: ImpactFlowLink[]
  zeroResults: ActivityImpactDatum[]
}

export interface AtlasCoverageGroup {
  category: string
  label: string
  records: CatalogActivity[]
  publishedCount: number
  unavailableCount: number
}

export function humanizeCategory(value: string): string {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function compareByImpact(a: ActivityImpactDatum, b: ActivityImpactDatum): number {
  return b.emissions - a.emissions
    || a.name.localeCompare(b.name)
    || a.id.localeCompare(b.id)
}

function getBoundedEmissions(
  quantity: number,
  emissionFactor: number,
  lowGPerUnit: number | null,
  highGPerUnit: number | null,
): { lowEmissions: number; highEmissions: number } | null {
  if (
    lowGPerUnit === null
    || highGPerUnit === null
    || !Number.isFinite(quantity)
    || !Number.isFinite(emissionFactor)
    || !Number.isFinite(lowGPerUnit)
    || !Number.isFinite(highGPerUnit)
    || lowGPerUnit < 0
    || highGPerUnit < 0
    || lowGPerUnit > emissionFactor
    || emissionFactor > highGPerUnit
  ) {
    return null
  }

  const lowEmissions = quantity * lowGPerUnit
  const highEmissions = quantity * highGPerUnit
  return Number.isFinite(lowEmissions) && Number.isFinite(highEmissions)
    ? { lowEmissions, highEmissions }
    : null
}

function impactDatum(
  id: string,
  name: string,
  category: ActivityCategory,
  quantity: number,
  unitLabel: string,
  emissionFactor: number,
  emissions: number,
  lowGPerUnit: number | null,
  highGPerUnit: number | null,
): ActivityImpactDatum {
  const bounds = getBoundedEmissions(quantity, emissionFactor, lowGPerUnit, highGPerUnit)
  return {
    id,
    name,
    category,
    quantity,
    unitLabel,
    emissions,
    lowEmissions: bounds?.lowEmissions ?? null,
    highEmissions: bounds?.highEmissions ?? null,
    uncertainty: bounds ? 'bounded' : 'not-quantified',
  }
}

export function toImpactSummary(summary: CalculatorSummary): ImpactSummary {
  return {
    results: summary.results.map((result) => impactDatum(
      result.activityId,
      result.activityName,
      result.category,
      result.quantity,
      result.unitLabel,
      result.emissionFactor,
      result.emissions,
      result.evidence.uncertainty.lowGPerUnit,
      result.evidence.uncertainty.highGPerUnit,
    )),
    byCategory: { ...summary.byCategory },
  }
}

export function toRoutineImpactSummary(summary: WorksheetSummary): ImpactSummary {
  return {
    results: summary.results.map((result: WorksheetResult) => ({
      id: result.source === 'scenario' ? result.lineKey : result.sourceId,
      name: result.name,
      category: result.category,
      quantity: result.quantity,
      unitLabel: result.unitLabel,
      emissions: result.emissions,
      lowEmissions: result.lowEmissions,
      highEmissions: result.highEmissions,
      uncertainty: result.lowEmissions !== null && result.highEmissions !== null
        ? 'bounded'
        : 'not-quantified',
    })),
    byCategory: { ...summary.byCategory },
  }
}

export function buildActivityImpactData(summary: ImpactSummary): ActivityImpactDatum[] {
  return [...summary.results].sort(compareByImpact)
}

export function buildImpactFlowData(summary: ImpactSummary): ImpactFlowData {
  const ranked = buildActivityImpactData(summary)
  const positiveActivities = ranked.filter((activity) => activity.emissions > 0)
  const positiveCategories = (Object.keys(CATEGORY_INFO) as ActivityCategory[])
    .filter((category) => summary.byCategory[category] > 0)

  const activityNodes: ImpactFlowNode[] = positiveActivities.map((activity) => ({
    id: `activity:${activity.id}`,
    kind: 'activity',
    label: activity.name,
    category: activity.category,
  }))
  const categoryNodes: ImpactFlowNode[] = positiveCategories.map((category) => ({
    id: `category:${category}`,
    kind: 'category',
    label: CATEGORY_INFO[category].name,
    category,
  }))

  const activityLinks: ImpactFlowLink[] = positiveActivities.map((activity) => ({
    id: `activity:${activity.id}->category:${activity.category}`,
    source: `activity:${activity.id}`,
    target: `category:${activity.category}`,
    value: activity.emissions,
    category: activity.category,
  }))
  const categoryLinks: ImpactFlowLink[] = positiveCategories.map((category) => ({
    id: `category:${category}->total`,
    source: `category:${category}`,
    target: 'total',
    value: summary.byCategory[category],
    category,
  }))

  return {
    nodes: [
      ...activityNodes,
      ...categoryNodes,
      { id: 'total', kind: 'total', label: 'Total', category: null },
    ],
    links: [...activityLinks, ...categoryLinks],
    zeroResults: ranked.filter((activity) => activity.emissions === 0),
  }
}

export function buildAtlasCoverageGroups(records: CatalogActivity[]): AtlasCoverageGroup[] {
  const groups = new Map<string, CatalogActivity[]>()
  for (const record of records) {
    const label = humanizeCategory(record.category)
    const current = groups.get(label) ?? []
    current.push(record)
    groups.set(label, current)
  }

  return [...groups.entries()]
    .map(([label, groupRecords]) => {
      const sortedRecords = [...groupRecords].sort(
        (a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id),
      )
      return {
        category: sortedRecords[0]?.category ?? label,
        label,
        records: sortedRecords,
        publishedCount: sortedRecords.filter((record) => record.evidence.publicationStatus === 'published').length,
        unavailableCount: sortedRecords.filter((record) => record.evidence.publicationStatus === 'unavailable').length,
      }
    })
    .sort((a, b) => a.label.localeCompare(b.label))
}
