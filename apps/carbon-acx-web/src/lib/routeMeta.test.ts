import { describe, expect, it } from 'vitest'

import { ROUTE_ITEMS } from '@/components/layout/routeMeta'

describe('route metadata registry', () => {
  it('keeps the six public destinations, cues, and marks together', () => {
    expect(ROUTE_ITEMS.map((item) => [item.id, item.href, item.label, item.cue])).toEqual([
      ['home', '/', 'Home', 'Trace one published estimate'],
      ['calculator', '/calculator', 'Calculator', 'Build an annual worksheet'],
      ['explore', '/explore', 'Explore', 'Browse coverage and evidence'],
      ['learn', '/learn', 'Learn', 'Read examples across scales'],
      ['methodology', '/methodology', 'Methodology', 'Understand the calculation rules'],
      ['evidence', '/evidence', 'Evidence', 'Verify sources and releases'],
    ])
    expect(ROUTE_ITEMS.every((item) => Boolean(item.icon))).toBe(true)
  })
})
