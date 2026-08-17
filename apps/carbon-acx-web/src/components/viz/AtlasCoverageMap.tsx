'use client'

import { BadgeCheck, Factory, Network, UserRound } from 'lucide-react'
import { useId } from 'react'
import { ActivityMark } from '@/components/calculator/ActivityMark'
import { buildAtlasCoverageGroups } from '@/lib/visualization'
import { getActivityById, getAtlasMode, type AtlasMode, type CatalogActivity } from '@/lib/calculator'

const modeIcons: Record<AtlasMode, typeof UserRound> = {
  personal: UserRound,
  systems: Network,
  industrial: Factory,
}
export function AtlasModeIcon({ mode }: { mode: AtlasMode }) {
  const Icon = modeIcons[mode]
  return <Icon aria-hidden="true" size={24} />
}

export function AtlasCoverageMap({
  records,
  selectedId,
  onSelect,
}: {
  records: CatalogActivity[]
  selectedId: string | null
  onSelect: (record: CatalogActivity) => void
}) {
  const patternPrefix = useId().replaceAll(':', '')
  const groups = buildAtlasCoverageGroups(records)
  return (
    <section className="data-matrix" aria-label="Activity Atlas coverage map">
      <p className="section-kicker">Coverage map</p>
      <p className="atlas-coverage__legend"><BadgeCheck aria-hidden="true" size={18} /> Published <UnavailableMark patternId={`${patternPrefix}-legend`} /> Unavailable — not zero</p>
      {groups.length ? groups.map((group) => (
        <section key={group.category} className="data-matrix__group">
          <header>
            <div>
              <p className="section-kicker">Category</p>
              <h2>{group.label}</h2>
            </div>
            <span>{group.records.length} records · {group.publishedCount} published · {group.unavailableCount} unavailable</span>
          </header>
          <div className="atlas-coverage__records">
            {group.records.map((record) => {
              const mode = getAtlasMode(record)
              const activity = mode === 'personal' ? getActivityById(record.id) : undefined
              const published = record.evidence.publicationStatus === 'published'
              return (
                <button
                  key={record.id}
                  type="button"
                  className={selectedId === record.id ? 'atlas-record is-selected' : 'atlas-record'}
                  aria-pressed={selectedId === record.id}
                  onClick={() => onSelect(record)}
                >
                  <span className="atlas-record__mark">
                    {activity ? <ActivityMark category={activity.category} activityId={record.id} size={24} /> : <AtlasModeIcon mode={mode} />}
                  </span>
                  <span className="atlas-record__name">{record.name}</span>
                  <span className="atlas-record__state">
                    {published ? <BadgeCheck aria-hidden="true" size={18} /> : <UnavailableMark patternId={`${patternPrefix}-${record.id.replaceAll('.', '-')}`} />}
                    <small>{published ? 'Published' : 'Unavailable'}</small>
                  </span>
                </button>
              )
            })}
          </div>
        </section>
      )) : <div className="empty-ruled-field">No records match these active-mode filters.</div>}
    </section>
  )
}

function UnavailableMark({ patternId }: { patternId: string }) {
  return (
    <svg className="unavailable-mark" aria-hidden="true" width="18" height="18" viewBox="0 0 18 18">
      <defs>
        <pattern id={patternId} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
          <line x1="0" y1="0" x2="0" y2="5" stroke="currentColor" strokeWidth="2" />
        </pattern>
      </defs>
      <rect x="1" y="1" width="16" height="16" fill={`url(#${patternId})`} stroke="currentColor" />
    </svg>
  )
}
