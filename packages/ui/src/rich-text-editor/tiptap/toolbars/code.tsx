'use client';

import React from 'react';
import { Code2 } from 'lucide-react';

import { Button, type ButtonProps } from '../../../index';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../index';
import { cn } from '../../../lib/utils';

import { useToolbar } from './toolbar-provider';

const CodeToolbar = React.forwardRef<HTMLButtonElement, ButtonProps>(
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
              state.toggles.code.active && 'bg-accent',
              className
            )}
            onClick={(e) => {
              editor?.chain().focus().toggleCode().run();
              onClick?.(e);
            }}
            disabled={!state.toggles.code.can}
            ref={ref}
            {...props}
          >
            {children ?? <Code2 className="h-4 w-4" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <span>Code</span>
        </TooltipContent>
      </Tooltip>
    );
  }
);

CodeToolbar.displayName = 'CodeToolbar';

export { CodeToolbar };
