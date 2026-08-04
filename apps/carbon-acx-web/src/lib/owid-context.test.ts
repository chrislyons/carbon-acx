import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { describe, expect, it } from 'vitest'
import { OwidContextCard } from '@/components/content/OwidContextCard'
import {
  OWID_CONTEXT,
  getLatestOwidChange,
  getLatestOwidPoint,
  type OwidContextDataset,
} from './calculator'

describe('OWID context', () => {
  it('loads the pinned Canada series with explicit basis metadata', () => {
    expect(OWID_CONTEXT.status).toBe('available')
    expect(OWID_CONTEXT.selection).toEqual({ entity: 'Canada', code: 'CAN' })
    expect(OWID_CONTEXT.basis).toEqual({
      accountingBasis: 'territorial',
      gas: 'CO₂',
      landUseChange: 'excluded',
      geography: 'country production',
      unit: 'tonnes',
    })
    expect(OWID_CONTEXT.points.length).toBeGreaterThan(1)
  })

  it('returns latest point and change only when the series has enough points', () => {
    const context = {
      ...OWID_CONTEXT,
      points: [
        { year: 2023, value: 100 },
        { year: 2024, value: 125 },
      ],
    }

    expect(getLatestOwidPoint(context)).toEqual({ year: 2024, value: 125 })
    expect(getLatestOwidChange(context)).toEqual({ absolute: 25, percentage: 25 })
    expect(getLatestOwidChange({ ...context, points: [] })).toBeNull()
    expect(getLatestOwidChange({ ...context, points: [context.points[0]] })).toBeNull()
  })

  it('does not invent a point or change for unavailable context', () => {
    const unavailable: OwidContextDataset = {
      schemaVersion: 'acx.owid-context/1-0-0',
      status: 'unavailable',
      generatedAt: '2026-08-04T22:15:00+00:00',
      source: null,
      basis: null,
      selection: { entity: 'Canada', code: 'CAN' },
      points: [],
      reason: 'No pinned OWID snapshot is available in this release.',
    }

    expect(getLatestOwidPoint(unavailable)).toBeNull()
    expect(getLatestOwidChange(unavailable)).toBeNull()
    const markup = renderToStaticMarkup(createElement(OwidContextCard, { context: unavailable }))
    expect(markup).toContain(unavailable.reason)
    expect(markup).toContain('No numeric point or source metadata is substituted.')
    expect(markup).not.toContain('tonnes CO₂')
  })
})
