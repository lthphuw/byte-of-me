'use client';

import React from 'react';
import { ChevronDown } from 'lucide-react';

import { useMediaQuery } from '../../../hooks/use-media-query';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '../../../index';
import { cn } from '../../../lib/utils';

import { MobileToolbarGroup, MobileToolbarItem } from './mobile-toolbar-group';
import { HEADING_LEVELS, useToolbar } from './toolbar-provider';

export const HeadingsToolbar = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => {
  const { editor, state } = useToolbar();
  const isMobile = useMediaQuery('(max-width: 640px)');
  const activeLevel = state.headingLevel;

  if (isMobile) {
    return (
      <MobileToolbarGroup label={activeLevel ? `H${activeLevel}` : 'Normal'}>
        <MobileToolbarItem
          onClick={() => editor?.chain().focus().setParagraph().run()}
          active={!state.headingActive}
        >
          Normal
        </MobileToolbarItem>
        {HEADING_LEVELS.map((level) => (
          <MobileToolbarItem
            key={level}
            onClick={() =>
              editor?.chain().focus().toggleHeading({ level }).run()
            }
            active={activeLevel === level}
          >
            H{level}
          </MobileToolbarItem>
        ))}
      </MobileToolbarGroup>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-8 w-max gap-1 px-3 font-normal',
                state.headingActive && 'bg-accent',
                className
              )}
              ref={ref}
              {...props}
            >
              {activeLevel ? `H${activeLevel}` : 'Normal'}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem
              onClick={() => editor?.chain().focus().setParagraph().run()}
              className={cn(
                'flex items-center gap-2 h-fit',
                !state.headingActive && 'bg-accent'
              )}
            >
              Normal
            </DropdownMenuItem>
            {HEADING_LEVELS.map((level) => (
              <DropdownMenuItem
                key={level}
                onClick={() =>
                  editor?.chain().focus().toggleHeading({ level }).run()
                }
                className={cn(
                  'flex items-center gap-2',
                  activeLevel === level && 'bg-accent'
                )}
              >
                H{level}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </TooltipTrigger>
      <TooltipContent>
        <span>Headings</span>
      </TooltipContent>
    </Tooltip>
  );
});

HeadingsToolbar.displayName = 'HeadingsToolbar';
