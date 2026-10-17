'use client';

import { type ComponentProps, createContext, useContext } from 'react';
import { EditorSkeleton } from '@byte-of-me/ui-primitives';
import dynamic from 'next/dynamic';

import { useEditorLabels } from '@/shared/hooks/use-editor-labels';

// `next/dynamic` hands its `loading` component no props, so the size the editor
// will take reaches the skeleton through this.
const SizeContext = createContext<{ compact?: boolean; minHeight?: number }>(
  {}
);

function LoadingEditor() {
  return <EditorSkeleton {...useContext(SizeContext)} />;
}

const Editor = dynamic(
  () =>
    import('@byte-of-me/ui/rich-text-editor').then((mod) => mod.RichTextEditor),
  { ssr: false, loading: LoadingEditor }
);

/**
 * The one dynamic entry point for the full editor, so its ~570 KB (tiptap, prosemirror,
 * lowlight) lands in one shared async chunk; it supplies `labels` itself. Import it
 * directly, not through the shared/ui barrel, so public pages never see the reference.
 */
export function LazyRichTextEditor(
  props: Omit<ComponentProps<typeof Editor>, 'labels'>
) {
  const labels = useEditorLabels();

  return (
    <SizeContext.Provider
      value={{ compact: props.compact, minHeight: props.minHeight }}
    >
      <Editor {...props} labels={labels} />
    </SizeContext.Provider>
  );
}
