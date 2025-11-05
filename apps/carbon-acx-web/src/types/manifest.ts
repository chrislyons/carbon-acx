/**
 * TypeScript types for Carbon ACX manifest data
 * Based on acx.figure-manifest/1-0-0 schema
 */

export interface ManifestReference {
  path: string
  sha256: string
}

export interface FigureItem {
  path: string
  sha256: string
  preferred?: boolean
}

export interface FigureEntry {
  figure_id: string
  manifests: ManifestReference[]
  figures: FigureItem[]
  references: ManifestReference[]
}

export interface RootManifest {
  dataset_manifest: ManifestReference
  figures: FigureEntry[]
}

export interface ReferenceOrder {
  index: number
  source_id: string
}

export interface ReferencesInfo {
  path: string
  legacy_path: string
  sha256: string
  line_count: number
  order: ReferenceOrder[]
}

export interface NumericInvariance {
  passed: boolean
  tolerance_percent: number
}

export interface FigureManifest {
  schema_version: string
  figure_id: string
  figure_method: string
  generated_at: string
  hash_prefix: string
  figure_path: string
  legacy_figure_path: string
  figure_sha256: string
  citation_keys: string[]
  references: ReferencesInfo
  numeric_invariance: NumericInvariance
}

export interface ManifestListItem {
  id: string
  figure_id: string
  generated_at: string
  hash_prefix: string
  manifest_path: string
  figure_path: string
}

export interface VerificationResult {
  verified: boolean
  expected_hash: string
  actual_hash?: string
  error?: string
}
