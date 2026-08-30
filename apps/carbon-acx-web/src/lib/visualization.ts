import {
  CATEGORY_INFO,
  getActivityById,
  type ActivityCategory,
  type AtlasMode,
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
  groupKey: string
  groupLabel: string
  groupKind: 'calculator-category' | 'sector'
  records: CatalogActivity[]
  publishedCount: number
  unavailableCount: number
}

const CALCULATOR_CATEGORY_ORDER = Object.keys(CATEGORY_INFO) as ActivityCategory[]

const SECTOR_LABELS: Record<string, string> = {
  'SECTOR.PROFESSIONAL_SERVICES': 'Professional services',
  'SECTOR.DIGITAL_INFRASTRUCTURE': 'Digital infrastructure',
  'SECTOR.INDUSTRIAL_LIGHT': 'Light infrastructure',
  'SECTOR.INDUSTRIAL_HEAVY': 'Heavy industry',
  'SECTOR.MATERIALS_AND_CHEMICALS': 'Materials & chemicals',
  'SECTOR.DEFENSE_OPERATIONS': 'Defense operations',
  'SECTOR.PRIVATE_SECURITY': 'Private security',
  'SECTOR.MODELED_EVENTS': 'Modeled events',
  'SECTOR.INDUSTRIAL_EXTERNALITIES': 'Industrial externalities',
  'SECTOR.BIOSPHERE': 'Biosphere',
}

const SECTOR_ORDER = [
  'SECTOR.PROFESSIONAL_SERVICES',
  'SECTOR.DIGITAL_INFRASTRUCTURE',
  'SECTOR.INDUSTRIAL_LIGHT',
  'SECTOR.INDUSTRIAL_HEAVY',
  'SECTOR.MATERIALS_AND_CHEMICALS',
  'SECTOR.DEFENSE_OPERATIONS',
  'SECTOR.PRIVATE_SECURITY',
  'SECTOR.MODELED_EVENTS',
  'SECTOR.INDUSTRIAL_EXTERNALITIES',
  'SECTOR.BIOSPHERE',
] as const
export function humanizeCategory(value: string): string {
  return value.replace(/^SECTOR\./, '').replaceAll('_', ' ').toLocaleLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase())
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

function getPersonalGroupKey(record: CatalogActivity): string {
  const calculatorActivity = getActivityById(record.id)
  if (calculatorActivity) return calculatorActivity.category
  return CALCULATOR_CATEGORY_ORDER.includes(record.category as ActivityCategory)
    ? record.category
    : `calculator:${record.category || 'unknown'}`
}

function getSectorGroupKey(record: CatalogActivity): string {
  const sectorId = record.evidence.sectorId.trim()
  return sectorId ? `sector:${sectorId}` : 'sector:unknown'
}

function getGroupIdentity(record: CatalogActivity, mode: AtlasMode): { key: string; label: string } {
  if (mode === 'personal') {
    const key = getPersonalGroupKey(record)
    return {
      key,
      label: CATEGORY_INFO[key as ActivityCategory]?.name ?? humanizeCategory(record.category || 'Unknown category'),
    }
  }

  const key = getSectorGroupKey(record)
  const sectorId = key.slice('sector:'.length)
  return {
    key,
    label: sectorId === 'unknown' ? 'Unclassified sector' : SECTOR_LABELS[sectorId] ?? humanizeCategory(sectorId),
  }
}

function groupOrder(mode: AtlasMode): string[] {
  if (mode === 'personal') return CALCULATOR_CATEGORY_ORDER
  if (mode === 'systems') return SECTOR_ORDER.slice(0, 3).map((sectorId) => `sector:${sectorId}`)
  return SECTOR_ORDER.slice(3).map((sectorId) => `sector:${sectorId}`)
}

export function buildAtlasCoverageGroups(
  records: CatalogActivity[],
  mode: AtlasMode,
): AtlasCoverageGroup[] {
  const groups = new Map<string, { label: string; records: CatalogActivity[] }>()
  for (const record of records) {
    const identity = getGroupIdentity(record, mode)
    const current = groups.get(identity.key) ?? { label: identity.label, records: [] }
    current.records.push(record)
    groups.set(identity.key, current)
  }

  const preferredOrder = groupOrder(mode)
  return [...groups.entries()]
    .map(([groupKey, group]) => {
      const sortedRecords = [...group.records].sort(
        (a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id),
      )
      return {
        groupKey,
        groupLabel: group.label,
        groupKind: mode === 'personal' ? ('calculator-category' as const) : ('sector' as const),
        records: sortedRecords,
        publishedCount: sortedRecords.filter((record) => record.evidence.publicationStatus === 'published').length,
        unavailableCount: sortedRecords.filter((record) => record.evidence.publicationStatus === 'unavailable').length,
      }
    })
    .sort((a, b) => {
      const aIndex = preferredOrder.indexOf(a.groupKey)
      const bIndex = preferredOrder.indexOf(b.groupKey)
      const aKnown = aIndex === -1 ? 1 : 0
      const bKnown = bIndex === -1 ? 1 : 0
      return aKnown - bKnown
        || (aKnown === 0 ? aIndex - bIndex : a.groupLabel.localeCompare(b.groupLabel))
        || a.groupKey.localeCompare(b.groupKey)
    })
}

export function matchesAtlasRecord(
  record: CatalogActivity,
  query: string,
  mode: AtlasMode,
): boolean {
  const normalizedQuery = query.trim().toLocaleLowerCase()
  if (!normalizedQuery) return true
  const groupLabel = getGroupIdentity(record, mode).label
  const searchable = [
    record.name,
    record.description,
    record.id,
    record.evidence.activityId,
    record.evidence.emissionFactorId,
    groupLabel,
    record.evidence.region ?? '',
  ].join(' ').toLocaleLowerCase()
  return searchable.includes(normalizedQuery)
}
