import React from 'react'

export function SourceList({
  sourceIds,
  citations,
  urls = [],
}: {
  sourceIds: string[]
  citations: string[]
  urls?: (string | null)[]
}) {
  if (citations.length === 0) return <p className="data-state">No registered citation is available.</p>

  return (
    <ol className="source-list">
      {citations.map((citation, index) => {
        const url = urls[index]?.trim()
        return (
          <li key={`${sourceIds[index] ?? 'source'}-${index}`}>
            <span className="source-list__id">{sourceIds[index] ?? 'Source'}</span>
            {url ? (
              <a href={url} target="_blank" rel="noreferrer">
                {citation}
              </a>
            ) : (
              citation
            )}
          </li>
        )
      })}
    </ol>
  )
}
