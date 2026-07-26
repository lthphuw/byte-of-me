'use client';

import React from 'react';
import { useEditorState } from '@tiptap/react';
import { Plus, Quote } from 'lucide-react';

import {
  Button,
  type ButtonProps,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '../../../index';
import { cn } from '../../../lib/utils';
import { formatReferenceLabel } from '../extensions/references/format';
import { readReferencesFromDoc } from '../extensions/references/numbering';
import { ReferenceForm } from '../extensions/references/reference-form';
import type { ReferenceItem } from '../extensions/references/types';

import { useToolbar } from './toolbar-provider';

const CitationToolbar = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, ...props }, ref) => {
    const { editor } = useToolbar();
    const [open, setOpen] = React.useState(false);
    const [creating, setCreating] = React.useState(false);

    const ordered = useEditorState({
      editor,
      selector: ({ editor: current }) =>
        readReferencesFromDoc(current?.state.doc).ordered,
      equalityFn: (a, b) => JSON.stringify(a) === JSON.stringify(b),
    });

    const close = () => {
      setOpen(false);
      setCreating(false);
    };

    const insert = (refId: string) => {
      editor.chain().focus().insertCitation(refId).run();
      close();
    };

    const create = (item: ReferenceItem) => {
      editor.chain().focus().upsertReference(item).insertCitation(item.id).run();
      close();
    };

    // With no entries yet there is nothing to pick from, so open straight into
    // the form rather than showing an empty list.
    const showForm = creating || ordered.length === 0;

    return (
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setCreating(false);
        }}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn('h-8 w-8 p-0 sm:h-9 sm:w-9', className)}
                ref={ref}
                {...props}
              >
                <Quote className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <span>Cite a reference</span>
          </TooltipContent>
        </Tooltip>

        <PopoverContent
          align="start"
          className="w-80 p-3"
          onCloseAutoFocus={(event) => event.preventDefault()}
        >
          {showForm ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">New reference</p>
              <ReferenceForm
                onSubmit={create}
                onCancel={() =>
                  ordered.length === 0 ? close() : setCreating(false)
                }
              />
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium">Insert citation</p>
              <ul className="max-h-64 space-y-1 overflow-y-auto">
                {ordered.map((item, index) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => insert(item.id)}
                      className="flex w-full gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-accent"
                    >
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        [{index + 1}]
                      </span>
                      <span className="min-w-0 break-words">
                        {formatReferenceLabel(item)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => setCreating(true)}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                New reference
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    );
  }
);

CitationToolbar.displayName = 'CitationToolbar';

export { CitationToolbar };
