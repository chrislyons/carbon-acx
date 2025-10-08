import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Catalog } from '../../lib/catalog';
import { ScenarioCompare } from '../ScenarioCompare';

const catalog: Catalog = {
  activities: [
    {
      activity_id: 'ACT.ALPHA.ONE',
      label: 'Alpha line retrofit',
      category: 'alpha_ops',
      layer_id: 'layer_main'
    },
    {
      activity_id: 'ACT.BETA.TWO',
      label: 'Beta workstation swap',
      category: 'beta_ops',
      layer_id: 'layer_main'
    },
    {
      activity_id: 'ACT.ALPHA.THREE',
      label: 'Alpha pilot program',
      category: 'alpha_ops',
      layer_id: 'layer_remote'
    },
    {
      activity_id: 'ACT.GAMMA.FOUR',
      label: 'Gamma furnace closure',
      category: 'gamma_ops',
      layer_id: 'layer_remote'
    },
    {
      activity_id: 'ACT.GAMMA.FIVE',
      label: 'Gamma service scope',
      category: 'gamma_ops',
      layer_id: 'layer_remote'
    }
  ],
  profiles: []
};

const diff = {
  changed: [
    {
      activity_id: 'ACT.ALPHA.ONE',
      delta: 4.5678,
      total_base: 20.1234,
      total_compare: 24.6912
    },
    {
      activity_id: 'ACT.BETA.TWO',
      delta: -5.3,
      total_base: 15.5,
      total_compare: 10.2
    },
    {
      activity_id: 'ACT.GAMMA.FIVE',
      delta: 1.2,
      total_base: 8.25,
      total_compare: 9.45
    }
  ],
  added: [
    {
      activity_id: 'ACT.ALPHA.THREE',
      delta: 3.3333,
      total_base: null,
      total_compare: 3.3333
    }
  ],
  removed: [
    {
      activity_id: 'ACT.GAMMA.FOUR',
      delta: -5.75,
      total_base: 5.75,
      total_compare: null
    }
  ]
};

const baseManifest = {
  scenario_hash: 'baseline',
  manifest_hash: 'manifest-base',
  sources: ['SRC.ONE', 'SRC.TWO']
};

const compareManifest = {
  scenario_hash: 'alt',
  manifest_hash: 'manifest-alt',
  sources: ['SRC.TWO', 'SRC.THREE']
};

describe('ScenarioCompare', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/compare?base=baseline&compare=alt');
  });

  it('renders category deltas by default with summary cards', () => {
    render(
      <ScenarioCompare
        diff={diff}
        catalog={catalog}
        baseHash="baseline"
        compareHash="alt"
        baseManifest={baseManifest}
        compareManifest={compareManifest}
      />
    );

    expect(screen.getByTestId('scenario-compare-chart')).toBeInTheDocument();
    const summaryNet = screen.getByTestId('scenario-compare-summary-net');
    expect(summaryNet).toHaveTextContent('−1.9489 kg CO₂e');
    expect(summaryNet).toHaveTextContent('Baseline 49.6234 kg → Compare 47.6745 kg');
    expect(summaryNet).toHaveTextContent('(-3.93%)');

    const summaryUp = screen.getByTestId('scenario-compare-summary-up');
    expect(summaryUp).toHaveTextContent('Alpha Ops');
    expect(summaryUp).toHaveTextContent('+7.9011 kg CO₂e');

    const summaryDown = screen.getByTestId('scenario-compare-summary-down');
    expect(summaryDown).toHaveTextContent('Beta Ops');
    expect(summaryDown).toHaveTextContent('−5.3 kg CO₂e');

    expect(screen.getByTestId('scenario-compare-category')).toBeInTheDocument();
    expect(new URLSearchParams(window.location.search).get('view')).toBe('category');
  });

  it('switches to activity view and updates the URL parameter', () => {
    render(
      <ScenarioCompare
        diff={diff}
        catalog={catalog}
        baseHash="baseline"
        compareHash="alt"
        baseManifest={baseManifest}
        compareManifest={compareManifest}
      />
    );

    const activityButton = screen.getByTestId('scenario-compare-toggle-activity');
    fireEvent.click(activityButton);

    expect(screen.getByTestId('scenario-compare-activity')).toBeInTheDocument();
    expect(screen.queryByTestId('scenario-compare-category')).not.toBeInTheDocument();
    expect(new URLSearchParams(window.location.search).get('view')).toBe('activity');
  });
});

describe('ScenarioCompare export', () => {
  it('falls back to blob download when filesystem export is unavailable', async () => {
    const user = userEvent.setup();
    const createObjectURL = vi.fn().mockReturnValue('blob:scenario');
    const revokeObjectURL = vi.fn();
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectURL
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectURL
    });

    render(
      <ScenarioCompare
        diff={diff}
        catalog={catalog}
        baseHash="baseline"
        compareHash="alt"
        baseManifest={baseManifest}
        compareManifest={compareManifest}
      />
    );

    const exportButton = screen.getByTestId('scenario-compare-export');
    await user.click(exportButton);

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);

    if (typeof originalCreateObjectURL === 'function') {
      Object.defineProperty(URL, 'createObjectURL', {
        configurable: true,
        value: originalCreateObjectURL
      });
    } else {
      delete (URL as Record<string, unknown>).createObjectURL;
    }
    if (typeof originalRevokeObjectURL === 'function') {
      Object.defineProperty(URL, 'revokeObjectURL', {
        configurable: true,
        value: originalRevokeObjectURL
      });
    } else {
      delete (URL as Record<string, unknown>).revokeObjectURL;
    }
  });
});
