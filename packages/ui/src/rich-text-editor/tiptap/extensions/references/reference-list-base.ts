import { mergeAttributes, Node } from '@tiptap/core';

import { formatReferenceText } from './format';
import { normalizeReferenceItems } from './numbering';
import {
  DEFAULT_REFERENCES_TITLE,
  REFERENCE_LIST_NAME,
  type ReferenceItem,
} from './types';

/**
 * Schema-and-render half of the bibliography node — see `citation-base.ts`
 * for why this is split from the editable node in `reference-list.ts`.
 */

type Spec = [string, ...unknown[]];

function buildItemSpec(item: ReferenceItem): Spec {
  const children: unknown[] = [];
  const text = formatReferenceText(item);

  if (text) children.push(['span', { class: 'references-text' }, text]);

  if (item.url) {
    children.push([
      'a',
      {
        class: 'references-url',
        href: item.url,
        target: '_blank',
        rel: 'noopener noreferrer',
      },
      item.url,
    ]);
  }

  // Readers who jump down to an entry need a way back to where they were.
  // No glyph child: the arrow is a CSS-mask icon (globals.css) so it follows
  // the text color in both themes; aria-label carries the meaning.
  children.push([
    'a',
    {
      class: 'references-backlink',
      href: `#cite-${item.id}`,
      'data-reference-backlink': item.id,
      'aria-label': 'Back to citation',
    },
  ]);

  return ['li', { id: `ref-${item.id}`, class: 'references-item' }, ...children];
}

/**
 * Block node holding the whole bibliography. It is an atom: entries are edited
 * through the references panel, not by typing into the rendered list, so the
 * data stays structured and the numbering stays authoritative.
 */
export const ReferenceListBase = Node.create({
  name: REFERENCE_LIST_NAME,
  group: 'block',
  atom: true,
  selectable: true,
  draggable: false,
  isolating: true,

  addAttributes() {
    return {
      title: {
        default: DEFAULT_REFERENCES_TITLE,
        parseHTML: (element) =>
          element.getAttribute('data-title') ?? DEFAULT_REFERENCES_TITLE,
        renderHTML: () => ({}),
      },
      items: {
        default: [] as ReferenceItem[],
        parseHTML: (element) => {
          const raw = element.getAttribute('data-items');
          if (!raw) return [];
          try {
            return normalizeReferenceItems(JSON.parse(raw));
          } catch {
            return [];
          }
        },
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'section[data-reference-list]' }];
  },

  renderHTML({ HTMLAttributes, node }) {
    const items = normalizeReferenceItems(node.attrs.items);
    const title =
      typeof node.attrs.title === 'string' && node.attrs.title.trim()
        ? node.attrs.title
        : DEFAULT_REFERENCES_TITLE;

    const heading: Spec = ['h2', { class: 'references-title' }, title];
    const list: Spec = [
      'ol',
      { class: 'references-list' },
      ...items.map(buildItemSpec),
    ];

    return [
      'section',
      mergeAttributes(HTMLAttributes, {
        class: 'references',
        'data-reference-list': 'true',
      }),
      heading,
      list,
    ] as Spec;
  },
});
