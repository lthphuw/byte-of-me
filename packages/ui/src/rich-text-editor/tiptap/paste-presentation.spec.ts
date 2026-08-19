/**
 * What a paste is allowed to bring with it.
 *
 * The contract is stated against the DOCUMENT the editor would end up with —
 * `generateJSON` over the editor's own extension list — rather than against the
 * transformed HTML string. That is the difference that matters: Tiptap keeps
 * only what an extension claims, so "the colour is gone" is a question about
 * marks in the document, and asserting on the intermediate HTML would pass
 * happily while `TextStyle`/`Color` went on parsing something the strip missed.
 *
 * The fixtures are the four shapes an author actually pastes from, each with
 * its own junk: Google Docs' `<b style="font-weight:normal">` wrapper and
 * `<span style="color:…">` runs, a Google Sheets range with a `<colgroup>`,
 * Excel's `<font face color>` and `bgcolor`, Notion's `class="c3 c7"`, and a
 * table copied out of a rendered web page.
 */
import { generateJSON } from '@tiptap/html';
import type { JSONContent } from '@tiptap/react';
import { describe, expect, test } from 'bun:test';

import { stripPastedPresentation } from './paste-presentation';
import { createExtensions } from './rich-text-editor';

const extensions = createExtensions();

/** The document the editor would hold after pasting `html`. */
function paste(html: string): JSONContent {
  return generateJSON(stripPastedPresentation(html), extensions);
}

function walk(node: JSONContent, visit: (node: JSONContent) => void): void {
  visit(node);
  for (const child of node.content ?? []) walk(child, visit);
}

function nodesOfType(doc: JSONContent, type: string): JSONContent[] {
  const found: JSONContent[] = [];
  walk(doc, (node) => {
    if (node.type === type) found.push(node);
  });
  return found;
}

function markTypes(doc: JSONContent): string[] {
  const types: string[] = [];
  walk(doc, (node) => {
    for (const mark of node.marks ?? []) types.push(mark.type);
  });
  return types;
}

/** Every attribute value in the document, flattened — colour hides in several. */
function attrValues(doc: JSONContent): unknown[] {
  const values: unknown[] = [];
  walk(doc, (node) => {
    values.push(...Object.values(node.attrs ?? {}));
    for (const mark of node.marks ?? []) {
      values.push(...Object.values(mark.attrs ?? {}));
    }
  });
  return values;
}

function textOf(doc: JSONContent): string {
  let text = '';
  walk(doc, (node) => {
    if (typeof node.text === 'string') text += node.text;
  });
  return text;
}

const GOOGLE_DOCS = `
<meta charset="utf-8"><b style="font-weight:normal" id="docs-internal-guid-4f1">
  <p dir="ltr" style="line-height:1.38;margin-top:0pt;">
    <span style="font-size:11pt;font-family:Arial;color:#0000ee;background-color:#ffff00;">
      Quarterly summary
    </span>
  </p>
</b>`;

const GOOGLE_SHEETS = `
<meta charset="utf-8"><google-sheets-html-origin>
<table xmlns="http://www.w3.org/1999/xhtml" cellspacing="0" cellpadding="0" dir="ltr"
       border="1" style="table-layout:fixed;font-size:10pt;font-family:Arial;">
  <colgroup><col width="217"/><col width="132"/></colgroup>
  <tbody>
    <tr style="height:21px;">
      <th style="background-color:#434343;color:#ffffff;font-weight:bold;">Region</th>
      <th style="background-color:#434343;color:#ffffff;font-weight:bold;">Revenue</th>
    </tr>
    <tr style="height:21px;">
      <td style="background-color:#fff2cc;color:#073763;">EMEA</td>
      <td style="background-color:#fff2cc;color:#073763;">12,400</td>
    </tr>
  </tbody>
</table>`;

const EXCEL = `
<table border="1" cellpadding="0" cellspacing="0" width="240" style="border-collapse:collapse;">
  <tr height="20">
    <td width="120" bgcolor="#FFFF00" style="background:#FFFF00;color:#FF0000;">
      <font face="Calibri" color="#FF0000" size="2">Overdue</font>
    </td>
    <td width="120" style="color:#006100;">Paid</td>
  </tr>
</table>`;

const NOTION = `
<table class="simple-table"><tbody>
  <tr class="c3"><th class="c3 c7" style="color:rgb(55,53,47);">Task</th></tr>
  <tr class="c3"><td class="c3 c9" style="background:rgba(35,131,226,0.14);">
    <strong>Ship</strong> the <em>editor</em>
  </td></tr>
</tbody></table>`;

