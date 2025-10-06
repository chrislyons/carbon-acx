import { describe, expect, it } from 'vitest';

import { parseReferenceList } from '../api';

describe('parseReferenceList', () => {
  it('returns trimmed lines for plain text lists', () => {
    const text = '\n [1] First reference. \n[2] Second reference.\n\n';
    expect(parseReferenceList(text)).toEqual(['[1] First reference.', '[2] Second reference.']);
  });

  it('extracts list items from HTML documents', () => {
    const text = `<!doctype html>
<html lang="en">
  <body>
    <main>
      <h1>References</h1>
      <ol>
        <li>[1] First reference.</li>
        <li><span>[2]</span> Second reference.</li>
        <li>
          [3]
          Third reference
          <br />
          with line break.
        </li>
      </ol>
    </main>
  </body>
</html>`;

    expect(parseReferenceList(text)).toEqual([
      '[1] First reference.',
      '[2] Second reference.',
      '[3] Third reference with line break.'
    ]);
  });

  it('falls back to trimmed lines when HTML parsing fails', () => {
    const text = '<!doctype html>\n<custom-element>'; // malformed for DOMParser
    expect(parseReferenceList(text)).toEqual(['<!doctype html>', '<custom-element>']);
  });
});
