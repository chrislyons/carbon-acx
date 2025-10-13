import { useMemo } from 'react';
import { useLayers } from '../contexts/LayerContext';
import type { ComparativeDataPoint } from '../components/charts/ComparativeBarChart';

/**
 * useLayerChartData - Transform layer data for chart visualization
 *
 * Provides layer data in the format expected by ComparativeBarChart
 */

export function useLayerChartData() {
  const { layers, getVisibleLayers } = useLayers();
  const visibleLayers = getVisibleLayers();

  // Transform layers into chart data points
  const chartData: ComparativeDataPoint[] = useMemo(() => {
    return visibleLayers.map((layer) => ({
      category: layer.name,
      value: layer.totalEmissions,
      color: layer.color,
      label: layer.description,
      baseline: 4500, // Global average as baseline
    }));
  }, [visibleLayers]);

  // Sort by emissions (descending)
  const sortedChartData = useMemo(() => {
    return [...chartData].sort((a, b) => b.value - a.value);
  }, [chartData]);

  return {
    chartData: sortedChartData,
    visibleLayers,
    allLayers: layers,
  };
}
