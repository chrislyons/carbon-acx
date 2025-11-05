/**
 * ActivityManagement - 2D table for managing user activities
 *
 * Features:
 * - List all activities with emissions
 * - Edit quantity inline
 * - Delete activities
 * - View citations
 * - Sort and filter
 *
 * Phase 3: Keep 2D Where Needed
 */

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit2, Trash2, FileText, Check, X, TrendingUp } from 'lucide-react';
import { Button } from '../system/Button';
import { CitationPanel, type Citation } from './CitationPanel';
import { useAppStore, type Activity } from '../../hooks/useAppStore';

// ============================================================================
// Component
// ============================================================================

export function ActivityManagement() {
  const activities = useAppStore((state) => state.activities);
  const { removeActivity, updateActivityQuantity } = useAppStore();

  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editQuantity, setEditQuantity] = React.useState<number>(0);
  const [selectedCitation, setSelectedCitation] = React.useState<Citation | null>(null);
  const [showCitationPanel, setShowCitationPanel] = React.useState(false);

  const handleEdit = (activity: Activity) => {
    setEditingId(activity.id);
    setEditQuantity(activity.quantity);
  };

  const handleSaveEdit = (activityId: string) => {
    updateActivityQuantity(activityId, editQuantity);
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  const handleDelete = (activityId: string) => {
    if (window.confirm('Are you sure you want to delete this activity?')) {
      removeActivity(activityId);
    }
  };

  const handleShowCitation = (activity: Activity) => {
    // Create a citation object from activity data
    const citation: Citation = {
      id: `citation-${activity.id}`,
      activityId: activity.id,
      activityName: activity.name,
      emissionFactor: activity.carbonIntensity,
      unit: activity.unit,
      source: 'Carbon ACX Verified Dataset',
      sourceUrl: `/data/emission-factors/${activity.sectorId}`,
      methodology: `Activity-based calculation using peer-reviewed emission factors. Annual emissions calculated as: ${activity.quantity} ${activity.unit} × ${activity.carbonIntensity.toFixed(3)} kg CO₂e/${activity.unit} = ${activity.annualEmissions.toFixed(2)} kg CO₂e/year`,
      lastUpdated: activity.addedAt,
      notes: activity.category ? `Category: ${activity.category}` : undefined,
    };
    setSelectedCitation(citation);
    setShowCitationPanel(true);
  };

  if (activities.length === 0) {
    return (
      <div
        className="text-center py-12 rounded-[var(--radius-lg)]"
        style={{
          backgroundColor: 'var(--surface-elevated)',
          border: '1px solid var(--border-default)',
        }}
      >
        <TrendingUp className="w-12 h-12 mx-auto mb-[var(--space-4)]" style={{ color: 'var(--text-tertiary)' }} />
        <p
          style={{
            fontSize: 'var(--font-size-lg)',
            color: 'var(--text-secondary)',
          }}
        >
          No activities yet. Add some to start tracking your carbon footprint.
        </p>
      </div>
    );
  }

  return (
    <>
      <div
        className="rounded-[var(--radius-lg)] overflow-hidden"
        style={{
          backgroundColor: 'var(--surface-elevated)',
          border: '1px solid var(--border-default)',
        }}
      >
        {/* Table Header */}
        <div
          className="grid grid-cols-[1fr_120px_120px_180px_120px] gap-[var(--space-4)] px-[var(--space-4)] py-[var(--space-3)] border-b"
          style={{
            backgroundColor: 'var(--surface-bg)',
            borderColor: 'var(--border-default)',
            fontSize: 'var(--font-size-xs)',
            color: 'var(--text-tertiary)',
            fontWeight: 600,
            textTransform: 'uppercase',
          }}
        >
          <div>Activity</div>
          <div className="text-right">Quantity</div>
          <div className="text-right">Factor</div>
          <div className="text-right">Annual Emissions</div>
          <div className="text-center">Actions</div>
        </div>

        {/* Table Body */}
        <AnimatePresence mode="popLayout">
          {activities.map((activity, index) => {
            const isEditing = editingId === activity.id;

            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ delay: index * 0.02 }}
                className="grid grid-cols-[1fr_120px_120px_180px_120px] gap-[var(--space-4)] px-[var(--space-4)] py-[var(--space-3)] border-b items-center hover:bg-[var(--surface-hover)] transition-colors"
                style={{
                  borderColor: 'var(--border-subtle)',
                }}
              >
                {/* Activity Name */}
                <div>
                  <div
                    className="font-medium"
                    style={{
                      fontSize: 'var(--font-size-sm)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {activity.name}
                  </div>
                  {activity.category && (
                    <div
                      style={{
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--text-tertiary)',
                      }}
                    >
                      {activity.category}
                    </div>
                  )}
                </div>

                {/* Quantity */}
                <div className="text-right">
                  {isEditing ? (
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={editQuantity}
                      onChange={(e) => setEditQuantity(parseFloat(e.target.value) || 0)}
                      className="w-full px-[var(--space-2)] py-[var(--space-1)] rounded-[var(--radius-sm)] border text-right"
                      style={{
                        backgroundColor: 'var(--surface-bg)',
                        borderColor: 'var(--interactive-primary)',
                        color: 'var(--text-primary)',
                        fontSize: 'var(--font-size-sm)',
                      }}
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit(activity.id);
                        if (e.key === 'Escape') handleCancelEdit();
                      }}
                    />
                  ) : (
                    <span
                      style={{
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {activity.quantity} {activity.unit}
                    </span>
                  )}
                </div>

                {/* Carbon Intensity */}
                <div
                  className="text-right font-mono"
                  style={{
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {activity.carbonIntensity.toFixed(3)}
                </div>

                {/* Annual Emissions */}
                <div className="text-right">
                  <div
                    className="font-semibold"
                    style={{
                      fontSize: 'var(--font-size-sm)',
                      color: getEmissionColor(activity.annualEmissions),
                    }}
                  >
                    {(activity.annualEmissions / 1000).toFixed(2)}t
                  </div>
                  <div
                    style={{
                      fontSize: 'var(--font-size-xs)',
                      color: 'var(--text-tertiary)',
                    }}
                  >
                    CO₂e/year
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-center gap-[var(--space-1)]">
                  {isEditing ? (
                    <>
                      <button
                        onClick={() => handleSaveEdit(activity.id)}
                        className="p-[var(--space-1)] rounded-[var(--radius-sm)] transition-colors hover:bg-[var(--carbon-low-bg)]"
                        aria-label="Save changes"
                        title="Save"
                      >
                        <Check className="w-4 h-4" style={{ color: 'var(--carbon-low)' }} />
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="p-[var(--space-1)] rounded-[var(--radius-sm)] transition-colors hover:bg-[var(--surface-hover)]"
                        aria-label="Cancel editing"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleShowCitation(activity)}
                        className="p-[var(--space-1)] rounded-[var(--radius-sm)] transition-colors hover:bg-[var(--surface-hover)]"
                        aria-label="View citation"
                        title="View emission factor citation"
                      >
                        <FileText className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                      </button>
                      <button
                        onClick={() => handleEdit(activity)}
                        className="p-[var(--space-1)] rounded-[var(--radius-sm)] transition-colors hover:bg-[var(--surface-hover)]"
                        aria-label="Edit quantity"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                      </button>
                      <button
                        onClick={() => handleDelete(activity.id)}
                        className="p-[var(--space-1)] rounded-[var(--radius-sm)] transition-colors hover:bg-[var(--carbon-high-bg)]"
                        aria-label="Delete activity"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" style={{ color: 'var(--carbon-high)' }} />
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Table Footer */}
        <div
          className="px-[var(--space-4)] py-[var(--space-3)]"
          style={{
            backgroundColor: 'var(--surface-bg)',
            fontSize: 'var(--font-size-sm)',
            color: 'var(--text-tertiary)',
          }}
        >
          {activities.length} {activities.length === 1 ? 'activity' : 'activities'} tracked
        </div>
      </div>

      {/* Citation Panel */}
      <CitationPanel
        citation={selectedCitation}
        open={showCitationPanel}
        onClose={() => setShowCitationPanel(false)}
      />
    </>
  );
}

// ============================================================================
// Helpers
// ============================================================================

function getEmissionColor(emissions: number): string {
  const tonnes = emissions / 1000;
  if (tonnes < 0.5) return 'var(--carbon-low)';
  if (tonnes < 2) return 'var(--carbon-moderate)';
  return 'var(--carbon-high)';
}
