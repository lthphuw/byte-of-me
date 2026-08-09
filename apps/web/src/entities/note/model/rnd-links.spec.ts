import type { JSONContent } from '@tiptap/core';
import { describe, expect, it } from 'bun:test';

import { resolveRndPath, rewriteRndLinks } from './rnd-links';

describe('resolveRndPath', () => {
  it('resolves a sibling', () => {
    expect(resolveRndPath('00-overview.md', './02-method.md')).toBe('02-method.md');
  });

  it('resolves into a subdirectory', () => {
    expect(resolveRndPath('00-overview.md', './experiments/exp-001.md')).toBe(
      'experiments/exp-001.md'
    );
  });

  it('resolves back out of a subdirectory', () => {
    expect(resolveRndPath('experiments/exp-001.md', '../02-method.md')).toBe('02-method.md');
  });

  it('accepts a bare relative path with no ./ prefix', () => {
    expect(resolveRndPath('00-overview.md', '02-method.md')).toBe('02-method.md');
  });

  it('refuses to escape the project root', () => {
    expect(resolveRndPath('00-overview.md', '../../secrets.md')).toBe(null);
  });

  it('ignores anything that is not a relative .md path', () => {
    expect(resolveRndPath('00-overview.md', 'https://example.com')).toBe(null);
    expect(resolveRndPath('00-overview.md', 'mailto:a@b.c')).toBe(null);
    expect(resolveRndPath('00-overview.md', '/space/notes/abc')).toBe(null);
    expect(resolveRndPath('00-overview.md', './figure.png')).toBe(null);
  });

  // The two cases above that end in a non-.md suffix short-circuit on the
  // extension check alone, so they never exercise the scheme guard. An
  // absolute URL that happens to end in `.md` (a real link to a repo's raw
  // README, for instance) is the case that guard actually exists for.
  it('refuses a scheme-prefixed link even when it ends in .md', () => {
    expect(resolveRndPath('00-overview.md', 'https://example.com/readme.md')).toBe(null);
  });
});

/** A document with one link, the shape `parseMarkdownToTiptap` produces. */
function docLinkingTo(href: string): JSONContent {
  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'see ', marks: [] },
          { type: 'text', text: 'that', marks: [{ type: 'link', attrs: { href, title: null } }] },
        ],
      },
    ],
  };
}

function hrefsIn(doc: JSONContent): string[] {
  const found: string[] = [];
  const walk = (node: JSONContent): void => {
    for (const mark of node.marks ?? []) {
      if (mark.type === 'link' && typeof mark.attrs?.href === 'string') found.push(mark.attrs.href);
    }
    for (const child of node.content ?? []) walk(child);
  };
  walk(doc);
  return found;
}

describe('rewriteRndLinks', () => {
  const ids = new Map([['experiments/exp-001.md', 'note_exp_1']]);

  it('rewrites a known relative target to its note href', () => {
    const out = rewriteRndLinks(docLinkingTo('./experiments/exp-001.md'), '00-overview.md', ids);
    expect(hrefsIn(out)).toEqual(['/space/notes/note_exp_1']);
  });

  it('leaves an external link untouched', () => {
    const out = rewriteRndLinks(docLinkingTo('https://arxiv.org/abs/1234'), '00-overview.md', ids);
    expect(hrefsIn(out)).toEqual(['https://arxiv.org/abs/1234']);
  });

  it('leaves an unknown target untouched rather than inventing an id', () => {
    const out = rewriteRndLinks(docLinkingTo('./99-missing.md'), '00-overview.md', ids);
    expect(hrefsIn(out)).toEqual(['./99-missing.md']);
  });

  it('does not mutate the input document', () => {
    const input = docLinkingTo('./experiments/exp-001.md');
    const snapshot = JSON.stringify(input);
    rewriteRndLinks(input, '00-overview.md', ids);
    expect(JSON.stringify(input)).toBe(snapshot);
  });
});
