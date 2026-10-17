'use client';

import { memo } from 'react';
import { MermaidBlocks } from '@byte-of-me/rich-text-render/mermaid-blocks';
// A client module importing the server renderer is deliberate: the preview matches the
// public page through the same `RichText` (schema, sanitizer, citation numbering). It loads
// only in the dashboard's lazy editor chunk, which already holds the schema.
import { RichText } from '@byte-of-me/rich-text-render/rich-text';
import type { JSONContent } from '@tiptap/core';

/**
 * Read-only render of the current document as the public site shows it, mermaid included.
 * Memoised on the snapshot's identity: `RichText` re-runs `generateHTML` and the sanitizer per
 * render, and the host re-renders for unrelated reasons (outline, tab state).
 */
export const EditorPreview = memo(function EditorPreview({
  content,
}: {
  content: JSONContent;
}) {
  return (
    <div className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6">
      <MermaidBlocks>
        <RichText content={content} />
      </MermaidBlocks>
    </div>
  );
});
