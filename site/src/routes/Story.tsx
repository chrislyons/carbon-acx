import { useCallback, useEffect, useMemo, useState } from 'react';

import { StorySection } from '../components/StorySection';
import { compute } from '../lib/api';
import { formatEmission, formatKilograms } from '../lib/format';
import {
  buildReferenceLookup,
  formatReferenceHint,
  resolveReferenceIndices,
  type ReferenceCarrier
} from '../lib/references';
import type { ComputeResult } from '../state/profile';

const DEFAULT_PROFILE_ID = 'PRO.TO.24_39.HYBRID.2025';

interface ActivityDatum extends ReferenceCarrier {
  id: string;
  name: string;
  emissions: number;
}

type StoryStatus = 'idle' | 'loading' | 'success' | 'error';

type SectionKey = 'transport' | 'food' | 'online' | 'summary';

interface StorySectionContent {
  key: SectionKey;
  id: string;
  title: string;
  eyebrow: string;
  statLabel: string;
  statValue: string;
  microCopy: string;
  referenceHint: string;
}

function normaliseReferences(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : null))
    .filter((entry): entry is string => Boolean(entry));
}

function normaliseBubbleData(value: unknown): ActivityDatum[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }
      const record = entry as Record<string, unknown>;
      const rawId = record.activity_id;
      if (typeof rawId !== 'string' || !rawId.trim()) {
        return null;
      }
      const values = (record.values as Record<string, unknown> | undefined) ?? undefined;
      const annual = record.annual_emissions_g;
      let emissions: number | null = null;
      if (typeof annual === 'number' && Number.isFinite(annual)) {
        emissions = annual;
      } else if (values && typeof values.mean === 'number' && Number.isFinite(values.mean)) {
        emissions = values.mean;
      }
      if (emissions === null) {
        return null;
      }
      const nameCandidate = record.activity_name;
      const name = typeof nameCandidate === 'string' && nameCandidate.trim() ? nameCandidate : rawId;
      const citationKeys = Array.isArray(record.citation_keys)
        ? (record.citation_keys.filter((key): key is string => typeof key === 'string' && key.trim().length > 0))
        : undefined;
      const hoverIndices = Array.isArray(record.hover_reference_indices)
        ? (record.hover_reference_indices.filter((index): index is number =>
            typeof index === 'number' && Number.isFinite(index)
          ))
        : undefined;
      const datum: ActivityDatum = {
        id: rawId,
        name,
        emissions,
        citation_keys: citationKeys,
        hover_reference_indices: hoverIndices
      };
      return datum;
    })
    .filter((entry): entry is ActivityDatum => Boolean(entry));
}

function formatKilogramsFromGrams(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return '—';
  }
  return formatKilograms(value / 1_000);
}

function formatShare(value: number | null): string {
  if (value == null || !Number.isFinite(value)) {
    return '—';
  }
  return `${Math.round(value)}%`;
}

function matchesPrefixes(id: string, prefixes: readonly string[]): boolean {
  const upperId = id.toUpperCase();
  return prefixes.some((prefix) => upperId.startsWith(prefix));
}

function combineCarriers(carriers: readonly ReferenceCarrier[]): ReferenceCarrier {
  const citation = new Set<string>();
  const hover = new Set<number>();
  carriers.forEach((carrier) => {
    const keys = carrier.citation_keys;
    if (Array.isArray(keys)) {
      keys.forEach((key) => {
        if (typeof key === 'string' && key.trim()) {
          citation.add(key);
        }
      });
    }
    const indices = carrier.hover_reference_indices;
    if (Array.isArray(indices)) {
      indices.forEach((value) => {
        if (typeof value === 'number' && Number.isFinite(value)) {
          hover.add(Math.trunc(value));
        }
      });
    }
  });
  return {
    citation_keys: citation.size > 0 ? Array.from(citation) : undefined,
    hover_reference_indices: hover.size > 0 ? Array.from(hover) : undefined
  };
}

