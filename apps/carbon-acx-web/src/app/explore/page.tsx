'use client'

import { useMemo, useState } from 'react'
import { SourceList } from '@/components/content'
import { CATALOG_ACTIVITIES, getAtlasMode, type AtlasMode, type CatalogActivity } from '@/lib/calculator'

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
  const grouped = useMemo(() => records.reduce<Record<string, CatalogActivity[]>>((groups, record) => { (groups[record.category] ??= []).push(record); return groups }, {}), [records])
  const categories = Object.keys(grouped).sort()
  const filtered = records.filter((record) => (category === 'all' || record.category === category) && (region === 'all' || record.evidence.region === region) && (status === 'all' || record.evidence.publicationStatus === status))
  const switchMode = (next: AtlasMode) => { setMode(next); setSelected(null); setCategory('all'); setRegion('all'); setStatus('all') }
  const totalPublished = CATALOG_ACTIVITIES.filter((record) => record.evidence.publicationStatus === 'published').length
  const totalUnavailable = CATALOG_ACTIVITIES.length - totalPublished
  return <div className="editorial-page atlas">
    <header className="ruled-section"><p className="section-kicker">Evidence catalogue</p><h1>Read activity factors in their proper layer.</h1><p>{CATALOG_ACTIVITIES.length} records: {totalPublished} published and {totalUnavailable} unavailable. Factor magnitudes cannot be compared across incompatible units.</p></header>
    <div className="mode-switcher" aria-label="Catalogue mode">{modes.map((item) => <button key={item.id} aria-pressed={mode === item.id} className={mode === item.id ? 'is-selected' : ''} onClick={() => switchMode(item.id)}><strong>{item.label}</strong><span>{item.description}</span></button>)}</div>
    <div className="atlas__scan"><section className="data-matrix" aria-label={`${modes.find((item) => item.id === mode)?.label} category matrix`}><p className="section-kicker">Category matrix</p>{categories.map((name) => { const entries = grouped[name]; const available = entries.filter((entry) => entry.evidence.publicationStatus === 'published').length; return <section key={name} className="data-matrix__group"><header><h2>{label(name)}</h2><span>{entries.length} records · {available}/{entries.length} published</span></header><div>{entries.map((record) => <button key={record.id} className={selected?.id === record.id ? 'is-selected' : ''} onClick={() => setSelected(record)}><span>{record.name}</span><small>{record.evidence.publicationStatus === 'published' ? 'Published' : 'Not available'}</small></button>)}</div></section> })}</section><DetailPane record={selected} /></div>
    <section className="ruled-section atlas__table"><button className="text-link" aria-expanded={table} onClick={() => setTable((value) => !value)}>Data table</button>{table ? <><div className="atlas__filters"><label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="all">All categories</option>{categories.map((name) => <option key={name} value={name}>{label(name)}</option>)}</select></label><label>Region<select value={region} onChange={(event) => setRegion(event.target.value)}><option value="all">All regions</option>{[...new Set(records.map((record) => record.evidence.region).filter(Boolean))].sort().map((value) => <option key={value} value={value!}>{value}</option>)}</select></label><label>Publication<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All publication states</option><option value="published">Published</option><option value="unavailable">Not available</option></select></label></div>{filtered.length ? <div className="table-wrap"><table><thead><tr><th>Activity</th><th>Category</th><th>Region</th><th>Publication</th></tr></thead><tbody>{filtered.sort((a, b) => a.name.localeCompare(b.name)).map((record) => <tr key={record.id}><td><button className="text-link" onClick={() => setSelected(record)}>{record.name}</button></td><td>{label(record.category)}</td><td>{record.evidence.region ?? '—'}</td><td>{record.evidence.publicationStatus === 'published' ? 'Published' : 'Not available'}</td></tr>)}</tbody></table></div> : <div className="empty-ruled-field">No records match these active-mode filters.</div>}</> : null}</section>
  </div>
}

function DetailPane({ record }: { record: CatalogActivity | null }) { if (!record) return <aside className="detail-pane"><p className="section-kicker">Record detail</p><p>Select a record from the matrix to inspect its factor, boundary, and evidence.</p></aside>; if (record.evidence.publicationStatus === 'unavailable') return <aside className="detail-pane"><p className="section-kicker">Data gap</p><h2>{record.name}</h2><p className="status-mark">Not available</p><p>{record.unavailabilityReason}</p><p><strong>No numeric zero is substituted.</strong></p><p className="mono">{record.evidence.emissionFactorId || 'No factor ID'}</p></aside>; return <aside className="detail-pane"><p className="section-kicker">Record detail</p><h2>{record.name}</h2><p className="equation">{record.emissionFactor} g CO₂e / {record.unitLabel}</p><dl><div><dt>Scope</dt><dd>{record.evidence.scopeBoundary}</dd></div><div><dt>Region</dt><dd>{record.evidence.region}</dd></div><div><dt>Vintage</dt><dd>{record.evidence.vintageYear}</dd></div><div><dt>GWP horizon</dt><dd>{record.evidence.gwpHorizon}</dd></div><div><dt>Uncertainty</dt><dd>{record.evidence.uncertainty.lowGPerUnit == null ? 'Not quantified' : `${record.evidence.uncertainty.lowGPerUnit}–${record.evidence.uncertainty.highGPerUnit} g CO₂e / ${record.unitLabel}`}</dd></div><div><dt>Method</dt><dd>{record.evidence.methodNotes}</dd></div><div><dt>Factor ID</dt><dd className="mono">{record.evidence.emissionFactorId}</dd></div></dl><SourceList sourceIds={record.evidence.sourceIds} citations={record.evidence.sourceCitations} /></aside> }

function label(value: string) { return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()) }
