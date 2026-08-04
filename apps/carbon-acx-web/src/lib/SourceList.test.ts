import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { SourceList } from '@/components/content/SourceList'

describe('SourceList', () => {
  it('links an aligned external URL and keeps text fallback for missing URL', () => {
    const html = renderToStaticMarkup(
      createElement(SourceList, {
        sourceIds: ['SRC.LINKED', 'SRC.TEXT'],
        citations: ['Linked citation', 'Text citation'],
        urls: ['https://example.com/source', null],
      }),
    )

    expect(html).toContain('href="https://example.com/source"')
    expect(html).toContain('>Linked citation</a>')
    expect(html).toContain('>Text citation</li>')
  })
})
