import React from 'react'
import { ExternalLink } from 'lucide-react'
import { DataState } from '@/components/content/DataState'
import type { SourceRegistryEntry } from '@/lib/sources'

export function SourceRegistry({ entries }: { entries: SourceRegistryEntry[] }) {
  if (entries.length === 0) {
    return <DataState title="No registered sources">No source registry entries are available.</DataState>
  }

  return (
    <div className="source-registry" aria-label="Registered source entries">
      {entries.map((entry) => (
        <details key={entry.sourceId} className="source-registry__entry">
          <summary>
            <span className="source-registry__id">{entry.sourceId}</span>
            <span>{entry.calculatorRecordCount} calculator · {entry.atlasRecordCount} Atlas · {entry.aiScenarioCount} AI scenarios</span>
          </summary>
          <dl className="source-registry__facts">
            <div><dt>Citation</dt><dd>{entry.citation || 'Not specified'}</dd></div>
            <div><dt>URL</dt><dd>{entry.url ? <a href={entry.url} target="_blank" rel="noreferrer"><ExternalLink aria-hidden="true" size={14} />{entry.url}</a> : 'Not specified'}</dd></div>
            <div><dt>Year</dt><dd>{entry.year ?? 'Not specified'}</dd></div>
            <div><dt>License</dt><dd>{entry.license ?? 'Not specified'}</dd></div>
            <div><dt>Review due</dt><dd>{entry.reviewDueAt ?? 'Not specified'}</dd></div>
            <div><dt>Calculator records</dt><dd>{entry.calculatorRecordCount}</dd></div>
            <div><dt>Atlas records</dt><dd>{entry.atlasRecordCount}</dd></div>
            <div><dt>AI scenarios</dt><dd>{entry.aiScenarioCount}</dd></div>
          </dl>
        </details>
      ))}
    </div>
  )
}
