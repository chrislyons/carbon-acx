import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { EvidenceFacts } from '@/components/content/EvidenceFacts'
import { ACTIVITIES } from '@/lib/calculator'

describe('EvidenceFacts', () => {
  it('renders the shared five-field definition list in contract order', () => {
    const activity = ACTIVITIES[0]
    if (!activity) throw new Error('Generated calculator authority is empty')
    const html = renderToStaticMarkup(createElement(EvidenceFacts, {
      evidence: activity.evidence,
      unitLabel: activity.unitLabel,
    }))

    expect(html).toContain('<dl class="evidence-facts">')
    expect(html.indexOf('<dt>Unit</dt>')).toBeLessThan(html.indexOf('<dt>Boundary</dt>'))
    expect(html.indexOf('<dt>Boundary</dt>')).toBeLessThan(html.indexOf('<dt>Region</dt>'))
    expect(html.indexOf('<dt>Region</dt>')).toBeLessThan(html.indexOf('<dt>Vintage</dt>'))
    expect(html.indexOf('<dt>Vintage</dt>')).toBeLessThan(html.indexOf('<dt>Uncertainty</dt>'))
    expect(html).not.toContain('role="region"')
  })

  it('uses honest null and uncertainty fallbacks', () => {
    const activity = ACTIVITIES[0]
    if (!activity) throw new Error('Generated calculator authority is empty')
    const evidence = {
      ...activity.evidence,
      region: null,
      vintageYear: null,
      scopeBoundary: '',
      uncertainty: { lowGPerUnit: null, highGPerUnit: null },
    }
    const html = renderToStaticMarkup(createElement(EvidenceFacts, { evidence, unitLabel: 'kilometres' }))
    expect(html.match(/Not specified/g)).toHaveLength(3)
    expect(html).toContain('Not quantified')
    expect(html).toContain('km')
  })

  it('formats a bounded uncertainty only when both bounds are finite', () => {
    const activity = ACTIVITIES[0]
    if (!activity) throw new Error('Generated calculator authority is empty')
    const evidence = { ...activity.evidence, uncertainty: { lowGPerUnit: 1.5, highGPerUnit: 3.25 } }
    const html = renderToStaticMarkup(createElement(EvidenceFacts, { evidence, unitLabel: 'kilometres' }))
    expect(html).toContain('1.5–3.25 g CO₂e / km')
  })
})
