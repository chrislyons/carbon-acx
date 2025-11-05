import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useProfile } from './ProfileContext';

/**
 * LayerContext - Manages profile comparison layers for visualizations
 *
 * Enables side-by-side comparison of user profile against reference profiles
 * (US Average, EU Average, Global Average, Paris Target, etc.)
 */

// ============================================================================
// Types
// ============================================================================

export interface ProfileLayer {
  id: string;
  name: string;
  description: string;
  color: string;
  visible: boolean;
  isUserProfile: boolean;
  /** Annual emissions in kg CO₂ */
  totalEmissions: number;
  /** Optional: Breakdown by sector/category */
  breakdown?: Array<{
    category: string;
    emissions: number;
  }>;
}

interface LayerContextValue {
  layers: ProfileLayer[];
  toggleLayer: (layerId: string) => void;
  setLayerVisibility: (layerId: string, visible: boolean) => void;
  getVisibleLayers: () => ProfileLayer[];
  resetToDefaults: () => void;
}

// ============================================================================
// Context
// ============================================================================

const LayerContext = createContext<LayerContextValue | null>(null);

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY = 'carbon-acx:layer-preferences';
const STORAGE_VERSION = 1;

/**
 * Reference profile data
 * Sources: OWID, IEA, IPCC AR6
 */
const REFERENCE_PROFILES: Omit<ProfileLayer, 'visible'>[] = [
  {
    id: 'us-average',
    name: 'US Average',
    description: 'Average per-capita emissions in the United States',
    color: '#DC2626', // Red
    isUserProfile: false,
    totalEmissions: 16000, // kg CO₂/year
  },
  {
    id: 'eu-average',
    name: 'EU Average',
    description: 'Average per-capita emissions in the European Union',
    color: '#F59E0B', // Amber
    isUserProfile: false,
    totalEmissions: 7000, // kg CO₂/year
  },
  {
    id: 'global-average',
    name: 'Global Average',
    description: 'World average per-capita emissions',
    color: '#6B7280', // Gray
    isUserProfile: false,
    totalEmissions: 4500, // kg CO₂/year
  },
  {
    id: 'paris-target',
    name: 'Paris Target',
    description: '2030 target for 1.5°C pathway (IPCC)',
    color: '#3B82F6', // Blue
    isUserProfile: false,
    totalEmissions: 2000, // kg CO₂/year
  },
];

// ============================================================================
// Utilities
// ============================================================================

interface StoredPreferences {
  version: number;
  visibleLayerIds: string[];
}

function loadPreferences(): string[] | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const parsed: StoredPreferences = JSON.parse(stored);
    if (parsed.version !== STORAGE_VERSION) {
      console.warn('Layer preferences version mismatch, using defaults');
      return null;
    }

    return parsed.visibleLayerIds;
  } catch (error) {
    console.error('Failed to load layer preferences:', error);
    return null;
  }
}

function savePreferences(visibleLayerIds: string[]): void {
  try {
    const payload: StoredPreferences = {
      version: STORAGE_VERSION,
      visibleLayerIds,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.error('Failed to save layer preferences:', error);
  }
}

// ============================================================================
// Provider Component
// ============================================================================

interface LayerProviderProps {
  children: ReactNode;
}

export function LayerProvider({ children }: LayerProviderProps) {
  const { totalEmissions } = useProfile();

  // Initialize layers with default visibility
  const [layers, setLayers] = useState<ProfileLayer[]>(() => {
    const savedPreferences = loadPreferences();
    const defaultVisible = savedPreferences || ['user-profile', 'us-average', 'paris-target'];

    const userLayer: ProfileLayer = {
      id: 'user-profile',
      name: 'Your Profile',
      description: 'Your personal carbon footprint',
      color: '#059669', // Green
      visible: defaultVisible.includes('user-profile'),
      isUserProfile: true,
      totalEmissions,
    };

    const referenceLayers: ProfileLayer[] = REFERENCE_PROFILES.map((ref) => ({
      ...ref,
      visible: defaultVisible.includes(ref.id),
    }));

    return [userLayer, ...referenceLayers];
  });

  // Update user layer when profile changes
  useEffect(() => {
    setLayers((prev) =>
      prev.map((layer) =>
        layer.isUserProfile
          ? { ...layer, totalEmissions }
          : layer
      )
    );
  }, [totalEmissions]);

  // Persist visibility preferences
  useEffect(() => {
    const visibleIds = layers.filter((l) => l.visible).map((l) => l.id);
    savePreferences(visibleIds);
  }, [layers]);

  const toggleLayer = (layerId: string) => {
    setLayers((prev) =>
      prev.map((layer) =>
        layer.id === layerId ? { ...layer, visible: !layer.visible } : layer
      )
    );
  };

  const setLayerVisibility = (layerId: string, visible: boolean) => {
    setLayers((prev) =>
      prev.map((layer) =>
        layer.id === layerId ? { ...layer, visible } : layer
      )
    );
  };

  const getVisibleLayers = (): ProfileLayer[] => {
    return layers.filter((layer) => layer.visible);
  };

  const resetToDefaults = () => {
    setLayers((prev) =>
      prev.map((layer) => ({
        ...layer,
        visible: ['user-profile', 'us-average', 'paris-target'].includes(layer.id),
      }))
    );
  };

  const value: LayerContextValue = {
    layers,
    toggleLayer,
    setLayerVisibility,
    getVisibleLayers,
    resetToDefaults,
  };

  return (
    <LayerContext.Provider value={value}>
      {children}
    </LayerContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useLayers(): LayerContextValue {
  const context = useContext(LayerContext);
  if (!context) {
    throw new Error('useLayers must be used within LayerProvider');
  }
  return context;
}
