'use client'

import { useEffect, useRef } from 'react'
import { EvidenceBadge, FactorRecordDetails } from '@/components/content'
import type { Activity } from '@/lib/calculator'

export function EvidencePane({
  activity,
  quantity,
  close,
}: {
  activity: Activity
  quantity?: number
  close: () => void
}) {
  const headingRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    headingRef.current?.focus()
  }, [])
  return (
    <aside className="detail-pane worksheet-evidence-pane" aria-label={`${activity.name} factor evidence`}>
      <button type="button" onClick={close}>Close evidence</button>
      <p className="section-kicker">Factor evidence</p>
      <EvidenceBadge evidence={activity.evidence} />
      <h2 ref={headingRef} id={`evidence-heading-${activity.id}`} tabIndex={-1}>{activity.name}</h2>
      <FactorRecordDetails
        description={activity.description}
        unitDefinition={activity.unitDefinition}
        notes={activity.notes}
        unitLabel={activity.unitLabel}
        emissionFactor={activity.emissionFactor}
        evidence={activity.evidence}
        quantity={quantity}
      />
    </aside>
  )
}
