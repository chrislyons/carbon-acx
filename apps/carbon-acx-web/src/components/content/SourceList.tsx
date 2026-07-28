interface SourceListProps {
  sourceIds: string[]
  citations: string[]
}

export function SourceList({ sourceIds, citations }: SourceListProps) {
  if (citations.length === 0) return <p className="data-state">No registered citation is available.</p>

  return (
    <ol className="source-list">
      {citations.map((citation, index) => (
        <li key={`${sourceIds[index] ?? 'source'}-${index}`}>
          <span className="source-list__id">{sourceIds[index] ?? 'Source'}</span>
          {citation}
        </li>
      ))}
    </ol>
  )
}
