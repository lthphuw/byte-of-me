'use client';

import * as React from 'react';
import { cn } from '@byte-of-me/ui-utils';
import type { LucideIcon } from 'lucide-react';

import {
  Button,
  type ButtonProps,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '../../../index';

const isMac = () =>
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad/.test(navigator.platform);

/** A TipTap chord (`Mod-Shift-s`) as the platform draws it: `⌘⇧S`, or `Ctrl+Shift+S`. */
export function formatShortcut(chord: string, mac = isMac()): string {
  const keys = chord.split('-');
  const key = (keys.pop() ?? '').toUpperCase();
  const names: Record<string, [mac: string, other: string]> = {
    Mod: ['⌘', 'Ctrl'],
    Shift: ['⇧', 'Shift'],
    Alt: ['⌥', 'Alt'],
  };
  const parts = keys.map(
    (modifier) => names[modifier]?.[mac ? 0 : 1] ?? modifier
  );

  return mac ? [...parts, key].join('') : [...parts, key].join('+');
}

export interface ToolbarButtonProps
  extends Omit<ButtonProps, 'children' | 'asChild'> {
  icon: LucideIcon;
  /** The accessible name and the tooltip text, already translated. */
  label: string;
  /** The key chord that does the same, drawn after the label in the tooltip. */
  shortcut?: string;
  /** The mark or node is on at the selection: filled, and `aria-pressed`. */
  active?: boolean;
}

/** One icon button on the editor toolbar, with its tooltip. */
export const ToolbarButton = React.forwardRef<
  HTMLButtonElement,
  ToolbarButtonProps
>(({ icon: Icon, label, shortcut, active, className, ...props }, ref) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        ref={ref}
        variant="ghost"
        size="icon"
        aria-label={label}
        aria-pressed={active}
        className={cn(
          'h-8 w-8 p-0 can-hover:min-h-8 can-hover:min-w-8 sm:h-9 sm:w-9',
          active && 'bg-accent',
          className
        )}
        {...props}
      >
        <Icon />
      </Button>
    </TooltipTrigger>
    <TooltipContent>
      <span>{label}</span>
      {shortcut && (
        <span className="ml-1 text-xs text-primary-foreground/80">
          ({formatShortcut(shortcut)})
        </span>
      )}
    </TooltipContent>
  </Tooltip>
));
ToolbarButton.displayName = 'ToolbarButton';