function calculateSectionContent(
  activities: readonly ActivityDatum[],
  referenceLookup: ReadonlyMap<string, number>,
  references: readonly string[]
): Record<SectionKey, StorySectionContent> {
  const totalEmissions = activities.reduce((sum, datum) => sum + datum.emissions, 0);

  const resolveTotal = (prefixes: readonly string[]) =>
    activities
      .filter((datum) => matchesPrefixes(datum.id, prefixes))
      .reduce(
        (acc, datum) => {
          acc.total += datum.emissions;
          acc.carriers.push(datum);
          return acc;
        },
        { total: 0, carriers: [] as ActivityDatum[] }
      );

  const transport = resolveTotal(['TRAVEL.', 'TRANSPORT.']);
  const food = resolveTotal(['FOOD.']);
  const online = resolveTotal(['MEDIA.', 'DIGITAL.', 'ONLINE.', 'ICT.']);

  const summaryCarrier = combineCarriers(activities);

  const sections: Record<SectionKey, StorySectionContent> = {
    transport: {
      key: 'transport',
      id: 'story-transport',
      title: 'Transport: mapping the commute cadence',
      eyebrow: 'Transport',
      statLabel: 'Annual commute emissions',
      statValue: formatEmission(transport.total),
      microCopy: `Your commute mix contributes ${formatKilogramsFromGrams(
        transport.total
      )} of CO₂e each year across car, transit, and bike trips.`,
      referenceHint: formatReferenceHint(
        resolveReferenceIndices(combineCarriers(transport.carriers), referenceLookup)
      )
    },
    food: {
      key: 'food',
      id: 'story-food',
      title: 'Food: diet-driven footprints',
      eyebrow: 'Food',
      statLabel: 'Annual diet emissions',
      statValue: formatEmission(food.total),
      microCopy: `Weekly diet choices add ${formatKilogramsFromGrams(
        food.total
      )} of CO₂e over the year for this profile.`,
      referenceHint: formatReferenceHint(
        resolveReferenceIndices(combineCarriers(food.carriers), referenceLookup)
      )
    },
    online: {
      key: 'online',
      id: 'story-online',
      title: 'Online: streaming and device demand',
      eyebrow: 'Online',
      statLabel: 'Annual media emissions',
      statValue: formatEmission(online.total),
      microCopy: `Streaming and device use add ${formatKilogramsFromGrams(
        online.total
      )} of CO₂e annually through media consumption.`,
      referenceHint: formatReferenceHint(
        resolveReferenceIndices(combineCarriers(online.carriers), referenceLookup)
      )
    },
    summary: {
      key: 'summary',
      id: 'story-summary',
      title: 'Summary: aggregating the footprint',
      eyebrow: 'Summary',
      statLabel: 'Total tracked emissions',
      statValue: formatEmission(totalEmissions),
      microCopy: `Combined activities reach ${formatKilogramsFromGrams(
        totalEmissions
      )} each year with transport taking ${formatShare(
        totalEmissions > 0 ? (transport.total / totalEmissions) * 100 : null
      )} of the load.`,
      referenceHint: formatReferenceHint(resolveReferenceIndices(summaryCarrier, referenceLookup))
    }
  };

  (Object.values(sections) as StorySectionContent[]).forEach((section) => {
    if (!section.referenceHint || section.referenceHint.trim().length === 0) {
      section.referenceHint = references.length > 0 ? '[—]' : '';
    }
  });

  return sections;
}

