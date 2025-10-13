import { Layers, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

import { useLayers } from '../contexts/LayerContext';
import { Button } from './ui/button';
import { cn } from '../lib/cn';

/**
 * LayerToggle - Profile comparison layer controls
 *
 * Allows users to toggle visibility of comparison layers
 * (Your Profile, US Average, EU Average, Global Average, Paris Target)
 */

export default function LayerToggle() {
  const { layers, toggleLayer, resetToDefaults } = useLayers();
  const [isExpanded, setIsExpanded] = useState(false);

  const visibleCount = layers.filter((l) => l.visible).length;

  return (
    <div className="relative">
      {/* Toggle button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="gap-2"
      >
        <Layers className="h-4 w-4" />
        <span className="hidden sm:inline">Compare</span>
        <span className="text-xs text-text-muted">({visibleCount})</span>
      </Button>

      {/* Dropdown panel */}
      <AnimatePresence>
        {isExpanded && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsExpanded(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 z-50 w-80 bg-surface border border-border rounded-lg shadow-lg"
            >
              {/* Header */}
              <div className="p-3 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    Profile Layers
                  </h3>
                  <p className="text-xs text-text-muted">
                    Compare your emissions
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetToDefaults}
                  className="gap-1 h-7"
                  title="Reset to defaults"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span className="text-xs">Reset</span>
                </Button>
              </div>

              {/* Layer list */}
              <div className="p-2 space-y-1 max-h-96 overflow-y-auto">
                {layers.map((layer) => (
                  <button
                    key={layer.id}
                    onClick={() => toggleLayer(layer.id)}
                    className={cn(
                      'w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left',
                      'hover:bg-accent-50',
                      layer.visible && 'bg-accent-50'
                    )}
                  >
                    {/* Color indicator */}
                    <div
                      className={cn(
                        'w-4 h-4 rounded-full border-2 transition-all flex-shrink-0',
                        layer.visible
                          ? 'border-transparent'
                          : 'border-border bg-surface'
                      )}
                      style={{
                        backgroundColor: layer.visible ? layer.color : undefined,
                      }}
                    />

                    {/* Layer info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">
                          {layer.name}
                        </span>
                        {layer.isUserProfile && (
                          <span className="text-xs px-1.5 py-0.5 bg-accent-500 text-white rounded">
                            You
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text-muted line-clamp-1">
                        {layer.description}
                      </p>
                    </div>

                    {/* Emissions value */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-foreground">
                        {(layer.totalEmissions / 1000).toFixed(1)}t
                      </p>
                      <p className="text-xs text-text-muted">CO₂/yr</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Footer */}
              <div className="p-3 border-t border-border bg-neutral-50">
                <p className="text-xs text-text-muted">
                  Toggle layers to compare your emissions against regional and global averages
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
