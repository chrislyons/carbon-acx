'use client'

import { useState, useEffect } from 'react'
import { formatIEEECitation, getCitationsForActivity, getProvenanceSummary } from '@/lib/ieeeCitations'
import type { ActivityProvenance } from '@/lib/calculator'

interface CitationDrawerProps {
  isOpen: boolean
  onClose: () => void
  sourceIds: string[]
  provenance?: ActivityProvenance
  title?: string
}

export function CitationDrawer({ isOpen, onClose, sourceIds, provenance, title = 'Sources & Provenance' }: CitationDrawerProps) {
  const [citations, setCitations] = useState<string[]>([])
  const [provenanceInfo, setProvenanceInfo] = useState<ReturnType<typeof getProvenanceSummary> | null>(null)

  useEffect(() => {
    if (isOpen) {
      setCitations(getCitationsForActivity(sourceIds))
      if (provenance) {
        setProvenanceInfo(getProvenanceSummary(provenance))
      }
    }
  }, [isOpen, sourceIds, provenance])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="citation-drawer-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="relative w-full max-w-2xl max-h-[85vh] bg-background-elevated border border-surface-border rounded-t-2xl sm:rounded-xl overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-border">
          <h2 id="citation-drawer-title" className="text-lg font-semibold text-foreground">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-background-hover transition-colors"
            aria-label="Close sources drawer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(85vh-80px)]">
          {/* Provenance Summary */}
          {provenanceInfo && (
            <div className="mb-6 p-3 bg-code-bg border border-code-border rounded-lg">
              <h3 className="font-mono text-xs text-foreground-subtle uppercase tracking-wide mb-2">
                Provenance
              </h3>
              <dl className="space-y-1 text-sm">
                <div>
                  <dt className="font-medium text-foreground">Emission Factor</dt>
                  <dd className="text-foreground-muted font-mono text-xs">{provenanceInfo.emissionFactor}</dd>
                </div>
                {provenanceInfo.gridIntensity && (
                  <div>
                    <dt className="font-medium text-foreground">Grid Intensity</dt>
                    <dd className="text-foreground-muted font-mono text-xs">{provenanceInfo.gridIntensity}</dd>
                  </div>
                )}
                <div>
                  <dt className="font-medium text-foreground">Vintage</dt>
                  <dd className="text-foreground-muted font-mono text-xs">{provenanceInfo.vintage} {provenanceInfo.vintage !== 'Unknown' ? '(AR6 GWP100)' : ''}</dd>
                </div>
              </dl>
            </div>
          )}

          {/* Citations List */}
          <div>
            <h3 className="font-mono text-xs text-foreground-subtle uppercase tracking-wide mb-3">
              IEEE Citations ({citations.length})
            </h3>
            {citations.length === 0 ? (
              <p className="text-foreground-muted text-sm">No citations available for this activity.</p>
            ) : (
              <ol className="space-y-4">
                {citations.map((citation, index) => (
                  <li key={index} className="text-sm text-foreground leading-relaxed">
                    {citation}
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* Methodology Note */}
          <div className="mt-6 p-3 bg-surface-panel border border-surface-border rounded-lg">
            <h4 className="font-medium text-foreground mb-1">Methodology Note</h4>
            <p className="text-sm text-foreground-muted">
              All emission factors use IPCC AR6 GWP100 (100-year Global Warming Potential).
              Grid-indexed factors combine electricity consumption (kWh/unit) with regional
              grid intensity (gCO₂/kWh) from the cited vintage year. Uncertainty bounds
              reflect published low/high ranges from source studies.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}