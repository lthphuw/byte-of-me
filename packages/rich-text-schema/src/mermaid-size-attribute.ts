import { Extension } from '@tiptap/core';

const MERMAID_SIZE_ATTR = 'data-mermaid-size';

/**
 * A mermaid code block's measured `WxH`, stored as `mermaidSize` and drawn as
 * `data-mermaid-size` so the reader reserves the box before the library loads. Only the
 * attribute lives here: measuring needs mermaid, which the editor's `MermaidSizeMeasure` owns.
 */
export const MermaidSizeAttribute = Extension.create({
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
});
