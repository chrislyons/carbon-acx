import { z } from 'zod';

import { loadCatalog, type Catalog, type CatalogActivity, type CatalogProfile } from './catalog';
import { guardIntent } from './intentGuard';

export interface IntentResolution {
  profile: CatalogProfile;
  activity: CatalogActivity;
  request: Record<string, unknown>;
  provenance?: Record<string, unknown>;
  response: string;
}

const RawIntentSchema = z.object({
  profile: z.string().min(1),
  activity: z.string().min(1),
});

function fallbackTokens(value: string | undefined): string[] {
  if (!value) {
    return [];
  }
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

function scoreTokens(haystack: string[], needles: string[]): number {
  if (needles.length === 0 || haystack.length === 0) {
    return 0;
  }
  let score = 0;
  for (const needle of needles) {
    if (haystack.includes(needle)) {
      score += 2;
    }
    for (const word of haystack) {
      if (word.startsWith(needle) || needle.startsWith(word)) {
        score += 1;
      }
    }
  }
  return score;
}

function normaliseIdentifier(value: string | undefined | null): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed;
}

function findProfile(catalog: Catalog, query: string): CatalogProfile | null {
  const direct = normaliseIdentifier(query);
  if (!direct) {
    return null;
  }

  const normalisedDirect = direct.toUpperCase();
  const directMatch = catalog.profiles.find((entry) => {
    const profileId = normaliseIdentifier(String(entry.profile_id ?? entry.id ?? ''));
    return profileId?.toUpperCase() === normalisedDirect;
  });
  if (directMatch) {
    return directMatch;
  }

  const tokens = fallbackTokens(direct);
  let bestScore = 0;
  let bestProfile: CatalogProfile | null = null;
  for (const profile of catalog.profiles) {
    const profileTokens = fallbackTokens(
      String(profile.label ?? profile.title ?? profile.name ?? profile.summary ?? ''),
    );
    const score = scoreTokens(profileTokens, tokens);
    if (score > bestScore) {
      bestScore = score;
      bestProfile = profile;
    }
  }
  return bestProfile;
}

function findActivity(catalog: Catalog, query: string): CatalogActivity | null {
  const direct = normaliseIdentifier(query);
  if (!direct) {
    return null;
  }

  const normalisedDirect = direct.toUpperCase();
  const directMatch = catalog.activities.find((entry) => {
    const activityId = normaliseIdentifier(String(entry.activity_id ?? entry.id ?? ''));
    return activityId?.toUpperCase() === normalisedDirect;
  });
  if (directMatch) {
    return directMatch;
  }

  const tokens = fallbackTokens(direct);
  let bestScore = 0;
  let bestActivity: CatalogActivity | null = null;
  for (const activity of catalog.activities) {
    const activityTokens = fallbackTokens(
      String(activity.label ?? activity.title ?? activity.name ?? activity.summary ?? ''),
    );
    const score = scoreTokens(activityTokens, tokens);
    if (score > bestScore) {
      bestScore = score;
      bestActivity = activity;
    }
  }
  return bestActivity;
}

function extractStructuredIntent(intent: string): z.infer<typeof RawIntentSchema> | null {
  const profileMatch = intent.match(/profile\s*[:=]\s*([A-Za-z0-9._-]+)/i);
  const activityMatch = intent.match(/activity\s*[:=]\s*([A-Za-z0-9._-]+)/i);

  if (profileMatch && activityMatch) {
    const parsed = RawIntentSchema.safeParse({
      profile: profileMatch[1],
      activity: activityMatch[1],
    });
    if (parsed.success) {
      return parsed.data;
    }
  }
  const tokens = fallbackTokens(intent);
  if (tokens.length === 0) {
    return null;
  }
  const [first = '', second = ''] = tokens;
  const parsed = RawIntentSchema.safeParse({ profile: first, activity: second });
  return parsed.success ? parsed.data : null;
}

export async function applyIntent(intent: string): Promise<IntentResolution> {
  const catalog = await loadCatalog();
  const structured = extractStructuredIntent(intent) ?? { profile: intent, activity: intent };
  const profile =
    findProfile(catalog, structured.profile) ??
    catalog.profiles.find((entry) => Boolean(entry.profile_id)) ??
    catalog.profiles[0];
  const activity =
    findActivity(catalog, structured.activity) ??
    catalog.activities.find((entry) => Boolean(entry.activity_id)) ??
    catalog.activities[0];

  if (!profile) {
    throw new Error('Unable to resolve profile for intent.');
  }

  if (!activity) {
    throw new Error('Unable to resolve activity for intent.');
  }

  const guardResult = guardIntent({ profile, activity }, catalog, intent);
  if (guardResult.allowed === false) {
    throw new Error(guardResult.message);
  }

  const request = {
    profile_id: profile.profile_id ?? profile.id,
    activity_id: activity.activity_id ?? activity.id,
  } satisfies Record<string, unknown>;

  return {
    profile,
    activity,
    request,
    provenance: {
      intent,
      profile_id: request.profile_id,
      activity_id: request.activity_id,
      corrections: guardResult.corrections,
    },
    response: guardResult.response ?? `Applied ${request.activity_id} to ${request.profile_id}.`,
  } satisfies IntentResolution;
}
