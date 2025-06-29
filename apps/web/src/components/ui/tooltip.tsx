'use client';

import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

import { cn } from '@/lib/utils';

// Provider để wrap toàn bộ tooltip context
const TooltipProvider = TooltipPrimitive.Provider;

// Tooltip root
const Tooltip = TooltipPrimitive.Root;

// Trigger component
const TooltipTrigger = TooltipPrimitive.Trigger;

// Tooltip content (có arrow và theme-aware)
const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      'z-50 overflow-hidden rounded-md border px-3 py-1.5 text-sm shadow-lg',
      'bg-white text-black border-gray-200', // light mode
      'dark:bg-neutral-800 dark:text-white dark:border-neutral-700', // dark mode
      'data-[side=bottom]:animate-slide-in-from-top-1',
      'data-[side=top]:animate-slide-in-from-bottom-1',
      'data-[side=left]:animate-slide-in-from-right-1',
      'data-[side=right]:animate-slide-in-from-left-1',
      className
    )}
    {...props}
  >
    {props.children}
    <TooltipPrimitive.Arrow className="fill-white dark:fill-neutral-800 h-2 w-3" />
  </TooltipPrimitive.Content>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
