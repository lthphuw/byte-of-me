'use client';

import type { JSONContent } from '@tiptap/core';

import { MermaidBlocks } from '../../mermaid-blocks';
// Importing the server renderer from a client module is deliberate here: the
// preview must be pixel-identical to the public page, so it goes through the
// exact same RichText (same schema, same sanitizer, same citation numbering).
// This file only ever loads inside the dashboard's lazy editor chunk, which
// already contains the whole schema — visitors still never download it.
import { RichText } from '../../rich-text';

/**
 * Read-only render of the current document, exactly as the public site will
 * show it — mermaid diagrams included.
 */
export function EditorPreview({ content }: { content: JSONContent }) {
  return (
    <div className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-6">
      <MermaidBlocks>
        <RichText content={content} />
      </MermaidBlocks>
    </div>
  );
}
