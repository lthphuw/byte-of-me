'use client';

import * as React from 'react';
import {
  NodeViewWrapper,
  type ReactNodeViewProps,
  useEditorState,
} from '@tiptap/react';

import { formatReferenceText } from './format';
import { readReferencesFromDoc } from './numbering';

/**
 * Read-only preview of the bibliography inside the editor. It mirrors what the
 * article will show, while all editing happens in the references panel — the
 * entries are structured data, not free text.
 */
export function ReferenceListView({ editor }: ReactNodeViewProps) {
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
            Edit in References panel
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
            No references yet. Add one from the References panel.
          </p>
        )}
      </div>
    </NodeViewWrapper>
  );
}
