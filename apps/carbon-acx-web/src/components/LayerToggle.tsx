import { Layers, RotateCcw, Eye, EyeOff, Trash2, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Link } from 'react-router-dom';

import { useProfile } from '../contexts/ProfileContext';
import { Button } from './ui/button';
import { cn } from '../lib/cn';
import { useToast } from '../contexts/ToastContext';

/**
 * LayerToggle - Profile layer management
 *
 * Allows users to view, manage, and toggle visibility of loaded profile layers
 */

export default function LayerToggle() {
  const { profile, toggleLayerVisibility, removeLayer, renameLayer } = useProfile();
  const { showToast } = useToast();
  const [isExpanded, setIsExpanded] = useState(false);

  const layers = profile.layers;
  const visibleCount = layers.filter((l) => l.visible).length;

  const handleRemove = (layerId: string, layerName: string) => {
    removeLayer(layerId);
    showToast('success', 'Layer removed', `Removed "${layerName}" from comparison`);
  };

  const handleRename = (layerId: string, currentName: string) => {
    const newName = prompt('Enter new layer name:', currentName);
    if (newName && newName !== currentName) {
      renameLayer(layerId, newName);
      showToast('success', 'Layer renamed', `Renamed to "${newName}"`);
    }
  };

  return (
    <div className="relative">
      {/* Toggle button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="gap-2 w-full justify-start"
      >
        <Layers className="h-4 w-4" />
        <span className="flex-1 text-left">Manage Layers</span>
        {layers.length > 0 && (
          <span className="text-xs text-text-muted">({visibleCount}/{layers.length})</span>
        )}
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
              className="absolute left-0 top-full mt-2 z-50 w-full max-w-md bg-surface border border-border rounded-lg shadow-lg"
            >
              {/* Header */}
              <div className="p-3 border-b border-border">
                <h3 className="text-sm font-semibold text-foreground">
                  Manage Profile Layers
                </h3>
                <p className="text-xs text-text-muted mt-1">
                  Show/hide, rename, or remove comparison layers
                </p>
              </div>

              {/* Layer list */}
              <div className="p-2 space-y-2 max-h-96 overflow-y-auto">
                {layers.length === 0 ? (
                  <div className="p-4 text-center text-text-muted text-sm">
                    <p className="mb-2">No profile layers loaded yet</p>
                    <p className="text-xs">Load profiles from sectors to compare emissions</p>
                  </div>
                ) : (
                  layers.map((layer) => {
                    const layerEmissions = layer.activities.reduce(
                      (sum, a) => sum + a.annualEmissions,
                      0
                    );

                    return (
                      <div
                        key={layer.id}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-lg border transition-all',
                          layer.visible
                            ? 'border-border bg-surface'
                            : 'border-border/50 bg-surface/50 opacity-60'
                        )}
                      >
                        {/* Color indicator */}
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: layer.color }}
                        />

                        {/* Layer info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {layer.name}
                          </p>
                          <p className="text-xs text-text-muted">
                            {layer.activities.length} activities • {(layerEmissions / 1000).toFixed(2)}t CO₂/yr
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-10 w-10 p-0"
                            onClick={() => toggleLayerVisibility(layer.id)}
                            aria-label={layer.visible ? `Hide ${layer.name} layer` : `Show ${layer.name} layer`}
                            title={layer.visible ? 'Hide layer' : 'Show layer'}
                          >
                            {layer.visible ? (
                              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                            ) : (
                              <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-10 w-10 p-0"
                            onClick={() => handleRename(layer.id, layer.name)}
                            aria-label={`Rename ${layer.name} layer`}
                            title="Rename layer"
                          >
                            <Edit2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-10 w-10 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleRemove(layer.id, layer.name)}
                            aria-label={`Remove ${layer.name} layer`}
                            title="Remove layer"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Footer */}
              <div className="p-3 border-t border-border bg-neutral-50 flex items-center justify-between">
                <p className="text-xs text-text-muted flex-1">
                  {layers.length > 0 ? (
                    'View full comparison on Dashboard'
                  ) : (
                    'Load profile presets from sectors to start'
                  )}
                </p>
                {layers.length > 0 && (
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                  >
                    <Link to="/dashboard">Dashboard →</Link>
                  </Button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
