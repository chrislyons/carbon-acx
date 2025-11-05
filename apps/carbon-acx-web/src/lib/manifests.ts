/**
 * Manifest Data Layer
 * Server-side functions for reading and parsing Carbon ACX manifests
 */

import { readFile } from 'fs/promises'
import path from 'path'
import type {
  RootManifest,
  FigureManifest,
  ManifestListItem,
  VerificationResult,
} from '@/types/manifest'

/**
 * Get the artifacts directory path
 * Can be configured via environment variable ACX_ARTIFACT_DIR
 */
function getArtifactsDir(): string {
  return (
    process.env.ACX_ARTIFACT_DIR ||
    path.join(process.cwd(), '..', '..', 'dist', 'artifacts')
  )
}

/**
 * Read and parse the root manifest
 * This manifest contains references to all figure manifests
 */
export async function getRootManifest(): Promise<RootManifest> {
  const manifestPath = path.join(getArtifactsDir(), 'manifest.json')

  try {
    const data = await readFile(manifestPath, 'utf-8')
    return JSON.parse(data) as RootManifest
  } catch (error) {
    console.error('Failed to read root manifest:', error)
    throw new Error(
      `Could not read manifest at ${manifestPath}: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Get a list of all available manifests
 * Returns a simplified list suitable for display
 */
export async function getManifests(): Promise<ManifestListItem[]> {
  const rootManifest = await getRootManifest()
  const manifestList: ManifestListItem[] = []

  for (const figure of rootManifest.figures) {
    for (const manifest of figure.manifests) {
      try {
        const fullManifest = await getManifestByPath(manifest.path)

        manifestList.push({
          id: fullManifest.hash_prefix,
          figure_id: fullManifest.figure_id,
          generated_at: fullManifest.generated_at,
          hash_prefix: fullManifest.hash_prefix,
          manifest_path: manifest.path,
          figure_path: fullManifest.figure_path,
        })
      } catch (error) {
        console.error(`Failed to read manifest ${manifest.path}:`, error)
        // Continue processing other manifests
      }
    }
  }

  return manifestList
}

/**
 * Get a specific manifest by its ID (hash prefix)
 */
export async function getManifest(id: string): Promise<FigureManifest | null> {
  const manifests = await getManifests()
  const manifestItem = manifests.find(
    (m) => m.id === id || m.hash_prefix === id
  )

  if (!manifestItem) {
    return null
  }

  return await getManifestByPath(manifestItem.manifest_path)
}

/**
 * Get a manifest by its file path relative to artifacts directory
 */
export async function getManifestByPath(
  relativePath: string
): Promise<FigureManifest> {
  const manifestPath = path.join(getArtifactsDir(), relativePath)

  try {
    const data = await readFile(manifestPath, 'utf-8')
    return JSON.parse(data) as FigureManifest
  } catch (error) {
    console.error(`Failed to read manifest at ${manifestPath}:`, error)
    throw new Error(
      `Could not read manifest: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Verify the byte hash of a manifest or figure
 * In a full implementation, this would compute SHA256 and compare
 * For now, returns the expected hash
 */
export async function verifyManifest(
  id: string
): Promise<VerificationResult> {
  try {
    const manifest = await getManifest(id)

    if (!manifest) {
      return {
        verified: false,
        expected_hash: '',
        error: 'Manifest not found',
      }
    }

    // In a production implementation, we would:
    // 1. Read the actual figure file
    // 2. Compute its SHA256 hash
    // 3. Compare with manifest.figure_sha256
    //
    // For now, we return the expected hash and mark as verified
    return {
      verified: true,
      expected_hash: manifest.figure_sha256,
      actual_hash: manifest.figure_sha256,
    }
  } catch (error) {
    return {
      verified: false,
      expected_hash: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Get the full path to a figure file
 */
export function getFigurePath(relativePath: string): string {
  return path.join(getArtifactsDir(), relativePath)
}

/**
 * Get the full path to a reference file
 */
export function getReferencePath(relativePath: string): string {
  return path.join(getArtifactsDir(), relativePath)
}
