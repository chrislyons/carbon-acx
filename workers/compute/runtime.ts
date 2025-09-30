export type OverrideMap = Record<string, number>;

export interface ActivityDefinition {
  id: string;
  label: string;
  category: string;
  layerId: string;
  emissionFactor: number; // grams per unit
  defaultQuantity: number;
  reference: string;
  uncertainty?: number; // expressed as fraction (0.1 => 10%)
}

export interface CitationDefinition {
  key: string;
  text: string;
}

export interface ComputeContext {
  profileId: string;
  overrides: OverrideMap;
}

export interface SankeyNode {
  id: string;
  label: string;
  type?: 'category' | 'activity';
}

export interface SankeyLink {
  source: string;
  target: string;
  category: string;
  layer_id: string;
  values: { mean: number; low?: number | null; high?: number | null };
}

export interface ComputeFigures {
  stacked: {
    data: Array<{
      category: string;
      layer_id: string;
      values: { mean: number; low: number | null; high: number | null };
    }>;
    citation_keys: string[];
  };
  bubble: {
    data: Array<{
      activity_id: string;
      activity_name: string;
      category: string;
      layer_id: string;
      annual_emissions_g: number;
      values: { mean: number; low: number | null; high: number | null };
    }>;
    citation_keys: string[];
  };
  sankey: {
    data: {
      nodes: SankeyNode[];
      links: SankeyLink[];
    };
    citation_keys: string[];
  };
}

export interface ReferenceEntry {
  key: string;
  n: number;
  text: string;
}

export interface ComputeResultPayload {
  manifest: {
    profile_id: string;
    dataset_version: string;
    overrides: OverrideMap;
    generated_at: string;
    sources: string[];
  };
  figures: ComputeFigures;
  references: ReferenceEntry[];
  datasetId: string;
}

export interface ComputeOptions {
  datasetVersion?: string;
  datasetFingerprint?: string;
  backend?: string;
}

const DEFAULT_DATASET_VERSION = 'demo-2024';

const CITATIONS: CitationDefinition[] = [
  {
    key: 'SRC.COMMUTE.AUTO',
    text: 'Transport Canada. Commuter Vehicle Emissions, 2023. https://tc.canada.ca',
  },
  {
    key: 'SRC.COMMUTE.TRANSIT',
    text: 'Canadian Urban Transit Association. Ridership and Emissions Profile, 2023.',
  },
  {
    key: 'SRC.COMMUTE.BIKE',
    text: 'City of Vancouver. Active Transportation Emissions Study, 2022.',
  },
  {
    key: 'SRC.DIET',
    text: 'Agriculture and Agri-Food Canada. Diet-based Life Cycle Assessment, 2022.',
  },
  {
    key: 'SRC.MEDIA',
    text: 'CRTC. Streaming Electricity Intensity in Canadian Households, 2023.',
  },
];

const ACTIVITIES: ActivityDefinition[] = [
  {
    id: 'TRAVEL.COMMUTE.CAR.WORKDAY',
    label: 'Drive to office',
    category: 'Commute',
    layerId: 'professional',
    emissionFactor: 7200,
    defaultQuantity: 1.8,
    reference: 'SRC.COMMUTE.AUTO',
    uncertainty: 0.15,
  },
  {
    id: 'TRAVEL.COMMUTE.TRANSIT.WORKDAY',
    label: 'Transit to office',
    category: 'Commute',
    layerId: 'professional',
    emissionFactor: 2100,
    defaultQuantity: 0.9,
    reference: 'SRC.COMMUTE.TRANSIT',
    uncertainty: 0.2,
  },
  {
    id: 'TRAVEL.COMMUTE.BIKE.WORKDAY',
    label: 'Bike to office',
    category: 'Commute',
    layerId: 'professional',
    emissionFactor: 320,
    defaultQuantity: 0.3,
    reference: 'SRC.COMMUTE.BIKE',
    uncertainty: 0.25,
  },
  {
    id: 'FOOD.DIET.OMNIVORE.WEEK',
    label: 'Omnivore diet',
    category: 'Diet',
    layerId: 'lifestyle',
    emissionFactor: 5400,
    defaultQuantity: 7,
    reference: 'SRC.DIET',
    uncertainty: 0.1,
  },
  {
    id: 'FOOD.DIET.VEGETARIAN.WEEK',
    label: 'Vegetarian diet',
    category: 'Diet',
    layerId: 'lifestyle',
    emissionFactor: 3600,
    defaultQuantity: 0,
    reference: 'SRC.DIET',
    uncertainty: 0.1,
  },
  {
    id: 'FOOD.DIET.VEGAN.WEEK',
    label: 'Vegan diet',
    category: 'Diet',
    layerId: 'lifestyle',
    emissionFactor: 2800,
    defaultQuantity: 0,
    reference: 'SRC.DIET',
    uncertainty: 0.1,
  },
  {
    id: 'MEDIA.STREAM.HD.HOUR.TV',
    label: 'HD streaming',
    category: 'Media',
    layerId: 'lifestyle',
    emissionFactor: 180,
    defaultQuantity: 10.5,
    reference: 'SRC.MEDIA',
    uncertainty: 0.3,
  },
];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function resolveQuantity(definition: ActivityDefinition, overrides: OverrideMap): number {
  const override = overrides[definition.id];
  if (typeof override === 'number' && Number.isFinite(override)) {
    return Math.max(0, override);
  }
  return Math.max(0, definition.defaultQuantity);
}

