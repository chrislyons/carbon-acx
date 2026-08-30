import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { SourceRegistry } from '@/components/content/SourceRegistry'
import type { SourceRegistryEntry } from '@/lib/sources'

const entry: SourceRegistryEntry = {
  sourceId: 'SRC.TEST',
  citation: 'Test citation',
  url: 'https://example.com/source',
  year: '2025',
  license: 'Public',
  reviewDueAt: '2027-01-01',
  calculatorRecordCount: 2,
  atlasRecordCount: 3,
  aiScenarioCount: 1,
}

describe('SourceRegistry', () => {
  it('renders compact metadata rows and separate usage counts', () => {
    const html = renderToStaticMarkup(createElement(SourceRegistry, { entries: [entry] }))
    expect(html).toContain('<details class="source-registry__entry">')
    expect(html).toContain('SRC.TEST')
    expect(html).toContain('2 calculator · 3 Atlas · 1 AI scenarios')
    expect(html).toContain('Calculator records</dt><dd>2')
    expect(html).toContain('Atlas records</dt><dd>3')
    expect(html).toContain('AI scenarios</dt><dd>1')
    expect(html).toContain('href="https://example.com/source"')
  })

  it('uses a data state for an empty registry', () => {
    const html = renderToStaticMarkup(createElement(SourceRegistry, { entries: [] }))
    expect(html).toContain('No registered sources')
    expect(html).toContain('No source registry entries are available.')
    expect(html).not.toContain('citation')
  })
})
