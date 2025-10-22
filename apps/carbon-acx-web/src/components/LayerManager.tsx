import { Eye, EyeOff, Trash2, Edit2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import type { ProfileLayer } from '../contexts/ProfileContext';

interface LayerManagerProps {
  layers: ProfileLayer[];
  onToggleVisibility: (layerId: string) => void;
  onRemoveLayer: (layerId: string) => void;
  onRenameLayer?: (layerId: string, name: string) => void;
}

export default function LayerManager({
  layers,
  onToggleVisibility,
  onRemoveLayer,
  onRenameLayer,
}: LayerManagerProps) {
  if (layers.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Layers</CardTitle>
        <p className="text-sm text-text-muted mt-2">
          Compare multiple profiles side-by-side. Toggle visibility or remove layers as needed.
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {layers.map((layer) => {
            const layerEmissions = layer.activities.reduce(
              (sum, activity) => sum + activity.annualEmissions,
              0
            );

            return (
              <motion.div
                key={layer.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                  layer.visible
                    ? 'border-border bg-surface'
                    : 'border-border/50 bg-surface/50 opacity-60'
                }`}
              >
                {/* Color indicator */}
                <div
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ backgroundColor: layer.color }}
                />

                {/* Layer info */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-foreground truncate">
                    {layer.name}
                  </h4>
                  <p className="text-sm text-text-muted">
                    {layer.activities.length} activities • {layerEmissions.toFixed(2)} kg CO₂/year
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-10 w-10 p-0"
                    onClick={() => onToggleVisibility(layer.id)}
                    aria-label={layer.visible ? `Hide ${layer.name} layer` : `Show ${layer.name} layer`}
                    title={layer.visible ? 'Hide layer' : 'Show layer'}
                  >
                    {layer.visible ? (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <EyeOff className="h-4 w-4" aria-hidden="true" />
                    )}
                  </Button>
                  {onRenameLayer && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-10 w-10 p-0"
                      onClick={() => {
                        const newName = prompt('Enter new layer name:', layer.name);
                        if (newName && newName !== layer.name) {
                          onRenameLayer(layer.id, newName);
                        }
                      }}
                      aria-label={`Rename ${layer.name} layer`}
                      title="Rename layer"
                    >
                      <Edit2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-10 w-10 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => {
                      if (confirm(`Remove layer "${layer.name}"?`)) {
                        onRemoveLayer(layer.id);
                      }
                    }}
                    aria-label={`Remove ${layer.name} layer`}
                    title="Remove layer"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
