import { Check, Plus } from 'lucide-react'
import { ActivityMark } from '@/components/calculator/ActivityMark'
import { EvidenceBadge } from '@/components/content'
import { CATEGORY_INFO, type Activity, type ActivityCategory } from '@/lib/calculator'

export function ActivityShelf({
  category,
  activities,
  selectedIds,
  onAdd,
}: {
  category: ActivityCategory
  activities: Activity[]
  selectedIds: string[]
  onAdd: (activity: Activity) => void
}) {
  return (
    <section className="activity-shelf ruled-section" aria-labelledby="activity-shelf-title">
      <div className="activity-shelf__heading">
        <div>
          <p className="section-kicker">Published activity shelf</p>
          <h2 id="activity-shelf-title">{CATEGORY_INFO[category].name}</h2>
        </div>
        <p>{activities.length} recognizable records to add and compare.</p>
      </div>
      <div className="activity-shelf__grid">
        {activities.map((activity) => {
          const selected = selectedIds.includes(activity.id)
          return (
            <article key={activity.id} className={selected ? 'activity-tile is-selected' : 'activity-tile'}>
              <ActivityMark category={activity.category} activityId={activity.id} size={32} />
              <h3>{activity.name}</h3>
              <p className="activity-tile__unit">per {activity.unitLabel}</p>
              <p className="activity-tile__cue">
                {activity.evidence.region ?? 'Region not specified'} · {activity.evidence.vintageYear ?? 'Vintage not specified'}
              </p>
              <EvidenceBadge evidence={activity.evidence} />
              <button
                type="button"
                className="activity-tile__add"
                aria-label={`Add ${activity.name} to your activity basket`}
                aria-pressed={selected}
                aria-disabled={selected}
                onClick={() => onAdd(activity)}
              >
                {selected ? <Check aria-hidden="true" size={18} strokeWidth={2.5} /> : <Plus aria-hidden="true" size={18} strokeWidth={2.5} />}
                <span>{selected ? 'Added' : 'Add to basket'}</span>
              </button>
            </article>
          )
        })}
      </div>
    </section>
  )
}
