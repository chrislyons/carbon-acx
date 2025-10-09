import useSWR, { type SWRConfiguration, type SWRResponse } from 'swr';

import type {
  ActivitySummary,
  DatasetDetail,
  DatasetFigure,
  DatasetSummary,
  ReferenceSummary,
  SectorSummary,
} from '../lib/api';
import { loadActivities, loadDataset, loadDatasets, loadSectors } from '../lib/api';

const defaultSWRConfig = {
  revalidateOnFocus: false,
  revalidateIfStale: false,
} satisfies SWRConfiguration<unknown, Error>;

type DatasetPayload = Awaited<ReturnType<typeof loadDataset>>;
type DatasetKey = readonly ['dataset', string];
type DatasetPayloadResponse = SWRResponse<DatasetPayload, Error>;
type DatasetPayloadConfig = SWRConfiguration<DatasetPayload, Error>;

type DerivedResponse<Data> = Omit<DatasetPayloadResponse, 'data'> & { data: Data };

type DatasetSelectConfig<Data> = DatasetPayloadConfig & {
  select?: (payload: DatasetPayload) => Data;
};

function useDatasetResource<Data>(datasetId: string | undefined, config?: DatasetSelectConfig<Data>) {
  const key = datasetId ? (['dataset', datasetId] as DatasetKey) : null;
  return useSWR<DatasetPayload, Error>(
    key,
    async ([, id]: DatasetKey) => loadDataset(id),
    {
      ...defaultSWRConfig,
      keepPreviousData: true,
      ...config,
    },
  );
}

export function useSectors(config?: SWRConfiguration<SectorSummary[], Error>) {
  return useSWR<SectorSummary[], Error>(
    ['sectors'],
    () => loadSectors(),
    {
      ...defaultSWRConfig,
      ...config,
    },
  );
}

export function useDatasets(config?: SWRConfiguration<DatasetSummary[], Error>) {
  return useSWR<DatasetSummary[], Error>(
    ['datasets'],
    () => loadDatasets(),
    {
      ...defaultSWRConfig,
      ...config,
    },
  );
}

export function useActivities(
  sectorId: string | undefined,
  config?: SWRConfiguration<ActivitySummary[], Error>,
) {
  const key = sectorId ? (['activities', sectorId] as const) : null;
  return useSWR<ActivitySummary[], Error>(
    key,
    ([, id]: readonly ['activities', string]) => loadActivities(id),
    {
      ...defaultSWRConfig,
      ...config,
    },
  );
}

export function useDataset(
  datasetId: string | undefined,
  config?: DatasetPayloadConfig,
): DerivedResponse<DatasetDetail | undefined> {
  const response = useDatasetResource(datasetId, config);
  return {
    ...response,
    data: response.data?.dataset,
  } as DerivedResponse<DatasetDetail | undefined>;
}

export function useDatasetFigures(
  datasetId: string | undefined,
  config?: DatasetPayloadConfig,
): DerivedResponse<DatasetFigure[] | undefined> {
  const response = useDatasetResource(datasetId, {
    ...config,
    select: (payload) => payload.dataset.figures,
  });
  return {
    ...response,
    data: response.data?.dataset.figures,
  } as DerivedResponse<DatasetFigure[] | undefined>;
}

export function useReferences(
  datasetId: string | undefined,
  config?: DatasetPayloadConfig,
): DerivedResponse<ReferenceSummary[] | undefined> {
  const response = useDatasetResource(datasetId, {
    ...config,
    select: (payload) => payload.references,
  });
  return {
    ...response,
    data: response.data?.references,
  } as DerivedResponse<ReferenceSummary[] | undefined>;
}
