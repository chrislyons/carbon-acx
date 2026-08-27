'use client'
import Link from 'next/link'

import { TabHeader } from '@/components/layout/TabHeader'
import { useMemo, useState } from 'react'
import { EvidenceBadge, FactorRecordDetails } from '@/components/content'
import { AtlasCoverageMap, AtlasModeIcon } from '@/components/viz/AtlasCoverageMap'
import { CATALOG_ACTIVITIES, getAtlasMode, type AtlasMode, type CatalogActivity } from '@/lib/calculator'
import { humanizeCategory } from '@/lib/visualization'

const modes: { id: AtlasMode; label: string; description: string }[] = [
  { id: 'personal', label: 'Personal / household', description: 'Calculator activities with published annual quantity inputs.' },
  { id: 'systems', label: 'Canadian systems', description: 'Professional, online, and light-infrastructure records outside the calculator.' },
  { id: 'industrial', label: 'Industrial layers', description: 'Heavy industry, materials, modeled events, military/security, externalities, and biosphere feedbacks.' },
]
export default function ExplorePage() {
  const [mode, setMode] = useState<AtlasMode>('personal')
  const [selected, setSelected] = useState<CatalogActivity | null>(null)
  const [table, setTable] = useState(false)
  const [category, setCategory] = useState('all')
  const [region, setRegion] = useState('all')
  const [status, setStatus] = useState('all')
  const records = useMemo(() => CATALOG_ACTIVITIES.filter((record) => getAtlasMode(record) === mode), [mode])
  const categories = useMemo(() => [...new Set(records.map((record) => record.category))].sort(), [records])
  const filtered = useMemo(
    () => records.filter((record) => (
      (category === 'all' || record.category === category) &&
      (region === 'all' || record.evidence.region === region) &&
      (status === 'all' || record.evidence.publicationStatus === status)
    )),
    [category, records, region, status],
  )
  const switchMode = (next: AtlasMode) => {
    setMode(next)
    setSelected(null)
    setCategory('all')
    setRegion('all')
    setStatus('all')
  }
  const totalPublished = CATALOG_ACTIVITIES.filter((record) => record.evidence.publicationStatus === 'published').length
  const totalUnavailable = CATALOG_ACTIVITIES.length - totalPublished
  return (
    <div className="editorial-page atlas app-stage">
      <TabHeader
        title="Explore"
        meta={
          <>
            <span>{modes.find((item) => item.id === mode)?.label}</span>
            <span><strong>{filtered.length}</strong> of {CATALOG_ACTIVITIES.length} records</span>
            <Link className="text-link" href="/explore/3d">3D lab →</Link>
          </>
        }
      />
      <div className="atlas__layout">
        <div className="atlas__rail panel">
          <div className="panel__scroll" data-panel-scroll tabIndex={0} role="region" aria-label="Catalogue modes and filters">
            <div className="mode-switcher" aria-label="Catalogue mode">
              {modes.map((item) => (
                <button key={item.id} type="button" aria-pressed={mode === item.id} className={mode === item.id ? 'is-selected' : ''} onClick={() => switchMode(item.id)}><AtlasModeIcon mode={item.id} /><strong>{item.label}</strong><span>{item.description}</span></button>
              ))}
            </div>
            <AtlasFilters
              records={records}
              categories={categories}
              category={category}
              region={region}
              status={status}
              setCategory={setCategory}
              setRegion={setRegion}
              setStatus={setStatus}
            />
          </div>
        </div>
        <section className="atlas__center panel">
          <div className="panel__scroll" data-panel-scroll tabIndex={0} role="region" aria-label="Activity Atlas records">
            <AtlasCoverageMap records={filtered} selectedId={selected?.id ?? null} onSelect={setSelected} />
            <section className="ruled-section atlas__table">
              <button type="button" className="text-link" aria-expanded={table} onClick={() => setTable((value) => !value)}>Data table</button>
              {table ? <AtlasTable filtered={filtered} onSelect={setSelected} /> : null}
            </section>
          </div>
        </section>
        <aside className="atlas__detail panel">
          <div className="panel__scroll" data-panel-scroll tabIndex={0} role="region" aria-label="Record detail">
            <DetailPane record={selected} outsideFilters={Boolean(selected && !filtered.some((record) => record.id === selected.id))} />
          </div>
        </aside>
      </div>
    </div>
  )
}

function AtlasFilters({
  records,
  categories,
  category,
  region,
  status,
  setCategory,
  setRegion,
  setStatus,
}: {
  records: CatalogActivity[]
  categories: string[]
  category: string
  region: string
  status: string
  setCategory: (value: string) => void
  setRegion: (value: string) => void
  setStatus: (value: string) => void
}) {
  return (
    <div className="atlas__filters" role="toolbar" aria-label="Activity Atlas filters">
      <label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">All categories</option>{categories.map((name) => <option key={name} value={name}>{humanizeCategory(name)}</option>)}</select></label>
      <label>Region<select value={region} onChange={(event) => setRegion(event.target.value)}><option value="all">All regions</option>{[...new Set(records.map((record) => record.evidence.region).filter(Boolean))].sort().map((value) => <option key={value} value={value!}>{value}</option>)}</select></label>
      <label>Publication<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All publication states</option><option value="published">Published</option><option value="unavailable">Not available</option></select></label>
    </div>
  )
}

function AtlasTable({
  filtered,
  onSelect,
}: {
  filtered: CatalogActivity[]
  onSelect: (record: CatalogActivity) => void
}) {
  return (
    <>
      {filtered.length ? <div className="table-wrap"><table><thead><tr><th>Activity</th><th>Category</th><th>Region</th><th>Publication</th></tr></thead><tbody>{[...filtered].sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id)).map((record) => <tr key={record.id}><td><button type="button" className="text-link" onClick={() => onSelect(record)}>{record.name}</button></td><td>{humanizeCategory(record.category)}</td><td>{record.evidence.region ?? '—'}</td><td>{record.evidence.publicationStatus === 'published' ? 'Published' : 'Not available'}</td></tr>)}</tbody></table></div> : <div className="empty-ruled-field">No records match these active-mode filters.</div>}
    </>
  )
}


function DetailPane({
  record,
  outsideFilters,
}: {
  record: CatalogActivity | null
  outsideFilters: boolean
}) {
  if (!record) {
    return <aside className="detail-pane"><p className="section-kicker">Record detail</p><p>Select a record from the map to inspect its factor, boundary, and evidence.</p></aside>
  }
  const scopeNote = outsideFilters ? <p className="atlas__scope-note">Selected record is outside the active filters.</p> : null
  if (record.evidence.publicationStatus === 'unavailable') {
    return (
      <aside className="detail-pane">
        <p className="section-kicker">Data gap</p>
        <h2>{record.name}</h2>
        <EvidenceBadge evidence={record.evidence} />
        {scopeNote}
        <p>{record.unavailabilityReason}</p>
        <p><strong>No numeric zero is substituted.</strong></p>
        <p className="mono">{record.evidence.emissionFactorId || 'No factor ID'}</p>
      </aside>
    )
  }
  return (
    <aside className="detail-pane">
      <p className="section-kicker">Record detail</p>
      <h2>{record.name}</h2>
      <EvidenceBadge evidence={record.evidence} />
      {scopeNote}
      <FactorRecordDetails
        description={record.description}
        unitDefinition={record.unitDefinition}
        notes={record.notes}
        unitLabel={record.unitLabel}
        emissionFactor={record.emissionFactor}
        evidence={record.evidence}
      />
    </aside>
  )
}
