'use client';

import React from 'react';
import { ItalicIcon } from 'lucide-react';

import { Button, type ButtonProps } from '../../../index';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../index';
import { cn } from '../../../lib/utils';

import { useToolbar } from './toolbar-provider';

const ItalicToolbar = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, onClick, children, ...props }, ref) => {
    const { editor, state } = useToolbar();
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-8 w-8 p-0 sm:h-9 sm:w-9',
              state.toggles.italic.active && 'bg-accent',
              className
            )}
            onClick={(e) => {
              editor?.chain().focus().toggleItalic().run();
              onClick?.(e);
            }}
            disabled={!state.toggles.italic.can}
            ref={ref}
            {...props}
          >
            {children ?? <ItalicIcon className="h-4 w-4" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <span>Italic</span>
          <span className="text-muted-foreground ml-1 text-xs">(cmd + i)</span>
        </TooltipContent>
      </Tooltip>
    );
  }
);

ItalicToolbar.displayName = 'ItalicToolbar';

export { ItalicToolbar };
