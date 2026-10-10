import { Extension } from '@tiptap/core';
import { type EditorState, Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';

import {
  formatMermaidSize,
  MERMAID_SIZE_ATTR,
  svgNaturalSize,
} from '../../../mermaid-size';

/**
 * Stores the natural size of each mermaid diagram on its code block, so the public page
 * can reserve the diagram's box before the library draws it. Without it the reader sees
 * the source block swap for a diagram of a different height, and the text below jumps.
 *
 * The size is measured by the editor, once a diagram's text has changed, while the author
 * is in the editor. Old posts gain it the next time their author edits a diagram.
 */

/** Diagram text → its `WxH`. Shared by every editor on the page: one render per text. */
const sizeBySource = new Map<string, string>();
let renderSeq = 0;

async function sizeOf(source: string): Promise<string | null> {
  const known = sizeBySource.get(source);
  if (known) return known;

  const { default: mermaid } = await import('mermaid');
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    suppressErrorRendering: true,
  });

  try {
    const { svg } = await mermaid.render(
      `mermaid-size-${(renderSeq += 1)}`,
      source
    );
    const size = svgNaturalSize(svg);
    if (!size) return null;

    const value = formatMermaidSize(size);
    sizeBySource.set(source, value);
    return value;
  } catch {
    // Half-typed syntax is the normal state of an editor: keep the last good size.
    return null;
  }
}

interface MermaidTarget {
  pos: number;
  source: string;
  size: string | null;
}

function mermaidTargets(view: EditorView): MermaidTarget[] {
  const targets: MermaidTarget[] = [];
  view.state.doc.descendants((node, pos) => {
    if (node.type.name === 'codeBlock' && node.attrs.language === 'mermaid') {
      targets.push({
        pos,
        source: node.textContent,
        size: node.attrs.mermaidSize ?? null,
      });
    }
  });
  return targets;
}

/**
 * Measures the diagrams after the author changes the document. Gated on focus: a post
 * opened for reading must not turn itself into an unsaved draft because it has diagrams
 * the editor has not measured yet.
 */
function measureView(view: EditorView) {
  let alive = true;
  let running = false;
  let again = false;

  const run = async () => {
    if (running) {
      again = true;
      return;
    }
    running = true;
    try {
      do {
        again = false;
        for (const target of mermaidTargets(view)) {
          const size = await sizeOf(target.source);
          if (!alive) return;
          if (!size || size === target.size) continue;

          // The document may have moved while the diagram was being drawn.
          const node = view.state.doc.nodeAt(target.pos);
          if (
            !node ||
            node.type.name !== 'codeBlock' ||
            node.textContent !== target.source
          ) {
            continue;
          }
          view.dispatch(
            view.state.tr
              .setNodeMarkup(target.pos, undefined, {
                ...node.attrs,
                mermaidSize: size,
              })
              .setMeta('addToHistory', false)
          );
        }
      } while (again && alive);
    } finally {
      running = false;
    }
  };

  return {
    update(current: EditorView, previous: EditorState) {
      if (!current.hasFocus() || current.state.doc.eq(previous.doc)) return;
      if (mermaidTargets(current).length === 0) return;
      void run();
    },
    destroy() {
      alive = false;
    },
  };
}

export const MermaidSize = Extension.create({
  name: 'mermaidSize',

  addGlobalAttributes() {
    return [
      {
        types: ['codeBlock'],
        attributes: {
          mermaidSize: {
            default: null,
            parseHTML: (element) => element.getAttribute(MERMAID_SIZE_ATTR),
            renderHTML: (attributes) =>
              attributes.mermaidSize
                ? { [MERMAID_SIZE_ATTR]: attributes.mermaidSize }
                : {},
          },
        },
      },
    ];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('mermaidSize'),
        view: (view) => measureView(view),
      }),
    ];
  },
});
