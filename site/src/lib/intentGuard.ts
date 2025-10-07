import { distance as levenshtein } from 'fastest-levenshtein';

import type { Catalog, CatalogActivity, CatalogProfile } from './catalog';

interface IntentGuardEntities {
  profile: CatalogProfile;
  activity: CatalogActivity;
}

export interface IntentGuardResult {
  allowed: boolean;
  message: string;
  response?: string;
  corrections?: Record<string, unknown>;
}

interface DriftCheckResult {
  allowed: boolean;
  reason?: string;
  suggestion?: string;
}

const MAX_SUGGESTIONS = 3;

function extractRegion(profile: CatalogProfile): string | null {
  const region = profile.region ?? (profile as Record<string, unknown>).region_id;
  if (typeof region === 'string' && region.trim().length > 0) {
    return region.trim();
  }
  return null;
}

function extractYear(profile: CatalogProfile): string | null {
  const identifier = String(profile.profile_id ?? profile.id ?? '');
  const match = identifier.match(/(19|20|21)\d{2}$/);
  return match ? match[0] : null;
}

function detectRegionDrift(current: CatalogProfile, next: CatalogProfile): DriftCheckResult {
  const currentRegion = extractRegion(current);
  const nextRegion = extractRegion(next);
  if (currentRegion && nextRegion && currentRegion !== nextRegion) {
    return {
      allowed: false,
      reason: 'region',
      suggestion: `Keep region the same (${currentRegion})?`,
    };
  }
  return { allowed: true };
}

function detectYearDrift(current: CatalogProfile, next: CatalogProfile): DriftCheckResult {
  const currentYear = extractYear(current);
  const nextYear = extractYear(next);
  if (currentYear && nextYear && currentYear !== nextYear) {
    return {
      allowed: false,
      reason: 'year',
      suggestion: `Use the ${currentYear} vintage instead?`,
    };
  }
  return { allowed: true };
}

function buildUnknownActivityMessage(query: string, suggestions: string[]): string {
  if (suggestions.length === 0) {
    return `Unknown activity: ${query}`;
  }
  return `Unknown activity: ${query}. Did you mean ${suggestions.join(', ')}?`;
}

function findNearestActivities(query: string, catalog: Catalog): string[] {
  const normalised = query.trim().toLowerCase();
  if (!normalised) {
    return [];
  }
  const scored = catalog.activities
    .map((activity) => {
      const identifier = String(activity.activity_id ?? activity.id ?? '').trim();
      const label = String(activity.label ?? activity.title ?? activity.name ?? '').trim();
      const target = identifier || label;
      const key = target.toLowerCase();
      if (!key) {
        return null;
      }
      const score = levenshtein(normalised, key);
      return { label: target, score };
    })
    .filter((entry): entry is { label: string; score: number } => entry !== null)
    .sort((a, b) => a.score - b.score);
  return scored.slice(0, MAX_SUGGESTIONS).map((entry) => entry.label);
}

export function guardIntent(
  entities: IntentGuardEntities,
  catalog: Catalog,
  query: string,
): IntentGuardResult {
  const baselineProfile = catalog.profiles.find((entry) => Boolean(entry.profile_id));
  const currentProfile = baselineProfile ?? entities.profile;

  const regionCheck = detectRegionDrift(currentProfile, entities.profile);
  if (!regionCheck.allowed) {
    return {
      allowed: false,
      message: regionCheck.suggestion ?? 'Scope drift detected.',
      corrections: { region: extractRegion(currentProfile) },
    } satisfies IntentGuardResult;
  }

  const yearCheck = detectYearDrift(currentProfile, entities.profile);
  if (!yearCheck.allowed) {
    return {
      allowed: false,
      message: yearCheck.suggestion ?? 'Vintage drift detected.',
      corrections: { year: extractYear(currentProfile) },
    } satisfies IntentGuardResult;
  }

  const activityId = entities.activity.activity_id ?? entities.activity.id;
  if (!activityId) {
    const suggestions = findNearestActivities(query, catalog);
    return {
      allowed: false,
      message: buildUnknownActivityMessage(query, suggestions),
      corrections: suggestions.length > 0 ? { suggestions } : undefined,
    } satisfies IntentGuardResult;
  }

  return {
    allowed: true,
    message: 'Intent accepted.',
    response: `Resolved to ${activityId} for ${entities.profile.profile_id ?? entities.profile.id}.`,
  } satisfies IntentGuardResult;
}
