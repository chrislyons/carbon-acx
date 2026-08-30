import {
  BadgeCheck,
  BookOpenText,
  Car,
  CircleHelp,
  ScanSearch,
  ShoppingBasket,
  type LucideIcon,
} from 'lucide-react'

export type RouteId = 'home' | 'calculator' | 'explore' | 'learn' | 'methodology' | 'evidence'

export interface RouteMeta {
  id: RouteId
  href: string
  label: string
  cue: string
  icon: LucideIcon
}

export const ROUTE_ITEMS = [
  { id: 'home', href: '/', label: 'Home', cue: 'Trace one published estimate', icon: Car },
  { id: 'calculator', href: '/calculator', label: 'Calculator', cue: 'Build an annual worksheet', icon: ShoppingBasket },
  { id: 'explore', href: '/explore', label: 'Explore', cue: 'Browse coverage and evidence', icon: ScanSearch },
  { id: 'learn', href: '/learn', label: 'Learn', cue: 'Read examples across scales', icon: BookOpenText },
  { id: 'methodology', href: '/methodology', label: 'Methodology', cue: 'Understand the calculation rules', icon: CircleHelp },
  { id: 'evidence', href: '/evidence', label: 'Evidence', cue: 'Verify sources and releases', icon: BadgeCheck },
] as const satisfies readonly RouteMeta[]

export function getRouteMeta(route: RouteId): RouteMeta {
  return ROUTE_ITEMS.find((item) => item.id === route) ?? ROUTE_ITEMS[0]
}
