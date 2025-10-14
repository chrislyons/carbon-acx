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

/**
 * Auto-assign icon type based on activity name and category
 * Uses keyword matching to find the most appropriate icon
 */
export function inferIconType(activityName: string | null, category: string | null): string | null {
  if (!activityName) return null;

  const name = activityName.toLowerCase();
  const cat = category?.toLowerCase() || '';

  // Streaming & Media
  if (name.includes('netflix')) return 'netflix';
  if (name.includes('youtube')) return 'youtube';
  if (name.includes('spotify')) return 'spotify';
  if (name.includes('twitch')) return 'twitch';
  if (name.includes('hd video') || name.includes('stream') || name.includes('streaming')) return 'video-streaming';
  if (name.includes('music')) return 'music-streaming';
  if (name.includes('social') || name.includes('facebook') || name.includes('instagram') || name.includes('tiktok')) return 'social-media';
  if (name.includes('conference') || name.includes('zoom') || name.includes('video call')) return 'video-conference';

  // Transport
  if (name.includes('car') && name.includes('electric')) return 'car-electric';
  if (name.includes('car') || name.includes('gasoline') || name.includes('automobile')) return 'car-gasoline';
  if (name.includes('plane') || name.includes('flight') && name.includes('international')) return 'plane-international';
  if (name.includes('plane') || name.includes('flight')) return 'plane-domestic';
  if (name.includes('bike') || name.includes('bicycle') || name.includes('cycling')) return 'bike';
  if (name.includes('bus')) return 'bus';
  if (name.includes('train') || name.includes('rail') || name.includes('subway') || name.includes('metro')) return 'train';

  // Shopping & Logistics
  if (name.includes('amazon')) return 'amazon';
  if (name.includes('walmart')) return 'walmart';
  if (name.includes('target')) return 'target';
  if (name.includes('delivery') || name.includes('parcel')) return 'delivery';
  if (name.includes('truck')) return 'trucking';
  if (name.includes('ship') || name.includes('maritime') || name.includes('freight')) return 'shipping';
  if (name.includes('warehouse') || name.includes('storage')) return 'warehouse';

  // Food
  if (name.includes('coffee')) return 'coffee';
  if (name.includes('beef')) return 'beef';
  if (name.includes('chicken') || name.includes('poultry')) return 'chicken';
  if (name.includes('fish') || name.includes('seafood')) return 'fish';
  if (name.includes('vegetarian') || name.includes('veg') || name.includes('plant')) return 'vegetarian';
  if (name.includes('meal') || name.includes('food') || cat.includes('food')) return 'meal';

  // Energy
  if (name.includes('solar')) return 'electricity-solar';
  if (name.includes('electricity') || name.includes('power') || name.includes('grid')) return 'electricity-grid';
  if (name.includes('gas') || name.includes('natural gas')) return 'natural-gas';
  if (name.includes('oil') || name.includes('heating')) return 'heating-oil';

  // Tech & Devices
  if (name.includes('laptop') || name.includes('notebook')) return 'laptop';
  if (name.includes('smartphone') || name.includes('phone') || name.includes('mobile')) return 'smartphone';
  if (name.includes('monitor') || name.includes('display')) return 'monitor';
  if (name.includes('television') || name.includes('tv')) return 'television';

  // Cloud & Infrastructure
  if (name.includes('llm') || name.includes('gpt') || name.includes('chatgpt')) return 'gpt';
  if (name.includes('claude')) return 'claude';
  if (name.includes('gemini')) return 'gemini';
  if (name.includes('ai') || name.includes('assistant') || name.includes('inference')) return 'llm-generic';
  if (name.includes('cdn') || name.includes('edge')) return 'cdn';
  if (name.includes('server') || name.includes('cloud') && name.includes('storage')) return 'cloud-storage';
  if (name.includes('data center') || name.includes('datacenter')) return 'data-center';
  if (name.includes('cloud') || name.includes('colocation')) return 'cloud-server';

  // Downloads
  if (name.includes('download') && (name.includes('game') || name.includes('gaming'))) return 'game-download';
  if (name.includes('download')) return 'download';

  // Buildings & Infrastructure
  if (name.includes('hospital')) return 'hospital';
  if (name.includes('office') || name.includes('building') || cat.includes('construction')) return 'office-building';
  if (name.includes('home') || name.includes('residential')) return 'residential';
  if (name.includes('warehouse')) return 'warehouse';
  if (name.includes('factory') || name.includes('plant') || name.includes('facility')) return 'factory';

  // Transit & Commute
  if (name.includes('ttc') || name.includes('metro') || name.includes('subway')) return 'train';
  if (name.includes('commute') || name.includes('transit')) return 'bus';

  // Electronics & Computing
  if (name.includes('rack') || name.includes('colocation') || name.includes('colo')) return 'server';
  if (name.includes('hyperscale')) return 'data-center';
  if (name.includes('inference') || name.includes('model')) return 'llm-generic';

  // Food Processing & Agriculture
  if (name.includes('throughput') || name.includes('processing')) {
    if (name.includes('beef') || name.includes('carcass')) return 'beef';
    if (name.includes('poultry') || name.includes('chicken')) return 'chicken';
    if (name.includes('fish')) return 'fish';
    return 'factory';
  }
  if (name.includes('roasted') || name.includes('roasting')) return 'coffee';

  // Online Services & Social
  if (name.includes('snapchat')) return 'social-media';
  if (name.includes('twitter') || name.includes('x usage')) return 'social-media';
  if (name.includes('linkedin')) return 'social-media';

  // Specialized Services
  if (name.includes('telemedicine') || name.includes('telehealth')) return 'video-conference';
  if (name.includes('e-commerce') || name.includes('online shopping')) return 'delivery';

  // Category-based fallbacks
  if (cat.includes('transport') || cat.includes('logistics')) return 'car-gasoline';
  if (cat.includes('food') || cat.includes('meal')) return 'meal';
  if (cat.includes('media') || cat.includes('stream')) return 'video-streaming';
  if (cat.includes('cloud') || cat.includes('online')) return 'cloud-server';
  if (cat.includes('energy') || cat.includes('power')) return 'electricity-grid';
  if (cat.includes('construction') || cat.includes('industrial')) return 'office-building';
  if (cat.includes('social')) return 'social-media';

  return null;
}
