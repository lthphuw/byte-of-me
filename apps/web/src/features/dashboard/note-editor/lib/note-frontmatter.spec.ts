/**
 * `.md` export writes real YAML by hand — no dependency, because the shape is
 * fixed and tiny (scalars plus one string list) and a YAML library is tens of
 * kilobytes to emit ten lines into a file the browser downloads.
 *
 * The escaping rules are the entire reason this is a tested module rather
 * than a template literal inside the download handler: a title like
 * `Status: 12` round-trips back out of YAML as a *number* unless it is
 * quoted, and a note called `true` becomes a boolean.
 */
import { describe, expect, it } from 'bun:test';

import {
  buildFrontmatter,
  buildMarkdownFile,
  noteFileName,
  toYamlScalar,
} from './note-frontmatter';

import type { NoteDetail } from '@/entities/note';

const note = (over: Partial<NoteDetail> = {}): NoteDetail =>
  ({
    id: 'n1',
    title: 'My note',
    content: '{}',
    parentId: null,
    position: 0,
    isPinned: false,
    archivedAt: null,
    createdAt: new Date('2026-01-02T03:04:05.000Z'),
    updatedAt: new Date('2026-02-03T04:05:06.000Z'),
    status: 'draft',
    properties: null,
    isFolder: false,
    labels: [],
    ...over,
  }) as NoteDetail;

describe('toYamlScalar', () => {
  it('leaves a plain word bare', () => {
    expect(toYamlScalar('draft')).toBe('draft');
  });

  it('quotes anything carrying YAML punctuation', () => {
    expect(toYamlScalar('a: b')).toBe('"a: b"');
    expect(toYamlScalar('- item')).toBe('"- item"');
    expect(toYamlScalar('#tag')).toBe('"#tag"');
  });

  it('quotes strings YAML would parse back as another type', () => {
    expect(toYamlScalar('true')).toBe('"true"');
    expect(toYamlScalar('12')).toBe('"12"');
    expect(toYamlScalar('null')).toBe('"null"');
    expect(toYamlScalar('no')).toBe('"no"');
  });

  it('escapes quotes and backslashes inside a quoted scalar', () => {
    expect(toYamlScalar('say "hi"')).toBe('"say \\"hi\\""');
    expect(toYamlScalar('a\\b: c')).toBe('"a\\\\b: c"');
  });

  it('quotes an empty string rather than emitting nothing', () => {
    expect(toYamlScalar('')).toBe('""');
  });

  it('passes real booleans and numbers through unquoted', () => {
    expect(toYamlScalar(true)).toBe('true');
    expect(toYamlScalar(7)).toBe('7');
  });

  it('collapses newlines — a scalar is one line', () => {
    // Bare, not quoted: once flattened this is an ordinary plain scalar with
    // no punctuation. Quoting it would be harmless but noisier to read.
    expect(toYamlScalar('a\nb')).toBe('a b');
  });

  it('quotes a value with leading or trailing space, which YAML would eat', () => {
    expect(toYamlScalar(' padded ')).toBe('" padded "');
  });
});

describe('buildFrontmatter', () => {
  it('emits a fenced block with the fixed keys in a stable order', () => {
    const yaml = buildFrontmatter(note());
    const lines = yaml.split('\n');

    expect(lines[0]).toBe('---');
    expect(lines[lines.length - 1]).toBe('---');
    expect(lines[1]).toBe('title: My note');
    expect(lines[2]).toBe('status: draft');
    expect(yaml).toContain('created: 2026-01-02T03:04:05.000Z');
    expect(yaml).toContain('updated: 2026-02-03T04:05:06.000Z');
  });

  it('omits labels entirely when there are none', () => {
    expect(buildFrontmatter(note())).not.toContain('labels:');
  });

  it('emits labels as a flow list, leaving safe names bare', () => {
    // A space is legal in a plain scalar even inside a flow sequence — only
    // the flow indicators `,[]{}` are not.
    const yaml = buildFrontmatter(
      note({
        labels: [
          { id: 'l1', name: 'ml', color: null },
          { id: 'l2', name: 'to read', color: null },
        ],
      })
    );
    expect(yaml).toContain('labels: [ml, to read]');
  });

  it('quotes a label containing a comma, which would otherwise split the list', () => {
    // The case that actually breaks: bare `a, b` inside `[...]` parses as TWO
    // labels. This is the reason `toYamlScalar` has to be safe in flow
    // context, not just in the `key: value` block context it is mostly used
    // for.
    const yaml = buildFrontmatter(
      note({ labels: [{ id: 'l1', name: 'ml, ai', color: null }] })
    );
    expect(yaml).toContain('labels: ["ml, ai"]');
  });

  it('emits custom properties after the fixed keys', () => {
    const yaml = buildFrontmatter(
      note({ properties: { source: 'arXiv', pages: 12, read: false } })
    );

    expect(yaml).toContain('source: arXiv');
    expect(yaml).toContain('pages: 12');
    expect(yaml).toContain('read: false');
    expect(yaml.indexOf('title:')).toBeLessThan(yaml.indexOf('source:'));
  });

  it('never lets a custom property shadow a fixed key', () => {
    // `properties` is author-editable free-form, so it can absolutely contain
    // a key called `status`. Emitting it would produce a duplicate mapping
    // key — which is invalid YAML, and whichever parser wins would report the
    // wrong status back.
    const yaml = buildFrontmatter(note({ properties: { status: 'hijack' } }));

    expect(yaml.match(/^status:/gm)?.length).toBe(1);
    expect(yaml).toContain('status: draft');
    expect(yaml).not.toContain('hijack');
  });
});

describe('buildMarkdownFile', () => {
  it('is frontmatter, a blank line, then the body', () => {
    const file = buildMarkdownFile(note(), '# Heading\n\ntext');

    expect(file.startsWith('---\n')).toBe(true);
    expect(file).toContain('---\n\n# Heading');
    expect(file.endsWith('# Heading\n\ntext\n')).toBe(true);
  });

  it('normalises trailing whitespace to exactly one newline', () => {
    expect(buildMarkdownFile(note(), 'body\n\n\n\n')).toEndWith('body\n');
  });
});

describe('noteFileName', () => {
  it('slugifies and appends the extension', () => {
    expect(noteFileName('My Note: Part 2')).toBe('my-note-part-2.md');
  });

  it('never produces an empty name', () => {
    expect(noteFileName('   ')).toBe('untitled.md');
    expect(noteFileName('///')).toBe('untitled.md');
  });

  it('keeps a Vietnamese title usable instead of emptying it', () => {
    // Stripping to ASCII would turn every Vietnamese note into
    // `untitled.md`, which is worse than a diacritic in a filename.
    expect(noteFileName('Ghi chú')).toBe('ghi-chú.md');
  });

  it('caps the length', () => {
    expect(noteFileName('x'.repeat(300)).length).toBeLessThanOrEqual(83);
  });
});
