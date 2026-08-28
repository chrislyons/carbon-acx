import { abbreviateUnit } from '@/lib/units'
import { Disclosure } from '@/components/content/Disclosure'
import { SourceList } from '@/components/content/SourceList'
import { formatEmissions, type ActivityEvidence } from '@/lib/calculator'

export interface FactorRecordDetailsProps {
  description: string
  unitDefinition: string
  notes: string
  unitLabel: string
  emissionFactor: number | null
  evidence: ActivityEvidence
  quantity?: number
}

export function FactorRecordDetails({
  description,
  unitDefinition,
  notes,
  unitLabel,
  emissionFactor,
  evidence,
  quantity,
}: FactorRecordDetailsProps) {
  const isAvailable = emissionFactor !== null
  const workedQuantity = quantity ?? 1
  const formattedQuantity = workedQuantity.toLocaleString('en-CA')
  const formattedFactor = emissionFactor?.toLocaleString('en-CA', { maximumFractionDigits: 4 })
  const uncertainty = evidence.uncertainty.lowGPerUnit == null
    ? 'Not quantified'
    : `${evidence.uncertainty.lowGPerUnit}–${evidence.uncertainty.highGPerUnit} g CO₂e / ${abbreviateUnit(unitLabel)}`

  return (
    <div className="factor-record-details">
      <section>
        <h3>What this measures</h3>
        <p>{description || 'No plain-language description is published.'}</p>
        {unitDefinition ? <p>{unitDefinition}</p> : null}
      </section>
      <section>
        <h3>Where the data comes from</h3>
        <p>
          This published record resolves {evidence.sourceIds.join(', ')} for {evidence.region ?? 'an unspecified geography'};
          its source trail is linked in the technical disclosure below.
        </p>
      </section>
      <section>
        <h3>How to use this record</h3>
        <p>Use the value only within the published unit, geography, boundary, GWP horizon, and vintage.</p>
      </section>
      <section>
        <h3>Limits</h3>
        <p>This is a screening estimate, not a verified inventory. Incompatible units must not be compared.</p>
        {notes ? <p>{notes}</p> : null}
      </section>
      <section>
        <h3>Worked arithmetic</h3>
        {isAvailable ? (
          <p className="factor-record-details__equation">
            {formattedQuantity} {abbreviateUnit(unitLabel)} × {formattedFactor} g CO₂e / {abbreviateUnit(unitLabel)} = {formatEmissions(workedQuantity * emissionFactor)}
          </p>
        ) : (
          <p>Not available. No numeric zero is substituted.</p>
        )}
      </section>
      <Disclosure summary="Technical disclosure" open>
        <dl className="factor-record-details__technical">
          <div><dt>Boundary</dt><dd>{evidence.scopeBoundary || 'Not specified'}</dd></div>
          <div><dt>Region</dt><dd>{evidence.region ?? 'Not specified'}</dd></div>
          <div><dt>GWP horizon</dt><dd>{evidence.gwpHorizon || 'Not specified'}</dd></div>
          <div><dt>Vintage</dt><dd>{evidence.vintageYear ?? 'Not specified'}</dd></div>
          <div><dt>Uncertainty</dt><dd>{uncertainty}</dd></div>
          <div><dt>Factor ID</dt><dd className="mono">{evidence.emissionFactorId || 'Not specified'}</dd></div>
          {evidence.methodNotes ? <div><dt>Method note</dt><dd>{evidence.methodNotes}</dd></div> : null}
        </dl>
        <SourceList sourceIds={evidence.sourceIds} citations={evidence.sourceCitations} urls={evidence.sourceUrls} />
      </Disclosure>
    </div>
  )
}
