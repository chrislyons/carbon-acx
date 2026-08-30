'use client'

import { Box, RotateCcw } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { TabHeader } from '@/components/layout/TabHeader'
import { abbreviateUnit } from '@/lib/units'
import { DataState, EvidenceBadge, EvidenceFacts, FactorRecordDetails } from '@/components/content'
import { AtlasCoverageMap, AtlasModeIcon } from '@/components/viz/AtlasCoverageMap'
import { CATALOG_ACTIVITIES, getAtlasMode, type AtlasMode, type CatalogActivity } from '@/lib/calculator'
import { buildAtlasCoverageGroups, matchesAtlasRecord, type AtlasCoverageGroup } from '@/lib/visualization'

const modes: ReadonlyArray<{ id: AtlasMode; label: string; description: string }> = [
  { id: 'personal', label: 'Household activities', description: 'Published activities that can be carried into an annual worksheet.' },
  { id: 'systems', label: 'Services & infrastructure', description: 'Published records and records without a publication for shared systems and services.' },
  { id: 'industrial', label: 'Industry & earth systems', description: 'Industrial, security, event, externality, and biosphere records.' },
]

type PublicationFilter = 'all' | 'published' | 'unavailable'

export default function ExplorePage() {
  const [mode, setMode] = useState<AtlasMode>('personal')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [table, setTable] = useState(false)
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState('all')
  const [region, setRegion] = useState('all')
  const [publication, setPublication] = useState<PublicationFilter>('all')
  const [view, setView] = useState<'browse' | 'detail'>('browse')
  const detailHeadingRef = useRef<HTMLHeadingElement>(null)

  const modeRecords = useMemo(
    () => CATALOG_ACTIVITIES.filter((record) => getAtlasMode(record) === mode),
    [mode],
  )
  const groups = useMemo(() => buildAtlasCoverageGroups(modeRecords, mode), [mode, modeRecords])
  const groupLabels = useMemo(
    () => Object.fromEntries(groups.flatMap((coverageGroup) => coverageGroup.records.map((record) => [record.id, coverageGroup.groupLabel]))),
    [groups],
  )
  const regions = useMemo(
    () => [...new Set(modeRecords.map((record) => record.evidence.region).filter((value): value is string => Boolean(value)))].sort(),
    [modeRecords],
  )
  const filtered = useMemo(
    () => modeRecords.filter((record) => (
      (group === 'all' || groupLabels[record.id] === groups.find((coverageGroup) => coverageGroup.groupKey === group)?.groupLabel) &&
      (region === 'all' || record.evidence.region === region) &&
      (publication === 'all' || record.evidence.publicationStatus === publication) &&
      matchesAtlasRecord(record, query, mode)
    )),
    [group, groupLabels, groups, mode, modeRecords, publication, query, region],
  )
  const selected = selectedId ? filtered.find((record) => record.id === selectedId) ?? null : null
  const modePublished = modeRecords.filter((record) => record.evidence.publicationStatus === 'published').length
  const modeUnavailable = modeRecords.length - modePublished
  const modeSummaries = useMemo(
    () => modes.map((item) => {
      const records = CATALOG_ACTIVITIES.filter((record) => getAtlasMode(record) === item.id)
      const published = records.filter((record) => record.evidence.publicationStatus === 'published').length
      return { ...item, count: records.length, published, unavailable: records.length - published }
    }),
    [],
  )

  useEffect(() => {
    if (selectedId && filtered.some((record) => record.id === selectedId)) return
    setSelectedId(filtered[0]?.id ?? null)
  }, [filtered, selectedId])

  useEffect(() => {
    if (view !== 'detail' || !selectedId) return
    window.requestAnimationFrame(() => detailHeadingRef.current?.focus())
  }, [selectedId, view])

  const clearFilters = () => {
    setQuery('')
    setGroup('all')
    setRegion('all')
    setPublication('all')
  }

  const switchMode = (next: AtlasMode) => {
    setMode(next)
    clearFilters()
    setView('browse')
  }

  const selectRecord = (record: CatalogActivity) => {
    setSelectedId(record.id)
    setView('detail')
  }

  const returnToBrowse = () => {
    const restoreId = selectedId
    setView('browse')
    if (restoreId) window.requestAnimationFrame(() => document.getElementById(`atlas-record-${restoreId}`)?.focus())
  }

  return (
    <div className="editorial-page atlas workspace">
      <TabHeader
        route="explore"
        meta={
          <>
            <span><strong>{modePublished}</strong> published · <strong>{modeUnavailable}</strong> Not available</span>
            <span>Units stay incomparable</span>
          </>
        }
        actions={
          <Link className="action-link" href="/explore/3d"><Box aria-hidden="true" size={15} />Experimental 3D lab</Link>
        }
      />
      <div className="atlas-view-toggle" role="group" aria-label="Atlas view">
        <button type="button" aria-pressed={view === 'browse'} onClick={() => setView('browse')}>Browse records</button>
        <button type="button" aria-pressed={view === 'detail'} onClick={() => setView('detail')} disabled={!selected}>Record detail</button>
      </div>
      <p className="atlas__live" role="status" aria-live="polite">
        {filtered.length} of {modeRecords.length} records in {modes.find((item) => item.id === mode)?.label}
      </p>
      <div className="atlas__layout">
        <section className="atlas__rail panel" aria-label="Atlas modes and filters">
          <div className="panel__scroll" data-panel-scroll tabIndex={0} role="region" aria-label="Atlas modes and filters">
            <div className="mode-switcher" aria-label="Atlas mode">
              {modeSummaries.map((item) => (
                <button key={item.id} type="button" aria-pressed={mode === item.id} className={mode === item.id ? 'is-selected' : ''} onClick={() => switchMode(item.id)}>
                  <AtlasModeIcon mode={item.id} />
                  <strong>{item.label}</strong>
                  <span>{item.description} {item.count} records · {item.published} published · {item.unavailable} Not available</span>
                </button>
              ))}
            </div>
            <AtlasFilters
              groups={groups}
              regions={regions}
              query={query}
              group={group}
              region={region}
              publication={publication}
              setQuery={setQuery}
              setGroup={setGroup}
              setRegion={setRegion}
              setPublication={setPublication}
              clearFilters={clearFilters}
            />
          </div>
        </section>
        <section className="atlas__center panel" data-compact-view={view === 'browse' ? 'visible' : 'hidden'} aria-label="Browse records">
          <div className="panel__scroll" data-panel-scroll tabIndex={0} role="region" aria-label="Browse records">
            <AtlasCoverageMap records={filtered} mode={mode} selectedId={selectedId} onSelect={selectRecord} />
            <section className="ruled-section atlas__table">
              <button type="button" className="text-link" aria-expanded={table} onClick={() => setTable((value) => !value)}>Data table</button>
              {table ? <AtlasTable filtered={filtered} groupLabels={groupLabels} onSelect={selectRecord} /> : null}
            </section>
          </div>
        </section>
        <aside className="atlas__detail panel" data-compact-view={view === 'detail' ? 'visible' : 'hidden'} aria-label="Record detail">
          <div className="panel__scroll" data-panel-scroll tabIndex={0} role="region" aria-label="Record detail">
            <button type="button" className="atlas__back" onClick={returnToBrowse}>Back to records</button>
            <DetailPane record={selected} headingRef={detailHeadingRef} />
          </div>
        </aside>
      </div>
    </div>
  )
}

