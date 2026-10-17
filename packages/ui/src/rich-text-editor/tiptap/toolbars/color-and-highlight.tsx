'use client';

import { useMediaQuery } from '@byte-of-me/ui-hooks';
import { cn } from '@byte-of-me/ui-utils';
import { CheckIcon, ChevronDownIcon } from 'lucide-react';

import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ScrollArea,
  Separator,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '../../../index';
import type { EditorLabels } from '../editor-labels';

import { MobileToolbarGroup, MobileToolbarItem } from './mobile-toolbar-group';
import { useToolbar } from './toolbar-provider';

const getTextColors = (labels: EditorLabels) => [
  { name: labels.colorDefault, color: 'var(--editor-text-default)' },
  { name: labels.colorGray, color: 'var(--editor-text-gray)' },
  { name: labels.colorBrown, color: 'var(--editor-text-brown)' },
  { name: labels.colorOrange, color: 'var(--editor-text-orange)' },
  { name: labels.colorYellow, color: 'var(--editor-text-yellow)' },
  { name: labels.colorGreen, color: 'var(--editor-text-green)' },
  { name: labels.colorBlue, color: 'var(--editor-text-blue)' },
  { name: labels.colorPurple, color: 'var(--editor-text-purple)' },
  { name: labels.colorPink, color: 'var(--editor-text-pink)' },
  { name: labels.colorRed, color: 'var(--editor-text-red)' },
];

const getHighlightColors = (labels: EditorLabels) => [
  { name: labels.colorDefault, color: 'var(--editor-highlight-default)' },
  { name: labels.colorGray, color: 'var(--editor-highlight-gray)' },
  { name: labels.colorBrown, color: 'var(--editor-highlight-brown)' },
  { name: labels.colorOrange, color: 'var(--editor-highlight-orange)' },
  { name: labels.colorYellow, color: 'var(--editor-highlight-yellow)' },
  { name: labels.colorGreen, color: 'var(--editor-highlight-green)' },
  { name: labels.colorBlue, color: 'var(--editor-highlight-blue)' },
  { name: labels.colorPurple, color: 'var(--editor-highlight-purple)' },
  { name: labels.colorPink, color: 'var(--editor-highlight-pink)' },
  { name: labels.colorRed, color: 'var(--editor-highlight-red)' },
];

interface ColorHighlightButtonProps {
  name: string;
  color: string;
  isActive: boolean;
  onClick: () => void;
  isHighlight?: boolean;
}

const ColorHighlightButton = ({
  name,
  color,
  isActive,
  onClick,
  isHighlight,
}: ColorHighlightButtonProps) => (
  <button
    onClick={onClick}
    className="flex w-full items-center justify-between rounded-sm px-2 py-1 text-sm hover:bg-muted"
    type="button"
  >
    <div className="flex items-center space-x-2">
      <div
        className="rounded-sm border px-1 py-px font-medium"
        style={isHighlight ? { backgroundColor: color } : { color }}
      >
        A
      </div>
      <span>{name}</span>
    </div>
    {isActive && <CheckIcon className="h-4 w-4" />}
  </button>
);

export const ColorHighlightToolbar = () => {
  const { editor, state, labels } = useToolbar();
  const isMobile = useMediaQuery('(max-width: 640px)');
  const textColors = getTextColors(labels);
  const highlightColors = getHighlightColors(labels);

  const currentColor = state.color;
  const currentHighlight = state.highlight;

  const handleSetColor = (color: string) => {
    editor
      ?.chain()
      .focus()
      .setColor(color === currentColor ? '' : color)
      .run();
  };

  const handleSetHighlight = (color: string) => {
    editor
      ?.chain()
      .focus()
      .setHighlight(color === currentHighlight ? { color: '' } : { color })
      .run();
  };

  const isDisabled = !state.canStyleText;

  if (isMobile) {
    return (
      <div className="flex gap-1">
        <MobileToolbarGroup label={labels.color}>
          {textColors.map(({ name, color }) => (
            <MobileToolbarItem
              key={color}
              onClick={() => handleSetColor(color)}
              active={currentColor === color}
            >
              <div className="flex items-center gap-2">
                <div className="rounded-sm border px-2" style={{ color }}>
                  A
                </div>
                <span>{name}</span>
              </div>
            </MobileToolbarItem>
          ))}
        </MobileToolbarGroup>

        <MobileToolbarGroup label={labels.highlight}>
          {highlightColors.map(({ name, color }) => (
            <MobileToolbarItem
              key={color}
              onClick={() => handleSetHighlight(color)}
              active={currentHighlight === color}
            >
              <div className="flex items-center gap-2">
                <div
                  className="rounded-sm border px-2"
                  style={{ backgroundColor: color }}
                >
                  A
                </div>
                <span>{name}</span>
              </div>
            </MobileToolbarItem>
          ))}
        </MobileToolbarGroup>
      </div>
    );
  }

  return (
    <Popover>
      <div className="relative h-full">
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger disabled={isDisabled} asChild>
              <Button
                variant="ghost"
                size="sm"
                style={{
                  color: currentColor,
                }}
                className={cn('h-8 w-14 p-0 font-normal')}
                aria-label={labels.textColorAndHighlight}
              >
                <span className="text-md">A</span>
                <ChevronDownIcon className="ml-2 h-4 w-4" />
              </Button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>{labels.textColorAndHighlight}</TooltipContent>
        </Tooltip>

        <PopoverContent align="start" className="w-56 p-1">
          <ScrollArea className="max-h-80 overflow-y-auto pr-2">
            <div className="mb-2.5 mt-2 px-2 text-xs text-muted-foreground">
              {labels.color}
            </div>
            {textColors.map(({ name, color }) => (
              <ColorHighlightButton
                key={color}
                name={name}
                color={color}
                isActive={currentColor === color}
                onClick={() => handleSetColor(color)}
              />
            ))}

            <Separator className="my-3" />

            <div className="mb-2.5 w-full px-2 pr-3 text-xs text-muted-foreground">
              {labels.background}
            </div>
            {highlightColors.map(({ name, color }) => (
              <ColorHighlightButton
                key={color}
                name={name}
                color={color}
                isActive={currentHighlight === color}
                onClick={() => handleSetHighlight(color)}
                isHighlight
              />
            ))}
          </ScrollArea>
        </PopoverContent>
      </div>
    </Popover>
  );
};
