import calculatorDataJson from '@/generated/calculator-data.json'
import sourcesJson from '@/generated/sources.json'

interface SourceEntry {
  source_id: string
  ieee_citation: string
  url: string
  year: string | number
  license?: string
}

interface ActivityProvenance {
  activityId: string
  emissionFactorId: string
  emissionFactorRegion: string | null
  emissionFactorVintageYear: number | null
  gridIntensityRegion: string | null
  gridIntensityVintageYear: number | null
}

// Build source lookup from generated sources.json
let SOURCES_CACHE: Map<string, SourceEntry> | null = null

function getSourcesMap(): Map<string, SourceEntry> {
  if (SOURCES_CACHE) return SOURCES_CACHE

  const sources = sourcesJson as SourceEntry[]
  const map = new Map<string, SourceEntry>()
  for (const source of sources) {
    map.set(source.source_id, source)
  }
  SOURCES_CACHE = map
  return map
}

/**
 * Format an IEEE citation from source_id
 * Returns the full IEEE citation string (e.g., "[15] Environment and Climate Change Canada, ...")
 */
export function formatIEEECitation(sourceId: string): string {
  const sources = getSourcesMap()
  const source = sources.get(sourceId)
  if (!source) {
    return `[?] Unknown source: ${sourceId}`
  }
  return source.ieee_citation
}

/**
 * Get all unique IEEE citations for an array of source IDs
 */
export function getCitationsForActivity(sourceIds: string[]): string[] {
  const sources = getSourcesMap()
  const citations: string[] = []
  const seen = new Set<string>()

  for (const sourceId of sourceIds) {
    const source = sources.get(sourceId)
    if (source && !seen.has(source.source_id)) {
      citations.push(source.ieee_citation)
      seen.add(source.source_id)
    }
  }

  return citations
}

/**
 * Get a short citation label like "[15]" for inline display
 */
export function getShortCitation(sourceId: string): string {
  const sources = getSourcesMap()
  const source = sources.get(sourceId)
  if (!source) return '[?]'

  // Extract the bracket number from IEEE citation
  const match = source.ieee_citation.match(/^\[(\d+)\]/)
  return match ? `[${match[1]}]` : `[${source.source_id}]`
}

/**
 * Get provenance summary for display
 */
export function getProvenanceSummary(provenance: ActivityProvenance): {
  emissionFactor: string
  gridIntensity: string | null
  vintage: string
} {
  const parts: string[] = []

  if (provenance.emissionFactorId) {
    parts.push(`EF: ${provenance.emissionFactorId}`)
  }
  if (provenance.emissionFactorVintageYear) {
    parts.push(`EF vintage: ${provenance.emissionFactorVintageYear}`)
  }
  if (provenance.emissionFactorRegion) {
    parts.push(`EF region: ${provenance.emissionFactorRegion}`)
  }

  let gridInfo: string | null = null
  if (provenance.gridIntensityRegion || provenance.gridIntensityVintageYear) {
    const gridParts: string[] = []
    if (provenance.gridIntensityRegion) gridParts.push(`Grid: ${provenance.gridIntensityRegion}`)
    if (provenance.gridIntensityVintageYear) gridParts.push(`Vintage: ${provenance.gridIntensityVintageYear}`)
    gridInfo = gridParts.join(', ')
  }

  return {
    emissionFactor: parts.join(' | ') || 'Unknown',
    gridIntensity: gridInfo,
    vintage: provenance.emissionFactorVintageYear?.toString() || 'Unknown',
  }
}

/**
 * Get the vintage year for an activity's emission factor
 */
export function getActivityVintageYear(provenance: ActivityProvenance): number | null {
  return provenance.emissionFactorVintageYear ?? provenance.gridIntensityVintageYear ?? null
}

/**
 * Check if an activity uses grid-indexed emission factor
 */
export function isGridIndexed(provenance: ActivityProvenance): boolean {
  return provenance.gridIntensityRegion !== null && provenance.gridIntensityVintageYear !== null
}