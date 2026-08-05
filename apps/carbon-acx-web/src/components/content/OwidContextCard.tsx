import * as React from 'react'
import { Disclosure } from './Disclosure'
import {
  OWID_CONTEXT,
  getLatestOwidChange,
  getLatestOwidPoint,
  type OwidContextDataset,
} from '@/lib/calculator'

interface OwidContextCardProps {
  context?: OwidContextDataset
}

const numberFormat = new Intl.NumberFormat('en-CA', { maximumFractionDigits: 1 })
const integerFormat = new Intl.NumberFormat('en-CA', { maximumFractionDigits: 0 })


export function OwidContextCard({ context = OWID_CONTEXT }: OwidContextCardProps) {
  const latest = getLatestOwidPoint(context)
  const change = getLatestOwidChange(context)
  const recent = context.points.slice(-5).reverse()

  return (
    <section className="owid-context surface-card" aria-labelledby="owid-context-title">
      <p className="section-kicker">Pinned macro context</p>
      <h2 id="owid-context-title">Our World in Data context</h2>
      {context.status === 'unavailable' ? (
        <>
          <p>{context.reason ?? 'The pinned OWID snapshot is unavailable.'}</p>
          <p className="text-sm">No numeric point or source metadata is substituted.</p>
        </>
      ) : (
        <>
          <p>
            This is labelled context for the scale of national production emissions. It is not a
            calculator factor, benchmark, or organizational comparison.
          </p>
          <p>
            {latest
              ? `The latest Canada value is ${numberFormat.format(latest.value)} tonnes CO₂ in ${latest.year}.`
              : 'The latest Canada value is not available.'}
          </p>
          <div className="owid-context__latest">
            <div>
              <span className="section-kicker">Latest Canada value</span>
              <strong>
                {latest ? `${numberFormat.format(latest.value)} tonnes CO₂ (${latest.year})` : 'Not available'}
              </strong>
            </div>
            {change ? (
              <div>
                <span className="section-kicker">Latest year-on-year change</span>
                <strong>
                  {numberFormat.format(change.absolute)} tonnes CO₂
                  {change.percentage === null ? '' : ` (${numberFormat.format(change.percentage)}%)`}
                </strong>
                <p className="text-sm">
                  Compared with the previous year; this is context only and not a factor change.
                </p>
              </div>
            ) : null}
          </div>
          <Disclosure summary="Inspect the latest five annual values">
            <ol className="owid-context__values">
              {recent.map((point) => (
                <li key={point.year}>
                  <span>{point.year}</span>
                  <strong>{integerFormat.format(point.value)} tonnes CO₂</strong>
                </li>
              ))}
            </ol>
          </Disclosure>
          <p>
            <strong>Why this context is shown:</strong> the snapshot uses{' '}
            {context.basis?.accountingBasis ?? 'Not specified'} accounting, excludes{' '}
            {context.basis?.landUseChange ?? 'Not specified'} land-use change, follows{' '}
            {context.basis?.geography ?? 'Not specified'} geography, and reports{' '}
            {context.basis?.unit ?? 'Not specified'}.
          </p>
          <dl className="owid-context__basis">
            <div>
              <dt>Accounting basis</dt>
              <dd>{context.basis?.accountingBasis ?? 'Not specified'}</dd>
            </div>
            <div>
              <dt>Land-use change</dt>
              <dd>{context.basis?.landUseChange ?? 'Not specified'}</dd>
            </div>
            <div>
              <dt>Geography</dt>
              <dd>{context.basis?.geography ?? 'Not specified'}</dd>
            </div>
            <div>
              <dt>Unit</dt>
              <dd>{context.basis?.unit ?? 'Not specified'}</dd>
            </div>
          </dl>
        </>
      )}
      <div className="owid-context__links">
        <a className="text-link" href="/data/owid-context.json">
          Open the offline context record
        </a>
        <a className="text-link" href="/data/release.json">
          Open the release manifest
        </a>
      </div>
      {context.status === 'available' && context.source ? (
        <Disclosure summary="Source and release details">
          <dl className="compact-reference-list">
            <div>
              <dt>Source</dt>
              <dd>
                <a className="text-link" href={context.source.chartUrl} target="_blank" rel="noreferrer">
                  {context.source.provider}, {context.source.citation}
                </a>
              </dd>
            </div>
            <div>
              <dt>Chart ID</dt>
              <dd>{context.source.chartId}</dd>
            </div>
            <div>
              <dt>Metric</dt>
              <dd>{context.source.metric}</dd>
            </div>
            <div>
              <dt>Retrieved</dt>
              <dd>{context.source.retrievedAt}</dd>
            </div>
            <div>
              <dt>Upstream vintage</dt>
              <dd>
                {context.source.upstreamLastUpdated} ({context.source.upstreamTimespan})
              </dd>
            </div>
            <div>
              <dt>License</dt>
              <dd>{context.source.license}</dd>
            </div>
            <div>
              <dt>Raw snapshot</dt>
              <dd>
                <a className="text-link" href="/data/owid/annual-co2-emissions-per-country.csv">
                  CSV
                </a>{' '}
                <a className="text-link" href="/data/owid/annual-co2-emissions-per-country.metadata.json">
                  metadata
                </a>{' '}
                <a className="text-link" href="/data/owid/manifest.json">
                  manifest
                </a>
              </dd>
            </div>
          </dl>
        </Disclosure>
      ) : null}
    </section>
  )
}
