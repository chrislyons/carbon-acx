import type { ActivityCategory } from '@/lib/calculator'

const paths: Record<ActivityCategory, React.ReactNode> = {
  transport: <path d="M3 15h18M5 15l2-8h10l2 8M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm10 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />,
  food: <path d="M12 21V10M7 3v4a3 3 0 0 0 6 0V3M17 3v18M17 3c3 2 3 6 0 8" />,
  digital: <path d="M4 5h16v11H4zM9 20h6M12 16v4" />,
  home: <path d="m3 11 9-8 9 8v10H3zM9 21v-6h6v6" />,
  shopping: <path d="M5 8h14l-1 13H6zm4 0a3 3 0 0 1 6 0" />,
}

export function ActivityMark({ category }: { category: ActivityCategory }) {
  return <svg aria-hidden="true" className="activity-mark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">{paths[category]}</svg>
}