const WEB_PAGE = `
<table class="wikitable"><tbody>
  <tr><th class="header" bgcolor="#eaecf0" align="center" width="180">Source</th></tr>
  <tr><td class="cell" style="color:#0000ee;">
    <a class="external text" style="color:#3366cc;" href="https://example.com/spec">the spec</a>
    <mark style="background-color:#ffff00;color:#b45309;">highlighted</mark>
  </td></tr>
</tbody></table>`;

describe('stripPastedPresentation', () => {
  test('drops the source document’s text colour', () => {
    const doc = paste(GOOGLE_DOCS);

    expect(textOf(doc)).toContain('Quarterly summary');
    expect(markTypes(doc)).not.toContain('textStyle');
    expect(attrValues(doc)).not.toContain('#0000ee');
  });

  test('drops the source document’s background colour', () => {
    expect(markTypes(paste(GOOGLE_DOCS))).not.toContain('highlight');
    expect(attrValues(paste(GOOGLE_DOCS))).not.toContain('#ffff00');

    // `<mark>` is semantic, so the highlight itself stays — as THIS document's
    // highlight, with the source's wash dropped.
    const marked = paste(WEB_PAGE);
    const highlight = markTypes(marked).filter((type) => type === 'highlight');
    expect(highlight).toHaveLength(1);
    expect(attrValues(marked)).not.toContain('#ffff00');
  });

  test('does not turn a Google Docs fragment bold via its wrapper', () => {
    // `<b style="font-weight:normal">` wraps the whole clipboard fragment, so
    // stripping the style and keeping the tag would bold the entire paste.
    expect(markTypes(paste(GOOGLE_DOCS))).not.toContain('bold');
  });

  test('keeps a pasted spreadsheet’s table structure', () => {
    const doc = paste(GOOGLE_SHEETS);

    expect(nodesOfType(doc, 'table')).toHaveLength(1);
    expect(nodesOfType(doc, 'tableRow')).toHaveLength(2);
    expect(nodesOfType(doc, 'tableHeader')).toHaveLength(2);
    expect(nodesOfType(doc, 'tableCell')).toHaveLength(2);
    expect(textOf(doc)).toContain('EMEA');
    expect(textOf(doc)).toContain('12,400');
  });

  test('keeps no colour and no column widths from a spreadsheet range', () => {
    const doc = paste(GOOGLE_SHEETS);
    const values = attrValues(doc);

    expect(markTypes(doc)).not.toContain('textStyle');
    expect(values).not.toContain('#073763');
    // `<colgroup>` is where a cell's `colwidth` comes from — a pasted table
    // must fill the writing column, not the source spreadsheet's grid.
    expect(values.every((value) => !Array.isArray(value))).toBe(true);
  });

  test('drops Excel’s <font> and bgcolor without losing the cells', () => {
    const doc = paste(EXCEL);
    const values = attrValues(doc);

    expect(nodesOfType(doc, 'tableCell')).toHaveLength(2);
    expect(textOf(doc)).toContain('Overdue');
    expect(textOf(doc)).toContain('Paid');
    expect(markTypes(doc)).not.toContain('textStyle');
    expect(values).not.toContain('#FF0000');
    expect(values).not.toContain('#FFFF00');
  });

  test('keeps a Notion table’s header row, bold and italic', () => {
    const doc = paste(NOTION);

    expect(nodesOfType(doc, 'tableHeader')).toHaveLength(1);
    expect(markTypes(doc)).toContain('bold');
    expect(markTypes(doc)).toContain('italic');
    expect(markTypes(doc)).not.toContain('textStyle');
  });

  test('keeps a link’s href and drops the source’s classes', () => {
    const doc = paste(WEB_PAGE);
    const link = nodesOfType(doc, 'text')
      .flatMap((node) => node.marks ?? [])
      .find((mark) => mark.type === 'link');

    expect(link?.attrs?.href).toBe('https://example.com/spec');
    expect(link?.attrs?.class).toBeNull();
    expect(markTypes(doc)).not.toContain('textStyle');
  });

  test('keeps a fenced code block’s language class', () => {
    const doc = paste(
      '<pre class="highlight" style="background:#f6f8fa;">' +
        '<code class="language-ts hljs" style="color:#24292e;">const x = 1;</code></pre>'
    );

    const [block] = nodesOfType(doc, 'codeBlock');
    expect(block?.attrs?.language).toBe('ts');
    expect(textOf(doc)).toBe('const x = 1;');
  });

  test('leaves the editor’s own clipboard fragment alone', () => {
    // A copy WITHIN the editor is already in this document's format, so the
    // colour the author applied by hand has to survive the round trip.
    const internal =
      '<div data-pm-slice="1 1 []"><p><span style="color: #ef4444">mine</span></p></div>';

    expect(stripPastedPresentation(internal)).toBe(internal);
    expect(markTypes(paste(internal))).toContain('textStyle');
  });
});
