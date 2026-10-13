'use client';

import React from 'react';
import { Image } from 'lucide-react';

import { Button, type ButtonProps } from '../../../index';
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../index';
import { cn } from '../../../lib/utils';

import { useToolbar } from './toolbar-provider';

const ImagePlaceholderToolbar = React.forwardRef<
  HTMLButtonElement,
  ButtonProps
>(({ className, onClick, children, ...props }, ref) => {
  const { editor, state, labels } = useToolbar();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-8 w-8 p-0 sm:h-9 sm:w-9 min-h-11 min-w-11 can-hover:min-h-8 can-hover:min-w-8',
            state.imagePlaceholderActive && 'bg-accent',
            className
          )}
          onClick={(e) => {
            e.preventDefault();
            editor?.chain().focus().insertImagePlaceholder().run();
            onClick?.(e);
          }}
          ref={ref}
          aria-label={labels.image}
          {...props}
        >
          {children ?? <Image className="h-4 w-4" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <span>{labels.image}</span>
      </TooltipContent>
    </Tooltip>
  );
});

ImagePlaceholderToolbar.displayName = 'ImagePlaceholderToolbar';

export { ImagePlaceholderToolbar };
