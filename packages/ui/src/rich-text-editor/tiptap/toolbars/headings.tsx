'use client';

import React from 'react';
import { useMediaQuery } from '@byte-of-me/ui-hooks';
import { cn } from '@byte-of-me/ui-utils';
import { ChevronDown } from 'lucide-react';

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
import type { EditorLabels } from '../editor-labels';

import { MobileToolbarGroup, MobileToolbarItem } from './mobile-toolbar-group';
import {
  HEADING_LEVELS,
  type HeadingLevel,
  useToolbar,
} from './toolbar-provider';

/**
 * A heading control's accessible name, from the app's labels. Levels 1 to 3
 * have a label; level 4 has no key, so it stays `undefined` and the control
 * keeps its visible "H4" as its name.
 */
function headingName(labels: EditorLabels, level: HeadingLevel | undefined) {
  switch (level) {
    case 1:
      return labels.heading1;
    case 2:
      return labels.heading2;
    case 3:
      return labels.heading3;
    default:
      return undefined;
  }
}

export const HeadingsToolbar = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => {
  const { editor, state, labels } = useToolbar();
  const isMobile = useMediaQuery('(max-width: 640px)');
  const activeLevel = state.headingLevel;

  if (isMobile) {
    return (
      <MobileToolbarGroup
        label={activeLevel ? `H${activeLevel}` : labels.normal}
        triggerLabel={headingName(labels, activeLevel)}
      >
        <MobileToolbarItem
          onClick={() => editor?.chain().focus().setParagraph().run()}
          active={!state.headingActive}
        >
          {labels.normal}
        </MobileToolbarItem>
        {HEADING_LEVELS.map((level) => (
          <MobileToolbarItem
            key={level}
            aria-label={headingName(labels, level)}
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
    // Tooltip trigger INSIDE the menu: `DropdownMenu` renders no element, so a
    // trigger wrapped around it received nothing and the tooltip never opened.
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
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
              aria-label={headingName(labels, activeLevel)}
              {...props}
            >
              {activeLevel ? `H${activeLevel}` : labels.normal}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <span>{labels.headings}</span>
        </TooltipContent>
      </Tooltip>
      {/* The command focuses the editor itself; Radix would hand focus back
          to the trigger afterwards. */}
      <DropdownMenuContent
        align="start"
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        <DropdownMenuItem
          onClick={() => editor?.chain().focus().setParagraph().run()}
          className={cn(
            'flex h-fit items-center gap-2',
            !state.headingActive && 'bg-accent'
          )}
        >
          {labels.normal}
        </DropdownMenuItem>
        {HEADING_LEVELS.map((level) => (
          <DropdownMenuItem
            key={level}
            aria-label={headingName(labels, level)}
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
  );
});

HeadingsToolbar.displayName = 'HeadingsToolbar';
