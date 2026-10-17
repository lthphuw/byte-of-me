'use client';

import type { MutableRefObject, RefObject } from 'react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@byte-of-me/ui-primitives';
import { cn, scrollIntoViewBehavior } from '@byte-of-me/ui-utils';
import type { Editor } from '@tiptap/react';

import type { EditorLabels } from './editor-labels';
import { ReferencePanel } from './extensions/references/reference-panel';
import { type OutlineEntry, useActiveHeading } from './use-outline';

/** The outline and the bibliography beside the writing column. */
export function OutlineAside({
  editor,
  labels,
  entries,
  scrollRoot,
  headingsChanged,
}: {
  editor: Editor;
  labels: EditorLabels;
  entries: OutlineEntry[];
  scrollRoot: RefObject<HTMLElement | null>;
  headingsChanged: MutableRefObject<(() => void) | null>;
}) {
  const activeId = useActiveHeading({ editor, scrollRoot, headingsChanged });

  return (
    <aside className="w-72 shrink-0 bg-muted/10">
      <Tabs defaultValue="outline" className="flex h-full flex-col">
        <TabsList className="m-3 grid grid-cols-2">
          <TabsTrigger value="outline">{labels.outlineTab}</TabsTrigger>
          <TabsTrigger value="references">{labels.referencesTab}</TabsTrigger>
        </TabsList>

        <TabsContent
          value="outline"
          className="mt-0 min-h-0 flex-1 overflow-y-auto px-5 pb-6"
        >
          <div className="flex flex-col gap-2 border-l border-border">
            {entries.map((entry) => (
              <button
                type="button"
                key={entry.id}
                aria-current={entry.id === activeId ? 'location' : undefined}
                onClick={() =>
                  document.getElementById(entry.id)?.scrollIntoView({
                    behavior: scrollIntoViewBehavior(),
                  })
                }
                className={cn(
                  '-ml-px min-h-11 border-l-2 border-transparent px-4 py-1 text-left text-xs transition-colors hover:border-primary hover:text-primary can-hover:min-h-8',
                  entry.id === activeId && 'border-primary text-primary',
                  entry.level === 1 && 'text-sm font-bold',
                  entry.level === 2 && 'ml-2 font-semibold',
                  entry.level === 3 && 'ml-4 font-normal text-muted-foreground'
                )}
              >
                {entry.text}
              </button>
            ))}
            {entries.length === 0 && (
              <p className="px-4 py-1 text-xs text-muted-foreground">
                {labels.outlineEmpty}
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent
          value="references"
          className="mt-0 min-h-0 flex-1 overflow-y-auto px-4 pb-6"
        >
          <ReferencePanel editor={editor} labels={labels} />
        </TabsContent>
      </Tabs>
    </aside>
  );
}
