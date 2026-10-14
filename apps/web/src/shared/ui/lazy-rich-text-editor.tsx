'use client';

import { type ComponentProps, createContext, useContext } from 'react';
import { EditorSkeleton } from '@byte-of-me/ui/editor-skeleton';
import dynamic from 'next/dynamic';

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
 * The one dynamic entry point for the full editor. Every dashboard form goes
 * through this module so the editor (~570 KB of tiptap/prosemirror/lowlight)
 * lands in a single shared async chunk — imported statically per form it was
 * duplicated into each route group's bundle and loaded before first paint.
 *
 * Import this directly (`@/shared/ui/lazy-rich-text-editor`), not through the
 * shared/ui barrel, so public pages never even see the reference.
 */
export function LazyRichTextEditor(props: ComponentProps<typeof Editor>) {
  return (
    <SizeContext.Provider
      value={{ compact: props.compact, minHeight: props.minHeight }}
    >
      <Editor {...props} />
    </SizeContext.Provider>
  );
}
