'use client';

import * as React from 'react';
import {
  NodeViewWrapper,
  type ReactNodeViewProps,
  useEditorState,
} from '@tiptap/react';

import { cn } from '../../../../lib/utils';

import { readReferencesFromDoc } from './numbering';

/**
 * Renders the `[n]` marker inside the editor. The number is selected straight
 * from editor state so every marker renumbers itself the moment a citation is
 * inserted, removed, or moved.
 */
export function CitationView({ editor, node }: ReactNodeViewProps) {
  const refId = typeof node.attrs.refId === 'string' ? node.attrs.refId : '';

  const order = useEditorState({
    editor,
    selector: ({ editor: current }) =>
      readReferencesFromDoc(current?.state.doc).numbers.get(refId) ?? null,
  });

  return (
    <NodeViewWrapper as="span" className="citation-node">
      <sup
        contentEditable={false}
        className={cn(
          'mx-px cursor-default rounded px-1 py-px align-super text-[0.7em] font-medium tabular-nums transition-colors',
          order === null
            ? 'bg-destructive/10 text-destructive'
            : 'bg-primary/10 text-primary'
        )}
        title={order === null ? 'Reference was deleted' : undefined}
      >
        {order === null ? '[?]' : `[${order}]`}
      </sup>
    </NodeViewWrapper>
  );
}
