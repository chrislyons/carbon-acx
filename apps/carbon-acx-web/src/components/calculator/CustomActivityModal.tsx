'use client'

import { useState, useEffect } from 'react'
import { ACTIVITIES, CATEGORY_INFO, type ActivityCategory, type Activity } from '@/lib/calculator'

interface CustomActivityModalProps {
  isOpen: boolean
  onClose: () => void
  onAdd: (activity: Activity) => void
}

export function CustomActivityModal({ isOpen, onClose, onAdd }: CustomActivityModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    category: 'transport' as ActivityCategory,
    unit: 'unit',
    unitLabel: 'units',
    emissionFactor: '',
    description: '',
    sourceId: '',
    sourceCitation: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const categories = Object.keys(CATEGORY_INFO) as ActivityCategory[]

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!formData.name.trim()) newErrors.name = 'Activity name is required'
    if (!formData.emissionFactor || parseFloat(formData.emissionFactor) <= 0) {
      newErrors.emissionFactor = 'Valid emission factor (g/unit) is required'
    }
    if (!formData.unit.trim()) newErrors.unit = 'Unit is required'
    if (!formData.sourceId.trim()) newErrors.sourceId = 'Source ID is required (e.g., SRC.MYSOURCE.2024)'
    if (!formData.sourceCitation.trim()) newErrors.sourceCitation = 'IEEE citation is required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsSubmitting(true)

    // Generate a unique ID
    const categoryCode = formData.category.toUpperCase().slice(0, 4)
    const nameCode = formData.name
      .replace(/[^a-zA-Z0-9]/g, '')
      .slice(0, 20)
      .toUpperCase()
    const customId = `CUSTOM.${categoryCode}.${nameCode}.${Date.now().toString(36).toUpperCase()}`

    const newActivity: Activity = {
      id: customId,
      name: formData.name.trim(),
      category: formData.category,
      unit: formData.unit.trim(),
      unitLabel: formData.unitLabel.trim() || formData.unit.trim(),
      emissionFactor: parseFloat(formData.emissionFactor),
      description: formData.description.trim(),
      sourceIds: formData.sourceId ? [formData.sourceId.trim()] : [],
      sourceCitations: formData.sourceCitation ? [formData.sourceCitation.trim()] : [],
      provenance: {
        activityId: customId,
        emissionFactorId: `EF.${customId}`,
        emissionFactorRegion: 'CUSTOM',
        emissionFactorVintageYear: new Date().getFullYear(),
        gridIntensityRegion: null,
        gridIntensityVintageYear: null,
      },
    }

    onAdd(newActivity)
    onClose()
    setIsSubmitting(false)
  }

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="custom-activity-title"
    >
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-lg bg-background-elevated border border-surface-border rounded-xl overflow-hidden animate-slide-up">
        <div className="flex items-center justify-between p-4 border-b border-surface-border">
          <h2 id="custom-activity-title" className="text-lg font-semibold text-foreground">
            Add Custom Activity
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-background-hover transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 max-h-[70vh] overflow-y-auto">
          <div className="space-y-4">
            <div>
              <label htmlFor="custom-name" className="block text-sm font-medium text-foreground mb-1">
                Activity Name *
              </label>
              <input
                id="custom-name"
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-surface-border-strong rounded-lg bg-background-elevated text-foreground focus:ring-2 focus:ring-accent-primary focus:border-accent-primary"
                placeholder="e.g., Electric bike commute"
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? 'name-error' : undefined}
              />
              {errors.name && (
                <p id="name-error" className="mt-1 text-sm text-error">{errors.name}</p>
              )}
            </div>

            <div>
              <label htmlFor="custom-category" className="block text-sm font-medium text-foreground mb-1">
                Category *
              </label>
              <select
                id="custom-category"
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value as ActivityCategory)}
                className="w-full px-3 py-2 border border-surface-border-strong rounded-lg bg-background-elevated text-foreground focus:ring-2 focus:ring-accent-primary focus:border-accent-primary"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_INFO[cat].emoji} {CATEGORY_INFO[cat].name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="custom-unit" className="block text-sm font-medium text-foreground mb-1">
                  Unit *
                </label>
                <input
                  id="custom-unit"
                  type="text"
                  value={formData.unit}
                  onChange={(e) => handleChange('unit', e.target.value)}
                  className="w-full px-3 py-2 border border-surface-border-strong rounded-lg bg-background-elevated text-foreground focus:ring-2 focus:ring-accent-primary focus:border-accent-primary"
                  placeholder="e.g., km"
                  aria-invalid={!!errors.unit}
                />
                {errors.unit && (
                  <p className="mt-1 text-sm text-error">{errors.unit}</p>
                )}
              </div>
              <div>
                <label htmlFor="custom-unit-label" className="block text-sm font-medium text-foreground mb-1">
                  Unit Label (plural)
                </label>
                <input
                  id="custom-unit-label"
                  type="text"
                  value={formData.unitLabel}
                  onChange={(e) => handleChange('unitLabel', e.target.value)}
                  className="w-full px-3 py-2 border border-surface-border-strong rounded-lg bg-background-elevated text-foreground focus:ring-2 focus:ring-accent-primary focus:border-accent-primary"
                  placeholder="e.g., kilometers"
                />
              </div>
            </div>

            <div>
              <label htmlFor="custom-emission-factor" className="block text-sm font-medium text-foreground mb-1">
                Emission Factor (g CO₂e per unit) *
              </label>
              <input
                id="custom-emission-factor"
                type="number"
                step="any"
                min="0"
                value={formData.emissionFactor}
                onChange={(e) => handleChange('emissionFactor', e.target.value)}
                className="w-full px-3 py-2 border border-surface-border-strong rounded-lg bg-background-elevated text-foreground focus:ring-2 focus:ring-accent-primary focus:border-accent-primary"
                placeholder="e.g., 50"
                aria-invalid={!!errors.emissionFactor}
                aria-describedby={errors.emissionFactor ? 'ef-error' : 'ef-hint'}
              />
              {errors.emissionFactor && (
                <p id="ef-error" className="mt-1 text-sm text-error">{errors.emissionFactor}</p>
              )}
              <p id="ef-hint" className="mt-1 text-xs text-foreground-subtle">
                Enter the CO₂ equivalent emissions in grams per unit. Example: 180 g/km for a gasoline car.
              </p>
            </div>

            <div>
              <label htmlFor="custom-description" className="block text-sm font-medium text-foreground mb-1">
                Description
              </label>
              <textarea
                id="custom-description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-surface-border-strong rounded-lg bg-background-elevated text-foreground focus:ring-2 focus:ring-accent-primary focus:border-accent-primary"
                placeholder="Describe what this activity covers (system boundaries, assumptions, etc.)"
              />
            </div>

            <div>
              <label htmlFor="custom-source-id" className="block text-sm font-medium text-foreground mb-1">
                Source ID *
              </label>
              <input
                id="custom-source-id"
                type="text"
                value={formData.sourceId}
                onChange={(e) => handleChange('sourceId', e.target.value)}
                className="w-full px-3 py-2 border border-surface-border-strong rounded-lg bg-background-elevated text-foreground focus:ring-2 focus:ring-accent-primary focus:border-accent-primary"
                placeholder="SRC.YOURSOURCE.2024"
                aria-invalid={!!errors.sourceId}
                aria-describedby={errors.sourceId ? 'source-error' : 'source-hint'}
              />
              {errors.sourceId && (
                <p id="source-error" className="mt-1 text-sm text-error">{errors.sourceId}</p>
              )}
              <p id="source-hint" className="mt-1 text-xs text-foreground-subtle">
                Unique identifier for your source. Format: SRC.SHORTNAME.YEAR
              </p>
            </div>

            <div>
              <label htmlFor="custom-source-citation" className="block text-sm font-medium text-foreground mb-1">
                IEEE Citation *
              </label>
              <textarea
                id="custom-source-citation"
                value={formData.sourceCitation}
                onChange={(e) => handleChange('sourceCitation', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-surface-border-strong rounded-lg bg-background-elevated text-foreground focus:ring-2 focus:ring-accent-primary focus:border-accent-primary"
                placeholder="[1] Author, &quot;Title,&quot; Publication, Location, Year. Available: URL"
                aria-invalid={!!errors.sourceCitation}
                aria-describedby={errors.sourceCitation ? 'citation-error' : 'citation-hint'}
              />
              {errors.sourceCitation && (
                <p id="citation-error" className="mt-1 text-sm text-error">{errors.sourceCitation}</p>
              )}
              <p id="citation-hint" className="mt-1 text-xs text-foreground-subtle">
                Full IEEE format: [N] Author(s), &quot;Title,&quot; Publisher, Location, Year. Available: URL
              </p>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full action-link action-link-primary py-3"
              >
                {isSubmitting ? 'Adding…' : 'Add Activity'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}