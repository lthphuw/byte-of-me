import { mergeAttributes, Node } from '@tiptap/core';

import { CITATION_NAME } from './types';

/**
 * Schema-and-render half of the citation node: attributes, parse rules, HTML. No node views,
 * commands or barrel imports, so server components render stored docs without registering the
 * editor as a client reference or hitting the barrel's init-order cycle. `citation.ts` extends it.
 */
export const CitationBase = Node.create({
  name: CITATION_NAME,
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      refId: {
        default: '',
        parseHTML: (element) => element.getAttribute('data-citation') ?? '',
        renderHTML: (attributes) => ({ 'data-citation': attributes.refId }),
      },
      // Derived at render time by `applyCitationNumbering`; never persisted.
      order: { default: null, rendered: false },
      first: { default: false, rendered: false },
    };
  },

  parseHTML() {
    return [{ tag: 'sup[data-citation]' }];
  },

  renderHTML({ HTMLAttributes, node }) {
    const refId = typeof node.attrs.refId === 'string' ? node.attrs.refId : '';
    const order =
      typeof node.attrs.order === 'number' ? node.attrs.order : null;

    // A marker whose entry was deleted still renders, but inert — silently
    // dropping it would lose the author's intent without any signal.
    if (!refId || order === null) {
      return [
        'sup',
        mergeAttributes(HTMLAttributes, { class: 'citation citation--orphan' }),
        '[?]',
      ];
    }

    return [
      'sup',
      mergeAttributes(HTMLAttributes, {
        class: 'citation',
        ...(node.attrs.first === true ? { id: `cite-${refId}` } : {}),
      }),
      [
        'a',
        {
          href: `#ref-${refId}`,
          class: 'citation-link',
          'data-citation-link': refId,
          'aria-label': `Reference ${order}`,
        },
        `[${order}]`,
      ],
    ];
  },
});
