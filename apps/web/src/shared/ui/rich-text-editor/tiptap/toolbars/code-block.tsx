'use client';

import React from 'react';
import { Code } from 'lucide-react';

import { useToolbar } from './toolbar-provider';

import { cn } from '@/shared/lib/utils';
import { Button, type ButtonProps } from '@/shared/ui';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui';

const CodeBlockToolbar = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, onClick, children, ...props }, ref) => {
    const { editor } = useToolbar();
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-8 w-8 p-0 sm:h-9 sm:w-9',
              editor?.isActive('codeBlock') && 'bg-accent',
              className
            )}
            onClick={(e) => {
              editor?.chain().focus().toggleCodeBlock().run();
              onClick?.(e);
            }}
            disabled={!editor?.can().chain().focus().toggleCodeBlock().run()}
            ref={ref}
            {...props}
          >
            {children ?? <Code className="h-4 w-4" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <span>Code Block</span>
        </TooltipContent>
      </Tooltip>
    );
  }
);

CodeBlockToolbar.displayName = 'CodeBlockToolbar';

export { CodeBlockToolbar };
