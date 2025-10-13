/**
 * Activity Icon Registry
 *
 * Manages SVG icons and logos for activity badges.
 * Provides fallback system for missing icons.
 */

import {
  Car,
  Plane,
  Zap,
  Home,
  ShoppingBag,
  Beef,
  Bike,
  Bus,
  Train,
  Tv,
  Coffee,
  Smartphone,
  Laptop,
  Monitor,
  Music,
  Cloud,
  Download,
  Video,
  MessageSquare,
  Bot,
  Building,
  Utensils,
  Leaf,
  Server,
  HardDrive,
  Radio,
  Wifi,
  Database,
  Package,
  Truck,
  Ship,
  Warehouse,
  Factory,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Icon definition for an activity
 */
export interface ActivityIconDefinition {
  /** Icon type identifier (matches ActivitySummary.iconType) */
  type: string;
  /** Display name */
  name: string;
  /** SVG path (relative to assets/activity-icons/) or external URL */
  svgPath?: string;
  /** Lucide icon component as fallback */
  fallbackIcon?: LucideIcon;
  /** Emoji as last resort fallback */
  emoji?: string;
  /** Brand color (hex) */
  brandColor?: string;
  /**
   * REQUIRED for brand-specific icons: Citation URL(s) for carbon data
   * Brand logos (Netflix, Starbucks, etc.) MUST have citations or they cannot be used
   * Generic icons (car, plane, electricity) don't require citations
   */
  citations?: string[];
  /**
   * Whether this icon requires a citation (true for all brand-specific icons)
   */
  requiresCitation?: boolean;
}

/**
 * Icon registry organized by category
 */
export const ACTIVITY_ICON_REGISTRY: Record<string, ActivityIconDefinition[]> = {
  transport: [
    {
      type: 'car-gasoline',
      name: 'Gasoline Car',
      fallbackIcon: Car,
      emoji: '🚗',
      brandColor: '#DC2626',
    },
    {
      type: 'car-electric',
      name: 'Electric Car',
      fallbackIcon: Car,
      emoji: '⚡',
      brandColor: '#10B981',
    },
    {
      type: 'plane-domestic',
      name: 'Domestic Flight',
      fallbackIcon: Plane,
      emoji: '✈️',
      brandColor: '#3B82F6',
    },
    {
      type: 'plane-international',
      name: 'International Flight',
      fallbackIcon: Plane,
      emoji: '🌍',
      brandColor: '#6366F1',
    },
    {
      type: 'bike',
      name: 'Bicycle',
      fallbackIcon: Bike,
      emoji: '🚴',
      brandColor: '#10B981',
    },
    {
      type: 'bus',
      name: 'Bus',
      fallbackIcon: Bus,
      emoji: '🚌',
      brandColor: '#F59E0B',
    },
    {
      type: 'train',
      name: 'Train',
      fallbackIcon: Train,
      emoji: '🚆',
      brandColor: '#8B5CF6',
    },
  ],

  streaming: [
    {
      type: 'netflix',
      name: 'Netflix',
      // svgPath: 'netflix.svg', // Will be added when SVG + citation is available
      fallbackIcon: Tv,
      emoji: '📺',
      brandColor: '#E50914',
      requiresCitation: true,
      citations: [], // MUST add citation before using Netflix logo
    },
    {
      type: 'youtube',
      name: 'YouTube',
      fallbackIcon: Tv,
      emoji: '▶️',
      brandColor: '#FF0000',
      requiresCitation: true,
      citations: [], // MUST add citation before using YouTube logo
    },
    {
      type: 'spotify',
      name: 'Spotify',
      fallbackIcon: Tv,
      emoji: '🎵',
      brandColor: '#1DB954',
      requiresCitation: true,
      citations: [], // MUST add citation before using Spotify logo
    },
    {
      type: 'twitch',
      name: 'Twitch',
      fallbackIcon: Tv,
      emoji: '🎮',
      brandColor: '#9146FF',
      requiresCitation: true,
      citations: [], // MUST add citation before using Twitch logo
    },
  ],

  shopping: [
    {
      type: 'amazon',
      name: 'Amazon',
      // svgPath: 'amazon.svg', // Will be added when SVG + citation is available
      fallbackIcon: ShoppingBag,
      emoji: '📦',
      brandColor: '#FF9900',
      requiresCitation: true,
      citations: [], // MUST add citation before using Amazon logo
    },
    {
      type: 'walmart',
      name: 'Walmart',
      fallbackIcon: ShoppingBag,
      emoji: '🛒',
      brandColor: '#0071CE',
      requiresCitation: true,
      citations: [], // MUST add citation before using Walmart logo
    },
    {
      type: 'target',
      name: 'Target',
      fallbackIcon: ShoppingBag,
      emoji: '🎯',
      brandColor: '#CC0000',
      requiresCitation: true,
      citations: [], // MUST add citation before using Target logo
    },
  ],

  energy: [
    {
      type: 'electricity-grid',
      name: 'Grid Electricity',
      fallbackIcon: Zap,
      emoji: '⚡',
      brandColor: '#FBBF24',
    },
    {
      type: 'electricity-solar',
      name: 'Solar Power',
      fallbackIcon: Zap,
      emoji: '☀️',
      brandColor: '#F59E0B',
    },
    {
      type: 'natural-gas',
      name: 'Natural Gas',
      fallbackIcon: Home,
      emoji: '🔥',
      brandColor: '#3B82F6',
    },
    {
      type: 'heating-oil',
      name: 'Heating Oil',
      fallbackIcon: Home,
      emoji: '🛢️',
      brandColor: '#374151',
    },
  ],

  food: [
    {
      type: 'coffee',
      name: 'Coffee',
      fallbackIcon: Coffee,
      emoji: '☕',
      brandColor: '#92400E',
    },
    {
      type: 'beef',
      name: 'Beef',
      fallbackIcon: Beef,
      emoji: '🥩',
      brandColor: '#DC2626',
    },
    {
      type: 'chicken',
      name: 'Chicken',
      fallbackIcon: Utensils,
      emoji: '🍗',
      brandColor: '#F59E0B',
    },
    {
      type: 'fish',
      name: 'Fish',
      fallbackIcon: Utensils,
      emoji: '🐟',
      brandColor: '#3B82F6',
    },
    {
      type: 'vegetarian',
      name: 'Vegetarian',
      fallbackIcon: Leaf,
      emoji: '🥗',
      brandColor: '#10B981',
    },
    {
      type: 'meal',
      name: 'Meal',
      fallbackIcon: Utensils,
      emoji: '🍽️',
      brandColor: '#6B7280',
    },
  ],

  tech: [
    {
      type: 'laptop',
      name: 'Laptop',
      fallbackIcon: Laptop,
      emoji: '💻',
      brandColor: '#6B7280',
    },
    {
      type: 'smartphone',
      name: 'Smartphone',
      fallbackIcon: Smartphone,
      emoji: '📱',
      brandColor: '#6B7280',
    },
    {
      type: 'monitor',
      name: 'Monitor',
      fallbackIcon: Monitor,
      emoji: '🖥️',
      brandColor: '#4B5563',
    },
    {
      type: 'television',
      name: 'Television',
      fallbackIcon: Tv,
      emoji: '📺',
      brandColor: '#1F2937',
    },
  ],

  cloud: [
    {
      type: 'cloud-server',
      name: 'Cloud Server',
      fallbackIcon: Server,
      emoji: '☁️',
      brandColor: '#3B82F6',
    },
    {
      type: 'data-center',
      name: 'Data Center',
      fallbackIcon: Database,
      emoji: '🖥️',
      brandColor: '#1F2937',
    },
    {
      type: 'cloud-storage',
      name: 'Cloud Storage',
      fallbackIcon: HardDrive,
      emoji: '💾',
      brandColor: '#8B5CF6',
    },
    {
      type: 'cdn',
      name: 'CDN',
      fallbackIcon: Wifi,
      emoji: '🌐',
      brandColor: '#06B6D4',
    },
  ],

  media: [
    {
      type: 'video-streaming',
      name: 'Video Streaming',
      fallbackIcon: Video,
      emoji: '🎬',
      brandColor: '#DC2626',
    },
    {
      type: 'music-streaming',
      name: 'Music Streaming',
      fallbackIcon: Music,
      emoji: '🎵',
      brandColor: '#10B981',
    },
    {
      type: 'social-media',
      name: 'Social Media',
      fallbackIcon: MessageSquare,
      emoji: '💬',
      brandColor: '#3B82F6',
    },
    {
      type: 'video-conference',
      name: 'Video Conference',
      fallbackIcon: Video,
      emoji: '📹',
      brandColor: '#8B5CF6',
    },
  ],

  ai: [
    {
      type: 'llm-generic',
      name: 'AI Assistant',
      fallbackIcon: Bot,
      emoji: '🤖',
      brandColor: '#8B5CF6',
    },
    {
      type: 'gpt',
      name: 'ChatGPT',
      fallbackIcon: Bot,
      emoji: '🤖',
      brandColor: '#10A37F',
      requiresCitation: true,
      citations: [], // MUST add citation before using
    },
    {
      type: 'claude',
      name: 'Claude',
      fallbackIcon: Bot,
      emoji: '🤖',
      brandColor: '#D97706',
      requiresCitation: true,
      citations: [], // MUST add citation before using
    },
    {
      type: 'gemini',
      name: 'Gemini',
      fallbackIcon: Bot,
      emoji: '🤖',
      brandColor: '#4285F4',
      requiresCitation: true,
      citations: [], // MUST add citation before using
    },
  ],

  buildings: [
    {
      type: 'office-building',
      name: 'Office Building',
      fallbackIcon: Building,
      emoji: '🏢',
      brandColor: '#6B7280',
    },
    {
      type: 'hospital',
      name: 'Hospital',
      fallbackIcon: Building,
      emoji: '🏥',
      brandColor: '#DC2626',
    },
    {
      type: 'residential',
      name: 'Residential',
      fallbackIcon: Home,
      emoji: '🏠',
      brandColor: '#10B981',
    },
  ],

  logistics: [
    {
      type: 'delivery',
      name: 'Delivery',
      fallbackIcon: Package,
      emoji: '📦',
      brandColor: '#F59E0B',
    },
    {
      type: 'trucking',
      name: 'Trucking',
      fallbackIcon: Truck,
      emoji: '🚚',
      brandColor: '#6B7280',
    },
    {
      type: 'shipping',
      name: 'Shipping',
      fallbackIcon: Ship,
      emoji: '🚢',
      brandColor: '#3B82F6',
    },
    {
      type: 'warehouse',
      name: 'Warehouse',
      fallbackIcon: Warehouse,
      emoji: '🏭',
      brandColor: '#78350F',
    },
  ],

  downloads: [
    {
      type: 'download',
      name: 'Download',
      fallbackIcon: Download,
      emoji: '⬇️',
      brandColor: '#3B82F6',
    },
    {
      type: 'game-download',
      name: 'Game Download',
      fallbackIcon: Download,
      emoji: '🎮',
      brandColor: '#8B5CF6',
    },
  ],
};

/**
 * Flat map of all icons by type for quick lookup
 */
export const ICON_TYPE_MAP = new Map<string, ActivityIconDefinition>(
  Object.values(ACTIVITY_ICON_REGISTRY)
    .flat()
    .map((icon) => [icon.type, icon])
);

/**
 * Get icon definition by type
 */
export function getIconDefinition(iconType: string | null | undefined): ActivityIconDefinition | null {
  if (!iconType) return null;
  return ICON_TYPE_MAP.get(iconType) || null;
}

/**
 * Get all icon types (for documentation/testing)
 */
export function getAllIconTypes(): string[] {
  return Array.from(ICON_TYPE_MAP.keys());
}

/**
 * Get icons by category
 */
export function getIconsByCategory(category: string): ActivityIconDefinition[] {
  return ACTIVITY_ICON_REGISTRY[category] || [];
}

/**
 * Get all categories
 */
export function getIconCategories(): string[] {
  return Object.keys(ACTIVITY_ICON_REGISTRY);
}

/**
 * Validate that brand-specific icons have required citations
 * Returns list of icons missing citations
 */
export function validateCitations(): Array<{ type: string; name: string }> {
  const missingCitations: Array<{ type: string; name: string }> = [];

  Object.values(ACTIVITY_ICON_REGISTRY).flat().forEach((icon) => {
    if (icon.requiresCitation && (!icon.citations || icon.citations.length === 0)) {
      missingCitations.push({ type: icon.type, name: icon.name });
    }
  });

  return missingCitations;
}

/**
 * Check if an icon can be safely used (has citations if required)
 */
export function canUseIcon(iconType: string): boolean {
  const icon = getIconDefinition(iconType);
  if (!icon) return false;

  // If it requires citation, check that citations exist
  if (icon.requiresCitation) {
    return icon.citations !== undefined && icon.citations.length > 0;
  }

  // Generic icons don't require citations
  return true;
}