function StoryReferencesDrawer({
  open,
  references,
  onToggle
}: {
  open: boolean;
  references: readonly string[];
  onToggle: () => void;
}): JSX.Element {
  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onToggle();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onToggle]);

  return (
    <aside className="mx-auto mt-16 w-full max-w-3xl rounded-3xl border border-slate-800/80 bg-slate-950/70 p-8 shadow-xl shadow-slate-950/40">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">References</h2>
          <p className="mt-1 text-sm text-slate-400">
            Supporting sources for the story. Press <kbd className="rounded bg-slate-800 px-1">Esc</kbd> to close.
          </p>
        </div>
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-slate-700/70 bg-slate-900/60 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-100 transition hover:border-slate-500 hover:text-sky-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
          >
          <span className="h-1.5 w-1.5 rounded-full bg-sky-400" aria-hidden="true" />
          {open ? 'Hide sources' : 'View sources'}
        </button>
      </div>
      <div hidden={!open} className="mt-6 space-y-4 text-sm text-slate-300">
        {references.length === 0 ? (
          <p className="text-sm text-slate-300">No references available for this story.</p>
        ) : (
          <ol className="space-y-3" aria-label="Story references">
            {references.map((reference, index) => (
              <li
                key={`${index}-${reference}`}
                className="rounded-2xl border border-slate-800/80 bg-slate-950/40 p-4 text-left shadow-inner shadow-slate-950/30"
              >
                <span className="text-xs uppercase tracking-[0.35em] text-sky-400">[{index + 1}]</span>
                <p className="mt-2 text-sm text-slate-200">{reference.replace(/^\[[0-9]+\]\s*/, '')}</p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </aside>
  );
}

export default function Story(): JSX.Element {
  const [status, setStatus] = useState<StoryStatus>('idle');
  const [result, setResult] = useState<ComputeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState<boolean>(false);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    const fetchStory = async () => {
      setStatus('loading');
      setError(null);
      try {
        const response = await compute<ComputeResult>(
          { profile_id: DEFAULT_PROFILE_ID, overrides: {} },
          { signal: controller.signal }
        );
        if (cancelled) {
          return;
        }
        setResult(response);
        setStatus('success');
      } catch (requestError) {
        if (cancelled) {
          return;
        }
        const message =
          requestError instanceof Error ? requestError.message : 'Unable to load compute snapshot';
        setError(message);
        setStatus('error');
      }
    };

    fetchStory();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  const references = useMemo(() => normaliseReferences(result?.references), [result]);

  const manifestSources = useMemo(() => {
    const sources = Array.isArray(result?.manifest?.sources)
      ? (result?.manifest?.sources as string[])
      : [];
    if (sources.length > 0) {
      return sources;
    }
    const collected: string[] = [];
    const pushUnique = (value: unknown) => {
      if (!Array.isArray(value)) {
        return;
      }
      value.forEach((entry) => {
        if (typeof entry === 'string' && entry.trim() && !collected.includes(entry)) {
          collected.push(entry);
        }
      });
    };
    pushUnique(result?.figures?.stacked?.citation_keys);
    pushUnique(result?.figures?.bubble?.citation_keys);
    pushUnique(result?.figures?.sankey?.citation_keys);
    pushUnique(result?.figures?.feedback?.citation_keys);
    return collected;
  }, [result]);

  const referenceLookup = useMemo(
    () => buildReferenceLookup(manifestSources),
    [manifestSources]
  );

  const activities = useMemo(
    () => normaliseBubbleData(result?.figures?.bubble?.data),
    [result]
  );

  const sections = useMemo(
    () => calculateSectionContent(activities, referenceLookup, references),
    [activities, referenceLookup, references]
  );

  const handleBack = useCallback(() => {
    if (typeof window !== 'undefined') {
      if (window.history.length > 1) {
        window.history.back();
        return;
      }
      window.location.href = '/';
    }
  }, []);

  const handleOpenReferences = useCallback(() => {
    setDrawerOpen(true);
  }, []);

  const handleToggleDrawer = useCallback(() => {
    setDrawerOpen((previous) => !previous);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950/95 to-slate-950 text-slate-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col px-6 py-10 lg:py-16">
        <header className="flex flex-col gap-6 border-b border-slate-900 pb-10">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-800 bg-slate-950/70 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200 transition hover:border-slate-600 hover:text-sky-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
          >
            <span aria-hidden="true">←</span>
            Back to dashboard
          </button>
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.4em] text-sky-400">Story mode</p>
            <h1 className="text-3xl font-semibold text-slate-100">A guided path through the compute snapshot</h1>
            <p className="max-w-2xl text-base text-slate-300">
              Scroll to explore how transport, food, and online habits stack up for this reference profile. Each section activates as it enters view.
            </p>
          </div>
        </header>
        <main className="flex flex-col gap-16 py-12">
          {status === 'loading' ? (
            <div className="mx-auto w-full max-w-3xl space-y-6">
              {[0, 1, 2].map((index) => (
                <div
                  // eslint-disable-next-line react/no-array-index-key
                  key={index}
                  className="h-48 animate-pulse rounded-3xl border border-slate-900/80 bg-slate-900/40"
                />
              ))}
            </div>
          ) : null}
          {status === 'error' ? (
            <div className="mx-auto w-full max-w-3xl rounded-3xl border border-rose-900/60 bg-rose-950/50 p-8 text-rose-100">
              <h2 className="text-lg font-semibold">Unable to load story</h2>
              <p className="mt-2 text-sm text-rose-200">{error ?? 'An unexpected error occurred while requesting /api/compute.'}</p>
            </div>
          ) : null}
          {status === 'success' ? (
            <div className="space-y-16">
              <StorySection
                id={sections.transport.id}
                title={sections.transport.title}
                eyebrow={sections.transport.eyebrow}
                statLabel={sections.transport.statLabel}
                statValue={sections.transport.statValue}
                microCopy={sections.transport.microCopy}
                referenceHint={sections.transport.referenceHint}
                onRequestReferences={handleOpenReferences}
              />
              <StorySection
                id={sections.food.id}
                title={sections.food.title}
                eyebrow={sections.food.eyebrow}
                statLabel={sections.food.statLabel}
                statValue={sections.food.statValue}
                microCopy={sections.food.microCopy}
                referenceHint={sections.food.referenceHint}
                onRequestReferences={handleOpenReferences}
              />
              <StorySection
                id={sections.online.id}
                title={sections.online.title}
                eyebrow={sections.online.eyebrow}
                statLabel={sections.online.statLabel}
                statValue={sections.online.statValue}
                microCopy={sections.online.microCopy}
                referenceHint={sections.online.referenceHint}
                onRequestReferences={handleOpenReferences}
              />
              <StorySection
                id={sections.summary.id}
                title={sections.summary.title}
                eyebrow={sections.summary.eyebrow}
                statLabel={sections.summary.statLabel}
                statValue={sections.summary.statValue}
                microCopy={sections.summary.microCopy}
                referenceHint={sections.summary.referenceHint}
                onRequestReferences={handleOpenReferences}
              />
            </div>
          ) : null}
        </main>
        <StoryReferencesDrawer open={drawerOpen} references={references} onToggle={handleToggleDrawer} />
      </div>
    </div>
  );
}
