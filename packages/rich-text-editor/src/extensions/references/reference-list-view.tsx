'use client';

import * as React from 'react';
import {
  formatReferenceText,
  readReferencesFromDoc,
} from '@byte-of-me/rich-text-schema';
import {
  NodeViewWrapper,
  type ReactNodeViewProps,
  ReactNodeViewRenderer,
  useEditorState,
} from '@tiptap/react';

import type { EditorLabels } from '../../editor-labels';

type ReferenceListViewProps = ReactNodeViewProps & {
  /** The editor's labels; `createReferenceListNodeView` hands them in. */
  labels: EditorLabels;
};

/**
 * Read-only preview of the bibliography inside the editor. It mirrors what the
 * article will show, while all editing happens in the references panel — the
 * entries are structured data, not free text.
 */
function ReferenceListView({ editor, labels }: ReferenceListViewProps) {
  const { ordered, title } = useEditorState({
    editor,
    selector: ({ editor: current }) => {
      const numbering = readReferencesFromDoc(current?.state.doc);
      return { ordered: numbering.ordered, title: numbering.title };
    },
    // The selector rebuilds its result on every transaction; compare by value
    // so the preview only re-renders when an entry actually changed.
    equalityFn: (a, b) => JSON.stringify(a) === JSON.stringify(b),
  });

  return (
    <NodeViewWrapper className="references-node">
      <div
        contentEditable={false}
        className="my-6 rounded-lg border border-dashed bg-muted/20 p-4"
      >
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <p className="text-base font-semibold">{title}</p>
          <span className="shrink-0 text-[10px] uppercase tracking-widest text-muted-foreground">
            {labels.editInReferencesPanel}
          </span>
        </div>

        {ordered.length ? (
          <ol className="space-y-2 text-sm">
            {ordered.map((item, index) => (
              <li key={item.id} className="flex gap-2">
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  [{index + 1}]
                </span>
                <span className="min-w-0 break-words">
                  {formatReferenceText(item)}
                  {item.url ? (
                    <span className="ml-1 break-all text-primary underline">
                      {item.url}
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">
            {labels.noReferencesYet}
          </p>
        )}
      </div>
    </NodeViewWrapper>
  );
}

/**
 * The node view `reference-list.ts` registers. It is built here because a node
 * view gets its node and the editor but not the extension's options, and a
 * `.ts` file has no JSX to hand the labels over with.
 */
export function createReferenceListNodeView(labels: EditorLabels) {
  return ReactNodeViewRenderer((props: ReactNodeViewProps) => (
    <ReferenceListView {...props} labels={labels} />
  ));
}
