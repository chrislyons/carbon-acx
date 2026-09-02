import React from 'react'
import { abbreviateUnit } from '@/lib/units'
import type { ActivityEvidence } from '@/lib/calculator'

export interface EvidenceFactsProps {
  evidence: ActivityEvidence
  unitLabel: string
}

function uncertaintyLabel(evidence: ActivityEvidence, unitLabel: string): string {
  const { lowGPerUnit, highGPerUnit } = evidence.uncertainty
  if (!Number.isFinite(lowGPerUnit) || !Number.isFinite(highGPerUnit)) return 'Not quantified'
  return `${lowGPerUnit}–${highGPerUnit} g CO₂e / ${abbreviateUnit(unitLabel) || 'unit'}`
}

export function EvidenceFacts({ evidence, unitLabel }: EvidenceFactsProps) {
  const abbreviatedUnit = abbreviateUnit(unitLabel) || 'Not specified'
  return (
    <dl className="evidence-facts">
      <div><dt>Unit</dt><dd>{abbreviatedUnit}</dd></div>
      <div><dt>Boundary</dt><dd>{evidence.scopeBoundary || 'Not specified'}</dd></div>
      <div><dt>Region</dt><dd>{evidence.region || 'Not specified'}</dd></div>
      <div><dt>Vintage</dt><dd>{evidence.vintageYear ?? 'Not specified'}</dd></div>
      <div><dt>Uncertainty</dt><dd>{uncertaintyLabel(evidence, unitLabel)}</dd></div>
    </dl>
  )
}
