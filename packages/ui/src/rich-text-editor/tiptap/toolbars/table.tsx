'use client';

import React from 'react';
import { Table as TableIcon } from 'lucide-react';

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
} from '../../../index';
import { cn } from '../../../lib/utils';

import { useToolbar } from './toolbar-provider';

/**
 * One button, two modes: outside a table it inserts a 3×3 with a header row;
 * inside a table it opens the row/column/delete menu. Keeps the toolbar to a
 * single slot instead of a strip of table buttons that are disabled 95% of
 * the time.
 */
const TableToolbar = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, ...props }, ref) => {
    const { editor } = useToolbar();
    const inTable = editor?.isActive('table') ?? false;

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
              disabled={
                !editor
                  ?.can()
                  .chain()
                  .focus()
                  .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                  .run()
              }
              ref={ref}
              {...props}
            >
              <TableIcon className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <span>Insert table</span>
          </TooltipContent>
        </Tooltip>
      );
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn('h-8 w-8 bg-accent p-0 sm:h-9 sm:w-9', className)}
            ref={ref}
            {...props}
          >
            <TableIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem
            onClick={() => editor?.chain().focus().addRowAfter().run()}
          >
            Add row below
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => editor?.chain().focus().addColumnAfter().run()}
          >
            Add column right
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => editor?.chain().focus().deleteRow().run()}
          >
            Delete row
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => editor?.chain().focus().deleteColumn().run()}
          >
            Delete column
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => editor?.chain().focus().toggleHeaderRow().run()}
          >
            Toggle header row
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => editor?.chain().focus().deleteTable().run()}
          >
            Delete table
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
);

TableToolbar.displayName = 'TableToolbar';

export { TableToolbar };
