import { motion } from 'framer-motion';
import { Check, Plus } from 'lucide-react';
import { cn } from '../lib/cn';
import { getIconDefinition } from '../lib/activityIcons';

/**
 * ActivityBadge - Visual icon card for activity selection
 *
 * Gamified UX: Activities are represented as collectible badges/icons
 * that users "collect" to build their carbon profile.
 *
 * Features:
 * - Icon/logo display (SVG or iconType)
 * - Visual "collected" state with checkmark
 * - Emissions value badge
 * - Hover/tap interactions
 * - Color theming per activity
 */

export interface ActivityBadgeProps {
  /** Activity display name */
  name: string;
  /** Carbon emissions value (kg CO₂) */
  emissions?: number | null;
  /** URL to icon/logo SVG */
  iconUrl?: string | null;
  /** Predefined icon type identifier */
  iconType?: string | null;
  /** Background color (hex) */
  badgeColor?: string | null;
  /** Whether this activity is in user's profile */
  isSelected?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show emissions value */
  showEmissions?: boolean;
}

export default function ActivityBadge({
  name,
  emissions,
  iconUrl,
  iconType,
  badgeColor,
  isSelected = false,
  onClick,
  size = 'md',
  showEmissions = true,
}: ActivityBadgeProps) {
  // Get icon definition from registry
  const iconDef = getIconDefinition(iconType);

  // Size mappings
  const sizeClasses = {
    sm: 'w-20 h-24',
    md: 'w-24 h-28',
    lg: 'w-32 h-36',
  };

  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  const textSizes = {
    sm: 'text-[10px]',
    md: 'text-xs',
    lg: 'text-sm',
  };

  // Determine badge background - use icon definition color if available
  const brandColor = iconDef?.brandColor || badgeColor;
  const bgColor = brandColor || 'var(--accent-100)';
  const selectedBgColor = brandColor ? `${brandColor}20` : 'var(--accent-200)';

  return (
    <motion.button
      onClick={onClick}
      className={cn(
        'relative flex flex-col items-center justify-center gap-1',
        'rounded-xl border-2 transition-all duration-200 p-2',
        'hover:scale-105 hover:shadow-lg active:scale-95',
        sizeClasses[size],
        isSelected
          ? 'border-accent-500 bg-accent-50'
          : 'border-border bg-surface hover:border-accent-300'
      )}
      style={{
        backgroundColor: isSelected ? selectedBgColor : undefined,
      }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
    >
      {/* Selected indicator */}
      {isSelected && (
        <motion.div
          className="absolute top-0.5 right-0.5 w-5 h-5 bg-accent-500 rounded-full flex items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
        >
          <Check className="w-3 h-3 text-white" strokeWidth={3} />
        </motion.div>
      )}

      {/* Icon/Logo */}
      <div className={cn('flex items-center justify-center', iconSizes[size])}>
        {iconUrl ? (
          <img
            src={iconUrl}
            alt={name}
            className="w-full h-full object-contain"
          />
        ) : iconDef?.svgPath ? (
          <img
            src={`/src/assets/activity-icons/${iconDef.svgPath}`}
            alt={name}
            className="w-full h-full object-contain"
          />
        ) : iconDef?.fallbackIcon ? (
          <iconDef.fallbackIcon
            className="w-full h-full"
            style={{ color: brandColor || undefined }}
            strokeWidth={1.5}
          />
        ) : iconDef?.emoji ? (
          <span
            className={size === 'sm' ? 'text-xl' : size === 'md' ? 'text-2xl' : 'text-3xl'}
            role="img"
            aria-label={name}
          >
            {iconDef.emoji}
          </span>
        ) : (
          <div
            className="w-full h-full rounded-full flex items-center justify-center text-2xl font-bold"
            style={{ backgroundColor: bgColor }}
          >
            {name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Activity name */}
      <span className={cn(
        'font-medium text-center line-clamp-2 leading-tight',
        textSizes[size],
        isSelected ? 'text-accent-700' : 'text-foreground'
      )}>
        {name}
      </span>

      {/* Emissions badge */}
      {showEmissions && emissions !== null && emissions !== undefined && (
        <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2">
          <span className={cn(
            'px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded-md font-medium whitespace-nowrap',
            size === 'sm' ? 'text-[9px]' : 'text-[10px]'
          )}>
            {formatEmissions(emissions)}
          </span>
        </div>
      )}

    </motion.button>
  );
}

/**
 * Format emissions value for display
 */
function formatEmissions(kg: number): string {
  if (kg >= 1000) {
    return `${(kg / 1000).toFixed(1)}t`;
  }
  if (kg >= 1) {
    return `${kg.toFixed(0)}kg`;
  }
  return `${(kg * 1000).toFixed(0)}g`;
}

/**
 * Skeleton loader for ActivityBadge
 */
export function ActivityBadgeSkeleton({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-20 h-20',
    md: 'w-28 h-28',
    lg: 'w-36 h-36',
  };

  return (
    <div className={cn(
      'flex flex-col items-center justify-center gap-2',
      'rounded-2xl border-2 border-border bg-surface',
      sizeClasses[size],
      'animate-pulse'
    )}>
      <div className="w-12 h-12 bg-neutral-200 rounded-full" />
      <div className="w-16 h-3 bg-neutral-200 rounded" />
    </div>
  );
}
