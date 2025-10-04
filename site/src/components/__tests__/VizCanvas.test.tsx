import '@testing-library/jest-dom';
import { render, screen, within } from '@testing-library/react';

import type { BubbleDatum } from '../Bubble';
import type { SankeyData } from '../Sankey';
import type { StackedDatum } from '../Stacked';
import { VizCanvas } from '../VizCanvas';
import type { ProfileStatus } from '../../state/profile';

const profileState = {
  profileId: 'mock-profile',
  controls: {
    commuteDaysPerWeek: 3,
    modeSplit: { car: 60, transit: 30, bike: 10 },
    diet: 'omnivore' as const,
    streamingHoursPerDay: 1
  },
  overrides: {},
  status: 'idle' as ProfileStatus,
  result: null,
  error: null,
  refresh: () => {},
  primaryLayer: 'professional',
  availableLayers: ['professional'],
  activeLayers: ['professional'],
  activeReferenceKeys: [] as string[],
  activeReferences: [] as string[],
  setActiveLayers: () => {},
  setCommuteDays: () => {},
  setModeSplit: () => {},
  setDiet: () => {},
  setStreamingHours: () => {},
  setControlsState: () => {},
  setProfileId: () => {}
};

vi.mock('../../state/profile', () => ({
  useProfile: () => profileState
}));

vi.mock('../../lib/useLayerCatalog', () => ({
  useLayerCatalog: () => ({ layers: [], audit: null, loading: false, error: null })
}));

vi.mock('../../lib/api', () => ({
  USE_COMPUTE_API: false
}));

const stackedSample = [
  {
    category: 'Operations',
    values: { mean: 1000 }
  },
  {
    category: 'Facilities',
    values: { mean: 500 }
  }
] satisfies StackedDatum[];

const bubbleSample = [
  {
    activity_id: 'OPS',
    activity_name: 'Operations',
    category: 'Operations',
    values: { mean: 1000 }
  },
  {
    activity_id: 'FAC',
    activity_name: 'Facilities',
    category: 'Facilities',
    values: { mean: 500 }
  }
] satisfies BubbleDatum[];

const sankeySample = {
  nodes: [
    { id: 'category:Operations', label: 'Operations' },
    { id: 'category:Facilities', label: 'Facilities' },
    { id: 'activity:OPS', label: 'Operations' },
    { id: 'activity:FAC', label: 'Facilities' }
  ],
  links: [
    {
      source: 'category:Operations',
      target: 'activity:OPS',
      layer_id: 'professional',
      values: { mean: 1000 }
    },
    {
      source: 'category:Facilities',
      target: 'activity:FAC',
      layer_id: 'professional',
      values: { mean: 500 }
    }
  ]
} satisfies SankeyData;

describe('VizCanvas', () => {
  beforeEach(() => {
    profileState.status = 'success';
    profileState.error = null;
    profileState.availableLayers = ['professional'];
    profileState.activeLayers = ['professional'];
    profileState.activeReferenceKeys = [];
    profileState.activeReferences = [];
    profileState.refresh = vi.fn();
    profileState.setActiveLayers = vi.fn();
    profileState.result = {
      datasetId: '2024.01',
      manifest: {
        dataset_version: '2024.01',
        generated_at: '2024-01-01T00:00:00Z'
      },
      figures: {
        stacked: { data: stackedSample },
        bubble: { data: bubbleSample },
        sankey: { data: sankeySample }
      },
      references: []
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('keeps total emissions aligned across summaries', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    render(<VizCanvas stage="activity" />);

    expect(screen.getByText('Total emissions')).toBeInTheDocument();
    expect(screen.getAllByText('1.50 kg CO₂e').length).toBeGreaterThan(0);
    const activitiesCard = screen.getByText('Activities tracked').closest('div');
    expect(activitiesCard).not.toBeNull();
    if (activitiesCard) {
      expect(within(activitiesCard).getByText('2')).toBeInTheDocument();
    }

    expect(screen.getByText('67% of tracked categories')).toBeInTheDocument();
    expect(screen.getByText('67% of activity emissions')).toBeInTheDocument();
    expect(screen.getByText('33% of mapped flow')).toBeInTheDocument();

    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
