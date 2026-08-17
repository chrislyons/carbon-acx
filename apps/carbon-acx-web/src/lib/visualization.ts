import {
  CATEGORY_INFO,
  type ActivityCategory,
  type CatalogActivity,
  type CalculatorSummary,
} from '@/lib/calculator'

export interface ActivityImpactDatum {
  activityId: string
  activityName: string
  category: ActivityCategory
  quantity: number
  unitLabel: string
  emissions: number
  lowEmissions: number | null
  highEmissions: number | null
  uncertainty: 'bounded' | 'not-quantified'
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

function compareByActivity(a: ActivityImpactDatum, b: ActivityImpactDatum): number {
  return b.emissions - a.emissions
    || a.activityName.localeCompare(b.activityName)
    || a.activityId.localeCompare(b.activityId)
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

export function buildActivityImpactData(summary: CalculatorSummary): ActivityImpactDatum[] {
  return summary.results
    .map((result) => {
      const bounds = getBoundedEmissions(
        result.quantity,
        result.emissionFactor,
        result.evidence.uncertainty.lowGPerUnit,
        result.evidence.uncertainty.highGPerUnit,
      )
      return {
        activityId: result.activityId,
        activityName: result.activityName,
        category: result.category,
        quantity: result.quantity,
        unitLabel: result.unitLabel,
        emissions: result.emissions,
        lowEmissions: bounds?.lowEmissions ?? null,
        highEmissions: bounds?.highEmissions ?? null,
        uncertainty: bounds ? 'bounded' : 'not-quantified',
      } satisfies ActivityImpactDatum
    })
    .sort(compareByActivity)
}

export function buildImpactFlowData(summary: CalculatorSummary): ImpactFlowData {
  const ranked = buildActivityImpactData(summary)
  const positiveActivities = ranked.filter((activity) => activity.emissions > 0)
  const positiveCategories = (Object.keys(CATEGORY_INFO) as ActivityCategory[])
    .filter((category) => summary.byCategory[category] > 0)

  const activityNodes: ImpactFlowNode[] = positiveActivities.map((activity) => ({
    id: `activity:${activity.activityId}`,
    kind: 'activity',
    label: activity.activityName,
    category: activity.category,
  }))
  const categoryNodes: ImpactFlowNode[] = positiveCategories.map((category) => ({
    id: `category:${category}`,
    kind: 'category',
    label: CATEGORY_INFO[category].name,
    category,
  }))

  const activityLinks: ImpactFlowLink[] = positiveActivities.map((activity) => ({
    id: `activity:${activity.activityId}->category:${activity.category}`,
    source: `activity:${activity.activityId}`,
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
