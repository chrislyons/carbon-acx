import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { SWRConfig } from 'swr';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useDataset, useReferences } from '../useDataset';
import type { DatasetDetail, ReferenceSummary } from '../../lib/api';
import { loadDataset } from '../../lib/api';

vi.mock('../../lib/api', async () => {
  const actual = await vi.importActual<typeof import('../../lib/api')>('../../lib/api');
  return {
    ...actual,
    loadDataset: vi.fn(actual.loadDataset),
  };
});

describe('useDataset hooks', () => {
  const dataset: DatasetDetail = {
    datasetId: 'dataset-001',
    generatedAt: '2024-10-01T12:00:00Z',
    figureCount: 2,
    manifestPath: '/manifests/dataset-001.json',
    manifestSha256: 'abc123',
    title: 'Test dataset',
    description: 'A dataset for testing',
    figures: [],
  };
  const references: ReferenceSummary[] = [
    {
      referenceId: 'ref-1',
      text: 'Reference one',
      citation: 'Example 2024',
      url: 'https://example.com/1',
      year: 2024,
      layer: 'baseline',
    },
    {
      referenceId: 'ref-2',
      text: 'Reference two',
      citation: null,
      url: 'https://example.com/2',
      year: 2023,
      layer: 'scenario',
    },
  ];

  const payload = { dataset, references };
  const mockedLoadDataset = vi.mocked(loadDataset);

  const createWrapper = (cache = new Map()) =>
    function Wrapper({ children }: { children: ReactNode }) {
      return (
        <SWRConfig value={{ provider: () => cache, dedupingInterval: 0, errorRetryInterval: 10 }}>
          {children}
        </SWRConfig>
      );
    };

  beforeEach(() => {
    mockedLoadDataset.mockResolvedValue(payload);
  });

  afterEach(() => {
    mockedLoadDataset.mockReset();
  });

  it('reuses cached dataset payload across related hooks', async () => {
    const cache = new Map();
    const wrapper = createWrapper(cache);

    const { result: datasetResult } = renderHook(() => useDataset('dataset-001'), { wrapper });
    await waitFor(() => expect(datasetResult.current.data).toEqual(dataset));
    expect(mockedLoadDataset).toHaveBeenCalledTimes(1);

    const { result: referencesResult } = renderHook(() => useReferences('dataset-001'), { wrapper });
    await waitFor(() => expect(referencesResult.current.data).toEqual(references));
    expect(mockedLoadDataset).toHaveBeenCalledTimes(1);
  });

  it('exposes errors returned by the dataset loader', async () => {
    const error = new Error('boom');
    mockedLoadDataset.mockReset();
    mockedLoadDataset.mockRejectedValue(error);

    const { result } = renderHook(() => useDataset('broken'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.error).toBeDefined());
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toContain('boom');
  });

  it('honours fallback data without revalidation when requested', async () => {
    const wrapper = createWrapper();

    const { result } = renderHook(
      () =>
        useDataset('dataset-001', {
          fallbackData: payload,
          revalidateOnMount: false,
        }),
      { wrapper },
    );

    expect(result.current.data).toEqual(dataset);
    expect(mockedLoadDataset).not.toHaveBeenCalled();
  });
});
