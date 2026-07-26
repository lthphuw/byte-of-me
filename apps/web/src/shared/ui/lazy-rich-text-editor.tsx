'use client';

import dynamic from 'next/dynamic';

/**
 * The one dynamic entry point for the full editor. Every dashboard form goes
 * through this module so the editor (~570 KB of tiptap/prosemirror/lowlight)
 * lands in a single shared async chunk — imported statically per form it was
 * duplicated into each route group's bundle and loaded before first paint.
 *
 * Import this directly (`@/shared/ui/lazy-rich-text-editor`), not through the
 * shared/ui barrel, so public pages never even see the reference.
 */
export const LazyRichTextEditor = dynamic(
  () =>
    import('@byte-of-me/ui/rich-text-editor').then(
      (mod) => mod.RichTextEditor
    ),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-[160px] w-full animate-pulse rounded-md border bg-muted/30" />
    ),
  }
);
