'use client';

import React from 'react';
import {
  Button,
  type ButtonProps,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@byte-of-me/ui-primitives';
import { cn } from '@byte-of-me/ui-utils';
import { Table as TableIcon } from 'lucide-react';

import { useToolbar } from './toolbar-provider';

/**
 * One button, two modes: outside a table it inserts a 3×3 with a header row; inside one it
 * opens the row/column/delete menu. One toolbar slot, not table buttons disabled most of the time.
 */
const TableToolbar = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, ...props }, ref) => {
    const { editor, state, labels } = useToolbar();
    const inTable = state.table.active;

    if (!inTable) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn('h-8 w-8 p-0 sm:h-9 sm:w-9', className)}
              onClick={() =>
                editor
                  ?.chain()
                  .focus()
                  .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                  .run()
              }
              disabled={!state.table.canInsert}
              ref={ref}
              aria-label={labels.insertTable}
              {...props}
            >
              <TableIcon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <span>{labels.insertTable}</span>
          </TooltipContent>
        </Tooltip>
      );
    }

    return (
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn('h-8 w-8 bg-accent p-0 sm:h-9 sm:w-9', className)}
                ref={ref}
                aria-label={labels.tableOptions}
                {...props}
              >
                <TableIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <span>{labels.tableOptions}</span>
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent
          align="start"
          onCloseAutoFocus={(event) => event.preventDefault()}
        >
          <DropdownMenuItem
            onClick={() => editor?.chain().focus().addRowAfter().run()}
          >
            {labels.addRowBelow}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => editor?.chain().focus().addColumnAfter().run()}
          >
            {labels.addColumnRight}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => editor?.chain().focus().deleteRow().run()}
          >
            {labels.deleteRow}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => editor?.chain().focus().deleteColumn().run()}
          >
            {labels.deleteColumn}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => editor?.chain().focus().toggleHeaderRow().run()}
          >
            {labels.toggleHeaderRow}
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive-text focus:text-destructive-text"
            onClick={() => editor?.chain().focus().deleteTable().run()}
          >
            {labels.deleteTable}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
);

TableToolbar.displayName = 'TableToolbar';

export { TableToolbar };
