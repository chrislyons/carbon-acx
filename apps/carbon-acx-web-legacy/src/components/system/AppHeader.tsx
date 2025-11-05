/**
 * AppHeader - Persistent Navigation Component
 *
 * Provides consistent navigation across all pages with:
 * - Logo/Brand linking to appropriate page
 * - Main navigation: Explore | Insights | Calculator
 * - Total emissions badge
 * - Reset functionality
 */

import * as React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, RotateCcw, Calculator as CalcIcon, Compass, Lightbulb } from 'lucide-react';
import { Button } from './Button';
import { Badge } from '../ui/badge';
import { useAppStore } from '../../hooks/useAppStore';
import { formatCarbon } from '../../lib/formatCarbon';
import { cn } from '../../lib/cn';

export interface AppHeaderProps {
  /**
   * Show minimal version (just logo and cancel) - for Calculator page
   */
  minimal?: boolean;
  /**
   * Override the reset handler (optional)
   */
  onReset?: () => void;
  /**
   * Additional CSS classes
   */
  className?: string;
}

export const AppHeader = React.forwardRef<HTMLElement, AppHeaderProps>(
  ({ minimal = false, onReset, className }, ref) => {
    const navigate = useNavigate();
    const location = useLocation();
    const activities = useAppStore((state) => state.profile.activities);
    const getTotalEmissions = useAppStore((state) => state.getTotalEmissions);
    const clearProfile = useAppStore((state) => state.clearProfile);

    const totalEmissions = getTotalEmissions();
    const hasData = activities.length > 0 || totalEmissions > 0;

    const handleLogoClick = () => {
      // Navigate to explore if user has data, otherwise welcome
      if (hasData) {
        navigate('/explore');
      } else {
        navigate('/welcome');
      }
    };

    const handleReset = () => {
      if (onReset) {
        onReset();
      } else {
        // Default reset behavior: clear profile and go to welcome
        if (
          window.confirm(
            'Are you sure you want to reset? This will clear all your data and start over.'
          )
        ) {
          clearProfile();
          navigate('/welcome');
        }
      }
    };

    // Check if a route is active
    const isActive = (path: string) => location.pathname === path;

    // Minimal version for Calculator page
    if (minimal) {
      return (
        <header
          ref={ref}
          className={cn(
            'sticky top-0 z-50 w-full border-b border-[var(--border-default)] bg-[var(--surface-bg)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--surface-bg)]/60',
            className
          )}
        >
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
            <button
              onClick={handleLogoClick}
              className="flex items-center gap-2 text-[var(--text-primary)] hover:text-[var(--text-accent)] transition-colors"
              aria-label="Go to home"
            >
              <Home className="w-5 h-5" />
              <span className="font-semibold text-[var(--font-size-lg)]">Carbon ACX</span>
            </button>

            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              Cancel
            </Button>
          </div>
        </header>
      );
    }

    // Full header with navigation
    return (
      <header
        ref={ref}
        className={cn(
          'sticky top-0 z-50 w-full border-b border-[var(--border-default)] bg-[var(--surface-bg)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--surface-bg)]/60',
          className
        )}
      >
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          {/* Logo/Brand */}
          <button
            onClick={handleLogoClick}
            className="flex items-center gap-2 text-[var(--text-primary)] hover:text-[var(--text-accent)] transition-colors"
            aria-label="Go to home"
          >
            <Home className="w-5 h-5" />
            <span className="font-semibold text-[var(--font-size-lg)]">Carbon ACX</span>
          </button>

          {/* Navigation Links */}
          <nav className="flex items-center gap-1" aria-label="Main navigation">
            <Button
              variant={isActive('/explore') ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => navigate('/explore')}
              icon={<Compass className="w-4 h-4" />}
              aria-current={isActive('/explore') ? 'page' : undefined}
            >
              Explore
            </Button>

            <Button
              variant={isActive('/insights') ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => navigate('/insights')}
              icon={<Lightbulb className="w-4 h-4" />}
              aria-current={isActive('/insights') ? 'page' : undefined}
            >
              Insights
            </Button>

            <Button
              variant={isActive('/calculator') ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => navigate('/calculator')}
              icon={<CalcIcon className="w-4 h-4" />}
              aria-current={isActive('/calculator') ? 'page' : undefined}
            >
              Calculator
            </Button>
          </nav>

          {/* Right Side: Emissions Badge + Reset */}
          <div className="flex items-center gap-3">
            {/* Total Emissions Badge */}
            {hasData && (
              <Badge variant="default" className="flex items-center gap-1.5">
                <span className="text-xs font-medium">Total:</span>
                <span className="font-semibold">{formatCarbon(totalEmissions)}</span>
              </Badge>
            )}

            {/* Reset Button */}
            {hasData && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleReset}
                title="Reset and start over"
                aria-label="Reset and start over"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </header>
    );
  }
);

AppHeader.displayName = 'AppHeader';