function AtlasFilters({
  groups,
  regions,
  query,
  group,
  region,
  publication,
  setQuery,
  setGroup,
  setRegion,
  setPublication,
  clearFilters,
}: {
  groups: AtlasCoverageGroup[]
  regions: string[]
  query: string
  group: string
  region: string
  publication: PublicationFilter
  setQuery: (value: string) => void
  setGroup: (value: string) => void
  setRegion: (value: string) => void
  setPublication: (value: PublicationFilter) => void
  clearFilters: () => void
}) {
  return (
    <div className="atlas__filters" role="group" aria-label="Activity Atlas filters">
      <label>Search records<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, factor, region" /></label>
      <label>Group<select value={group} onChange={(event) => setGroup(event.target.value)}><option value="all">All groups</option>{groups.map((coverageGroup) => <option key={coverageGroup.groupKey} value={coverageGroup.groupKey}>{coverageGroup.groupLabel}</option>)}</select></label>
      <label>Region<select value={region} onChange={(event) => setRegion(event.target.value)}><option value="all">All regions</option>{regions.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
      <label>Publication<select value={publication} onChange={(event) => setPublication(event.target.value as PublicationFilter)}><option value="all">All publication states</option><option value="published">Published</option><option value="unavailable">Not available</option></select></label>
      <button type="button" className="text-link" onClick={clearFilters}><RotateCcw aria-hidden="true" size={15} />Reset filters</button>
    </div>
  )
}

function AtlasTable({
  filtered,
  groupLabels,
  onSelect,
}: {
  filtered: CatalogActivity[]
  groupLabels: Record<string, string>
  onSelect: (record: CatalogActivity) => void
}) {
  return filtered.length ? (
    <div className="table-wrap">
      <table>
        <thead><tr><th>Activity</th><th>Group</th><th>Region</th><th>Publication</th></tr></thead>
        <tbody>
          {[...filtered].sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id)).map((record) => (
            <tr key={record.id}>
              <td><button type="button" className="text-link" onClick={() => onSelect(record)}>{record.name}</button></td>
              <td>{groupLabels[record.id] ?? 'Unclassified sector'}</td>
              <td>{record.evidence.region ?? 'Not specified'}</td>
              <td>{record.evidence.publicationStatus === 'published' ? 'Published' : 'Not available'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ) : <div className="empty-ruled-field">No records match these active-mode filters.</div>
}

function DetailPane({
  record,
  headingRef,
}: {
  record: CatalogActivity | null
  headingRef: React.RefObject<HTMLHeadingElement | null>
}) {
  if (!record) {
    return <div className="detail-pane"><p className="section-kicker">Record detail</p><h2 ref={headingRef} tabIndex={-1}>No record selected</h2><p>Select a record from Browse records to inspect its factor, boundary, and evidence.</p></div>
  }
  if (record.evidence.publicationStatus === 'unavailable') {
    return (
      <div className="detail-pane">
        <p className="section-kicker">Coverage gap</p>
        <h2 ref={headingRef} tabIndex={-1}>{record.name}</h2>
        <EvidenceBadge evidence={record.evidence} />
        <div className="data-state data-state--warning" role="alert"><p><strong>Not available</strong></p><p>{record.unavailabilityReason ?? 'No published numeric value is available.'} No numeric zero is substituted.</p></div>
        <EvidenceFacts evidence={record.evidence} unitLabel={record.unitLabel} />
      </div>
    )
  }
  return (
    <div className="detail-pane">
      <p className="section-kicker">Record detail</p>
      <h2 ref={headingRef} tabIndex={-1}>{record.name}</h2>
      <EvidenceBadge evidence={record.evidence} />
      <FactorRecordDetails
        description={record.description}
        unitDefinition={record.unitDefinition}
        notes={record.notes}
        unitLabel={abbreviateUnit(record.unitLabel)}
        emissionFactor={record.emissionFactor}
        evidence={record.evidence}
      />
    </div>
  )
}
