'use client';

import * as React from 'react';
import { cn } from '@byte-of-me/ui-utils';
import {
  NodeViewWrapper,
  type ReactNodeViewProps,
  ReactNodeViewRenderer,
  useEditorState,
} from '@tiptap/react';

import type { EditorLabels } from '../../editor-labels';

import { readReferencesFromDoc } from './numbering';

type CitationViewProps = ReactNodeViewProps & {
  /** The editor's labels; `createCitationNodeView` hands them in. */
  labels: EditorLabels;
};

/**
 * Renders the `[n]` marker inside the editor. The number is selected straight
 * from editor state so every marker renumbers itself the moment a citation is
 * inserted, removed, or moved.
 */
function CitationView({ editor, node, labels }: CitationViewProps) {
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
            ? 'bg-destructive/10 text-destructive-text'
            : 'bg-primary/10 text-primary'
        )}
        title={order === null ? labels.referenceDeleted : undefined}
      >
        {order === null ? '[?]' : `[${order}]`}
      </sup>
    </NodeViewWrapper>
  );
}

/**
 * The node view `citation.ts` registers. It is built here because a node view
 * gets its node and the editor but not the extension's options, and a `.ts`
 * file has no JSX to hand the labels over with.
 */
export function createCitationNodeView(labels: EditorLabels) {
  return ReactNodeViewRenderer(
    (props: ReactNodeViewProps) => <CitationView {...props} labels={labels} />,
    { as: 'span' }
  );
}
