import type { ActivityEvidence } from '@/lib/calculator'

export function EvidenceBadge({ evidence }: { evidence: ActivityEvidence }) {
  const available = evidence.publicationStatus === 'published'

  return (
    <span className={`evidence-badge ${available ? 'evidence-badge--published' : 'evidence-badge--unavailable'}`}>
      {available ? 'Published evidence' : 'Not available'}
    </span>
  )
}