function round(value: number, precision = 2): number {
  const multiplier = 10 ** precision;
  return Math.round(value * multiplier) / multiplier;
}

function applyUncertainty(mean: number, fraction = 0.1): { low: number | null; high: number | null } {
  if (!Number.isFinite(mean) || mean <= 0) {
    return { low: null, high: null };
  }
  const safeFraction = Math.max(0, fraction);
  return {
    low: round(mean * (1 - safeFraction)),
    high: round(mean * (1 + safeFraction)),
  };
}

function simpleHash(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

export function computeFigures(context: ComputeContext, options: ComputeOptions = {}): ComputeResultPayload {
  const { profileId, overrides } = context;
  const timestamp = new Date().toISOString();
  const datasetVersion = options.datasetVersion?.trim() || DEFAULT_DATASET_VERSION;
  const datasetFingerprint = options.datasetFingerprint?.trim() || `sha256:${simpleHash(datasetVersion)}`;
  const backendLabel = options.backend ?? 'sqlite';

  const bubbleData: ComputeFigures['bubble']['data'] = [];
  const stackedMap = new Map<string, { layer: string; mean: number; low: number | null; high: number | null }>();
  const sankeyNodes: SankeyNode[] = [];
  const sankeyLinks: SankeyLink[] = [];
  const categoryNodeIds = new Map<string, string>();
  const activityNodeIds = new Map<string, string>();
  const usedCitations = new Set<string>();

  for (const definition of ACTIVITIES) {
    const quantityPerWeek = resolveQuantity(definition, overrides);
    if (quantityPerWeek <= 0) {
      continue;
    }
    const annualQuantity = quantityPerWeek * 52;
    const mean = round(annualQuantity * definition.emissionFactor);
    const { low, high } = applyUncertainty(mean, definition.uncertainty ?? 0.1);

    const categoryEntry = stackedMap.get(definition.category) ?? {
      layer: definition.layerId,
      mean: 0,
      low: 0,
      high: 0,
    };
    categoryEntry.mean += mean;
    if (low !== null) {
      categoryEntry.low = (categoryEntry.low ?? 0) + low;
    }
    if (high !== null) {
      categoryEntry.high = (categoryEntry.high ?? 0) + high;
    }
    stackedMap.set(definition.category, categoryEntry);

    bubbleData.push({
      activity_id: definition.id,
      activity_name: definition.label,
      category: definition.category,
      layer_id: definition.layerId,
      annual_emissions_g: mean,
      values: { mean, low, high },
    });

    const categoryKey = definition.category;
    let categoryNodeId = categoryNodeIds.get(categoryKey);
    if (!categoryNodeId) {
      categoryNodeId = `category-${slugify(categoryKey)}`;
      categoryNodeIds.set(categoryKey, categoryNodeId);
      sankeyNodes.push({ id: categoryNodeId, label: categoryKey, type: 'category' });
    }

    let activityNodeId = activityNodeIds.get(definition.id);
    if (!activityNodeId) {
      activityNodeId = `activity-${slugify(definition.id)}`;
      activityNodeIds.set(definition.id, activityNodeId);
      sankeyNodes.push({ id: activityNodeId, label: definition.label, type: 'activity' });
    }

    sankeyLinks.push({
      source: categoryNodeId,
      target: activityNodeId,
      category: definition.category,
      layer_id: definition.layerId,
      values: { mean, low, high },
    });

    usedCitations.add(definition.reference);
  }

  const sortedBubble = bubbleData.sort((a, b) => b.annual_emissions_g - a.annual_emissions_g);
  const stackedData = Array.from(stackedMap.entries())
    .map(([category, entry]) => ({
      category,
      layer_id: entry.layer,
      values: {
        mean: round(entry.mean),
        low: entry.low ? round(entry.low) : null,
        high: entry.high ? round(entry.high) : null,
      },
    }))
    .sort((a, b) => b.values.mean - a.values.mean);

  const citationKeys = Array.from(usedCitations);
  const references = CITATIONS.filter((citation) => usedCitations.has(citation.key)).map(
    (citation, index) => ({
      key: citation.key,
      n: index + 1,
      text: citation.text,
    })
  );

  const manifestSources = CITATIONS.filter((citation) => usedCitations.has(citation.key)).map((citation) => citation.key);

  const hashInput = JSON.stringify({ profileId, overrides, dataset: datasetVersion, backend: backendLabel });
  const datasetId = `${datasetFingerprint}:${simpleHash(hashInput)}`;

  return {
    manifest: {
      profile_id: profileId,
      dataset_version: datasetVersion,
      overrides,
      generated_at: timestamp,
      sources: manifestSources,
    },
    figures: {
      stacked: {
        data: stackedData,
        citation_keys: citationKeys,
      },
      bubble: {
        data: sortedBubble,
        citation_keys: citationKeys,
      },
      sankey: {
        data: { nodes: sankeyNodes, links: sankeyLinks },
        citation_keys: citationKeys,
      },
    },
    references,
    datasetId,
  };
}

export function getDatasetVersion(): string {
  return DEFAULT_DATASET_VERSION;
}

export function getCitations(): CitationDefinition[] {
  return CITATIONS;
}
