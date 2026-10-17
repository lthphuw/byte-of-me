/**
 * When a paste counts as Markdown source, from the plain-text and (if any) HTML clipboard flavours.
 * Cases: a Markdown file in an editor, a chat message, a rendered page, this editor itself.
 */
import { describe, expect, test } from 'bun:test';

import { isMarkdownPaste } from './paste-markdown';

describe('isMarkdownPaste', () => {
  test.each([
    ['an ATX heading', '## Results'],
    ['a bullet list', '- FP16: baseline\n- INT8: faster'],
    ['a star bullet', '* one\n* two'],
    ['an ordered list', '1. Export\n2. Build'],
    ['a blockquote', '> measured on a T4'],
    ['a code fence', '```py\nprint(1)\n```'],
    ['a tilde fence', '~~~\ncode\n~~~'],
    ['a table', '| size | speedup |\n|---|---|\n| s | 1.10x |'],
    ['a table with alignment colons', 'a | b\n:--- | ---:\n1 | 2'],
    ['a heading deep in a long text', 'Intro line\n\nmore\n\n### Details\n\ntext'],
  ])('takes %s as Markdown', (_name, text) => {
    expect(isMarkdownPaste(text, '')).toBe(true);
  });

  test.each([
    ['a sentence', 'Faster detector export, measured on a T4.'],
    ['a hash tag with no space', '#498 landed on main'],
    ['a hash inside a sentence', 'issue # 12 is closed'],
    ['inline marks only', 'It is **fast** and `cheap` and *small*.'],
    ['a bullet glyph with no text', '-'],
    ['a dash in a sentence', 'a - b'],
    ['a lone divider line', 'Before\n\n---\n\nAfter'],
    ['a number with no list marker', '2024 was the year'],
    ['nothing', ''],
    ['whitespace only', ' \n\t '],
  ])('leaves %s as text', (_name, text) => {
    expect(isMarkdownPaste(text, '')).toBe(false);
  });

  test('takes Markdown copied from an app that sends only div and span HTML', () => {
    const html =
      '<meta charset="utf-8"><div style="color:#ccc"><div><span>## Results</span></div><div><span>- one</span></div></div>';

    expect(isMarkdownPaste('## Results\n- one', html)).toBe(true);
  });

  test('leaves a rendered page to the HTML path, which already carries its structure', () => {
    const text = 'Results\nFP16: baseline\nINT8: faster';
    const heading = '<h2>Results</h2><ul><li>FP16</li><li>INT8</li></ul>';
    const table = '<table><tr><td>a</td></tr></table>';
    const code = '<pre><code>## not a heading</code></pre>';

    expect(isMarkdownPaste('## Results\n- FP16', heading)).toBe(false);
    expect(isMarkdownPaste('| a |\n|---|---|', table)).toBe(false);
    expect(isMarkdownPaste('```\n## x\n```', code)).toBe(false);
    expect(isMarkdownPaste(text, heading)).toBe(false);
  });

  test('leaves a copy made inside this editor alone', () => {
    const internal = '<p data-pm-slice="1 1 []">- a literal dash line</p>';

    expect(isMarkdownPaste('- a literal dash line', internal)).toBe(false);
  });
});
