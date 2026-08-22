'use client';

import dynamic from 'next/dynamic';

/**
 * The editor's References panel, mounted outside the editor.
 *
 * Dynamic, and by deep path, for two reasons. The panel imports the citation
 * nodes and so the whole of Tiptap; imported statically into the notes
 * sidebar it would land in the workspace's first-paint bundle and undo what
 * `lazy-rich-text-editor` is for. And the package barrel deliberately does not
 * re-export it — `rich-text-editor/tiptap/index.ts` says why: the panel
 * imports components that import the barrel, and re-exporting it creates a
 * cycle that breaks module init order for anything reaching the package
 * through `cn`.
 *
 * There is no `loading` fallback on purpose: the only consumer is a sidebar
 * tab the reader has just clicked, and a skeleton that flashes for one frame
 * reads as a fault rather than as progress.
 */
export const LazyReferencePanel = dynamic(
  () =>
    import(
      '@byte-of-me/ui/rich-text-editor/tiptap/extensions/references/reference-panel'
    ).then((mod) => mod.ReferencePanel),
  { ssr: false }
);
